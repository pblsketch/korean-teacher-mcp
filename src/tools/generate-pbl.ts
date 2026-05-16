import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerPblTool(server: McpServer, db: Client) {
  server.tool(
    'generate_pbl',
    'PBL(프로젝트 기반 학습) 설계를 위한 컨텍스트를 반환합니다. 지문, 활동, 성취기준, PBL 교수법 가이드를 포함합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      sub_unit: z.string().optional().describe('소단원명 또는 핵심어. grade+unit_number만으로 여러 소단원이 검색될 때 정확한 문서 생성을 위해 사용'),
      num_sessions: z.number().int().min(1).max(10).default(4).describe('차시 수'),
      class_characteristics: z.string().optional().describe('학급 특성'),
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
                'PBL 설계서는 소단원에 따라 지문과 활동이 달라지므로, 정확한 생성을 위해 unit_id 또는 sub_unit을 지정해 주세요.',
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
        `# PBL 수업 설계 컨텍스트`,
        `## 단원: ${unit?.title ?? ''}`,
        `## 요청 사항`,
        `- 차시 수: ${params.num_sessions}차시`,
        params.class_characteristics ? `- 학급 특성: ${params.class_characteristics}` : '',
        '',
        `## 성취기준`,
        unit?.achievement_std ?? '[]',
        '',
        `## 학습 목표`,
        unit?.learning_objectives ?? '[]',
        '',
        `## 지문 (${context.passages.length}개)`,
        ...context.passages.map(p => `### ${p.title}${p.author ? ` (${p.author})` : ''} [${p.genre}]\n${p.content}\n`),
        `## 기존 활동 (${context.activities.length}개)`,
        ...context.activities.map((a, i) => `### 활동 ${i + 1}\n${a.content}\n`),
        `## HWPX 출력 안내`,
        ``,
        `PBL 수업 설계서는 export_hwpx 도구로 HWPX 파일로 출력할 수 있습니다.`,
        `- **template**: \`"pbl"\``,
        `- **section_xml**: 이 템플릿에는 채울 자리 표시가 없으므로, section_xml을 처음부터 새로 작성합니다`,
        ``,
        `### section_xml 작성 방법`,
        `pbl 템플릿은 가로(landscape) 형식입니다. OWPML 규격에 맞는 section XML을 직접 구성하세요:`,
        `- 상단: 프로젝트 제목 (charPrIDRef="7") + 개요 2열 표 (항목/내용)`,
        `- 중간: 성취기준 강조 셀 (borderFillIDRef="5") + 차시별 활동 표`,
        `- 하단: 평가 계획 표`,
        `- ⚠ 중첩 표(표 안의 표) 금지 — 한글에서 레이아웃 붕괴 발생`,
        `- owpml-conventions 리소스의 표/단락 규격을 참조하세요`,
        ``,
        `## 교사 노트`,
        ...context.teacher_notes.map(n => `${n.tips}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
