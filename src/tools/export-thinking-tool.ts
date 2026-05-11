import { z } from 'zod';
import path from 'node:path';
import os from 'node:os';
import { writeFile, mkdir } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import PptxGenJS from 'pptxgenjs';

function getDefaultOutputDir(): string {
  return path.join(os.homedir(), 'Downloads');
}

const ROUTINES = [
  'see-think-wonder', 'kwl', 'pmi', 'csi', '3why', '4c',
  'compass-points', 'think-puzzle-explore',
  'two-stars-and-a-wish', 'i-used-to-think-now-i-think',
] as const;

type Routine = typeof ROUTINES[number];

const FONT = 'Malgun Gothic';

// --- Helpers ---

function addBadge(
  slide: any, text: string, color: string,
  x: number, y: number, w = 0.8, h = 0.35,
) {
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color },
    rectRadius: 0.05,
  });
  slide.addText(text, {
    x, y, w, h,
    fontFace: FONT, fontSize: 10, color: 'FFFFFF',
    bold: true, align: 'center', valign: 'middle',
  });
}

function addColumnBox(slide: any, opts: {
  x: number; y: number; w: number; h: number;
  badgeText: string; badgeColor: string;
  subPrompt: string; watermark: string;
  content?: string;
}) {
  const { x, y, w, h, badgeText, badgeColor, subPrompt, watermark, content } = opts;

  // Outer rounded rect
  slide.addShape('roundRect' as any, {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    line: { color: 'CCCCCC', width: 0.75 },
    rectRadius: 0.1,
  });

  // Badge centered at top of column
  const badgeW = Math.min(w * 0.7, 1.2);
  addBadge(slide, badgeText, badgeColor, x + (w - badgeW) / 2, y + 0.15, badgeW);

  // Sub-prompt
  slide.addText(subPrompt, {
    x: x + 0.1, y: y + 0.6, w: w - 0.2, h: 0.3,
    fontFace: FONT, fontSize: 9, color: '888888', align: 'center',
  });

  // Watermark
  slide.addText(watermark, {
    x: x + (w - 1) / 2, y: y + h - 1.2, w: 1, h: 1,
    fontFace: FONT, fontSize: 40, color: 'EEEEEE', align: 'center', valign: 'middle',
  });

  // Content
  if (content) {
    slide.addText(content, {
      x: x + 0.15, y: y + 0.95, w: w - 0.3, h: h - 1.5,
      fontFace: FONT, fontSize: 10, color: '333333', valign: 'top',
      wrap: true,
    });
  }
}

function addTitleBar(slide: any, text: string, color: string, y = 0.15) {
  slide.addShape('roundRect' as any, {
    x: 0.35, y, w: 9.3, h: 0.55,
    fill: { color },
    rectRadius: 0.08,
  });
  slide.addText(text, {
    x: 0.35, y, w: 9.3, h: 0.55,
    fontFace: FONT, fontSize: 20, color: 'FFFFFF',
    bold: true, align: 'center', valign: 'middle',
  });
}

function addTopicRow(slide: any, topic: string | undefined, y = 0.8) {
  if (!topic) return;
  slide.addText(`탐구 주제: ${topic}`, {
    x: 0.5, y, w: 9.0, h: 0.3,
    fontFace: FONT, fontSize: 11, color: '555555',
  });
}

// --- Routine builders ---

