const { generateThumbnail } = require('../utils/generateThumbnail.utils');

const generateMulterThumbnails = async (req, res, next) => {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];

    if (!files.length) {
      return next();
    }

    for (const file of files) {
      const thumbnail = await generateThumbnail(file);

      if (thumbnail) {
        file.thumbnailPath = thumbnail.thumbnailPath;
        file.thumbnailFilename = thumbnail.thumbnailFilename;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
module.exports = { generateMulterThumbnails };
