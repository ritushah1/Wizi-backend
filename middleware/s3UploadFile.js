const fs = require('fs');
const path = require('path');
const { uploadS3FromFilePath, uploadBase64ToS3 } = require('../utils/s3.utils');
const { isStoreFileToS3Bucket, bucketName } = require('../utils/labelUtils');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const { generateThumbnail } = require('../utils/generateThumbnail.utils');

const isBase64Data = (value) => {
  if (typeof value !== 'string') return false;

  return value.startsWith('data:') && value.includes(';base64,');
};

const convertBase64ToBuffer = (base64String) => {
  let mimeType = 'application/octet-stream';
  let base64Data = base64String;

  const match = base64String.match(/^data:(.+);base64,/);

  if (match) {
    mimeType = match[1];
    base64Data = base64String.split(',')[1];
  }

  const buffer = Buffer.from(base64Data, 'base64');

  if (!buffer.length) {
    throw new Error('Invalid or empty base64 file');
  }

  return {
    buffer,
    mimeType,
  };
};

const uploadOrMoveFile = async ({
  sourcePath,
  fileKey,
  contentType = 'application/octet-stream',
  isDeleteLocalFile = false,
}) => {
  try {
    if (!sourcePath) {
      throw new Error('Source file path or base64 is required');
    }

    if (!fileKey) {
      throw new Error('File key is required');
    }

    const isBase64 = isBase64Data(sourcePath);

    // =========================
    // BASE64 STORAGE
    // =========================
    if (isBase64) {
      // =========================
      // S3 STORAGE
      // =========================
      if (isStoreFileToS3Bucket) {
        await uploadBase64ToS3({
          base64String: sourcePath,
          bucketName,
          s3Key: fileKey,
        });

        return fileKey;
      }

      // =========================
      // LOCAL STORAGE
      // =========================
      const { buffer, mimeType } = convertBase64ToBuffer(sourcePath);
      const localFileKey = `uploads/${fileKey}`;
      const destinationPath = path.join(process.cwd(), localFileKey);

      await fs.promises.mkdir(path.dirname(destinationPath), {
        recursive: true,
      });

      await fs.promises.writeFile(destinationPath, buffer);

      return localFileKey;
    }

    // =========================
    // NORMAL FILE STORAGE
    // =========================
    if (isStoreFileToS3Bucket) {
      await uploadS3FromFilePath({
        filePath: sourcePath,
        bucketName,
        fileKey,
        contentType,
      });

      // Delete temporary EC2 file
      if (isDeleteLocalFile) {
        await fs.promises.unlink(sourcePath);
      }

      return fileKey;
    }

    // =========================
    // LOCAL EC2 STORAGE
    // =========================
    const localFileKey = `uploads/${fileKey}`;

    const destinationPath = path.join(process.cwd(), localFileKey);

    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

    // Move temporary file to uploads folder
    await fs.promises.rename(sourcePath, destinationPath);

    return localFileKey;
  } catch (error) {
    console.error('Error uploading/moving file:', error);
    throw error;
  }
};

// Common Function to upload files to S3 or move to local storage based on configuration
const s3OrLocalUploadFiles = async ({
  attachment,
  companyMasterId,
  attachmentFileName,
  yearMonth,
  folderName,
  isDeleteLocalFile = true,
  contentType = 'application/octet-stream',
}) => {
  try {
    if (!attachment) return null;
    let finalYearMonth = yearMonth;
    if (!finalYearMonth) {
      const today = asiaKolkataDateTime(new Date()).slice(0, 10);
      const [year, month] = today.split('-');
      finalYearMonth = `${month}${year}`;
    }
    const fileName = `${attachmentFileName}`;
    const fileKey = `${companyMasterId}/${folderName}/${finalYearMonth}/${fileName}`;
    return await uploadOrMoveFile({
      sourcePath: attachment,
      fileKey,
      contentType,
      isDeleteLocalFile,
    });
  } catch (error) {
    console.error('Error uploading user task attachment:', error);
    throw error;
  }
};