function buildSeeThinkWonder(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  slide.addText('SEE · THINK · WONDER', {
    x: 0, y: 0.15, w: 10, h: 0.6,
    fontFace: FONT, fontSize: 28, color: '8E44AD',
    bold: true, align: 'center',
  });

  addTopicRow(slide, topic, 0.75);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'SEE', color: 'E74C3C', sub: '무엇이 보이나요?', wm: '\uD83D\uDD0D', key: 'see' },
    { x: 3.5, badge: 'THINK', color: '27AE60', sub: '무엇이라고 생각하나요?', wm: '\uD83D\uDCA1', key: 'think' },
    { x: 6.65, badge: 'WONDER', color: '8E44AD', sub: '무엇이 궁금한가요?', wm: '\u2753', key: 'wonder' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function buildKwl(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, 'K-W-L 사고 기법', '1ABC9C');
  addTopicRow(slide, topic);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'KNOW', color: 'E74C3C', sub: '이미 알고 있는 것은?', wm: 'K', key: 'know' },
    { x: 3.5, badge: 'WONDER', color: '27AE60', sub: '알고 싶은 것은?', wm: 'W', key: 'wonder' },
    { x: 6.65, badge: 'LEARNED', color: 'E91E63', sub: '배운 것은?', wm: 'L', key: 'learned' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function buildPmi(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, 'P-M-I 사고 기법', '2C3E50');
  addTopicRow(slide, topic);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'PLUS', color: 'E74C3C', sub: '긍정적인 점은?', wm: '+', key: 'plus' },
    { x: 3.5, badge: 'MINUS', color: '3498DB', sub: '부정적인 점은?', wm: '\u2212', key: 'minus' },
    { x: 6.65, badge: 'INTERESTING', color: '27AE60', sub: '흥미로운 점은?', wm: '?!', key: 'interesting' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function buildCsi(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  slide.addText('C-S-I 사고 기법', {
    x: 0, y: 0.15, w: 10, h: 0.6,
    fontFace: FONT, fontSize: 24, color: '2C3E50',
    bold: true, align: 'center',
  });

  addTopicRow(slide, topic, 0.75);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'COLOR', color: 'E67E22', sub: '어떤 색이 떠오르나요?', wm: '\uD83C\uDFA8', key: 'color' },
    { x: 3.5, badge: 'SYMBOL', color: 'E91E63', sub: '어떤 기호가 떠오르나요?', wm: '\u2726', key: 'symbol' },
    { x: 6.65, badge: 'IMAGE', color: '8E44AD', sub: '어떤 이미지가 떠오르나요?', wm: '\uD83D\uDDBC\uFE0F', key: 'image' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function build3why(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, '3 WHY 사고 기법', 'F39C12');
  addTopicRow(slide, topic);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'WHY 1', color: 'E74C3C', sub: '나에게 왜 중요한가?', wm: '?', key: 'why1' },
    { x: 3.5, badge: 'WHY 2', color: '27AE60', sub: '주변 사람들에게 왜 중요한가?', wm: '?', key: 'why2' },
    { x: 6.65, badge: 'WHY 3', color: '3498DB', sub: '세상에 왜 중요한가?', wm: '?', key: 'why3' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function build4c(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, '4C 사고 기법', '2C3E50');
  addTopicRow(slide, topic);

  const cells = [
    { x: 0.35, y: 1.1, badge: '1단계: 연관성 찾기 CONNECTIONS', color: '3498DB', sub: '나의 삶과 관련지어 설명하기', key: 'connections' },
    { x: 5.0, y: 1.1, badge: '2단계: 도전하기 CHALLENGES', color: 'E91E63', sub: '새로운 관점에서 질문하기', key: 'challenges' },
    { x: 0.35, y: 3.3, badge: '3단계: 개념 찾기 CONCEPTS', color: '27AE60', sub: '다양한 개념을 찾아 설명하기', key: 'concepts' },
    { x: 5.0, y: 3.3, badge: '4단계: 변화 찾기 CHANGES', color: 'F39C12', sub: '생각이나 관점의 변화 설명하기', key: 'changes' },
  ];

  for (const cell of cells) {
    const w = 4.4;
    const h = 2.0;

    // White rounded rect
    slide.addShape('roundRect' as any, {
      x: cell.x, y: cell.y, w, h,
      fill: { color: 'FFFFFF' },
      line: { color: 'CCCCCC', width: 0.75 },
      rectRadius: 0.1,
    });

    // Colored header bar at top of cell
    slide.addShape('roundRect' as any, {
      x: cell.x, y: cell.y, w, h: 0.4,
      fill: { color: cell.color },
      rectRadius: 0.08,
    });
    slide.addText(cell.badge, {
      x: cell.x, y: cell.y, w, h: 0.4,
      fontFace: FONT, fontSize: 10, color: 'FFFFFF',
      bold: true, align: 'center', valign: 'middle',
    });

    // Sub-prompt
    slide.addText(cell.sub, {
      x: cell.x + 0.1, y: cell.y + 0.45, w: w - 0.2, h: 0.25,
      fontFace: FONT, fontSize: 9, color: '888888', align: 'center',
    });

    // Content
    if (content?.[cell.key]) {
      slide.addText(content[cell.key], {
        x: cell.x + 0.15, y: cell.y + 0.75, w: w - 0.3, h: h - 1.0,
        fontFace: FONT, fontSize: 10, color: '333333', valign: 'top', wrap: true,
      });
    }
  }
}

function buildCompassPoints(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  slide.addText('COMPASS POINTS', {
    x: 0, y: 0.15, w: 10, h: 0.5,
    fontFace: FONT, fontSize: 24, color: '2C3E50',
    bold: true, align: 'center',
  });

  addTopicRow(slide, topic, 0.65);

  // Large white background rect
  slide.addShape('roundRect' as any, {
    x: 0.5, y: 0.9, w: 9.0, h: 4.3,
    fill: { color: 'FFFFFF' },
    line: { color: 'CCCCCC', width: 0.75 },
    rectRadius: 0.15,
  });

  // Diagonal lines
  slide.addShape('line' as any, { x: 0.5, y: 0.9, w: 9.0, h: 4.3, line: { color: 'DDDDDD', width: 0.5 } });
  slide.addShape('line' as any, { x: 9.5, y: 0.9, w: -9.0, h: 4.3, line: { color: 'DDDDDD', width: 0.5 }, flipH: true });

  // Center compass
  slide.addText('\uD83E\uDDED', {
    x: 4.2, y: 2.6, w: 1.6, h: 1.0,
    fontSize: 36, align: 'center', valign: 'middle',
  });

  // Directional badges + content areas
  const dirs = [
    { badge: 'NEEDS', color: 'E74C3C', bx: 4.1, by: 0.9, cx: 3.0, cy: 1.3, cw: 4.0, ch: 0.8, key: 'needs' },
    { badge: 'SUGGESTIONS', color: 'E74C3C', bx: 4.1, by: 4.55, cx: 3.0, cy: 3.8, cw: 4.0, ch: 0.7, key: 'suggestions' },
    { badge: 'WORRIES', color: 'E74C3C', bx: 0.6, by: 2.7, cx: 0.7, cy: 2.0, cw: 3.0, ch: 0.7, key: 'worries' },
    { badge: 'EXCITEMENTS', color: 'E74C3C', bx: 7.6, by: 2.7, cx: 6.3, cy: 2.0, cw: 3.0, ch: 0.7, key: 'excitements' },
  ];

  for (const d of dirs) {
    const badgeW = d.badge.length > 8 ? 1.4 : 1.0;
    addBadge(slide, d.badge, d.color, d.bx, d.by, badgeW);

    if (content?.[d.key]) {
      slide.addText(content[d.key], {
        x: d.cx, y: d.cy, w: d.cw, h: d.ch,
        fontFace: FONT, fontSize: 9, color: '555555', valign: 'top', wrap: true,
      });
    }
  }
}

function buildThinkPuzzleExplore(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, 'THINK PUZZLE EXPLORE', 'F39C12');
  addTopicRow(slide, topic);

  const colW = 2.9;
  const cols = [
    { x: 0.35, badge: 'THINK', color: 'F39C12', sub: '무엇을 이미 알고 있나요?', wm: '\uD83D\uDCA1', key: 'think' },
    { x: 3.5, badge: 'PUZZLE', color: '8E44AD', sub: '어떤 점이 궁금한가요?', wm: '\uD83E\uDDE9', key: 'puzzle' },
    { x: 6.65, badge: 'EXPLORE', color: '27AE60', sub: '어떤 방식으로 탐구할 수 있을까요?', wm: '\uD83D\uDD2D', key: 'explore' },
  ];

  for (const col of cols) {
    addColumnBox(slide, {
      x: col.x, y: 1.1, w: colW, h: 4.2,
      badgeText: col.badge, badgeColor: col.color,
      subPrompt: col.sub, watermark: col.wm,
      content: content?.[col.key],
    });
  }
}

