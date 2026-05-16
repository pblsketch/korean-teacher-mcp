import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerMeetingMinutesTool(server: McpServer) {
  server.tool(
    'generate_meeting_minutes',
    '회의록 작성을 위한 가이드라인을 반환합니다. 회의 내용이나 녹취록을 학교 현장에서 사용하는 표준 회의록 항목으로 정리하고, minutes 템플릿의 채워 넣을 칸에 맞게 바로 문서화할 수 있도록 안내합니다.',
    {
      content: z.string().describe('회의 내용, 녹취록, 또는 메모 (정리할 원본 텍스트)'),
      meeting_title: z.string().optional().describe('회의 제목 (예: "2026학년도 1학기 교직원 회의")'),
      meeting_date: z.string().optional().describe('회의 일시 (예: "2026. 5. 14.(수) 16:00~17:30")'),
      meeting_place: z.string().optional().describe('회의 장소 (예: "본관 3층 회의실")'),
      attendees: z.array(z.string()).optional().describe('참석자 목록 (예: ["교장", "교감", "1학년부장 김○○"])'),
      meeting_type: z.enum(['교직원회의', '학년회의', '부서회의', '위원회', '학부모회의', '기타']).default('교직원회의').describe('회의 유형'),
      instructions: z.string().optional().describe('추가 지침 (형식, 강조 사항 등)'),
    },
    async (params) => {
      const meetingTitle = params.meeting_title || '○○ 회의';
      const meetingDate = params.meeting_date || '2026. ○. ○.(○) ○○:○○~○○:○○';
      const meetingPlace = params.meeting_place || '○○실';

      const guideMarkdown = [
        `# 회의록 생성 가이드`,
        ``,
        `## 입력 정보`,
        `- 회의 제목: ${meetingTitle}`,
        `- 일시: ${meetingDate}`,
        `- 장소: ${meetingPlace}`,
        `- 유형: ${params.meeting_type}`,
        params.attendees ? `- 참석자: ${params.attendees.join(', ')}` : '',
        ``,
        `## 원본 내용`,
        `${params.content}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 회의록 작성 규칙`,
        ``,
        `### 표준 구조`,
        `1. **회의 정보 표** (상단 메타데이터)`,
        `   - 회의명, 일시, 장소, 참석자, 진행자, 기록자`,
        `2. **안건 목록** (번호별)`,
        `   - 각 안건: 제목 + 내용 요약 + 논의 사항 + 결정 사항`,
        `3. **전달 사항** (있을 경우)`,
        `4. **기타 사항** (있을 경우)`,
        `5. **다음 회의 일정** (있을 경우)`,
        ``,
        `### 작성 원칙`,
        `- 논의된 내용을 **안건별로 구분**하여 정리`,
        `- 각 안건의 **결정 사항**을 명확히 기록`,
        `- **담당자와 기한**이 정해진 경우 반드시 포함`,
        `- 발언자를 특정할 수 있으면 "○○○: ~" 형식으로 기록`,
        `- 핵심만 요약 (원본 그대로가 아닌 정리된 형태)`,
        ``,
        `### 문체`,
        `- 3인칭 서술체: "~함", "~임", "~하기로 함"`,
        `- 간결하고 객관적인 문체`,
        `- 의견과 결정을 구분하여 기술`,
        ``,
        `## HWPX 문서 구성 방법`,
        ``,
        `회의록은 \`minutes\` 템플릿의 채워 넣을 칸에 아래 내용을 넣어 만듭니다. 일반 사용자는 문서 내부 코드를 직접 작성하지 않아도 되며, 회의 정보·안건·논의·결정·후속 조치만 정리하면 됩니다.`,
        ``,
        `### 채워 넣을 칸 (minutes 템플릿)`,
        `- {{회의록 제목}}: ${meetingTitle}`,
        `- {{YYYY년 MM월 DD일 HH:MM}}: ${meetingDate}`,
        `- {{장소}}: ${meetingPlace}`,
        `- {{참석자 목록}}: ${params.attendees ? params.attendees.join(', ') : '참석자 이름 나열'}`,
        `- {{안건 내용}}: 안건 목록 (번호별 정리)`,
        `- {{논의 내용}}: 안건별 논의 사항 정리`,
        `- {{결정 사항}}: 결정된 사항 목록`,
        `- {{향후 조치 사항}}: 담당자·기한 포함 후속 조치`,
        `- {{작성자}}: 회의록 작성자명`,
        `### 품질 점검`,
        `- 발언 전문을 그대로 붙이지 말고 안건별 논의 요지와 결정 사항을 분리합니다.`,
        `- 후속 조치는 담당자·기한·확인 방법이 드러나게 작성합니다.`,
        `- 개인정보나 민감한 발언은 회의 목적에 필요한 범위에서만 익명화하여 기록합니다.`,
        ``,
        `## 예시 (안건 정리)`,
        ``,
        `> **안건 1. 1학기 현장체험학습 일정 확정**`,
        `> - 내용: 5월 현장체험학습 일정 및 장소 논의`,
        `> - 논의: 날짜를 5/20(화) 또는 5/22(목)으로 제안, 우천 시 대안 논의`,
        `> - 결정: 5/22(목) 실시, 우천 시 5/29(목)으로 연기하기로 함`,
        `> - 담당: 1학년부장 김○○ (5/15까지 장소 답사 후 보고)`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