const s3UploadVehicleMeterPhoto = async ({
  photo,
  userMasterID,
  companyMasterId,
  meterType,
  folderName,
}) => {
  try {
    if (!photo) return null;

    const today = asiaKolkataDateTime(new Date()).slice(0, 10);

    const [year, month] = today.split('-');

    const fileName = `vehicleMeter_${meterType}_${userMasterID}_${Date.now()}.png`;

    const fileKey = `${companyMasterId}/${folderName}/${month}${year}/${fileName}`;

    // ==========================================
    // BASE64 PHOTO
    // ==========================================
    if (isBase64Data(photo)) {
      // For base64, first create a temporary local file
      // because generateThumbnail() requires a file path.
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');

      await fs.promises.mkdir(tempDir, {
        recursive: true,
      });

      const tempFilePath = path.join(tempDir, fileName);

      const { buffer } = convertBase64ToBuffer(photo);

      await fs.promises.writeFile(tempFilePath, buffer);

      // Generate thumbnail from temporary original
      const thumbnail = await generateThumbnail({
        path: tempFilePath,
        filename: fileName,
        originalname: fileName,
        mimetype: 'image/png',
      });

      // Upload/move original
      const originalPath = await uploadOrMoveFile({
        sourcePath: photo,
        fileKey,
        contentType: 'image/png',
      });

      let thumbnailPath = null;

      if (thumbnail?.thumbnailPath) {
        const thumbnailFileKey = `${companyMasterId}/${folderName}/${month}${year}/${thumbnail.thumbnailFilename}`;

        thumbnailPath = await uploadOrMoveFile({
          sourcePath: thumbnail.thumbnailPath,
          fileKey: thumbnailFileKey,
          contentType: 'image/jpeg',
        });
      }

      // Remove temporary original if it still exists
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (error) {
        // Ignore if already removed
      }

      return {
        original: originalPath,
        thumbnail: thumbnailPath,
      };
    }

    // ==========================================
    // NORMAL FILE PATH
    // ==========================================

    // Generate thumbnail BEFORE uploadOrMoveFile()
    // because uploadOrMoveFile() removes the source file
    // when S3 storage is enabled.
    const thumbnail = await generateThumbnail({
      path: photo,
      filename: path.basename(photo),
      originalname: path.basename(photo),
      mimetype: 'image/png',
    });

    // Upload original
    const originalPath = await uploadOrMoveFile({
      sourcePath: photo,
      fileKey,
      contentType: 'image/png',
    });

    let thumbnailPath = null;

    if (thumbnail?.thumbnailPath) {
      const thumbnailFileKey = `${companyMasterId}/${folderName}/${month}${year}/${thumbnail.thumbnailFilename}`;

      thumbnailPath = await uploadOrMoveFile({
        sourcePath: thumbnail.thumbnailPath,
        fileKey: thumbnailFileKey,
        contentType: 'image/jpeg',
      });
    }

    return {
      original: originalPath,
      thumbnail: thumbnailPath,
    };
  } catch (error) {
    console.error('Error uploading vehicle meter photo:', error);
    throw error;
  }
};

const s3UploadSalarySlipPdf = async ({
  photo,
  userMasterID,
  companyMasterId,
  yearMonth,
  salarySlipType,
}) => {
  try {
    if (!photo) return null;

    const fileName = `${salarySlipType}_${yearMonth}_${userMasterID}_${Date.now()}.pdf`;

    const fileKey = `${companyMasterId}/${salarySlipType}/${yearMonth}/${fileName}`;

    // Upload original
    const originalPath = await uploadOrMoveFile({
      sourcePath: photo,
      fileKey,
      contentType: 'application/pdf',
    });

    return {
      original: originalPath,
    };
  } catch (error) {
    console.error('Error uploading vehicle meter photo:', error);
    throw error;
  }
};

module.exports = {
  s3OrLocalUploadFiles,
  s3UploadVehicleMeterPhoto,
  s3UploadSalarySlipPdf,
};
