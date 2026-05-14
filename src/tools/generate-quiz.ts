import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerQuizTool(server: McpServer) {
  server.tool(
    'generate_quiz',
    '퀴즈/시험 문제를 생성하기 위한 가이드라인과 프롬프트를 반환합니다. 주제와 난이도에 맞는 다양한 유형의 문제를 작성하는 지침을 제공합니다. 결과물은 export_hwpx의 assessment 템플릿으로 HWPX 파일로 출력할 수 있습니다.',
    {
      topic: z.string().describe('퀴즈 주제 (예: "조선시대 정치", "분수의 덧셈", "광합성")'),
      content: z.string().optional().describe('참고 자료 텍스트 (교과서 내용, 수업 노트 등)'),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium').describe('난이도: easy=기초, medium=보통(기본), hard=심화'),
      question_count: z.number().int().min(1).max(30).default(10).describe('문항 수 (기본 10)'),
      question_type: z.enum(['multiple_choice', 'short_answer', 'true_false', 'mixed']).default('mixed').describe('문제 유형: multiple_choice=객관식, short_answer=주관식, true_false=O/X, mixed=혼합(기본)'),
      grade_level: z.string().optional().describe('학년 수준 (예: "초등 3학년", "중등 2학년")'),
      subject: z.string().optional().describe('교과목 (예: "국어", "수학", "사회", "과학")'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const difficultyLabels: Record<string, string> = {
        easy: '기초 (개념 확인, 단순 기억)',
        medium: '보통 (이해·적용 수준)',
        hard: '심화 (분석·종합·평가 수준)',
      };

      const typeGuides: Record<string, string> = {
        multiple_choice: [
          `### 객관식 (Multiple Choice)`,
          `- 보기 4~5개 (①②③④⑤)`,
          `- 정답 1개, 오답은 그럴듯하되 명확히 구분`,
          `- 매력적 오답(distractor) 포함`,
          `- "다음 중 옳은/옳지 않은 것은?" 등`,
        ].join('\n'),
        short_answer: [
          `### 주관식 (Short Answer)`,
          `- 단답형: 1~3단어 답`,
          `- 서술형: 2~3문장 이내 답`,
          `- 채점 기준(모범 답안) 포함`,
          `- 부분 점수 기준 명시`,
        ].join('\n'),
        true_false: [
          `### O/X (True/False)`,
          `- 명확한 참/거짓 판별 가능한 진술`,
          `- "다음 내용이 맞으면 O, 틀리면 X를 쓰시오."`,
          `- 틀린 문항은 정정 답안 포함`,
        ].join('\n'),
        mixed: [
          `### 혼합 출제 (Mixed)`,
          `- 객관식 60% + 주관식 30% + 서술형 10% 권장`,
          `- 쉬운 문제 → 어려운 문제 순서 배치`,
          `- 유형별 배점 차등 (객관식 2점, 주관식 3점, 서술형 5점 등)`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 퀴즈 생성 가이드`,
        ``,
        `## 출제 설정`,
        `- 주제: ${params.topic}`,
        `- 난이도: ${difficultyLabels[params.difficulty]}`,
        `- 문항 수: ${params.question_count}문항`,
        `- 유형: ${params.question_type}`,
        params.grade_level ? `- 학년: ${params.grade_level}` : '',
        params.subject ? `- 교과: ${params.subject}` : '',
        ``,
        params.content ? `## 참고 자료\n${params.content}\n` : '',
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 문제 유형별 작성법`,
        ``,
        typeGuides[params.question_type],
        ``,
        `## 출제 규칙`,
        ``,
        `### 문항 구성 원칙`,
        `1. **교육과정 연계**: 성취기준에 부합하는 문항`,
        `2. **블룸 택소노미**: 기억 → 이해 → 적용 → 분석 → 평가 → 창조`,
        `3. **난이도 분배**: 하(30%) / 중(50%) / 상(20%) 비율 권장`,
        `4. **문항 독립성**: 앞 문항 정답이 뒷 문항 풀이에 영향 없도록`,
        ``,
        `### 문항 작성 규칙`,
        `- 발문은 명확하고 간결하게`,
        `- 이중 부정 사용 금지 ("옳지 않은 것이 아닌 것")`,
        `- "모두", "항상", "절대" 등 극단적 표현 지양`,
        `- 보기 길이를 비슷하게 유지`,
        `- 정답 위치가 편향되지 않도록 분산`,
        ``,
        `### 정답 및 해설`,
        `- 각 문항 정답 명시`,
        `- 간단한 해설 포함 (학생 피드백용)`,
        `- 관련 개념/페이지 참조 표시`,
        ``,
        `## HWPX 출력 방법`,
        ``,
        `\`export_hwpx\` 도구를 사용하여 HWPX 파일로 출력하세요.`,
        `- **template**: \`"assessment"\``,
        `- 문제는 markdown 표로 정리하면 자동 변환됨`,
        ``,
        `## 출력 형식`,
        ``,
        `### 시험지 구조`,
        `1. 상단: 과목, 학년, 시험명, 시간, 점수`,
        `2. 유의사항 (선택)`,
        `3. 문항 (번호순)`,
        `4. 정답 및 해설 (별도 페이지 또는 하단)`,
        ``,
        `### 문항 표기`,
        `- 번호: 1, 2, 3, ...`,
        `- 배점: 각 문항 옆 (예: [2점])`,
        `- 보기: ① ② ③ ④ ⑤`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
