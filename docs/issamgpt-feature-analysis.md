# issamGPT 기능 분석 및 MCP 도구 추가 제안

## 분석일: 2026-05-14
## 대상: https://issamgpt.com (아이스크림미디어 AI 교사 비서)

---

## 1. issamGPT 전체 기능 맵

### 1-1. 업무 경감 (/work-assistant) — 8개 서비스

| # | 서비스명 | URL slug | 설명 | 입력 폼 |
|---|---------|----------|------|---------|
| 1 | 업무 프로세스 생성 | process-generator | 문서 기반 체크리스트 생성 | 파일/텍스트 + 지침(선택) |
| 2 | 문서 요약 | document-summary | 문서 주요 내용 요약 | 파일/텍스트 + 지침(선택) |
| 3 | 공문 생성 | official-document-generator | 상황 맞는 공문 초안 | **제출처(내부/외부)** + 파일/텍스트 + 지침(선택) |
| 4 | 가정통신문 생성 | parent-notice-generator | 학부모 전달용 가정통신문 | 파일/텍스트 + 지침(선택) + **템플릿(선택)** |
| 5 | 공문 형식/맞춤법 검사 | format-checker | 형식 정리 + 맞춤법 수정 | 파일/텍스트 + 지침(선택) |
| 6 | 개인정보 체크 | pii-checker | 개인정보 탐지/수정 | 파일/텍스트 + 지침(선택) |
| 7 | 회의록 생성 | meeting-minutes | 내용 기반 회의록 생성 | 파일/텍스트 + 지침(선택) |
| 8 | 계획서 생성 | plan-generator | 체계적 계획서 정리 | 파일/텍스트 + 지침(선택) |

**공통 입력 패턴**: 파일 업로드(HWP/HWPX/PDF/DOCX/XLSX, 5개, 10MB) OR 텍스트 직접 입력 + 지침(선택) + 템플릿(선택)

### 1-2. HWP Studio (/editor) — 11개 템플릿

**카테고리별 템플릿:**

- **교무·행정 (3개)**: 기안(내부결재), 기안(외부공문), 회의록
- **수업 운영 (2개)**: 교육 운영 계획, 수업지도안
- **학부모 소통 (2개)**: 가정통신문(안내용), 가정통신문(회신용)
- **학급 경영 (3개)**: 학급 명렬표, 자리배치도, 이름라벨지
- **빈 문서 (1개)**: 새 문서

### 1-3. AI Box (/ai-box) — 18+ 도구 (6개 카테고리)

**이미지 (4개)**
- 이미지 스타일 변환기 — 이미지를 다양한 스타일로 변환
- 이미지 컬러링 변환기 — 컬러링북 스타일로 변환
- 직업 이미지 생성기 — 직업 관련 이미지 생성
- 인포그래픽 생성기 — 인포그래픽 자동 생성

**수업 준비 (1개)**
- 영어 지문 읽기 프로그램 — 영어 지문 기반 읽기 활동

**평가 (4개)**
- 퀴즈 생성기 — 맞춤형 퀴즈 (PDF + 난이도/문항수/유형/학년/주제)
- 학생 글쓰기 평가·피드백 — 글쓰기 자동 평가
- 온라인 평가지 풀기 — 온라인 평가 실행
- 온라인 평가지 변환기 — 기존 평가지를 온라인용으로 변환

**활동 (6개)**
- 3D 레이싱 영단어 게임 — 게임화 영어 학습
- 역사 속 인물과 대화하기 — AI 역사 인물 챗봇
- 영어 단어 게임 모음 — 다양한 영어 단어 게임
- 우리 반 음악 만들기 — AI 음악 생성
- 세계 친구 인터뷰 생성기 — 가상 글로벌 인터뷰
- 책 속 주인공 되기 — 문학 역할 체험

**행정 (2개)**
- 학부모 메시지 도우미 — 학부모 소통 메시지 작성
- PDF 도구 모음 — PDF 합치기/나누기 등

**음성 (1개)**
- 회의록 녹음기 — 음성 녹음 → 회의록