function buildTwoStarsAndAWish(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: '2C3E50' };

  addTitleBar(slide, 'TWO STARS AND A WISH', '2C3E50');
  addTopicRow(slide, topic, 0.75);

  // Star 1
  slide.addShape('roundRect' as any, {
    x: 0.5, y: 1.0, w: 4.2, h: 2.5,
    fill: { color: 'F1C40F' },
    rectRadius: 0.15,
  });
  slide.addText('\u2605', {
    x: 0.5, y: 1.0, w: 4.2, h: 0.6,
    fontSize: 28, color: 'FFFFFF', align: 'center',
  });
  slide.addText('마음에 들었던 점은?', {
    x: 0.7, y: 1.5, w: 3.8, h: 0.3,
    fontFace: FONT, fontSize: 10, color: '7D6608', align: 'center',
  });
  if (content?.['star1']) {
    slide.addText(content['star1'], {
      x: 0.7, y: 1.9, w: 3.8, h: 1.4,
      fontFace: FONT, fontSize: 10, color: '333333', valign: 'top', wrap: true,
    });
  }

  // Star 2
  slide.addShape('roundRect' as any, {
    x: 5.0, y: 1.0, w: 4.2, h: 2.5,
    fill: { color: 'F1C40F' },
    rectRadius: 0.15,
  });
  slide.addText('\u2605', {
    x: 5.0, y: 1.0, w: 4.2, h: 0.6,
    fontSize: 28, color: 'FFFFFF', align: 'center',
  });
  slide.addText('또 마음에 들었던 점은?', {
    x: 5.2, y: 1.5, w: 3.8, h: 0.3,
    fontFace: FONT, fontSize: 10, color: '7D6608', align: 'center',
  });
  if (content?.['star2']) {
    slide.addText(content['star2'], {
      x: 5.2, y: 1.9, w: 3.8, h: 1.4,
      fontFace: FONT, fontSize: 10, color: '333333', valign: 'top', wrap: true,
    });
  }

  // Wish box
  slide.addShape('roundRect' as any, {
    x: 0.5, y: 3.8, w: 9.0, h: 1.3,
    fill: { color: 'FFFFFF' },
    line: { color: 'E91E63', width: 1.5 },
    rectRadius: 0.1,
  });
  slide.addText('I WISH... 바라는 점은?', {
    x: 0.7, y: 3.85, w: 8.6, h: 0.35,
    fontFace: FONT, fontSize: 11, color: 'E91E63', bold: true,
  });
  if (content?.['wish']) {
    slide.addText(content['wish'], {
      x: 0.7, y: 4.25, w: 8.6, h: 0.75,
      fontFace: FONT, fontSize: 10, color: '333333', valign: 'top', wrap: true,
    });
  }
}

