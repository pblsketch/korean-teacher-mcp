import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerSeatingChartTool(server: McpServer) {
  server.tool(
    'generate_seating_chart',
    '교실 자리배치도를 생성하기 위한 가이드라인과 프롬프트를 반환합니다. 학생 명단을 입력받아 다양한 배치 유형(줄형, ㄷ자형, 모둠형 등)의 자리배치도 작성 지침을 제공합니다.',
    {
      students: z.string().describe('학생 명단 (쉼표 또는 줄바꿈 구분). 예: "김민준, 이서연, 박지호, ..."'),
      rows: z.number().int().min(1).max(10).default(6).describe('세로 줄 수 (기본 6)'),
      cols: z.number().int().min(1).max(10).default(6).describe('가로 줄 수 (기본 6)'),
      layout_type: z.enum(['grid', 'u_shape', 'group', 'circle']).default('grid').describe('배치 유형: grid=줄형(기본), u_shape=ㄷ자형, group=모둠형(4~6인), circle=원형'),
      group_size: z.number().int().min(2).max(8).optional().describe('모둠형일 때 모둠 인원 (기본 4)'),
      considerations: z.string().optional().describe('배치 시 고려사항 (예: "김민준-이서연 분리", "박지호 앞자리 배치")'),
      class_name: z.string().optional().describe('학급명 (예: "6학년 3반")'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const studentList = params.students
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const layoutGuides: Record<string, string> = {
        grid: [
          `### 줄형 (Grid) 배치`,
          `- 전통적인 세로줄 배치`,
          `- ${params.cols}열 × ${params.rows}행`,
          `- 칠판을 바라보는 방향`,
          `- 앞뒤 학생 사이 간격 고려`,
        ].join('\n'),
        u_shape: [
          `### ㄷ자형 (U-Shape) 배치`,
          `- 토론 수업에 적합`,
          `- 3면 배치 (좌-중앙-우)`,
          `- 학생 간 시선 교류 용이`,
          `- 중앙 공간 활용 가능`,
        ].join('\n'),
        group: [
          `### 모둠형 (Group) 배치`,
          `- ${params.group_size || 4}인 1모둠`,
          `- 모둠 수: ${Math.ceil(studentList.length / (params.group_size || 4))}개`,
          `- 협동학습, PBL에 적합`,
          `- 모둠 간 이동 통로 확보`,
        ].join('\n'),
        circle: [
          `### 원형 (Circle) 배치`,
          `- 전체 토론, 학급회의에 적합`,
          `- 모든 학생 동등한 위치`,
          `- 원형 또는 타원형`,
          `- 중앙 공간 활용`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 자리배치도 생성 가이드`,
        ``,
        `## 입력 정보`,
        params.class_name ? `- 학급: ${params.class_name}` : '',
        `- 학생 수: ${studentList.length}명`,
        `- 배치 유형: ${params.layout_type}`,
        `- 배치 크기: ${params.cols}열 × ${params.rows}행`,
        params.group_size ? `- 모둠 인원: ${params.group_size}명` : '',
        ``,
        `## 학생 명단`,
        studentList.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        ``,
        params.considerations ? `## 배치 시 고려사항\n${params.considerations}\n` : '',
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 배치 유형별 가이드`,
        ``,
        layoutGuides[params.layout_type],
        ``,
        `## 작성 규칙`,
        ``,
        `### 자리배치 원칙`,
        `1. **시력**: 시력이 약한 학생 → 앞자리`,
        `2. **집중력**: 집중이 어려운 학생 → 교사 근접 배치`,
        `3. **교우관계**: 갈등 관계 학생 → 분리 배치`,
        `4. **학습 수준**: 다양한 수준 혼합 (또래 학습 효과)`,
        `5. **키 순서**: 뒤로 갈수록 큰 키 학생`,
        `6. **특수교육대상**: 보조교사 접근 가능 위치`,
        ``,
        `### 시각적 표현`,
        `- 교탁/칠판 위치 표시: 상단 중앙`,
        `- 각 자리에 학생 이름 표시`,
        `- 빈 자리는 "빈자리" 또는 공백 표시`,
        `- 모둠형: 모둠 번호 표시`,
        `- 출입문, 창문 위치 표시 (선택)`,
        ``,
        `## HWPX 출력 안내`,
        ``,
        `자리배치도는 **표(table)** 형식으로 작성하여 export_hwpx 도구로 출력합니다.`,
        `- 템플릿: "roster"`,
        `- 상단: 학급명 + "자리배치도" 제목`,
        `- 중앙: 배치도 표 (markdown 표 형식으로 작성)`,
        `- 하단: 배치일, 고려사항 메모`,
        ``,
        `### 표 작성 예시 (줄형 6열)`,
        `\`\`\``,
        `|  칠판  |        |        |        |        |        |`,
        `|--------|--------|--------|--------|--------|--------|`,
        `| 김민준 | 이서연 | 박지호 | 최수빈 | 정하은 | 강도윤 |`,
        `| ...    | ...    | ...    | ...    | ...    | ...    |`,
        `\`\`\``,
        ``,
        `## 출력 구조`,
        ``,
        `1. **제목**: "○학년 ○반 자리배치도"`,
        `2. **배치도**: 표 형태의 자리 배치`,
        `3. **범례**: 배치 유형 설명`,
        `4. **메모**: 배치일, 고려사항`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
