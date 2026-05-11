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
      num_sessions: z.number().int().min(1).max(10).default(4).describe('차시 수'),
      class_characteristics: z.string().optional().describe('학급 특성'),
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
        `## 교사 노트`,
        ...context.teacher_notes.map(n => `${n.tips}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
