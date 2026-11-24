const LmsContent = require('../models/lmsContent');
const message = require('../response_message/message');
const path = require('path');
const fs = require('fs').promises;
const {
  uploadS3File,
  getSignedS3Url,
  getS3ObjectMetadata,
  getS3ObjectStreamWithRange,
  createMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  abortMultipartUpload,
} = require('../utils/s3.utils');

// In-memory storage for upload sessions (for production, use Redis)
const uploadSessions = new Map();

/**
 * Upload content file (PDF, Video, Audio, Image, Document) to S3
 */
exports.uploadContentFile = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      return res.status(200).send({
        status: 400,
        message: 'Lesson ID is required',
      });
    }

    // Check if file was uploaded (multer stores file in req.file)
    if (!req.file) {
      return res.status(200).send({
        status: 400,
        message: 'No file uploaded',
      });
    }

    const uploadedFile = req.file;
    const contentType = req.body.contentType || req.body.type || 'DOCUMENT';
    const title = req.body.title || uploadedFile.originalname;

    // Get companyMasterID from request body or user details
    const companyMasterID =
      req.body.companyMasterID || req.userDetails?.companyMasterID;

    if (!companyMasterID) {
      return res.status(200).send({
        status: 400,
        message: 'Company Master ID is required',
      });
    }

    // Generate S3 key with company-specific path: lms/{companyMasterID}/{filename}
    const timestamp = Date.now();
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${timestamp}${fileExtension}`;
    const s3Key = `lms/${companyMasterID}/${fileName}`;

    // Get S3 bucket name from environment
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    console.log('📤 Uploading file to S3:', {
      lessonId,
      companyMasterID,
      s3Key,
      bucketName,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
    });

    // Prepare file object for S3 upload (multer format)
    const fileForUpload = {
      path: uploadedFile.path,
      mimetype: uploadedFile.mimetype,
      name: uploadedFile.originalname,
    };

    // Upload to S3
    const s3Url = await uploadS3File(fileForUpload, bucketName, s3Key);

    // Generate signed URL with 2-hour expiration (7200 seconds)
    const signedUrl = await getSignedS3Url(bucketName, s3Key, 7200);

    console.log('✅ File uploaded to S3 successfully');

    // Clean up temporary file
    try {
      await fs.unlink(uploadedFile.path);
    } catch (unlinkError) {
      console.warn('⚠️ Could not delete temporary file:', unlinkError);
    }

    // Return file information
    return res.status(200).json({
      status: 200,
      message: 'File uploaded successfully to S3',
      data: {
        id: `content-${timestamp}`, // Temporary ID for frontend
        fileKey: s3Key,
        key: s3Key,
        url: signedUrl, // Signed URL for immediate access
        fileName: uploadedFile.originalname,
        fileSize: uploadedFile.size,
        fileSizeBytes: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        contentType: contentType.toUpperCase(),
        type: contentType.toUpperCase(),
        title: title,
        lessonId: lessonId,
      },
    });
  } catch (err) {
    console.error('❌ Error uploading content file to S3:', err);

    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete temporary file:', unlinkError);
      }
    }

    return res.status(200).send({
      status: 500,
      message: 'Error uploading file to S3: ' + err.message,
    });
  }
};

/**
 * Upload course cover image to S3
 */
exports.uploadCourseCover = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(200).send({
        status: 400,
        message: 'Course ID is required',
      });
    }

    // Check if file was uploaded (multer stores file in req.file)
    if (!req.file) {
      return res.status(200).send({
        status: 400,
        message: 'No file uploaded',
      });
    }

    const uploadedFile = req.file;

    // Validate file type (only JPEG, JPG, PNG)
    const MIME_TYPE_JPEG = 'image/jpeg';
    const MIME_TYPE_PNG = 'image/png';

    const allowedMimeTypes = [MIME_TYPE_JPEG, MIME_TYPE_PNG, 'image/jpg'];
    const allowedExtensions = ['.jpeg', '.jpg', '.png'];
    const fileExt = path.extname(uploadedFile.originalname || '').toLowerCase();

    if (
      !allowedMimeTypes.includes(uploadedFile.mimetype?.toLowerCase()) &&
      !allowedExtensions.includes(fileExt)
    ) {
      // Clean up temporary file
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete temporary file:', unlinkError);
      }

      return res.status(200).send({
        status: 400,
        message:
          'Invalid file format. Only JPEG, JPG, and PNG image formats are allowed.',
      });
    }

    // Get companyMasterID from request body or user details
    const companyMasterID =
      req.body.companyMasterID || req.userDetails?.companyMasterID;

    if (!companyMasterID) {
      return res.status(200).send({
        status: 400,
        message: 'Company Master ID is required',
      });
    }

    // Generate S3 key with company-specific path: lms/{companyMasterID}/covers/{filename}
    const timestamp = Date.now();
    const fileExtension = path.extname(uploadedFile.originalname);
    const fileName = `${timestamp}${fileExtension}`;
    const s3Key = `lms/${companyMasterID}/covers/${fileName}`;

    // Get S3 bucket name from environment
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    console.log('📤 Uploading cover image to S3:', {
      courseId,
      companyMasterID,
      s3Key,
      bucketName,
    });

    // Prepare file object for S3 upload (multer format)
    const fileForUpload = {
      path: uploadedFile.path,
      mimetype: uploadedFile.mimetype,
      name: uploadedFile.originalname,
    };

    // Upload to S3
    const s3Url = await uploadS3File(fileForUpload, bucketName, s3Key);

    // Generate signed URL with 2-hour expiration (7200 seconds)
    const signedUrl = await getSignedS3Url(bucketName, s3Key, 7200);

    console.log('✅ Cover image uploaded to S3 successfully');

    // Clean up temporary file
    try {
      await fs.unlink(uploadedFile.path);
    } catch (unlinkError) {
      console.warn('⚠️ Could not delete temporary file:', unlinkError);
    }

    // Update course with cover image S3 key
    const Course = require('../models/course');
    await Course.update(
      {
        coverImageUrl: s3Key, // Store S3 key, not signed URL
        coverImageKey: s3Key,
      },
      {
        where: { id: courseId },
        user: req.userDetails,
      },
    );

    // Return file information
    return res.status(200).json({
      status: 200,
      message: 'Cover image uploaded successfully to S3',
      data: {
        fileKey: s3Key,
        key: s3Key,
        url: signedUrl, // Signed URL for immediate access
        fileName: uploadedFile.originalname,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
      },
    });
  } catch (err) {
    console.error('❌ Error uploading course cover to S3:', err);

    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete temporary file:', unlinkError);
      }
    }

    return res.status(200).send({
      status: 500,
      message: 'Error uploading cover image to S3: ' + err.message,
    });
  }
};

/**
 * Initialize chunked/multipart upload
 */
exports.initChunkedUpload = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const {
      fileName,
      fileType,
      totalChunks,
      uploadId,
      contentType,
      title,
      companyMasterID,
    } = req.body;

    if (!lessonId) {
      return res.status(200).send({
        status: 400,
        message: 'Lesson ID is required',
      });
    }

    if (!fileName || !fileType || !totalChunks || !uploadId) {
      return res.status(200).send({
        status: 400,
        message:
          'Missing required fields: fileName, fileType, totalChunks, uploadId',
      });
    }

    const companyId =
      companyMasterID ||
      req.body.companyMasterID ||
      req.userDetails?.companyMasterID;

    if (!companyId) {
      return res.status(200).send({
        status: 400,
        message: 'Company Master ID is required',
      });
    }

    // Generate S3 key with company-specific path
    const timestamp = Date.now();
    const fileExtension = path.extname(fileName);
    const sanitizedFileName = `${timestamp}${fileExtension}`;
    const s3Key = `lms/${companyId}/${sanitizedFileName}`;

    // Get S3 bucket name from environment
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    console.log('🚀 Initializing chunked upload:', {
      lessonId,
      fileName,
      fileType,
      totalChunks,
      uploadId,
      s3Key,
      bucketName,
    });

    // Initialize S3 multipart upload
    const multipartUpload = await createMultipartUpload(
      bucketName,
      s3Key,
      fileType,
    );

    // Store upload session (in production, use Redis with TTL)
    uploadSessions.set(uploadId, {
      uploadId,
      s3UploadId: multipartUpload.uploadId,
      fileKey: s3Key,
      fileName,
      fileType,
      lessonId,
      companyMasterID: companyId,
      totalChunks,
      contentType,
      title,
      uploadedParts: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    console.log('✅ Chunked upload initialized successfully');

    return res.status(200).json({
      status: 200,
      message: 'Chunked upload initialized successfully',
      data: {
        uploadId: multipartUpload.uploadId,
        key: s3Key,
        bucket: bucketName,
      },
    });
  } catch (err) {
    console.error('❌ Error initializing chunked upload:', err);
    return res.status(200).send({
      status: 500,
      message: 'Error initializing chunked upload: ' + err.message,
    });
  }
};

/**
 * Upload single chunk
 */
exports.uploadChunk = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { chunkIndex, uploadId, s3UploadId, fileKey, totalChunks } = req.body;

    if (!lessonId) {
      return res.status(200).send({
        status: 400,
        message: 'Lesson ID is required',
      });
    }

    if (!req.file) {
      return res.status(200).send({
        status: 400,
        message: 'No chunk file uploaded',
      });
    }

    if (chunkIndex === undefined || !uploadId) {
      return res.status(200).send({
        status: 400,
        message: 'Missing required fields: chunkIndex, uploadId',
      });
    }

    // Get upload session
    const session = uploadSessions.get(uploadId);

    if (!session) {
      return res.status(200).send({
        status: 400,
        message: 'Upload session not found or expired',
      });
    }

    const partNumber = parseInt(chunkIndex) + 1; // S3 part numbers are 1-indexed
    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    console.log(`📤 Uploading chunk ${partNumber} of ${session.totalChunks}:`, {
      lessonId,
      uploadId,
      s3UploadId: session.s3UploadId,
      fileKey: session.fileKey,
      chunkSize: req.file.size,
    });

    // Read chunk file into buffer
    const chunkBuffer = await fs.readFile(req.file.path);

    // Upload part to S3
    const uploadResult = await uploadPart(
      bucketName,
      session.fileKey,
      session.s3UploadId,
      partNumber,
      chunkBuffer,
    );

    // Store uploaded part info
    session.uploadedParts.push({
      PartNumber: uploadResult.partNumber,
      ETag: uploadResult.etag,
    });

    // Clean up temporary chunk file
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.warn('⚠️ Could not delete temporary chunk file:', unlinkError);
    }

    console.log(`✅ Chunk ${partNumber} uploaded successfully`);

    return res.status(200).json({
      status: 200,
      message: `Chunk ${partNumber} uploaded successfully`,
      data: {
        etag: uploadResult.etag,
        partNumber: uploadResult.partNumber,
      },
    });
  } catch (err) {
    console.error('❌ Error uploading chunk:', err);

    // Clean up temporary chunk file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete temporary chunk file:', unlinkError);
      }
    }

    return res.status(200).send({
      status: 500,
      message: 'Error uploading chunk: ' + err.message,
    });
  }
};

/**
 * Complete chunked upload
 */
exports.completeChunkedUpload = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { uploadId, parts } = req.body;

    if (!lessonId) {
      return res.status(200).send({
        status: 400,
        message: 'Lesson ID is required',
      });
    }

    if (!uploadId) {
      return res.status(200).send({
        status: 400,
        message: 'Upload ID is required',
      });
    }

    // Get upload session
    const session = uploadSessions.get(uploadId);

    if (!session) {
      return res.status(200).send({
        status: 400,
        message: 'Upload session not found or expired',
      });
    }

    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    console.log('🏁 Completing chunked upload:', {
      lessonId,
      uploadId,
      s3UploadId: session.s3UploadId,
      fileKey: session.fileKey,
      totalParts: session.uploadedParts.length,
    });

    // Use parts from request body if provided, otherwise use stored parts
    const partsToComplete =
      parts && parts.length > 0 ? parts : session.uploadedParts;

    // Sort parts by PartNumber (required by S3)
    partsToComplete.sort((a, b) => a.PartNumber - b.PartNumber);

    // Complete multipart upload
    const completeResult = await completeMultipartUpload(
      bucketName,
      session.fileKey,
      session.s3UploadId,
      partsToComplete,
    );

    // Generate signed URL for accessing the file
    const signedUrl = await getSignedS3Url(bucketName, session.fileKey, 7200);

    // Calculate total file size from session
    const totalSize = session.uploadedParts.length * 5 * 1024 * 1024; // Approximate

    console.log('✅ Chunked upload completed successfully');

    // Clean up session
    uploadSessions.delete(uploadId);

    return res.status(200).json({
      status: 200,
      message: 'File uploaded successfully via chunked upload',
      data: {
        id: `content-${Date.now()}`,
        fileKey: session.fileKey,
        key: session.fileKey,
        url: signedUrl,
        fileUrl: completeResult.location,
        signedUrl: signedUrl,
        fileName: session.fileName,
        fileSize: totalSize,
        fileSizeBytes: totalSize,
        mimeType: session.fileType,
        contentType: session.contentType?.toUpperCase() || 'DOCUMENT',
        type: session.contentType?.toUpperCase() || 'DOCUMENT',
        title: session.title || session.fileName,
        lessonId: session.lessonId,
        bucket: bucketName,
      },
    });
  } catch (err) {
    console.error('❌ Error completing chunked upload:', err);

    // Attempt to abort the multipart upload on error
    const session = uploadSessions.get(req.body.uploadId);
    if (session) {
      try {
        const bucketName =
          process.env.AWS_S3_BUCKET_NAME ||
          process.env.AWS_S3_BUCKET ||
          'tankhwapatra';
        await abortMultipartUpload(
          bucketName,
          session.fileKey,
          session.s3UploadId,
        );
        uploadSessions.delete(req.body.uploadId);
      } catch (abortErr) {
        console.error('❌ Error aborting multipart upload:', abortErr);
      }
    }

    return res.status(200).send({
      status: 500,
      message: 'Error completing chunked upload: ' + err.message,
    });
  }
};

/**
 * Stream video/media content in chunks supporting HTTP Range requests (206 Partial Content)
 */
exports.streamVideo = async (req, res, next) => {
  try {
    const s3Key =
      req.query.s3Key || req.query.key || req.body?.s3Key || req.body?.key;

    if (!s3Key) {
      return res.status(400).json({
        status: 400,
        message: 's3Key query parameter is required for streaming',
      });
    }

    const bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      'tankhwapatra';

    // Fetch object metadata to get total size and content type
    let metadata;
    try {
      metadata = await getS3ObjectMetadata(bucketName, s3Key);
    } catch (metaErr) {
      console.error('❌ Error getting metadata for stream:', metaErr.message);
      return res.status(404).json({
        status: 404,
        message: 'Media content not found on storage',
      });
    }

    const fileSize = metadata.contentLength;
    const contentType = metadata.contentType || 'video/mp4';
    const range = req.headers.range;

    if (range) {
      // Parse Range header (e.g., "bytes=0-1048576" or "bytes=0-")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      // Default chunk size to 2MB (2 * 1024 * 1024) if end is not specified, or clamp to fileSize - 1
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set({
          'Content-Range': `bytes */${fileSize}`,
        });
        return res.end();
      }

      const contentLength = end - start + 1;
      const byteRangeStr = `bytes=${start}-${end}`;

      console.log(
        `🎬 Streaming chunk [${byteRangeStr}] of ${fileSize} bytes for ${s3Key}`,
      );

      const s3StreamResult = await getS3ObjectStreamWithRange(
        bucketName,
        s3Key,
        byteRangeStr,
      );

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers':
          'Content-Range, Content-Length, Accept-Ranges',
      });

      // Stream the chunk to response
      s3StreamResult.stream.pipe(res);
    } else {
      // No Range header, stream from beginning
      console.log(
        `🎬 Streaming full/initial video for ${s3Key} (${fileSize} bytes)`,
      );

      const s3StreamResult = await getS3ObjectStreamWithRange(
        bucketName,
        s3Key,
        null,
      );

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers':
          'Content-Range, Content-Length, Accept-Ranges',
      });

      s3StreamResult.stream.pipe(res);
    }
  } catch (err) {
    console.error('❌ Error streaming video:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        status: 500,
        message: 'Error streaming video: ' + err.message,
      });
    }
  }
};
