import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerRubricTool(server: McpServer, db: Client) {
  server.tool(
    'generate_rubric',
    '성취기준 기반 루브릭(평가기준표)을 생성하기 위한 가이드라인과 컨텍스트를 반환합니다. 평가 영역, 수준별 기준, 배점을 포함한 구조화된 루브릭 작성을 지원합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      achievement_standard: z.string().optional().describe('성취기준 코드 또는 내용 (예: "[9국01-05] 토론의 절차에 따라 논증을 구성하여 토론에 참여한다")'),
      assessment_type: z.enum(['수행평가', '형성평가', '총괄평가', '자기평가', '동료평가']).default('수행평가').describe('평가 유형'),
      rubric_levels: z.number().int().min(3).max(5).default(4).describe('루브릭 단계 수 (3~5단계)'),
      evaluation_areas: z.array(z.string()).optional().describe('평가 영역 (예: ["내용 이해", "표현력", "창의성", "협업 능력"])'),
      task_description: z.string().optional().describe('수행 과제 설명 (예: "소설 속 인물의 갈등을 분석하여 발표하기")'),
      total_points: z.number().int().default(100).describe('총 배점'),
    },
    async (params) => {
      // 단원 컨텍스트 조회 (선택적)
      let unitContext = '';
      if (params.unit_id || params.grade) {
        let unitId = params.unit_id;
        if (!unitId && params.grade) {
          const units = await getUnitsByFilter(db, { grade: params.grade, unit_number: params.unit_number });
          if (units.length > 0) {
            unitId = units[0].id;
          }
        }
        if (unitId) {
          const context = await getUnitContext(db, unitId);
          const units = await getUnitsByFilter(db, { unit_id: unitId });
          const unit = units[0];
          unitContext = [
            `## 단원 컨텍스트`,
            `- 단원: ${unit?.title ?? ''}`,
            `- 소단원: ${unit?.sub_unit ?? ''}`,
            ``,
            `### 관련 지문 (${context.passages.length}개)`,
            ...context.passages.slice(0, 3).map(p => `- ${p.title}${p.author ? ` (${p.author})` : ''}`),
            ``,
          ].join('\n');
        }
      }

      // 루브릭 수준 라벨 생성
      const levelLabels = getLevelLabels(params.rubric_levels);
      const areas = params.evaluation_areas || getDefaultAreas(params.assessment_type);
      const pointsPerArea = Math.floor(params.total_points / areas.length);

      const guideMarkdown = [
        `# 루브릭(평가기준표) 생성 가이드`,
        ``,
        `## 평가 개요`,
        `| 항목 | 내용 |`,
        `|------|------|`,
        `| 평가 유형 | ${params.assessment_type} |`,
        `| 루브릭 단계 | ${params.rubric_levels}단계 (${levelLabels.join(' / ')}) |`,
        `| 평가 영역 | ${areas.join(', ')} |`,
        `| 총 배점 | ${params.total_points}점 |`,
        params.achievement_standard ? `| 성취기준 | ${params.achievement_standard} |` : '',
        params.task_description ? `| 수행 과제 | ${params.task_description} |` : '',
        ``,
        unitContext,
        `## 루브릭 작성 지침`,
        ``,
        `### 기본 원칙`,
        `1. **관찰 가능한 행동**으로 기술: "이해한다" 대신 "설명할 수 있다", "비교하여 분석한다" 등`,
        `2. **수준 간 차이가 명확**: 각 단계별 질적 차이가 분명히 드러나야 합니다.`,
        `3. **긍정적 서술**: 모든 수준을 "~할 수 있다"의 긍정형으로 기술합니다.`,
        `4. **구체적 기준**: 모호한 표현(잘, 매우, 약간) 대신 구체적 수량/질적 기준을 제시합니다.`,
        ``,
        `### 수준별 서술 가이드`,
        ``,
        `| 수준 | 배점 범위 | 핵심 키워드 | 서술 방향 |`,
        `|------|-----------|-------------|-----------|`,
        ...levelLabels.map((label, i) => {
          const ratio = getRatioForLevel(i, params.rubric_levels);
          const points = Math.round(pointsPerArea * ratio);
          const keywords = getKeywordsForLevel(i, params.rubric_levels);
          const direction = getDirectionForLevel(i, params.rubric_levels);
          return `| ${label} | ${points}점 | ${keywords} | ${direction} |`;
        }),
        ``,
        `### 평가 영역별 관점`,
        ``,
        ...areas.map(area => `#### ${area}\n${getAreaDescription(area)}\n`),
        ``,
        `## 출력 형식`,
        ``,
        `아래 마크다운 표 형식으로 루브릭을 생성해주세요:`,
        ``,
        `\`\`\`markdown`,
        `| 평가 영역 | 배점 | ${levelLabels.join(' | ')} |`,
        `|-----------|------|${levelLabels.map(() => '---').join('|')}|`,
        ...areas.map(area => `| ${area} | ${pointsPerArea}점 | (상세 기준) | ... |`),
        `\`\`\``,
        ``,
        `### 추가 포함 사항`,
        `- 각 영역별 배점 합계가 ${params.total_points}점이 되도록 조정`,
        `- 필요 시 영역별 가중치를 다르게 설정 가능`,
        `- 자기평가/동료평가 체크리스트 별도 제공 (요청 시)`,
        ``,
        `## 참고: Bloom의 인지적 영역 동사 목록`,
        `| 수준 | 동사 예시 |`,
        `|------|----------|`,
        `| 기억 | 열거하다, 정의하다, 나열하다, 인용하다 |`,
        `| 이해 | 설명하다, 요약하다, 비교하다, 해석하다 |`,
        `| 적용 | 활용하다, 적용하다, 실행하다, 분류하다 |`,
        `| 분석 | 구분하다, 분석하다, 추론하다, 비판하다 |`,
        `| 평가 | 판단하다, 평가하다, 정당화하다, 선택하다 |`,
        `| 창안 | 설계하다, 구성하다, 제안하다, 창작하다 |`,
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: guideMarkdown }],
      };
    },
  );
}

