import * as pbl from './pbl.js';
import * as rubric from './rubric.js';
import * as udl from './udl.js';
import * as thinkingRoutines from './thinking-routines.js';
import * as aiTaskRedesign from './ai-task-redesign.js';
import * as quiz from './quiz.js';
import * as sdgs from './sdgs.js';
import * as lessonPlanning from './lesson-planning.js';
import * as assessment from './assessment.js';
import * as instructionalMaterials from './instructional-materials.js';
import * as differentiation from './differentiation.js';
import * as conceptBasedInquiry from './concept-based-inquiry.js';

export const PROMPTS: Record<string, { description: string; content: string }> = {
  'pbl': pbl,
  'rubric': rubric,
  'udl': udl,
  'thinking-routines': thinkingRoutines,
  'ai-task-redesign': aiTaskRedesign,
  'quiz': quiz,
  'sdgs': sdgs,
  'lesson-planning': lessonPlanning,
  'assessment': assessment,
  'instructional-materials': instructionalMaterials,
  'differentiation': differentiation,
  'concept-based-inquiry': conceptBasedInquiry,
};
