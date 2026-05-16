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
        `- **section_xml**: 아래 채울 자리 표시에 내용을 넣어 전달`,
        ``,
        `### 채울 자리 표시 매핑 (worksheet 템플릿)`,
        `- 상단: {{활동지 제목}}, {{학교명}}, {{교과/과목}}, {{학년/반}}, {{단원/주제}}, {{활동 유형}}`,
        `- 활동 목표: {{활동 목표1}}, {{활동 목표2}}, {{활동 목표3}}`,
        `- 핵심 개념: {{핵심 개념1}}, {{개념 설명1}}, {{핵심 개념2}}, {{개념 설명2}}, {{핵심 개념3}}, {{개념 설명3}}`,
        `- 대화 상황 분석: {{상황 자료}}, {{분석 질문1}}, {{분석 답란1}}, {{분석 질문2}}, {{분석 답란2}}, {{분석 질문3}}, {{분석 답란3}}`,
        `- 공감 표현 고쳐 쓰기: {{고쳐쓰기 문항1}}, {{고쳐쓰기 답란1}}, {{고쳐쓰기 문항2}}, {{고쳐쓰기 답란2}}, {{고쳐쓰기 문항3}}, {{고쳐쓰기 답란3}}`,
        `- 모둠 대화문 만들기: {{대화문 조건}}, {{대화문 작성란}}`,
        `- 자기 성찰: {{성찰 질문1}}, {{성찰 답란1}}, {{성찰 질문2}}, {{성찰 답란2}}, {{성찰 질문3}}, {{성찰 답란3}}`,
        `- 학생 작성 칸은 밑줄 기호로 공란을 표시하지 말고, 표의 빈 칸이나 여백으로 둡니다.`,
        `- 활동지는 학생용 문서이므로 교사용 정답·해설은 넣지 않습니다.`,
        `- 활동은 개념 확인 → 상황 분석 → 표현 고쳐 쓰기 → 대화문 생산 → 성찰 순서로 구성하세요.`,
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
