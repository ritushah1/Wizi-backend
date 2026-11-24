const { Op } = require('sequelize');
const moment = require('moment');
const UserMaster = require('../models/userMaster');
const AttendanceLogs = require('../models/attendancelogs');
const {
  bucketName,
  mainApiUrl,
  isStoreFileToS3Bucket,
} = require('../utils/labelUtils');
const {
  uploadBase64ToS3,
  uploadS3FromUrl,
  uploadS3FromFilePath,
} = require('../utils/s3.utils');
const AttendanceLogsPhotoBackUp = require('../models/attendanceLogsPhotoBackUp');
const BiometricLogs = require('../models/biometricLogs');
const CanteenLogs = require('../models/canteenLogs');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpense = require('../models/userExpense');
const fs = require('fs');
const path = require('path');
const { generateThumbnail } = require('../utils/generateThumbnail.utils');
const vehicleUsage = require('../models/vehicleUsage');
const {
  s3UploadVehicleMeterPhoto,
  s3UploadSalarySlipPdf,
  s3OrLocalUploadFiles,
} = require('../middleware/s3UploadFile');
const HRSalarySlip = require('../models/hrSalarySlip');
const UserTasks = require('../models/User_Tasks');
const { attachmentFilePathFolderNames } = require('../utils/commonVars');
const EmployeeNda = require('../models/employeeNda');
const TaskRemark = require('../models/taskremark');
/*
 * -------------------------------------------------
 * GET CONTENT TYPE
 * -------------------------------------------------
 */

const getContentType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',

    '.pdf': 'application/pdf',

    '.doc': 'application/msword',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    '.xls': 'application/vnd.ms-excel',
    '.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    '.csv': 'text/csv',
    '.txt': 'text/plain',

    '.zip': 'application/zip',
    '.rar': 'application/vnd.rar',
    '.7z': 'application/x-7z-compressed',

    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',

    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',

    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

/*
 * -------------------------------------------------
 * GET LOCAL FILE PATH
 * -------------------------------------------------
 */

