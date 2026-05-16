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
      sub_unit: z.string().optional().describe('소단원명 또는 핵심어. grade+unit_number만으로 여러 소단원이 검색될 때 정확한 문서 생성을 위해 사용'),
      passage_id: z.string().optional().describe('특정 지문 ID'),
      discussion_type: z.enum(['찬반', '원탁', '소그룹', '패널']).default('찬반').describe('토론 유형'),
      group_size: z.number().int().min(2).max(8).default(4).describe('모둠 인원'),
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
                '토의토론 자료는 소단원에 따라 지문과 활동이 달라지므로, 정확한 생성을 위해 unit_id 또는 sub_unit을 지정해 주세요.',
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
        `토의토론 활동지는 export_hwpx 도구의 \`discussion\` 템플릿으로 HWPX 파일을 만들 수 있습니다.`,
        `문서 내부 코드를 새로 쓰기보다, 아래 채워 넣을 칸에 수업 내용과 학생 작성 공간을 넣어 완성하세요.`,
        `- **template**: \`"discussion"\``,
        `- **필수 구성**: 논제, 배경 자료, 핵심 용어, 토론 규칙, 역할 분담, 입장 정리표, 근거 찾기표, 발언 기록표, 토론 후 성찰, 자기/동료 평가, 실제 학생 활동지`,
        `- **작성 공간**: 학생이 직접 쓰는 칸은 밑줄 대신 표의 빈 칸으로 둡니다.`,
        `- **고정 예시 금지**: 특정 시·소설·교과서 쪽수 예시를 남기지 말고, 요청 단원과 토론 유형에 맞게 바꿉니다.`,
        ``,
        `### discussion 템플릿의 채워 넣을 칸`,
        `{{토의토론 자료 제목}}, {{학교명}}, {{교과/과목}}, {{학년/반}}, {{단원/주제}}, {{토론 유형}}, {{모둠 인원}}`,
        `{{논제}}, {{배경 자료}}, {{핵심 용어}}, {{토론 규칙}}`,
        `{{사회자 역할}}, {{기록자 역할}}, {{발표자 역할}}, {{시간 지킴이 역할}}`,
        `{{입장1}}, {{입장 근거1}}, {{상대 입장 고려1}}, {{입장2}}, {{입장 근거2}}, {{상대 입장 고려2}}`,
        `{{근거 자료1}}, {{관련성1}}, {{출처1}}, {{근거 자료2}}, {{관련성2}}, {{출처2}}`,
        `{{자기 성찰1}}, {{자기 성찰2}}, {{동료 평가}}, {{모둠 최종 의견}}`,
        `{{활동 전 생각}}, {{나의 초기 입장}}, {{토론 중 근거 기록}}, {{토론 후 생각 변화}}, {{토론 실천 문장}}`,
        `{{발언 기록1}}, {{질문1}}, {{발언 기록2}}, {{질문2}}, {{발언 기록3}}, {{질문3}}`,
        ``,
        `### 작성 기준`,
        `- 토론 유형이 찬반이면 양쪽 입장이 모두 드러나게, 원탁/소그룹이면 합의 형성 과정을 드러나게 구성합니다.`,
        `- 근거 찾기표에는 지문 근거, 생활 사례, 자료 출처를 구분해 쓸 수 있게 합니다.`,
        `- 발언 기록표와 성찰표는 학생 작성 칸을 충분히 남깁니다.`,
        `- 마지막에는 독립된 학생 활동지 페이지를 두어 활동 전 생각, 토론 중 기록, 토론 후 생각 변화와 생활 속 실천 문장을 직접 쓰게 합니다.`,
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
