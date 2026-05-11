// Markdown → 구조화 청크 분리
// 교과서 PDF/HWP에서 kordoc이 반환하는 Markdown을 단원/지문/활동/교사노트로 분리

export interface ChunkedDocument {
  title: string;
  passages: ChunkedPassage[];
  activities: ChunkedActivity[];
  teacherNotes: ChunkedTeacherNote[];
  assessments: ChunkedAssessment[];
  rawContent: string;
}

export interface ChunkedPassage {
  title: string;
  author: string;
  genre: string;
  content: string;
}

export interface ChunkedActivity {
  activityType: string;
  sequence: number;
  content: string;
}

export interface ChunkedTeacherNote {
  tips: string;
  questions: string[];
}

export interface ChunkedAssessment {
  questionType: string;
  content: string;
  answer: string;
}

// 패턴 정의
const PASSAGE_PATTERNS = [
  /^##\s+\d+\.\s+(.+)/,
  /^##\s+지문\s*[：:]\s*(.+)/,
  /^>\s+\*\*(.+)\*\*/,
];

const AUTHOR_PATTERN = /작가[：:]\s*(.+)|저자[：:]\s*(.+)|글\s*[：:]\s*(.+)/;

const GENRE_KEYWORDS: Record<string, string[]> = {
  '시': ['연', '행', '수미', '운율', '비유', '상징', '서정'],
  '소설': ['서사', '인물', '갈등', '서술자', '배경', '사건'],
  '수필': ['수필', '에세이', '교술'],
  '극': ['시나리오', '희곡', '무대', '지문', '대사'],
  '설명문': ['설명', '정보', '전달'],
  '논설문': ['논설', '주장', '근거', '논증', '토론'],
};

const ACTIVITY_PATTERNS = [
  /^\d+\.\s+다음을?\s+/,
  /^활동\s*\d+[.：:]/,
  /^\[활동\]/,
  /^학습\s*활동/,
];

const TEACHER_TIP_PATTERN = /지도\s*(?:팁|포인트|방법)[：:]|교사\s*(?:팁|안내)/;
const QUESTION_PATTERN = /발문\s*\d*[：:]/;
const ASSESSMENT_PATTERN = /(?:형성\s*평가|확인\s*문제|평가\s*문항|단원\s*평가)/;

function detectGenre(text: string): string {
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return genre;
  }
  return '기타';
}

function extractAuthor(text: string): string {
  const match = text.match(AUTHOR_PATTERN);
  if (match) return (match[1] ?? match[2] ?? match[3] ?? '').trim();
  return '';
}

export function chunkDocument(markdown: string, sourceType: string): ChunkedDocument {
  const lines = markdown.split('\n');
  const result: ChunkedDocument = {
    title: '',
    passages: [],
    activities: [],
    teacherNotes: [],
    assessments: [],
    rawContent: markdown,
  };

  // Extract title from first heading
  for (const line of lines) {
    if (line.startsWith('# ')) {
      result.title = line.replace(/^#\s+/, '').trim();
      break;
    }
  }

  // For teacher guides, try to extract teacher notes
  if (sourceType === 'teacher-guide') {
    extractTeacherNotes(lines, result);
  }

  // Try to extract passages
  extractPassages(lines, result);

  // Try to extract activities
  extractActivities(lines, result);

  // Try to extract assessments
  extractAssessments(lines, result);

  // If nothing was extracted, store entire content as a single passage
  if (result.passages.length === 0 && result.activities.length === 0 &&
      result.teacherNotes.length === 0 && result.assessments.length === 0) {
    result.passages.push({
      title: result.title || '본문',
      author: '',
      genre: detectGenre(markdown),
      content: markdown,
    });
  }

  return result;
}

function extractPassages(lines: string[], result: ChunkedDocument): void {
  let currentPassage: ChunkedPassage | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of PASSAGE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Save previous passage
        if (currentPassage) {
          currentPassage.content = contentLines.join('\n').trim();
          if (currentPassage.content) result.passages.push(currentPassage);
        }
        currentPassage = {
          title: match[1]?.trim() ?? line.replace(/^#+\s*/, '').trim(),
          author: '',
          genre: '기타',
          content: '',
        };
        contentLines = [];
        matched = true;
        break;
      }
    }

    if (!matched && currentPassage) {
      // Check for author
      const author = extractAuthor(line);
      if (author) currentPassage.author = author;
      contentLines.push(line);
    }
  }

  // Save last passage
  if (currentPassage) {
    currentPassage.content = contentLines.join('\n').trim();
    if (currentPassage.content) {
      currentPassage.genre = detectGenre(currentPassage.content);
      result.passages.push(currentPassage);
    }
  }
}

function extractActivities(lines: string[], result: ChunkedDocument): void {
  let sequence = 0;
  let currentContent: string[] = [];
  let inActivity = false;

  for (const line of lines) {
    const isActivity = ACTIVITY_PATTERNS.some(p => p.test(line));
    if (isActivity) {
      if (inActivity && currentContent.length > 0) {
        result.activities.push({
          activityType: '읽기',
          sequence: sequence++,
          content: currentContent.join('\n').trim(),
        });
      }
      currentContent = [line];
      inActivity = true;
    } else if (inActivity) {
      // End activity on next heading or empty section
      if (line.startsWith('#') || (line.trim() === '' && currentContent.length > 3)) {
        result.activities.push({
          activityType: '읽기',
          sequence: sequence++,
          content: currentContent.join('\n').trim(),
        });
        currentContent = [];
        inActivity = false;
      } else {
        currentContent.push(line);
      }
    }
  }

  if (inActivity && currentContent.length > 0) {
    result.activities.push({
      activityType: '읽기',
      sequence: sequence,
      content: currentContent.join('\n').trim(),
    });
  }
}

function extractTeacherNotes(lines: string[], result: ChunkedDocument): void {
  let inTip = false;
  let tipLines: string[] = [];
  const questions: string[] = [];

  for (const line of lines) {
    if (TEACHER_TIP_PATTERN.test(line)) {
      if (inTip && tipLines.length > 0) {
        result.teacherNotes.push({ tips: tipLines.join('\n').trim(), questions: [...questions] });
        tipLines = [];
        questions.length = 0;
      }
      inTip = true;
      tipLines.push(line);
    } else if (QUESTION_PATTERN.test(line)) {
      questions.push(line.replace(QUESTION_PATTERN, '').trim());
    } else if (inTip) {
      if (line.startsWith('#')) {
        result.teacherNotes.push({ tips: tipLines.join('\n').trim(), questions: [...questions] });
        tipLines = [];
        questions.length = 0;
        inTip = false;
      } else {
        tipLines.push(line);
      }
    }
  }

  if (inTip && tipLines.length > 0) {
    result.teacherNotes.push({ tips: tipLines.join('\n').trim(), questions: [...questions] });
  }
}

function extractAssessments(lines: string[], result: ChunkedDocument): void {
  let inAssessment = false;
  let currentContent: string[] = [];

  for (const line of lines) {
    if (ASSESSMENT_PATTERN.test(line)) {
      inAssessment = true;
      currentContent = [line];
    } else if (inAssessment) {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        if (currentContent.length > 0) {
          result.assessments.push({
            questionType: '서술형',
            content: currentContent.join('\n').trim(),
            answer: '',
          });
        }
        currentContent = [];
        inAssessment = false;
      } else {
        currentContent.push(line);
      }
    }
  }

  if (inAssessment && currentContent.length > 0) {
    result.assessments.push({
      questionType: '서술형',
      content: currentContent.join('\n').trim(),
      answer: '',
    });
  }
}
