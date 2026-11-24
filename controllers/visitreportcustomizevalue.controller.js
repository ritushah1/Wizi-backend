const VisitReportFieldValueModel = require('../models/visitreportcustomizevalue');
const message = require('../response_message/message');
const VisitReportCustomize = require('../models/visitreportcustomize');
const {
  updateVisitReportInSheet,
} = require('./googleSheetIntegration.controller');
const GoogleSheetIntegration = require('../models/googleSheetIntegration');

const fs = require('fs');
const path = require('path');

const Visit = require('../models/visit');
const companyMaster = require('../models/companyMaster');
const customer = require('../models/customer');
const UserMaster = require('../models/userMaster');
const VisitCustomizeFieldValueModel = require('../models/visitformcustomizevalue');
const VisitFormCustomize = require('../models/visitformcustomize');
const Product = require('../models/product');
const VisitPurpose = require('../models/visitPurpose');
const VisitReportMaster = require('../models/visitReportMaster');
const attendanceTransaction = require('../models/attendanceTransaction');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

const {
  generateHTMLToPDF_base64Path,
  getVisitProductNames,
  getPurposeOfVisitNames,
} = require('../utils/commonUtilFunctions');
const {
  uploadBase64ToS3,
  getS3File,
  listS3Objects,
} = require('../utils/s3.utils');
const { bucketName, isStoreFileToS3Bucket } = require('../utils/labelUtils');
const { userAttributes } = require('../utils/commonVars');
const moment = require('moment');
const Sequelize = require('sequelize');
const JSON5 = require('json5');
const VisitAuthorization = require('../models/visitAuthorization');
const VisitProduct = require('../models/visitProduct');
const PurposeOfVisit = require('../models/purposeOfVisit');

