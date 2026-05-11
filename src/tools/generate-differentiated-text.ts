import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerDifferentiatedTextTool(server: McpServer, db: Client) {
  server.tool(
    'generate_differentiated_text',
    '수준별 지문 변환기: 원본 국어 지문을 학생 수준에 맞게 3단계(기초/일반/심화)로 변환하기 위한 가이드라인과 컨텍스트를 반환합니다. 기초학력 지원, 일반 수업, 심화 학습에 활용할 수 있습니다.',
    {
      unit_id: z.string().optional().describe('단원 ID (DB에서 원본 지문을 가져올 경우)'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      original_text: z.string().optional().describe('직접 입력하는 원본 지문 (unit_id 대신 사용 가능)'),
      target_grade: z.string().default('중학교 1학년').describe('대상 학년 (원본 지문의 기준 학년)'),
      differentiation_levels: z.array(z.enum(['기초', '일반', '심화'])).default(['기초', '일반', '심화']).describe('생성할 수준 (기초/일반/심화 중 선택)'),
      focus_area: z.enum(['어휘', '문장구조', '내용량', '종합']).default('종합').describe('변환 초점 영역'),
      purpose: z.string().optional().describe('활용 목적 (예: "기초학력 지원 학생용 보조 자료", "영재반 심화 읽기")'),
    },
    async (params) => {
      // 원본 지문 확보
      let originalText = params.original_text || '';
      let unitTitle = '';

      if (!originalText && (params.unit_id || params.grade)) {
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
            originalText = context.passages.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
          }
        }
      }

      const guideMarkdown = [
        `# 수준별 지문 변환 가이드`,
        ``,
        `## 변환 개요`,
        `| 항목 | 내용 |`,
        `|------|------|`,
        `| 대상 학년 | ${params.target_grade} |`,
        `| 생성 수준 | ${params.differentiation_levels.join(', ')} |`,
        `| 변환 초점 | ${params.focus_area} |`,
        unitTitle ? `| 단원 | ${unitTitle} |` : '',
        params.purpose ? `| 활용 목적 | ${params.purpose} |` : '',
        ``,
        originalText ? [
          `## 원본 지문`,
          ``,
          `\`\`\``,
          originalText.substring(0, 3000),
          originalText.length > 3000 ? '\n... (이하 생략)' : '',
          `\`\`\``,
          ``,
        ].join('\n') : '',
        `## 수준별 변환 지침`,
        ``,
        ...params.differentiation_levels.map(level => getLevelGuide(level, params.focus_area)),
        ``,
        `## 변환 원칙`,
        ``,
        `### 반드시 유지해야 할 요소`,
        `1. **핵심 주제와 메시지**: 원본의 중심 내용과 주제 의식은 모든 수준에서 동일하게 유지합니다.`,
        `2. **텍스트 구조**: 서론-본론-결론 등 글의 기본 구조는 유지합니다.`,
        `3. **교육적 가치**: 학습 목표 달성에 필요한 핵심 내용은 삭제하지 않습니다.`,
        `4. **문학적 특성**: 문학 작품의 경우 장르적 특성(운율, 비유 등)은 수준에 맞게 조정하되 완전히 제거하지 않습니다.`,
        ``,
        `### 변환 시 주의사항`,
        `- 기초 수준이라고 해서 내용을 "유치하게" 만들지 않습니다. 존중하는 어조를 유지합니다.`,
        `- 심화 수준은 단순히 길게 만드는 것이 아니라, 사고의 깊이를 요구하도록 합니다.`,
        `- 각 수준의 지문은 독립적으로 읽혀야 합니다 (다른 수준을 먼저 읽지 않아도 이해 가능).`,
        ``,
        `## 출력 형식`,
        ``,
        `각 수준별로 다음 구조로 출력해주세요:`,
        ``,
        `\`\`\`markdown`,
        `## [기초] 수준 지문`,
        `- 예상 읽기 시간: X분`,
        `- 어휘 수준: 해당 학년 -1~2년 수준`,
        `- 글자 수: 약 XXX자`,
        ``,
        `(변환된 지문)`,
        ``,
        `### 어휘 도움말`,
        `| 단어 | 뜻 |`,
        `|------|-----|`,
        `| ... | ... |`,
        `\`\`\``,
        ``,
        `## 활용 팁`,
        `- **기초 수준**: 읽기 전 활동으로 핵심 어휘를 미리 학습시킨 후 제공합니다.`,
        `- **일반 수준**: 교과서 본문과 동일하거나 유사한 수준으로 수업에 직접 활용합니다.`,
        `- **심화 수준**: 추가 탐구 과제나 독서 활동과 연계하여 제공합니다.`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}

function getLevelGuide(level: string, focus: string): string {
  const guides: Record<string, Record<string, string>> = {
    '기초': {
      '어휘': [
        `### 기초 수준 (어휘 중심 변환)`,
        `- 고급 어휘 → 일상적이고 친숙한 어휘로 대체`,
        `- 한자어 → 순우리말 또는 쉬운 표현으로 풀어쓰기`,
        `- 관용 표현 → 직접적 의미로 풀어서 설명`,
        `- 전문 용어에는 괄호 안에 쉬운 설명 추가`,
        `- 예: "갈등(서로 다른 생각이 부딪히는 것)"`,
      ].join('\n'),
      '문장구조': [
        `### 기초 수준 (문장구조 중심 변환)`,
        `- 복문 → 단문으로 분리 (한 문장에 하나의 의미)`,
        `- 피동/사동 표현 → 능동 표현으로 변환`,
        `- 긴 수식어구 → 별도 문장으로 분리`,
        `- 문장 길이: 평균 15~20자 이내`,
        `- 접속사를 활용하여 문장 간 관계를 명시적으로 표현`,
      ].join('\n'),
      '내용량': [
        `### 기초 수준 (내용량 중심 변환)`,
        `- 원본 분량의 60~70%로 축약`,
        `- 부가적 설명, 예시, 배경 정보 중 핵심이 아닌 것 제거`,
        `- 핵심 내용만 남기되 논리적 흐름은 유지`,
        `- 단락 수를 줄이고 각 단락의 핵심 문장을 명확히 제시`,
      ].join('\n'),
      '종합': [
        `### 기초 수준 (종합 변환)`,
        `| 변환 요소 | 기준 |`,
        `|-----------|------|`,
        `| 어휘 | 해당 학년 -1~2년 수준, 한자어 최소화 |`,
        `| 문장 길이 | 평균 15~20자, 단문 위주 |`,
        `| 내용량 | 원본의 60~70% |`,
        `| 보조 장치 | 어휘 도움말, 핵심 문장 밑줄, 단락 요약 추가 |`,
        `| 시각 자료 | 내용 이해를 돕는 간단한 그림/도표 제안 |`,
      ].join('\n'),
    },
    '일반': {
      '어휘': [
        `### 일반 수준`,
        `- 원본 지문을 그대로 유지하거나 최소한의 조정만 수행`,
        `- 교과서 수준에 맞는 적절한 어휘 사용`,
        `- 필요 시 각주로 어려운 어휘 설명 추가`,
      ].join('\n'),
      '문장구조': [
        `### 일반 수준`,
        `- 원본 지문의 문장 구조를 대체로 유지`,
        `- 지나치게 복잡한 문장만 약간 조정`,
        `- 교과서 수준의 적절한 복문 사용`,
      ].join('\n'),
      '내용량': [
        `### 일반 수준`,
        `- 원본 분량 유지 (100%)`,
        `- 내용 추가/삭제 없이 원본 그대로 제공`,
      ].join('\n'),
      '종합': [
        `### 일반 수준 (원본 유지)`,
        `| 변환 요소 | 기준 |`,
        `|-----------|------|`,
        `| 어휘 | 해당 학년 수준 (교과서 기준) |`,
        `| 문장 길이 | 원본 유지 |`,
        `| 내용량 | 원본의 100% |`,
        `| 보조 장치 | 필요 시 각주 정도만 추가 |`,
      ].join('\n'),
    },
    '심화': {
      '어휘': [
        `### 심화 수준 (어휘 중심 확장)`,
        `- 일부 일상 어휘 → 학술적/문학적 어휘로 격상`,
        `- 관련 한자어, 고사성어, 전문 용어 추가 소개`,
        `- 다의어의 다양한 의미 맥락 제시`,
        `- 어원 정보나 유의어/반의어 네트워크 제공`,
      ].join('\n'),
      '문장구조': [
        `### 심화 수준 (문장구조 중심 확장)`,
        `- 단문 일부 → 복문으로 통합하여 논리적 관계 강화`,
        `- 다양한 문장 유형(도치, 생략, 삽입) 활용`,
        `- 비유적 표현, 반어, 역설 등 수사법 추가`,
        `- 필자의 관점이 드러나는 논증 구조 강화`,
      ].join('\n'),
      '내용량': [
        `### 심화 수준 (내용량 중심 확장)`,
        `- 원본 분량의 120~140%로 확장`,
        `- 배경 지식, 관련 사례, 다른 관점 추가`,
        `- 비판적 사고를 유도하는 질문이나 논점 삽입`,
        `- 타 교과/분야와의 연결점 제시`,
      ].join('\n'),
      '종합': [
        `### 심화 수준 (종합 확장)`,
        `| 변환 요소 | 기준 |`,
        `|-----------|------|`,
        `| 어휘 | 해당 학년 +1~2년 수준, 학술적 표현 포함 |`,
        `| 문장 길이 | 복문 활용, 다양한 문장 구조 |`,
        `| 내용량 | 원본의 120~140% |`,
        `| 보조 장치 | 탐구 질문, 관련 자료 링크, 비교 텍스트 제안 |`,
        `| 사고 확장 | 비판적 질문, 다른 관점 제시, 창의적 과제 연계 |`,
      ].join('\n'),
    },
  };

  return guides[level]?.[focus] || guides[level]?.['종합'] || '';
}
