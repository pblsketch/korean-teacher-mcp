import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerVocabularyAnalysisTool(server: McpServer, db: Client) {
  server.tool(
    'analyze_vocabulary_level',
    '한국어 어휘 수준 분석기: 지문에 포함된 어휘의 난이도를 분석하고, 학년 수준에 맞는 어휘 목록과 뜻풀이를 생성하기 위한 분석 프레임워크를 제공합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID (DB에서 지문을 가져올 경우)'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      text: z.string().optional().describe('직접 입력하는 분석 대상 텍스트 (unit_id 대신 사용 가능)'),
      target_grade: z.string().default('중학교 1학년').describe('대상 학년 (이 학년 기준으로 난이도 판정)'),
      analysis_depth: z.enum(['간략', '상세', '심화']).default('상세').describe('분석 깊이'),
      include_hanja: z.boolean().default(true).describe('한자어 분석 포함 여부'),
      include_etymology: z.boolean().default(false).describe('어원 정보 포함 여부'),
      output_format: z.enum(['분석표', '어휘목록', '학습카드']).default('분석표').describe('출력 형식'),
    },
    async (params) => {
      // 분석 대상 텍스트 확보
      let analysisText = params.text || '';
      let unitTitle = '';

      if (!analysisText && (params.unit_id || params.grade)) {
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
          if (context.passages.length > 0) {
            analysisText = context.passages.map(p => p.content).join('\n\n');
          }
        }
      }

      const guideMarkdown = [
        `# 어휘 수준 분석 가이드`,
        ``,
        `## 분석 개요`,
        `| 항목 | 내용 |`,
        `|------|------|`,
        `| 대상 학년 | ${params.target_grade} |`,
        `| 분석 깊이 | ${params.analysis_depth} |`,
        `| 한자어 분석 | ${params.include_hanja ? '포함' : '미포함'} |`,
        `| 어원 정보 | ${params.include_etymology ? '포함' : '미포함'} |`,
        `| 출력 형식 | ${params.output_format} |`,
        unitTitle ? `| 단원 | ${unitTitle} |` : '',
        ``,
        analysisText ? [
          `## 분석 대상 텍스트`,
          ``,
          `\`\`\``,
          analysisText.substring(0, 2000),
          analysisText.length > 2000 ? '\n... (이하 생략)' : '',
          `\`\`\``,
          ``,
        ].join('\n') : '',
        `## 어휘 분석 프레임워크`,
        ``,
        `### 1단계: 어휘 추출 및 분류`,
        ``,
        `지문에서 다음 기준으로 어휘를 추출하세요:`,
        ``,
        `| 분류 기준 | 설명 | 예시 |`,
        `|-----------|------|------|`,
        `| 교과 핵심 어휘 | 해당 단원의 학습 목표와 직결되는 용어 | 서사, 갈등, 복선, 주제 |`,
        `| 고급 일반 어휘 | 일상에서 잘 쓰이지 않는 어려운 일반어 | 간과하다, 역설적, 함축 |`,
        `| 한자어 | 한자 지식이 필요한 어휘 | 관조(觀照), 성찰(省察) |`,
        `| 관용 표현 | 관용구, 속담, 고사성어 | 눈에 밟히다, 우이독경 |`,
        `| 전문 용어 | 특정 분야의 전문적 표현 | 내적 독백, 서술자 시점 |`,
        ``,
        `### 2단계: 난이도 판정 기준`,
        ``,
        `${params.target_grade} 기준으로 다음 등급을 부여하세요:`,
        ``,
        `| 등급 | 기준 | 교수 전략 |`,
        `|------|------|-----------|`,
        `| A (기본) | 해당 학년에서 이미 학습한 어휘 | 복습 차원에서 간단히 확인 |`,
        `| B (학습 대상) | 해당 학년에서 새로 학습해야 할 어휘 | 수업 중 명시적 지도 필요 |`,
        `| C (도전) | 해당 학년보다 높은 수준의 어휘 | 맥락을 통한 추론 유도 또는 사전 학습 |`,
        `| D (심화) | 상급 학년 또는 전문적 어휘 | 심화 학습자에게만 선택적 제공 |`,
        ``,
        `### 3단계: 어휘 관계 분석`,
        ``,
        `추출된 어휘 간의 관계를 다음과 같이 분석하세요:`,
        `- **유의어 그룹**: 비슷한 의미의 어휘를 묶어 뉘앙스 차이 설명`,
        `- **반의어 쌍**: 대립되는 개념의 어휘 쌍 식별`,
        `- **상하위어**: 포함 관계에 있는 어휘 계층 구조`,
        `- **연어 관계**: 함께 자주 쓰이는 어휘 조합 (예: "갈등을 겪다", "주제를 파악하다")`,
        ``,
        params.include_hanja ? [
          `### 4단계: 한자어 분석`,
          ``,
          `| 분석 항목 | 설명 |`,
          `|-----------|------|`,
          `| 한자 표기 | 해당 어휘의 한자 표기 |`,
          `| 글자별 의미 | 각 한자의 훈(뜻)과 음(소리) |`,
          `| 조어 원리 | 한자 결합으로 의미가 만들어지는 원리 |`,
          `| 관련 한자어 | 같은 한자를 공유하는 다른 어휘 |`,
          ``,
          `예시:`,
          `> **관조**(觀照): 觀(볼 관) + 照(비출 조) = "사물을 비추어 봄"`,
          `> 관련어: 관찰(觀察), 조명(照明), 관점(觀點)`,
          ``,
        ].join('\n') : '',
        params.include_etymology ? [
          `### 어원 분석`,
          ``,
          `각 어휘의 유래와 의미 변화를 추적하세요:`,
          `- 고유어: 옛말 형태와 의미 변천`,
          `- 한자어: 중국/일본에서의 용법과 한국에서의 의미 변화`,
          `- 외래어: 원어와 한국어에서의 의미 차이`,
          ``,
        ].join('\n') : '',
        `## 출력 형식: ${params.output_format}`,
        ``,
        getOutputFormatGuide(params.output_format),
        ``,
        `## 교수-학습 활용 제안`,
        ``,
        `### 수업 전 (Pre-teaching)`,
        `- B등급 어휘 중 핵심 5~7개를 선별하여 사전 학습`,
        `- 어휘 카드나 워드 월(Word Wall) 활용`,
        ``,
        `### 수업 중 (During)`,
        `- 맥락 단서를 활용한 어휘 추론 활동`,
        `- 어휘 관계(유의어/반의어) 탐구 활동`,
        ``,
        `### 수업 후 (Post)`,
        `- 새로 배운 어휘를 활용한 문장 만들기`,
        `- 어휘 퀴즈 또는 크로스워드 퍼즐`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}

function getOutputFormatGuide(format: string): string {
  const formats: Record<string, string> = {
    '분석표': [
      `다음 표 형식으로 분석 결과를 정리하세요:`,
      ``,
      `\`\`\`markdown`,
      `| 어휘 | 난이도 | 분류 | 뜻풀이 | 예문 | 관련어 |`,
      `|------|--------|------|--------|------|--------|`,
      `| 관조 | C | 한자어 | 고요한 마음으로 사물을 관찰함 | "자연을 관조하다" | 관찰, 성찰 |`,
      `| ... | ... | ... | ... | ... | ... |`,
      `\`\`\``,
      ``,
      `추가로 다음 통계를 포함하세요:`,
      `- 총 분석 어휘 수`,
      `- 등급별 분포 (A/B/C/D 각 몇 개)`,
      `- 분류별 분포 (교과핵심/고급일반/한자어/관용표현/전문용어)`,
    ].join('\n'),
    '어휘목록': [
      `등급별로 그룹화하여 어휘 목록을 작성하세요:`,
      ``,
      `\`\`\`markdown`,
      `## B등급 (학습 대상) - 10개`,
      `1. **갈등** [葛藤]: 서로 다른 의견이나 이해가 충돌하는 상태`,
      `2. **복선** [伏線]: 앞으로 일어날 일을 미리 암시하는 장치`,
      `...`,
      ``,
      `## C등급 (도전) - 5개`,
      `1. **관조** [觀照]: 고요한 마음으로 사물의 본질을 살펴봄`,
      `...`,
      `\`\`\``,
    ].join('\n'),
    '학습카드': [
      `플래시카드 형태로 어휘 학습 자료를 작성하세요:`,
      ``,
      `\`\`\`markdown`,
      `---`,
      `### 카드 1: 갈등 (葛藤)`,
      `**앞면**: 갈등`,
      `**뒷면**:`,
      `- 뜻: 서로 다른 의견이나 이해가 충돌하는 상태`,
      `- 한자: 칡 갈(葛) + 등나무 등(藤) → 칡과 등나무가 엉키듯 복잡하게 얽힘`,
      `- 예문: "주인공은 우정과 정의 사이에서 갈등을 겪는다."`,
      `- 연어: 갈등을 겪다 / 갈등이 심화되다 / 갈등을 해소하다`,
      `---`,
      `\`\`\``,
    ].join('\n'),
  };
  return formats[format] || formats['분석표'];
}
