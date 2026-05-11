// 중1-1 1단원 "표현하는 나, 소통하는 우리" 오프닝 PPT
// DB 출처: search_content → 중1-1 / textbook / unit_number=1
// 스타일: Dark Academia (pptx-styles.md § 04)
// 팔레트: bg #1A1208, titleGold #C9A84C, body #D4BF9A, accent #8A7340
// 표 헤더 #3A2E14 (pptxgen-patterns.md § 5)

import { registerExportPptxTool } from '../dist/tools/export-pptx.js';
import path from 'node:path';
import os from 'node:os';

const handlers = new Map();
const mockServer = {
  tool(name, _desc, _schema, handler) { handlers.set(name, handler); },
};
registerExportPptxTool(mockServer);
const pptx = handlers.get('export_pptx');

// 슬라이드별 레이아웃 힌트 주석 사용
// 1. 표지 — section-header
// 2. 학습 목표 — title-content (기본 불릿)
// 3. 제재 표 — title-content (표)
// 4. 핵심 개념 2단 비교 — comparison
// 5. 인용 — quote
// 6. 마무리 — process (3단 흐름)

// title/subtitle 인자가 자동으로 표지 슬라이드를 생성하므로 markdown은 2~6장만 작성
const markdown = `# 학습 목표
- 운율·비유·상징의 특성과 효과에 유의하며 작품을 감상하고 창작할 수 있다
- 소통 맥락과 수용자 참여 양상을 고려하여 상호 작용적 매체를 분석할 수 있다
- 문화 향유·의사소통·디지털 미디어 역량을 함께 기른다

# 이번 단원에서 다루는 제재
| 소단원 | 갈래 | 제재 | 작가 |
| --- | --- | --- | --- |
| (1) 비유 | 시 | 우리 둘이 | 김준현 |
| (2) 상징과 운율 | 시 | 오우가 | 윤선도 |
| (2) 상징과 운율 | 시 | 봄비 | 수록 작품 |
| (3) 매체에 따른 의사소통 | 매체 | 상호 작용적 매체 텍스트 | — |

<!-- layout:comparison -->
# 일상 언어 vs 시의 언어
- 사전적·지시적 의미
- 사실 전달이 목적
- 풀어서 길게 설명
- 누구에게나 동일한 뜻
- 함축적·내포적 의미
- 정서와 감각의 환기
- 압축·빗댐·상징
- 읽는 이마다 새로 피어나는 뜻

<!-- layout:quote -->
# 이 작품은 우리에게 무엇을 말하는가
"정민이가 굽은 내 등을 지느러미로 쓰다듬어 주더라 — 노래보다 그게 훨씬 좋았어" — 김준현, 「우리 둘이」

# 오늘 수업의 흐름
- 열기 — 자신의 표현 경험 떠올리기
- 펼치기 — 비유·상징으로 감정 표현하기
- 닫기 — 내 언어로 단원 학습 목표 다시 쓰기
`;

const outputDir = path.join(os.homedir(), 'Downloads');

const res = await pptx({
  markdown,
  filename: '중1_1단원_오프닝',
  output_dir: outputDir,
  title: '표현하는 나, 소통하는 우리',
  subtitle: '중학교 1학년 1학기 · 1단원 수업 오프닝',
  style_name: 'Dark Academia',
  theme: {
    fontPreset: 'serif',                 // Nanum Myeongjo + Malgun Gothic (academia 분위기)
    titleBg: '1A1208',                   // Dark Academia background
    contentBg: '1A1208',                 // 전체 어두운 배경 통일
    accent: 'C9A84C',                    // Antique gold (핵심 강조)
    titleFontFace: 'Nanum Myeongjo',
    titleColor: 'C9A84C',                // Title gold
    bodyFontFace: 'Malgun Gothic',
    bodyColor: 'D4BF9A',                 // Warm parchment
    useMaster: true,
  },
});

console.log(res.content[0].text);
