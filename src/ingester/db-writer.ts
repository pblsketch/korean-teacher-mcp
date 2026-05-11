import { v4 as uuidv4 } from 'uuid';
import type { Client } from '@libsql/client';
import type { ChunkedDocument } from './chunker.js';
import type { PathMetadata } from '../types/index.js';

export async function writeToDb(
  db: Client,
  doc: ChunkedDocument,
  meta: PathMetadata,
  filePath: string,
): Promise<{ sourceId: string; unitId: string }> {
  const sourceId = uuidv4();
  const unitId = uuidv4();

  const tx = await db.transaction('write');

  try {
    // Insert source
    await tx.execute({
      sql: 'INSERT INTO sources (id, file_path, source_type, grade, unit_number, sub_unit, parsed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [sourceId, filePath, meta.source_type, meta.grade, meta.unit_number, meta.sub_unit, new Date().toISOString()],
    });

    // Insert unit
    await tx.execute({
      sql: "INSERT INTO units (id, source_id, unit_number, title, sub_unit, learning_objectives, achievement_std) VALUES (?, ?, ?, ?, ?, '[]', '[]')",
      args: [unitId, sourceId, meta.unit_number, doc.title || `${meta.grade} ${meta.unit_number}단원`, meta.sub_unit],
    });

    // Insert passages
    for (const passage of doc.passages) {
      const passageId = uuidv4();
      await tx.execute({
        sql: 'INSERT INTO passages (id, unit_id, title, author, genre, content, lesson) VALUES (?, ?, ?, ?, ?, ?, 1)',
        args: [passageId, unitId, passage.title, passage.author, passage.genre, passage.content],
      });
    }

    // Insert activities
    for (const activity of doc.activities) {
      const activityId = uuidv4();
      await tx.execute({
        sql: "INSERT INTO activities (id, unit_id, passage_id, activity_type, sequence, content, objectives) VALUES (?, ?, NULL, ?, ?, ?, '')",
        args: [activityId, unitId, activity.activityType, activity.sequence, activity.content],
      });
    }

    // Insert teacher notes
    for (const note of doc.teacherNotes) {
      const noteId = uuidv4();
      await tx.execute({
        sql: 'INSERT INTO teacher_notes (id, unit_id, passage_id, tips, questions) VALUES (?, ?, NULL, ?, ?)',
        args: [noteId, unitId, note.tips, JSON.stringify(note.questions)],
      });
    }

    // Insert assessments
    for (const assessment of doc.assessments) {
      const assessmentId = uuidv4();
      await tx.execute({
        sql: "INSERT INTO assessments (id, unit_id, passage_id, question_type, content, answer, scoring_criteria) VALUES (?, ?, NULL, ?, ?, ?, '')",
        args: [assessmentId, unitId, assessment.questionType, assessment.content, assessment.answer],
      });
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return { sourceId, unitId };
}
