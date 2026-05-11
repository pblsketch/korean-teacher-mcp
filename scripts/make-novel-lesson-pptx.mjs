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

const markdown = `# 학습 목표
- 서사 문학의 특성을 이해한다
- 소설의 3요소인 인물·사건·배경을 분석한다
- 작품의 주제를 파악한다

# 활동 순서
| 단계 | 활동 내용 | 시간 |
| --- | --- | --- |
| 도입 | 단원 소개 및 학습 동기 유발 | 5분 |
| 전개 | 소설 읽기 · 인물/사건/배경 분석 · 주제 탐색 | 25분 |
| 정리 | 활동 공유 및 핵심 개념 정리 | 10분 |

# 평가 방법
- **서술형 평가**
- 작품 속 인물의 성격을 근거와 함께 서술하기
- 사건의 전개가 주제에 기여하는 방식 설명하기
- **발표 관찰**
- 모둠 활동에서의 참여도와 의사소통 능력 관찰
- 근거를 갖춘 해석 제시 여부 확인
`;

const outputDir = path.join(os.homedir(), 'Downloads');

const res = await pptx({
  markdown,
  filename: '소설의이해_수업',
  output_dir: outputDir,
  title: '소설의 이해',
  subtitle: '중학교 2학년 국어',
  theme: { fontPreset: 'default', useMaster: true },
});

console.log(res.content[0].text);