### 1-4. AI Mart (/ai-mart) — 커뮤니티 마켓플레이스

선생님들이 직접 만든 AI 서비스를 공유/사용하는 마켓. 30+ 서비스.

**필터**: 분류(수업/업무/기타), 학년(초등/중등/고등), 과목(15개), 유형(AI 포함/일반)

**인기 서비스 예시**:
- 레고 스튜디오, 99크러시:구구단연습게임, 정답을 파괴하라!
- 영어토론대회 연습, 영어 지문으로 노래 만들기
- AI 동요 메이커, 도형 변신 스튜디오
- 상황에 맞는 속담찾기, 칠판 빙고

### 1-5. 내 자료함 (/my-box) — 파일 관리

- 내 작업물 / 공개 자료 탭
- 분류: 전체, 즐겨찾기, 문서, 이미지, 슬라이드
- 1GB 저장 용량

### 1-6. 클래스 (/class) — 학급 관리

- 클래스 생성/관리 (클래스 코드, 학생 등록)
- 클래스 자료함, 클래스 리포트
- 학생 리스트 (번호, 이름, 성별, 접속번호)
- 동의서 등록 기능

### 1-7. 새로운 채팅 (/main) — AI 채팅

범용 AI 대화 인터페이스

---

## 2. 기존 korean-teacher-mcp 도구 (16개)

| 도구명 | 설명 |
|--------|------|
| ingest | 교과서 PDF 파싱/DB 저장 |
| search | 교과서 내용 검색 |
| generate_worksheet | 활동지 생성 컨텍스트 |
| generate_assessment | 평가 문항 생성 |
| generate_pbl | PBL 프로젝트 설계 |
| generate_discussion | 토론 주제/가이드 |
| export_hwpx | HWP 문서 내보내기 |
| export_pptx | PPTX 프레젠테이션 내보내기 |
| export_thinking_tool | 사고 도구 내보내기 |
| generate_student_comment | 학생 생활기록부 코멘트 |
| generate_rubric | 평가 루브릭 생성 |
| generate_differentiated_text | 수준별 텍스트 생성 |
| analyze_vocabulary_level | 어휘 수준 분석 |
| generate_mindmap | 마인드맵 생성 |
| list_units / list_passages | 단원/지문 목록 |

---

## 3. 중복 분석 및 신규 도구 제안

### 3-1. 기존 도구와 겹치는 issamGPT 기능 (추가 불필요)

- **퀴즈 생성기** ↔ generate_assessment (기존에 있음, 파라미터 확장 가능)
- **학생 글쓰기 평가** ↔ generate_rubric + generate_student_comment (부분 겹침)

### 3-2. 신규 추가 제안 도구 (14개)

#### A. 행정 문서 생성 (6개) — 업무 경감 카테고리

```
1. generate_official_document     — 공문 생성 (내부결재/외부공문)
2. generate_parent_newsletter     — 가정통신문 생성
3. generate_meeting_minutes       — 회의록 생성
4. generate_work_plan             — 계획서 생성
5. generate_work_checklist        — 업무 프로세스/체크리스트 생성
6. summarize_document             — 문서 요약
```

#### B. 문서 검수 (2개)

```
7. check_document_format          — 공문 형식 및 맞춤법 검사
8. check_pii                      — 개인정보 탐지/마스킹
```

#### C. 소통 도구 (1개)

```
9. generate_parent_message        — 학부모 메시지 도우미
```

#### D. 퀴즈/평가 확장 (1개)

```
10. generate_quiz                 — 퀴즈 생성기 (기존 assessment 확장)
    ┗ 난이도, 문항수, 문제유형(객관식/주관식/OX), 학년수준, 주제
```

#### E. 학습 활동 도구 (2개)

```
11. generate_historical_dialogue  — 역사 속 인물과 대화 (프롬프트 생성)
12. generate_character_roleplay   — 책 속 주인공 되기 (문학 역할 체험)
```

#### F. HWP 템플릿 확장 (2개)