exports.postAddVisitReportCustomizeFieldValue = async (req, res, next) => {
  try {
    let { visitReportCustomizeID, visitID, value } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let insert_db_status = await VisitReportFieldValueModel.create({
      visitReportCustomizeID,
      visitID,
      value,
      createBy,
      createByIp,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Report'),
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

exports.getVisitReportCustomizeFieldValueById = async (req, res, next) => {
  try {
    let get_one_data = await VisitReportFieldValueModel.findAll({
      where: {
        visitID: req.params.id,
      },
      include: [{ model: VisitReportCustomize }],
      order: [[{ model: VisitReportCustomize }, 'index', 'ASC']],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postAddBulkVisitReportCustomizeFieldValue = async (req, res, next) => {
  try {
    const visitCreateFields = Array.isArray(req?.body)
      ? req.body.filter((item) => item.visitReportCustomizeID)
      : [];
    let insert_db_status = [];
    if (visitCreateFields.length > 0) {
      insert_db_status = await VisitReportFieldValueModel.bulkCreate(
        visitCreateFields,
        { returning: true },
      );
    }

    if (insert_db_status.length > 0) {
      const integration = await GoogleSheetIntegration.findOne({
        where: { companyMasterID: req.userDetails.companyMasterId },
      });

      if (integration) {
        updateVisitReportInSheet(req.body?.[0].visitID).catch((err) => {
          console.error('Error updating Google Sheet:', err);
        });
      }

      // ✅ Automatically generate PDF and upload/save in the background
      const visitID =
        req.body?.[0]?.visitID ||
        (visitCreateFields.length > 0 ? visitCreateFields[0].visitID : null);
      if (visitID) {
        generateAndUploadVisitReportPDF(visitID).catch((err) => {
          console.error('Error automatically generating and saving PDF:', err);
        });
      }
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Report'),
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

async function generateAndUploadVisitReportPDF(visitID) {
  try {
    if (!visitID) {
      return;
    }

    const visitData = await Visit.findOne({
      where: { visitID },
      include: [
        {
          required: false,
          model: companyMaster,
          attributes: ['companyName', 'companyAddress'],
        },
        {
          required: false,
          model: customer,
          attributes: [
            'companyName',
            'customerName',
            'currentLocation',
            'mobileNumber1',
          ],
        },
        {
          model: VisitProduct,
          as: 'vp',
          include: [
            {
              required: false,
              model: Product,
              attributes: ['productID', 'productName', 'companyMasterID'],
            },
          ],
        },
        {
          model: PurposeOfVisit,
          as: 'pov',
          include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
        },
        {
          required: true,
          model: UserMaster,
          as: 'assign',
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: attendanceTransaction,
              where: {
                [Sequelize.Op.and]: [
                  Sequelize.where(
                    Sequelize.fn(
                      'DATE',
                      Sequelize.col(
                        'assign->attendanceTransactions.AttendanceDate',
                      ),
                    ),
                    Sequelize.fn('DATE', Sequelize.col('visit.visitDate')),
                  ),
                ],
              },
              attributes: ['InDatetime', 'OutDateTime', 'AttendanceDate'],
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          required: false,
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          separate: true,
          model: VisitCustomizeFieldValueModel,
          include: [
            {
              required: false,
              model: VisitFormCustomize,
            },
          ],
        },
        {
          required: false,
          separate: true,
          model: VisitReportFieldValueModel,
          include: [
            {
              required: false,
              model: VisitReportCustomize,
              include: [
                {
                  model: VisitReportMaster,
                  attributes: ['visitReportName'],
                },
              ],
            },
          ],
        },
        {
          model: VisitAuthorization,
          as: 'visitAuth',
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });
    if (visitData?.visitReportCustomizeValues?.length) {
      visitData.visitReportCustomizeValues.sort((a, b) => {
        return a.visitReportCustomize?.index - b.visitReportCustomize?.index;
      });
    }
    if (visitData?.visitFormCustomizeValues?.length) {
      visitData.visitFormCustomizeValues.sort((a, b) => {
        return a.visitFormCustomize?.index - b.visitFormCustomize?.index;
      });
    }
    if (!visitData) {
      return;
    }

    if (visitData.coPersonID && visitData.coPersonID.length > 0) {
      const coPersonData = await UserMaster.findAll({
        where: {
          userMasterID: visitData.coPersonID,
        },
        attributes: ['displayName', 'userMasterID'],
      });
      visitData.coPersonID = coPersonData;
    }

    function getCheckBoxValue(value) {
      let obj;

      try {
        obj = JSON.parse(value);
      } catch {
        try {
          obj = JSON5.parse(value);
        } catch {
          return '';
        }
      }

      return Object.keys(obj)
        .filter((key) => obj[key] === true)
        .join(', ');
    }

    const pdfData = {
      companyName: visitData.companyMaster?.companyName || '',
      companyAddress: visitData.companyMaster?.companyAddress || '',
      customerName: visitData.customer?.customerName || '',
      customerCompanyName: visitData.customer?.companyName || '',
      customerCurrLocation: visitData.customer?.currentLocation || '',
      customerMobile: visitData.customer?.mobileNumber1 || '',
      assignUserName: visitData.assign?.displayName || '',
      assignEmpCode:
        visitData.assign?.employeeJoiningDetails?.[0]?.employeeCode || '',
      assignEmpEmail: visitData.assign?.email || '',
      assignEmpNumber: visitData.assign?.userNumber || '',
      coPersons:
        visitData?.coPersonID?.length > 0
          ? visitData?.coPersonID.map((x) => x?.displayName)?.join(', ')
          : '',
      visitDate:
        moment(visitData.visitDate, 'YYYY-MM-DD').format('DD-MM-YYYY') +
        ' ' +
        (visitData.visitTime || ''),
      visitStatus: visitData.visitStatus || '',
      checkInDateTime:
        moment(visitData.checkInDateTime, 'YYYY-MM-DD').format(
          'DD-MM-YYYY HH:mm',
        ) || '',
      checkInLatitude: visitData.checkInLatitude || '',
      checkInLongitude: visitData.checkInLongitude || '',
      checkInLocation: visitData.checkInLocation || '',
      visitPurpose: getPurposeOfVisitNames(visitData) || '',
      productName: getVisitProductNames(visitData) || '',
      checkOutDateTime:
        moment(visitData.checkOutDateTime, 'YYYY-MM-DD').format(
          'DD-MM-YYYY HH:mm',
        ) || '',
      checkOutLatitude: visitData.checkOutLatitude || '',
      checkOutLongitude: visitData.checkOutLongitude || '',
      checkOutLocation: visitData.checkOutLocation || '',
      checkInAttachment: visitData.checkInAttachment || '',
      checkOutAttachment: visitData.checkOutAttachment || '',
      visitFormCustomizeValues:
        visitData?.visitFormCustomizeValues?.length > 0
          ? visitData.visitFormCustomizeValues.map((x) => ({
              label: x.visitFormCustomize?.fieldLabel,
              value: x.value,
              isTextArea:
                x.visitFormCustomize?.inputType === 'textarea' ||
                x.visitFormCustomize?.inputType === 'text area',
            })) || ''
          : null,
      visitReportCustomizeValues:
        visitData.visitReportCustomizeValues?.length > 0
          ? visitData.visitReportCustomizeValues.map((x, i) => {
              if (
                x?.visitReportCustomize?.inputType == 'signature' ||
                x?.visitReportCustomize?.inputType == 'image'
              ) {
                if (x.value && x.value != '') {
                  return {
                    label: x.visitReportCustomize?.fieldLabel,
                    value: x.value?.startsWith('data:image/')
                      ? x.value
                      : `data:${getImageFormat(x.value)};base64,${x.value}`,
                    type: x.visitReportCustomize?.inputType,
                  };
                } else {
                  return {
                    label: x.visitReportCustomize?.fieldLabel,
                    value: '',
                    type: x.visitReportCustomize?.inputType,
                  };
                }
              } else if (x?.visitReportCustomize?.inputType == 'checkbox') {
                return {
                  label: x.visitReportCustomize?.fieldLabel,
                  value: getCheckBoxValue(x.value),
                };
              } else if (x?.visitReportCustomize?.inputType == 'textarea') {
                return {
                  label: x.visitReportCustomize?.fieldLabel,
                  value: x.value,
                  isTextArea: true,
                };
              } else {
                return {
                  label: x.visitReportCustomize?.fieldLabel,
                  value: x.value,
                };
              }
            }) || ''
          : null,
      visitReportName:
        visitData?.visitReportCustomizeValues?.[0]?.visitReportCustomize
          ?.visitReportMaster?.visitReportName,
    };

    let base64path = await generateHTMLToPDF_base64Path(
      pdfData,
      'serviceReport',
      'portrait',
      'html',
    );

    if (!base64path) {
      throw new Error('Failed to generate PDF base64 content');
    }

    const dataUrl = `data:application/pdf;base64,${base64path}`;

    // Construct the S3 key structure:
    // companyMasterID/visitReportCustomize/date/userName_userNumber/visit_N/files
    const visitDateStr = visitData.visitDate || moment().format('YYYY-MM-DD');

    let userNameVal = 'unknown';
    let userNumberVal = 'unknown';
    if (visitData.assign) {
      userNameVal = visitData?.assign?.displayName;
      userNumberVal = visitData?.assign?.userNumber;
    } else if (visitData.createdByUserDetails) {
      userNameVal = visitData?.createdByUserDetails?.displayName;
      userNumberVal = visitData?.createdByUserDetails?.userNumber;
    }

    const cleanUserName = userNameVal.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanUserNumber = userNumberVal.replace(/[^a-zA-Z0-9]/g, '_');
    const userFolder = `${cleanUserName}_${cleanUserNumber}`;

    const customerNameVal =
      visitData.customer?.companyName ||
      visitData.customer?.customerName ||
      'customer';
    const cleanCustomerName =
      customerNameVal
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'customer';
    const filePrefix = `${cleanCustomerName}_${cleanUserName}`;
    const pdfFileName = `${filePrefix}_${visitID}.pdf`;

    // ✅ Set visit folder name using the unique visitID
    const userDatePrefix = `${visitData.companyMasterID}/visitReportCustomize/${visitDateStr}/${userFolder}/`;
    const visitFolder = `visit_${visitID}`;

    if (isStoreFileToS3Bucket) {
      // Final base path for all files of this visit on S3
      const visitBasePath = `${userDatePrefix}${visitFolder}`;

      // Upload PDF
      const pdfS3Key = `${visitBasePath}/${pdfFileName}`;
      await uploadBase64ToS3({
        base64String: dataUrl,
        bucketName,
        s3Key: pdfS3Key,
        fileName: pdfFileName,
      });

      // Upload Check-In Attachment
      if (visitData.checkInAttachment) {
        const filePath = path.join(process.cwd(), visitData.checkInAttachment);
        if (fs.existsSync(filePath)) {
          try {
            const ext = path.extname(filePath);
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString('base64');
            let mimeType = 'application/octet-stream';
            if (ext.toLowerCase() === '.png') mimeType = 'image/png';
            else if (
              ext.toLowerCase() === '.jpg' ||
              ext.toLowerCase() === '.jpeg'
            )
              mimeType = 'image/jpeg';
            else if (
              ext.toLowerCase() === '.jpg' ||
              ext.toLowerCase() === '.jpeg'
            )
              mimeType = 'image/jpeg';

            const attachmentDataUrl = `data:${mimeType};base64,${base64Data}`;
            const attachmentS3Key = `${visitBasePath}/checkInAttachment${ext}`;

            await uploadBase64ToS3({
              base64String: attachmentDataUrl,
              bucketName,
              s3Key: attachmentS3Key,
              fileName: `checkInAttachment${ext}`,
            });
          } catch (err) {
            console.error('Error uploading check-in attachment to S3:', err);
          }
        }
      }

      // Upload Check-Out Attachment
      if (visitData.checkOutAttachment) {
        const filePath = path.join(process.cwd(), visitData.checkOutAttachment);
        if (fs.existsSync(filePath)) {
          try {
            const ext = path.extname(filePath);
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString('base64');
            let mimeType = 'application/octet-stream';
            if (ext.toLowerCase() === '.png') mimeType = 'image/png';
            else if (
              ext.toLowerCase() === '.jpg' ||
              ext.toLowerCase() === '.jpeg'
            )
              mimeType = 'image/jpeg';
            else if (
              ext.toLowerCase() === '.jpg' ||
              ext.toLowerCase() === '.jpeg'
            )
              mimeType = 'image/jpeg';

            const attachmentDataUrl = `data:${mimeType};base64,${base64Data}`;
            const attachmentS3Key = `${visitBasePath}/checkOutAttachment${ext}`;

            await uploadBase64ToS3({
              base64String: attachmentDataUrl,
              bucketName,
              s3Key: attachmentS3Key,
              fileName: `checkOutAttachment${ext}`,
            });
          } catch (err) {
            console.error('Error uploading check-out attachment to S3:', err);
          }
        }
      }

      // Upload Customize Report Images
      const imageDocs =
        visitData?.visitReportCustomizeValues
          ?.filter(
            (x) => x?.visitReportCustomize?.inputType === 'image' && x?.value,
          )
          ?.map((x) => ({
            label: x?.visitReportCustomize?.fieldLabel,
            value: x?.value,
          })) || [];

      for (let index = 0; index < imageDocs.length; index++) {
        const img = imageDocs[index];
        let imageData = img.value;

        if (!imageData) continue;

        if (!imageData.startsWith('data:image/')) {
          imageData = `data:${getImageFormat(imageData)};base64,${imageData}`;
        }

        const match = imageData.match(/^data:image\/([^;]+);base64,(.+)$/);

        if (!match) continue;

        const extension = match[1] || 'png';
        const cleanLabel = (img.label || `Image_${index + 1}`)
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const imageFileName = `${filePrefix}_${cleanLabel}_${visitID}.${extension}`;
        const imgS3Key = `${visitBasePath}/${imageFileName}`;

        try {
          await uploadBase64ToS3({
            base64String: imageData,
            bucketName,
            s3Key: imgS3Key,
            fileName: imageFileName,
          });
        } catch (err) {
          console.error(
            `Error uploading custom image ${cleanLabel} to S3:`,
            err,
          );
        }
      }
    } else {
      // Save locally under uploads/visitReportCustomize/visitDate/userName_userNumber/visit_visitID/
      const localRelativePath = `uploads/visitReportCustomize/${visitDateStr}/${userFolder}/${visitFolder}`;
      const localFolder = path.join(process.cwd(), localRelativePath);
      // Ensure directory exists
      fs.mkdirSync(localFolder, { recursive: true });

      // Save PDF
      const pdfLocalPath = path.join(localFolder, pdfFileName);
      fs.writeFileSync(pdfLocalPath, Buffer.from(base64path, 'base64'));

      // Copy Check-In Attachment
      if (visitData.checkInAttachment) {
        const filePath = path.join(process.cwd(), visitData.checkInAttachment);
        if (fs.existsSync(filePath)) {
          try {
            const ext = path.extname(filePath);
            const checkInLocalPath = path.join(
              localFolder,
              `checkInAttachment${ext}`,
            );
            fs.copyFileSync(filePath, checkInLocalPath);
          } catch (err) {
            console.error('Error copying check-in attachment locally:', err);
          }
        }
      }

      // Copy Check-Out Attachment
      if (visitData.checkOutAttachment) {
        const filePath = path.join(process.cwd(), visitData.checkOutAttachment);
        if (fs.existsSync(filePath)) {
          try {
            const ext = path.extname(filePath);
            const checkOutLocalPath = path.join(
              localFolder,
              `checkOutAttachment${ext}`,
            );
            fs.copyFileSync(filePath, checkOutLocalPath);
          } catch (err) {
            console.error('Error copying check-out attachment locally:', err);
          }
        }
      }

      // Write Customize Report Images
      const imageDocs =
        visitData?.visitReportCustomizeValues
          ?.filter(
            (x) => x?.visitReportCustomize?.inputType === 'image' && x?.value,
          )
          ?.map((x) => ({
            label: x?.visitReportCustomize?.fieldLabel,
            value: x?.value,
          })) || [];

      for (let index = 0; index < imageDocs.length; index++) {
        const img = imageDocs[index];
        let imageData = img.value;

        if (!imageData) continue;

        if (!imageData.startsWith('data:image/')) {
          imageData = `data:${getImageFormat(imageData)};base64,${imageData}`;
        }

        const match = imageData.match(/^data:image\/([^;]+);base64,(.+)$/);

        if (!match) continue;

        const extension = match[1] || 'png';
        const cleanLabel = (img.label || `Image_${index + 1}`)
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const imageFileName = `${filePrefix}_${cleanLabel}_${visitID}.${extension}`;
        const imgLocalPath = path.join(localFolder, imageFileName);

        try {
          fs.writeFileSync(imgLocalPath, Buffer.from(match[2], 'base64'));
        } catch (err) {
          console.error(
            `Error saving custom image ${cleanLabel} locally:`,
            err,
          );
          console.error(
            `Error saving custom image ${cleanLabel} locally:`,
            err,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `Error in generateAndUploadVisitReportPDF for visitID ${visitID}:`,
      error,
    );
    console.error(
      `Error in generateAndUploadVisitReportPDF for visitID ${visitID}:`,
      error,
    );
  }
}

function getImageFormat(base64) {
  try {
    const cleaned = base64.replace(/^data:.*;base64,/, '');
    let bytes;
    if (typeof Buffer !== 'undefined') {
      bytes = [...Buffer.from(cleaned, 'base64').slice(0, 4)];
    } else {
      const binary = atob(cleaned).slice(0, 4);
      bytes = Array.from(binary).map((c) => c.charCodeAt(0));
    }
    const hex = bytes
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    if (hex.startsWith('FFD8FF')) return 'image/jpeg';
    if (hex.startsWith('89504E47')) return 'image/png';
    if (hex.startsWith('47494638')) return 'image/gif';
    if (hex.startsWith('424D')) return 'image/bmp';
    if (hex.startsWith('52494646')) return 'image/webp';

    return 'image/jpg';
  } catch (error) {
    return 'image/jpg';
  }
}
