/**
 * grade-matcher.ts
 * 사용자의 자연어 입력을 DB의 grade 값으로 매핑하는 fuzzy matching 유틸리티
 *
 * DB에 저장되는 grade 값 예시:
 * - 중학교: "중1-1", "중1-2", "중2-1", "중2-2"
 * - 고등학교: "공통국어1", "공통국어2", "문학", "독서와 작문", "화법과 언어", "독서 토론과 글쓰기", "주제 탐구 독서"
 */

/** 사용 가능한 grade 값 목록 (description에 표시용) */
export const AVAILABLE_GRADES = [
  '중1-1', '중1-2', '중2-1', '중2-2',
  '공통국어1', '공통국어2',
  '문학', '독서와 작문', '화법과 언어',
  '독서 토론과 글쓰기', '주제 탐구 독서',
] as const;

export const GRADE_DESCRIPTION = `사용 가능한 grade 값: ${AVAILABLE_GRADES.join(', ')}. 자연어 입력도 가능합니다 (예: "중학교 2학년", "중2", "고등 공통국어" 등).`;

/**
 * 자연어 grade 입력을 실제 DB grade 값 배열로 변환
 * 하나의 입력이 여러 grade에 매칭될 수 있음 (예: "중2" → ["중2-1", "중2-2"])
 */
export function resolveGrade(input: string): string[] {
  const normalized = input.trim().replace(/\s+/g, '');

  // 1. 정확히 일치하는 경우 바로 반환
  const exactMatch = AVAILABLE_GRADES.find(g => g === input.trim());
  if (exactMatch) return [exactMatch];

  // 2. 중학교 패턴 매칭
  const middleMatches = matchMiddleSchool(normalized);
  if (middleMatches.length > 0) return middleMatches;

  // 3. 고등학교 패턴 매칭
  const highMatches = matchHighSchool(normalized);
  if (highMatches.length > 0) return highMatches;

  // 4. 숫자만 있는 경우 (예: "1", "2")
  const numberOnly = normalized.match(/^(\d)$/);
  if (numberOnly) {
    const num = numberOnly[1];
    return AVAILABLE_GRADES.filter(g => g.includes(`중${num}-`)) as string[];
  }

  // 5. 부분 문자열 매칭 (fallback)
  const partialMatches = AVAILABLE_GRADES.filter(g =>
    g.includes(input.trim()) || input.trim().includes(g)
  ) as string[];
  if (partialMatches.length > 0) return partialMatches;

  // 6. 매칭 실패 — 원본 반환 (DB에서 직접 검색 시도)
  return [input.trim()];
}

function matchMiddleSchool(input: string): string[] {
  // "중학교", "중학", "중" 포함 여부
  const isMiddle = /중학교|중학|중/.test(input);
  if (!isMiddle && !/\d학년/.test(input) && !/\d-\d/.test(input)) return [];

  // 학년 추출
  let gradeNum: string | null = null;

  // "중2-1", "중1-2" 형태
  const exactPattern = input.match(/중?(\d)[-](\d)/);
  if (exactPattern) {
    return [`중${exactPattern[1]}-${exactPattern[2]}`];
  }

  // "중학교 2학년 1학기", "중2학년1학기", "2학년 1학기"
  const fullPattern = input.match(/(\d)\s*학년\s*(\d)\s*학기/);
  if (fullPattern) {
    return [`중${fullPattern[1]}-${fullPattern[2]}`];
  }

  // "중학교 2학년", "중2학년", "2학년" (학기 미지정 → 양쪽 다)
  const gradeOnly = input.match(/(\d)\s*학년/);
  if (gradeOnly) {
    gradeNum = gradeOnly[1];
  }

  // "중2", "중1" (학기 미지정)
  const shortPattern = input.match(/중(\d)(?![.-])/);
  if (shortPattern && !gradeNum) {
    gradeNum = shortPattern[1];
  }

  // "1학기", "2학기" 추출
  const semesterMatch = input.match(/(\d)\s*학기/);
  const semester = semesterMatch ? semesterMatch[1] : null;

  if (gradeNum) {
    if (semester) {
      return [`중${gradeNum}-${semester}`];
    }
    return [`중${gradeNum}-1`, `중${gradeNum}-2`];
  }

  // "중학교" 만 있는 경우 → 모든 중학교 grade
  if (isMiddle && !gradeNum) {
    return ['중1-1', '중1-2', '중2-1', '중2-2'];
  }

  return [];
}

function matchHighSchool(input: string): string[] {
  const normalized = input.replace(/\s+/g, '');

  // "고등", "고교", "고" 포함 여부
  const isHigh = /고등학교|고등|고교|고\d|고/.test(input);

  // "공통국어" 패턴
  if (/공통국어|공통\s*국어|공국/.test(input)) {
    // "공통국어1", "공통국어2" 특정
    const numMatch = input.match(/공통\s*국어\s*(\d)/);
    if (numMatch) return [`공통국어${numMatch[1]}`];
    // "공통국어" → 둘 다
    return ['공통국어1', '공통국어2'];
  }

  // "문학"
  if (/문학/.test(input)) return ['문학'];

  // "독서와 작문", "독서작문", "독작"
  if (/독서와\s*작문|독서작문|독작/.test(input)) return ['독서와 작문'];

  // "화법과 언어", "화법언어", "화언"
  if (/화법과\s*언어|화법언어|화언|화법/.test(input)) return ['화법과 언어'];

  // "독서 토론과 글쓰기", "독서토론", "독토"
  if (/독서\s*토론과\s*글쓰기|독서토론|독토/.test(input)) return ['독서 토론과 글쓰기'];

  // "주제 탐구 독서", "주제탐구", "주탐독"
  if (/주제\s*탐구\s*독서|주제탐구|주탐독/.test(input)) return ['주제 탐구 독서'];

  // "고등학교" 만 있는 경우 → 모든 고등학교 grade
  if (isHigh) {
    return ['공통국어1', '공통국어2', '문학', '독서와 작문', '화법과 언어', '독서 토론과 글쓰기', '주제 탐구 독서'];
  }

  return [];
}

/**
 * grade 입력을 SQL WHERE 절에 사용할 수 있는 형태로 변환
 * 여러 grade가 매칭되면 IN 절로 변환
 */
export function buildGradeFilter(input: string): { sql: string; args: string[] } {
  const grades = resolveGrade(input);

  if (grades.length === 0) {
    return { sql: '', args: [] };
  }

  if (grades.length === 1) {
    return { sql: 's.grade = ?', args: grades };
  }

  const placeholders = grades.map(() => '?').join(',');
  return { sql: `s.grade IN (${placeholders})`, args: grades };
}
