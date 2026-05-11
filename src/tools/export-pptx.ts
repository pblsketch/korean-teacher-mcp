import { z } from 'zod';
import path from 'node:path';
import os from 'node:os';
import { writeFile, mkdir } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import PptxGenJS from 'pptxgenjs';

function getDefaultOutputDir(): string {
  return path.join(os.homedir(), 'Downloads');
}

// 차트 데이터 구조
interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  series: { name: string; labels: string[]; values: number[] }[];
}

type LayoutType =
  | 'title-content'
  | 'two-column'
  | 'comparison'
  | 'statistics'
  | 'quote'
  | 'process'
  | 'section-header';

// Markdown을 슬라이드 구조로 파싱
interface SlideData {
  title: string;
  bullets: string[];
  table?: string[][];
  chart?: ChartData;
  layout?: LayoutType;
}

// 폰트 프리셋
const FONT_PRESETS = {
  default: { title: 'Malgun Gothic', body: 'Malgun Gothic' },
  pretendard: { title: 'Pretendard', body: 'Pretendard' },
  mixed: { title: 'KoPubWorldDotum', body: 'Malgun Gothic' },
  serif: { title: 'Nanum Myeongjo', body: 'Malgun Gothic' },
} as const;

type FontPresetKey = keyof typeof FONT_PRESETS;

function parseChartHint(line: string): ChartData['type'] | null {
  const m = line.match(/<!--\s*chart:(bar|line|pie|radar)\s*-->/);
  return m ? (m[1] as ChartData['type']) : null;
}

function parseLayoutHint(line: string): LayoutType | null {
  const m = line.match(/<!--\s*layout:(title-content|two-column|comparison|statistics|quote|process|section-header)\s*-->/);
  return m ? (m[1] as LayoutType) : null;
}

function tableToChartData(type: ChartData['type'], table: string[][]): ChartData | null {
  if (table.length < 2) return null;
  const header = table[0];
  const body = table.slice(1);

  if (type === 'pie') {
    // 두 열만 사용: [라벨, 값]
    const labels = body.map(r => r[0]);
    const values = body.map(r => parseFloat((r[1] ?? '0').replace(/[^\d.-]/g, '')) || 0);
    return {
      type: 'pie',
      series: [{ name: header[1] ?? 'values', labels, values }],
    };
  }

  // bar / line / radar: 첫 열이 카테고리 라벨, 나머지 열이 시리즈
  const labels = body.map(r => r[0]);
  const seriesNames = header.slice(1);
  const series = seriesNames.map((name, seriesIdx) => ({
    name,
    labels,
    values: body.map(r => parseFloat((r[seriesIdx + 1] ?? '0').replace(/[^\d.-]/g, '')) || 0),
  }));
  return { type, series };
}

