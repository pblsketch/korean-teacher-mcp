import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerParentMessageTool(server: McpServer) {
  server.tool(
    'generate_parent_message',
    '학부모에게 보내는 개별 메시지(문자, 알림장, 메신저) 작성을 위한 가이드라인과 프롬프트를 반환합니다. 상황에 맞는 적절한 어조와 내용의 메시지 작성 지침을 제공합니다.',
    {
      situation: z.string().describe('상황 설명 (예: "학생이 오늘 수업 중 머리가 아프다고 해서 보건실에 다녀왔습니다", "내일 준비물 안내")'),
      student_name: z.string().optional().describe('학생 이름'),
      tone: z.enum(['formal', 'friendly', 'concerned']).default('friendly').describe('어조: formal=격식체, friendly=친근한(기본), concerned=우려/걱정'),
      message_type: z.enum(['notification', 'request', 'praise', 'concern', 'apology', 'inquiry']).default('notification').describe('메시지 유형: notification=알림, request=요청, praise=칭찬, concern=우려, apology=사과, inquiry=문의'),
      channel: z.enum(['sms', 'messenger', 'app']).default('messenger').describe('전달 채널: sms=문자, messenger=카카오톡 등, app=학교 앱 알림'),
      max_chars: z.number().int().min(30).max(500).default(200).describe('최대 글자 수'),
    },
    async (params) => {
      const studentLabel = params.student_name || '학생';

      const toneGuides: Record<string, string> = {
        formal: '격식체 ("~습니다", "~드립니다"). 공식적 안내에 적합.',
        friendly: '친근한 존댓말 ("~해요", "~드려요", "~예요"). 일상적 소통에 적합.',
        concerned: '걱정/우려를 표현하는 공감 어조. "~하여 걱정이 됩니다", "괜찮으신지..."',
      };

      const typeGuides: Record<string, string> = {
        notification: `**알림**: 사실 전달 중심. "[학교명/선생님] + 사실 + (필요 시) 조치/안내"\n예: "안녕하세요. ${studentLabel} 어머니, 내일 현장체험학습 준비물 안내드립니다."`,
        request: `**요청**: 정중한 부탁. "인사 + 상황 설명 + 구체적 요청 + 감사"\n예: "안녕하세요. ${studentLabel}의 ○○ 활동에 필요한 준비물을 내일까지 보내주시면 감사하겠습니다."`,
        praise: `**칭찬**: 구체적 행동 기반. "인사 + 구체적 칭찬 내용 + 격려"\n예: "안녕하세요. ${studentLabel}이(가) 오늘 수업에서 적극적으로 발표하여 알려드립니다."`,
        concern: `**우려**: 공감 + 사실. "인사 + 관찰된 사실 + 함께 도와주자는 제안"\n예: "안녕하세요. ${studentLabel}이(가) 최근 수업 시간에 집중하기 어려워하는 모습이 보여 함께 이야기 나누고 싶습니다."`,
        apology: `**사과**: 진심 + 상황 + 대책. "인사 + 상황 설명 + 사과 + 후속 조치"\n예: "안녕하세요. 오늘 ○○ 과정에서 불편을 드려 죄송합니다. ○○으로 조치하였습니다."`,
        inquiry: `**문의**: 공손한 질문. "인사 + 배경 설명 + 질문 + 감사"\n예: "안녕하세요. ${studentLabel}의 ○○ 관련하여 확인 부탁드릴 사항이 있어 연락드립니다."`,
      };

      const channelTips: Record<string, string> = {
        sms: '- 문자(SMS) 제한: 간결하게 (90자 이내 권장, 초과 시 LMS)\n- 발신자 표시: "[○○학교 ○○○ 선생님]" 시작\n- 회신 필요 시 마지막에 명시',
        messenger: '- 메신저는 비교적 자유로운 분량 허용\n- 이모티콘 사용은 최소한으로\n- 이미지/링크 첨부 가능 언급',
        app: '- 앱 알림은 제목+본문 구조\n- 제목: 15자 이내 핵심 요약\n- 본문: 상세 내용',
      };

      const guideMarkdown = [
        `# 학부모 메시지 생성 가이드`,
        ``,
        `## 입력 정보`,
        `- 학생: ${studentLabel}`,
        `- 상황: ${params.situation}`,
        `- 유형: ${params.message_type}`,
        `- 어조: ${params.tone}`,
        `- 채널: ${params.channel}`,
        `- 최대 글자 수: ${params.max_chars}자`,
        ``,
        `## 메시지 유형 가이드`,
        `${typeGuides[params.message_type]}`,
        ``,
        `## 어조 가이드`,
        `${toneGuides[params.tone]}`,
        ``,
        `## 채널별 작성 팁`,
        `${channelTips[params.channel]}`,
        ``,
        `## 작성 규칙`,
        ``,
        `### 기본 구조`,
        `1. **인사**: "안녕하세요, ${studentLabel} 어머니/아버지."`,
        `2. **본문**: 상황 설명 + 핵심 내용`,
        `3. **마무리**: 감사/안내 + 필요 시 회신 요청`,
        `4. **서명**: "○학년 ○반 담임 ○○○ 드림"`,
        ``,
        `### 금지 사항`,
        `- 학생을 비난하는 표현 금지`,
        `- 다른 학생과 비교 금지`,
        `- 일방적 통보 지양 (특히 concern/request 유형)`,
        `- 민감 정보 포함 금지 (성적, 건강 상세 등)`,
        `- "항상", "절대", "매번" 등 극단적 표현 금지`,
        ``,
        `### 권장 표현`,
        `- "~ 알려드립니다" (알림)`,
        `- "~ 부탁드립니다" / "~ 해주시면 감사하겠습니다" (요청)`,
        `- "~ 하여 칭찬해 주고 싶습니다" (칭찬)`,
        `- "~ 함께 이야기 나누어 보면 좋겠습니다" (우려)`,
        ``,
        `## 출력 형식`,
        `- ${params.max_chars}자 이내`,
        `- 줄바꿈으로 구분 (인사 / 본문 / 마무리)`,
        `- 복사하여 바로 전송 가능한 완성형 메시지`,
        ``,
        `## 예시`,
        ``,
        `> 안녕하세요, ${studentLabel} 어머니.`,
        `> ○학년 ○반 담임 ○○○입니다.`,
        `> ${params.situation}`,
        `> 궁금한 점이 있으시면 편하게 연락 주세요.`,
        `> 감사합니다.`,
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