function getLevelLabels(levels: number): string[] {
  if (levels === 3) return ['상', '중', '하'];
  if (levels === 4) return ['매우 잘함', '잘함', '보통', '노력 요함'];
  return ['탁월', '우수', '보통', '미흡', '매우 미흡'];
}

function getRatioForLevel(index: number, total: number): number {
  const ratios: Record<number, number[]> = {
    3: [1.0, 0.7, 0.4],
    4: [1.0, 0.8, 0.6, 0.4],
    5: [1.0, 0.85, 0.7, 0.55, 0.4],
  };
  return ratios[total]?.[index] ?? 0.5;
}

function getKeywordsForLevel(index: number, total: number): string {
  const keywords: Record<number, string[]> = {
    3: ['독창적, 심화, 종합', '적절한, 기본, 이해', '부분적, 시도, 기초'],
    4: ['탁월한, 독창적, 심화', '적극적, 적절한, 다양한', '기본적, 부분적, 일부', '시도, 기초적, 제한적'],
    5: ['탁월한, 독창적, 종합적', '우수한, 적극적, 다양한', '적절한, 기본적, 일반적', '부분적, 제한적, 미숙한', '시도, 기초적, 단편적'],
  };
  return keywords[total]?.[index] ?? '';
}

function getDirectionForLevel(index: number, total: number): string {
  const directions: Record<number, string[]> = {
    3: [
      '기대 수준을 넘어 독창적이고 심화된 수행을 보여줌',
      '기본 기대 수준에 도달하여 적절히 수행함',
      '기초적 수준에서 부분적으로 수행하며 지원이 필요함',
    ],
    4: [
      '기대 수준을 넘어 독창적이고 심화된 수행을 보여줌',
      '기대 수준에 도달하여 다양한 방식으로 수행함',
      '기본 수준에서 일부 요소를 수행함',
      '기초적 시도를 하며 추가 지원이 필요함',
    ],
    5: [
      '모든 영역에서 탁월하고 종합적인 수행을 보여줌',
      '대부분의 영역에서 우수하고 적극적인 수행을 보여줌',
      '기본 기대 수준에 도달하여 적절히 수행함',
      '일부 영역에서 부분적으로 수행하며 보완이 필요함',
      '기초적 시도를 하며 전반적인 지원이 필요함',
    ],
  };
  return directions[total]?.[index] ?? '';
}

function getDefaultAreas(type: string): string[] {
  const defaults: Record<string, string[]> = {
    '수행평가': ['내용 이해', '표현력', '창의성', '태도 및 참여'],
    '형성평가': ['핵심 개념 이해', '적용 능력', '문제 해결력'],
    '총괄평가': ['지식', '기능', '태도'],
    '자기평가': ['학습 목표 달성', '노력 과정', '협력'],
    '동료평가': ['기여도', '의사소통', '협력'],
  };
  return defaults[type] || defaults['수행평가'];
}

function getAreaDescription(area: string): string {
  const descriptions: Record<string, string> = {
    '내용 이해': '학습 내용의 핵심 개념과 원리를 정확히 파악하고 설명할 수 있는 능력을 평가합니다.',
    '표현력': '자신의 생각과 이해를 글, 말, 시각 자료 등으로 효과적으로 전달하는 능력을 평가합니다.',
    '창의성': '기존 지식을 새로운 상황에 적용하거나 독창적인 아이디어를 제시하는 능력을 평가합니다.',
    '태도 및 참여': '학습 활동에 대한 적극성, 성실성, 협력적 태도를 평가합니다.',
    '핵심 개념 이해': '단원의 핵심 개념과 용어를 정확히 이해하고 있는지를 평가합니다.',
    '적용 능력': '학습한 내용을 새로운 문제 상황에 적용할 수 있는 능력을 평가합니다.',
    '문제 해결력': '주어진 문제를 분석하고 적절한 전략을 선택하여 해결하는 능력을 평가합니다.',
    '기여도': '모둠/팀 활동에서 자신의 역할을 충실히 수행하고 전체 결과에 기여하는 정도를 평가합니다.',
    '의사소통': '자신의 의견을 명확히 전달하고 타인의 의견을 경청하는 능력을 평가합니다.',
    '협력': '타인과 협력하여 공동의 목표를 달성하려는 태도와 행동을 평가합니다.',
  };
  return descriptions[area] || `${area} 영역의 수행 수준을 평가합니다.`;
}
