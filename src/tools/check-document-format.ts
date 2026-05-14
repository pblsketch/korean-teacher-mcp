import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCheckDocumentFormatTool(server: McpServer) {
  server.tool(
    'check_document_format',
    '공문서의 형식, 맞춤법, 표현을 검사하기 위한 가이드라인과 프롬프트를 반환합니다. 학교 공문의 형식 규정 준수 여부, 문체, 날짜/번호 형식 등을 점검하는 지침을 제공합니다.',
    {
      content: z.string().describe('검사할 공문서 텍스트'),
      check_type: z.enum(['format', 'spelling', 'expression', 'all']).default('all').describe('검사 유형: format=형식검사, spelling=맞춤법, expression=표현검사, all=전체(기본)'),
      document_type: z.enum(['공문', '가정통신문', '계획서', '회의록', '보고서', '기타']).default('공문').describe('문서 유형'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const checkLabels: Record<string, string> = {
        format: '형식 검사 (구조, 항목, 번호 체계)',
        spelling: '맞춤법 검사 (띄어쓰기, 표기법)',
        expression: '표현 검사 (문체, 어조, 적절성)',
        all: '전체 검사 (형식 + 맞춤법 + 표현)',
      };

      const formatRules = [
        `### 형식 검사 항목`,
        ``,
        `#### 공문 필수 요소`,
        `- [ ] 기관명 (상단)`,
        `- [ ] 수신자 ("내부결재" 또는 기관장명)`,
        `- [ ] 제목 (간결, 한 줄)`,
        `- [ ] 본문 (두문 + 주문 구조)`,
        `- [ ] 날짜 형식: "2026. 5. 14.(수)"`,
        `- [ ] 항목 번호 체계: 1. → 가. → 1) → 가)`,
        `- [ ] 시행번호 (외부공문)`,
        `- [ ] 하단 정보: 주소, 전화, 이메일 (외부공문)`,
        ``,
        `#### 번호 체계 규칙`,
        `- 1단계: 1. 2. 3.`,
        `- 2단계: 가. 나. 다.`,
        `- 3단계: 1) 2) 3)`,
        `- 4단계: 가) 나) 다)`,
        `- 5단계: (1) (2) (3)`,
        `- 6단계: (가) (나) (다)`,
      ].join('\n');

      const spellingRules = [
        `### 맞춤법 검사 항목`,
        ``,
        `#### 공문 빈출 오류`,
        `- "~됬다" → "~됐다" / "~되었다"`,
        `- "~할 수 있는" → "~가능한" (간결하게)`,
        `- "~에 대해서" → "~에 대하여" (공문체)`,
        `- "~해 주세요" → "~하여 주시기 바랍니다" (공문체)`,
        `- "~합니다" → "~함" (계획서/보고서 문체)`,
        ``,
        `#### 띄어쓰기 주의`,
        `- "할 수 있다" (○) / "할수있다" (×)`,
        `- "및" 앞뒤 띄어쓰기`,
        `- "등" 앞 띄어쓰기`,
        `- 숫자+단위: "10명", "3일" (붙여쓰기)`,
        ``,
        `#### 날짜 표기`,
        `- 공문: "2026. 5. 14.(수)" (마침표+공백+요일)`,
        `- 기간: "2026. 5. 1.(월) ~ 5. 31.(토)"`,
        `- 시간: "14:00 ~ 16:00" (24시간제)`,
      ].join('\n');

      const expressionRules = [
        `### 표현 검사 항목`,
        ``,
        `#### 공문 적절 표현`,
        `- "~하여 주시기 바랍니다" (요청)`,
        `- "~알려 드립니다" / "~안내드립니다" (통보)`,
        `- "~하고자 합니다" (계획)`,
        `- "~하기로 하였음" (결정)`,
        ``,
        `#### 부적절 표현`,
        `- 구어체: "~해주세요", "~할게요", "~인데요"`,
        `- 감정적 표현: "매우 유감", "심각한 문제"`,
        `- 불필요 미사여구: "바쁘신 중에", "항상 감사드리며"`,
        `- 일본식 표현: "~의 건", "~에 있어서"`,
        ``,
        `#### 가정통신문 표현`,
        `- "~하오니 협조 부탁드립니다" (요청)`,
        `- "~안내드리오니 참고하시기 바랍니다" (안내)`,
        `- 따뜻하고 공손한 어조 유지`,
      ].join('\n');

      const checksToInclude: string[] = [];
      if (params.check_type === 'format' || params.check_type === 'all') checksToInclude.push(formatRules);
      if (params.check_type === 'spelling' || params.check_type === 'all') checksToInclude.push(spellingRules);
      if (params.check_type === 'expression' || params.check_type === 'all') checksToInclude.push(expressionRules);

      const guideMarkdown = [
        `# 공문서 형식 검사 가이드`,
        ``,
        `## 검사 설정`,
        `- 검사 유형: ${checkLabels[params.check_type]}`,
        `- 문서 유형: ${params.document_type}`,
        ``,
        `## 검사 대상 문서`,
        `${params.content}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 검사 기준`,
        ``,
        ...checksToInclude,
        ``,
        `## 출력 형식`,
        ``,
        `### 검사 결과 구조`,
        `1. **총평**: 전체적인 문서 품질 (상/중/하)`,
        `2. **수정 필요 항목**: 구체적 위치와 수정안`,
        `   - 형식: "❌ [위치] 현재: ○○○ → 수정: ○○○ (사유)"`,
        `3. **권장 사항**: 개선하면 좋은 사항`,
        `   - 형식: "💡 [위치] ○○○ (이유)"`,
        `4. **적합 항목**: 잘 작성된 부분`,
        `   - 형식: "✅ ○○○"`,
        ``,
        `### 심각도 구분`,
        `- 🔴 **필수 수정**: 형식 규정 위반, 명백한 오류`,
        `- 🟡 **권장 수정**: 개선 여지 있음`,
        `- 🟢 **참고**: 스타일 제안`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
