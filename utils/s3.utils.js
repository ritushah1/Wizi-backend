const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const axios = require('axios');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadS3Stream = async (fileStream, mimetype, bucketName, fileKey) => {
  try {
    const uploader = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: fileKey,
        Body: fileStream,
        ContentType: mimetype,
      },
      leavePartsOnError: false,
    });

    const result = await uploader.done();
    return result.Location;
  } catch (err) {
    if (err.code == 'ENOENT') {
      console.log('file not found');
    } else {
      throw err;
    }
  }
};

const uploadS3File = async (file, bucketName, fileKey) => {
  if (!file || !file.path) {
    throw new Error('File not provided or path missing');
  }

  const fileStream = fs.createReadStream(file.path);
  return await uploadS3Stream(fileStream, file.mimetype, bucketName, fileKey);
};

const uploadS3FromUrl = async (fileUrl, bucketName, fileKey) => {
  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'stream',
  });

  const uploader = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: fileKey,
      Body: response.data,
      ContentType: response.headers['content-type'],
    },
    leavePartsOnError: false,
  });

  const result = await uploader.done();
  return result.Location;
};

const deleteS3File = async (bucketName, keyName) => {
  const deleteParam = {
    Bucket: bucketName,
    Key: keyName,
  };
  try {
    const response = await s3Client.send(new DeleteObjectCommand(deleteParam));
  } catch (err) {
    console.log(`Error deleting file : ${err}`);
    throw err;
  }
};

const getS3File = async (bucketName, keyOrUrl, returnType = 'base64') => {
  try {
    let objectKey = keyOrUrl;

    if (objectKey && typeof objectKey === 'string') {
      if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
        try {
          const urlObj = new URL(objectKey);
          let cleanPath = decodeURIComponent(urlObj.pathname).replace(
            /^\/+/,
            '',
          );
          if (bucketName && cleanPath.startsWith(`${bucketName}/`)) {
            cleanPath = cleanPath.substring(bucketName.length + 1);
          }
          objectKey = cleanPath;
        } catch (e) {}
      }
      if (objectKey.includes('?')) {
        objectKey = objectKey.split('?')[0];
      }
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await s3Client.send(command);

    // ✅ Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // ✅ Return based on type
    if (returnType === 'buffer') return buffer;
    return buffer.toString('base64');
  } catch (err) {
    console.error('Error fetching S3 file:', err.message);
    throw err;
  }
};

const uploadBase64ToS3 = async ({
  base64String,
  bucketName,
  s3Key,
  fileName, // optional (for logging/debug)
}) => {
  try {
    if (!base64String) {
      throw new Error('Base64 string is required');
    }

    // ✅ detect mime type
    const match = base64String.match(/^data:(.+);base64,/);

    let mimeType = 'application/octet-stream';
    let base64Data = base64String;

    if (match) {
      mimeType = match[1];
      base64Data = base64String.split(',')[1];
    }

    // ✅ validate base64
    // if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    //   throw new Error('Invalid base64 string');
    // }

    // ✅ convert to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer.length) {
      throw new Error('Empty file buffer');
    }

    // ✅ upload to S3
    const result = await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      success: true,
      key: s3Key,
      fileName,
    };
  } catch (err) {
    console.error('Base64 Upload Error:', err.message);
    throw err;
  }
};

const getSignedS3Url = async (
  bucketName,
  keyOrUrl,
  expiresIn = 3600,
  options = {},
) => {
  try {
    let objectKey = keyOrUrl;

    if (objectKey && typeof objectKey === 'string') {
      if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
        try {
          const urlObj = new URL(objectKey);
          let cleanPath = decodeURIComponent(urlObj.pathname).replace(
            /^\/+/,
            '',
          );
          if (bucketName && cleanPath.startsWith(`${bucketName}/`)) {
            cleanPath = cleanPath.substring(bucketName.length + 1);
          }
          objectKey = cleanPath;
        } catch (e) {
          console.warn('Could not parse objectKey as URL:', e);
        }
      }
      if (objectKey.includes('?')) {
        objectKey = objectKey.split('?')[0];
      }
    }

    const commandParams = {
      Bucket: bucketName,
      Key: objectKey,
    };

    if (options.responseContentDisposition) {
      commandParams.ResponseContentDisposition =
        options.responseContentDisposition;
    }

    if (options.responseContentType) {
      commandParams.ResponseContentType = options.responseContentType;
    } else if (objectKey && typeof objectKey === 'string') {
      const ext = objectKey.split('.').pop()?.toLowerCase();
      if (ext === 'gif') commandParams.ResponseContentType = 'image/gif';
      else if (ext === 'png') commandParams.ResponseContentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg')
        commandParams.ResponseContentType = 'image/jpeg';
      else if (ext === 'webp') commandParams.ResponseContentType = 'image/webp';
      else if (ext === 'svg')
        commandParams.ResponseContentType = 'image/svg+xml';
      else if (ext === 'mp4') commandParams.ResponseContentType = 'video/mp4';
      else if (ext === 'pdf')
        commandParams.ResponseContentType = 'application/pdf';
    }

    const command = new GetObjectCommand(commandParams);

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err.message);
    throw err;
  }
};

/**
 * Get S3 object metadata (size, content type, accept-ranges)
 */
const getS3ObjectMetadata = async (bucketName, key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType || 'video/mp4',
      etag: response.ETag,
      lastModified: response.LastModified,
      acceptRanges: response.AcceptRanges || 'bytes',
    };
  } catch (err) {
    console.error('Error fetching S3 object metadata:', err.message);
    throw err;
  }
};

