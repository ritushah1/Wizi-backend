const fs = require('fs');
const path = require('path');

/**
 * Convert base64 pdf to file
 * @param {string} base64String - base64 content
 * @param {string} uploadDir - directory to save pdf
 * @param {string} fileName - pdf file name
 * @returns {string} saved file path
 */
async function saveBase64Pdf(base64String, uploadDir, fileName) {
  if (!base64String) return null;

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Remove data URI if present
  const base64Data = base64String.replace(
    /^data:application\/pdf;base64,/,
    ''
  );

  const filePath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(
    filePath,
    Buffer.from(base64Data, 'base64')
  );

  return filePath;
}

module.exports = {
    saveBase64Pdf
}