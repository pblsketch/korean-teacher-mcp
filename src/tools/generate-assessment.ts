import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerAssessmentTool(server: McpServer, db: Client) {
  server.tool(
    'generate_assessment',
    '형성평가/수행평가 생성을 위한 컨텍스트를 반환합니다. 지문, 기존 평가 문항, 성취기준을 포함합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      num_questions: z.number().int().min(1).max(50).default(20).describe('생성할 문항 수 (기본 20문항)'),
      question_types: z.array(z.string()).default(['선택형', '보기형', '서술형']).describe('문항 유형 (선택형, 보기형, 서술형, 논술형)'),
      difficulty: z.string().default('혼합').describe('난이도 (하, 중, 상, 혼합)'),
    },
    async (params) => {
      let unitId = params.unit_id;

      if (!unitId && params.grade) {
        const units = await getUnitsByFilter(db, { grade: params.grade, unit_number: params.unit_number });
        if (units.length === 0) {
          return { content: [{ type: 'text' as const, text: '해당 조건의 단원을 찾을 수 없습니다.' }] };
        }
        unitId = units[0].id;
      }

      if (!unitId) {
        return { content: [{ type: 'text' as const, text: 'unit_id 또는 grade+unit_number를 지정해주세요.' }] };
      }

      const context = await getUnitContext(db, unitId);
      const units = await getUnitsByFilter(db, { unit_id: unitId });
      const unit = units[0];

      const contextMarkdown = [
        `# 평가 생성 컨텍스트`,
        `## 단원: ${unit?.title ?? ''}`,
        `## 요청 사항`,
        `- 문항 수: ${params.num_questions}개`,
        `- 문항 유형: ${params.question_types.join(', ')}`,
        `- 난이도: ${params.difficulty}`,
        '',
        `## 문항 구성 가이드라인 (20문항 기준)`,
        ``,
        `### 유형 배분`,
        `| 유형 | 문항 수 | 비율 | 설명 |`,
        `|------|---------|------|------|`,
        `| 선택형 | 10문항 | 50% | 4지선다형, 개념 확인 및 적용 |`,
        `| 보기형 | 4문항 | 20% | <보기> 자료를 제시하고 분석/판단하는 문항 |`,
        `| 서술형 | 6문항 | 30% | 개념 설명, 분석, 비교, 적용 서술 |`,
        ``,
        `### 난이도 배분 (혼합 기준)`,
        `| 난이도 | 문항 수 | 비율 |`,
        `|--------|---------|------|`,
        `| 하 | 6문항 | 30% |`,
        `| 중 | 8문항 | 40% |`,
        `| 상 | 6문항 | 30% |`,
        ``,
        `### 보기형 문항 작성 지침`,
        `- <보기>에 예문, 대화, 텍스트, 표, 도표 등 다양한 자료를 제시`,
        `- <보기>의 내용을 분석·적용·판단하는 문항으로 구성`,
        `- 예: "다음 <보기>를 읽고 물음에 답하시오."`,
        `- 보기형은 선택형(4지선다)과 결합하거나 서술형과 결합 가능`,
        ``,
        `### Bloom 인지 수준 배분`,
        `| 수준 | 동사 | 권장 비율 |`,
        `|------|------|----------|`,
        `| 기억 | 정의, 나열 | 15% (하) |`,
        `| 이해 | 설명, 비교 | 25% (하~중) |`,
        `| 적용 | 적용, 분류 | 30% (중) |`,
        `| 분석 | 구분, 분석 | 20% (중~상) |`,
        `| 평가/창안 | 평가, 제안 | 10% (상) |`,
        ``,
        `### 필수 포함 요소`,
        `- 각 문항별: 정답, 해설, 배점, 난이도`,
        `- 선택형 오답 매력도를 고려한 선지 구성`,
        `- 서술형 채점 기준(배점 세분화)`,
        '',
        `## 지문 (${context.passages.length}개)`,
        ...context.passages.map(p => `### ${p.title}\n${p.content}\n`),
        `## 기존 평가 문항 (${context.assessments.length}개, 참고용)`,
        ...context.assessments.map((a, i) => `### 문항 ${i + 1} (${a.question_type})\n${a.content}\n정답: ${a.answer}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
