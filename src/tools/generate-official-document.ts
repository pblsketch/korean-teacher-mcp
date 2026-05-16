import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerOfficialDocumentTool(server: McpServer) {
  server.tool(
    'generate_official_document',
    '학교 공문(기안문) 작성을 위한 가이드라인을 반환합니다. 내부결재용 또는 외부기관 발송용 공문에 필요한 항목을 정리하고, gonmun 템플릿의 채워 넣을 칸에 맞게 바로 문서화할 수 있도록 안내합니다.',
    {
      submission_type: z.enum(['internal', 'external']).describe('제출처: internal=내부결재, external=외부기관 발송'),
      content: z.string().describe('공문 내용 또는 참고 자료 텍스트 (상황 설명, 요청 사항 등)'),
      instructions: z.string().optional().describe('추가 지침 (톤, 강조할 내용, 포함할 사항 등)'),
      school_name: z.string().optional().describe('학교명 (기관명)'),
      department: z.string().optional().describe('부서명'),
      writer_name: z.string().optional().describe('작성자명'),
      writer_title: z.string().optional().describe('작성자 직위 (예: "교장", "교감", "OO부장")'),
    },
    async (params) => {
      const schoolName = params.school_name || '○○학교';
      const department = params.department || '○○부';
      const writerName = params.writer_name || '○○○';
      const writerTitle = params.writer_title || '학교장';

      const isExternal = params.submission_type === 'external';

      const guideMarkdown = [
        `# 공문 생성 가이드`,
        ``,
        `## 입력 정보`,
        `- 유형: ${isExternal ? '외부기관 발송용 공문' : '내부결재용 기안문'}`,
        `- 기관명: ${schoolName}`,
        `- 부서: ${department}`,
        `- 작성자: ${writerTitle} ${writerName}`,
        ``,
        `## 참고 내용`,
        `${params.content}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 공문 작성 규칙`,
        ``,
        `### 기본 구조`,
        `1. **기관명**: ${schoolName}`,
        `2. **수신**: ${isExternal ? '해당 외부기관의 장 (예: "○○교육지원청교육장")' : '"내부결재"'}`,
        `3. **경유**: ${isExternal ? '필요 시 경유 기관 기재' : '"" (내부결재는 경유 없음)'}`,
        `4. **제목**: 간결하고 명확하게 (한 줄, "~에 관한 건", "~ 안내", "~ 요청" 등)`,
        `5. **본문**: 두문 + 주문 구조`,
        `   - 1항(두문): 관련 근거, 상위 계획 인용 또는 인사/배경 서술`,
        `   - 2항(주문): 구체적 요청/안내 사항`,
        `6. **붙임**: 첨부 파일이 있을 경우 "붙임  1. ○○○ 1부.  끝." 형식`,
        ``,
        `### 문체 규칙`,
        `- 경어체 사용: "~하여 주시기 바랍니다", "~알려 드립니다"`,
        `- 항목 번호: "1.", "가.", "1)", "가)" 순서 사용`,
        `- 날짜: "2026. 5. 14.(수)" 형식 (연.월.일.(요일))`,
        `- 기간: "2026. 5. 14.(수) ~ 2026. 5. 20.(화)" 형식`,
        `- 시간: "14:00" 형식 (24시간제)`,
        ``,
        `### 금지 사항`,
        `- 구어체, 비격식체 사용 금지`,
        `- "~해주세요", "~합니다" 등 일상어 금지`,
        `- 불필요한 미사여구, 감정적 표현 금지`,
        ``,
        isExternal ? [
          `### 외부공문 추가 요소`,
          `- 시행번호: "${department}-○○○ (${new Date().toISOString().slice(0, 10).replace(/-/g, '.')})" 형식`,
          `- 접수번호: "(접수 기관에서 기재)"`,
          `- 하단 정보: 우편번호, 주소, 전화번호, 팩스번호, 이메일`,
          ``,
        ].join('\n') : '',
        `## HWPX 문서 구성 방법`,
        ``,
        `공문은 \`gonmun\` 템플릿의 채워 넣을 칸에 아래 내용을 넣어 만듭니다. 일반 사용자는 문서 내부 코드를 직접 작성하지 않아도 되며, 공문에 들어갈 실제 문구와 표 내용만 준비하면 됩니다.`,
        ``,
        `### 채워 넣을 칸 (gonmun 템플릿)`,
        `**공통 (내부/외부)**:`,
        `- {{기관명}}: ${schoolName}`,
        `- {{수신자}}: ${isExternal ? '외부기관장명' : '내부결재'}`,
        `- {{경유}}: ${isExternal ? '경유기관 (없으면 빈칸)' : ''}`,
        `- {{제목}}: 공문 제목`,
        `- {{본문1}}: 1항 (두문: 관련 근거/배경)`,
        `- {{본문2}}: 2항 (주문: 구체적 내용)`,
        `- {{표 또는 상세내용}}: 세부 사항 (표, 목록 등) — markdown 표 사용 가능`,
        `- {{직위 성명}}: ${writerTitle}  ${writerName}`,
        isExternal ? `- {{시행번호}}: ${department}-○○○` : '',
        isExternal ? `- {{시행일자}}: ${new Date().toISOString().slice(0, 10).replace(/-/g, '. ')}.` : '',
        ``,
        isExternal ? `**외부공문 전용 (하단 정보)**:` : '',
        isExternal ? `- {{우편번호}}: 우편번호` : '',
        isExternal ? `- {{주소}}: 학교 주소` : '',
        isExternal ? `- {{전화번호}}: 대표 전화번호` : '',
        isExternal ? `- {{팩스번호}}: 팩스번호` : '',
        isExternal ? `- {{이메일}}: 대표 이메일` : '',
        isExternal ? `- {{홈페이지}}: 학교 홈페이지 URL` : '',
        ``,
        `### 품질 점검`,
        `- 기관명·부서명·작성자명은 입력값을 그대로 유지하고 임의 학교/담당자명을 만들지 않습니다.`,
        `- 본문 번호가 중복되지 않도록 문장 앞에 이미 번호가 있으면 다시 붙이지 않습니다.`,
        `- 날짜는 \`2026. 1. 1.(목)\` 형식으로 정리하고, 금액은 천 단위 콤마와 한글 병기를 고려합니다.`,
        `- 핵심 항목은 \`□\`, 주요 내용은 \`○\`, 세부 내용은 \`-\`, 참고/주의는 \`※\` 위계를 사용합니다.`,
        `- 붙임이 없으면 붙임 줄을 만들지 않고, 붙임이 있으면 \`붙임  1. 자료명 1부.  끝.\` 형식으로 정리합니다.`,
        ``,
        `## 예시`,
        ``,
        isExternal
          ? `> **제목**: 2026학년도 학교폭력 예방교육 실시 결과 보고\n> **본문1**: 관련: ○○교육지원청 학교폭력예방과-1234(2026. 4. 15.) "2026학년도 학교폭력 예방교육 실시 계획 안내"\n> **본문2**: 위 호와 관련하여 본교 학교폭력 예방교육 실시 결과를 아래와 같이 보고합니다.`
          : `> **제목**: 2026학년도 1학기 현장체험학습 실시 계획(안)\n> **본문1**: 본교 교육과정 운영 계획에 의거하여 학생들의 체험 중심 학습 기회를 제공하고자 합니다.\n> **본문2**: 아래와 같이 현장체험학습을 실시하고자 하오니 재가하여 주시기 바랍니다.`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
