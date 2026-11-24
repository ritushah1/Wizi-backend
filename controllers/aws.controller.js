const { minutesToSeconds } = require('../utils/commonUtilFunctions');
const { bucketName, mainApiUrl } = require('../utils/labelUtils');
const { getSignedS3Url } = require('../utils/s3.utils'); // adjust path
const message = require('../response_message/message');

exports.getSignedFileURL = async (req, res, next) => {
  try {
    let { url, expiredInMinutes = 60 } = req.body;

    // ✅ Validation
    if (!url) {
      return res.status(200).json({
        status: 400,
        message: 'File URL (key) is required',
      });
    }

    // ✅ Remove starting slash if exists
    url = url.replace(/^\/+/, '');

    // ✅ Validate expiry
    if (expiredInMinutes <= 0) {
      return res.status(200).json({
        status: 400,
        message: 'expiredInMinutes must be greater than 0',
      });
    }

    // ✅ Convert minutes → seconds
    const expiresIn = minutesToSeconds(expiredInMinutes);

    // ✅ Call your existing util
    const signedUrl = await getSignedS3Url(bucketName, url, expiresIn);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Signed File URL'),
      data: {
        key: url,
        signedUrl,
        expiresInMinutes: expiredInMinutes,
      },
    });
  } catch (error) {
    console.error('Signed URL API Error:', error);
    next(error);
  }
};

exports.getAwsSignedOrLocalFileURL = async (req, res, next) => {
  try {
    let { filePath, isS3Upload, expiredInMinutes = 60 } = req.tokenDetails;

    // ✅ Validation
    if (!filePath) {
      return res.status(200).json({
        status: 400,
        message: 'File URL (key) is required',
      });
    }
    if (!isS3Upload) {
      const signedUrl = `${mainApiUrl}${filePath}`;
      return res.status(200).json({
        status: 200,
        message: message.usermessage.fetchMessage('Signed File URL'),
        data: {
          key: filePath,
          signedUrl,
          expiresInMinutes: expiredInMinutes,
        },
      });
    }
    // ✅ Remove starting slash if exists
    filePath = filePath.replace(/^\/+/, '');

    // ✅ Validate expiry
    if (expiredInMinutes <= 0) {
      return res.status(200).json({
        status: 400,
        message: 'expiredInMinutes must be greater than 0',
      });
    }

    // ✅ Convert minutes → seconds
    const expiresIn = minutesToSeconds(expiredInMinutes);

    // ✅ Call your existing util
    const signedUrl = await getSignedS3Url(bucketName, filePath, expiresIn);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Signed File URL'),
      data: {
        key: filePath,
        signedUrl,
        expiresInMinutes: expiredInMinutes,
      },
    });
  } catch (error) {
    console.error('Signed URL API Error:', error);
    next(error);
  }
};