function buildIUsedToThinkNowIThink(pptx: any, topic?: string, content?: Record<string, string>) {
  const slide = pptx.addSlide();
  slide.background = { color: 'F5F5F5' };

  addTitleBar(slide, '예전 생각, 지금 생각', '1ABC9C');
  addTopicRow(slide, topic);

  const rows = [
    { y: 1.1, badge: 'I USED TO THINK...', color: 'E74C3C', key: 'used_to_think' },
    { y: 3.2, badge: 'NOW I THINK...', color: '2C3E50', key: 'now_i_think' },
  ];

  for (const row of rows) {
    // White writing area
    slide.addShape('roundRect' as any, {
      x: 0.35, y: row.y, w: 9.3, h: 1.8,
      fill: { color: 'FFFFFF' },
      line: { color: 'CCCCCC', width: 0.75 },
      rectRadius: 0.1,
    });

    // Badge on left
    addBadge(slide, row.badge, row.color, 0.5, row.y + 0.15, 2.2, 0.35);

    // Content area
    if (content?.[row.key]) {
      slide.addText(content[row.key], {
        x: 0.5, y: row.y + 0.6, w: 8.9, h: 1.1,
        fontFace: FONT, fontSize: 10, color: '333333', valign: 'top', wrap: true,
      });
    }
  }
}

