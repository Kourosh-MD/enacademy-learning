import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';

const sourcePath = new URL('../frontend/lib/curriculum.ts', import.meta.url);
const outputPath = new URL('../backend/src/main/resources/curriculum.json', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const start = source.indexOf('const makeLesson');
const end = source.indexOf('export const lessonById');
if (start < 0 || end < 0) throw new Error('Unexpected curriculum source format');

const executable = source.slice(start, end)
  .replace(
    /const makeLesson = \(lesson: Omit<Lesson,[\s\S]*?\): Lesson =>/,
    'const makeLesson = (lesson) =>',
  )
  .replaceAll('export const ', 'const ')
  .replace('const lessons: Lesson[]', 'const lessons')
  .replace('const modules: CourseModule[]', 'const modules')
  .concat('\nresult = { lessons, modules };');

const context = { result: undefined };
vm.runInNewContext(executable, context, { filename: sourcePath.pathname });
await writeFile(outputPath, `${JSON.stringify(context.result, null, 2)}\n`, 'utf8');
console.log(`Exported ${context.result.lessons.length} lessons and ${context.result.modules.length} modules.`);
