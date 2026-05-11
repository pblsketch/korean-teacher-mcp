import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerMindmapTool(server: McpServer, db: Client) {
  server.tool(
    'generate_mindmap',
    '마인드맵 및 다이어그램 생성기: 단원 개념 구조, 학습 내용 요약, 인물 관계도 등을 Mermaid.js 코드로 변환하여 시각화합니다. 마인드맵, 순서도, 관계도, 타임라인 등 다양한 다이어그램을 지원합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID (DB에서 컨텍스트를 가져올 경우)'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      topic: z.string().optional().describe('시각화할 주제 (예: "소설의 구성 요소", "토론의 절차")'),
      diagram_type: z.enum([
        'mindmap',
        'flowchart',
        'sequence',
        'timeline',
        'classDiagram',
        'quadrant',
      ]).default('mindmap').describe('다이어그램 유형'),
      content_source: z.enum(['단원요약', '개념구조', '인물관계', '학습흐름', '비교분석', '직접입력']).default('단원요약').describe('콘텐츠 소스'),
      custom_content: z.string().optional().describe('직접 입력할 내용 (content_source가 "직접입력"일 때)'),
      style: z.enum(['교과서', '학생활동', '교사용', '발표용']).default('교과서').describe('스타일/용도'),
      language: z.enum(['한국어', '영어', '혼합']).default('한국어').describe('다이어그램 텍스트 언어'),
    },
    async (params) => {
      // 단원 컨텍스트 조회 (선택적)
      let unitContext = '';
      let unitTitle = '';

      if (params.unit_id || params.grade) {
        let unitId = params.unit_id;
        if (!unitId && params.grade) {
          const units = await getUnitsByFilter(db, { grade: params.grade, unit_number: params.unit_number });
          if (units.length > 0) {
            unitId = units[0].id;
          }
        }
        if (unitId) {
          const context = await getUnitContext(db, unitId);
          const units = await getUnitsByFilter(db, { unit_id: unitId });
          unitTitle = units[0]?.title ?? '';
          unitContext = [
            `## 단원 컨텍스트`,
            `- 단원: ${unitTitle}`,
            `- 소단원: ${units[0]?.sub_unit ?? ''}`,
            ``,
            `### 관련 지문 (${context.passages.length}개)`,
            ...context.passages.slice(0, 3).map(p => `- ${p.title}${p.author ? ` (${p.author})` : ''}: ${p.content.substring(0, 100)}...`),
            ``,
            `### 관련 활동 (${context.activities.length}개)`,
            ...context.activities.slice(0, 5).map((a, i) => `- 활동 ${i + 1}: ${a.content.substring(0, 80)}...`),
            ``,
          ].join('\n');
        }
      }

      const guideMarkdown = [
        `# 마인드맵/다이어그램 생성 가이드`,
        ``,
        `## 생성 개요`,
        `| 항목 | 내용 |`,
        `|------|------|`,
        `| 다이어그램 유형 | ${params.diagram_type} |`,
        `| 콘텐츠 소스 | ${params.content_source} |`,
        `| 스타일 | ${params.style} |`,
        `| 언어 | ${params.language} |`,
        params.topic ? `| 주제 | ${params.topic} |` : '',
        unitTitle ? `| 단원 | ${unitTitle} |` : '',
        ``,
        unitContext,
        params.custom_content ? `## 입력 내용\n\n${params.custom_content}\n\n` : '',
        `## Mermaid.js 다이어그램 작성 지침`,
        ``,
        getDiagramTypeGuide(params.diagram_type),
        ``,
        `## 콘텐츠 구성 가이드: ${params.content_source}`,
        ``,
        getContentSourceGuide(params.content_source),
        ``,
        `## 스타일 가이드: ${params.style}`,
        ``,
        getStyleGuide(params.style),
        ``,
        `## 출력 형식`,
        ``,
        `다음 형식으로 Mermaid 코드를 생성해주세요:`,
        ``,
        '```markdown',
        `## ${params.topic || unitTitle || '다이어그램'}`,
        ``,
        '```mermaid',
        getDiagramTemplate(params.diagram_type),
        '```',
        ``,
        `### 활용 안내`,
        `- 이 코드를 Mermaid Live Editor(https://mermaid.live)에 붙여넣으면 바로 시각화됩니다.`,
        `- 마크다운을 지원하는 도구(Notion, Obsidian, GitHub 등)에서 바로 렌더링됩니다.`,
        '```',
        ``,
        `## 작성 시 주의사항`,
        ``,
        `1. **한국어 노드명**: 한국어 텍스트는 반드시 큰따옴표로 감싸세요. 예: \`A["소설의 구성"]\``,
        `2. **노드 ID**: 영문 또는 숫자로 간결하게 작성하세요. 예: \`node1["갈등 구조"]\``,
        `3. **계층 깊이**: 마인드맵은 최대 3~4단계까지만 (너무 깊으면 가독성 저하)`,
        `4. **노드 수**: 한 다이어그램에 15~25개 노드가 적정 (학생 활동용은 10~15개)`,
        `5. **색상/스타일**: 필요 시 \`style\` 또는 \`classDef\`로 시각적 구분을 추가하세요.`,
        `6. **특수문자 주의**: 괄호, 화살표 등 Mermaid 예약 문자는 큰따옴표 안에 넣으세요.`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}

function getDiagramTypeGuide(type: string): string {
  const guides: Record<string, string> = {
    mindmap: [
      `### 마인드맵 (mindmap)`,
      `중심 주제에서 가지를 뻗어나가는 방사형 구조입니다.`,
      ``,
      `**적합한 용도**: 단원 개념 정리, 브레인스토밍, 주제 탐구`,
      ``,
      `**문법**:`,
      '```mermaid',
      `mindmap`,
      `  root((중심 주제))`,
      `    가지1`,
      `      세부1`,
      `      세부2`,
      `    가지2`,
      `      세부3`,
      '```',
    ].join('\n'),
    flowchart: [
      `### 순서도 (flowchart)`,
      `프로세스의 단계와 분기를 보여주는 구조입니다.`,
      ``,
      `**적합한 용도**: 학습 절차, 문제 해결 과정, 글쓰기 과정, 토론 절차`,
      ``,
      `**문법**:`,
      '```mermaid',
      `flowchart TD`,
      `  A["시작"] --> B{"조건 판단"}`,
      `  B -->|예| C["행동 1"]`,
      `  B -->|아니오| D["행동 2"]`,
      `  C --> E["결과"]`,
      `  D --> E`,
      '```',
    ].join('\n'),
    sequence: [
      `### 시퀀스 다이어그램 (sequence)`,
      `참여자 간의 상호작용 순서를 보여줍니다.`,
      ``,
      `**적합한 용도**: 인물 간 대화 분석, 토론 구조, 의사소통 과정`,
      ``,
      `**문법**:`,
      '```mermaid',
      `sequenceDiagram`,
      `  participant A as 인물1`,
      `  participant B as 인물2`,
      `  A->>B: 발화/행동`,
      `  B-->>A: 반응`,
      '```',
    ].join('\n'),
    timeline: [
      `### 타임라인 (timeline)`,
      `시간 순서에 따른 사건의 흐름을 보여줍니다.`,
      ``,
      `**적합한 용도**: 작품 속 사건 전개, 역사적 흐름, 학습 계획`,
      ``,
      `**문법**:`,
      '```mermaid',
      `timeline`,
      `  title 제목`,
      `  section 1단계`,
      `    사건1 : 설명`,
      `    사건2 : 설명`,
      `  section 2단계`,
      `    사건3 : 설명`,
      '```',
    ].join('\n'),
    classDiagram: [
      `### 클래스 다이어그램 (관계도)`,
      `개념이나 인물 간의 관계를 보여줍니다.`,
      ``,
      `**적합한 용도**: 인물 관계도, 개념 간 관계, 분류 체계`,
      ``,
      `**문법**:`,
      '```mermaid',
      `classDiagram`,
      `  class 인물1 {`,
      `    +성격: 용감함`,
      `    +역할: 주인공`,
      `  }`,
      `  인물1 --> 인물2 : 관계`,
      '```',
    ].join('\n'),
    quadrant: [
      `### 사분면 차트 (quadrant)`,
      `두 축을 기준으로 요소를 분류하여 배치합니다.`,
      ``,
      `**적합한 용도**: 인물 성격 분석, 개념 비교, 우선순위 정리`,
      ``,
      `**문법**:`,
      '```mermaid',
      `quadrantChart`,
      `  title 제목`,
      `  x-axis "축1 낮음" --> "축1 높음"`,
      `  y-axis "축2 낮음" --> "축2 높음"`,
      `  quadrant-1 "영역1"`,
      `  quadrant-2 "영역2"`,
      `  quadrant-3 "영역3"`,
      `  quadrant-4 "영역4"`,
      `  항목1: [0.8, 0.7]`,
      '```',
    ].join('\n'),
  };
  return guides[type] || guides['mindmap'];
}

function getContentSourceGuide(source: string): string {
  const guides: Record<string, string> = {
    '단원요약': [
      `단원의 핵심 개념과 학습 내용을 계층적으로 구조화합니다.`,
      `- 중심: 단원 제목`,
      `- 1단계 가지: 소단원 또는 핵심 개념 (3~5개)`,
      `- 2단계 가지: 세부 내용 또는 예시 (각 2~4개)`,
      `- 3단계 가지: 구체적 사례 (선택적)`,
    ].join('\n'),
    '개념구조': [
      `학습 개념 간의 관계(상위-하위, 인과, 비교)를 구조화합니다.`,
      `- 상위 개념에서 하위 개념으로 분류`,
      `- 개념 간 관계를 화살표와 라벨로 표시`,
      `- 핵심 용어의 정의를 노드에 간략히 포함`,
    ].join('\n'),
    '인물관계': [
      `작품 속 인물들의 관계를 시각화합니다.`,
      `- 각 인물의 이름과 핵심 특성을 노드에 표시`,
      `- 인물 간 관계(가족, 친구, 적대 등)를 연결선으로 표시`,
      `- 관계의 성격을 라벨로 명시 (예: "갈등", "우정", "사제")`,
    ].join('\n'),
    '학습흐름': [
      `수업의 진행 순서나 학습 절차를 순서도로 표현합니다.`,
      `- 도입 → 전개 → 정리 구조`,
      `- 각 단계의 핵심 활동을 노드로 표시`,
      `- 분기점(선택 활동, 수준별 활동)을 조건 노드로 표시`,
    ].join('\n'),
    '비교분석': [
      `두 가지 이상의 대상을 비교하여 공통점과 차이점을 시각화합니다.`,
      `- 비교 대상을 병렬로 배치`,
      `- 공통점은 중앙에, 차이점은 각 측에 배치`,
      `- 비교 기준을 명확히 제시`,
    ].join('\n'),
    '직접입력': [
      `사용자가 직접 입력한 내용을 기반으로 다이어그램을 생성합니다.`,
      `- 입력된 텍스트에서 핵심 키워드와 관계를 추출`,
      `- 논리적 구조를 파악하여 적절한 형태로 시각화`,
    ].join('\n'),
  };
  return guides[source] || guides['단원요약'];
}

function getStyleGuide(style: string): string {
  const guides: Record<string, string> = {
    '교과서': [
      `**교과서 스타일**: 정돈되고 학술적인 느낌`,
      `- 간결하고 정확한 용어 사용`,
      `- 계층 구조가 명확한 레이아웃`,
      `- 색상은 절제하여 사용 (2~3색)`,
    ].join('\n'),
    '학생활동': [
      `**학생활동 스타일**: 빈칸을 포함한 활동형`,
      `- 일부 노드를 "???" 또는 "( )"로 비워두어 학생이 채우도록 함`,
      `- 친근하고 이해하기 쉬운 표현 사용`,
      `- 시각적으로 흥미로운 구성`,
    ].join('\n'),
    '교사용': [
      `**교사용 스타일**: 상세하고 포괄적인 정보`,
      `- 모든 노드에 상세 내용 포함`,
      `- 교수 전략이나 발문 포함 가능`,
      `- 성취기준 연계 정보 표시`,
    ].join('\n'),
    '발표용': [
      `**발표용 스타일**: 시각적 임팩트 중심`,
      `- 핵심 키워드만 간결하게`,
      `- 큰 글씨, 명확한 구조`,
      `- 단계적으로 공개할 수 있는 구성`,
    ].join('\n'),
  };
  return guides[style] || guides['교과서'];
}

function getDiagramTemplate(type: string): string {
  const templates: Record<string, string> = {
    mindmap: `mindmap\n  root((단원 주제))\n    개념1\n      세부1\n      세부2\n    개념2\n      세부3\n      세부4\n    개념3\n      세부5`,
    flowchart: `flowchart TD\n  A["시작"] --> B["단계 1"]\n  B --> C{"판단"}\n  C -->|조건1| D["결과 1"]\n  C -->|조건2| E["결과 2"]`,
    sequence: `sequenceDiagram\n  participant A as 인물1\n  participant B as 인물2\n  A->>B: 행동/발화\n  B-->>A: 반응`,
    timeline: `timeline\n  title 사건의 흐름\n  section 발단\n    사건1 : 설명\n  section 전개\n    사건2 : 설명\n  section 절정\n    사건3 : 설명`,
    classDiagram: `classDiagram\n  class 인물1 {\n    +특성1\n    +특성2\n  }\n  class 인물2 {\n    +특성1\n  }\n  인물1 --> 인물2 : 관계`,
    quadrant: `quadrantChart\n  title 분석 제목\n  x-axis "기준1 낮음" --> "기준1 높음"\n  y-axis "기준2 낮음" --> "기준2 높음"\n  항목1: [0.7, 0.8]\n  항목2: [0.3, 0.6]`,
  };
  return templates[type] || templates['mindmap'];
}
