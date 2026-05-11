import type { Client } from '@libsql/client';
import type { Unit, Passage, Activity, TeacherNote, Assessment, SearchResult } from '../types/index.js';
import { resolveGrade } from '../utils/grade-matcher.js';

export async function getUnitsByFilter(db: Client, params: {
  grade?: string;
  unit_number?: number;
  source_type?: string;
  unit_id?: string;
}): Promise<Unit[]> {
  if (params.unit_id) {
    const result = await db.execute({ sql: 'SELECT * FROM units WHERE id = ?', args: [params.unit_id] });
    return result.rows as unknown as Unit[];
  }

  let sql = `
    SELECT u.* FROM units u
    JOIN sources s ON s.id = u.source_id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  if (params.grade) {
    const resolvedGrades = resolveGrade(params.grade);
    if (resolvedGrades.length === 1) {
      sql += ' AND s.grade = ?';
      args.push(resolvedGrades[0]);
    } else if (resolvedGrades.length > 1) {
      const placeholders = resolvedGrades.map(() => '?').join(',');
      sql += ` AND s.grade IN (${placeholders})`;
      args.push(...resolvedGrades);
    }
  }
  if (params.unit_number) { sql += ' AND u.unit_number = ?'; args.push(params.unit_number); }
  if (params.source_type) { sql += ' AND s.source_type = ?'; args.push(params.source_type); }

  const result = await db.execute({ sql, args });
  return result.rows as unknown as Unit[];
}

export async function getPassagesByUnit(db: Client, unitId: string): Promise<Passage[]> {
  const result = await db.execute({ sql: 'SELECT * FROM passages WHERE unit_id = ?', args: [unitId] });
  return result.rows as unknown as Passage[];
}

export async function getActivitiesByUnit(db: Client, unitId: string): Promise<Activity[]> {
  const result = await db.execute({ sql: 'SELECT * FROM activities WHERE unit_id = ? ORDER BY sequence', args: [unitId] });
  return result.rows as unknown as Activity[];
}

export async function getTeacherNotesByUnit(db: Client, unitId: string): Promise<TeacherNote[]> {
  const result = await db.execute({ sql: 'SELECT * FROM teacher_notes WHERE unit_id = ?', args: [unitId] });
  return result.rows as unknown as TeacherNote[];
}

export async function getAssessmentsByUnit(db: Client, unitId: string): Promise<Assessment[]> {
  const result = await db.execute({ sql: 'SELECT * FROM assessments WHERE unit_id = ?', args: [unitId] });
  return result.rows as unknown as Assessment[];
}

export async function getUnitContext(db: Client, unitId: string): Promise<SearchResult> {
  const [passages, activities, teacher_notes, assessments] = await Promise.all([
    getPassagesByUnit(db, unitId),
    getActivitiesByUnit(db, unitId),
    getTeacherNotesByUnit(db, unitId),
    getAssessmentsByUnit(db, unitId),
  ]);
  return { passages, activities, teacher_notes, assessments };
}

export async function likeSearch(db: Client, keyword: string, limit = 10) {
  const pattern = `%${keyword}%`;
  const [passageResults, activityResults] = await Promise.all([
    db.execute({ sql: 'SELECT id, title, content FROM passages WHERE content LIKE ? OR title LIKE ? LIMIT ?', args: [pattern, pattern, limit] }),
    db.execute({ sql: 'SELECT id, content FROM activities WHERE content LIKE ? LIMIT ?', args: [pattern, limit] }),
  ]);
  return {
    passages: passageResults.rows as unknown as { id: string; title: string; content: string }[],
    activities: activityResults.rows as unknown as { id: string; content: string }[],
  };
}

export async function insertFts(_db: Client, _rowId: string, _tableName: string, _content: string, _title: string) {
  // FTS5 not supported on Turso — keyword search uses LIKE instead
}

export async function searchContent(db: Client, params: {
  grade?: string;
  unit_number?: number;
  genre?: string;
  source_type?: string;
  keyword?: string;
  unit_id?: string;
  limit?: number;
}): Promise<SearchResult> {
  const limit = params.limit ?? 10;

  // Keyword search uses LIKE
  if (params.keyword) {
    const results = await likeSearch(db, params.keyword, limit);

    const passages = results.passages.map(r => r as unknown as Passage);
    const activities = results.activities.map(r => r as unknown as Activity);

    const unitIds = [...new Set([
      ...passages.map(p => p.unit_id),
      ...activities.map(a => a.unit_id),
    ])].filter(Boolean);

    let teacher_notes: TeacherNote[] = [];
    let assessments: Assessment[] = [];

    if (unitIds.length > 0) {
      const placeholders = unitIds.map(() => '?').join(',');
      const [tnResult, aResult] = await Promise.all([
        db.execute({ sql: `SELECT * FROM teacher_notes WHERE unit_id IN (${placeholders})`, args: unitIds }),
        db.execute({ sql: `SELECT * FROM assessments WHERE unit_id IN (${placeholders})`, args: unitIds }),
      ]);
      teacher_notes = tnResult.rows as unknown as TeacherNote[];
      assessments = aResult.rows as unknown as Assessment[];
    }

    return { passages, activities, teacher_notes, assessments };
  }

  // Filter by metadata
  const units = await getUnitsByFilter(db, params);
  if (units.length === 0) {
    return { passages: [], activities: [], teacher_notes: [], assessments: [] };
  }

  const unitIds = units.map(u => u.id);
  const placeholders = unitIds.map(() => '?').join(',');

  const [pResult, actResult, tnResult, asResult] = await Promise.all([
    db.execute({ sql: `SELECT * FROM passages WHERE unit_id IN (${placeholders}) LIMIT ?`, args: [...unitIds, limit] }),
    db.execute({ sql: `SELECT * FROM activities WHERE unit_id IN (${placeholders}) ORDER BY sequence LIMIT ?`, args: [...unitIds, limit] }),
    db.execute({ sql: `SELECT * FROM teacher_notes WHERE unit_id IN (${placeholders})`, args: unitIds }),
    db.execute({ sql: `SELECT * FROM assessments WHERE unit_id IN (${placeholders}) LIMIT ?`, args: [...unitIds, limit] }),
  ]);

  let passages = pResult.rows as unknown as Passage[];
  if (params.genre) {
    passages = passages.filter(p => p.genre === params.genre);
  }

  return {
    passages,
    activities: actResult.rows as unknown as Activity[],
    teacher_notes: tnResult.rows as unknown as TeacherNote[],
    assessments: asResult.rows as unknown as Assessment[],
  };
}
