import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@libsql/client';
import { getUnitContext, getUnitsByFilter } from '../db/queries.js';

export function registerPblTool(server: McpServer, db: Client) {
  server.tool(
    'generate_pbl',
    'PBL(프로젝트 기반 학습) 설계를 위한 컨텍스트를 반환합니다. 지문, 활동, 성취기준, PBL 교수법 가이드를 포함합니다.',
    {
      unit_id: z.string().optional().describe('단원 ID'),
      grade: z.string().optional().describe('학년-학기 또는 과목명. 자연어 입력 가능 (예: "중2", "중학교 2학년 1학기", "공통국어"). 사용 가능한 값: 중1-1, 중1-2, 중2-1, 중2-2, 공통국어1, 공통국어2, 문학, 독서와 작문, 화법과 언어, 독서 토론과 글쓰기, 주제 탐구 독서'),
      unit_number: z.number().int().optional().describe('단원 번호'),
      sub_unit: z.string().optional().describe('소단원명 또는 핵심어. grade+unit_number만으로 여러 소단원이 검색될 때 정확한 문서 생성을 위해 사용'),
      num_sessions: z.number().int().min(1).max(10).default(4).describe('차시 수'),
      class_characteristics: z.string().optional().describe('학급 특성'),
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
                'PBL 설계서는 소단원에 따라 지문과 활동이 달라지므로, 정확한 생성을 위해 unit_id 또는 sub_unit을 지정해 주세요.',
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

      const contextMarkdown = [
        `# PBL 수업 설계 컨텍스트`,
        `## 단원: ${unit?.title ?? ''}`,
        `## 요청 사항`,
        `- 차시 수: ${params.num_sessions}차시`,
        params.class_characteristics ? `- 학급 특성: ${params.class_characteristics}` : '',
        '',
        `## 성취기준`,
        unit?.achievement_std ?? '[]',
        '',
        `## 학습 목표`,
        unit?.learning_objectives ?? '[]',
        '',
        `## 지문 (${context.passages.length}개)`,
        ...context.passages.map(p => `### ${p.title}${p.author ? ` (${p.author})` : ''} [${p.genre}]\n${p.content}\n`),
        `## 기존 활동 (${context.activities.length}개)`,
        ...context.activities.map((a, i) => `### 활동 ${i + 1}\n${a.content}\n`),
        `## HWPX 출력 안내`,
        ``,
        `PBL 수업 설계서는 export_hwpx 도구의 \`pbl\` 템플릿으로 HWPX 파일을 만들 수 있습니다.`,
        `문서 내부 코드를 새로 쓰기보다, 아래 채워 넣을 칸에 프로젝트 설계 내용과 학생 작성 공간을 넣어 완성하세요.`,
        `- **template**: \`"pbl"\``,
        `- **필수 구성**: 프로젝트 제목, 핵심 질문, 실제성 있는 문제 상황, 최종 산출물, 차시별 활동, 자료, 교사 지원, 평가 계획, 공개 발표/공유 방식, 성찰 활동`,
        `- **학생용 활동지**: 문서 마지막에 실제 학생 활동지와 차시별 상세 활동지를 포함하고, 문제 발견, 자료 조사, 산출물 설계, 역할·일정 관리, 발표 준비, 성찰을 학생이 직접 기록할 수 있게 표의 빈 칸을 둡니다.`,
        `- **고정 예시 금지**: 특정 장르·프로젝트 예시를 남기지 말고, 요청 단원과 학급 특성에 맞게 바꿉니다.`,
        ``,
        `### pbl 템플릿의 채워 넣을 칸`,
        `{{PBL 수업자료 제목}}, {{학교명}}, {{교과/과목}}, {{학년/반}}, {{단원/주제}}, {{차시 수}}, {{운영 형태}}`,
        `{{프로젝트 제목}}, {{핵심 질문}}, {{문제 상황}}, {{최종 산출물}}, {{공개 발표/공유 방식}}`,
        `{{성취기준}}, {{학습 목표}}, {{성공 기준}}`,
        `{{1차시 활동}}, {{1차시 교사 지원}}, {{1차시 산출물}} ... {{4차시 활동}}, {{4차시 교사 지원}}, {{4차시 산출물}}`,
        `{{탐구 질문1}}, {{자료1}}, {{조사 결과1}}, {{탐구 질문2}}, {{자료2}}, {{조사 결과2}}`,
        `{{문제 이해 우수}}, {{문제 이해 보통}}, {{문제 이해 노력}}, {{자료 활용 우수}}, {{협업 우수}}, {{산출물 우수}} 등 평가 기준`,
        `{{발표 핵심 메시지}}, {{예상 질문}}, {{성찰 활동}}, {{개선할 점}}`,
        `{{활동지 문제 정의}}, {{활동지 자료 조사 계획}}, {{활동지 산출물 설계}}, {{활동지 역할 일정}}, {{활동지 중간 점검}}, {{활동지 발표 후 성찰}}`,
        `{{점검 수정 계획1}}, {{점검 수정 계획2}}, {{점검 수정 계획3}}`,
        ``,
        `### 작성 기준`,
        `- 핵심 질문은 학생이 실제 문제 해결을 시도하도록 열린 질문으로 씁니다.`,
        `- 차시별 활동에는 교사 지원과 학생 산출물을 함께 제시합니다.`,
        `- 평가 계획은 산출물, 과정, 협업, 발표/공유를 관찰 가능한 말로 적습니다.`,
        `- PBL 설계서 뒤에는 학생이 바로 사용할 수 있는 활동지와 자기 점검표를 포함합니다.`,
        `- 실제 수업용 산출물은 1차시 문제 발견, 2차시 자료 조사, 3차시 산출물 제작, 4차시 발표·성찰 활동지를 각각 작성 공간까지 포함해 구성합니다.`,
        ``,
        `## 교사 노트`,
        ...context.teacher_notes.map(n => `${n.tips}\n`),
      ].filter(Boolean).join('\n');

      return {
        content: [{ type: 'text' as const, text: contextMarkdown }],
      };
    },
  );
}
