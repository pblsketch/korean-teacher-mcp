import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerWorksheetTool(server: McpServer, db: Client) {
  server.tool(
    'generate_worksheet',
    '활동지 생성을 위한 컨텍스트를 반환합니다. 단원의 지문, 활동, 교사노트를 포함합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      class_info: z.string().optional().describe('학급 특성 (예: "토론 좋아하는 반, 독해력 중상")'),
      activity_types: z.array(z.string()).optional().describe('활동 유형 필터 (읽기, 쓰기, 말하기 등)'),
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
        `# 활동지 생성 컨텍스트`,
        `## 단원 정보`,
        `- 단원: ${unit?.title ?? ''}`,
        `- 소단원: ${unit?.sub_unit ?? ''}`,
        params.class_info ? `- 학급 특성: ${params.class_info}` : '',
        '',
        `## 지문 (${context.passages.length}개)`,
        ...context.passages.map(p => `### ${p.title}${p.author ? ` (${p.author})` : ''}\n${p.content}\n`),
        `## 기존 활동 (${context.activities.length}개)`,
        ...context.activities.map((a, i) => `### 활동 ${i + 1}\n${a.content}\n`),
        `## HWPX 출력 안내`,
        ``,
        `활동지는 export_hwpx 도구로 HWPX 파일로 출력할 수 있습니다.`,
        `- **template**: \`"worksheet"\``,
        `- **section_xml**: 이 템플릿에는 채울 자리 표시가 없으므로, section_xml을 처음부터 새로 작성합니다`,
        ``,
        `### section_xml 작성 방법`,
        `worksheet 템플릿은 자유 형식입니다. OWPML 규격에 맞는 section XML을 직접 구성하세요:`,
        `- 상단: 제목 단락 (charPrIDRef="7") + 메타 정보 표 (학년/반, 단원명 등)`,
        `- 중간: 지문 단락 (charPrIDRef="0") + 활동 문항 (번호는 charPrIDRef="9")`,
        `- 하단: 답란 표 (borderFillIDRef="5" 연청색 셀 활용)`,
        `- owpml-conventions 리소스의 표/단락 규격을 참조하세요`,
        ``,
        `## 교사 노트 (${context.teacher_notes.length}개)`,
        ...context.teacher_notes.map(n => `${n.tips}\n발문: ${JSON.parse(n.questions).join(', ')}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: contextMarkdown,
        }],
      };
    },
  );
}
