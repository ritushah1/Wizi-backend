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

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.cjs',
  '.mjs',
]);

const IMPORT_REGEXES = [
  // require('../models/UserInbox')
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

  // import something from '../models/UserInbox'
  /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,

  // import('../models/UserInbox')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

let errorCount = 0;
let checkedImportCount = 0;

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

function findActualCaseSensitiveEntry(directory, requestedName) {
  if (!fs.existsSync(directory)) {
    return null;
  }

  let entries;

  try {
    entries = fs.readdirSync(directory);
  } catch (error) {
    return null;
  }

  // Exact case-sensitive match
  const exactMatch = entries.find(
    (entry) => entry === requestedName,
  );

  if (exactMatch) {
    return {
      name: exactMatch,
      exact: true,
    };
  }

  // Case-insensitive match
  // Detects Windows-valid but Linux-invalid paths.
  const caseInsensitiveMatch = entries.find(
    (entry) =>
      entry.toLowerCase() === requestedName.toLowerCase(),
  );

  if (caseInsensitiveMatch) {
    return {
      name: caseInsensitiveMatch,
      exact: false,
    };
  }

  return null;
}

function checkPathCase(importerFile, importPath) {
  // Only check relative imports.
  // Ignore npm packages and absolute imports.
  if (!importPath.startsWith('.')) {
    return;
  }

  checkedImportCount++;

  const importerDirectory = path.dirname(importerFile);

  const requestedPath = path.resolve(
    importerDirectory,
    importPath,
  );

  const parsedExtension = path.extname(requestedPath);

  const possibleFiles = [];

  // require('../models/UserInbox.js')
  if (parsedExtension) {
    possibleFiles.push(requestedPath);
  } else {
    // require('../models/UserInbox')
    possibleFiles.push(`${requestedPath}.js`);
    possibleFiles.push(`${requestedPath}.json`);
    possibleFiles.push(`${requestedPath}.node`);
  }

  let resolvedFile = null;

  for (const possibleFile of possibleFiles) {
    if (fs.existsSync(possibleFile)) {
      resolvedFile = possibleFile;
      break;
    }
  }

  // Check directory/index.js imports.
  if (!resolvedFile && fs.existsSync(requestedPath)) {
    const stat = fs.statSync(requestedPath);

    if (stat.isDirectory()) {
      const indexFiles = [
        path.join(requestedPath, 'index.js'),
        path.join(requestedPath, 'index.json'),
        path.join(requestedPath, 'index.node'),
      ];

      for (const indexFile of indexFiles) {
        if (fs.existsSync(indexFile)) {
          resolvedFile = indexFile;
          break;
        }
      }
    }
  }

  // If Windows cannot resolve it, skip it.
  if (!resolvedFile) {
    return;
  }

  // Get path relative to project root.
  const relativePath = path.relative(
    PROJECT_ROOT,
    resolvedFile,
  );

  const parts = relativePath.split(path.sep);

  let currentDirectory = PROJECT_ROOT;

  for (const requestedPart of parts) {
    const result = findActualCaseSensitiveEntry(
      currentDirectory,
      requestedPart,
    );

    if (!result) {
      return;
    }

    if (!result.exact) {
      errorCount++;

      console.error('');
      console.error('========================================');
      console.error('CASE-SENSITIVE IMPORT ERROR');
      console.error('========================================');

      console.error(
        `File:       ${path.relative(
          PROJECT_ROOT,
          importerFile,
        )}`,
      );

      console.error(`Import:     ${importPath}`);
      console.error(`Expected:   ${requestedPart}`);
      console.error(`Actual:     ${result.name}`);

      console.error('');

      console.error(
        'This import may work on Windows but fail on Linux/EC2.',
      );

      console.error('========================================');

      return;
    }

    currentDirectory = path.join(
      currentDirectory,
      result.name,
    );
  }
}

function checkFile(filePath) {
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(
      `Unable to read file: ${path.relative(
        PROJECT_ROOT,
        filePath,
      )}`,
    );

    return;
  }

  for (const regex of IMPORT_REGEXES) {
    regex.lastIndex = 0;

    let match;

    while ((match = regex.exec(content)) !== null) {
      const importPath = match[1];

      if (!importPath) {
        continue;
      }

      checkPathCase(filePath, importPath);
    }
  }
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('Checking case-sensitive imports...');
  console.log('========================================');
  console.log('');

  const sourceFiles = getSourceFiles(PROJECT_ROOT);

  console.log(
    `Source files found: ${sourceFiles.length}`,
  );

  for (const file of sourceFiles) {
    checkFile(file);
  }

  console.log('');
  console.log('========================================');
  console.log(
    'Case-sensitive import check completed',
  );
  console.log('========================================');

  console.log(
    `Imports checked: ${checkedImportCount}`,
  );

  console.log(
    `Errors found:    ${errorCount}`,
  );

  console.log('');

  if (errorCount > 0) {
    console.error(
      '❌ Case-sensitive import errors found.',
    );

    console.error(
      'Fix these imports before deploying to Linux/EC2.',
    );

    process.exit(1);
  }

  console.log(
    '✅ No case-sensitive import errors found.',
  );

  process.exit(0);
}

main();
