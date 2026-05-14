import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerSummarizeDocumentTool(server: McpServer) {
  server.tool(
    'summarize_document',
    '교육 관련 문서(공문, 지침, 계획서, 매뉴얼 등)를 요약합니다. 교사가 빠르게 핵심을 파악할 수 있도록 구조화된 요약을 생성하는 지침을 제공합니다.',
    {
      content: z.string().describe('요약할 문서 내용 (공문, 지침, 계획서, 매뉴얼 등의 텍스트)'),
      summary_type: z.enum(['brief', 'detailed', 'bullet', 'action_items']).default('bullet').describe('요약 유형: brief=한줄요약, detailed=상세요약, bullet=항목별(기본), action_items=할일목록'),
      max_length: z.number().int().min(50).max(2000).default(500).describe('최대 글자 수 (기본 500)'),
      focus: z.string().optional().describe('특히 중점적으로 요약할 부분 (예: "일정", "예산", "담당자", "제출기한")'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const typeGuides: Record<string, string> = {
        brief: [
          `### 한줄 요약 (Brief)`,
          `- 문서의 핵심 목적과 결론을 1~2문장으로 압축`,
          `- 형식: "이 문서는 [주체]가 [대상]에게 [목적]을(를) [행동]하는 내용입니다."`,
          `- 핵심 키워드 3~5개 추출`,
        ].join('\n'),
        detailed: [
          `### 상세 요약 (Detailed)`,
          `- 문서의 전체 구조를 유지하며 핵심 내용 정리`,
          `- 구조: 배경/목적 → 주요 내용 → 세부 사항 → 결론/후속 조치`,
          `- 원문의 논리 흐름을 보존`,
        ].join('\n'),
        bullet: [
          `### 항목별 요약 (Bullet)`,
          `- 핵심 내용을 항목(bullet point)으로 정리`,
          `- 각 항목은 한 문장으로 완결`,
          `- 중요도 순서로 배열`,
          `- 5~10개 항목 이내`,
        ].join('\n'),
        action_items: [
          `### 할 일 목록 (Action Items)`,
          `- 문서에서 교사가 수행해야 할 사항만 추출`,
          `- 형식: "☐ [할 일] — [기한/조건] (담당: [담당자])"`,
          `- 기한이 있는 항목 우선 배치`,
          `- 필수/선택 구분`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 문서 요약 가이드`,
        ``,
        `## 요약 설정`,
        `- 유형: ${params.summary_type}`,
        `- 최대 길이: ${params.max_length}자`,
        params.focus ? `- 중점 영역: ${params.focus}` : '',
        ``,
        `## 원본 문서`,
        `${params.content}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 요약 유형별 작성법`,
        ``,
        typeGuides[params.summary_type],
        ``,
        `## 요약 작성 규칙`,
        ``,
        `### 기본 원칙`,
        `1. **정확성**: 원문의 사실, 수치, 날짜를 정확히 유지`,
        `2. **완결성**: 누락 없이 핵심 정보 포함`,
        `3. **간결성**: ${params.max_length}자 이내로 압축`,
        `4. **구조화**: 정보를 논리적으로 배열`,
        ``,
        `### 추출 우선순위`,
        `1. **기한/일정**: 제출 기한, 행사 일정, 시행일 등`,
        `2. **대상/범위**: 누가, 어떤 학년, 어떤 과목`,
        `3. **핵심 변경사항**: 기존 대비 달라진 점`,
        `4. **필요 조치**: 교사가 해야 할 일`,
        `5. **첨부/참고**: 별도로 확인할 자료`,
        ``,
        params.focus ? [
          `### 중점 영역: ${params.focus}`,
          `위 내용 중 특히 "${params.focus}" 관련 내용을 더 자세히 다루세요.`,
          ``,
        ].join('\n') : '',
        `## 출력 형식`,
        `- ${params.max_length}자 이내`,
        `- 마크다운 형식 (볼드, 목록 활용)`,
        `- 원문의 용어를 그대로 사용 (의역 지양)`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
