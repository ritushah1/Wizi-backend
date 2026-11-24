const fs = require("fs");
const path = require("path");

function base64Topng(dataUrl, fileNameWithExtension, filePath) {
  const base64String = dataUrl.split(",")[1];
  const base64Data = Buffer.from(base64String, "base64");
  const saveFile = path.join(filePath, fileNameWithExtension);

  fs.writeFile(saveFile, base64Data, (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
    }
  });
}

function attendancePhotobase64Topng(dataUrl, fileNameWithExtension, filePath) {
  const base64String = dataUrl.split(",")[1];
  const base64Data = Buffer.from(base64String, "base64");
  const saveFile = path.join(__dirname, "../", filePath, fileNameWithExtension);

  const filepath = path.join(__dirname, "../", filePath);

  // Create folder if it doesn't exist
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(filepath, { recursive: true });
  }

  fs.writeFile(saveFile, base64Data, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      throw err;
    }
  });
}

function fileToBase64(filePathWithFileName) {
  const saveFile = path.join(__dirname, "../", filePathWithFileName);

  if (fs.existsSync(saveFile)) {
    try {
      // Read the image file synchronously
      const image = fs.readFileSync(saveFile);
      // Convert image buffer to base64
      return `${image.toString("base64")}`;
    } catch (err) {
      console.error("Error reading image file:", err);
      return null;
    }
  } else {
    console.error(`File not found: ${saveFile}`);
    return null;
  }
}




function expenseReportFileToBase64(filePathWithFileName) {
  // Return "-" if no path provided
  if (!filePathWithFileName) return "-";

  try {
    const saveFile = path.join(__dirname, "../", filePathWithFileName);

    // Return "-" if file does not exist
    if (!fs.existsSync(saveFile)) {
      console.error(`File not found: ${saveFile}`);
      return "-";
    }

    // Check file size before reading
    const stats = fs.statSync(saveFile);

    // Return "-" if file is empty or corrupted (size 0)
    if (stats.size === 0) {
      console.warn(`File is empty: ${saveFile}`);
      return "-";
    }

    // Read the file
    const image = fs.readFileSync(saveFile);

    // Return "-" if buffer is empty
    if (!image || image.length === 0) {
      console.warn(`Empty buffer for file: ${saveFile}`);
      return "-";
    }

    // Convert to base64
    const base64 = image.toString("base64");

    // Return "-" if base64 conversion failed
    if (!base64 || base64.length === 0) {
      console.warn(`Base64 conversion failed for: ${saveFile}`);
      return "-";
    }

    return base64;

  } catch (err) {
    // Return "-" for any error (corrupted file, permission issue, etc.)
    console.error(`Error converting file to base64:`, err.message);
    return "-";
  }
}

module.exports = { base64Topng, attendancePhotobase64Topng, fileToBase64, expenseReportFileToBase64 };