```
13. generate_seating_chart        — 자리배치도 생성 (HWPX)
14. generate_student_roster       — 학급 명렬표 생성 (HWPX)
```

### 3-3. MCP에 적합하지 않은 기능 (제외)

- **이미지 도구들** (이미지 스타일/컬러링 변환) — 별도 이미지 생성 API 필요
- **게임 도구들** (3D 레이싱, 빙고 등) — 실시간 인터랙티브 UI 필요
- **음성 녹음기** — 하드웨어 액세스 필요
- **PDF 도구 모음** — 범용 도구, 교육 특화 아님
- **온라인 평가지 풀기** — 실시간 UI 필요
- **AI Mart 마켓플레이스** — 플랫폼 기능, MCP 도구 아님
- **클래스 관리** — 데이터 관리 시스템, MCP 단위 도구 아님
- **내 자료함** — 파일 관리 시스템

---

## 4. 도구별 상세 스키마 설계

### 4-1. generate_official_document (공문 생성)
```typescript
{
  submission_type: z.enum(['internal', 'external']).describe('제출처: internal=내부결재, external=외부기관'),
  content: z.string().describe('공문 내용 또는 참고 자료 텍스트'),
  instructions: z.string().optional().describe('추가 지침 (톤, 강조할 내용 등)'),
  school_name: z.string().optional().describe('학교명'),
  department: z.string().optional().describe('부서명'),
  writer_name: z.string().optional().describe('작성자명'),
  writer_title: z.string().optional().describe('작성자 직위'),
}
```

### 4-2. generate_parent_newsletter (가정통신문 생성)
```typescript
{
  content: z.string().describe('가정통신문 내용 또는 참고 자료'),
  instructions: z.string().optional().describe('추가 지침'),
  school_name: z.string().optional().describe('학교명'),
  newsletter_type: z.enum(['info', 'reply']).optional().describe('유형: info=안내용, reply=회신용'),
  include_reply_slip: z.boolean().optional().describe('회신란 포함 여부'),
}
```

### 4-3. generate_meeting_minutes (회의록 생성)
```typescript
{
  content: z.string().describe('회의 내용 또는 녹취록'),
  meeting_title: z.string().optional().describe('회의 제목'),
  meeting_date: z.string().optional().describe('회의 일시'),
  attendees: z.array(z.string()).optional().describe('참석자 목록'),
  instructions: z.string().optional().describe('추가 지침'),
}
```

### 4-4. generate_work_plan (계획서 생성)
```typescript
{
  content: z.string().describe('계획서 내용 또는 참고 자료'),
  plan_title: z.string().optional().describe('계획서 제목'),
  period: z.string().optional().describe('운영 기간'),
  target: z.string().optional().describe('대상'),
  instructions: z.string().optional().describe('추가 지침'),
}
```

### 4-5. generate_work_checklist (업무 체크리스트 생성)
```typescript
{
  content: z.string().describe('업무 내용 또는 참고 문서 텍스트'),
  instructions: z.string().optional().describe('추가 지침'),
}
```

### 4-6. summarize_document (문서 요약)
```typescript
{
  content: z.string().describe('요약할 문서 내용'),
  summary_type: z.enum(['brief', 'detailed', 'bullet']).optional().describe('요약 유형'),
  max_length: z.number().optional().describe('최대 글자 수'),
  instructions: z.string().optional().describe('추가 지침'),
}
```

### 4-7. check_document_format (공문 형식/맞춤법 검사)
```typescript
{
  content: z.string().describe('검사할 공문 텍스트'),
  check_type: z.enum(['format', 'spelling', 'both']).optional().describe('검사 유형'),
}
```

### 4-8. check_pii (개인정보 탐지)
```typescript
{
  content: z.string().describe('검사할 문서 텍스트'),
  action: z.enum(['detect', 'mask']).optional().describe('탐지만 or 마스킹까지'),
}
```

