import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { resolveGrade, GRADE_DESCRIPTION } from '../utils/grade-matcher.js';

export function registerListTools(server: McpServer, db: Client) {
  // ─────────────────────────────────────────────
  // list_grades: DB에 있는 학년/과목 목록 반환
  // ─────────────────────────────────────────────
  server.tool(
    'list_grades',
    `DB에 저장된 사용 가능한 학년/과목 목록을 반환합니다. 검색 전에 어떤 데이터가 있는지 확인할 때 사용하세요.`,
    {},
    async () => {
      const result = await db.execute({
        sql: `
          SELECT DISTINCT s.grade, s.source_type, COUNT(u.id) as unit_count
          FROM sources s
          JOIN units u ON u.source_id = s.id
          GROUP BY s.grade, s.source_type
          ORDER BY s.grade, s.source_type
        `,
        args: [],
      });

      const grades = result.rows as unknown as { grade: string; source_type: string; unit_count: number }[];

      // 학년별로 그룹핑
      const grouped: Record<string, { source_types: string[]; total_units: number }> = {};
      for (const row of grades) {
        if (!grouped[row.grade]) {
          grouped[row.grade] = { source_types: [], total_units: 0 };
        }
        grouped[row.grade].source_types.push(row.source_type);
        grouped[row.grade].total_units += Number(row.unit_count);
      }

      const response = {
        available_grades: Object.keys(grouped),
        details: grouped,
        total_grades: Object.keys(grouped).length,
        tip: '특정 학년의 단원 구조를 보려면 list_units 도구를 사용하세요.',
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        }],
      };
    },
  );

  // ─────────────────────────────────────────────
  // list_units: 특정 grade의 단원 구조 반환
  // ─────────────────────────────────────────────
  server.tool(
    'list_units',
    `특정 학년/과목의 단원 구조(단원번호, 소단원명)를 반환합니다. 자연어로 학년을 입력해도 자동 매칭됩니다.
${GRADE_DESCRIPTION}`,
    {
      grade: z.string().describe(`학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). ${GRADE_DESCRIPTION}`),
      source_type: z.string().optional().describe('자료 유형 필터 (textbook, teacher-guide 등). 미지정 시 전체 반환'),
    },
    async (params) => {
      const resolvedGrades = resolveGrade(params.grade);

      // 매칭된 모든 grade에서 단원 조회
      const placeholders = resolvedGrades.map(() => '?').join(',');
      const args: (string | number)[] = [...resolvedGrades];

      let sql = `
        SELECT u.id, u.unit_number, u.title, u.sub_unit, s.grade, s.source_type
        FROM units u
        JOIN sources s ON s.id = u.source_id
        WHERE s.grade IN (${placeholders})
      `;

      if (params.source_type) {
        sql += ' AND s.source_type = ?';
        args.push(params.source_type);
      }

      sql += ' ORDER BY s.grade, u.unit_number, u.sub_unit';

      const result = await db.execute({ sql, args });
      const units = result.rows as unknown as {
        id: string;
        unit_number: number;
        title: string;
        sub_unit: string | null;
        grade: string;
        source_type: string;
      }[];

      // 학년 > 단원번호 > 소단원 구조로 정리
      const structured: Record<string, Record<number, { title: string; sub_units: string[]; unit_ids: string[] }>> = {};

      for (const unit of units) {
        if (!structured[unit.grade]) structured[unit.grade] = {};
        if (!structured[unit.grade][unit.unit_number]) {
          structured[unit.grade][unit.unit_number] = {
            title: unit.title,
            sub_units: [],
            unit_ids: [],
          };
        }
        if (unit.sub_unit && !structured[unit.grade][unit.unit_number].sub_units.includes(unit.sub_unit)) {
          structured[unit.grade][unit.unit_number].sub_units.push(unit.sub_unit);
        }
        structured[unit.grade][unit.unit_number].unit_ids.push(unit.id);
      }

      const response = {
        _grade_matching: {
          input: params.grade,
          resolved_to: resolvedGrades,
        },
        unit_structure: structured,
        total_units: units.length,
        tip: '특정 단원의 자료를 검색하려면 search_content 도구에 grade와 unit_number를 지정하세요.',
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        }],
      };
    },
  );
}
