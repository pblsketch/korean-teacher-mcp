import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerAssessmentTool(server: McpServer, db: Client) {
  server.tool(
    'generate_assessment',
    '형성평가 또는 수행평가 생성을 위한 컨텍스트를 반환합니다. 형성평가는 학생용 문제지+교사용 정답·해설지, 수행평가는 과제 안내+평가 기준표 구조로 구분합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      sub_unit: z.string().optional().describe('소단원명 또는 핵심어. grade+unit_number만으로 여러 소단원이 검색될 때 정확한 문서 생성을 위해 사용'),
      assessment_type: z.enum(['형성평가', '수행평가']).default('형성평가').describe('평가 유형. 형성평가는 문제지+정답·해설지, 수행평가는 과제 안내+루브릭 문서로 안내'),
      num_questions: z.number().int().min(1).max(50).default(5).describe('생성할 문항 수 (기본 5문항: assessment HWPX 템플릿 기본 구조와 일치)'),
      question_types: z.array(z.string()).default(['선택형', '보기형', '서술형']).describe('문항 유형 (선택형, 보기형, 서술형, 논술형)'),
      difficulty: z.string().default('혼합').describe('난이도 (하, 중, 상, 혼합)'),
    },
    async (params) => {
      let unitId = params.unit_id;

      if (!unitId && params.grade) {
        let units = await getUnitsByFilter(db, { grade: params.grade, unit_number: params.unit_number });
        if (params.sub_unit) {
          const keyword = params.sub_unit.trim();
          units = units.filter(u =>
            (u.sub_unit ?? '').includes(keyword) ||
            (u.title ?? '').includes(keyword),
          );
        }
        if (units.length === 0) {
          return { content: [{ type: 'text' as const, text: '해당 조건의 단원을 찾을 수 없습니다.' }] };
        }
        if (units.length > 1 && !params.sub_unit) {
          const candidates = units
            .slice(0, 12)
            .map((u, i) => `${i + 1}. unit_id: ${u.id}\n   단원: ${u.title ?? ''}\n   소단원: ${u.sub_unit ?? '(없음)'}`)
            .join('\n');
          return {
            content: [{
              type: 'text' as const,
              text: [
                'grade+unit_number 조건에 여러 소단원이 검색되었습니다.',
                '평가지는 소단원에 따라 지문과 활동이 달라지므로, 정확한 생성을 위해 unit_id 또는 sub_unit을 지정해 주세요.',
                '',
                candidates,
              ].join('\n'),
            }],
          };
        }
        unitId = units[0].id;
      }

      if (!unitId) {
        return { content: [{ type: 'text' as const, text: 'unit_id 또는 grade+unit_number를 지정해주세요.' }] };
      }

      const context = await getUnitContext(db, unitId);
      const units = await getUnitsByFilter(db, { unit_id: unitId });
      const unit = units[0];
      const isPerformance = params.assessment_type === '수행평가';
      const hwpxTemplate = isPerformance ? 'performance-assessment' : 'assessment';

      const contextMarkdown = [
        `# 평가 생성 컨텍스트`,
        `## 단원: ${unit?.title ?? ''}`,
        `## 요청 사항`,
        `- 평가 유형: ${params.assessment_type}`,
        `- 문항 수: ${params.num_questions}개`,
        `- 문항 유형: ${params.question_types.join(', ')}`,
        `- 난이도: ${params.difficulty}`,
        '',
        `## 문항 구성 가이드라인 (${params.num_questions}문항 기준)`,
        ``,
        `### 유형 배분`,
        `- 요청한 문항 유형(${params.question_types.join(', ')})을 모두 포함하되, 5문항 평가지에서는 선택형 3문항, 보기형/서술형 2문항 안팎으로 균형 있게 구성하세요.`,
        `- 20문항 이상 총괄평가가 필요하면 assessment 템플릿을 5문항 단위로 나누거나 section_xml을 확장해 사용하세요.`,
        ``,
        `### 난이도 배분 (혼합 기준)`,
        `- 5문항 기준: 하 1문항, 중 2~3문항, 상 1~2문항`,
        `- 문항 수가 달라지면 하 30%, 중 40%, 상 30%에 가깝게 조정하세요.`,
        ``,
        `### 보기형 문항 작성 지침`,
        `- <보기>에 예문, 대화, 텍스트, 표, 도표 등 다양한 자료를 제시`,
        `- <보기>의 내용을 분석·적용·판단하는 문항으로 구성`,
        `- 예: "다음 <보기>를 읽고 물음에 답하시오."`,
        `- 보기형은 선택형(4지선다)과 결합하거나 서술형과 결합 가능`,
        ``,
        `### Bloom 인지 수준 배분`,
        `| 수준 | 동사 | 권장 비율 |`,
        `|------|------|----------|`,
        `| 기억 | 정의, 나열 | 15% (하) |`,
        `| 이해 | 설명, 비교 | 25% (하~중) |`,
        `| 적용 | 적용, 분류 | 30% (중) |`,
        `| 분석 | 구분, 분석 | 20% (중~상) |`,
        `| 평가/창안 | 평가, 제안 | 10% (상) |`,
        ``,
        `### 필수 포함 요소`,
        `- 실제 출력 문서는 학생용 **문제지**와 교사용 **정답 및 해설지**가 분리되어야 합니다.`,
        `- 학생용 문제지에는 문항, 배점, 답란만 제시하고 정답·해설·채점 기준은 넣지 마세요.`,
        `- 교사용 정답 및 해설지에는 각 문항별 정답, 해설, 채점 기준, 배점, 난이도, 평가 요소를 제시하세요.`,
        `- 선택형: 4지선다를 기본으로 하고 오답 매력도와 정답 근거를 함께 제시`,
        `- 보기형: <보기>의 어떤 단서로 답을 판단하는지 해설에 명시`,
        `- 서술형: 모범 답안과 부분 점수 기준(예: 핵심 개념 1점, 근거 1점, 표현 1점)을 분리`,
        `- 총점은 문항별 배점 합계와 일치하게 작성`,
        `- 교사용 해설지는 학생용 문제지와 별도 쪽으로 분리해, 배부/인쇄 시 제외할 수 있게 작성`,
        ``,
        `## HWPX 출력 안내`,
        ``,
        `평가지는 export_hwpx 도구로 HWPX 파일로 출력할 수 있습니다.`,
        `- **template**: \`"${hwpxTemplate}"\``,
        `- **section_xml**: 아래 채울 자리 표시에 내용을 넣어 전달`,
        ``,
        `### 채울 자리 표시 매핑`,
        `- 형성평가: \`assessment\` 템플릿 — 학생용 문제지 + 교사용 정답 및 해설지`,
        `- 수행평가: \`performance-assessment\` 템플릿 — 수행 과제 안내 + 평가 기준표/루브릭`,
        `**상단 메타**`,
        `- {{교과/과목}}: 예) 국어`,
        `- {{학년/반}}: 예) 2학년 ○반`,
        `- {{단원/주제}}: 평가 대상 단원과 소단원`,
        `- {{평가 유형}}: 형성평가, 단원 형성평가, 퀴즈 등`,
        `- {{평가일}}: 예) 2026. 5. 25.(월)`,
        `- {{평가 목표}}: 학생 행동으로 관찰 가능한 목표`,
        `- {{총점}}: 문항별 배점 합계`,
        `**학생용 문제지**`,
        `- {{문항 내용1}}, {{배점1}}`,
        `- {{문항 내용2}}, {{배점2}}`,
        `- {{문항 내용3}}, {{배점3}}`,
        `- {{문항 내용4}}, {{배점4}}`,
        `- {{문항 내용5}}, {{배점5}}`,
        `**교사용 정답 및 해설지**`,
        `- {{정답1}}, {{해설1}}, {{채점 기준1}}, {{난이도1}}, {{평가 요소1}}`,
        `- {{정답2}}, {{해설2}}, {{채점 기준2}}, {{난이도2}}, {{평가 요소2}}`,
        `- {{정답3}}, {{해설3}}, {{채점 기준3}}, {{난이도3}}, {{평가 요소3}}`,
        `- {{정답4}}, {{해설4}}, {{채점 기준4}}, {{난이도4}}, {{평가 요소4}}`,
        `- {{정답5}}, {{해설5}}, {{채점 기준5}}, {{난이도5}}, {{평가 요소5}}`,
        ``,
        `⚠ 형성평가지는 문항 풀이가 중심입니다. 수행 과정, 산출물, 장기 프로젝트 루브릭이 중심이면 performance-assessment 템플릿을 사용하세요.`,
        ``,
        `**수행평가 전용 칸(performance-assessment)**`,
        `- {{수행평가 제목}}, {{평가 기간}}, {{수행평가 유형}}`,
        `- {{수행 과제 안내}}, {{성취기준 및 평가 목표}}, {{제출물 및 유의사항}}`,
        `- {{수행 절차1}}, {{확인 사항1}}, {{수행 절차2}}, {{확인 사항2}}, {{수행 절차3}}, {{확인 사항3}}`,
        `- {{평가 영역1}}, {{배점1}}, {{우수1}}, {{보통1}}, {{미흡1}}`,
        `- {{평가 영역2}}, {{배점2}}, {{우수2}}, {{보통2}}, {{미흡2}}`,
        `- {{평가 영역3}}, {{배점3}}, {{우수3}}, {{보통3}}, {{미흡3}}`,
        `- {{성찰 질문1}}, {{성찰 질문2}}, {{성찰 질문3}}`,
        ``,
        '',
        `## 지문 (${context.passages.length}개)`,
        ...context.passages.map(p => `### ${p.title}\n${p.content}\n`),
        `## 기존 평가 문항 (${context.assessments.length}개, 참고용)`,
        ...context.assessments.map((a, i) => `### 문항 ${i + 1} (${a.question_type})\n${a.content}\n정답: ${a.answer}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