### 4-9. generate_parent_message (학부모 메시지)
```typescript
{
  situation: z.string().describe('상황 설명 (지각, 결석, 칭찬, 상담요청 등)'),
  student_name: z.string().optional().describe('학생 이름'),
  tone: z.enum(['formal', 'friendly', 'concerned']).optional().describe('어조'),
  message_type: z.enum(['notification', 'request', 'praise', 'concern']).optional().describe('메시지 유형'),
}
```

### 4-10. generate_quiz (퀴즈 생성기)
```typescript
{
  topic: z.string().describe('퀴즈 주제'),
  content: z.string().optional().describe('참고 자료 텍스트'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('난이도'),
  question_count: z.number().int().min(1).max(30).optional().describe('문항 수 (기본 10)'),
  question_type: z.enum(['multiple_choice', 'short_answer', 'true_false', 'mixed']).optional().describe('문제 유형'),
  grade_level: z.string().optional().describe('학년 수준'),
  // 기존 generate_assessment 도구의 unit_id 등도 지원
  unit_id: z.string().optional().describe('단원 ID (교과서 기반)'),
  grade: z.string().optional().describe('학년-학기'),
}
```

### 4-11. generate_historical_dialogue (역사 인물 대화)
```typescript
{
  historical_figure: z.string().describe('역사 인물 이름'),
  era: z.string().optional().describe('시대/시기'),
  topic: z.string().optional().describe('대화 주제'),
  student_grade: z.string().optional().describe('학생 학년'),
  language_level: z.enum(['easy', 'normal', 'advanced']).optional().describe('언어 수준'),
}
```

### 4-12. generate_character_roleplay (문학 캐릭터 역할극)
```typescript
{
  book_title: z.string().describe('도서 제목'),
  character_name: z.string().describe('캐릭터 이름'),
  scene: z.string().optional().describe('장면 설명'),
  student_grade: z.string().optional().describe('학생 학년'),
}
```

### 4-13. generate_seating_chart (자리배치도)
```typescript
{
  rows: z.number().int().describe('줄 수'),
  columns: z.number().int().describe('열 수'),
  students: z.array(z.string()).optional().describe('학생 이름 목록'),
  arrangement: z.enum(['sequential', 'random', 'custom']).optional().describe('배치 방식'),
  output_format: z.enum(['hwpx', 'text']).optional().describe('출력 형식'),
}
```

### 4-14. generate_student_roster (학급 명렬표)
```typescript
{
  class_name: z.string().describe('학급명 (예: 1학년 3반)'),
  students: z.array(z.object({
    number: z.number().int(),
    name: z.string(),
    gender: z.enum(['남', '여']).optional(),
  })).describe('학생 목록'),
  school_name: z.string().optional().describe('학교명'),
  teacher_name: z.string().optional().describe('담임 선생님'),
  output_format: z.enum(['hwpx', 'text']).optional().describe('출력 형식'),
}
```

---

## 5. 구현 우선순위

### Phase 1 — 즉시 구현 (행정 문서, 높은 가치)
1. generate_official_document
2. generate_parent_newsletter
3. generate_meeting_minutes
4. generate_parent_message
5. summarize_document

### Phase 2 — 단기 구현 (평가/교육 활동)
6. generate_quiz (기존 assessment 확장)
7. generate_work_plan
8. generate_work_checklist
9. check_document_format

### Phase 3 — 중기 구현 (학습 활동/문서 검수)
10. check_pii
11. generate_historical_dialogue
12. generate_character_roleplay

### Phase 4 — 장기 구현 (HWP 템플릿 확장)
13. generate_seating_chart
14. generate_student_roster

---

## 6. HWP Studio 템플릿 활용 방안

기존 export_hwpx 도구의 `template` 파라미터를 확장하여 issamGPT의 HWP 템플릿을 지원:

```
현재: lesson_plan, unit_plan, worksheet
추가: draft_internal, draft_external, meeting_minutes, 
      education_plan, parent_newsletter_info, parent_newsletter_reply,
      lesson_guide, student_roster, seating_chart, name_labels
```

각 템플릿은 `hwpxskill-templates/` 디렉토리에 XML 구조로 추가.
