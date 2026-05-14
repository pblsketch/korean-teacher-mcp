/**
 * MCP 도구 통합 테스트 — 3가지 시나리오
 * 1. 가정통신문 (parent-newsletter 템플릿)
 * 2. 업무 체크리스트 (checklist 템플릿)
 * 3. 자리배치도 (worksheet 템플릿)
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import AdmZip from 'adm-zip';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const BUILD_SCRIPT = path.join(PROJECT_ROOT, 'hwpxskill-scripts', 'build_hwpx.py');
const OUTPUT_DIR = path.join(os.homedir(), 'Downloads');

// ── Markdown → OWPML 변환기 (export-hwpx.ts에서 가져옴) ──
let mdTableIdSeed = 900000;
function nextMdTableId() { return ++mdTableIdSeed; }
function escapeXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function isSeparatorLine(line) {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return false;
  return t.slice(1,-1).split('|').every(seg => /^\s*:?\s*-+\s*:?\s*$/.test(seg));
}
function isPipeRow(line) {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.length > 2;
}
function splitPipeRow(line) { return line.trim().slice(1,-1).split('|').map(c=>c.trim()); }

function tryParseMdTable(lines, start) {
  if (!isPipeRow(lines[start])) return null;
  if (start+1>=lines.length || !isSeparatorLine(lines[start+1])) return null;
  const headers = splitPipeRow(lines[start]);
  const sep = splitPipeRow(lines[start+1]);
  if (headers.length !== sep.length) return null;
  const rows = [];
  let i = start+2;
  while (i<lines.length && isPipeRow(lines[i]) && !isSeparatorLine(lines[i])) {
    const cells = splitPipeRow(lines[i]);
    while (cells.length < headers.length) cells.push('');
    if (cells.length > headers.length) cells.length = headers.length;
    rows.push(cells);
    i++;
  }
  return { table:{headers,rows}, endIdx: i-1 };
}

function buildOwpmlTable(tbl) {
  const colCnt = Math.max(1, tbl.headers.length);
  const rowCnt = 1 + tbl.rows.length;
  const totalWidth = 42520;
  const colWidth = Math.floor(totalWidth / colCnt);
  const lastColWidth = totalWidth - colWidth*(colCnt-1);
  const rowHeight = 2400;
  const totalHeight = rowCnt * rowHeight;
  const tableId = nextMdTableId();
  const wrapperId = nextMdTableId();

  const buildCell = (text,colIdx,rowIdx,isHeader) => {
    const w = colIdx===colCnt-1 ? lastColWidth : colWidth;
    const tw = w-510-510;
    const border = isHeader ? '4' : '3';
    const charPr = isHeader ? '9' : '0';
    const pId = nextMdTableId();
    return `<hp:tc borderFillIDRef="${border}"><hp:cellAddr colAddr="${colIdx}" rowAddr="${rowIdx}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${w}" height="${rowHeight}"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="${tw}" fieldName=""><hp:p id="${pId}" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPr}"><hp:t>${escapeXml(text)}</hp:t></hp:run></hp:p></hp:subList></hp:tc>`;
  };

  const headerTr = `<hp:tr>${tbl.headers.map((h,i)=>buildCell(h,i,0,true)).join('')}</hp:tr>`;
  const dataTrs = tbl.rows.map((row,ri)=>`<hp:tr>${row.map((c,ci)=>buildCell(c,ci,ri+1,false)).join('')}</hp:tr>`).join('');

  return `<hp:p id="${wrapperId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:tbl id="${tableId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" cellSpacing="0" borderFillIDRef="3" noAdjust="0" rowCnt="${rowCnt}" colCnt="${colCnt}"><hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${totalHeight}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>${headerTr}${dataTrs}</hp:tbl></hp:run></hp:p>`;
}

function expandMdTables(xml) {
  const lines = xml.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i<lines.length) {
    const parsed = tryParseMdTable(lines,i);
    if (parsed) { out.push(buildOwpmlTable(parsed.table)); i = parsed.endIdx+1; }
    else { out.push(lines[i]); i++; }
  }
  return out.join('\n');
}

async function buildHwpx(template, sectionXml, filename) {
  const outputPath = path.join(OUTPUT_DIR, `${filename}.hwpx`);
  const expanded = expandMdTables(sectionXml);
  const tempPath = path.join(os.tmpdir(), `section-${randomUUID()}.xml`);
  await writeFile(tempPath, expanded, 'utf-8');

  try {
    const { stdout, stderr } = await execFileAsync('python3', [
      BUILD_SCRIPT, '--template', template, '--output', outputPath, '--section', tempPath
    ], { cwd: PROJECT_ROOT, timeout: 30000 });
    console.log(`✅ ${filename}.hwpx — ${stdout.trim()}`);
    if (stderr) console.log(`   ⚠ ${stderr.trim()}`);
  } catch (err) {
    console.error(`❌ ${filename}.hwpx 실패: ${err.message}`);
  } finally {
    await unlink(tempPath).catch(()=>{});
  }
  return outputPath;
}

// ═══════════════════════════════════════════════════
// 시나리오 1: 가정통신문 — 현장체험학습 안내
// ═══════════════════════════════════════════════════
const scenario1_xml = `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2016/HwpMasterPage"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2016/HwpDoc">

<hp:p id="1" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="7"><hp:t>현장체험학습 안내</hp:t></hp:run>
</hp:p>

<hp:p id="2" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="3" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>학부모님께</hp:t></hp:run>
</hp:p>

<hp:p id="4" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>안녕하십니까? 가정에 건강과 행복이 가득하시길 바랍니다.</hp:t></hp:run>
</hp:p>

<hp:p id="5" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>우리 학교에서는 아래와 같이 현장체험학습을 실시하오니, 안내문을 확인하시고 참가 동의서를 제출해 주시기 바랍니다.</hp:t></hp:run>
</hp:p>

<hp:p id="6" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="7" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="8"><hp:t>1. 체험학습 개요</hp:t></hp:run>
</hp:p>

| 항목 | 내용 |
| --- | --- |
| 일시 | 2026년 5월 22일(금) 09:00~16:00 |
| 장소 | 국립중앙박물관 |
| 대상 | 6학년 전체 (120명) |
| 집합 | 학교 운동장 08:30 |
| 교통편 | 전세 버스 3대 |
| 경비 | 1인당 15,000원 (입장료+점심+보험) |

<hp:p id="8" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="9" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="8"><hp:t>2. 준비물</hp:t></hp:run>
</hp:p>

<hp:p id="10" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 편한 복장 및 운동화</hp:t></hp:run>
</hp:p>
<hp:p id="11" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 필기도구, 활동지</hp:t></hp:run>
</hp:p>
<hp:p id="12" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 물, 간식 (개인 지참)</hp:t></hp:run>
</hp:p>
<hp:p id="13" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 우천 시 우의 또는 우산</hp:t></hp:run>
</hp:p>

<hp:p id="14" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="15" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="8"><hp:t>3. 유의사항</hp:t></hp:run>
</hp:p>

<hp:p id="16" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 참가 동의서는 5월 19일(화)까지 담임선생님께 제출</hp:t></hp:run>
</hp:p>
<hp:p id="17" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 경비는 5월 20일(수)까지 입금 (학교 계좌 별도 안내)</hp:t></hp:run>
</hp:p>
<hp:p id="18" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>- 미참가 학생은 학교에서 자습</hp:t></hp:run>
</hp:p>

<hp:p id="19" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="20" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>2026년 5월 14일</hp:t></hp:run>
</hp:p>
<hp:p id="21" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="9"><hp:t>한빛초등학교장</hp:t></hp:run>
</hp:p>

</hs:sec>`;

// ═══════════════════════════════════════════════════
// 시나리오 2: 업무 체크리스트 — 학기초 업무
// ═══════════════════════════════════════════════════
const scenario2_xml = `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2016/HwpMasterPage"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2016/HwpDoc">

<hp:p id="1" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="7"><hp:t>2026학년도 1학기 학기초 업무 체크리스트</hp:t></hp:run>
</hp:p>

<hp:p id="2" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>담당: 6학년 부장 / 기한: 2026. 3. 2.~3. 13.</hp:t></hp:run>
</hp:p>

<hp:p id="3" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

| 순번 | 업무 항목 | 기한 | 담당 | 완료 |
| --- | --- | --- | --- | --- |
| 1 | 학급 편성 명렬표 작성 | 3/2 | 담임 | ☐ |
| 2 | 교실 환경 정비 | 3/2 | 담임 | ☐ |
| 3 | 교과서 수령 및 배부 | 3/3 | 담임 | ☐ |
| 4 | 학생 기초조사서 배부 | 3/3 | 담임 | ☐ |
| 5 | 가정환경 조사서 회수 | 3/7 | 담임 | ☐ |
| 6 | 학급 규칙 제정 | 3/5 | 담임 | ☐ |
| 7 | 1인 1역 배정 | 3/5 | 담임 | ☐ |
| 8 | 학부모 상담 주간 안내문 발송 | 3/7 | 학년부장 | ☐ |
| 9 | 방과후학교 수강 신청 안내 | 3/7 | 방과후 담당 | ☐ |
| 10 | 급식 알레르기 조사 | 3/10 | 보건 | ☐ |
| 11 | 교육과정 진도표 작성 | 3/10 | 담임 | ☐ |
| 12 | 학급경영안 제출 | 3/13 | 담임 | ☐ |

<hp:p id="4" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="5" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="9"><hp:t>※ 완료 시 ☑ 표시 후 학년부장에게 보고</hp:t></hp:run>
</hp:p>

</hs:sec>`;

// ═══════════════════════════════════════════════════
// 시나리오 3: 자리배치도 — 6학년 3반 (줄형)
// ═══════════════════════════════════════════════════
const scenario3_xml = `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2016/HwpMasterPage"
        xmlns:hp="http://www.hancom.co.kr/hwpml/2016/HwpDoc">

<hp:p id="1" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="7"><hp:t>6학년 3반 자리배치도</hp:t></hp:run>
</hp:p>

<hp:p id="2" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>2026년 5월 배치 (5열 × 5행 = 25명)</hp:t></hp:run>
</hp:p>

<hp:p id="3" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="4" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="8"><hp:t>[ 칠 판 ]</hp:t></hp:run>
</hp:p>

<hp:p id="5" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

| 1열 | 2열 | 3열 | 4열 | 5열 |
| --- | --- | --- | --- | --- |
| 1.김민준 | 2.이서연 | 3.박지호 | 4.최수빈 | 5.정하은 |
| 6.강도윤 | 7.조예린 | 8.윤시우 | 9.한지민 | 10.임태현 |
| 11.서유진 | 12.장현우 | 13.김소율 | 14.이도현 | 15.박하늘 |
| 16.오서준 | 17.신채원 | 18.홍지안 | 19.류민서 | 20.송예준 |
| 21.전하윤 | 22.권도영 | 23.문서현 | 24.배지훈 | 25.양수아 |

<hp:p id="6" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="7" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="8"><hp:t>[ 교실 뒷문 ]</hp:t></hp:run>
</hp:p>

<hp:p id="8" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t> </hp:t></hp:run>
</hp:p>

<hp:p id="9" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>배치일: 2026. 5. 4. / 담임: 김선생</hp:t></hp:run>
</hp:p>

<hp:p id="10" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>비고: 박지호(시력)-앞배치, 김민준·강도윤 분리배치</hp:t></hp:run>
</hp:p>

</hs:sec>`;

// ═══════════════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════════════
console.log('🧪 korean-teacher-mcp 통합 테스트 시작\n');

const results = [];

console.log('── 시나리오 1: 가정통신문 (현장체험학습 안내) ──');
results.push(await buildHwpx('parent-newsletter', scenario1_xml, '가정통신문_현장체험학습안내'));

console.log('\n── 시나리오 2: 업무 체크리스트 (학기초) ──');
results.push(await buildHwpx('checklist', scenario2_xml, '학기초_업무체크리스트'));

console.log('\n── 시나리오 3: 자리배치도 (6학년3반) ──');
results.push(await buildHwpx('worksheet', scenario3_xml, '자리배치도_6학년3반'));

console.log('\n═══════════════════════════════════════');
console.log('📁 생성된 파일:');
results.forEach(p => console.log(`   ${p}`));
console.log('═══════════════════════════════════════');
