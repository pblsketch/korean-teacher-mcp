import { readFile } from 'node:fs/promises';
import { parse } from 'kordoc';

export interface ParsedDocument {
  markdown: string;
  metadata?: Record<string, unknown>;
}

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const buffer = await readFile(filePath);
  const result = await parse(buffer);

  if (!result.success) {
    throw new Error(`파싱 실패: ${filePath} — ${result.error}`);
  }

  return {
    markdown: result.markdown,
    metadata: result.metadata as Record<string, unknown> | undefined,
  };
}