// --- Routine dispatcher ---

const BUILDERS: Record<Routine, (pptx: any, topic?: string, content?: Record<string, string>) => void> = {
  'see-think-wonder': buildSeeThinkWonder,
  'kwl': buildKwl,
  'pmi': buildPmi,
  'csi': buildCsi,
  '3why': build3why,
  '4c': build4c,
  'compass-points': buildCompassPoints,
  'think-puzzle-explore': buildThinkPuzzleExplore,
  'two-stars-and-a-wish': buildTwoStarsAndAWish,
  'i-used-to-think-now-i-think': buildIUsedToThinkNowIThink,
};

// --- HWPX section XML generators ---

function generateHwpxSectionXml(routine: Routine, topic?: string, content?: Record<string, string>): string {
  // Build a table-based worksheet layout in OWPML
  const topicLine = topic ? `<hp:p><hp:run><hp:char><hp:t>탐구 주제: ${escapeXml(topic)}</hp:t></hp:char></hp:run></hp:p>` : '';

  const routineConfigs: Record<Routine, { title: string; columns: { header: string; sub: string; key: string }[] }> = {
    'see-think-wonder': {
      title: 'SEE · THINK · WONDER',
      columns: [
        { header: 'SEE', sub: '무엇이 보이나요?', key: 'see' },
        { header: 'THINK', sub: '무엇이라고 생각하나요?', key: 'think' },
        { header: 'WONDER', sub: '무엇이 궁금한가요?', key: 'wonder' },
      ],
    },
    'kwl': {
      title: 'K-W-L 사고 기법',
      columns: [
        { header: 'KNOW', sub: '이미 알고 있는 것은?', key: 'know' },
        { header: 'WONDER', sub: '알고 싶은 것은?', key: 'wonder' },
        { header: 'LEARNED', sub: '배운 것은?', key: 'learned' },
      ],
    },
    'pmi': {
      title: 'P-M-I 사고 기법',
      columns: [
        { header: 'PLUS', sub: '긍정적인 점은?', key: 'plus' },
        { header: 'MINUS', sub: '부정적인 점은?', key: 'minus' },
        { header: 'INTERESTING', sub: '흥미로운 점은?', key: 'interesting' },
      ],
    },
    'csi': {
      title: 'C-S-I 사고 기법',
      columns: [
        { header: 'COLOR', sub: '어떤 색이 떠오르나요?', key: 'color' },
        { header: 'SYMBOL', sub: '어떤 기호가 떠오르나요?', key: 'symbol' },
        { header: 'IMAGE', sub: '어떤 이미지가 떠오르나요?', key: 'image' },
      ],
    },
    '3why': {
      title: '3 WHY 사고 기법',
      columns: [
        { header: 'WHY 1', sub: '나에게 왜 중요한가?', key: 'why1' },
        { header: 'WHY 2', sub: '주변 사람들에게 왜 중요한가?', key: 'why2' },
        { header: 'WHY 3', sub: '세상에 왜 중요한가?', key: 'why3' },
      ],
    },
    '4c': {
      title: '4C 사고 기법',
      columns: [
        { header: 'CONNECTIONS', sub: '나의 삶과 관련지어 설명하기', key: 'connections' },
        { header: 'CHALLENGES', sub: '새로운 관점에서 질문하기', key: 'challenges' },
        { header: 'CONCEPTS', sub: '다양한 개념을 찾아 설명하기', key: 'concepts' },
        { header: 'CHANGES', sub: '생각이나 관점의 변화 설명하기', key: 'changes' },
      ],
    },
    'compass-points': {
      title: 'COMPASS POINTS',
      columns: [
        { header: 'NEEDS', sub: '필요한 것은?', key: 'needs' },
        { header: 'EXCITEMENTS', sub: '흥미로운 것은?', key: 'excitements' },
        { header: 'WORRIES', sub: '걱정되는 것은?', key: 'worries' },
        { header: 'SUGGESTIONS', sub: '제안하고 싶은 것은?', key: 'suggestions' },
      ],
    },
    'think-puzzle-explore': {
      title: 'THINK PUZZLE EXPLORE',
      columns: [
        { header: 'THINK', sub: '무엇을 이미 알고 있나요?', key: 'think' },
        { header: 'PUZZLE', sub: '어떤 점이 궁금한가요?', key: 'puzzle' },
        { header: 'EXPLORE', sub: '어떤 방식으로 탐구할 수 있을까요?', key: 'explore' },
      ],
    },
    'two-stars-and-a-wish': {
      title: 'TWO STARS AND A WISH',
      columns: [
        { header: '★ Star 1', sub: '마음에 들었던 점은?', key: 'star1' },
        { header: '★ Star 2', sub: '또 마음에 들었던 점은?', key: 'star2' },
        { header: 'WISH', sub: '바라는 점은?', key: 'wish' },
      ],
    },
    'i-used-to-think-now-i-think': {
      title: '예전 생각, 지금 생각',
      columns: [
        { header: 'I USED TO THINK...', sub: '예전에는 이렇게 생각했습니다', key: 'used_to_think' },
        { header: 'NOW I THINK...', sub: '지금은 이렇게 생각합니다', key: 'now_i_think' },
      ],
    },
  };

  const cfg = routineConfigs[routine];
  const colCount = cfg.columns.length;

  // Build table cells for header row
  const headerCells = cfg.columns.map(c =>
    `<hp:tc><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${Math.floor(42520 / colCount)}" height="1200"/><hp:cellMargin left="0" right="0" top="0" bottom="0"/><hp:p><hp:run><hp:char><hp:t>${escapeXml(c.header)}</hp:t></hp:char></hp:run></hp:p><hp:p><hp:run><hp:char><hp:t>${escapeXml(c.sub)}</hp:t></hp:char></hp:run></hp:p></hp:tc>`
  ).join('');

  // Build table cells for content row
  const contentCells = cfg.columns.map(c =>
    `<hp:tc><hp:cellAddr colAddr="0" rowAddr="1"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${Math.floor(42520 / colCount)}" height="8000"/><hp:cellMargin left="0" right="0" top="0" bottom="0"/><hp:p><hp:run><hp:char><hp:t>${escapeXml(content?.[c.key] ?? '')}</hp:t></hp:char></hp:run></hp:p></hp:tc>`
  ).join('');

  return `<hs:sec>
  <hp:p><hp:run><hp:char><hp:t>${escapeXml(cfg.title)}</hp:t></hp:char></hp:run></hp:p>
  ${topicLine}
  <hp:tbl>
    <hp:tr>${headerCells}</hp:tr>
    <hp:tr>${contentCells}</hp:tr>
  </hp:tbl>
</hs:sec>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Tool registration ---

const ROUTINE_LABELS: Record<Routine, string> = {
  'see-think-wonder': '보고-생각하고-궁금한 것',
  'kwl': '알고 있는 것-알고 싶은 것-배운 것',
  'pmi': '긍정-부정-흥미',
  'csi': '색-기호-이미지',
  '3why': '3가지 이유',
  '4c': '연관-도전-개념-변화',
  'compass-points': '나침반 포인트 (필요-흥미-걱정-제안)',
  'think-puzzle-explore': '생각-퍼즐-탐구',
  'two-stars-and-a-wish': '별 둘과 소원 하나',
  'i-used-to-think-now-i-think': '예전 생각, 지금 생각',
};

export function registerExportThinkingToolTool(server: McpServer) {
  server.tool(
    'export_thinking_tool',
    `사고 도구 활동지를 생성합니다. Project Zero의 사고 루틴(Thinking Routines)을 기반으로 한 시각적 활동지를 PPTX 또는 HWPX로 생성합니다.

지원하는 사고 루틴:
- see-think-wonder: 보고-생각하고-궁금한 것
- kwl: 알고 있는 것-알고 싶은 것-배운 것
- pmi: 긍정-부정-흥미
- csi: 색-기호-이미지
- 3why: 3가지 이유
- 4c: 연관-도전-개념-변화
- compass-points: 나침반 포인트 (필요-흥미-걱정-제안)
- think-puzzle-explore: 생각-퍼즐-탐구
- two-stars-and-a-wish: 별 둘과 소원 하나
- i-used-to-think-now-i-think: 예전 생각, 지금 생각`,
    {
      routine: z.enum([
        'see-think-wonder', 'kwl', 'pmi', 'csi', '3why', '4c',
        'compass-points', 'think-puzzle-explore',
        'two-stars-and-a-wish', 'i-used-to-think-now-i-think',
      ]).describe('사고 루틴 유형'),
      topic: z.string().optional().describe('탐구 주제 (활동지 상단에 표시)'),
      format: z.enum(['pptx', 'hwpx']).default('pptx').describe('출력 형식'),
      filename: z.string().optional().describe('파일명 (확장자 없이)'),
      output_dir: z.string().optional().describe('저장 디렉토리'),
      content: z.record(z.string()).optional().describe('사전 입력 내용 (키: 영역명, 값: 내용)'),
    },
    async ({ routine, topic, format, filename, output_dir, content }) => {
      // HWPX format: return XML for export_hwpx
      if (format === 'hwpx') {
        const sectionXml = generateHwpxSectionXml(routine as Routine, topic, content);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              format_hint: 'hwpx',
              suggested_template: 'worksheet',
              suggested_section_xml: sectionXml,
              routine,
              routine_label: ROUTINE_LABELS[routine as Routine],
              message: `HWPX 형식으로 생성하려면 export_hwpx 도구를 호출하세요. suggested_section_xml을 section_xml 파라미터로 전달하면 됩니다.`,
            }, null, 2),
          }],
        };
      }

      // PPTX format
      let dir = output_dir ?? getDefaultOutputDir();
      if (dir.startsWith('/mnt/') || dir.startsWith('/tmp/') || dir.startsWith('/home/')) {
        dir = getDefaultOutputDir();
      }
      const name = filename ?? `thinking-tool-${routine}`;
      const outputPath = path.join(dir, `${name}.pptx`);

      try {
        await mkdir(dir, { recursive: true });

        const pptx = new (PptxGenJS as any)();
        pptx.layout = 'LAYOUT_16x9';

        const builder = BUILDERS[routine as Routine];
        builder(pptx, topic, content);

        const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        await writeFile(outputPath, buffer);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              path: outputPath,
              routine,
              routine_label: ROUTINE_LABELS[routine as Routine],
              size_kb: Math.round(buffer.length / 1024),
              message: `사고 도구 활동지(${ROUTINE_LABELS[routine as Routine]})가 생성되었습니다: ${outputPath}`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `사고 도구 활동지 생성 실패: ${err instanceof Error ? err.message : String(err)}`,
          }],
        };
      }
    },
  );
}
