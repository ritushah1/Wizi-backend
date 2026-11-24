const PreboardingCustomizeFieldValue = require('../models/preboardingformcustomizevalue');
const PreboardingFormCustomize = require('../models/preboardingformcustomize');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

exports.getPreboardingIDCustomizeFieldValueById = async (req, res, next) => {
  try {
    const get_one_data = await PreboardingCustomizeFieldValue.findAll({
      where: {
        preboardingID: req.params.id,
      },
      include: [{ model: PreboardingFormCustomize }],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};
async function getMimeTypeFromBase64(base64String) {
  try {
    // Step 1: Extract MIME type from base64 header if present
    const match = base64String.match(/^data:(.+);base64,/);
    let mimeType = null;
    let cleanedBase64 = base64String;

    if (match) {
      mimeType = match[1];
      cleanedBase64 = base64String.replace(/^data:.+;base64,/, '');
    }

    // Step 2: Decode and inspect buffer
    const buffer = Buffer.from(cleanedBase64, 'base64');
    const fileTypeParser = await import('file-type');
    const fileType = await fileTypeParser.fileTypeFromBuffer(buffer);

    return {
      extension: fileType?.ext || getExtensionFromMimeType(mimeType) || null,
      cleanedBase64,
    };
  } catch (error) {
    console.error('Error detecting MIME type:', error.message);
    return null;
  }
}

function getExtensionFromMimeType(mimeType) {
  const mimeToExt = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  return mimeToExt[mimeType] || 'png';
}

exports.convertbase64Tofile = async (req, res, next) => {
  try {
    const limit = 200;
    let page = 1;
    let hasMore = true;
    let allData = [];
    let totalCount = 0;
    const outputDir = path.join(__dirname, '../uploads/preboarding');

    fs.mkdirSync(outputDir, { recursive: true }); // Ensure folder exists

    while (hasMore) {
      const offset = (page - 1) * limit;

      const { rows, count } =
        await PreboardingCustomizeFieldValue.findAndCountAll({
          where: {
            value: {
              [Op.ne]: '',
              [Op.not]: null,
            },
          },
          order: [['preboardingFormCustomizeValueID', 'ASC']],
          offset,
          limit,
          include: [
            {
              model: PreboardingFormCustomize,
              where: {
                inputType: {
                  [Op.or]: ['pdf', 'image'],
                },
              },
            },
          ],
        });

      const updateArray = [];

      for (const row of rows) {
        if (row.value) {
          let base64String = row.value;
          let { extension, cleanedBase64 } =
            (await getMimeTypeFromBase64(base64String)) || {};

          const buffer = Buffer.from(cleanedBase64, 'base64');
          const customizeValueId = row.preboardingFormCustomizeValueID;

          const filenameOnly = `${customizeValueId}_${Date.now()}.${extension}`;

          const relativePath = `uploads/preboarding/${filenameOnly}`;
          const absolutePath = path.join(__dirname, '../', relativePath);

          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

          fs.writeFileSync(absolutePath, buffer);

          updateArray.push(
            PreboardingCustomizeFieldValue.update(
              { value: relativePath },
              {
                where: {
                  preboardingFormCustomizeValueID: customizeValueId,
                },
              },
            ),
          );

          allData.push(customizeValueId);
        }
      }

      await Promise.all(updateArray);

      page++;
      hasMore = offset + rows.length < count;
      totalCount = count;
    }

    return res.status(200).json({
      status: 200,
      count: totalCount,
      data: allData,
    });
  } catch (err) {
    next(err);
  }
};
