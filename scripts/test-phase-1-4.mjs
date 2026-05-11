// Test harness for Phase 1-4 features.
// Captures MCP tool handlers via mock server, then invokes them directly.
import { registerExportPptxTool } from '../dist/tools/export-pptx.js';
import { registerExportHwpxTool } from '../dist/tools/export-hwpx.js';
import AdmZip from 'adm-zip';
import path from 'node:path';
import fs from 'node:fs/promises';

const handlers = new Map();
const mockServer = {
  tool(name, _desc, _schema, handler) {
    handlers.set(name, handler);
  },
};
registerExportPptxTool(mockServer);
registerExportHwpxTool(mockServer);

const pptx = handlers.get('export_pptx');
const hwpx = handlers.get('export_hwpx');

const outDir = path.resolve('test-output');
await fs.mkdir(outDir, { recursive: true });

function parseJson(res) {
  const t = res?.content?.[0]?.text ?? '';
  try { return JSON.parse(t); } catch { return { raw: t }; }
}

async function readPptxSlideXml(file) {
  const zip = new AdmZip(file);
  const slideEntries = zip.getEntries().filter(e => /ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
  slideEntries.sort((a, b) => a.entryName.localeCompare(b.entryName));
  return slideEntries.map(e => ({ name: e.entryName, xml: zip.readAsText(e.entryName) }));
}

const results = [];
function log(test, status, detail) {
  results.push({ test, status, detail });
  console.log(`[${status}] ${test}${detail ? ': ' + detail : ''}`);
}

// ---------- Test 1: baseline PPTX ----------
try {
  const md1 = `# 단원 1. 소설의 이해
- 서사 문학의 특성 이해
- 인물·사건·배경 분석
- 주제 파악

# 학습 활동
| 단계 | 활동 | 시간 |
|------|------|------|
| 도입 | 작품 소개 | 5분 |
| 전개 | 인물 분석 | 25분 |
| 정리 | 주제 토의 | 10분 |`;
  const r = await pptx({ markdown: md1, filename: 't1-baseline', output_dir: outDir });
  const j = parseJson(r);
  if (!j.success) throw new Error(j.raw ?? 'no success');
  const slides = await readPptxSlideXml(j.path);
  const s1 = slides[0].xml;
  const s2 = slides[1].xml;
  const hasTitleBarColor = s1.includes('2C3E50');
  const hasBullets = (s1.match(/서사 문학|인물·사건|주제 파악/g) ?? []).length >= 3;
  const hasTable = /<a:tbl>|<a:tblPr/.test(s2);
  const hasMalgun = s1.includes('Malgun Gothic');
  const headerInTable = s2.includes('2C3E50'); // header row fill
  if (!hasTitleBarColor || !hasBullets || !hasTable || !hasMalgun || !headerInTable) {
    throw new Error(`titleBar=${hasTitleBarColor} bullets=${hasBullets} table=${hasTable} malgun=${hasMalgun} headerFill=${headerInTable}`);
  }
  log('Test 1: baseline regression', 'PASS', `${slides.length} slides, size=${j.size_kb}KB`);
} catch (e) {
  log('Test 1: baseline regression', 'FAIL', e.message);
}

// ---------- Test 2: chart hints ----------
try {
  const md2 = `# 반별 성취도 분석
<!-- chart:bar -->
| 영역 | 1반 | 2반 | 3반 |
|------|-----|-----|-----|
| 읽기 | 85 | 78 | 92 |
| 쓰기 | 72 | 81 | 88 |
| 말하기 | 90 | 85 | 76 |

# 교과 구성 비율
<!-- chart:pie -->
| 영역 | 비율 |
|------|------|
| 문학 | 35 |
| 독서 | 25 |
| 작문 | 20 |
| 문법 | 20 |

# 학기별 평균 추이
<!-- chart:line -->
| 월 | 점수 |
|---|---|
| 3월 | 72 |
| 4월 | 75 |
| 5월 | 78 |
| 6월 | 82 |`;
  const r = await pptx({ markdown: md2, filename: 't2-charts', output_dir: outDir });
  const j = parseJson(r);
  if (!j.success) throw new Error(j.raw ?? 'no success');
  const slides = await readPptxSlideXml(j.path);
  // Charts reference via relationship id — pptxgenjs embeds <p:graphicFrame> with chart rels.
  // Look for chart graphicFrame presence.
  const hasChart1 = /graphicFrame[\s\S]*chart/.test(slides[0].xml);
  const hasChart2 = /graphicFrame[\s\S]*chart/.test(slides[1].xml);
  const hasChart3 = /graphicFrame[\s\S]*chart/.test(slides[2].xml);
  // And tables should NOT be present on chart slides
  const tbl1 = /<a:tbl>/.test(slides[0].xml);
  if (!hasChart1 || !hasChart2 || !hasChart3 || tbl1) {
    throw new Error(`chart1=${hasChart1} chart2=${hasChart2} chart3=${hasChart3} tableOnChartSlide=${tbl1}`);
  }
  log('Test 2: chart hints (bar/pie/line)', 'PASS', `3 charts rendered`);
} catch (e) {
  log('Test 2: chart hints (bar/pie/line)', 'FAIL', e.message);
}

// ---------- Test 3: layout hints ----------
try {
  const md3 = `# 학습 목표 비교
<!-- layout:two-column -->
- 지식·이해
- 분석·해석
- 적용·평가
- 창의·표현
- 소통·협력
- 자기 성찰

# 전통 문학 vs 현대 문학
<!-- layout:comparison -->
- 주제의 보편성
- 운율·형식 중심
- 공동체적 가치
- 개인의 내면 탐구
- 다양한 실험 형식
- 현실 비판 의식

# 학생 참여율
<!-- layout:statistics -->
- 92%
- 전체 학생 중 프로젝트 발표에 참여한 비율

# 작가의 말
<!-- layout:quote -->
- "문학은 삶을 이해하는 가장 느린 길이다"
- — 김영하

# 탐구 학습 단계
<!-- layout:process -->
1. 질문 생성
2. 자료 수집
3. 분석 탐구
4. 결과 발표

# 제2부. 현대 문학
<!-- layout:section-header -->
- 1920년대부터 현재까지의 주요 작품`;
  const r = await pptx({ markdown: md3, filename: 't3-layouts', output_dir: outDir });
  const j = parseJson(r);
  if (!j.success) throw new Error(j.raw ?? 'no success');
  const slides = await readPptxSlideXml(j.path);
  if (slides.length !== 6) throw new Error(`expected 6 slides, got ${slides.length}`);
  // two-column: two text frames; comparison: 'A' and 'B' markers; stats: large fontsize 72;
  // quote: italic; process: ellipse; section-header: background color.
  const [two, cmp, stat, quote, proc, sec] = slides.map(s => s.xml);
  const checks = {
    twoColumn_hasDivider: /E74C3C|CCCCCC/.test(two), // divider line color
    comparison_hasAB: cmp.includes('>A<') && cmp.includes('>B<'),
    statistics_hasBigFont: /sz="7200"/.test(stat), // 72pt = 7200 in XML
    quote_isItalic: /i="1"/.test(quote),
    process_hasEllipse: /prstGeom prst="ellipse"/.test(proc),
    sectionHeader_hasDarkBg: /2C3E50/.test(sec),
  };
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (failed.length) throw new Error(`missed: ${failed.join(', ')}`);
  log('Test 3: layout hints (6 layouts)', 'PASS', 'all structural markers present');
} catch (e) {
  log('Test 3: layout hints (6 layouts)', 'FAIL', e.message);
}

// ---------- Test 4: font presets ----------
try {
  const md4 = `# 폰트 테스트
- 샘플 불릿`;
  const cases = [
    { preset: 'default',    expectTitle: 'Malgun Gothic',    expectBody: 'Malgun Gothic' },
    { preset: 'pretendard', expectTitle: 'Pretendard',       expectBody: 'Pretendard' },
    { preset: 'mixed',      expectTitle: 'KoPubWorldDotum',  expectBody: 'Malgun Gothic' },
    { preset: 'serif',      expectTitle: 'Nanum Myeongjo',   expectBody: 'Malgun Gothic' },
  ];
  const detail = [];
  for (const c of cases) {
    const r = await pptx({ markdown: md4, filename: `t4-${c.preset}`, output_dir: outDir, theme: { fontPreset: c.preset } });
    const j = parseJson(r);
    if (!j.success) throw new Error(`${c.preset} build failed: ${j.raw}`);
    const slides = await readPptxSlideXml(j.path);
    const xml = slides[0].xml;
    const titleOk = xml.includes(c.expectTitle);
    const bodyOk = xml.includes(c.expectBody);
    detail.push(`${c.preset}:T=${titleOk}/B=${bodyOk}`);
    if (!titleOk || !bodyOk) throw new Error(`${c.preset} fonts missing in slide XML`);
  }
  // Override precedence: titleFontFace > fontPreset
  const rOv = await pptx({ markdown: md4, filename: 't4-override', output_dir: outDir, theme: { fontPreset: 'serif', titleFontFace: 'Arial' } });
  const jOv = parseJson(rOv);
  if (!jOv.success) throw new Error('override build failed');
  const ovXml = (await readPptxSlideXml(jOv.path))[0].xml;
  const overrideOk = ovXml.includes('Arial') && !ovXml.match(/typeface="Nanum Myeongjo"[^/]*bold/);
  if (!ovXml.includes('Arial')) throw new Error('titleFontFace override did not apply');
  log('Test 4: font presets + override', 'PASS', detail.join(', '));
} catch (e) {
  log('Test 4: font presets + override', 'FAIL', e.message);
}

// ---------- Test 5: master slide + page numbers ----------
try {
  const md5 = `# 슬라이드 A
- 내용1

# 슬라이드 B
- 내용2

# 슬라이드 C
- 내용3`;
  // Without master
  const r1 = await pptx({ markdown: md5, filename: 't5-nomaster', output_dir: outDir });
  const j1 = parseJson(r1);
  if (j1.master_slide !== false) throw new Error(`expected master_slide=false, got ${j1.master_slide}`);
  // With master
  const r2 = await pptx({ markdown: md5, filename: 't5-master', output_dir: outDir, theme: { useMaster: true } });
  const j2 = parseJson(r2);
  if (j2.master_slide !== true) throw new Error(`expected master_slide=true, got ${j2.master_slide}`);
  // Inspect the ZIP — look for slide master + slide numbers (<p:sldNum> or fld with type="slidenum")
  const zip = new AdmZip(j2.path);
  const entries = zip.getEntries().map(e => e.entryName);
  const hasMaster = entries.some(n => /ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n));
  const hasLayout = entries.some(n => /ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n));
  // pptxgenjs emits slide number field as <a:fld type="slidenum"> inside text
  let hasSlideNumField = false;
  for (const e of entries) {
    if (/ppt\/(slides|slideMasters|slideLayouts)\/.*\.xml$/.test(e)) {
      const txt = zip.readAsText(e);
      if (/type="slidenum"|<a:fld[^>]*slidenum/i.test(txt)) { hasSlideNumField = true; break; }
    }
  }
  if (!hasMaster || !hasLayout) throw new Error(`master=${hasMaster} layout=${hasLayout}`);
  if (!hasSlideNumField) throw new Error('slide number field not found in master/slides');
  log('Test 5: useMaster + page numbers', 'PASS', `master=${hasMaster} slideNumField=${hasSlideNumField}`);
} catch (e) {
  log('Test 5: useMaster + page numbers', 'FAIL', e.message);
}