const getLocalFilePath = (attachment) => {
  if (path.isAbsolute(attachment)) {
    return attachment;
  }

  return path.resolve(process.cwd(), attachment);
};
exports.migrateAttendanceLogsToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 1000,
    } = req.body;

    console.log(`🚀 Migration Started for Company: ${companyMasterID}`);

    let userOffset = 0;
    let hasMoreUsers = true;

    const failedLogIds = []; // 🔥 collect failed logs
    const userWhereCondition = {
      companyMasterId: companyMasterID,
    };

    // ✅ add optional filter
    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }
    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      console.log(`👥 Users Fetched: ${users.length}`);

      for (const user of users) {
        const userMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (ID: ${userMasterID})`,
        );

        let logOffset = 0;
        let hasMoreLogs = true;

        while (hasMoreLogs) {
          const logs = await AttendanceLogs.findAll({
            where: {
              userMasterID,
              isS3Upload: false,
              s3Error: null, // ✅ ONLY pending
              [Op.and]: [
                { photo: { [Op.not]: null } },
                { photo: { [Op.ne]: '' } },
                { photo: { [Op.notIn]: ['manual', 'url'] } },
              ],
            },
            order: [['attendanceLogID', 'ASC']],
            limit: LOG_PAGE_SIZE,
            offset: logOffset,
          });

          if (!logs.length) {
            hasMoreLogs = false;
            break;
          }

          console.log(
            `📦 Logs Batch → OFFSET: ${logOffset}, COUNT: ${logs.length}`,
          );

          for (const log of logs) {
            const logId = log.attendanceLogID;
            const photo = log.photo;

            console.log(`➡️ Processing LogID: ${logId}`);

            // 🔥 Skip invalid
            if (
              !photo ||
              photo === 'manual' ||
              photo === 'url' ||
              photo.startsWith('http')
            ) {
              console.log(`⏭️ Skipped`);
              continue;
            }

            try {
              const logMoment = moment(log.logDateTime);
              const year = logMoment.format('YYYY');
              const month = logMoment.format('MM');
              const timestamp = logMoment.valueOf();

              const fileName = `attendanceLogs_${log.attendnaceFrom}_${userMasterID}_${timestamp}_${logId}.png`;
              const s3Key = `${user.companyMasterId}/attendanceLogs/${month}${year}/${fileName}`;

              // ✅ CASE 1: FILE PATH (URL Upload)
              if (
                photo.endsWith('.png') ||
                photo.endsWith('.jpg') ||
                photo.endsWith('.jpeg')
              ) {
                const fileUrl = `${mainApiUrl}${photo}`;

                console.log(`🌐 Upload from URL`);

                // ✅ STEP 1: Backup before upload
                await AttendanceLogsPhotoBackUp.findOrCreate({
                  where: { attendanceLogID: logId },
                  defaults: {
                    photo,
                    fileUrl,
                  },
                });
                // ✅ STEP 2: Upload to S3
                await uploadS3FromUrl(fileUrl, bucketName, s3Key);
              }

              // ✅ CASE 2: BASE64
              else if (photo.startsWith('/')) {
                console.log(`🧾 Upload Base64`);

                const dataUrl = `data:image/png;base64,${photo}`;

                await uploadBase64ToS3({
                  base64String: dataUrl,
                  bucketName,
                  s3Key,
                  fileName,
                });
              }

              // ✅ SUCCESS UPDATE
              await AttendanceLogs.update(
                {
                  isS3Upload: true,
                  s3Error: null,
                  photo: s3Key,
                },
                {
                  where: { attendanceLogID: logId },
                },
              );
            } catch (err) {
              console.error(`❌ Failed LogID: ${logId} | ${err.message}`);

              // 🔥 store error ONLY
              await AttendanceLogs.update(
                {
                  s3Error: err.message.substring(0, 500),
                },
                {
                  where: { attendanceLogID: logId },
                },
              );

              failedLogIds.push(logId); // 🔥 collect failed IDs
            }
          }

          logOffset += LOG_PAGE_SIZE;
        }
      }

      userOffset += USER_PAGE_SIZE;
    }

    console.log(`🎉 Migration Completed`);

    return res.status(200).json({
      status: 200,
      message: 'Migration Completed',
      failedLogIds, // 🔥 response
      totalFailed: failedLogIds.length,
    });
  } catch (err) {
    console.error('🔥 Migration Error:', err.message);
    next(err);
  }
};

exports.migrateBiometricLogsToS3 = async (req, res, next) => {
  let lastId = 0;
  let totalProcessed = 0;
  let failedLogIds = [];

  try {
    const { BATCH_SIZE = 500 } = req.body;
    console.log(`🚀 Migration Started`);
    while (true) {
      console.log(`\n📦 Fetching batch after ID: ${lastId}`);

      const logs = await BiometricLogs.findAll({
        where: {
          biometricLogsID: { [Op.gt]: lastId },
          isS3Upload: false,
          [Op.and]: [
            { Image64: { [Op.not]: null } },
            { Image64: { [Op.ne]: '' } },
          ],
        },
        order: [['biometricLogsID', 'ASC']],
        limit: BATCH_SIZE,
      });

      if (!logs.length) {
        console.log(`✅ No more records found`);
        break;
      }

      console.log(`📊 Batch size: ${logs.length}`);

      for (const log of logs) {
        const logId = log.biometricLogsID;

        try {
          const image64 = log.Image64;

          // Skip invalid/small data
          if (!image64 || image64.length < 100) {
            console.log(`⚠️ Skipping invalid base64 | ID: ${logId}`);
            continue;
          }

          const logMoment = moment(log.logDateTime);
          const year = logMoment.format('YYYY');
          const month = logMoment.format('MM');
          const timestamp = logMoment.valueOf();

          // ✅ Your data is JPEG (/9j/)
          const dataUrl = `data:image/jpeg;base64,${image64}`;

          const fileName = `biometricLogs_${log.Serialnumber}_${log.EmployeeCode}_${timestamp}_${logId}.jpg`;

          const s3Key = `biometricLogs/${log.Serialnumber}/${month}${year}/${fileName}`;

          console.log(`⬆️ Uploading | ID: ${logId} | Key: ${s3Key}`);

          await uploadBase64ToS3({
            base64String: dataUrl,
            bucketName,
            s3Key,
            fileName,
          });

          await BiometricLogs.update(
            {
              isS3Upload: true,
              Image64: s3Key,
            },
            {
              where: { biometricLogsID: logId },
            },
          );

          totalProcessed++;

          console.log(`✅ Success | ID: ${logId}`);
        } catch (err) {
          console.error(`❌ Failed | ID: ${logId} | Error: ${err.message}`);
          failedLogIds.push(logId);
        }
      }

      lastId = logs[logs.length - 1].biometricLogsID;

      console.log(`➡️ Moving cursor to ID: ${lastId}`);
      console.log(`📈 Total processed so far: ${totalProcessed}`);
    }

    console.log(`🎉 Migration Completed`);
    console.log(`❌ Failed Count: ${failedLogIds.length}`);

    return res.status(200).json({
      status: 200,
      message: 'Migration Completed',
      totalProcessed,
      totalFailed: failedLogIds.length,
      failedLogIds,
    });
  } catch (err) {
    console.error('🔥 Migration Error:', err.message);
    next(err);
  }
};

exports.migrateCanteenLogsToS3 = async (req, res, next) => {
  let lastId = 0;
  let totalProcessed = 0;
  let failedLogIds = [];

  try {
    const { BATCH_SIZE = 500 } = req.body;
    console.log(`🚀 CanteenLogs Migration Started`);

    while (true) {
      console.log(`\n📦 Fetching batch after ID: ${lastId}`);

      const logs = await CanteenLogs.findAll({
        where: {
          canteenLogsID: { [Op.gt]: lastId },
          isS3Upload: false,
          [Op.and]: [
            { photo: { [Op.not]: null } },
            { photo: { [Op.ne]: '' } },
            { photo: { [Op.notIn]: ['manual', 'url'] } }, // skip placeholders
          ],
        },
        order: [['canteenLogsID', 'ASC']],
        limit: BATCH_SIZE,
      });

      if (!logs.length) {
        console.log(`✅ No more records found`);
        break;
      }

      console.log(`📊 Batch size: ${logs.length}`);

      for (const log of logs) {
        const logId = log.canteenLogsID;

        try {
          const image64 = log.photo;

          // Skip invalid/small data
          if (!image64 || image64.length < 100) {
            console.log(`⚠️ Skipping invalid base64 | ID: ${logId}`);
            continue;
          }

          const logMoment = moment(log.logDateTime);
          const year = logMoment.format('YYYY');
          const month = logMoment.format('MM');
          const timestamp = logMoment.valueOf();

          // Assume JPEG by default
          const dataUrl = `data:image/jpeg;base64,${image64}`;
          const fileName = `canteenLogs_${log.userMasterID}_${log.serialNumber}_${timestamp}_${logId}.jpg`;
          const s3Key = `canteenLogs/${log.serialNumber || 'unknown'}/${month}${year}/${fileName}`;

          console.log(`⬆️ Uploading | ID: ${logId} | Key: ${s3Key}`);

          await uploadBase64ToS3({
            base64String: dataUrl,
            bucketName,
            s3Key,
            fileName,
          });

          await CanteenLogs.update(
            {
              isS3Upload: true,
              photo: s3Key,
            },
            {
              where: { canteenLogsID: logId },
            },
          );

          totalProcessed++;
          console.log(`✅ Success | ID: ${logId}`);
        } catch (err) {
          console.error(`❌ Failed | ID: ${logId} | Error: ${err.message}`);
          failedLogIds.push(logId);
        }
      }

      lastId = logs[logs.length - 1].canteenLogsID;

      console.log(`➡️ Moving cursor to ID: ${lastId}`);
      console.log(`📈 Total processed so far: ${totalProcessed}`);
    }

    console.log(`🎉 CanteenLogs Migration Completed`);
    console.log(`❌ Failed Count: ${failedLogIds.length}`);

    return res.status(200).json({
      status: 200,
      message: 'Migration Completed',
      totalProcessed,
      totalFailed: failedLogIds.length,
      failedLogIds,
    });
  } catch (err) {
    console.error('🔥 Migration Error:', err.message);
    next(err);
  }
};

exports.migrateExpenseAttachmentToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 100,
    } = req.body;

    /*
     * -------------------------------------------------
     * ATTACHMENT FIELD MAPPING
     * -------------------------------------------------
     */

    const ATTACHMENT_FIELDS = [
      {
        fileField: 'attachFile',
        s3FlagField: 's3UploadattachFile',
        thumbField: 'attachThumb',
      },
      {
        fileField: 'attachFile2',
        s3FlagField: 's3UploadattachFile2',
        thumbField: 'attach2Thumb',
      },
      {
        fileField: 'attachFile3',
        s3FlagField: 's3UploadattachFile3',
        thumbField: 'attach3Thumb',
      },
      {
        fileField: 'attachFile4',
        s3FlagField: 's3UploadattachFile4',
        thumbField: 'attach4Thumb',
      },
    ];

    /*
     * -------------------------------------------------
     * VALIDATE COMPANY
     * -------------------------------------------------
     */

    if (!companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'companyMasterID is required',
      });
    }

    console.log(
      `🚀 Expense Attachment S3 Migration Started | Company: ${companyMasterID}`,
    );

    /*
     * -------------------------------------------------
     * USER WHERE CONDITION
     * -------------------------------------------------
     */

    const userWhereCondition = {
      companyMasterId: companyMasterID,
    };

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    /*
     * -------------------------------------------------
     * RESULT ARRAYS
     * -------------------------------------------------
     */

    const failedFiles = [];
    const migratedFiles = [];

    /*
     * -------------------------------------------------
     * USER PAGINATION
     * -------------------------------------------------
     */

    let userOffset = 0;
    let hasMoreUsers = true;

    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      console.log(`👥 Users Fetched: ${users.length}`);

      /*
       * -------------------------------------------------
       * PROCESS EACH USER
       * -------------------------------------------------
       */

      for (const user of users) {
        const currentUserMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (${currentUserMasterID})`,
        );

        /*
         * -------------------------------------------------
         * CURSOR PAGINATION
         * -------------------------------------------------
         *
         * Do NOT use OFFSET for transactions because
         * records are updated during migration.
         */

        let lastTransactionID = 0;
        let hasMoreLogs = true;

        while (hasMoreLogs) {
          const findUserExpensetrans = await UserExpenseTransaction.findAll({
            where: {
              userExpenseTransactionID: {
                [Op.gt]: lastTransactionID,
              },
              migration: false,
              [Op.or]: ATTACHMENT_FIELDS.map(({ fileField }) => ({
                [Op.and]: [
                  {
                    [fileField]: {
                      [Op.not]: null,
                    },
                  },
                  {
                    [fileField]: {
                      [Op.ne]: '',
                    },
                  },
                ],
              })),
            },

            include: [
              {
                model: UserExpense,
                as: 'userExpense',
                required: true,
                paranoid: false,
                where: {
                  userMasterID: currentUserMasterID,
                },
                attributes: ['userMasterID', 'expense_date'],
              },
            ],

            order: [['userExpenseTransactionID', 'ASC']],
            paranoid: false,
            limit: LOG_PAGE_SIZE,
          });

          if (!findUserExpensetrans.length) {
            hasMoreLogs = false;
            break;
          }

          console.log(
            `📦 Transaction Batch → LAST ID: ${lastTransactionID}, COUNT: ${findUserExpensetrans.length}`,
          );

          /*
           * -------------------------------------------------
           * PROCESS TRANSACTIONS
           * -------------------------------------------------
           */

          for (const expense of findUserExpensetrans) {
            const userExpenseTransactionID = expense.userExpenseTransactionID;

            lastTransactionID = userExpenseTransactionID;

            console.log(
              `\n➡️ Processing Transaction: ${userExpenseTransactionID}`,
            );

            /*
             * -------------------------------------------------
             * PROCESS ALL 4 ATTACHMENTS
             * -------------------------------------------------
             */

            for (const {
              fileField,
              s3FlagField,
              thumbField,
            } of ATTACHMENT_FIELDS) {
              const attachment = expense[fileField];

              /*
               * -------------------------------------------------
               * SKIP EMPTY ATTACHMENT
               * -------------------------------------------------
               */
              if (
                attachment === null ||
                attachment === undefined ||
                attachment === ''
              ) {
                continue;
              }

              try {
                console.log(`📎 ${fileField}: ${attachment}`);

                /*
                 * -------------------------------------------------
                 * EXPENSE DATE
                 * -------------------------------------------------
                 */

                const expenseDate = expense.userExpense?.expense_date;

                const logMoment = moment(expenseDate);

                const year = logMoment.isValid()
                  ? logMoment.format('YYYY')
                  : moment().format('YYYY');

                const month = logMoment.isValid()
                  ? logMoment.format('MM')
                  : moment().format('MM');

                const yearMonth = `${month}${year}`;
                /*
                 * -------------------------------------------------
                 * ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                let originalFileName = path.basename(attachment);

                /*
                 * Remove unsafe characters from filename.
                 */
                originalFileName = originalFileName.replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_',
                );

                /*
                 * If filename is missing, fallback.
                 */
                if (
                  !originalFileName ||
                  originalFileName === '.' ||
                  originalFileName === '..'
                ) {
                  originalFileName = `${fileField}.file`;
                }

                /*
                 * -------------------------------------------------
                 * FILE EXTENSION
                 * -------------------------------------------------
                 */

                const extension = path.extname(originalFileName);

                const baseName = path.basename(originalFileName, extension);

                /*
                 * -------------------------------------------------
                 * FINAL ORIGINAL FILE NAME
                 * -------------------------------------------------
                 *
                 * Example:
                 *
                 * invoice.pdf
                 *
                 * becomes:
                 *
                 * invoice_12345_68.pdf
                 */

                const fileName = `${baseName}_${userExpenseTransactionID}_${currentUserMasterID}${extension}`;

                /*
                 * -------------------------------------------------
                 * THUMBNAIL FILE NAME
                 * -------------------------------------------------
                 *
                 * Example:
                 *
                 * invoice_12345_68_thumb.jpg
                 */

                /*
                 * -------------------------------------------------
                 * CONTENT TYPE
                 * -------------------------------------------------
                 */

                const contentType = getContentType(originalFileName);
                console.log(`📄 Content-Type: ${contentType}`);
                console.log(`📁 Expense Folder: ${yearMonth}`);

                /*
                 * -------------------------------------------------
                 * LOCAL ORIGINAL FILE
                 * -------------------------------------------------
                 */

                const localFilePath = getLocalFilePath(attachment);

                /*
                 * -------------------------------------------------
                 * CHECK ORIGINAL FILE EXISTS
                 * -------------------------------------------------
                 */
                await fs.promises.access(localFilePath, fs.constants.F_OK);
                console.log(`💾 Local file found: ${localFilePath}`);

                /*
                 * -------------------------------------------------
                 * GENERATE THUMBNAIL FIRST
                 * -------------------------------------------------
                 *
                 * IMPORTANT:
                 *
                 * -> deletes original local file
                 *
                 * Therefore thumbnail MUST be
                 * generated before uploading original.
                 * -------------------------------------------------
                 */

                const thumbnail = await generateThumbnail({
                  path: localFilePath,
                  filename: fileName,
                  mimetype: contentType,
                });

                let thumbnailS3Key = null;

                if (thumbnail) {
                  console.log(
                    `🖼️ Thumbnail generated: ${thumbnail.thumbnailPath}`,
                  );
                } else {
                  console.log(`ℹ️ No thumbnail generated for ${fileField}`);
                }

                /*
                 * -------------------------------------------------
                 * UPLOAD ORIGINAL FILE
                 * -------------------------------------------------
                 */

                const s3Key = await s3OrLocalUploadFiles({
                  attachment: localFilePath,
                  companyMasterId: user.companyMasterId,
                  attachmentFileName: fileName,
                  yearMonth,
                  contentType,
                  folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
                  isDeleteLocalFile: false,
                });

                console.log(`✅ Original uploaded: ${s3Key}`);

                /*
                 * -------------------------------------------------
                 * UPLOAD THUMBNAIL
                 * -------------------------------------------------
                 */

                if (thumbnail) {
                  thumbnailS3Key = await s3OrLocalUploadFiles({
                    attachment: thumbnail.thumbnailPath,
                    companyMasterId: user.companyMasterId,
                    attachmentFileName: thumbnail.thumbnailFilename,
                    yearMonth,
                    contentType: 'image/jpeg',
                    folderName:
                      attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
                    isDeleteLocalFile: false,
                  });
                  console.log(`✅ Thumbnail uploaded: ${thumbnailS3Key}`);
                }

                /*
                 * -------------------------------------------------
                 * DATABASE UPDATE
                 * -------------------------------------------------
                 */

                const updateData = {
                  [fileField]: s3Key,
                  [s3FlagField]: isStoreFileToS3Bucket,
                  migration: true,
                };

                /*
                 * Store thumbnail path only if
                 * thumbnail was generated.
                 */

                if (thumbnailS3Key) {
                  updateData[thumbField] = thumbnailS3Key;
                }

                await UserExpenseTransaction.update(updateData, {
                  where: {
                    userExpenseTransactionID,
                  },
                  paranoid: false,
                });

                console.log(`✅ ${fileField} migrated successfully`);

                /*
                 * -------------------------------------------------
                 * SUCCESS LOG
                 * -------------------------------------------------
                 */

                migratedFiles.push({
                  userExpenseTransactionID,
                  userMasterID: currentUserMasterID,
                  fileField,
                  thumbField,
                  oldPath: attachment,
                  s3Key,
                  thumbnailS3Key,
                });
              } catch (fileError) {
                /*
                 * -------------------------------------------------
                 * FILE FAILURE
                 * -------------------------------------------------
                 */

                const failureLog = {
                  userExpenseTransactionID,
                  userMasterID: currentUserMasterID,

                  fileField,
                  thumbField,

                  attachment,

                  error: fileError.message,
                };

                console.error(`❌ ${fileField} migration failed`, failureLog);

                failedFiles.push(failureLog);

                /*
                 * Save failure permanently.
                 */

                await migrationFailureLog(
                  failureLog,
                  'expense-s3-migration-failed',
                );

                /*
                 * Continue next attachment.
                 */

                continue;
              }
            }
          }
        }
      }

      /*
       * -------------------------------------------------
       * NEXT USER PAGE
       * -------------------------------------------------
       */

      userOffset += USER_PAGE_SIZE;
    }

    /*
     * -------------------------------------------------
     * MIGRATION COMPLETED
     * -------------------------------------------------
     */

    console.log(`🎉 Expense Attachment S3 Migration Completed`);

    console.log(`✅ Migrated Files: ${migratedFiles.length}`);

    console.log(`❌ Failed Files: ${failedFiles.length}`);

    return res.status(200).json({
      status: 200,

      message: 'Expense attachment migration completed',

      totalMigrated: migratedFiles.length,

      totalFailed: failedFiles.length,

      migratedFiles,

      failedFiles,
    });
  } catch (err) {
    console.error('🔥 Expense Attachment Migration Error:', err);

    next(err);
  }
};

