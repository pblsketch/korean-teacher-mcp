import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCharacterRoleplayTool(server: McpServer) {
  server.tool(
    'generate_character_roleplay',
    '문학 작품 캐릭터 역할극 시나리오를 생성하기 위한 가이드라인과 프롬프트를 반환합니다. 독서 교육에서 캐릭터의 관점으로 상황을 체험하고 감정을 이해할 수 있는 역할극 지침을 제공합니다.',
    {
      book_title: z.string().describe('도서 제목 (예: "어린 왕자", "홍길동전", "소나기")'),
      character_name: z.string().describe('캐릭터 이름 (예: "어린 왕자", "홍길동", "소년")'),
      scene: z.string().optional().describe('장면 설명 (예: "여우를 처음 만나는 장면", "아버지와 대립하는 장면")'),
      student_grade: z.string().optional().describe('학생 학년 (예: "초등 4학년", "중등 1학년")'),
      roleplay_type: z.enum(['monologue', 'dialogue', 'hot_seat', 'writing_in_role']).default('dialogue').describe('유형: monologue=독백, dialogue=대화(기본), hot_seat=핫시팅(질의응답), writing_in_role=역할 글쓰기'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const typeGuides: Record<string, string> = {
        monologue: [
          `### 독백 (Monologue)`,
          `- 캐릭터가 혼자 속마음을 말하는 형식`,
          `- 감정의 흐름을 따라 서술`,
          `- 1인칭 시점, 내면 묘사 중심`,
          `- 분량: 300~500자`,
          `- 활용: 학생이 캐릭터가 되어 독백 발표`,
        ].join('\n'),
        dialogue: [
          `### 대화 (Dialogue)`,
          `- 2~3명의 캐릭터가 대화하는 형식`,
          `- 원작의 장면을 기반으로 대사 재구성`,
          `- 지문(행동, 감정) 포함`,
          `- 활용: 모둠별 역할극 대본`,
        ].join('\n'),
        hot_seat: [
          `### 핫시팅 (Hot Seat)`,
          `- 한 학생이 캐릭터 역할, 나머지 학생들이 질문`,
          `- 캐릭터 프로필 카드 제공`,
          `- 예상 질문 10개 + 모범 답변`,
          `- 캐릭터의 가치관, 감정, 동기 중심`,
          `- 활용: 학급 전체 활동, 토론 연계`,
        ].join('\n'),
        writing_in_role: [
          `### 역할 글쓰기 (Writing in Role)`,
          `- 캐릭터의 관점에서 글쓰기 (일기, 편지, SNS 등)`,
          `- 글쓰기 프롬프트 + 예시 제공`,
          `- 형식: 일기, 편지, 문자 메시지, SNS 게시글 등`,
          `- 활용: 개인 글쓰기 활동 → 공유 → 토론`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 문학 캐릭터 역할극 생성 가이드`,
        ``,
        `## 입력 정보`,
        `- 작품: 《${params.book_title}》`,
        `- 캐릭터: ${params.character_name}`,
        params.scene ? `- 장면: ${params.scene}` : '',
        params.student_grade ? `- 학년: ${params.student_grade}` : '',
        `- 유형: ${params.roleplay_type}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 역할극 유형별 작성법`,
        ``,
        typeGuides[params.roleplay_type],
        ``,
        `## 작성 규칙`,
        ``,
        `### 캐릭터 구현 원칙`,
        `1. **원작 충실성**: 원작의 캐릭터 성격, 말투, 가치관 유지`,
        `2. **교육적 확장**: 원작에 없는 장면도 캐릭터의 성격에 맞게 창작 가능`,
        `3. **감정 깊이**: 캐릭터의 내면 감정을 구체적으로 표현`,
        `4. **학생 수준**: 대상 학년에 맞는 어휘와 문장 구조`,
        ``,
        `### 캐릭터 프로필 포함 사항`,
        `- 이름, 나이, 외모 특징`,
        `- 성격 키워드 3~5개`,
        `- 말투/어조 특징`,
        `- 핵심 가치관/신념`,
        `- 작품 속 주요 갈등`,
        `- 다른 캐릭터와의 관계`,
        ``,
        `### 교육적 활용 안내`,
        `- **읽기 전**: 캐릭터 예측 활동과 연계`,
        `- **읽기 중**: 특정 장면에서 멈추고 역할극`,
        `- **읽기 후**: 전체 작품 이해 후 심화 역할극`,
        ``,
        `### 금지 사항`,
        `- 원작의 주제를 왜곡하는 해석 금지`,
        `- 폭력적/선정적 내용 금지`,
        `- 캐릭터에 대한 일방적 판단 금지 (다양한 해석 허용)`,
        ``,
        `## 출력 구조`,
        ``,
        `1. **캐릭터 프로필 카드**: 캐릭터 정보 요약`,
        `2. **장면 설정**: 배경, 상황, 등장인물 소개`,
        `3. **역할극 대본/프롬프트**: ${params.roleplay_type} 형식 콘텐츠`,
        `4. **활동 안내**: 교사용 진행 가이드`,
        `5. **토론 질문**: 역할극 후 토론 주제 3~5개`,
        `6. **평가 기준**: 참여도, 캐릭터 이해도, 표현력 등`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
