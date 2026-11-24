const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const IGNORE_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.vscode',
  'coverage',
  'dist',
  'build',
  'uploads',
  'logs',
]);

const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
];

let totalApis = 0;
let totalFiles = 0;

const fileApiCounts = [];

function isIgnoredDirectory(directoryName) {
  return IGNORE_DIRECTORIES.has(directoryName);
}

function getSourceFiles(directory) {
  const files = [];

  let entries;

  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    console.error(`Unable to read directory: ${directory}`);
    console.error(error.message);
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDirectory(entry.name)) {
        continue;
      }

      files.push(...getSourceFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (SOURCE_EXTENSIONS.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkFile(filePath) {
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(
      `Unable to read file: ${path.relative(PROJECT_ROOT, filePath)}`,
    );

    return;
  }

  /*
   * Matches:
   *
   * router.get('/users', ...)
   * router.post('/users', ...)
   * router.put('/users/:id', ...)
   * router.delete('/users/:id', ...)
   *
   * app.get('/users', ...)
   * app.post('/users', ...)
   */

  const routeRegex =
    /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(/g;

  let fileApiCount = 0;

  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toLowerCase();

    if (HTTP_METHODS.includes(method)) {
      fileApiCount++;
    }
  }

  if (fileApiCount > 0) {
    const relativeFile = path.relative(PROJECT_ROOT, filePath);

    fileApiCounts.push({
      file: relativeFile,
      count: fileApiCount,
    });

    totalApis += fileApiCount;
    totalFiles++;
  }
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('          API COUNT PER FILE');
  console.log('========================================');
  console.log('');

  const sourceFiles = getSourceFiles(PROJECT_ROOT);

  for (const file of sourceFiles) {
    checkFile(file);
  }

  // Sort highest API count first
  fileApiCounts.sort((a, b) => b.count - a.count);

  for (const item of fileApiCounts) {
    console.log(`${item.file.padEnd(60)} : ${item.count} APIs`);
  }

  console.log('');
  console.log('========================================');
  console.log(`Files containing APIs : ${totalFiles}`);
  console.log(`TOTAL APIs            : ${totalApis}`);
  console.log('========================================');
  console.log('');
}

main();
