import { z } from 'zod';
import path from 'node:path';
import os from 'node:os';
import { writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

function getDefaultOutputDir(): string {
  return path.join(os.homedir(), 'Downloads');
}

const TEMPLATE_TYPES = ['worksheet', 'lesson-plan', 'assessment', 'performance-assessment', 'pbl', 'discussion', 'report', 'gonmun', 'minutes', 'proposal', 'parent-newsletter', 'checklist', 'roster'] as const;

const HWPX_DESCRIPTION = `HWPX(한글) 문서를 생성합니다.

## 사용법
template + section_xml 파라미터를 사용해 hwpxskill 기반으로 문서를 생성합니다.
section_xml에 OWPML 형식의 section0.xml 내용을 직접 작성하세요.

## 🔑 표 작성 — Markdown 문법 지원 (권장)
표는 OWPML hp:tbl을 직접 쓰지 않고, **section_xml 내부에 일반 markdown 표**를 그대로 삽입하세요.
도구가 자동으로 정확한 hp:tbl(헤더=borderFillIDRef 4, 데이터=3, 폭 42520, cellMargin 510/141, rowCnt/colCnt 포함)로 변환합니다.

예시 — 이렇게 쓰면 됩니다:
\`\`\`xml
<hp:p id="100" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="7"><hp:t>1. 학습 목표</hp:t></hp:run>
</hp:p>

| 항목 | 내용 | 배점 |
| --- | --- | --- |
| 주제 파악 | 작품의 중심 생각 | 10점 |
| 인물 분석 | 주인공의 변화 추적 | 15점 |

<hp:p id="101" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0"><hp:t>위 표를 참고하여…</hp:t></hp:run>
</hp:p>
\`\`\`
- 첫 줄: \`| 헤더1 | 헤더2 | ... |\`
- 둘째 줄: \`| --- | --- | ... |\` (구분선, 필수)
- 이후: \`| 데이터 | 데이터 | ... |\` 행 반복
- 각 행은 헤더와 열 수가 같아야 합니다.

직접 hp:tbl XML을 작성해도 되지만, **가독성과 안정성을 위해 markdown 표 사용을 강력히 권장**합니다.

## 문서 구조 규칙
- 중첩 표 금지 (셀 안에 또 표)
- 래퍼 표 금지 (문서 전체를 하나의 표로 감싸지 말 것)
- 단락-표 교차 구조: 제목(hp:p) → 본문(hp:p) → 표 → 다음 제목 → 표
- 제목은 charPrIDRef="7"(16pt 볼드), 소제목 "8"(12pt 볼드), 강조 "9", 본문 "0"

### 사용 가능한 템플릿
- **worksheet** (활동지/학습지): 학교 수업용 활동지
- **lesson-plan** (수업 지도안): 교수·학습 지도안
- **assessment** (형성평가지): 학생용 문제지 + 교사용 정답·해설지
- **performance-assessment** (수행평가지): 수행 과제 안내 + 평가 기준표/루브릭
- **report** (보고서): 일반 보고서
- **gonmun** (공문): 관공서 공문 형식
- **minutes** (회의록): 회의록 형식
- **pbl** (PBL 수업자료): 프로젝트 기반 학습 수업 설계안
- **discussion** (토의토론 수업자료): 토의토론 활동 설계안
- **proposal** (제안서): 제안서 형식
- **parent-newsletter** (가정통신문): 학부모 안내문
- **checklist** (체크리스트): 업무 체크리스트
- **roster** (명렬표): 학생 명렬표/자리배치도

### 폰트 규칙
모든 템플릿 공통: **함초롬바탕** (본문, 제목, 소제목, 강조 모두 동일)

### 문자 스타일 (charPrIDRef) — 모든 템플릿 공통
- **0**: 본문 (10pt 함초롬바탕)
- **1**: 본문 보조 (10pt 함초롬돋움)
- **7**: 제목 (16pt 함초롬바탕 볼드)
- **8**: 소제목 (12pt 함초롬바탕 볼드)
- **9**: 강조 (10pt 함초롬바탕 볼드)

### 표 스타일 (borderFillIDRef) — 모든 템플릿 공통
- **3**: 기본 표 테두리 (검정 실선 0.12mm, 4면)
- **4**: 표 헤더 셀 (검정 실선 + 회색 배경 #D9D9D9)
- **5**: 강조 셀 (검정 실선 + 연청색 배경 #DAEEF3)
- **6**: 구분선 (하단만 실선)

### 표 작성 규칙
- **인쇄 가능 폭: 42520** (HWPUNIT). 표 전체 폭(hp:sz width)은 반드시 42520 이하
- **cellMargin**: left="510" right="510" top="141" bottom="141" (고정)
- 각 행의 셀 폭 합계 = 표 전체 폭

### 문서 구조 규칙 (필수)
- **중첩 표 금지**: 표 셀(hp:tc) 안에 다른 표(hp:tbl)를 절대 넣지 마세요
- **래퍼 표 금지**: 문서 전체를 하나의 큰 표로 감싸지 마세요. 제목/소제목은 독립 단락(hp:p)으로 작성
- **단락-표 교차 구조**: 제목 → 설명 단락 → 표 → 다음 제목 → 단락 → 표 순서로 배치
- **표 헤더 스타일**: borderFillIDRef="4"(회색 배경)는 표의 첫 번째 행(헤더)에만 사용. 데이터 행은 borderFillIDRef="3" 사용

올바른 구조 예시:
\`\`\`
hp:p (제목: charPrIDRef="7")
hp:p (본문 설명: charPrIDRef="0")
hp:p → hp:tbl (표1: 헤더행=borderFillIDRef="4", 데이터행=borderFillIDRef="3")
hp:p (다음 제목: charPrIDRef="8")
hp:p → hp:tbl (표2)
\`\`\`

잘못된 구조 (절대 금지):
\`\`\`
hp:tbl (래퍼 표)
  └ hp:tc
    └ hp:p (제목)
    └ hp:tbl (중첩 표) ← 금지!
\`\`\`

### section_xml 작성 가이드

**중요**: hp:linesegarray 요소를 포함하지 마세요. 이 요소는 한글이 문서를 열 때 자동으로 재계산하는 레이아웃 캐시입니다. 잘못된 값이 포함되면 자간(글자 간격)이 겹치는 문제가 발생합니다. build_hwpx.py가 빌드 시 자동으로 제거합니다.

기본 단락 구조:
\`\`\`xml
<hp:p id="ID" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0">
    <hp:t>텍스트 내용</hp:t>
  </hp:run>
</hp:p>
\`\`\`

표(table) 구조 — 표는 반드시 hp:p 안에 hp:run > hp:tbl로 감싸야 합니다:
\`\`\`xml
<hp:p id="TABLE_WRAPPER_ID" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
  <hp:run charPrIDRef="0">
    <hp:tbl id="TABLE_ID" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" cellSpacing="0" borderFillIDRef="3" noAdjust="0">
      <hp:sz width="42520" widthRelTo="ABSOLUTE" height="2400" heightRelTo="ABSOLUTE" protect="0"/>
      <hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>
      <hp:outMargin left="0" right="0" top="0" bottom="0"/>
      <hp:inMargin left="0" right="0" top="0" bottom="0"/>
      <hp:tr>
        <hp:tc borderFillIDRef="4">
          <hp:cellAddr colAddr="0" rowAddr="0"/>
          <hp:cellSpan colSpan="1" rowSpan="1"/>
          <hp:cellSz width="8504" height="2400"/>
          <hp:cellMargin left="510" right="510" top="141" bottom="141"/>
          <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="7484" fieldName="">
            <hp:p id="CELL_P_ID" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
              <hp:run charPrIDRef="9">
                <hp:t>헤더 라벨</hp:t>
              </hp:run>
            </hp:p>
          </hp:subList>
        </hp:tc>
        <hp:tc borderFillIDRef="3">
          <hp:cellAddr colAddr="1" rowAddr="0"/>
          <hp:cellSpan colSpan="1" rowSpan="1"/>
          <hp:cellSz width="34016" height="2400"/>
          <hp:cellMargin left="510" right="510" top="141" bottom="141"/>
          <hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="32996" fieldName="">
            <hp:p id="CELL_P_ID2" paraPrIDRef="22" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
              <hp:run charPrIDRef="0">
                <hp:t>데이터 내용</hp:t>
              </hp:run>
            </hp:p>
          </hp:subList>
        </hp:tc>
      </hp:tr>
    </hp:tbl>
  </hp:run>
</hp:p>
\`\`\`

**주의**: 셀 안의 textWidth는 반드시 cellSz.width - cellMargin.left - cellMargin.right로 계산합니다 (예: 8504 - 510 - 510 = 7484). 행의 모든 셀 폭 합계는 표 전체 폭(42520)과 동일해야 합니다. hp:tbl에는 반드시 rowCnt, colCnt 속성을 포함하세요.

기본 저장 위치: ~/Downloads`;

function isContainerPath(dir: string): boolean {
  return dir.startsWith('/mnt/') || dir.startsWith('/tmp/') || dir.startsWith('/home/');
}

// ───────────────────────────────────────────────────────────
// Markdown 표 → OWPML hp:tbl 자동 변환기
// LLM이 section_xml 안에 markdown 표를 그대로 써도 정확한 표로 변환됩니다.
// ───────────────────────────────────────────────────────────

let mdTableIdSeed = 900000;
function nextMdTableId(): number {
  return ++mdTableIdSeed;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface MdTable {
  headers: string[];
  rows: string[][];
}

/** 한 줄이 markdown 표의 구분선( |---|---| )인지 판별 */
function isSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return false;
  const inner = t.slice(1, -1);
  return inner.split('|').every(seg => /^\s*:?\s*-+\s*:?\s*$/.test(seg));
}

function isPipeRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.length > 2;
}

