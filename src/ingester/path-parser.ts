import path from 'node:path';
import type { PathMetadata, SourceType } from '../types/index.js';

// 중학교 경로: documents/middle/1-1/1-1-1/(1) 비유/파일.hwp
// 고등학교 경로: documents/high/공통국어1/1/(1) 서정 갈래의 이해/파일.hwp
// 교과 특화: documents/교과 특화 자료/교과특화자료/파일.pdf

const MIDDLE_GRADE_MAP: Record<string, string> = {
  '1-1': '중1-1', '1-2': '중1-2',
  '2-1': '중2-1', '2-2': '중2-2',
};

const SOURCE_TYPE_PATTERNS: [RegExp, SourceType][] = [
  [/연구용\s*교과서/, 'research-textbook'],
  [/지도서/, 'teacher-guide'],
  [/교과서\s*본문|교과서\./, 'textbook'],
  [/교과서/, 'textbook'],
  [/수업\s*지도안|차시별\s*수업/, 'lesson-plan'],
  [/학습지/, 'worksheet'],
  [/활동지|학습\s*활동/, 'activity'],
  [/PBL|프로젝트/, 'pbl'],
  [/토의토론|토론/, 'discussion'],
];

function detectSourceType(filePath: string): SourceType {
  const name = path.basename(filePath);
  const dir = path.dirname(filePath);
  const fullContext = `${dir}/${name}`;

  for (const [pattern, type] of SOURCE_TYPE_PATTERNS) {
    if (pattern.test(fullContext)) return type;
  }
  return 'textbook';
}

export function parseFilePath(filePath: string, documentsRoot: string): PathMetadata {
  const rel = path.relative(documentsRoot, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const sourceType = detectSourceType(filePath);

  // middle/1-1/1-1-1/(1) 비유/파일.hwp
  if (parts[0] === 'middle' && parts.length >= 3) {
    const gradeSemester = parts[1]; // "1-1"
    const grade = MIDDLE_GRADE_MAP[gradeSemester] ?? gradeSemester;

    // Unit number from folder name like "1-1-1" → 1
    const unitFolder = parts[2] ?? '';
    const unitMatch = unitFolder.match(/\d+-\d+-(\d+)/);
    const unitNumber = unitMatch ? parseInt(unitMatch[1], 10) : 0;

    // Sub-unit from folder name like "(1) 비유"
    const subUnitFolder = parts[3] ?? '';
    const subUnit = subUnitFolder === '공통 자료' ? '' : subUnitFolder;

    return { level: 'middle', grade, unit_number: unitNumber, sub_unit: subUnit, source_type: sourceType };
  }

  // high/공통국어1/1/(1) 서정 갈래의 이해/파일.hwp
  if (parts[0] === 'high' && parts.length >= 3) {
    const grade = parts[1]; // "공통국어1"
    const unitNumber = parseInt(parts[2], 10) || 0;
    const subUnitFolder = parts[3] ?? '';
    const subUnit = subUnitFolder === '공통 자료' ? '' : subUnitFolder;

    return { level: 'high', grade, unit_number: unitNumber, sub_unit: subUnit, source_type: sourceType };
  }

  // 교과 특화 자료/...
  if (parts[0] === '교과 특화 자료') {
    const folderName = parts[1] ?? '';
    let sourceTypeOverride: SourceType = 'pbl';
    if (/토의토론/.test(folderName)) sourceTypeOverride = 'discussion';
    if (/PBL/.test(folderName)) sourceTypeOverride = 'pbl';

    return { level: 'special', grade: '교과특화', unit_number: 0, sub_unit: folderName, source_type: sourceTypeOverride };
  }

  return { level: 'middle', grade: '', unit_number: 0, sub_unit: '', source_type: sourceType };
}
