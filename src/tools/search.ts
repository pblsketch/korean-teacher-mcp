import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { searchContent } from '../db/queries.js';
import { resolveGrade, GRADE_DESCRIPTION } from '../utils/grade-matcher.js';

export function registerSearchTool(server: McpServer, db: Client) {
  server.tool(
    'search_content',
    `교과서 자료를 검색합니다. 학년/과목, 단원, 장르, 키워드로 검색할 수 있습니다.
자연어로 학년을 입력해도 자동으로 매칭됩니다 (예: "중학교 2학년" → "중2-1", "중2-2").
${GRADE_DESCRIPTION}`,
    {
      grade: z.string().optional().describe(`학년-학기 또는 과목명. 자연어 입력 가능. ${GRADE_DESCRIPTION}`),
      unit_number: z.number().int().optional().describe('단원 번호'),
      genre: z.string().optional().describe('장르 (시, 소설, 수필, 극, 설명문, 논설문, 기사문, 기타)'),
      source_type: z.string().optional().describe('자료 유형 (textbook, teacher-guide, worksheet, activity 등)'),
      keyword: z.string().optional().describe('키워드 검색 (지문 내용, 제목에서 검색)'),
      unit_id: z.string().optional().describe('단원 ID 직접 지정'),
      limit: z.number().int().default(10).describe('검색 결과 수 제한'),
    },
    async (params) => {
      // grade가 입력된 경우 fuzzy matching 결과를 사용자에게 보여줌
      let resolvedGrades: string[] | undefined;
      if (params.grade) {
        resolvedGrades = resolveGrade(params.grade);
      }

      const result = await searchContent(db, params);

      const summary = {
        passages_count: result.passages.length,
        activities_count: result.activities.length,
        teacher_notes_count: result.teacher_notes.length,
        assessments_count: result.assessments.length,
      };

      const response: Record<string, unknown> = { summary, ...result };

      // 매칭 정보 추가
      if (resolvedGrades && params.grade) {
        response._grade_matching = {
          input: params.grade,
          resolved_to: resolvedGrades,
          note: resolvedGrades.length > 1
            ? `"${params.grade}" → ${resolvedGrades.join(', ')} 모두에서 검색했습니다.`
            : `"${params.grade}" → "${resolvedGrades[0]}"(으)로 검색했습니다.`,
        };
      }

      // 결과가 없을 때 도움말 제공
      if (summary.passages_count === 0 && summary.activities_count === 0 && summary.assessments_count === 0) {
        response._help = {
          message: '검색 결과가 없습니다. 다음을 확인해보세요:',
          suggestions: [
            'list_grades 도구로 DB에 있는 학년/과목 목록을 먼저 확인하세요.',
            'list_units 도구로 특정 학년의 단원 구조를 확인하세요.',
            'db_status 도구로 DB에 데이터가 있는지 확인하세요.',
            'keyword 파라미터로 내용 검색을 시도해보세요.',
          ],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        }],
      };
    },
  );
}
