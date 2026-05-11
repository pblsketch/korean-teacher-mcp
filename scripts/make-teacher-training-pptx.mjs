import { registerExportPptxTool } from '../dist/tools/export-pptx.js';
import path from 'node:path';
import os from 'node:os';

const handlers = new Map();
const mockServer = {
  tool(name, _desc, _schema, handler) {
    handlers.set(name, handler);
  },
};
registerExportPptxTool(mockServer);
const pptx = handlers.get('export_pptx');

const markdown = `# 전통 수업 vs 미래 수업
<!-- layout:comparison -->
- 교사 중심 지식 전달
- 암기와 반복 훈련
- 표준화된 평가지
- 정해진 교과서 진도
- 학생 주도 탐구 학습
- 협력과 프로젝트 기반
- 수행·과정 중심 평가
- 맞춤형 학습 경로

# 우리 학교 학생 참여율
<!-- layout:statistics -->
- 92%
- 2025학년도 1학기 프로젝트 수업 참여 결과

# 김영하 작가의 말
<!-- layout:quote -->
- 문학은 삶을 이해하는 가장 느린 길이다
- — 김영하, 《읽다》

# 탐구 학습 4단계
<!-- layout:process -->
- 질문 던지기
- 자료 수집
- 분석 및 해석
- 발표와 공유

# 제2부. 현대문학의 흐름
<!-- layout:section-header -->
- 1920년대 ~ 현재

# 핵심 역량 6가지
<!-- layout:two-column -->
- **의사소통 역량**
- 생각과 감정을 효과적으로 표현·경청
- **창의적 사고 역량**
- 새로운 관점과 아이디어 생성
- **공동체 역량**
- 협력·배려·민주적 참여
- **자기관리 역량**
- 자기 주도적 학습과 성찰
- **지식정보처리 역량**
- 정보 탐색·분석·활용
- **심미적 감성 역량**
- 문화·예술을 향유하고 공감
`;

const outputDir = path.join(os.homedir(), 'Downloads');

const res = await pptx({
  markdown,
  filename: '교사연수_레이아웃데모',
  output_dir: outputDir,
  title: '교사 연수 자료',
  subtitle: '레이아웃 6종 예시',
  theme: { fontPreset: 'default', useMaster: true },
});

console.log(res.content[0].text);
