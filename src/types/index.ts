export type SourceType =
  | 'textbook'
  | 'research-textbook'
  | 'teacher-guide'
  | 'worksheet'
  | 'activity'
  | 'lesson-plan'
  | 'pbl'
  | 'discussion';

// 중학교: 학년-학기, 고등학교: 과목명
export type Grade =
  | '중1-1' | '중1-2' | '중2-1' | '중2-2'
  | '공통국어1' | '공통국어2'
  | '문학' | '독서와 작문' | '화법과 언어'
  | '독서 토론과 글쓰기' | '주제 탐구 독서';

export type Genre =
  | '시' | '소설' | '수필' | '극'
  | '설명문' | '논설문' | '기사문' | '기타';

export type ActivityType =
  | '읽기' | '쓰기' | '말하기' | '듣기' | '문법' | '문학';

export type QuestionType = '선택형' | '서술형' | '논술형';

export interface Source {
  id: string;
  file_path: string;
  source_type: SourceType;
  grade: string;
  unit_number: number;
  sub_unit: string;
  parsed_at: string;
}

export interface Unit {
  id: string;
  source_id: string;
  unit_number: number;
  title: string;
  sub_unit: string;
  learning_objectives: string; // JSON array
  achievement_std: string;     // JSON array
}

export interface Passage {
  id: string;
  unit_id: string;
  title: string;
  author: string;
  genre: string;
  content: string;
  lesson: number;
}

export interface Activity {
  id: string;
  unit_id: string;
  passage_id: string | null;
  activity_type: string;
  sequence: number;
  content: string;
  objectives: string;
}

export interface TeacherNote {
  id: string;
  unit_id: string;
  passage_id: string | null;
  tips: string;
  questions: string; // JSON array
}

export interface Assessment {
  id: string;
  unit_id: string;
  passage_id: string | null;
  question_type: string;
  content: string;
  answer: string;
  scoring_criteria: string;
}

export interface SearchResult {
  passages: Passage[];
  activities: Activity[];
  teacher_notes: TeacherNote[];
  assessments: Assessment[];
}

export interface PathMetadata {
  level: 'middle' | 'high' | 'special';
  grade: string;
  unit_number: number;
  sub_unit: string;
  source_type: SourceType;
}
