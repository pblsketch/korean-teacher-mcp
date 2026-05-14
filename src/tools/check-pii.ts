import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCheckPiiTool(server: McpServer) {
  server.tool(
    'check_pii',
    '문서 내 개인정보(PII)를 탐지하고 마스킹하기 위한 가이드라인과 프롬프트를 반환합니다. 학교 문서에서 자주 나타나는 학생·교사·학부모의 개인정보를 식별하고 처리하는 지침을 제공합니다.',
    {
      content: z.string().describe('개인정보를 검사할 문서 텍스트'),
      action: z.enum(['detect', 'mask']).default('detect').describe('처리 방식: detect=탐지만(기본), mask=탐지+마스킹'),
      sensitivity: z.enum(['low', 'medium', 'high']).default('medium').describe('민감도: low=이름만, medium=이름+연락처+주소(기본), high=모든 개인정보'),
      instructions: z.string().optional().describe('추가 지침'),
    },
    async (params) => {
      const actionLabel = params.action === 'mask' ? '탐지 + 마스킹' : '탐지만';

      const sensitivityGuides: Record<string, string> = {
        low: [
          `### 민감도: 낮음 (Low)`,
          `탐지 대상: 성명만`,
          `- 한국인 이름 (2~4자 한글)`,
          `- 외국인 이름`,
        ].join('\n'),
        medium: [
          `### 민감도: 보통 (Medium)`,
          `탐지 대상: 성명 + 연락처 + 주소`,
          `- 성명 (한국인/외국인)`,
          `- 전화번호 (010-XXXX-XXXX, 02-XXX-XXXX 등)`,
          `- 이메일 주소`,
          `- 주소 (도로명/지번)`,
          `- 주민등록번호`,
        ].join('\n'),
        high: [
          `### 민감도: 높음 (High)`,
          `탐지 대상: 모든 개인식별정보`,
          `- 성명, 전화번호, 이메일, 주소, 주민등록번호`,
          `- 학번/출석번호`,
          `- 생년월일`,
          `- 계좌번호`,
          `- 차량번호`,
          `- 건강 정보 (진단명, 약물 등)`,
          `- 가족 관계 정보`,
          `- 성적 정보`,
        ].join('\n'),
      };

      const guideMarkdown = [
        `# 개인정보(PII) 검사 가이드`,
        ``,
        `## 검사 설정`,
        `- 처리 방식: ${actionLabel}`,
        `- 민감도: ${params.sensitivity}`,
        ``,
        `## 검사 대상 문서`,
        `${params.content}`,
        ``,
        params.instructions ? `## 추가 지침\n${params.instructions}\n` : '',
        `## 민감도별 탐지 범위`,
        ``,
        sensitivityGuides[params.sensitivity],
        ``,
        `## 개인정보 유형별 탐지 패턴`,
        ``,
        `### 학교 문서 빈출 개인정보`,
        `1. **성명**: "김○○", "이○○" 등 2~4자 한글 이름`,
        `2. **전화번호**: 010-0000-0000, 02-000-0000 패턴`,
        `3. **주민등록번호**: 000000-0000000 (13자리)`,
        `4. **주소**: "서울특별시 ○○구 ○○로 ○○" 패턴`,
        `5. **이메일**: user@domain.com 패턴`,
        `6. **학번**: "1학년 3반 15번" → 학생 특정 가능`,
        `7. **생년월일**: "2015. 3. 5.", "2015년 3월 5일"`,
        ``,
        `### 학교 문서 특수 개인정보`,
        `- 학생 건강 정보 (질환, 알레르기, 약물)`,
        `- 학생 성적 (점수, 등급, 석차)`,
        `- 가정 환경 정보 (한부모, 다문화, 기초생활수급 등)`,
        `- 징계/상벌 기록`,
        ``,
        params.action === 'mask' ? [
          `## 마스킹 규칙`,
          ``,
          `### 마스킹 방식`,
          `- 성명: "김○○" (성은 유지, 이름 ○ 처리)`,
          `- 전화번호: "010-****-1234" (중간 4자리 마스킹)`,
          `- 주민등록번호: "900101-*******" (뒷자리 전체)`,
          `- 주소: "서울특별시 ○○구 ○○동" (상세주소 제거)`,
          `- 이메일: "k***@gmail.com" (아이디 마스킹)`,
          `- 학번: "○학년 ○반 ○번" (전체 마스킹)`,
          ``,
          `### 마스킹 후 출력`,
          `- 원문 전체를 마스킹 처리하여 제공`,
          `- 마스킹된 위치와 유형 목록 별도 제공`,
          ``,
        ].join('\n') : '',
        `## 출력 형식`,
        ``,
        `### 탐지 결과 구조`,
        `1. **요약**: 발견된 개인정보 건수 (유형별)`,
        `2. **상세 목록**: 각 항목의 위치, 유형, 내용`,
        `   - "🔴 [유형] 위치: ○행 — 내용: ○○○"`,
        `3. **위험도**: 상/중/하`,
        `4. **권장 조치**: 마스킹, 삭제, 별도 관리 등`,
        ``,
        `### 위험도 기준`,
        `- 🔴 **높음**: 주민등록번호, 계좌번호, 건강정보`,
        `- 🟡 **보통**: 전화번호, 이메일, 주소`,
        `- 🟢 **낮음**: 성명 (공개 가능한 경우)`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}
