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
      sub_unit: z.string().optional().describe('소단원명 또는 핵심어 (예: "마음을 어루만지는 대화", "소설의 서술자"). grade+unit_number만으로 여러 소단원이 검색될 때 정확한 활동지 생성을 위해 사용'),
      class_info: z.string().optional().describe('학급 특성 (예: "토론 좋아하는 반, 독해력 중상")'),
      activity_types: z.array(z.string()).optional().describe('활동 유형 필터 (읽기, 쓰기, 말하기 등)'),
    },
    async (params) => {
      let unitId = params.unit_id;

      if (!unitId && params.grade) {
        let units = await getUnitsByFilter(db, { grade: params.grade, unit_number: params.unit_number });
        if (params.sub_unit) {
          const keyword = params.sub_unit.trim();
          units = units.filter(u =>
            (u.sub_unit ?? '').includes(keyword) ||
            (u.title ?? '').includes(keyword),
          );
        }
        if (units.length === 0) {
          return { content: [{ type: 'text' as const, text: '해당 조건의 단원을 찾을 수 없습니다.' }] };
        }
        if (units.length > 1 && !params.sub_unit) {
          const candidates = units
            .slice(0, 12)
            .map((u, i) => `${i + 1}. unit_id: ${u.id}\n   단원: ${u.title ?? ''}\n   소단원: ${u.sub_unit ?? '(없음)'}`)
            .join('\n');
          return {
            content: [{
              type: 'text' as const,
              text: [
                'grade+unit_number 조건에 여러 소단원이 검색되었습니다.',
                '활동지는 소단원에 따라 지문과 활동이 달라지므로, 정확한 생성을 위해 unit_id 또는 sub_unit을 지정해 주세요.',
                '',
                candidates,
              ].join('\n'),
            }],
          };
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
        `- 학습 목표: 학생 행동이 드러나는 2~3개 목표 제시`,
        `- 개념 확인: 핵심 개념을 빈칸·연결·OX 등 짧은 문항으로 확인`,
        `- 적용 활동: 실제 대화문·지문 일부를 제시하고 분석하도록 구성`,
        `- 생산 활동: 학생이 직접 고쳐 쓰기, 대본 쓰기, 짧은 글쓰기 수행`,
        `- 성찰 활동: 자기 점검표 또는 배운 점 1문장 쓰기 포함`,
        `- 하단: 답란은 충분한 빈칸/표로 제공하고, 교사용 정답은 별도 문서가 아니면 넣지 않음`,
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