function splitPipeRow(line: string): string[] {
  return line.trim().slice(1, -1).split('|').map(c => c.trim());
}

function tryParseMdTable(lines: string[], start: number): { table: MdTable; endIdx: number } | null {
  if (!isPipeRow(lines[start])) return null;
  if (start + 1 >= lines.length || !isSeparatorLine(lines[start + 1])) return null;
  const headers = splitPipeRow(lines[start]);
  const sep = splitPipeRow(lines[start + 1]);
  if (headers.length !== sep.length) return null;
  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && isPipeRow(lines[i]) && !isSeparatorLine(lines[i])) {
    const cells = splitPipeRow(lines[i]);
    // 셀 수가 헤더와 다르면 패딩 또는 자르기
    while (cells.length < headers.length) cells.push('');
    if (cells.length > headers.length) cells.length = headers.length;
    rows.push(cells);
    i++;
  }
  return { table: { headers, rows }, endIdx: i - 1 };
}

/** markdown 표 하나를 정규 OWPML hp:tbl 블록(hp:p 래퍼 포함)으로 변환 */
function buildOwpmlTable(tbl: MdTable): string {
  const colCnt = Math.max(1, tbl.headers.length);
  const rowCnt = 1 + tbl.rows.length;
  const totalWidth = 42520;
  const colWidth = Math.floor(totalWidth / colCnt);
  // 마지막 열이 나머지를 흡수 (반올림 오차 보정)
  const lastColWidth = totalWidth - colWidth * (colCnt - 1);
  const rowHeight = 2400;
  const totalHeight = rowCnt * rowHeight;
  const tableId = nextMdTableId();
  const wrapperId = nextMdTableId();

  const buildCell = (text: string, colIdx: number, rowIdx: number, isHeader: boolean): string => {
    const w = colIdx === colCnt - 1 ? lastColWidth : colWidth;
    const textWidth = w - 510 - 510;
    const border = isHeader ? '4' : '3';
    const charPr = isHeader ? '9' : '0';
    const pId = nextMdTableId();
    return (
      `<hp:tc borderFillIDRef="${border}">` +
      `<hp:cellAddr colAddr="${colIdx}" rowAddr="${rowIdx}"/>` +
      `<hp:cellSpan colSpan="1" rowSpan="1"/>` +
      `<hp:cellSz width="${w}" height="${rowHeight}"/>` +
      `<hp:cellMargin left="510" right="510" top="141" bottom="141"/>` +
      `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" ` +
      `linkListIDRef="0" linkListNextIDRef="0" textWidth="${textWidth}" fieldName="">` +
      `<hp:p id="${pId}" paraPrIDRef="21" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
      `<hp:run charPrIDRef="${charPr}"><hp:t>${escapeXml(text)}</hp:t></hp:run>` +
      `</hp:p></hp:subList></hp:tc>`
    );
  };

  const headerTr = `<hp:tr>${tbl.headers.map((h, i) => buildCell(h, i, 0, true)).join('')}</hp:tr>`;
  const dataTrs = tbl.rows.map((row, ri) =>
    `<hp:tr>${row.map((c, ci) => buildCell(c, ci, ri + 1, false)).join('')}</hp:tr>`
  ).join('');

  return (
    `<hp:p id="${wrapperId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="0">` +
    `<hp:tbl id="${tableId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" ` +
    `textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" ` +
    `cellSpacing="0" borderFillIDRef="3" noAdjust="0" rowCnt="${rowCnt}" colCnt="${colCnt}">` +
    `<hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${totalHeight}" heightRelTo="ABSOLUTE" protect="0"/>` +
    `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" ` +
    `vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
    `<hp:outMargin left="0" right="0" top="0" bottom="0"/>` +
    `<hp:inMargin left="0" right="0" top="0" bottom="0"/>` +
    headerTr + dataTrs +
    `</hp:tbl></hp:run></hp:p>`
  );
}

/**
 * section_xml 안의 markdown 표 블록을 OWPML hp:tbl로 치환합니다.
 * - 표 식별: `|head|...|` + 다음 줄 `|---|---|` 패턴
 * - XML 태그 안의 평문을 대상으로 해도 안전하지만, 실제 사용은 LLM이 XML 요소 사이에 평문으로 끼워 넣는 것을 전제로 합니다.
 * - 이미 작성된 hp:tbl은 그대로 유지됩니다.
 */
function expandMdTablesInSectionXml(sectionXml: string): string {
  const lines = sectionXml.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = tryParseMdTable(lines, i);
    if (parsed) {
      out.push(buildOwpmlTable(parsed.table));
      i = parsed.endIdx + 1;
    } else {
      out.push(lines[i]);
      i++;
    }
  }
  return out.join('\n');
}

interface HwpxValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * 생성된 HWPX 파일의 ZIP 구조와 XML 무결성을 검증합니다.
 * 실패해도 파일은 그대로 전달됩니다 (정보성 경고).
 */
async function validateHwpxStructure(filePath: string): Promise<HwpxValidation> {
  const warnings: string[] = [];
  const errors: string[] = [];
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries().map(e => e.entryName);

    // 필수 파일 체크 (최소 셋 중 하나)
    const hasMimetype = entries.includes('mimetype');
    const hasContentHpf = entries.some(n => n.endsWith('Contents/content.hpf') || n.endsWith('content.hpf'));
    const hasContentTypes = entries.some(n => n === '[Content_Types].xml' || n.endsWith('[Content_Types].xml'));
    if (!hasMimetype && !hasContentHpf && !hasContentTypes) {
      errors.push('HWPX 필수 파일 부재: mimetype / Contents/content.hpf / [Content_Types].xml 모두 누락');
    }

    // XML 파일 well-formedness 간단 체크
    const xmlEntries = entries.filter(n => n.endsWith('.xml'));
    for (const entryName of xmlEntries) {
      try {
        const text = zip.readAsText(entryName);
        if (!text.trim()) {
          warnings.push(`빈 XML 파일: ${entryName}`);
          continue;
        }
        // XML 선언 중복
        const xmlDeclCount = (text.match(/<\?xml\s/g) ?? []).length;
        if (xmlDeclCount > 1) {
          warnings.push(`XML 선언 중복: ${entryName}`);
        }
        // linesegarray 잔존
        if (text.includes('linesegarray')) {
          warnings.push(`hp:linesegarray 잔존 (자간 깨질 수 있음): ${entryName}`);
        }
        // 중첩 표 탐지 (hp:tc 안에 hp:tbl). </hp:tc> 경계 앞에서만 일치해야 한다 —
        // 단순 비탐욕 매칭은 여러 표가 있는 문서에서 오탐한다.
        if (/<hp:tc[^>]*>(?:(?!<\/hp:tc>)[\s\S])*?<hp:tbl/.test(text)) {
          warnings.push(`중첩 표 의심: ${entryName}`);
        }
      } catch (e) {
        warnings.push(`XML 읽기 실패: ${entryName}`);
      }
    }
  } catch (e) {
    errors.push(`ZIP 파싱 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// Resolve the project root relative to this file (dist/tools/export-hwpx.js -> project root)
function getProjectRoot(): string {
  // In compiled JS: dist/tools/export-hwpx.js
  // __dirname = dist/tools, so go up 2 levels
  return path.resolve(__dirname, '..', '..');
}

export function registerExportHwpxTool(server: McpServer) {
  server.tool(
    'export_hwpx',
    HWPX_DESCRIPTION,
    {
      template: z.enum(TEMPLATE_TYPES).describe('문서 템플릿 유형 (필수). section_xml과 함께 사용합니다.'),
      section_xml: z.string().describe('OWPML 형식의 section0.xml 내용 (필수, 전체 <hs:sec> 태그 포함).'),
      title: z.string().optional().describe('문서 제목 (메타데이터에 반영)'),
      filename: z.string().optional().describe('저장할 파일명 (확장자 없이, 기본: output)'),
      output_dir: z.string().optional().describe(`저장 디렉토리 (기본: ${getDefaultOutputDir()}). 반드시 로컬 절대 경로를 사용하세요.`),
    },
    async ({ template, section_xml, title, filename, output_dir }) => {
      // Determine output path
      let dir = output_dir ?? getDefaultOutputDir();
      if (isContainerPath(dir)) {
        dir = getDefaultOutputDir();
      }
      const name = filename ?? 'output';
      const outputPath = path.join(dir, `${name}.hwpx`);

      try {
        await mkdir(dir, { recursive: true });

        // Mode 1: Template mode (hwpxskill)
        if (template) {
          const projectRoot = getProjectRoot();
          const buildScript = path.join(projectRoot, 'hwpxskill-scripts', 'build_hwpx.py');

          const args = ['--template', template, '--output', outputPath];

          if (title) {
            args.push('--title', title);
          }

          // If section_xml is provided, expand markdown tables then write to temp file
          let tempSectionPath: string | null = null;
          if (section_xml) {
            const expandedXml = expandMdTablesInSectionXml(section_xml);
            tempSectionPath = path.join(tmpdir(), `section-${randomUUID()}.xml`);
            await writeFile(tempSectionPath, expandedXml, 'utf-8');
            args.push('--section', tempSectionPath);
          }

          try {
            const { stdout, stderr } = await execFileAsync('python3', [buildScript, ...args], {
              cwd: projectRoot,
              timeout: 30000,
            });

            // Clean up temp file
            if (tempSectionPath) {
              await unlink(tempSectionPath).catch(() => {});
            }

            const isValid = stdout.includes('VALID:');
            if (!isValid && stderr) {
              return {
                content: [{
                  type: 'text' as const,
                  text: `HWPX 생성 경고: ${stderr}\n출력: ${stdout}`,
                }],
              };
            }

            const fileInfo = await stat(outputPath);

            // 선택적 ZIP/XML 구조 검증 (실패해도 파일은 전달)
            const validation = await validateHwpxStructure(outputPath);
            const validationSummary = validation.warnings.length > 0 || validation.errors.length > 0
              ? {
                  valid: validation.valid,
                  warning_count: validation.warnings.length,
                  error_count: validation.errors.length,
                  warnings: validation.warnings.slice(0, 3),
                  errors: validation.errors.slice(0, 3),
                }
              : undefined;

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  mode: 'template',
                  template,
                  path: outputPath,
                  size_kb: Math.round(fileInfo.size / 1024),
                  message: `HWPX 파일이 생성되었습니다: ${outputPath}`,
                  build_output: stdout.trim(),
                  ...(validationSummary ? { validation: validationSummary } : {}),
                }, null, 2),
              }],
            };
          } catch (execErr: unknown) {
            // Clean up temp file on error
            if (tempSectionPath) {
              await unlink(tempSectionPath).catch(() => {});
            }
            const msg = execErr instanceof Error ? execErr.message : String(execErr);
            return {
              content: [{
                type: 'text' as const,
                text: `HWPX 템플릿 빌드 실패: ${msg}`,
              }],
            };
          }
        }

        // template 파라미터 누락 (zod에서 걸러지지만 안전장치)
        return {
          content: [{
            type: 'text' as const,
            text: 'template 파라미터가 필요합니다. TEMPLATE_TYPES 중 하나와 section_xml을 함께 제공하세요.',
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `HWPX 변환 실패: ${err instanceof Error ? err.message : String(err)}`,
          }],
        };
      }
    },
  );
}