/*
 * =====================================================
 * MIGRATION FAILURE LOG
 * =====================================================
 */
const migrationFailureLog = async (failureLog, fileName) => {
  try {
    const migrationLogDir = path.join(process.cwd(), 'logs', 's3migration');

    const migrationLogFile = path.join(migrationLogDir, `${fileName}.log`);

    await fs.promises.mkdir(migrationLogDir, {
      recursive: true,
    });

    await fs.promises.appendFile(
      migrationLogFile,
      `${JSON.stringify(failureLog)}\n`,
      'utf8',
    );
  } catch (logError) {
    console.error('❌ Failed to write migration error log:', logError.message);
  }
};

exports.migrateVehicleMeterToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 1000,
    } = req.body;

    console.log(`🚀 Migration Started for Company: ${companyMasterID}`);

    let userOffset = 0;
    let hasMoreUsers = true;

    const failedLogIds = [];

    // =========================================================
    // 🔥 MIGRATION COUNTERS
    // =========================================================
    let totalUsers = 0;
    let totalVehicleMeterLogs = 0;

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    let totalStartingMigrated = 0;
    let totalEndingMigrated = 0;

    let totalStartingAlreadyS3 = 0;
    let totalEndingAlreadyS3 = 0;

    const userWhereCondition = {};

    if (companyMasterID) {
      userWhereCondition.companyMasterId = companyMasterID;
    }

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      totalUsers += users.length;

      console.log(
        `👥 Users Fetched: ${users.length} | Total Users: ${totalUsers}`,
      );

      for (const user of users) {
        const userMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (ID: ${userMasterID})`,
        );

        let logOffset = 0;
        let hasMoreLogs = true;

        while (hasMoreLogs) {
          const vehicleMeterData = await vehicleUsage.findAll({
            where: {
              userMasterID: userMasterID,
              migration: false,
              [Op.or]: [
                {
                  [Op.and]: [
                    { startingMeterImage: { [Op.not]: null } },
                    { startingMeterImage: { [Op.ne]: '' } },
                  ],
                },
                {
                  [Op.and]: [
                    { endingMeterImage: { [Op.not]: null } },
                    { endingMeterImage: { [Op.ne]: '' } },
                  ],
                },
              ],
            },
            order: [['vehicleUsageID', 'ASC']],
            limit: LOG_PAGE_SIZE,
            offset: logOffset,
          });

          if (!vehicleMeterData.length) {
            hasMoreLogs = false;
            break;
          }

          totalVehicleMeterLogs += vehicleMeterData.length;

          console.log(
            `📦 Logs Batch → OFFSET: ${logOffset}, COUNT: ${vehicleMeterData.length} | ` +
              `Total Logs: ${totalVehicleMeterLogs}`,
          );

          for (const log of vehicleMeterData) {
            const logId = log.vehicleUsageID;
            const startingMeterImagePhoto = log.startingMeterImage;
            const endingMeterImagePhoto = log.endingMeterImage;

            totalProcessed++;

            console.log(
              `➡️ Processing vehicleUsageID: ${logId} | ` +
                `Processed: ${totalProcessed}`,
            );

            // =====================================================
            // 🔥 SKIP INVALID
            // =====================================================
            if (!startingMeterImagePhoto && !endingMeterImagePhoto) {
              totalSkipped++;

              console.log(
                `⏭️ Skipped vehicleUsageID: ${logId} | ` +
                  `Skipped: ${totalSkipped}`,
              );

              continue;
            }

            try {
              let startingMeterImage = null;
              let startingMeterThumb = null;

              // =====================================================
              // STARTING METER
              // =====================================================
              if (startingMeterImagePhoto) {
                if (!log.isS3Starting) {
                  console.log(
                    `⬆️ Uploading START image | vehicleUsageID: ${logId}`,
                  );

                  const attachmentPath = await s3UploadVehicleMeterPhoto({
                    photo: `data:image/png;base64,${startingMeterImagePhoto}`,
                    userMasterID: userMasterID,
                    companyMasterId: user.companyMasterId,
                    meterType: 'start',
                    folderName: attachmentFilePathFolderNames.VEHICLE_METER,
                  });

                  startingMeterImage = attachmentPath.original || null;
                  startingMeterThumb = attachmentPath.thumbnail || null;

                  totalStartingMigrated++;

                  console.log(
                    `✅ START migrated | vehicleUsageID: ${logId} | ` +
                      `Start Migrated: ${totalStartingMigrated}`,
                  );
                } else {
                  startingMeterImage = startingMeterImagePhoto || null;
                  startingMeterThumb = log.startingMeterThumb || null;

                  totalStartingAlreadyS3++;

                  console.log(
                    `ℹ️ START already S3 | vehicleUsageID: ${logId} | ` +
                      `Already S3: ${totalStartingAlreadyS3}`,
                  );
                }
              }

              // =====================================================
              // ENDING METER
              // =====================================================
              let endingMeterImage = null;
              let endingMeterThumb = null;

              if (endingMeterImagePhoto) {
                if (!log.isS3Ending) {
                  console.log(
                    `⬆️ Uploading END image | vehicleUsageID: ${logId}`,
                  );

                  const attachmentPath = await s3UploadVehicleMeterPhoto({
                    photo: `data:image/png;base64,${endingMeterImagePhoto}`,
                    userMasterID: userMasterID,
                    companyMasterId: user.companyMasterId,
                    meterType: 'end',
                    folderName: attachmentFilePathFolderNames.VEHICLE_METER,
                  });

                  endingMeterImage = attachmentPath.original || null;
                  endingMeterThumb = attachmentPath.thumbnail || null;

                  totalEndingMigrated++;

                  console.log(
                    `✅ END migrated | vehicleUsageID: ${logId} | ` +
                      `End Migrated: ${totalEndingMigrated}`,
                  );
                } else {
                  endingMeterImage = endingMeterImagePhoto || null;
                  endingMeterThumb = log.endingMeterThumb || null;

                  totalEndingAlreadyS3++;

                  console.log(
                    `ℹ️ END already S3 | vehicleUsageID: ${logId} | ` +
                      `Already S3: ${totalEndingAlreadyS3}`,
                  );
                }
              }

              // =====================================================
              // ✅ SUCCESS UPDATE
              // =====================================================
              await vehicleUsage.update(
                {
                  startingMeterImage: startingMeterImage,
                  startingMeterThumb,
                  endingMeterImage: endingMeterImage,
                  endingMeterThumb,
                  isS3Starting: isStoreFileToS3Bucket,
                  isS3Ending: isStoreFileToS3Bucket,
                  migration: true,
                },
                {
                  where: { vehicleUsageID: logId },
                },
              );

              console.log(
                `💾 DB Updated | vehicleUsageID: ${logId} | ` +
                  `Processed: ${totalProcessed} | ` +
                  `Start Migrated: ${totalStartingMigrated} | ` +
                  `End Migrated: ${totalEndingMigrated} | ` +
                  `Failed: ${totalFailed}`,
              );
            } catch (fileError) {
              // =====================================================
              // ❌ FILE FAILURE
              // =====================================================

              totalFailed++;

              const failureLog = {
                vehicleUsageID: logId,
                userMasterID,
                error: fileError.message,
              };

              console.error(
                `❌ Migration Failed | ` +
                  `vehicleUsageID: ${logId} | ` +
                  `Failed: ${totalFailed}`,
                failureLog,
              );

              failedLogIds.push(failureLog);

              await migrationFailureLog(
                failureLog,
                'vehicleMeter-s3-migration-failed',
              );

              continue;
            }
          }

          // =====================================================
          // 🔥 BATCH PROGRESS
          // =====================================================
          console.log(
            `\n📊 MIGRATION PROGRESS
             ├─ Users: ${totalUsers}
             ├─ Logs Found: ${totalVehicleMeterLogs}
             ├─ Processed: ${totalProcessed}
             ├─ Start Migrated: ${totalStartingMigrated}
             ├─ End Migrated: ${totalEndingMigrated}
             ├─ Start Already S3: ${totalStartingAlreadyS3}
             ├─ End Already S3: ${totalEndingAlreadyS3}
             ├─ Skipped: ${totalSkipped}
             └─ Failed: ${totalFailed}\n`,
          );

          logOffset += LOG_PAGE_SIZE;
        }

        console.log(`🏁 User Completed: ${user.displayName} (${userMasterID})`);
      }

      userOffset += USER_PAGE_SIZE;
    }

    // =========================================================
    // 🎉 FINAL SUMMARY
    // =========================================================

    const migrationSummary = {
      totalUsers,
      totalVehicleMeterLogs,
      totalProcessed,
      totalStartingMigrated,
      totalEndingMigrated,
      totalStartingAlreadyS3,
      totalEndingAlreadyS3,
      totalSkipped,
      totalFailed,
    };

    console.log(
      `\n🎉 Migration Completed
      =========================================
      👥 Users              : ${totalUsers}
      📦 Vehicle Logs       : ${totalVehicleMeterLogs}
      ⚙️ Processed          : ${totalProcessed}
      🚀 Start Migrated     : ${totalStartingMigrated}
      🚀 End Migrated       : ${totalEndingMigrated}
      ☁️ Start Already S3   : ${totalStartingAlreadyS3}
      ☁️ End Already S3     : ${totalEndingAlreadyS3}
      ⏭️ Skipped             : ${totalSkipped}
      ❌ Failed              : ${totalFailed}
      =========================================
      `,
    );

    return res.status(200).json({
      status: 200,
      message: 'Migration Completed',

      // 🔥 Migration summary
      migrationSummary,

      // 🔥 Failed records
      failedLogIds,
    });
  } catch (err) {
    console.error('🔥 Migration Error:', err.message);
    next(err);
  }
};

exports.migrateSalarySlipToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 1000,
    } = req.body;

    console.log(`🚀 Migration Started for Company: ${companyMasterID}`);

    let userOffset = 0;
    let hasMoreUsers = true;

    const failedLogIds = [];

    // =========================================================
    // 🔥 MIGRATION COUNTERS
    // =========================================================
    let totalUsers = 0;
    let totalSalarySlipLogs = 0;

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    let totalMigrated = 0;
    let totalAlreadyS3 = 0;

    // =========================================================
    // 🔥 USER WHERE CONDITION
    // =========================================================
    const userWhereCondition = {};

    if (companyMasterID) {
      userWhereCondition.companyMasterId = companyMasterID;
    }

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    // =========================================================
    // 🔥 USER PAGINATION
    // =========================================================
    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      totalUsers += users.length;

      console.log(
        `👥 Users Fetched: ${users.length} | Total Users: ${totalUsers}`,
      );

      // =========================================================
      // 🔥 PROCESS EACH USER
      // =========================================================
      for (const user of users) {
        const currentUserMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (ID: ${currentUserMasterID})`,
        );

        let logOffset = 0;
        let hasMoreLogs = true;

        // =========================================================
        // 🔥 SALARY SLIP PAGINATION
        // =========================================================
        while (hasMoreLogs) {
          const logs = await HRSalarySlip.findAll({
            where: {
              userMasterID: currentUserMasterID,
              migration: false,
            },
            order: [['hrSalarySlipID', 'ASC']],
            limit: LOG_PAGE_SIZE,
            offset: logOffset,
          });

          if (!logs.length) {
            hasMoreLogs = false;
            break;
          }

          totalSalarySlipLogs += logs.length;

          console.log(
            `📦 Logs Batch → OFFSET: ${logOffset}, COUNT: ${logs.length} | ` +
              `Total Logs: ${totalSalarySlipLogs}`,
          );

          // =====================================================
          // 🔥 PROCESS SALARY SLIPS
          // =====================================================
          for (const log of logs) {
            const logId = log.hrSalarySlipID;
            const photo = log.path;

            totalProcessed++;

            console.log(
              `➡️ Processing hrSalarySlipID: ${logId} | ` +
                `Processed: ${totalProcessed}`,
            );

            // =====================================================
            // 🔥 SKIP INVALID
            // =====================================================
            if (!photo) {
              totalSkipped++;

              console.log(
                `⏭️ Skipped hrSalarySlipID: ${logId} | ` +
                  `Skipped: ${totalSkipped}`,
              );

              continue;
            }

            try {
              // ===================================================
              // 🔥 SALARY SLIP PDF UPLOAD
              // ===================================================
              console.log(
                `⬆️ Uploading Salary Slip | hrSalarySlipID: ${logId}`,
              );
              const dataUrl = `data:application/pdf;base64,${photo}`;

              const salarySlipStoredPath = await s3UploadSalarySlipPdf({
                photo: dataUrl,
                userMasterID: currentUserMasterID,
                companyMasterId: user.companyMasterId,
                yearMonth: log.salaryYYYYMM,
                salarySlipType: 'salarySlip',
              });

              const salarySlipPath = salarySlipStoredPath?.original || null;

              if (!salarySlipPath) {
                throw new Error(
                  'S3 upload completed but original salary slip path was not returned',
                );
              }

              // ===================================================
              // ✅ SUCCESS UPDATE
              // ===================================================
              await HRSalarySlip.update(
                {
                  isS3Upload: isStoreFileToS3Bucket,
                  path: salarySlipPath,
                  migration: true,
                },
                {
                  where: {
                    hrSalarySlipID: logId,
                  },
                },
              );

              totalMigrated++;

              console.log(
                `✅ Salary Slip migrated | hrSalarySlipID: ${logId} | ` +
                  `Migrated: ${totalMigrated}`,
              );

              console.log(
                `💾 DB Updated | hrSalarySlipID: ${logId} | ` +
                  `Processed: ${totalProcessed} | ` +
                  `Migrated: ${totalMigrated} | ` +
                  `Failed: ${totalFailed}`,
              );
            } catch (fileError) {
              // ===================================================
              // ❌ FILE FAILURE
              // ===================================================
              totalFailed++;

              const failureLog = {
                hrSalarySlipID: logId,
                userMasterID: currentUserMasterID,
                error: fileError.message,
              };

              console.error(
                `❌ Migration Failed | ` +
                  `hrSalarySlipID: ${logId} | ` +
                  `Failed: ${totalFailed}`,
                failureLog,
              );

              failedLogIds.push(failureLog);

              await migrationFailureLog(
                failureLog,
                'salarySlip-s3-migration-failed',
              );

              continue;
            }
          }

          // =====================================================
          // 🔥 BATCH PROGRESS
          // =====================================================
          console.log(
            `\n📊 MIGRATION PROGRESS
             ├─ Users: ${totalUsers}
             ├─ Salary Slip Logs Found: ${totalSalarySlipLogs}
             ├─ Processed: ${totalProcessed}
             ├─ Migrated: ${totalMigrated}
             ├─ Already S3: ${totalAlreadyS3}
             ├─ Skipped: ${totalSkipped}
             └─ Failed: ${totalFailed}\n`,
          );

          logOffset += LOG_PAGE_SIZE;
        }

        console.log(
          `🏁 User Completed: ${user.displayName} (${currentUserMasterID})`,
        );
      }

      userOffset += USER_PAGE_SIZE;
    }

    // =========================================================
    // 🎉 FINAL SUMMARY
    // =========================================================
    const migrationSummary = {
      totalUsers,
      totalSalarySlipLogs,
      totalProcessed,
      totalMigrated,
      totalAlreadyS3,
      totalSkipped,
      totalFailed,
    };

    console.log(
      `\n🎉 Migration Completed
      =========================================
      👥 Users              : ${totalUsers}
      📦 Salary Slip Logs   : ${totalSalarySlipLogs}
      ⚙️ Processed          : ${totalProcessed}
      🚀 Migrated           : ${totalMigrated}
      ☁️ Already S3         : ${totalAlreadyS3}
      ⏭️ Skipped             : ${totalSkipped}
      ❌ Failed              : ${totalFailed}
      =========================================
      `,
    );

    return res.status(200).json({
      status: 200,
      message: 'Migration Completed',

      // 🔥 Migration summary
      migrationSummary,

      // 🔥 Failed records
      failedLogIds,
    });
  } catch (err) {
    console.error('🔥 Migration Error:', err.message);
    next(err);
  }
};

