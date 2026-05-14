import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerHistoricalDialogueTool(server: McpServer) {
  server.tool(
    'generate_historical_dialogue',
    '역사 인물과의 가상 대화 시나리오를 생성하기 위한 가이드라인과 프롬프트를 반환합니다. 학생들이 역사 인물의 관점에서 시대를 이해할 수 있도록 교육적 대화 콘텐츠 작성 지침을 제공합니다.',
    {
      historical_figure: z.string().describe('역사 인물 이름 (예: "세종대왕", "이순신", "유관순")'),
      era: z.string().optional().describe('시대/시기 (예: "조선 전기", "일제강점기")'),
      topic: z.string().optional().describe('대화 주제 (예: "한글 창제의 이유", "독립운동의 의의")'),
      student_grade: z.string().optional().describe('학생 학년 (예: "초등 5학년", "중등 2학년")'),
      language_level: z.enum(['easy', 'normal', 'advanced']).default('normal').describe('언어 수준: easy=쉬운말, normal=보통(기본), advanced=고급'),
      dialogue_format: z.enum(['interview', 'conversation', 'letter', 'diary']).default('conversation').describe('형식: interview=인터뷰, conversation=대화(기본), letter=편지, diary=일기'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const levelGuides: Record<string, string> = {
        easy: '쉬운 말 — 초등 저학년 수준. 짧은 문장, 일상적 어휘. 어려운 한자어/역사 용어에 괄호 설명.',
        normal: '보통 — 초등 고학년~중학생 수준. 자연스러운 문장, 기본 역사 용어 사용.',
        advanced: '고급 — 고등학생 이상. 원문 인용, 시대 언어 반영, 심화 역사 개념 포함.',
      };

      const formatGuides: Record<string, string> = {
        interview: [
          `### 인터뷰 형식`,
          `- 학생(기자)이 질문하고 역사 인물이 답하는 구조`,
          `- "Q: [학생 질문]" / "A: [인물 답변]" 형식`,
          `- 5~10개 질문-답변 쌍`,
          `- 마지막에 인물의 한마디(메시지)`,
        ].join('\n'),
        conversation: [
          `### 대화 형식`,
          `- 학생과 역사 인물이 자연스럽게 대화`,
          `- 시간여행/꿈 등의 설정으로 만남 상황 설정`,
          `- 인물의 성격과 말투 반영`,
          `- 역사적 사실을 대화 속에 녹여냄`,
        ].join('\n'),
        letter: [
          `### 편지 형식`,
          `- 역사 인물이 현대 학생에게 보내는 편지`,
          `- 또는 학생이 역사 인물에게 보내는 편지 + 답장`,
          `- 시대 상황과 인물의 심정을 서간체로 표현`,
          `- 편지 형식 준수 (인사말, 본문, 맺음말)`,
        ].join('\n'),
        diary: [
          `### 일기 형식`,
          `- 역사 인물의 특정 날의 일기`,
          `- 역사적 사건 당일의 심정과 상황 묘사`,
          `- 1인칭 시점, 개인적 감정 표현`,
          `- 날짜와 장소 명시`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 역사 인물 대화 생성 가이드`,
        ``,
        `## 입력 정보`,
        `- 인물: ${params.historical_figure}`,
        params.era ? `- 시대: ${params.era}` : '',
        params.topic ? `- 주제: ${params.topic}` : '',
        params.student_grade ? `- 학년: ${params.student_grade}` : '',
        `- 언어 수준: ${levelGuides[params.language_level]}`,
        `- 형식: ${params.dialogue_format}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 형식별 작성법`,
        ``,
        formatGuides[params.dialogue_format],
        ``,
        `## 작성 규칙`,
        ``,
        `### 역사적 정확성`,
        `1. **사실 기반**: 검증된 역사적 사실만 포함`,
        `2. **시대 반영**: 해당 시대의 문화, 생활, 가치관 반영`,
        `3. **인물 특성**: 인물의 알려진 성격, 사상, 업적 반영`,
        `4. **용어**: 시대에 맞는 명칭 사용 (예: "조선" not "한국")`,
        ``,
        `### 교육적 요소`,
        `- 핵심 역사 개념 3~5개 자연스럽게 포함`,
        `- 학생이 추가로 탐구할 수 있는 질문 제시`,
        `- 인물의 가치관과 현대적 의미 연결`,
        `- "더 알아보기" 섹션 (관련 사건/인물 안내)`,
        ``,
        `### 금지 사항`,
        `- 검증되지 않은 사실 창작 금지`,
        `- 역사 왜곡 또는 미화 금지`,
        `- 현대 가치관으로 과거 인물 일방적 판단 금지`,
        `- 정치적 편향 금지`,
        ``,
        `## 출력 구조`,
        ``,
        `1. **배경 설명** (2~3문장): 인물과 시대 배경 소개`,
        `2. **대화/본문**: ${params.dialogue_format} 형식에 맞는 콘텐츠`,
        `3. **역사 메모**: 대화에 등장한 역사적 사실 정리 (3~5개)`,
        `4. **생각해 보기**: 학생 토론/탐구 질문 (2~3개)`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
