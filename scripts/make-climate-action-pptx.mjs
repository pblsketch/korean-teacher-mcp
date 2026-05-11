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

// Nordic Minimalism 팔레트:
// - 배경: 순백 + 오프화이트
// - 텍스트: 딥 차콜 (#2D3436)
// - 악센트: 뮤티드 스카이 블루 (#6B9AC4)
// - 타이틀 바: 차콜 배경 + 흰색 타이포
const markdown = `# 수업 목표
- 기후변화의 과학적 근거를 데이터로 읽을 수 있다
- SDGs 13번(기후행동)의 의미를 학급 언어로 설명할 수 있다
- 일상 속 탄소 감축 실천 4단계를 스스로 설계할 수 있다
- 학급 공동의 기후행동 다짐을 함께 만들어 공유한다

# 우리나라 탄소배출 추이 (2020~2024)
<!-- chart:line -->
| 연도 | 온실가스 배출량(백만톤 CO₂eq) |
| --- | --- |
| 2020 | 656 |
| 2021 | 676 |
| 2022 | 654 |
| 2023 | 624 |
| 2024 | 601 |

# 기후위기의 언어
<!-- layout:quote -->
- 지구온난화는 미래 세대에 대한 범죄다
- — 그레타 툰베리

# 우리가 할 수 있는 행동 4단계
<!-- layout:process -->
- 관찰하기
- 기록하기
- 줄이기
- 나누기

# 학급 실천 다짐
<!-- layout:section-header -->
- 오늘 우리가 약속하는 작은 행동
`;

const outputDir = path.join(os.homedir(), 'Downloads');

const res = await pptx({
  markdown,
  filename: '기후행동_공개수업',
  output_dir: outputDir,
  title: '청소년과 환경',
  subtitle: 'SDGs 13번 · 기후행동 | 학부모 공개수업',
  style_name: 'Nordic Minimalism',
  theme: {
    titleBg: '2D3436',        // 딥 차콜
    contentBg: 'FFFFFF',      // 순백
    accent: '6B9AC4',         // 뮤티드 스카이 블루 (Nordic accent)
    titleColor: 'FFFFFF',
    bodyColor: '2D3436',
    titleFontSize: 26,
    bodyFontSize: 15,
    fontPreset: 'pretendard', // 깔끔한 산세리프
    useMaster: true,          // 마스터 슬라이드 + 페이지 번호
  },
});

console.log(res.content[0].text);