// ---------- Test 6: HWPX markdown + validation ----------
try {
  const md6 = `# 한글 테스트

이 문서는 전각 파이프(｜)를 포함합니다.



(빈 줄 3개가 있었습니다)
다음은 표입니다.
| 항목 | 설명 |
|------|------|
| 가 | 내용 A |
| 나 | 내용 B |
`;
  const r = await hwpx({ markdown: md6, filename: 't6-hwpx', output_dir: outDir });
  const j = parseJson(r);
  if (!j.success) throw new Error(j.raw ?? 'no success');
  if (j.mode !== 'markdown') throw new Error(`expected mode=markdown, got ${j.mode}`);
  const v = j.validation;
  if (!v || typeof v.valid !== 'boolean') throw new Error('validation field missing');
  // valid should be true (no fatal errors); warnings count is informational
  const okFile = await fs.stat(j.path).then(s => s.size > 500).catch(() => false);
  if (!okFile) throw new Error('output file too small or missing');
  log('Test 6: HWPX preprocess + validation', 'PASS', `valid=${v.valid}, warnings=${v.warning_count}, errors=${v.error_count}`);
} catch (e) {
  log('Test 6: HWPX preprocess + validation', 'FAIL', e.message);
}

// ---------- Test 7: resource definitions exist ----------
try {
  const paths = [
    'dist/resources/owpml-conventions.md',
    'dist/resources/pptxgen-patterns.md',
    'dist/resources/slide-layouts.md',
  ];
  for (const p of paths) {
    const st = await fs.stat(p);
    if (st.size < 100) throw new Error(`${p} too small: ${st.size}`);
  }
  // And server.ts must register them — quick static check on dist/server.js
  const srv = await fs.readFile('dist/server.js', 'utf8');
  const uris = ['resource://teacher/owpml-conventions', 'resource://teacher/pptxgen-patterns', 'resource://teacher/slide-layouts'];
  for (const u of uris) {
    if (!srv.includes(u)) throw new Error(`server.js does not register ${u}`);
  }
  log('Test 7: new resources registered', 'PASS', '3 resources present in dist/');
} catch (e) {
  log('Test 7: new resources registered', 'FAIL', e.message);
}

console.log('\n========== Summary ==========');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`PASS: ${passed}/${results.length}   FAIL: ${failed}`);
for (const r of results) console.log(`  [${r.status}] ${r.test}`);
process.exit(failed === 0 ? 0 : 1);