function parseMarkdownToSlides(markdown: string): SlideData[] {
  const lines = markdown.split('\n');
  const slides: SlideData[] = [];
  let current: SlideData | null = null;
  let pendingChartType: ChartData['type'] | null = null;

  for (const line of lines) {
    // H1 or H2 → new slide
    if (line.startsWith('# ') || line.startsWith('## ')) {
      if (current) {
        if (pendingChartType && current.table) {
          const chart = tableToChartData(pendingChartType, current.table);
          if (chart) {
            current.chart = chart;
            delete current.table;
          }
        }
        slides.push(current);
      }
      current = { title: line.replace(/^#+\s*/, '').trim(), bullets: [] };
      pendingChartType = null;
    }
    // 힌트 주석 감지
    else if (line.includes('<!--') && current) {
      const chartType = parseChartHint(line);
      if (chartType) {
        pendingChartType = chartType;
        continue;
      }
      const layout = parseLayoutHint(line);
      if (layout) {
        current.layout = layout;
        continue;
      }
    }
    // H3 → subtitle as bullet
    else if (line.startsWith('### ') && current) {
      current.bullets.push(`**${line.replace(/^###\s*/, '').trim()}**`);
    }
    // Bullet points
    else if ((line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) && current) {
      current.bullets.push(line.replace(/^[-*]\s+|\d+\.\s+/, '').trim());
    }
    // Table row
    else if (line.startsWith('|') && current) {
      const cells = line.split('|').filter(c => c.trim() && !c.trim().match(/^[-:]+$/));
      if (cells.length > 0 && !line.match(/^\|[-:\s|]+\|$/)) {
        if (!current.table) current.table = [];
        current.table.push(cells.map(c => c.trim()));
      }
    }
    // Regular text
    else if (line.trim() && current && !line.startsWith('```')) {
      current.bullets.push(line.trim());
    }
  }

  if (current) {
    if (pendingChartType && current.table) {
      const chart = tableToChartData(pendingChartType, current.table);
      if (chart) {
        current.chart = chart;
        delete current.table;
      }
    }
    slides.push(current);
  }
  return slides;
}

// 교육용 기본 테마 (Dark Academia 스타일)
const THEME = {
  titleBg: '2C3E50',
  contentBg: 'FFFFFF',
  accent: '3498DB',
  titleFont: { fontFace: 'Malgun Gothic', fontSize: 28, color: 'FFFFFF', bold: true },
  bodyFont: { fontFace: 'Malgun Gothic', fontSize: 14, color: '333333' },
  bulletFont: { fontFace: 'Malgun Gothic', fontSize: 13, color: '444444' },
};

type MergedTheme = {
  titleBg: string;
  contentBg: string;
  accent: string;
  titleFont: { fontFace: string; fontSize: number; color: string; bold: true };
  bodyFont: { fontFace: string; fontSize: number; color: string };
  bulletFont: { fontFace: string; fontSize: number; color: string };
};

function renderTitleBar(slide: any, titleText: string, theme: MergedTheme) {
  slide.addShape('rect' as any, {
    x: 0, y: 0, w: 10, h: 1.2,
    fill: { color: theme.titleBg },
  });
  slide.addText(titleText, {
    x: 0.5, y: 0.2, w: 9, h: 0.8,
    ...theme.titleFont, fontSize: 24,
  });
}

function renderChartSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  const chart = slideData.chart!;
  const palette = [theme.accent, 'E74C3C', '2ECC71', 'F39C12', '9B59B6', '1ABC9C'];
  const commonOpts: any = {
    x: 0.5, y: 1.5, w: 9, h: 4,
    chartColors: palette,
    catAxisLabelFontFace: theme.bodyFont.fontFace,
    valAxisLabelFontFace: theme.bodyFont.fontFace,
    catAxisLabelFontSize: 11,
    valAxisLabelFontSize: 10,
    legendFontFace: theme.bodyFont.fontFace,
    legendFontSize: 10,
    showLegend: chart.series.length > 1,
    legendPos: 'b',
  };

  if (chart.type === 'pie') {
    slide.addChart('pie', chart.series, {
      ...commonOpts,
      x: 1.5, y: 1.5, w: 7, h: 4,
      showLegend: true,
      legendPos: 'r',
      showPercent: true,
      dataLabelFontFace: theme.bodyFont.fontFace,
      dataLabelFontSize: 10,
      dataLabelColor: 'FFFFFF',
    });
  } else if (chart.type === 'radar') {
    slide.addChart('radar', chart.series, {
      ...commonOpts,
      x: 1, y: 1.5, w: 8, h: 4,
      radarStyle: 'standard',
    });
  } else if (chart.type === 'line') {
    slide.addChart('line', chart.series, {
      ...commonOpts,
      lineSize: 3,
      lineSmooth: true,
    });
  } else {
    // bar
    slide.addChart('bar', chart.series, {
      ...commonOpts,
      barDir: 'bar',
    });
  }
}

function makeBulletRows(bullets: string[], theme: MergedTheme) {
  return bullets.map(b => ({
    text: b.replace(/\*\*/g, ''),
    options: {
      ...theme.bulletFont,
      bullet: { type: 'bullet' as const },
      bold: b.startsWith('**'),
      spacing: { before: 8 },
    },
  }));
}

function renderTwoColumnSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  const bullets = slideData.bullets;
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);
  slide.addText(makeBulletRows(left, theme), {
    x: 0.5, y: 1.5, w: 4.4, h: 3.8, valign: 'top',
  });
  slide.addShape('line' as any, {
    x: 5.0, y: 1.5, w: 0, h: 3.8,
    line: { color: 'CCCCCC', width: 1 },
  });
  slide.addText(makeBulletRows(right, theme), {
    x: 5.2, y: 1.5, w: 4.4, h: 3.8, valign: 'top',
  });
}

function renderComparisonSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  const bullets = slideData.bullets;
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);
  // A 헤더 (파랑)
  slide.addShape('rect' as any, {
    x: 0.5, y: 1.5, w: 4.4, h: 0.6,
    fill: { color: theme.accent },
  });
  slide.addText('A', {
    x: 0.5, y: 1.55, w: 4.4, h: 0.5,
    fontFace: theme.titleFont.fontFace, fontSize: 16, color: 'FFFFFF', bold: true, align: 'center',
  });
  // A 본문
  slide.addShape('rect' as any, {
    x: 0.5, y: 2.1, w: 4.4, h: 3.2,
    fill: { color: 'F8FAFD' },
  });
  slide.addText(makeBulletRows(left, theme), {
    x: 0.7, y: 2.2, w: 4.0, h: 3.0, valign: 'top',
  });
  // B 헤더 (빨강)
  slide.addShape('rect' as any, {
    x: 5.1, y: 1.5, w: 4.4, h: 0.6,
    fill: { color: 'E74C3C' },
  });
  slide.addText('B', {
    x: 5.1, y: 1.55, w: 4.4, h: 0.5,
    fontFace: theme.titleFont.fontFace, fontSize: 16, color: 'FFFFFF', bold: true, align: 'center',
  });
  slide.addShape('rect' as any, {
    x: 5.1, y: 2.1, w: 4.4, h: 3.2,
    fill: { color: 'FDF8F8' },
  });
  slide.addText(makeBulletRows(right, theme), {
    x: 5.3, y: 2.2, w: 4.0, h: 3.0, valign: 'top',
  });
}

function renderStatisticsSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  const first = (slideData.bullets[0] ?? '').replace(/\*\*/g, '');
  const rest = slideData.bullets.slice(1);
  slide.addText(first, {
    x: 2, y: 1.8, w: 6, h: 2,
    fontFace: theme.titleFont.fontFace, fontSize: 72, color: theme.accent, bold: true, align: 'center', valign: 'middle',
  });
  if (rest.length > 0) {
    slide.addText(rest.join(' · ').replace(/\*\*/g, ''), {
      x: 1, y: 4.0, w: 8, h: 1.0,
      fontFace: theme.bodyFont.fontFace, fontSize: 16, color: theme.bodyFont.color, align: 'center',
    });
  }
}

function renderQuoteSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  // 인용문: " 로 감싼 것 또는 첫 줄
  let quote = '';
  let source = '';
  for (const b of slideData.bullets) {
    const cleaned = b.replace(/\*\*/g, '').trim();
    if (/^[—\-]{1,2}\s/.test(cleaned)) {
      source = cleaned.replace(/^[—\-]{1,2}\s/, '');
    } else if (!quote) {
      quote = cleaned.replace(/^["']|["']$/g, '');
    }
  }
  slide.addShape('rect' as any, {
    x: 0.8, y: 1.8, w: 0.1, h: 2.5,
    fill: { color: theme.accent },
  });
  slide.addText(`"${quote}"`, {
    x: 1.2, y: 1.8, w: 8, h: 2.5,
    fontFace: theme.bodyFont.fontFace, fontSize: 20, color: theme.bodyFont.color, italic: true, valign: 'middle',
  });
  if (source) {
    slide.addText(`— ${source}`, {
      x: 1.2, y: 4.5, w: 8, h: 0.5,
      fontFace: theme.bodyFont.fontFace, fontSize: 14, color: theme.bodyFont.color, align: 'right',
    });
  }
}

function renderProcessSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  renderTitleBar(slide, slideData.title, theme);
  const steps = slideData.bullets.slice(0, 5).map(b => b.replace(/\*\*/g, ''));
  const count = steps.length;
  if (count === 0) return;
  const gap = 9.0 / count;
  const boxW = Math.min(gap * 0.7, 1.5);
  const boxY = 2.4;
  steps.forEach((step, i) => {
    const cx = 0.5 + gap * (i + 0.5);
    const bx = cx - boxW / 2;
    slide.addShape('ellipse' as any, {
      x: bx, y: boxY, w: boxW, h: boxW,
      fill: { color: theme.accent },
    });
    slide.addText(String(i + 1), {
      x: bx, y: boxY, w: boxW, h: boxW,
      fontFace: theme.titleFont.fontFace, fontSize: 28, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle',
    });
    slide.addText(step, {
      x: cx - gap / 2, y: boxY + boxW + 0.1, w: gap, h: 0.6,
      fontFace: theme.bodyFont.fontFace, fontSize: 12, color: theme.bodyFont.color, align: 'center',
    });
    if (i < count - 1) {
      slide.addShape('rightTriangle' as any, {
        x: bx + boxW + 0.05, y: boxY + boxW / 2 - 0.1, w: 0.25, h: 0.2,
        fill: { color: 'CCCCCC' }, rotate: 0,
      });
    }
  });
}

function renderSectionHeaderSlide(slide: any, slideData: SlideData, theme: MergedTheme) {
  slide.background = { color: theme.titleBg };
  slide.addText(slideData.title, {
    x: 0.5, y: 2.0, w: 9, h: 1.0,
    fontFace: theme.titleFont.fontFace, fontSize: 44, color: 'FFFFFF', bold: true, align: 'center',
  });
  const subtitle = (slideData.bullets[0] ?? '').replace(/\*\*/g, '');
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 3.2, w: 9, h: 0.6,
      fontFace: theme.bodyFont.fontFace, fontSize: 16, color: 'CCCCCC', align: 'center',
    });
  }
}

