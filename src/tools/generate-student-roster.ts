import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerStudentRosterTool(server: McpServer) {
  server.tool(
    'generate_student_roster',
    '학급 명렬표를 생성하기 위한 가이드라인과 프롬프트를 반환합니다. 학생 명단과 목적에 맞는 명렬표(출석부, 체크리스트, 상담기록부 등) 작성 지침을 제공합니다.',
    {
      students: z.string().describe('학생 명단 (쉼표 또는 줄바꿈 구분). 예: "김민준, 이서연, 박지호, ..."'),
      roster_type: z.enum(['attendance', 'checklist', 'counseling', 'grade', 'contact', 'custom']).default('attendance').describe('유형: attendance=출석부(기본), checklist=체크리스트, counseling=상담기록, grade=성적기록, contact=연락처, custom=사용자정의'),
      columns: z.string().optional().describe('사용자정의 열 이름 (쉼표 구분). 예: "출석, 과제, 발표, 비고"'),
      date_range: z.string().optional().describe('기간 (예: "2026년 5월", "2026. 3. 2. ~ 2026. 7. 18.")'),
      class_name: z.string().optional().describe('학급명 (예: "6학년 3반")'),
      teacher_name: z.string().optional().describe('담임 교사명'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const studentList = params.students
        .split(/[,\n]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const typeConfigs: Record<string, { label: string; columns: string[]; description: string }> = {
        attendance: {
          label: '출석부',
          columns: ['번호', '이름', '성별', ...Array.from({ length: 5 }, (_, i) => `${i + 1}일`)],
          description: '일별 출석 확인용. ○=출석, △=지각, ×=결석, ●=조퇴, ◎=결과',
        },
        checklist: {
          label: '체크리스트 명렬표',
          columns: ['번호', '이름', '항목1', '항목2', '항목3', '비고'],
          description: '과제/준비물/활동 확인용. ✓=완료, 공란=미완료',
        },
        counseling: {
          label: '상담 기록부',
          columns: ['번호', '이름', '상담일', '상담유형', '상담내용요약', '후속조치'],
          description: '학생 상담 기록 관리용',
        },
        grade: {
          label: '성적 기록부',
          columns: ['번호', '이름', '1차', '2차', '수행1', '수행2', '합계', '등급'],
          description: '성적 기록 및 관리용',
        },
        contact: {
          label: '비상 연락처',
          columns: ['번호', '이름', '보호자명', '관계', '연락처1', '연락처2', '비고'],
          description: '학부모/보호자 비상 연락처 관리용',
        },
        custom: {
          label: '사용자정의 명렬표',
          columns: ['번호', '이름', ...(params.columns?.split(/[,\n]+/).map(s => s.trim()).filter(Boolean) || ['항목1', '항목2', '비고'])],
          description: '사용자가 정의한 열 구성',
        },
      };

      const config = typeConfigs[params.roster_type];

      const guideMarkdown = [
        `# 학급 명렬표 생성 가이드`,
        ``,
        `## 입력 정보`,
        params.class_name ? `- 학급: ${params.class_name}` : '',
        params.teacher_name ? `- 담임: ${params.teacher_name}` : '',
        `- 학생 수: ${studentList.length}명`,
        `- 유형: ${config.label}`,
        params.date_range ? `- 기간: ${params.date_range}` : '',
        `- 설명: ${config.description}`,
        ``,
        `## 학생 명단`,
        studentList.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 열 구성`,
        ``,
        `| ${config.columns.join(' | ')} |`,
        `| ${config.columns.map(() => '---').join(' | ')} |`,
        studentList.length > 0
          ? `| 1 | ${studentList[0]} | ${config.columns.slice(2).map(() => '').join(' | ')} |`
          : '',
        `| ... | ... | ${config.columns.slice(2).map(() => '...').join(' | ')} |`,
        ``,
        `## 작성 규칙`,
        ``,
        `### 명렬표 원칙`,
        `1. **번호 정렬**: 출석번호 또는 가나다 순`,
        `2. **학급 정보**: 상단에 학급명, 담임명, 기간 표시`,
        `3. **여백**: 기록 가능한 충분한 셀 크기`,
        `4. **인쇄 최적화**: A4 또는 B4 용지 기준`,
        ``,
        `### 유형별 참고사항`,
        ``,
        params.roster_type === 'attendance' ? [
          `#### 출석부 기호`,
          `- ○ : 출석`,
          `- △ : 지각`,
          `- × : 결석 (사유별: 질병/무단/기타)`,
          `- ● : 조퇴`,
          `- ◎ : 결과 (현장학습 등)`,
          ``,
        ].join('\n') : '',
        params.roster_type === 'counseling' ? [
          `#### 상담 유형 분류`,
          `- 학습상담 / 교우관계 / 진로 / 가정 / 생활지도 / 기타`,
          `- ⚠ 개인정보 보호 주의 (비밀 보장)`,
          ``,
        ].join('\n') : '',
        params.roster_type === 'contact' ? [
          `#### 연락처 관리 주의사항`,
          `- ⚠ 개인정보 보호법 준수 필수`,
          `- 수집 목적 외 사용 금지`,
          `- 보관 기간 준수 (학년도 종료 시 파기)`,
          ``,
        ].join('\n') : '',
        `## HWPX 출력 안내`,
        ``,
        `명렬표는 export_hwpx 도구로 HWPX 파일로 출력합니다.`,
        `- **template**: \`"roster"\``,
        `- **section_xml**: 아래 채울 자리 표시에 내용을 넣어 전달`,
        ``,
        `### 채울 자리 표시 매핑 (roster 템플릿)`,
        `- {{학년도}}: 해당 학년도 (예: "2026")`,
        `- {{학교명}}: 학교 이름`,
        `- {{학년}}: 학년 (예: "6")`,
        `- {{학급}}: 반 (예: "3")`,
        `- {{명렬표 제목}}: "${params.class_name || '○학년 ○반'} ${config.label}"`,
        `- {{인원}}: ${studentList.length}명`,
        `- {{담당교사}}: ${params.teacher_name || '담임 교사명'}`,
        `- {{작성일}}: 작성 일자`,
        `- {{명렬표 본문}}: ${config.columns.length}열 × ${studentList.length}행 표 (markdown 표 → OWPML 자동 변환)`,
        `- {{비고 내용}}: 기호 범례, 참고사항 등`,
        `- {{담당교사 성명}}: 하단 서명용 교사 성명`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
