import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerDiscussionTool(server: McpServer, db: Client) {
  server.tool(
    'generate_discussion',
    '토의토론 수업 자료 생성을 위한 컨텍스트를 반환합니다. 지문과 토론 유형별 가이드를 포함합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      passage_id: z.string().optional().describe('특정 지문 ID'),
      discussion_type: z.enum(['찬반', '원탁', '소그룹', '패널']).default('찬반').describe('토론 유형'),
      group_size: z.number().int().min(2).max(8).default(4).describe('모둠 인원'),
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

      // Filter specific passage if requested
      const passages = params.passage_id
        ? context.passages.filter(p => p.id === params.passage_id)
        : context.passages;

      const contextMarkdown = [
        `# 토의토론 수업 컨텍스트`,
        `## 단원: ${unit?.title ?? ''}`,
        `## 요청 사항`,
        `- 토론 유형: ${params.discussion_type}`,
        `- 모둠 인원: ${params.group_size}명`,
        '',
        `## 지문 (${passages.length}개)`,
        ...passages.map(p => `### ${p.title}${p.author ? ` (${p.author})` : ''} [${p.genre}]\n${p.content}\n`),
        `## HWPX 출력 안내`,
        ``,
        `토의토론 활동지는 export_hwpx 도구로 HWPX 파일로 출력할 수 있습니다.`,
        `- **template**: \`"discussion"\``,
        `- **section_xml**: discussion 템플릿의 플레이스홀더에 내용을 채워서 전달`,
        ``,
        `## 교사 발문 참고`,
        ...context.teacher_notes.map(n => {
          const questions = JSON.parse(n.questions) as string[];
          return questions.length > 0 ? `- ${questions.join('\n- ')}` : '';
        }),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