export function registerExportPptxTool(server: McpServer) {
  server.tool(
    'export_pptx',
    'Markdown 텍스트를 PPTX(파워포인트) 파일로 변환합니다. 교육용 슬라이드에 최적화되어 있으며, pptx-styles / pptxgen-patterns / slide-layouts 리소스를 참조하여 다양한 디자인·차트·레이아웃을 적용할 수 있습니다.',
    {
      markdown: z.string().describe('변환할 Markdown 텍스트 (H1/H2가 슬라이드 구분). <!-- chart:bar/line/pie/radar --> 주석으로 차트 지정, <!-- layout:two-column/comparison/statistics/quote/process/section-header --> 주석으로 레이아웃 지정 가능.'),
      filename: z.string().optional().describe('저장할 파일명 (확장자 없이, 기본: presentation)'),
      output_dir: z.string().optional().describe('저장 디렉토리 (기본: ./output/)'),
      title: z.string().optional().describe('표지 슬라이드 제목'),
      subtitle: z.string().optional().describe('표지 슬라이드 부제목'),
      style_name: z.string().optional().describe('적용할 디자인 스타일명 (예: Dark Academia, Swiss International). pptx-styles 리소스를 참조하세요.'),
      theme: z.object({
        titleBg: z.string().optional().describe('제목 바 배경색 HEX (예: 2C3E50)'),
        contentBg: z.string().optional().describe('슬라이드 배경색 HEX (예: FFFFFF)'),
        accent: z.string().optional().describe('강조색 HEX (예: 3498DB)'),
        titleFontFace: z.string().optional().describe('제목 폰트 (예: Malgun Gothic)'),
        titleFontSize: z.number().optional().describe('제목 폰트 크기'),
        titleColor: z.string().optional().describe('제목 색상 HEX'),
        bodyFontFace: z.string().optional().describe('본문 폰트'),
        bodyFontSize: z.number().optional().describe('본문 폰트 크기'),
        bodyColor: z.string().optional().describe('본문 색상 HEX'),
        fontPreset: z.enum(['default', 'pretendard', 'mixed', 'serif']).optional().describe('폰트 프리셋. default=Malgun Gothic, pretendard=Pretendard(설치 필요), mixed=KoPubWorldDotum+Malgun, serif=Nanum Myeongjo+Malgun. titleFontFace/bodyFontFace 미지정 시에만 적용.'),
        useMaster: z.boolean().optional().describe('true이면 마스터 슬라이드 + 페이지 번호 사용. 기본 false.'),
      }).optional().describe('커스텀 테마 설정. pptx-styles 리소스에서 스타일 스펙을 참조하여 값을 설정하세요.'),
    },
    async ({ markdown, filename, output_dir, title, subtitle, style_name, theme }) => {
      let dir = output_dir ?? getDefaultOutputDir();
      if (dir.startsWith('/mnt/') || dir.startsWith('/tmp/') || dir.startsWith('/home/')) {
        dir = getDefaultOutputDir();
      }
      const name = filename ?? 'presentation';
      const outputPath = path.join(dir, `${name}.pptx`);

      // 폰트 프리셋 해석 (개별 폰트 필드 미지정 시에만)
      const preset: FontPresetKey | undefined = theme?.fontPreset;
      const presetFonts = preset ? FONT_PRESETS[preset] : null;
      const resolvedTitleFontFace = theme?.titleFontFace
        ?? presetFonts?.title
        ?? THEME.titleFont.fontFace;
      const resolvedBodyFontFace = theme?.bodyFontFace
        ?? presetFonts?.body
        ?? THEME.bodyFont.fontFace;

      const mergedTheme: MergedTheme = {
        titleBg: theme?.titleBg ?? THEME.titleBg,
        contentBg: theme?.contentBg ?? THEME.contentBg,
        accent: theme?.accent ?? THEME.accent,
        titleFont: {
          fontFace: resolvedTitleFontFace,
          fontSize: theme?.titleFontSize ?? THEME.titleFont.fontSize,
          color: theme?.titleColor ?? THEME.titleFont.color,
          bold: true as const,
        },
        bodyFont: {
          fontFace: resolvedBodyFontFace,
          fontSize: theme?.bodyFontSize ?? THEME.bodyFont.fontSize,
          color: theme?.bodyColor ?? THEME.bodyFont.color,
        },
        bulletFont: {
          fontFace: resolvedBodyFontFace,
          fontSize: theme?.bodyFontSize ? theme.bodyFontSize - 1 : THEME.bulletFont.fontSize,
          color: theme?.bodyColor ?? THEME.bulletFont.color,
        },
      };

      const useMaster = theme?.useMaster === true;

      try {
        await mkdir(dir, { recursive: true });

        const pptx = new (PptxGenJS as any)();
        pptx.layout = 'LAYOUT_16x9';

        // 마스터 슬라이드 정의 (useMaster=true일 때만)
        // 타이틀 바는 각 슬라이드에서 별도 렌더링하므로 마스터는 배경 + 페이지 번호만.
        if (useMaster) {
          pptx.defineSlideMaster({
            title: 'JIHAKSA_CONTENT',
            background: { fill: mergedTheme.contentBg },
            objects: [],
            slideNumber: {
              x: 9.2, y: 5.3, w: 0.6, h: 0.3,
              fontFace: mergedTheme.bodyFont.fontFace,
              fontSize: 9,
              color: '999999',
              align: 'right',
            },
          });
        }

        // Title slide
        if (title) {
          const titleSlide = pptx.addSlide();
          titleSlide.background = { color: mergedTheme.titleBg };
          titleSlide.addText(title, {
            x: 0.5, y: 1.5, w: 9, h: 1.5,
            ...mergedTheme.titleFont, fontSize: 36, align: 'center',
          });
          if (subtitle) {
            titleSlide.addText(subtitle, {
              x: 0.5, y: 3.2, w: 9, h: 1,
              ...mergedTheme.bodyFont, fontSize: 18, color: 'CCCCCC', align: 'center',
            });
          }
        }

        // Content slides
        const slides = parseMarkdownToSlides(markdown);

        for (const slideData of slides) {
          const slide = useMaster ? pptx.addSlide({ masterName: 'JIHAKSA_CONTENT' }) : pptx.addSlide();
          if (!useMaster) {
            slide.background = { color: mergedTheme.contentBg };
          }

          // 분기 1: 차트가 있으면 차트 렌더링 (최우선)
          if (slideData.chart) {
            renderChartSlide(slide, slideData, mergedTheme);
            continue;
          }

          // 분기 2: 표가 있으면 기존 표 렌더링 (원본 유지)
          if (slideData.table && slideData.table.length > 0) {
            renderTitleBar(slide, slideData.title, mergedTheme);
            const tableRows: any[] = slideData.table.map((row, rowIdx) =>
              row.map(cell => ({
                text: cell,
                options: {
                  fontFace: mergedTheme.bodyFont.fontFace,
                  fontSize: 11,
                  color: rowIdx === 0 ? mergedTheme.titleFont.color : mergedTheme.bodyFont.color,
                  fill: { color: rowIdx === 0 ? mergedTheme.titleBg : (rowIdx % 2 === 0 ? 'F5F5F5' : 'FFFFFF') },
                  border: { type: 'solid' as const, pt: 0.5, color: 'CCCCCC' },
                  valign: 'middle' as const,
                },
              }))
            );
            slide.addTable(tableRows, {
              x: 0.5, y: 1.5, w: 9,
              colW: Array(slideData.table[0].length).fill(9 / slideData.table[0].length),
            });
            continue;
          }

          // 분기 3: 레이아웃 힌트가 있으면 해당 렌더러
          if (slideData.layout && slideData.layout !== 'title-content') {
            switch (slideData.layout) {
              case 'two-column':
                renderTwoColumnSlide(slide, slideData, mergedTheme);
                continue;
              case 'comparison':
                renderComparisonSlide(slide, slideData, mergedTheme);
                continue;
              case 'statistics':
                renderStatisticsSlide(slide, slideData, mergedTheme);
                continue;
              case 'quote':
                renderQuoteSlide(slide, slideData, mergedTheme);
                continue;
              case 'process':
                renderProcessSlide(slide, slideData, mergedTheme);
                continue;
              case 'section-header':
                renderSectionHeaderSlide(slide, slideData, mergedTheme);
                continue;
            }
          }

          // 분기 4 (기본): title-content — 기존 원본 로직 그대로
          renderTitleBar(slide, slideData.title, mergedTheme);
          if (slideData.bullets.length > 0) {
            const textRows = slideData.bullets.map(b => ({
              text: b.replace(/\*\*/g, ''),
              options: {
                ...mergedTheme.bulletFont,
                bullet: { type: 'bullet' as const },
                bold: b.startsWith('**'),
                spacing: { before: 8 },
              },
            }));
            slide.addText(textRows, {
              x: 0.5, y: 1.5, w: 9, h: 4,
              valign: 'top',
            });
          }
        }

        const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        await writeFile(outputPath, buffer);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              path: outputPath,
              slides_count: slides.length + (title ? 1 : 0),
              size_kb: Math.round(buffer.length / 1024),
              style: style_name ?? 'default',
              font_preset: preset ?? 'default',
              master_slide: useMaster,
              message: `PPTX 파일이 생성되었습니다: ${outputPath}`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `PPTX 변환 실패: ${err instanceof Error ? err.message : String(err)}`,
          }],
        };
      }
    },
  );
}