exports.migrateTaskAttachmentToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 100,
    } = req.body;

    /*
     * -------------------------------------------------
     * ATTACHMENT FIELD
     * -------------------------------------------------
     */

    const ATTACHMENT_FIELDS = [
      {
        fileField: 'attachment',
        thumbField: 'attachmentThumb',
        s3FlagField: 'isS3Upload',
      },
    ];

    /*
     * -------------------------------------------------
     * VALIDATE COMPANY
     * -------------------------------------------------
     */

    if (!companyMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'companyMasterID is required',
      });
    }

    console.log(
      `🚀 UserTask Attachment S3 Migration Started | Company: ${companyMasterID}`,
    );

    /*
     * -------------------------------------------------
     * USER WHERE CONDITION
     * -------------------------------------------------
     */

    const userWhereCondition = {
      companyMasterId: companyMasterID,
    };

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    /*
     * -------------------------------------------------
     * RESULT ARRAYS
     * -------------------------------------------------
     */

    const failedFiles = [];
    const migratedFiles = [];

    /*
     * -------------------------------------------------
     * USER PAGINATION
     * -------------------------------------------------
     */

    let userOffset = 0;
    let hasMoreUsers = true;

    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      console.log(`👥 Users Fetched: ${users.length}`);

      /*
       * -------------------------------------------------
       * PROCESS EACH USER
       * -------------------------------------------------
       */

      for (const user of users) {
        const currentUserMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (${currentUserMasterID})`,
        );

        /*
         * -------------------------------------------------
         * CURSOR PAGINATION
         * -------------------------------------------------
         *
         * Do NOT use OFFSET for tasks because
         * records are updated during migration.
         */

        let lastTaskID = 0;
        let hasMoreTasks = true;

        while (hasMoreTasks) {
          const findUserTasks = await UserTasks.findAll({
            where: {
              user_TasksID: {
                [Op.gt]: lastTaskID,
              },
              migration: false,
              userMasterID: currentUserMasterID,
              [Op.or]: ATTACHMENT_FIELDS.map(({ fileField }) => ({
                [Op.and]: [
                  {
                    [fileField]: {
                      [Op.not]: null,
                    },
                  },
                  {
                    [fileField]: {
                      [Op.ne]: '',
                    },
                  },
                ],
              })),
            },

            order: [['user_TasksID', 'ASC']],
            limit: LOG_PAGE_SIZE,
          });

          if (!findUserTasks.length) {
            hasMoreTasks = false;
            break;
          }

          console.log(
            `📦 Task Batch → LAST ID: ${lastTaskID}, COUNT: ${findUserTasks.length}`,
          );

          /*
           * -------------------------------------------------
           * PROCESS TASKS
           * -------------------------------------------------
           */

          for (const task of findUserTasks) {
            const user_TasksID = task.user_TasksID;

            lastTaskID = user_TasksID;

            console.log(`\n➡️ Processing Task: ${user_TasksID}`);

            /*
             * -------------------------------------------------
             * PROCESS ATTACHMENT
             * -------------------------------------------------
             */

            for (const {
              fileField,
              thumbField,
              s3FlagField,
            } of ATTACHMENT_FIELDS) {
              const attachment = task[fileField];

              /*
               * -------------------------------------------------
               * SKIP EMPTY ATTACHMENT
               * -------------------------------------------------
               */

              if (
                attachment === null ||
                attachment === undefined ||
                attachment === ''
              ) {
                continue;
              }

              /*
               * -------------------------------------------------
               * ALREADY MIGRATED
               * -------------------------------------------------
               */

              try {
                console.log(`📎 ${fileField}: ${attachment}`);

                /*
                 * -------------------------------------------------
                 * TASK DATE
                 * -------------------------------------------------
                 */

                const taskMoment = moment(task.startDate);

                const year = taskMoment.isValid()
                  ? taskMoment.format('YYYY')
                  : moment().format('YYYY');

                const month = taskMoment.isValid()
                  ? taskMoment.format('MM')
                  : moment().format('MM');

                const yearMonth = `${month}${year}`;

                /*
                 * -------------------------------------------------
                 * ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                let originalFileName = path.basename(attachment);

                originalFileName = originalFileName.replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_',
                );

                if (
                  !originalFileName ||
                  originalFileName === '.' ||
                  originalFileName === '..'
                ) {
                  originalFileName = `${fileField}.file`;
                }

                /*
                 * -------------------------------------------------
                 * FILE EXTENSION
                 * -------------------------------------------------
                 */

                const extension = path.extname(originalFileName);

                const baseName = path.basename(originalFileName, extension);

                /*
                 * -------------------------------------------------
                 * FINAL ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                const fileName = `${baseName}_${user_TasksID}_${currentUserMasterID}${extension}`;

                /*
                 * -------------------------------------------------
                 * THUMBNAIL FILE NAME
                 * -------------------------------------------------
                 */

                const thumbnailFileName = `${path.basename(
                  fileName,
                  extension,
                )}_thumb.jpg`;

                /*
                 * -------------------------------------------------
                 * S3 KEYS
                 * -------------------------------------------------
                 */

                const s3Folder = `${user.companyMasterId}/userTask/${yearMonth}`;

                const s3Key = `${s3Folder}/${fileName}`;

                const thumbnailS3Key = `${s3Folder}/${thumbnailFileName}`;

                /*
                 * -------------------------------------------------
                 * CONTENT TYPE
                 * -------------------------------------------------
                 */

                const contentType = getContentType(originalFileName);

                console.log(`☁️ S3 Key: ${s3Key}`);
                console.log(`🖼️ Thumbnail S3 Key: ${thumbnailS3Key}`);
                console.log(`📄 Content-Type: ${contentType}`);

                /*
                 * -------------------------------------------------
                 * LOCAL FILE
                 * -------------------------------------------------
                 */

                const localFilePath = getLocalFilePath(
                  `uploads/task/${attachment}`,
                );

                /*
                 * -------------------------------------------------
                 * CHECK ORIGINAL FILE EXISTS
                 * -------------------------------------------------
                 */

                await fs.promises.access(localFilePath, fs.constants.F_OK);

                console.log(`💾 Local file found: ${localFilePath}`);

                /*
                 * -------------------------------------------------
                 * GENERATE THUMBNAIL
                 * -------------------------------------------------
                 *
                 * IMPORTANT:
                 *
                 * Generate thumbnail before uploading original.
                 * The original local file must still exist.
                 */

                const thumbnail = await generateThumbnail({
                  path: localFilePath,
                  filename: fileName,
                  mimetype: contentType,
                });

                /*
                 * -------------------------------------------------
                 * UPLOAD ORIGINAL
                 * -------------------------------------------------
                 */

                const uploadedOriginalKey = await s3OrLocalUploadFiles({
                  attachment: localFilePath,
                  companyMasterId: user.companyMasterId,
                  attachmentFileName: fileName,
                  yearMonth,
                  folderName: attachmentFilePathFolderNames.USER_TASK,
                  isDeleteLocalFile: false,
                });

                console.log(`✅ Original uploaded: ${uploadedOriginalKey}`);

                /*
                 * -------------------------------------------------
                 * UPLOAD THUMBNAIL
                 * -------------------------------------------------
                 */

                let uploadedThumbnailKey = null;

                if (thumbnail) {
                  console.log(
                    `🖼️ Thumbnail generated: ${thumbnail.thumbnailPath}`,
                  );

                  uploadedThumbnailKey = await s3OrLocalUploadFiles({
                    attachment: thumbnail.thumbnailPath,
                    companyMasterId: user.companyMasterId,
                    attachmentFileName: thumbnailFileName,
                    yearMonth,
                    folderName: attachmentFilePathFolderNames.USER_TASK,
                    isDeleteLocalFile: false,
                  });

                  console.log(`✅ Thumbnail uploaded: ${uploadedThumbnailKey}`);
                } else {
                  console.log(`ℹ️ No thumbnail generated for ${fileField}`);
                }

                /*
                 * -------------------------------------------------
                 * DATABASE UPDATE
                 * -------------------------------------------------
                 */

                const updateData = {
                  [fileField]: uploadedOriginalKey,
                  [s3FlagField]: isStoreFileToS3Bucket,
                  migration: true,
                };

                /*
                 * Store thumbnail only
                 * if successfully generated/uploaded.
                 */

                if (uploadedThumbnailKey) {
                  updateData[thumbField] = uploadedThumbnailKey;
                }

                await UserTasks.update(updateData, {
                  where: {
                    user_TasksID,
                  },
                });

                console.log(`✅ ${fileField} migrated successfully`);

                /*
                 * -------------------------------------------------
                 * SUCCESS LOG
                 * -------------------------------------------------
                 */

                migratedFiles.push({
                  user_TasksID,
                  userMasterID: currentUserMasterID,

                  fileField,
                  thumbField,

                  oldPath: attachment,

                  s3Key: uploadedOriginalKey,

                  thumbnailS3Key: uploadedThumbnailKey || null,
                });
              } catch (fileError) {
                /*
                 * -------------------------------------------------
                 * FILE FAILURE
                 * -------------------------------------------------
                 */

                const failureLog = {
                  user_TasksID,
                  userMasterID: currentUserMasterID,

                  fileField,
                  thumbField,

                  attachment,

                  error: fileError.message,
                };

                console.error(`❌ ${fileField} migration failed`, failureLog);

                failedFiles.push(failureLog);

                /*
                 * -------------------------------------------------
                 * SAVE FAILURE LOG
                 * -------------------------------------------------
                 */

                await migrationFailureLog(
                  failureLog,
                  'task-attachment-s3-migration-failed',
                );

                /*
                 * Continue with next task
                 */

                continue;
              }
            }
          }
        }
      }

      /*
       * -------------------------------------------------
       * NEXT USER PAGE
       * -------------------------------------------------
       */

      userOffset += USER_PAGE_SIZE;
    }

    /*
     * -------------------------------------------------
     * MIGRATION COMPLETED
     * -------------------------------------------------
     */

    console.log(`🎉 UserTask Attachment S3 Migration Completed`);

    console.log(`✅ Migrated Files: ${migratedFiles.length}`);

    console.log(`❌ Failed Files: ${failedFiles.length}`);

    return res.status(200).json({
      status: 200,
      message: 'UserTask attachment migration completed',
      totalMigrated: migratedFiles.length,
      totalFailed: failedFiles.length,
      migratedFiles,
      failedFiles,
    });
  } catch (err) {
    console.error('🔥 UserTask Attachment Migration Error:', err);

    next(err);
  }
};

exports.migrateEmployeeNDAToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 100,
      beforeDate,
      afterDate,
    } = req.body;
    if (beforeDate && !moment(beforeDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(200).json({
        status: 200,
        message: 'beforeDate must be in YYYY-MM-DD format',
      });
    }

    if (afterDate && !moment(afterDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(200).json({
        status: 200,
        message: 'afterDate must be in YYYY-MM-DD format',
      });
    }

    if (beforeDate && afterDate) {
      const before = moment(beforeDate, 'YYYY-MM-DD', true);
      const after = moment(afterDate, 'YYYY-MM-DD', true);

      if (after.isAfter(before)) {
        return res.status(200).json({
          status: 200,
          message: 'afterDate must be before beforeDate',
        });
      }
    }

    const ndaDateCondition = {};

    if (beforeDate) {
      ndaDateCondition.givendate = {
        [Op.lt]: moment(beforeDate, 'YYYY-MM-DD').startOf('day').toDate(),
      };
    }

    if (afterDate) {
      ndaDateCondition.givendate = {
        ...(ndaDateCondition.givendate || {}),
        [Op.gt]: moment(afterDate, 'YYYY-MM-DD').endOf('day').toDate(),
      };
    }
    const ATTACHMENT_FIELDS = [
      {
        fileField: 'pdf',
        thumbField: 'pdfThumbnail',
        s3FlagField: 'isS3Upload',
      },
    ];

    if (!companyMasterID) {
      return res.status(200).json({
        status: 200,
        message: 'companyMasterID is required',
      });
    }

    console.log(
      `🚀 EmployeeNda Attachment S3 Migration Started | Company: ${companyMasterID}`,
    );

    const userWhereCondition = {
      companyMasterId: companyMasterID,
    };

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    const failedFiles = [];
    const migratedFiles = [];

    let userOffset = 0;
    let hasMoreUsers = true;

    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      console.log(`👥 Users Fetched: ${users.length}`);

      /*
       * -------------------------------------------------
       * PROCESS EACH USER
       * -------------------------------------------------
       */

      for (const user of users) {
        const currentUserMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (${currentUserMasterID})`,
        );

        /*
         * -------------------------------------------------
         * CURSOR PAGINATION
         * -------------------------------------------------
         *
         * Do NOT use OFFSET for tasks because
         * records are updated during migration.
         */

        let lastNdaID = 0;
        let hasMoreNda = true;

        while (hasMoreNda) {
          const findUserNda = await EmployeeNda.findAll({
            where: {
              employeeNdaid: {
                [Op.gt]: lastNdaID,
              },
              migration: false,
              userMasterID: currentUserMasterID,
              ...ndaDateCondition,
              [Op.or]: ATTACHMENT_FIELDS.map(({ fileField }) => ({
                [Op.and]: [
                  {
                    [fileField]: {
                      [Op.not]: null,
                    },
                  },
                  {
                    [fileField]: {
                      [Op.ne]: '',
                    },
                  },
                ],
              })),
            },

            order: [['employeeNdaid', 'ASC']],

            limit: LOG_PAGE_SIZE,
          });

          if (!findUserNda.length) {
            hasMoreNda = false;
            break;
          }

          console.log(
            `📦 EmployeeNda Batch → LAST ID: ${lastNdaID}, COUNT: ${findUserNda.length}`,
          );

          /*
           * -------------------------------------------------
           * PROCESS TASKS
           * -------------------------------------------------
           */

          for (const nda of findUserNda) {
            const user_NdaID = nda.employeeNdaid;

            lastNdaID = user_NdaID;

            console.log(`\n➡️ Processing EMployeeNda: ${user_NdaID}`);

            /*
             * -------------------------------------------------
             * PROCESS ATTACHMENT
             * -------------------------------------------------
             */

            for (const {
              fileField,
              thumbField,
              s3FlagField,
            } of ATTACHMENT_FIELDS) {
              const attachment = nda[fileField];

              /*
               * -------------------------------------------------
               * SKIP EMPTY ATTACHMENT
               * -------------------------------------------------
               */

              if (
                attachment === null ||
                attachment === undefined ||
                attachment === ''
              ) {
                continue;
              }

              /*
               * -------------------------------------------------
               * ALREADY MIGRATED
               * -------------------------------------------------
               */

              try {
                console.log(`📎 ${fileField}: ${attachment}`);

                /*
                 * -------------------------------------------------
                 * TASK DATE
                 * -------------------------------------------------
                 */

                const taskMoment = moment(nda.givendate);

                const year = taskMoment.isValid()
                  ? taskMoment.format('YYYY')
                  : moment().format('YYYY');

                const month = taskMoment.isValid()
                  ? taskMoment.format('MM')
                  : moment().format('MM');

                const yearMonth = `${month}${year}`;

                /*
                 * -------------------------------------------------
                 * ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                let originalFileName = path.basename(attachment);

                originalFileName = originalFileName.replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_',
                );

                if (
                  !originalFileName ||
                  originalFileName === '.' ||
                  originalFileName === '..'
                ) {
                  originalFileName = `${fileField}.file`;
                }

                /*
                 * -------------------------------------------------
                 * FILE EXTENSION
                 * -------------------------------------------------
                 */

                const extension = path.extname(originalFileName);

                const baseName = path.basename(originalFileName, extension);

                /*
                 * -------------------------------------------------
                 * FINAL ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                const fileName = `${baseName}_${user_NdaID}_${currentUserMasterID}${extension}`;

                /*
                 * -------------------------------------------------
                 * THUMBNAIL FILE NAME
                 * -------------------------------------------------
                 */

                const thumbnailFileName = `${path.basename(
                  fileName,
                  extension,
                )}_thumb.jpg`;

                /*
                 * -------------------------------------------------
                 * S3 KEYS
                 * -------------------------------------------------
                 */

                const s3Folder = `${user.companyMasterId}/${attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE}/${yearMonth}`;

                const s3Key = `${s3Folder}/${fileName}`;

                const thumbnailS3Key = `${s3Folder}/${thumbnailFileName}`;

                /*
                 * -------------------------------------------------
                 * CONTENT TYPE
                 * -------------------------------------------------
                 */

                const contentType = getContentType(originalFileName);

                console.log(`☁️ S3 Key: ${s3Key}`);
                console.log(`🖼️ Thumbnail S3 Key: ${thumbnailS3Key}`);
                console.log(`📄 Content-Type: ${contentType}`);

                /*
                 * -------------------------------------------------
                 * LOCAL FILE
                 * -------------------------------------------------
                 */

                const localFilePath = getLocalFilePath(
                  `uploads/company/Nda/${attachment}`,
                );

                /*
                 * -------------------------------------------------
                 * CHECK ORIGINAL FILE EXISTS
                 * -------------------------------------------------
                 */

                await fs.promises.access(localFilePath, fs.constants.F_OK);

                console.log(`💾 Local file found: ${localFilePath}`);

                /*
                 * -------------------------------------------------
                 * GENERATE THUMBNAIL
                 * -------------------------------------------------
                 *
                 * IMPORTANT:
                 *
                 * Generate thumbnail before uploading original.
                 * The original local file must still exist.
                 */

                const thumbnail = await generateThumbnail({
                  path: localFilePath,
                  filename: fileName,
                  mimetype: contentType,
                });

                /*
                 * -------------------------------------------------
                 * UPLOAD ORIGINAL
                 * -------------------------------------------------
                 */

                const uploadedOriginalKey = await s3OrLocalUploadFiles({
                  attachment: localFilePath,
                  companyMasterId: user.companyMasterId,
                  attachmentFileName: fileName,
                  yearMonth,
                  folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
                  isDeleteLocalFile: false,
                });

                console.log(`✅ Original uploaded: ${uploadedOriginalKey}`);

                /*
                 * -------------------------------------------------
                 * UPLOAD THUMBNAIL
                 * -------------------------------------------------
                 */

                let uploadedThumbnailKey = null;

                if (thumbnail) {
                  console.log(
                    `🖼️ Thumbnail generated: ${thumbnail.thumbnailPath}`,
                  );

                  uploadedThumbnailKey = await s3OrLocalUploadFiles({
                    attachment: thumbnail.thumbnailPath,
                    companyMasterId: user.companyMasterId,
                    attachmentFileName: thumbnailFileName,
                    yearMonth,
                    folderName: attachmentFilePathFolderNames.EMPLOYEE_NDA_FILE,
                    isDeleteLocalFile: false,
                  });

                  console.log(`✅ Thumbnail uploaded: ${uploadedThumbnailKey}`);
                } else {
                  console.log(`ℹ️ No thumbnail generated for ${fileField}`);
                }

                /*
                 * -------------------------------------------------
                 * DATABASE UPDATE
                 * -------------------------------------------------
                 */

                const updateData = {
                  [fileField]: uploadedOriginalKey,
                  [s3FlagField]: isStoreFileToS3Bucket,
                  migration: true,
                };

                /*
                 * Store thumbnail only
                 * if successfully generated/uploaded.
                 */

                if (uploadedThumbnailKey) {
                  updateData[thumbField] = uploadedThumbnailKey;
                }

                await EmployeeNda.update(updateData, {
                  where: {
                    employeeNdaid: user_NdaID,
                  },
                });

                console.log(`✅ ${fileField} migrated successfully`);

                /*
                 * -------------------------------------------------
                 * SUCCESS LOG
                 * -------------------------------------------------
                 */

                migratedFiles.push({
                  employeeNdaid: user_NdaID,
                  userMasterID: currentUserMasterID,

                  fileField,
                  thumbField,

                  oldPath: attachment,

                  s3Key: uploadedOriginalKey,

                  thumbnailS3Key: uploadedThumbnailKey || null,
                });
              } catch (fileError) {
                /*
                 * -------------------------------------------------
                 * FILE FAILURE
                 * -------------------------------------------------
                 */

                const failureLog = {
                  employeeNdaid: user_NdaID,
                  userMasterID: currentUserMasterID,

                  fileField,
                  thumbField,

                  attachment,

                  error: fileError.message,
                };

                console.error(`❌ ${fileField} migration failed`, failureLog);

                failedFiles.push(failureLog);

                /*
                 * -------------------------------------------------
                 * SAVE FAILURE LOG
                 * -------------------------------------------------
                 */

                await migrationFailureLog(
                  failureLog,
                  'employeeNda-attachment-s3-migration-failed',
                );

                /*
                 * Continue with next task
                 */

                continue;
              }
            }
          }
        }
      }

      /*
       * -------------------------------------------------
       * NEXT USER PAGE
       * -------------------------------------------------
       */

      userOffset += USER_PAGE_SIZE;
    }
    console.log(`🎉 EmployeeNda Attachment S3 Migration Completed`);

    console.log(`✅ Migrated Files: ${migratedFiles.length}`);

    console.log(`❌ Failed Files: ${failedFiles.length}`);

    return res.status(200).json({
      status: 200,
      message: 'EmployeeNda attachment migration completed',
      totalMigrated: migratedFiles.length,
      totalFailed: failedFiles.length,
      migratedFiles,
      failedFiles,
    });
  } catch (err) {
    console.error('🔥 EmployeeNda Attachment Migration Error:', err);

    next(err);
  }
};