/**
 * Get S3 object stream with optional byte range for chunk streaming
 */
const getS3ObjectStreamWithRange = async (bucketName, key, range) => {
  try {
    const commandParams = {
      Bucket: bucketName,
      Key: key,
    };

    if (range) {
      commandParams.Range = range;
    }

    const command = new GetObjectCommand(commandParams);
    const response = await s3Client.send(command);

    return {
      stream: response.Body,
      contentRange: response.ContentRange,
      contentLength: response.ContentLength,
      contentType: response.ContentType || 'video/mp4',
      acceptRanges: response.AcceptRanges || 'bytes',
      status: range ? 206 : 200,
    };
  } catch (err) {
    console.error('Error streaming S3 object with range:', err.message);
    throw err;
  }
};
const copyS3File = async ({
  sourceBucket,
  sourceKey,
  destinationBucket,
  destinationKey,
}) => {
  try {
    const command = new CopyObjectCommand({
      Bucket: destinationBucket,
      CopySource: `${sourceBucket}/${sourceKey}`,
      Key: destinationKey,
    });

    const response = await s3Client.send(command);
    return {
      success: true,
      destinationKey,
      url: `${destinationKey}`,
    };
  } catch (err) {
    console.error('Copy Error:', err.message);
    throw err;
  }
};
const moveS3File = async ({
  sourceBucket,
  sourceKey,
  destinationBucket,
  destinationKey,
}) => {
  try {
    // Step 1: Copy
    await copyS3File({
      sourceBucket,
      sourceKey,
      destinationBucket,
      destinationKey,
    });

    // Step 2: Delete old file
    await deleteS3File(sourceBucket, sourceKey);
    return {
      success: true,
      destinationKey,
      url: `${destinationKey}`,
    };
  } catch (err) {
    console.error('Move Error:', err.message);
    throw err;
  }
};
const listS3Objects = async (bucketName, prefix) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (err) {
    console.error('Error listing S3 files:', err.message);
    throw err;
  }
};

/**
 * Initialize S3 multipart upload
 * @param {string} bucketName - S3 bucket name
 * @param {string} fileKey - S3 object key
 * @param {string} contentType - File MIME type
 * @returns {Promise<{uploadId: string, key: string}>}
 */
const createMultipartUpload = async (bucketName, fileKey, contentType) => {
  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);

    return {
      uploadId: response.UploadId,
      key: fileKey,
      bucket: bucketName,
    };
  } catch (err) {
    console.error('❌ Error initializing multipart upload:', err.message);
    throw err;
  }
};

/**
 * Upload a single part in multipart upload
 * @param {string} bucketName - S3 bucket name
 * @param {string} fileKey - S3 object key
 * @param {string} uploadId - Multipart upload ID
 * @param {number} partNumber - Part number (1-indexed)
 * @param {Buffer} body - Chunk data
 * @returns {Promise<{etag: string, partNumber: number}>}
 */
const uploadPart = async (bucketName, fileKey, uploadId, partNumber, body) => {
  try {
    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    });

    const response = await s3Client.send(command);
    return {
      etag: response.ETag,
      partNumber: partNumber,
    };
  } catch (err) {
    console.error(`❌ Error uploading part ${partNumber}:`, err.message);
    throw err;
  }
};

/**
 * Complete S3 multipart upload
 * @param {string} bucketName - S3 bucket name
 * @param {string} fileKey - S3 object key
 * @param {string} uploadId - Multipart upload ID
 * @param {Array<{PartNumber: number, ETag: string}>} parts - Uploaded parts
 * @returns {Promise<{location: string, key: string}>}
 */
const completeMultipartUpload = async (
  bucketName,
  fileKey,
  uploadId,
  parts,
) => {
  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });

    const response = await s3Client.send(command);

    return {
      location: response.Location,
      key: response.Key,
      bucket: response.Bucket,
    };
  } catch (err) {
    console.error('❌ Error completing multipart upload:', err.message);
    throw err;
  }
};

/**
 * Abort S3 multipart upload
 * @param {string} bucketName - S3 bucket name
 * @param {string} fileKey - S3 object key
 * @param {string} uploadId - Multipart upload ID
 */
const abortMultipartUpload = async (bucketName, fileKey, uploadId) => {
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
    });

    await s3Client.send(command);
  } catch (err) {
    console.error('❌ Error aborting multipart upload:', err.message);
    throw err;
  }
};
const uploadS3FromFilePath = async ({
  filePath,
  bucketName,
  fileKey,
  contentType = 'application/octet-stream',
}) => {
  if (!filePath) {
    throw new Error('File path is required');
  }

  if (!bucketName) {
    throw new Error('S3 bucket name is required');
  }

  if (!fileKey) {
    throw new Error('S3 file key is required');
  }

  const fileStream = fs.createReadStream(filePath);

  return await uploadS3Stream(fileStream, contentType, bucketName, fileKey);
};
module.exports = {
  uploadS3File,
  uploadS3FromUrl,
  deleteS3File,
  getS3File,
  uploadBase64ToS3,
  getSignedS3Url,
  getS3ObjectMetadata,
  getS3ObjectStreamWithRange,
  copyS3File,
  moveS3File,
  listS3Objects,
  createMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  abortMultipartUpload,
  uploadS3FromFilePath,
};
