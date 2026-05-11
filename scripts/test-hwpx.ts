import { markdownToHwpx } from 'kordoc';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const markdown = `# 1단원 활동지

## 학습 목표
- 비유의 개념을 이해할 수 있다
- 비유적 표현의 효과를 설명할 수 있다

## 활동 1: 비유 찾기
다음 시에서 비유적 표현을 찾아 밑줄을 그어 봅시다.

## 활동 2: 비유 만들기
| 원관념 | 보조관념 | 비유 문장 |
|--------|----------|-----------|
| 인생 | | |
| 사랑 | | |
`;

const outputDir = path.resolve('E:/github/korean-teacher-mcp/output');
const outputPath = path.join(outputDir, 'test.hwpx');

try {
  await mkdir(outputDir, { recursive: true });
  const buffer = await markdownToHwpx(markdown);
  await writeFile(outputPath, Buffer.from(buffer));
  const sizeKb = Math.round(buffer.byteLength / 1024);
  console.log(`SUCCESS: ${outputPath}`);
  console.log(`File size: ${sizeKb} KB (${buffer.byteLength} bytes)`);
} catch (err) {
  console.error('FAILED:', err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
}