exports.migrateTaskRemarkAttachmentToS3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      USER_PAGE_SIZE = 50,
      LOG_PAGE_SIZE = 100,
      beforeDate,
      afterDate,
    } = req.body;
    if (beforeDate && !moment(beforeDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(200).json({
        status: 200,
        message: 'beforeDate must be in YYYY-MM-DD format',
      });
    }

    if (afterDate && !moment(afterDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(200).json({
        status: 200,
        message: 'afterDate must be in YYYY-MM-DD format',
      });
    }

    if (beforeDate && afterDate) {
      const before = moment(beforeDate, 'YYYY-MM-DD', true);
      const after = moment(afterDate, 'YYYY-MM-DD', true);

      if (after.isAfter(before)) {
        return res.status(200).json({
          status: 200,
          message: 'afterDate must be before beforeDate',
        });
      }
    }
    const ATTACHMENT_FIELDS = [
      {
        fileField: 'attachment',
        thumbField: 'attachmentThunbnail',
        s3FlagField: 'isS3Upload',
      },
    ];

    if (!companyMasterID) {
      return res.status(200).json({
        status: 200,
        message: 'companyMasterID is required',
      });
    }

    console.log(
      `🚀 TaskRemark Attachment S3 Migration Started | Company: ${companyMasterID}`,
    );

    /*
     * -------------------------------------------------
     * USER WHERE CONDITION
     * -------------------------------------------------
     */

    const userWhereCondition = {
      companyMasterId: companyMasterID,
    };

    if (userMasterID) {
      userWhereCondition.userMasterID = userMasterID;
    }

    const failedFiles = [];
    const migratedFiles = [];

    let userOffset = 0;
    let hasMoreUsers = true;

    /*
     * -------------------------------------------------
     * PROCESS USERS PAGE BY PAGE
     * -------------------------------------------------
     */

    while (hasMoreUsers) {
      const users = await UserMaster.findAll({
        where: userWhereCondition,
        order: [['userMasterID', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'companyMasterId'],
        limit: USER_PAGE_SIZE,
        offset: userOffset,
      });

      if (!users.length) {
        hasMoreUsers = false;
        break;
      }

      console.log(`👥 Users Fetched: ${users.length}`);

      /*
       * -------------------------------------------------
       * PROCESS EACH USER
       * -------------------------------------------------
       */

      for (const user of users) {
        const currentUserMasterID = user.userMasterID;

        console.log(
          `\n🧑 User Start: ${user.displayName} (${currentUserMasterID})`,
        );

        /*
         * -------------------------------------------------
         * CURSOR PAGINATION
         * -------------------------------------------------
         */

        let lastTaskRemarkID = 0;
        let hasMoreTaskRemark = true;
        const userTaskWhereCondition = {
          userMasterID: currentUserMasterID,
        };

        if (beforeDate) {
          userTaskWhereCondition.startDate = {
            ...(userTaskWhereCondition.startDate || {}),
            [Op.lt]: moment(beforeDate, 'YYYY-MM-DD').startOf('day').toDate(),
          };
        }

        if (afterDate) {
          userTaskWhereCondition.startDate = {
            ...(userTaskWhereCondition.startDate || {}),
            [Op.gt]: moment(afterDate, 'YYYY-MM-DD').endOf('day').toDate(),
          };
        }
        while (hasMoreTaskRemark) {
          const findUserTaskRemark = await TaskRemark.findAll({
            where: {
              taskremarkID: {
                [Op.gt]: lastTaskRemarkID,
              },
              migration: false,
              [Op.or]: ATTACHMENT_FIELDS.map(({ fileField }) => ({
                [Op.and]: [
                  {
                    [fileField]: {
                      [Op.not]: null,
                    },
                  },
                  {
                    [fileField]: {
                      [Op.ne]: '',
                    },
                  },
                ],
              })),
            },

            include: [
              {
                model: UserTasks,
                required: true,
                attributes: ['user_TasksID', 'userMasterID', 'startDate'],
                where: userTaskWhereCondition,
              },
            ],

            order: [['taskremarkID', 'ASC']],

            limit: LOG_PAGE_SIZE,
          });

          if (!findUserTaskRemark.length) {
            hasMoreTaskRemark = false;
            break;
          }

          console.log(
            `📦 TaskRemark Batch → LAST ID: ${lastTaskRemarkID}, COUNT: ${findUserTaskRemark.length}`,
          );

          /*
           * -------------------------------------------------
           * PROCESS TASK REMARKS
           * -------------------------------------------------
           */

          for (const taskRemark of findUserTaskRemark) {
            const taskRemarkID = taskRemark.taskremarkID;

            lastTaskRemarkID = taskRemarkID;

            console.log(`\n➡️ Processing TaskRemark: ${taskRemarkID}`);

            /*
             * -------------------------------------------------
             * USER TASK DATA
             * -------------------------------------------------
             */

            const userTask = taskRemark.userTask;

            if (!userTask) {
              console.log(
                `⚠️ UserTask not found for TaskRemark: ${taskRemarkID}`,
              );

              continue;
            }

            /*
             * -------------------------------------------------
             * PROCESS ATTACHMENT
             * -------------------------------------------------
             */

            for (const {
              fileField,
              thumbField,
              s3FlagField,
            } of ATTACHMENT_FIELDS) {
              const attachment = taskRemark[fileField];

              /*
               * -------------------------------------------------
               * SKIP EMPTY ATTACHMENT
               * -------------------------------------------------
               */

              if (
                attachment === null ||
                attachment === undefined ||
                attachment === ''
              ) {
                continue;
              }

              try {
                console.log(`📎 ${fileField}: ${attachment}`);

                /*
                 * -------------------------------------------------
                 * TASK DATE
                 * -------------------------------------------------
                 */

                const taskMoment = moment(userTask.startDate);

                const year = taskMoment.isValid()
                  ? taskMoment.format('YYYY')
                  : moment().format('YYYY');

                const month = taskMoment.isValid()
                  ? taskMoment.format('MM')
                  : moment().format('MM');

                const yearMonth = `${month}${year}`;

                /*
                 * -------------------------------------------------
                 * ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                let originalFileName = path.basename(attachment);

                originalFileName = originalFileName.replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_',
                );

                if (
                  !originalFileName ||
                  originalFileName === '.' ||
                  originalFileName === '..'
                ) {
                  originalFileName = `${fileField}.file`;
                }

                /*
                 * -------------------------------------------------
                 * FILE EXTENSION
                 * -------------------------------------------------
                 */

                const extension = path.extname(originalFileName);

                const baseName = path.basename(originalFileName, extension);

                /*
                 * -------------------------------------------------
                 * FINAL ORIGINAL FILE NAME
                 * -------------------------------------------------
                 */

                const fileName = `${baseName}_${taskRemarkID}_${currentUserMasterID}${extension}`;

                /*
                 * -------------------------------------------------
                 * THUMBNAIL FILE NAME
                 * -------------------------------------------------
                 */

                const thumbnailFileName = `${path.basename(
                  fileName,
                  extension,
                )}_thumb.jpg`;

                /*
                 * -------------------------------------------------
                 * S3 KEYS
                 * -------------------------------------------------
                 */

                const s3Folder = `${user.companyMasterId}/${attachmentFilePathFolderNames.USER_TASK_REMARKS}/${yearMonth}`;

                const s3Key = `${s3Folder}/${fileName}`;

                const thumbnailS3Key = `${s3Folder}/${thumbnailFileName}`;

                /*
                 * -------------------------------------------------
                 * CONTENT TYPE
                 * -------------------------------------------------
                 */

                const contentType = getContentType(originalFileName);

                console.log(`☁️ S3 Key: ${s3Key}`);

                console.log(`🖼️ Thumbnail S3 Key: ${thumbnailS3Key}`);

                console.log(`📄 Content-Type: ${contentType}`);

                /*
                 * -------------------------------------------------
                 * LOCAL FILE
                 * -------------------------------------------------
                 */

                const localFilePath = getLocalFilePath(
                  `uploads/taskRemarks/${attachment}`,
                );

                /*
                 * -------------------------------------------------
                 * CHECK ORIGINAL FILE EXISTS
                 * -------------------------------------------------
                 */

                await fs.promises.access(localFilePath, fs.constants.F_OK);

                console.log(`💾 Local file found: ${localFilePath}`);

                /*
                 * -------------------------------------------------
                 * GENERATE THUMBNAIL
                 * -------------------------------------------------
                 */

                const thumbnail = await generateThumbnail({
                  path: localFilePath,
                  filename: fileName,
                  mimetype: contentType,
                });

                /*
                 * -------------------------------------------------
                 * UPLOAD ORIGINAL
                 * -------------------------------------------------
                 */

                const uploadedOriginalKey = await s3OrLocalUploadFiles({
                  attachment: localFilePath,
                  companyMasterId: user.companyMasterId,
                  attachmentFileName: fileName,
                  yearMonth,
                  folderName: attachmentFilePathFolderNames.USER_TASK_REMARKS,
                  isDeleteLocalFile: false,
                });

                console.log(`✅ Original uploaded: ${uploadedOriginalKey}`);

                /*
                 * -------------------------------------------------
                 * UPLOAD THUMBNAIL
                 * -------------------------------------------------
                 */

                let uploadedThumbnailKey = null;

                if (thumbnail) {
                  console.log(
                    `🖼️ Thumbnail generated: ${thumbnail.thumbnailPath}`,
                  );

                  uploadedThumbnailKey = await s3OrLocalUploadFiles({
                    attachment: thumbnail.thumbnailPath,
                    companyMasterId: user.companyMasterId,
                    attachmentFileName: thumbnailFileName,
                    yearMonth,
                    folderName: attachmentFilePathFolderNames.USER_TASK_REMARKS,
                    isDeleteLocalFile: false,
                  });

                  console.log(`✅ Thumbnail uploaded: ${uploadedThumbnailKey}`);
                } else {
                  console.log(`ℹ️ No thumbnail generated for ${fileField}`);
                }

                /*
                 * -------------------------------------------------
                 * DATABASE UPDATE
                 * -------------------------------------------------
                 */

                const updateData = {
                  [fileField]: uploadedOriginalKey,
                  [s3FlagField]: isStoreFileToS3Bucket,
                  migration: true,
                };

                /*
                 * Store thumbnail only
                 * if successfully generated/uploaded.
                 */

                if (uploadedThumbnailKey) {
                  updateData[thumbField] = uploadedThumbnailKey;
                }

                await TaskRemark.update(updateData, {
                  where: {
                    taskremarkID: taskRemarkID,
                  },
                });

                console.log(`✅ ${fileField} migrated successfully`);

                /*
                 * -------------------------------------------------
                 * SUCCESS LOG
                 * -------------------------------------------------
                 */

                migratedFiles.push({
                  taskremarkID: taskRemarkID,

                  userMasterID: currentUserMasterID,

                  user_TasksID: taskRemark.user_TasksID,

                  fileField,

                  thumbField,

                  oldPath: attachment,

                  s3Key: uploadedOriginalKey,

                  thumbnailS3Key: uploadedThumbnailKey || null,
                });
              } catch (fileError) {
                /*
                 * -------------------------------------------------
                 * FILE FAILURE
                 * -------------------------------------------------
                 */

                const failureLog = {
                  taskremarkID: taskRemarkID,

                  userMasterID: currentUserMasterID,

                  user_TasksID: taskRemark.user_TasksID,

                  fileField,

                  thumbField,

                  attachment,

                  error: fileError.message,
                };

                console.error(`❌ ${fileField} migration failed`, failureLog);

                failedFiles.push(failureLog);

                /*
                 * -------------------------------------------------
                 * SAVE FAILURE LOG
                 * -------------------------------------------------
                 */

                await migrationFailureLog(
                  failureLog,
                  'taskRemark-attachment-s3-migration-failed',
                );

                /*
                 * Continue with next TaskRemark
                 */

                continue;
              }
            }
          }
        }
      }

      /*
       * -------------------------------------------------
       * NEXT USER PAGE
       * -------------------------------------------------
       */

      userOffset += USER_PAGE_SIZE;
    }

    console.log(`🎉 TaskRemark Attachment S3 Migration Completed`);

    console.log(`✅ Migrated Files: ${migratedFiles.length}`);

    console.log(`❌ Failed Files: ${failedFiles.length}`);

    return res.status(200).json({
      status: 200,
      message: 'TaskRemark attachment migration completed',

      totalMigrated: migratedFiles.length,

      totalFailed: failedFiles.length,

      migratedFiles,

      failedFiles,
    });
  } catch (err) {
    console.error('🔥 TaskRemark Attachment Migration Error:', err);

    next(err);
  }
};
