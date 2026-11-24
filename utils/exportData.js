const Excel = require('exceljs');
const nodemailer = require('nodemailer');
const { Sequelize, Op } = require('sequelize');
const UserMaster = require('../models/userMaster');
const FormMaster = require('../models/formMaster');
const JSZip = require('jszip');
const path = require('path');
const {
  asiaKolkataDateTime,
  findCompanyNotificationPolicy,
  formatDateMMDDYYYY,
  month_dict,
  getEMIMonthByPayrollFrequency,
  getUniqueSheetName,
  convertHoursAndMinutesToMinutes,
  minutesToHoursMinutes,
  stripHtml,
} = require('../utils/commonUtilFunctions');
const RolePermission = require('../models/rolePermission');
const RoleMaster = require('../models/roleMaster');
const UserRole = require('../models/userRole');
const fs = require('fs');
const {
  DateTimeType,
  expenseApprovalTypes,
  paymentMode,
  attendanceReportMainReportTypes,
  salaryRegisterTypeEnum,
} = require('./dbUtils');
const moment = require('moment');
const Handlebars = require('handlebars');
const { default: puppeteer } = require('puppeteer');
const os = require('os');
const ExcelJS = require('exceljs');
const {
  basicPaymentOptionsArray,
  paymentOptionsForExensePayment,
} = require('./commonVars');
const {
  showPayWithSalary,
  ProjectName,
  projectNamesList,
  bucketName,
  appURL,
  fileViewerAppURL,
} = require('./labelUtils');
const { getS3File } = require('./s3.utils');
const { getJwtTokenNoExpiryData } = require('./jsonwebtoken.utils');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../', 'mailcron.log'),
  {
    flags: 'a',
  },
);

const flattenObj = (obj, parent = null, res = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    let propName;

    // In related models' data, data is stored at key which includes Id at the end. To remove that Id following code works

    if (parent) {
      propName = parent.includes('Id')
        ? `${parent.replace('Id', '')}_${key}`
        : `${parent}_${key}`;
    } else {
      propName = key;
    }

    // const propName = parent ? parent + '_' + key : key; & obj[key]!==null because typeof null = object

    if (value !== null && typeof value === 'object') {
      // if value is array. also allows empty array to be added as a key
      if (value.length !== undefined && value.length >= 0) {
        res[propName] = value;
      } else flattenObj(value, propName, res);
    } else res[propName] = value;
  });
  return res;
};

const formatFirstRow = (workSheet, row) => {
  const firstRow = workSheet.getRow(row);
  firstRow.height = 20;
  firstRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',

      pattern: 'solid',

      fgColor: { argb: '729fcf' },
    };
    cell.font = { bold: true, name: 'calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
};

function countKeys(obj) {
  return Object.keys(obj).reduce((count, key) => {
    if (Array.isArray(obj[key]))
      return count + obj[key].reduce((c, o) => c + countKeys(o), 0);
    if (typeof obj[key] === 'object' && obj[key] !== null)
      return count + countKeys(obj[key]);
    return count + 1;
  }, 0);
}

function findIndexParentWithMostKeys(arr) {
  return arr.reduce(
    (maxIndex, obj, index) =>
      countKeys(obj) > countKeys(arr[maxIndex]) ? index : maxIndex,
    0,
  );
}

const generateExcelGatePass = async (data, fileName, fileType, res) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = Object.keys(data[0]);
    const transformedObject = [];
    for (let i = 0; i < data.length; i++) {
      let isNotArray = true;
      headerNames.forEach((key) => {
        if (Array.isArray(data[i][key]) === true) {
          data[i][key].forEach((obj) => {
            isNotArray = false;
            // Deep copy so that values in data[i] does not get changed
            const transformedElement = JSON.parse(JSON.stringify(data[i]));
            transformedElement[key] = obj;
            transformedObject.push({ ...transformedElement });
          });
        }
      });
      if (isNotArray)
        transformedObject.push(JSON.parse(JSON.stringify(data[i])));
    }
    if (transformedObject.length === 0) transformedObject.push(...data);

    const keyData = flattenObj(
      transformedObject[findIndexParentWithMostKeys(transformedObject)],
    );

    const columns = Object.keys(keyData).map((key) => ({
      header: key,
      key,
      width: 15,
    }));

    workSheet.columns = columns;

    transformedObject.forEach((element, index) => {
      const flatObj = flattenObj(element);
      const rowNum = index + 2; // Use the index to get the current row number
      const row = workSheet.getRow(rowNum);

      // Code to find if there are columns that contains image keyword in its name then we'll assume it carries image buffer
      Object.keys(flatObj).forEach((key) => {
        const base64regex =
          /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        if (key.includes('image') && base64regex.test(element[key])) {
          row.height = 100;
          const column = workSheet.getColumn(key);
          delete flatObj[key];
          if (element[key]) {
            const imageId = workBook.addImage({
              extension: 'jpeg',
              base64: element[key],
            });

            workSheet.addImage(
              imageId,
              `${column.letter}${rowNum}:${column.letter}${rowNum}`,
            );
          }
        }
      });
      row.values = flatObj;
      row.eachCell((cell, colNum) => {
        if (colNum === 15 || colNum === 16) {
          cell.alignment = { wrapText: true };
        }
      });
    });
    formatFirstRow(workSheet, 1);
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const generateExcel = async (
  data,
  fileName,
  fileType,
  res,
  config = {},
  boldLastRow = false,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = Object.keys(data[0]);
    const transformedObject = [];
    for (let i = 0; i < data.length; i++) {
      let isNotArray = true;
      headerNames.forEach((key) => {
        if (Array.isArray(data[i][key])) {
          data[i][key].forEach((obj) => {
            isNotArray = false;
            // Deep copy so that values in data[i] does not get changed
            const transformedElement = JSON.parse(JSON.stringify(data[i]));
            transformedElement[key] = obj;
            transformedObject.push({ ...transformedElement });
          });
        }
      });
      if (isNotArray) {
        transformedObject.push(JSON.parse(JSON.stringify(data[i])));
      }
    }

    if (!transformedObject.length) {
      transformedObject.push(...data);
    }
    const keyData = flattenObj(
      transformedObject[findIndexParentWithMostKeys(transformedObject)],
    );

    const columns = Object.keys(keyData).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    workSheet.columns = columns;

    transformedObject.forEach((element, index) => {
      const flatObj = flattenObj(element);
      const rowNum = index + 2; // Use the index to get the current row number
      const row = workSheet.getRow(rowNum);

      // Code to find if there are columns that contains image keyword in its name then we'll assume it carries image buffer
      const base64regex = /^[A-Za-z0-9+/]+={0,2}$/;

      Object.keys(flatObj).forEach((key) => {
        const value = flatObj[key];
        const isAttachment =
          (key.includes('image') ||
            key.toLowerCase().includes('attachment') ||
            key.toLowerCase().includes('photo')) &&
          !key.toLowerCase().includes('link');
        if (
          !value ||
          typeof value !== 'string' ||
          value.length === 0 ||
          value.length > 5000000
        ) {
          return;
        }

        if (isAttachment && base64regex.test(value)) {
          row.height = 100;

          const column = workSheet.getColumn(key);
          delete flatObj[key];

          try {
            const extension = getImageExtension(value);
            //ADD THIS: Validate image buffer before adding to workbook
            const imageBuffer = Buffer.from(value, 'base64');

            // Check minimum viable file size (corrupt files are often too small or malformed)
            if (imageBuffer.length < 100) {
              flatObj[key] = '-';
              return;
            }

            // Validate image magic bytes (file signature)
            const isValidImage =
              (extension === 'png' &&
                imageBuffer[0] === 0x89 &&
                imageBuffer[1] === 0x50) || // PNG: \x89P
              ((extension === 'jpeg' || extension === 'jpg') &&
                imageBuffer[0] === 0xff &&
                imageBuffer[1] === 0xd8) || // JPEG: \xFF\xD8
              (extension === 'gif' &&
                imageBuffer[0] === 0x47 &&
                imageBuffer[1] === 0x49) || // GIF: GI
              (extension === 'webp' &&
                imageBuffer[8] === 0x57 &&
                imageBuffer[9] === 0x45); // WEBP: WE

            if (!isValidImage) {
              flatObj[key] = '-';
              return;
            }
            const imageId = workBook.addImage({
              extension: extension, // or detect dynamically
              base64: value,
            });

            workSheet.addImage(
              imageId,
              `${column.letter}${rowNum}:${column.letter}${rowNum}`,
            );
          } catch (err) {
            flatObj[key] = '-';
          }
        } else if (isValidUrl(value)) {
          flatObj[key] = value;
        }
      });
      row.values = flatObj;
      Object.keys(flatObj).forEach((key) => {
        const value = flatObj[key];
        if (isValidUrl(value)) {
          const column = workSheet.getColumn(key);
          const cell = workSheet.getCell(`${column.letter}${rowNum}`);

          cell.value = {
            text: key.toLowerCase().includes('link') ? 'View File' : 'View',
            hyperlink: value,
          };

          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }
      });

      /** ---------- Styling ---------- */
      if (config?.isWrapText || config?.fillColor || config?.font) {
        row.eachCell((cell, colNum) => {
          if (config.isWrapText?.(cell, colNum)) {
            cell.alignment = { wrapText: true };
          }

          const fill = config.fillColor?.(cell, colNum);
          if (fill) {
            cell.fill = fill;
          }

          const font = config.font?.(cell, colNum);
          if (font) {
            cell.font = font;
          }
        });
      }
    });
    formatFirstRow(workSheet, 1);

    if (boldLastRow) {
      const lastRow = workSheet.getRow(data.length + 1);
      lastRow.eachCell((cell) => {
        cell.font = { bold: true, name: 'calibri' };
      });
    }

    if (config?.saveToFile && config?.filePath) {
      const dir = path.dirname(config.filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true }); // 👈 FIX
      }

      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(config.filePath);

        stream.on('finish', resolve);
        stream.on('error', reject);

        if (fileType === 'csv') {
          workBook.csv.write(stream).then(resolve).catch(reject);
        } else {
          workBook.xlsx.write(stream).then(resolve).catch(reject);
        }
      });

      return config.filePath;
    }
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? await workBook.csv.write(res)
      : await workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const generateChecklistExcel = async (
  data,
  fileName,
  fileType,
  res,
  CheckListNames,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  let i = 0;
  for (let checkList of data) {
    const sheetName = getUniqueSheetName(workBook, CheckListNames[i]);
    const workSheet = workBook.addWorksheet(sheetName);
    i++;

    const headerNames = Object.keys(checkList[0]);

    const transformedObject = [];
    for (let i = 0; i < checkList.length; i++) {
      let isNotArray = true;
      headerNames.forEach((key) => {
        if (Array.isArray(checkList[i][key]) === true) {
          checkList[i][key].forEach((obj) => {
            isNotArray = false;
            // Deep copy so that values in data[i] does not get changed
            const transformedElement = JSON.parse(JSON.stringify(checkList[i]));
            transformedElement[key] = obj;
            transformedObject.push({ ...transformedElement });
          });
        }
      });
      if (isNotArray)
        transformedObject.push(JSON.parse(JSON.stringify(checkList[i])));
    }
    if (transformedObject.length === 0) transformedObject.push(...checkList);

    const keyData = flattenObj(
      transformedObject[findIndexParentWithMostKeys(transformedObject)],
    );

    const columns = Object.keys(keyData).map((key) => ({
      header: key,
      key,
      width: 15,
    }));

    workSheet.columns = columns;

    transformedObject.forEach((element) => {
      workSheet.addRow(flattenObj(element));
    });
    formatFirstRow(workSheet, 1);
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelforSalaryStructure = async (
  data,
  fileName,
  fileType,
  res,
  sheetNames,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  let i = 0;
  for (let checkList of data) {
    const sheetName = getUniqueSheetName(workBook, sheetNames[i]);
    const workSheet = workBook.addWorksheet(sheetName);
    i++;

    let salarycalculation =
      checkList[0][0].baseOnCalculation === 'M'
        ? 'Monthly'
        : checkList[0][0].baseOnCalculation === 'D'
          ? 'Daily'
          : 'Hourly';

    workSheet.addRow([
      'Salary applicableFrom',
      `${checkList[0][0].applicableFrom}`,
    ]);
    workSheet.addRow(['Salary Structure', salarycalculation]);

    checkList = checkList[1];

    // const headerNames = Object.keys(checkList[0]);

    workSheet.addRow([
      'Payhead Name',
      'Employee SalaryAmount',
      'Formula',
      'SalaryField SrNo',
      'ConsiderIn',
    ]);

    const employeedata = checkList.map((employee) => Object.values(employee));

    employeedata.map((e) => workSheet.addRow(e));

    formatFirstRow(workSheet, 3);

    workSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const payheadNameCell = row.getCell(1).text;
      if (['GROSS', 'NET SALARY', 'CTC'].includes(payheadNameCell)) {
        // Apply your desired styles here, for example:
        row.eachCell((cell) => {
          // cell.fill = {
          //   type: 'pattern',
          //   pattern: 'solid',
          //   fgColor: { argb: 'FFFF00' }, // Yellow background color
          // };
          cell.font = { color: { argb: '000000' }, bold: true }; // Red bold text
        });
      }
    });
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

async function styleRow(worksheet, row) {
  worksheet.getRow(row).font = {
    bold: true,
    color: { argb: '000000' },
  };

  worksheet.getRow(row).alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };
}

function alignment(worksheet, row) {
  worksheet.getRow(row).alignment = {
    vertical: 'middle',
    horizontal: 'left',
  };
}

function alignment2(worksheet, row) {
  worksheet.getRow(row).alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };
}

const generateExcelForLeave = async (
  Leaveata,
  firstHeader,
  leaveHeader,
  companyid,
  sendmail,
  date,
  fileName,
  fileType,
  res,
  SheetsNames,
) => {
  if (!Leaveata.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  let i = 0;
  for (let data of Leaveata) {
    const sheetName = getUniqueSheetName(workBook, SheetsNames[i]);
    const worksheet = workBook.addWorksheet(sheetName);
    i++;

    worksheet.addRow([]);
    worksheet.addRow([firstHeader]);

    const leave_header = Array.from(
      { length: leaveHeader.length - 1 },
      () => '',
    );

    const header2 = [
      ...[
        'Sr. No.',
        'Name Of Employee',
        'Department',
        'Leave',
        '',
        'Leave Approved/Pending/Absent',
        'No. Of',
        'Before This Application Leave Taken',
      ],
      ...leave_header,
      ...[
        'No. Of Absent Leaves in this Financial Year',
        'No. Of Late In/Early Out in Financial Year',
      ],
    ];
    const header3 = [
      ...['', '', '', 'From', 'To', '', 'Days'],
      ...leaveHeader,
      ...['No.', 'No.'],
    ];

    worksheet.addRow(header2);
    worksheet.addRow(header3);

    await styleRow(worksheet, 2);
    await styleRow(worksheet, 3);
    await styleRow(worksheet, 4);

    worksheet.mergeCells(2, 1, 2, +header2.length);
    worksheet.mergeCells(3, 1, 4, 1);
    worksheet.mergeCells(3, 2, 4, 2);
    worksheet.mergeCells(3, 3, 4, 3);
    worksheet.mergeCells(3, 4, 3, 5);
    worksheet.mergeCells(3, 8, 3, 8 + +leave_header.length);

    const row2 = worksheet.getRow(2);
    row2.height = 20;

    row2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'daeef3' }, // Red color
      };
    });

    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ebf1de' }, // Red color
      };
    });

    worksheet.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ebf1de' }, // Red color
      };
    });

    const mergeRanges = {};
    const data2 = data.map((row, index) => {
      row['SrNo'] = index;
      return Object.values(row);
    });

    let num = 1;
    await Promise.all(
      data2.map(async (d, i) => {
        const currentDisplayName = data[i].displayName;

        // Check if the display name is the same as the previous row
        if (i > 0 && currentDisplayName === data[i - 1].displayName) {
          d[0] = '';
          // Increment the end column of the merged range
          mergeRanges[currentDisplayName].map((a) => {
            a.endRow++;
          });
        } else {
          d[0] = num++;
          const leavemergecell = leaveHeader.map((m, index) => {
            return {
              startRow: i + 5,
              startColumn: 8 + index, // Assuming display name is in the second column
              endRow: i + 5,
              endColumn: 8 + index,
            };
          });

          // Create a new entry for the display name
          mergeRanges[currentDisplayName] = [
            ...[
              {
                startRow: i + 5,
                startColumn: 1, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 1,
              },
              {
                startRow: i + 5,
                startColumn: 2, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 2,
              },
              {
                startRow: i + 5,
                startColumn: 3, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 3,
              },
              {
                startRow: i + 5,
                startColumn: 8 + +leaveHeader.length, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 8 + +leaveHeader.length,
              },
              {
                startRow: i + 5,
                startColumn: 9 + +leaveHeader.length, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 9 + +leaveHeader.length,
              },
            ],
            ...leavemergecell,
          ];
        }
        worksheet.addRow(d);
      }),
    );

    for (const displayName in mergeRanges) {
      const range = mergeRanges[displayName];

      range.map((e) => {
        worksheet.mergeCells(e.startRow, e.startColumn, e.endRow, e.endColumn);
      });
    }

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        alignment(worksheet, rowNumber + 3);
        // if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
        // }
      });
    });
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  if (sendmail == true) {
    const role = await RolePermission.findAll({
      raw: true,
      include: [
        {
          model: FormMaster,
          where: { formName: 'FYWiseLeaveReport' },
          attributes: [],
        },
        {
          model: RoleMaster,
          where: {
            companyMasterID: companyid,
          },
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.col('rolePermission.roleMasterID'), 'roleMasterID'],
      ],
    });

    const allRoleIds = role.map((e) => e.roleMasterID);

    const user = await UserRole.findAll({
      raw: true,
      where: {
        roleMasterID: {
          [Op.in]: allRoleIds,
        },
      },
      include: [
        {
          model: UserMaster,
          where: { companyMasterId: companyid, status: 1 },
          attributes: [],
        },
      ],

      attributes: [
        [Sequelize.col('userMaster.email'), 'email'],
        [Sequelize.col('userMaster.userMasterID'), 'userMasterID'],
      ],
    });

    const fromtomail = await findCompanyNotificationPolicy(+companyid);

    if (fromtomail) {
      if (fromtomail.email) {
        let gmailTransporterForTP = nodemailer.createTransport({
          host: fromtomail.hostmail, // Gmail Host
          port: fromtomail.port, // Port
          secure: fromtomail.secure, // this is true as port is 465
          auth: {
            user: fromtomail.email, // generated ethereal user
            pass: fromtomail.password, // generated ethereal password
          },
        });

        const data = [];
        user.map((e) => {
          if (e.email) data.push(e.email);
        });

        if (data.length > 0) {
          try {
            const mailOptions = {
              from: fromtomail.email, // sender email address
              to: data,
              subject: 'FY Leave Report Date' + `${date}`, // Subject of Email
              text: 'Please find the Leave report attached.', // plain text body
              replyTo: '', // If reply is required then add that emial address
              attachments: [
                {
                  filename: `${fileName}.xlsx`,
                  content: await workBook.xlsx.writeBuffer(),
                },
              ], // attachments: attachments
            };

            gmailTransporterForTP.sendMail(mailOptions, function (err, body) {
              //If there is an error, render the error page
              if (err) {
                return { sattus: 0, message: err };
              }
              //Else we can greet\ and leave
              else {
                return body;
              }
            });
          } catch (e) {
            return { status: 0, message: e };
          }
        }
      }
    }
  } else {
    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  }
};

const generateExcelForLeaveBalance = async (
  leaveHeader,
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const worksheet = workBook.addWorksheet('Leave Balance', {
    views: [
      {
        state: 'frozen',
        xSplit: 3,
        ySplit: 2,
      },
    ],
  });

  const leave_header = Array.from({ length: leaveHeader.length - 1 }, () => '');

  const header1 = [
    ...[
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
      'Opening Balance',
    ],
    ...leave_header,
    ...['Added Balance'],
    ...leave_header,
    ...['Used Balance'],
    ...leave_header,
    ...['Lapse Balance'],
    ...leave_header,
    ...['Encash Balance'],
    ...leave_header,
    ...['Expired Balance'],
    ...leave_header,
    ...['Closing Balance'],
  ];
  const header2 = [
    ...['', '', '', '', '', '', '', ''],
    ...leaveHeader,
    ...leaveHeader,
    ...leaveHeader,
    ...leaveHeader,
    ...leaveHeader,
    ...leaveHeader,
    ...leaveHeader,
  ];

  worksheet.addRow(header1);
  worksheet.addRow(header2);

  worksheet.mergeCells(1, 1, 2, 1);
  worksheet.mergeCells(1, 2, 2, 2);
  worksheet.mergeCells(1, 3, 2, 3);
  worksheet.mergeCells(1, 4, 2, 4);
  worksheet.mergeCells(1, 5, 2, 5);
  worksheet.mergeCells(1, 6, 2, 6);
  worksheet.mergeCells(1, 7, 2, 7);
  worksheet.mergeCells(1, 8, 2, 8);

  worksheet.mergeCells(1, 9, 1, 8 + +leaveHeader.length);
  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length,
    1,
    8 + +leaveHeader.length * 2,
  );
  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length * 2,
    1,
    8 + +leaveHeader.length * 3,
  );
  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length * 3,
    1,
    8 + +leaveHeader.length * 4,
  );
  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length * 4,
    1,
    8 + +leaveHeader.length * 5,
  );

  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length * 5,
    1,
    8 + +leaveHeader.length * 6,
  );

  worksheet.mergeCells(
    1,
    9 + +leaveHeader.length * 6,
    1,
    8 + +leaveHeader.length * 7,
  );

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => worksheet.addRow(e));

  const color1 = 'e7e7e7';
  const color2 = 'FFFFFF';

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      alignment(worksheet, rowNumber + 2);

      // Apply border
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };

      // Skip the first N columns entirely
      if (colNumber <= 8) return;

      // Adjust column number after skipping
      const adjustedCol = colNumber - 8;

      // Determine group index based on adjusted column number
      const groupIndex = Math.floor((adjustedCol - 1) / leaveHeader.length);

      // Alternate colors between groups
      const fillColor = groupIndex % 2 === 0 ? color1 : color2;

      // Apply background color
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForFormELeaveRegister = async (
  leaveHeader,
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');

  const workBook = new Excel.Workbook();

  const fixedHeaders = [
    'Sr. No',
    'Employee Name',
    'No. Of Days Worked In the Year',
  ];

  const balanceTypes = [
    'Opening',
    'Added',
    'Used',
    'Lapsed',
    'Encashed',
    'Expired',
    'Closing',
  ];

  const worksheet = workBook.addWorksheet('Leave Balance', {
    views: [
      {
        state: 'frozen',
        xSplit: fixedHeaders.length,
        ySplit: 2,
      },
    ],
  });

  const header1 = [
    ...fixedHeaders,
    ...leaveHeader.flatMap((leave) =>
      balanceTypes.map((_, index) => (index === 0 ? leave : '')),
    ),
  ];

  const header2 = [
    ...fixedHeaders.map(() => ''),
    ...leaveHeader.flatMap(() => balanceTypes),
  ];

  worksheet.addRow(header1);
  worksheet.addRow(header2);

  fixedHeaders.forEach((_, index) => {
    worksheet.mergeCells(1, index + 1, 2, index + 1);
  });

  let startCol = fixedHeaders.length + 1;

  leaveHeader.forEach(() => {
    const endCol = startCol + balanceTypes.length - 1;
    worksheet.mergeCells(1, startCol, 1, endCol);
    startCol = endCol + 1;
  });

  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 25;

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DAEEF3' },
    };
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'EBF1DE' },
    };
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  });

  data.forEach((row, index) => {
    const rowData = [
      row['Sr. No'] || index + 1,
      row['Employee Name'] || '',
      row.attendancePresentDays || 0,
    ];

    leaveHeader.forEach((leave) => {
      rowData.push(
        row[`openingBalance${leave}`] ?? 0,
        row[`addBalance${leave}`] ?? 0,
        row[`usedBalance${leave}`] ?? 0,
        row[`lapseBalance${leave}`] ?? 0,
        row[`encashBalance${leave}`] ?? 0,
        row[`expiredBalance${leave}`] ?? 0,
        row[`closingBalance${leave}`] ?? 0,
      );
    });

    worksheet.addRow(rowData);
  });

  const color1 = 'E7E7E7';
  const color2 = 'FFFFFF';

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      if (colNumber <= fixedHeaders.length) return;

      const adjustedCol = colNumber - fixedHeaders.length;
      const groupIndex = Math.floor((adjustedCol - 1) / balanceTypes.length);
      const fillColor = groupIndex % 2 === 0 ? color1 : color2;

      if (rowNumber > 2) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor },
        };
      }
    });
  });

  worksheet.columns.forEach((column, index) => {
    if (index === 0) column.width = 10;
    else if (index === 1) column.width = 28;
    else if (index === 2) column.width = 25;
    else column.width = 14;
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};
function setCellColor(headerRow, startIndex, endIndex, color) {
  for (let i = startIndex; i <= endIndex; i++) {
    headerRow.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }
}

const generateDemoExcelForVariable = async (
  header,
  final,
  fileName,
  fileType,
  res,
) => {
  if (!final.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);

  const headerNames = Object.keys(final[0]);

  const finalHeader = [...headerNames, ...['Date'], ...header];

  const headerRow = workSheet.addRow(finalHeader);

  workSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.protection = { locked: true };
  });

  // Set light blue color for cells 1 to 5
  setCellColor(headerRow, 1, 6, 'ADD8E6'); // Light Blue

  if (fileName == 'incentive') {
    // Set light green color for cells 6 to incentiveHeader.length
    setCellColor(headerRow, 7, finalHeader.length, '90EE90'); // Light Green
  } else {
    // Set red color for penaltyHeader
    setCellColor(headerRow, 7, finalHeader.length, 'FF0000');
  }

  const data2 = final.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

function alignmentmiddle(worksheet, row) {
  worksheet.getRow(row).alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };
}

function bold(worksheet, row) {
  worksheet.getRow(row).font = {
    bold: true,
    color: { argb: '000000' },
  };
}

const generateExcelForDailyCost = async (
  headerMonth,
  datesArray,
  finaldata,
  wagessumArray,
  staffsumArray,
  othersumArray,
  sheetNames,
  sendmail,
  companyid,
  oneDayBeforedate,
  fileName,
  fileType,
  res,
) => {
  if (!finaldata.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  datesArray.unshift('Date');

  finaldata.map((data, index) => {
    const sheetName = getUniqueSheetName(workBook, sheetNames[index]);
    const worksheet = workBook.addWorksheet(sheetName);

    worksheet.addRow([]);
    worksheet.addRow([`Month:- ${headerMonth}`]);

    worksheet.getRow(2).height = 30;

    //  worksheet.getRow(2).font = { size: 40, bold: true };

    worksheet.addRow(datesArray);

    const costheader = Array.from(
      { length: datesArray.length - 1 },
      () => 'Cost',
    );

    costheader.unshift('Department Name');

    worksheet.addRow(costheader);

    worksheet.getRow(4).height = 22;

    worksheet.mergeCells(2, 1, 2, +costheader.length);

    data.map((e) => {
      const amountArray = e.amount;

      amountArray.unshift(e.department);

      worksheet.addRow(amountArray);
    });

    worksheet.addRow([]);

    if (sheetNames[index] == 'Wages') {
      wagessumArray.unshift('Total Cost');
      worksheet.addRow(wagessumArray);
    } else if (sheetNames[index] == 'Staff') {
      staffsumArray.unshift('Total Cost');
      worksheet.addRow(staffsumArray);
    } else {
      othersumArray.unshift('Total Cost');
      worksheet.addRow(othersumArray);
    }

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber == 1 && rowNumber > 4) {
          cell.font = {
            size: 12,
            bold: true,
            color: { argb: '000000' },
          };
        }

        if (rowNumber < 5 && rowNumber != 2) {
          bold(worksheet, rowNumber);
        }

        alignmentmiddle(worksheet, rowNumber);
        // if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };

        if (rowNumber === 2) {
          cell.border = {
            top: { style: 'thick', color: { argb: '000000' } },
            left: { style: 'thick', color: { argb: '000000' } },
            bottom: { style: 'thick', color: { argb: '000000' } },
            right: { style: 'thick', color: { argb: '000000' } },
          };
          cell.font = { size: 20, bold: true }; // Make the text bold as well
        }
        // }
      });
    });

    worksheet.getRow(2).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'eeece1' },
      };
      // cell.font = {size:15, bold: true };
    });

    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e6b8b7' },
      };
    });

    worksheet.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'f2dcdb' },
      };
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  if (sendmail == true) {
    const role = await RolePermission.findAll({
      raw: true,
      include: [
        {
          model: FormMaster,
          where: { formName: 'DailyCostReport' },
          attributes: [],
        },
        {
          model: RoleMaster,
          where: {
            companyMasterID: companyid,
          },
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.col('rolePermission.roleMasterID'), 'roleMasterID'],
      ],
    });

    const allRoleIds = role.map((e) => e.roleMasterID);

    const user = await UserRole.findAll({
      raw: true,
      where: {
        roleMasterID: {
          [Op.in]: allRoleIds,
        },
      },
      include: [
        {
          model: UserMaster,
          where: { companyMasterId: companyid, status: 1 },
          attributes: [],
        },
      ],

      attributes: [
        [Sequelize.col('userMaster.email'), 'email'],
        [Sequelize.col('userMaster.userMasterID'), 'userMasterID'],
      ],
    });

    const fromtomail = await findCompanyNotificationPolicy(+companyid);

    if (fromtomail) {
      if (fromtomail.email) {
        let gmailTransporterForTP = nodemailer.createTransport({
          host: fromtomail.hostmail, // Gmail Host
          port: fromtomail.port, // Port
          secure: fromtomail.secure, // this is true as port is 465
          auth: {
            user: fromtomail.email, // generated ethereal user
            pass: fromtomail.password, // generated ethereal password
          },
        });

        const data = [];
        user.map((e) => {
          if (e.email) data.push(e.email);
        });

        if (data.length > 0) {
          try {
            const mailOptions = {
              from: fromtomail.email, // sender email address
              to: data,
              subject: 'Daily Cost Report -' + `${oneDayBeforedate}`, // Subject of Email
              text: '', // plain text body
              replyTo: '', // If reply is required then add that emial address
              attachments: [
                {
                  filename: `${fileName}.xlsx`,
                  content: await workBook.xlsx.writeBuffer(),
                },
              ], // attachments: attachments
            };

            gmailTransporterForTP.sendMail(mailOptions, function (err, body) {
              //If there is an error, render the error page
              if (err) {
                return { sattus: 0, message: err };
              }
              //Else we can greet\ and leave
              else {
                return body;
              }
            });
          } catch (e) {
            return { status: 0, message: e };
          }
        }
      }
    }
  } else {
    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  }
};

const EmailSalarySlip = async (AllsalarySlips, fromMail, month) => {
  const gmailTransporterForTP = nodemailer.createTransport({
    host: fromMail.hostmail, // Gmail Host
    port: fromMail.port, // Port
    secure: fromMail.secure, // this is true as port is 465
    auth: {
      user: fromMail.email, // generated ethereal user
      pass: fromMail.password, // generated ethereal password
    },
  });

  for (const data of AllsalarySlips) {
    if (!data.email || !data.path) {
      continue;
    }

    try {
      let pdfBuffer;

      if (data.isS3Upload === true) {
        // Get PDF from S3
        pdfBuffer = await getS3File(bucketName, data.path, 'buffer');
      } else {
        // Get PDF from local storage
        pdfBuffer = fs.readFileSync(data.path);
      }

      const mailOptions = {
        from: fromMail.email,
        to: data.email,
        subject: `Salary Slip for the Month -${month}`,
        text: '', // plain text body
        replyTo: '', // If reply is required then add that emial address
        attachments: [
          {
            filename: `SalarySlip_${data.displayName}_${month}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      gmailTransporterForTP.sendMail(mailOptions, function (err, body) {
        //If there is an error, render the error page
        if (err) {
          return;
        }
        //Else we can greet\ and leave
        else {
          return;
        }
      });
    } catch (e) {
      return;
    }
  }
};

const generateExcelForTackingReport = async (
  total_kms,
  final,
  fileName,
  fileType,
  res,
) => {
  if (!final.length) throw new Error('No data found to generate the file!');

  let newData = final.map((item) => {
    let newItem = { ...item };
    delete newItem['userMaster.userMasterID'];
    return newItem;
  });

  let final1 = newData.map((item) => ({
    'EMPLOYEE CODE': item.employeeCode,
    'USER NAME': item.displayName,
    'USER NUMBER': item.userNumber,
    ADRESS: item.Address,
    'TRACK DATETIME': asiaKolkataDateTime(item.Track_datetime),
    BATTERY: item.Battery,
    GPS: item.Gps,
    WIFI: item.Wifi,
    'MOBILE NAME': item.Mobile_name,
    'ITEM TYPE': item.type,
  }));

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);

  workSheet.addRow([` Total Kms : ${total_kms}`]);
  workSheet.mergeCells(1, 1, 1, 10);
  workSheet.getRow(1).eachCell((cell) => {
    cell.font = { size: 16, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const headerNames = Object.keys(final1[0]);

  workSheet.addRow(headerNames);

  workSheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const data2 = final1.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForMusterRoll = async (
  data,
  companyName,
  Branch,
  month,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');

  const mergeCells = (startRow, endRow) =>
    workSheet.mergeCells(
      startRow,
      1,
      endRow,
      9 + +data[0].attendance.length + +data[0].leaveArray.length,
    );

  const setRowHeight = (rowNumber, height) =>
    (workSheet.getRow(rowNumber).height = height);

  workSheet.addRow(['FORM XVI']);
  workSheet.addRow(['[See Rule 78 (2) (a)]']);
  workSheet.addRow(['Muster Roll']);
  workSheet.addRow(['For the month of : ' + month]);
  workSheet.addRow(['Name and Address of Company : ' + companyName]);
  workSheet.addRow(['Name and Address of Branch : ' + Branch]);
  workSheet.addRow([]);

  mergeCells(1, 1);
  mergeCells(2, 2);
  mergeCells(3, 3);
  mergeCells(4, 4);
  mergeCells(5, 5);
  mergeCells(6, 6);
  mergeCells(7, 7);
  setRowHeight(1, 25);
  setRowHeight(2, 25);
  setRowHeight(3, 25);

  await styleRow(workSheet, 1);
  await styleRow(workSheet, 2);
  await styleRow(workSheet, 3);

  const sefontSize = (row, size) => {
    workSheet.getRow(row).font = {
      bold: true,
      size: size,
      color: { argb: '000000' },
    };
  };

  sefontSize(1, 17);
  sefontSize(2, 15);
  sefontSize(3, 16);

  workSheet.getRow(4).alignment = {
    vertical: 'middle',
    horizontal: 'right',
  };
  workSheet.getRow(4).font = {
    bold: true,
    color: { argb: '000000' },
  };

  const header = ['Sr No.', 'Employee Code', 'Employee Name', 'Designation'];

  data[0].attendance.map((e) => {
    header.push(e.date);
  });

  const leaveheader = data[0].leaveArray.map((e) => e.leaveName);

  const headerNames = [
    ...header,
    ...['Working Days', 'WH', 'PH'],
    ...leaveheader,
    ...['AB', 'Total'],
  ];

  workSheet.addRow(headerNames);

  workSheet.getRow(8).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });

  data.map((e) => {
    const rowdata = [e.SrNo, e.employeeCode, e.employeeName, e.designation];

    e.attendance.map((a) => rowdata.push(a.value));

    const leavedata = e.leaveArray.map((l) => l.value);

    const final = [
      ...rowdata,
      ...[e.workingday, e.week_Off, e.holiday],
      ...leavedata,
      ...[e.absent, e.total],
    ];
    workSheet.addRow(final);
  });

  workSheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 8) {
      row.eachCell((cell, colNumber) => {
        // alignment(workSheet, rowNumber + 7);
        // if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
        // }
      });
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForFORM_D_AttendanceRegister = async (
  data,
  otherdata,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');

  const mergeCells = (startRow, endRow) =>
    workSheet.mergeCells(startRow, 1, endRow, 12 + +data[0].attendance.length);

  const setRowHeight = (rowNumber, height) =>
    (workSheet.getRow(rowNumber).height = height);

  workSheet.addRow(['FORM D']);
  workSheet.addRow(['FORMAT OF ATTENDANCE REGISTER']);
  workSheet.addRow([`Name and Address of Company : ${otherdata.companydata}`]);
  workSheet.addRow([`Name and Address of Branch : ${otherdata.branchdata}`]);
  workSheet.addRow([
    `For the period From : ${otherdata.start_date} To ${otherdata.end_date}`,
  ]);
  workSheet.addRow([]);

  mergeCells(1, 1);
  mergeCells(2, 2);
  mergeCells(3, 3);
  mergeCells(4, 4);
  mergeCells(5, 5);
  mergeCells(6, 6);

  setRowHeight(1, 25);
  setRowHeight(2, 25);

  await styleRow(workSheet, 1);
  await styleRow(workSheet, 2);

  const sefontSize = (row, size) => {
    workSheet.getRow(row).font = {
      bold: true,
      size: size,
      color: { argb: '000000' },
    };
  };

  sefontSize(1, 17);
  sefontSize(2, 15);

  const date_header = data[0].attendance.map((e) => e.date);

  const mainHeader = [
    ...[
      'Sr No.',
      'Employee Code',
      'Designation',
      'Employee Name',
      'Branch',
      'Time',
    ],
    ...date_header,
    ...[
      'summary No. of days',
      'WeekOff',
      'Holiday',
      'Absent',
      'Remarks No. of Hours',
      'Signature of Register Keeper',
    ],
  ];

  workSheet.addRow(mainHeader);

  workSheet.getRow(7).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });

  let countrow = 7;
  data.map((e, index) => {
    const rowdata = [
      index + 1,
      e.employeeCode,
      e.designation,
      e.employeeName,
      e.branch,
    ];

    const indata = e.attendance.map((a) => a.intime);

    const outdata = e.attendance.map((a) => a.outtime);

    workSheet.addRow([
      ...rowdata,
      ...['IN'],
      ...indata,
      ...[e.present, e.week_Off, e.holiday, e.absent, '', ''],
    ]);
    countrow++;
    const firstrow = countrow;
    workSheet.addRow([
      ...rowdata,
      ...['OUT'],
      ...outdata,
      ...[e.present, e.week_Off, e.holiday, e.absent, '', ''],
    ]);
    countrow++;
    const lasttrow = countrow;

    workSheet.mergeCells(firstrow, 1, lasttrow, 1);
    workSheet.mergeCells(firstrow, 2, lasttrow, 2);
    workSheet.mergeCells(firstrow, 3, lasttrow, 3);
    workSheet.mergeCells(firstrow, 4, lasttrow, 4);
    workSheet.mergeCells(firstrow, 5, lasttrow, 5);

    workSheet.mergeCells(
      firstrow,
      7 + +indata.length,
      lasttrow,
      7 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      8 + +indata.length,
      lasttrow,
      8 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      9 + +indata.length,
      lasttrow,
      9 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      10 + +indata.length,
      lasttrow,
      10 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      11 + +indata.length,
      lasttrow,
      11 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      12 + +indata.length,
      lasttrow,
      12 + +indata.length,
    );
  });

  workSheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 7) {
      row.eachCell((cell, colNumber) => {
        alignmentmiddle(workSheet, rowNumber);
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
      });
    }
  });

  workSheet.addRow([]);

  const tempheader = Array.from(
    { length: +data[0].attendance.length + 5 },
    () => '',
  );

  workSheet.addRow([
    ...[
      '#Relay and *Place of Work in case of Mines only (Underground/Opencast/Surface)',
    ],
    ...tempheader,
  ]);
  const tempadd1 = [
    ...[
      '**In case an employee is not present the following to be entered : PL for PaidLeave / A for Absent / WH for WeekOff / PH for Holiday',
    ],
    ...tempheader,
    ...['M/s. .....................................'],
  ];
  const tempadd2 = [
    ...['**Not neccessary in case of E Form maintenance.'],
    ...tempheader,
    ...['Authorised Signatory'],
  ];
  workSheet.addRow(tempadd1);
  workSheet.addRow(tempadd2);

  workSheet.mergeCells(
    countrow + 2,
    1,
    countrow + 2,
    6 + +data[0].attendance.length,
  );
  workSheet.mergeCells(
    countrow + 3,
    1,
    countrow + 3,
    6 + +data[0].attendance.length,
  );
  workSheet.mergeCells(
    countrow + 4,
    1,
    countrow + 4,
    6 + +data[0].attendance.length,
  );

  workSheet.mergeCells(
    countrow + 3,
    7 + +data[0].attendance.length,
    countrow + 3,
    12 + +data[0].attendance.length,
  );
  workSheet.mergeCells(
    countrow + 4,
    7 + +data[0].attendance.length,
    countrow + 4,
    12 + +data[0].attendance.length,
  );

  // mergeCells(countrow + 3, countrow + 3);

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForAttendanceData = async (
  data,
  resultArray,
  companyName,
  Branch,
  month,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');

  workSheet.addRow([companyName]);

  workSheet.mergeCells(1, 1, 1, 9 + +data[0].attendance.length);
  workSheet.getRow(1).height = 20;

  await styleRow(workSheet, 1);

  workSheet.getRow(1).font = {
    bold: true,
    size: 12,
    color: { argb: '000000' },
  };

  workSheet.addRow([
    'ATTENDANCE SHEET FOR THE MONTH OF ' +
      `${month}                        ` +
      `SITE : ${Branch}`,
  ]);

  workSheet.mergeCells(2, 1, 2, 9 + +data[0].attendance.length);

  const header = ['Sr No.', 'Employee Code', 'Employee Name', 'Designation'];

  data[0].attendance.map((e) => {
    header.push(e.date);
  });

  const headerNames = [
    ...header,
    ...[
      'Working Days',
      'WeeklyOff Days',
      'Absent Days',
      'FHD/NHD',
      'Total Days',
    ],
  ];

  workSheet.addRow(headerNames);

  workSheet.getRow(3).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });

  data.map((e) => {
    const rowdata = [e.SrNo, e.employeeCode, e.employeeName, e.designation];

    e.attendance.map((a) => rowdata.push(a.value));

    const final = [
      ...rowdata,
      ...[e.workingday, e.week_Off, e.absent, e.holiday, e.total],
    ];
    workSheet.addRow(final);
  });

  const sumdata = resultArray.map((e) => e.totalValue);

  workSheet.addRow([
    ...['Daily Total', '', '', ''],
    ...sumdata,
    ...['', '', '', '', ''],
  ]);

  workSheet.mergeCells(4 + +data.length, 1, 4 + +data.length, 4);

  workSheet.getRow(4 + +data.length).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  const tempheader = Array.from({ length: +sumdata.length + 8 }, () => '');

  workSheet.addRow([...['Initial Of Client'], ...tempheader]);

  workSheet.mergeCells(5 + +data.length, 1, 5 + +data.length, 4);
  workSheet.mergeCells(
    5 + +data.length,
    5,
    5 + +data.length,
    4 + +data[0].attendance.length,
  );

  workSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      alignment(workSheet, rowNumber + 2);
      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForShift = async (ShiftData, fileName, fileType, res) => {
  if (!ShiftData.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const header2 = [
    'Sr No',
    'Shift Name',
    'Company Name',
    'Shift Code',
    'Shift Desc',
    'Status',
    'Shift Grace',
    'Worker Type',
    'Shift Time',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const header3 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Day',
    'Start Time',
    'First Half End Time',
    'Second Half Start Time',
    'End Time',
    'Minimum Hours For Halfday',
    'Minimum Hours For Fullday ',
    'Punch-Out Time Limit (Minutes) ',
  ];

  worksheet.addRow(header2);
  worksheet.addRow(header3);

  await styleRow(worksheet, 1);
  await styleRow(worksheet, 2);

  worksheet.mergeCells(1, 9, 1, 16);

  for (let i = 1; i <= 8; i++) {
    worksheet.mergeCells(1, i, 2, i);
  }

  const row2 = worksheet.getRow(1);
  row2.height = 20;
  row2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  const data2 = ShiftData.map((row) => Object.values(row));

  data2.map((e) => worksheet.addRow(e));

  for (let j = 3; j <= data2.length; j = j + 7) {
    for (let i = 1; i <= 8; i++) {
      worksheet.mergeCells(j, i, j + 6, i);
    }
  }

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForFiveMinuteTackingReport = async (
  final,
  fileName,
  fileType,
  res,
  displayName,
  Track_datetime,
  employeecode,
) => {
  if (!final.length) throw new Error('No data found to generate the file!');

  let newData = final.map((item) => {
    let newItem = { ...item };
    delete newItem['userMaster.userMasterID'];
    return newItem;
  });

  let final1 = newData.map((item) => ({
    ADDRESS: item.Address,
    'TRACK TIME': new Date(item.Track_datetime).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
    }),
    BATTERY: item.Battery,
    GPS: item.Gps,
    WIFI: item.Wifi,
    'Duration (minutes)': item.duration,
  }));

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);
  const currentDate = new Date(Track_datetime).toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
  });
  const [month, day, year] = currentDate.split('/');
  const formattedDate = `${day}-${month}-${year}`;
  const userData = employeecode
    ? [`User Name :  ${displayName} (${employeecode}), Date:${formattedDate}`]
    : [`User Name :  ${displayName}, Date:${formattedDate}`];
  workSheet.addRow(userData);

  // workSheet.addRow([`User Name :  ${displayName} , ${(Track_datetime)}`]);
  workSheet.mergeCells(1, 1, 1, 6);
  workSheet.getRow(1).eachCell((cell) => {
    cell.font = { size: 16, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const headerNames = Object.keys(final1[0]);
  workSheet.addRow(headerNames);
  workSheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
  });

  const data2 = final1.map((row) => Object.values(row));
  data2.map((e) => workSheet.addRow(e));

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

//exportdata.js

const generateExcelForSalaryRegister = async (
  data,
  headerData,
  report,
  fileName,
  fileType,
  res,
  lengthDetails,
  calculationData,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');
  const keysArray = Object.keys(data[0]);

  const basicDataLength = lengthDetails.basicDataLength;
  const earningDataLength = lengthDetails.EarningLength;
  const extra_EarningLength = lengthDetails.extra_EarningLength;
  const EmpContriLength = lengthDetails.EmpContriLength;
  const OtherDeductionLength = lengthDetails.OtherDeductionLength;
  const employerSideLength = lengthDetails.employerSideLength;

  if (report == salaryRegisterTypeEnum.SALARY_REGISTER_WITH_DATE_OF_PAY) {
    const tempheader = Array.from({ length: +keysArray.length - 5 }, () => '');

    workSheet.addRow([headerData.companyName]);
    workSheet.addRow([
      ...[headerData.companyAddress],
      ...tempheader,
      ...[headerData.month],
    ]);
    if (headerData.branchName) {
      workSheet.addRow([
        `${headerData.branchName} , ${headerData.branchAddress}`,
      ]);
    }

    workSheet.mergeCells(1, 1, 1, keysArray.length);
    workSheet.mergeCells(2, 1, 2, keysArray.length - 4);
    workSheet.mergeCells(2, keysArray.length - 3, 2, keysArray.length);
    workSheet.mergeCells(3, 1, 3, keysArray.length);

    workSheet.getRow(1).height = 25;

    await styleRow(workSheet, 1);
    await styleRow(workSheet, 2);
    await styleRow(workSheet, 3);

    workSheet.getRow(1).font = {
      bold: true,
      size: 15,
      color: { argb: '000000' },
    };

    workSheet.addRow(keysArray);
  } else if (report == salaryRegisterTypeEnum.MONTHLY_SALARY_SUMMARY) {
    workSheet.addRow([
      ...keysArray.slice(0, 10),
      ...['Employee Contribution', ''],
      ...keysArray.slice(12, 16),
      ...['Employer Contribution', '', '', '', ''],
    ]);

    workSheet.addRow([
      ...Array.from({ length: +keysArray.slice(0, 10).length }, () => ''),
      ...keysArray.slice(10, 12),
      ...Array.from({ length: +keysArray.slice(12, 16).length }, () => ''),
      ...keysArray.slice(16, 21),
    ]);

    // for (let i = 0; i <= keysArray.slice(0, 10).length; i++) {
    //   const cell = i + 1;
    //   workSheet.mergeCells(cell, 2, 2, cell);
    // }

    workSheet.mergeCells(1, 11, 1, 12);

    // for (let i = 0; i <= keysArray.slice(12, 16).length; i++) {
    //   const cell = i + 1;
    //   workSheet.mergeCells(cell, 2, 2, cell);
    // }

    workSheet.mergeCells(1, 17, 1, 21);
  } else {
    // Initialize row array
    let row = [];

    row.push(...Array.from({ length: +basicDataLength }, () => ''));

    row.push(
      'Employee Earning',
      ...Array.from({ length: +earningDataLength }, () => ''),
    );

    // Conditionally add "Employee Contribution" and empty cells if `EmpContriLength` > 0
    if (EmpContriLength > 0) {
      row.push(
        'Employee Contribution',
        ...Array.from({ length: +EmpContriLength - 1 }, () => ''),
      );
    }

    row.push('', '');

    if (OtherDeductionLength > 0) {
      row.push(
        'Other Deduction',
        ...Array.from({ length: +OtherDeductionLength - 1 }, () => ''),
      );
    }

    if (extra_EarningLength > 0) {
      row.push(
        '',
        ...Array.from({ length: +extra_EarningLength - 1 }, () => ''),
      );
    }

    row.push('');

    if (employerSideLength > 0) {
      row.push('Employer Contribution');
    }

    // Add row to worksheet
    workSheet.addRow(row);

    workSheet.mergeCells(1, 1, 1, +basicDataLength);
    workSheet.mergeCells(
      1,
      +basicDataLength + 1,
      1,
      +basicDataLength + +earningDataLength,
    );
    if (EmpContriLength > 0) {
      workSheet.mergeCells(
        1,
        +basicDataLength + +earningDataLength + 2,
        1,
        +basicDataLength + +earningDataLength + +EmpContriLength + 1,
      );
    }

    if (OtherDeductionLength > 0) {
      workSheet.mergeCells(
        1,
        +basicDataLength + +earningDataLength + +EmpContriLength + 4,
        1,
        +basicDataLength +
          +earningDataLength +
          +EmpContriLength +
          +OtherDeductionLength +
          3,
      );
    }

    if (employerSideLength > 0) {
      workSheet.mergeCells(
        1,
        +basicDataLength +
          +earningDataLength +
          +EmpContriLength +
          +OtherDeductionLength +
          +extra_EarningLength +
          5,
        1,
        keysArray.length,
      );
    }

    workSheet.addRow(keysArray);
  }

  if (report == salaryRegisterTypeEnum.SALARY_REGISTER_WITH_DATE_OF_PAY) {
    workSheet.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '729fcf' }, // Blue Color
      };
      cell.font = { bold: true };
    });
  } else if (report == salaryRegisterTypeEnum.MONTHLY_SALARY_SUMMARY) {
    workSheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '729fcf' }, // Blue color
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    workSheet.getRow(2).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '729fcf' }, // Blue color
      };
      cell.font = { bold: true };
    });
  } else {
    workSheet.getRow(2).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '729fcf' }, // Blue color
      };
      cell.font = { bold: true };
    });

    workSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  if (report == salaryRegisterTypeEnum.MONTHLY_SALARY_SUMMARY) {
    workSheet.addRow(['']);
    workSheet.addRow(['']);
    workSheet.addRow(['']);
    workSheet.addRow(['']);

    const newRow = workSheet.addRow([
      ...['CALCULATION OF AMOUNT PAYABLE FOR E.P.F. ACCOUNT'],
      ...Array.from({ length: 11 }, () => ''),
      ...['CALCULATION OF AMOUNT PAYABLE FOR E.S.I.C. AMOUNT (TOTAL)'],
    ]);

    workSheet.mergeCells(newRow.number, 1, newRow.number, 5);

    workSheet.mergeCells(newRow.number, 13, newRow.number, 17);

    workSheet.getRow(newRow.number).eachCell((cell) => {
      cell.font = { bold: true };
    });

    workSheet.addRow(['']);

    const data3 = calculationData.map((row) => Object.values(row));

    data3.map((e) => {
      const row = workSheet.addRow(e);

      workSheet.mergeCells(row.number, 1, row.number, 5);

      workSheet.mergeCells(row.number, 13, row.number, 17);
    });
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

function base64ToUint8Array(base64String) {
  // const binaryString = atob(base64String);
  const binaryString = Buffer.from(base64String, 'base64').toString('binary');
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to create a zip file containing PDF files for salary slip

async function createZipFileForsalarySlip(
  salarySlipData,
  yearMonth,
  fileName,
  res,
) {
  const zip = new JSZip();

  for (let i = 0; i < salarySlipData.length; i++) {
    const data = salarySlipData[i];

    if (!data.path) {
      continue;
    }

    try {
      let pdfBuffer;

      if (data.isS3Upload === true) {
        // Get PDF from S3
        pdfBuffer = await getS3File(bucketName, data.path, 'buffer');
      } else {
        // Get PDF from local storage
        pdfBuffer = fs.readFileSync(data.path);
      }

      zip.file(`${i + 1} ${data.displayName} - ${yearMonth}.pdf`, pdfBuffer);
    } catch (e) {
      console.error(
        `Error adding salary slip to ZIP for ${data.displayName}:`,
        e.message,
      );
    }
  }

  const zipbuffer = await zip.generateAsync({
    type: 'nodebuffer',
  });

  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename=${fileName}.zip`,
  });

  return res.end(zipbuffer);
}

const setColorInBackground = (workSheet, row, color) => {
  workSheet.getRow(row).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `${color}` },
    };
    cell.font = { bold: true };
  });
};

const generateDemoExcelForAdvance = async (data, fileName, fileType, res) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Advance Data');
  const workSheet1 = workBook.addWorksheet('Basic Instructions');
  workSheet1.addRow(['Date Format must be in yyyy-mm-dd format.']);
  workSheet1.addRow([
    'Reference Date is required ,if you are selecting payment mode Cheque,UPI or NetBanking.',
  ]);

  setColorInBackground(workSheet1, 1, 'FF0000'); // light red
  setColorInBackground(workSheet1, 2, 'FF0000');

  const keysArray = Object.keys(data[0]);
  workSheet.addRow(keysArray);
  setColorInBackground(workSheet, 1, '729fcf'); // blue
  await styleRow(workSheet, 1);

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  // set payment mode in dropdown
  const paymentModeColumn = workSheet.getColumn(9);
  const paymentModeValues = basicPaymentOptionsArray;
  paymentModeColumn.eachCell((cell, rowNumber) => {
    if (rowNumber !== 1) {
      // Skip the header row
      const dataValidation = {
        type: 'list',
        formulae: [`"${paymentModeValues.join(',')}"`],
        allowNulls: true,
      };
      cell.dataValidation = dataValidation;
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForPreboarding = async (
  PreboardingData,
  fileName,
  fileType,
  res,
  index1,
) => {
  if (!PreboardingData.length)
    throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const header2 = [
    'Sr No',
    'User Name',
    'User Number',
    'Date of Birth',
    'Email',
    'Address',
    'Branch',
    'Designation',
    'Date Time',
    'Preboarding Request',
    '',
    '',
    '',
  ];
  const header3 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Assigned By',
    'Remarks',
    'Request Status',
    'Assigned to',
  ];

  worksheet.addRow(header2);
  worksheet.addRow(header3);

  await styleRow(worksheet, 1);
  await styleRow(worksheet, 2);

  worksheet.mergeCells(1, 10, 1, 12);

  for (let i = 1; i <= 9; i++) {
    worksheet.mergeCells(1, i, 2, i);
  }

  const row2 = worksheet.getRow(1);
  row2.height = 20;
  row2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  const data2 = PreboardingData.map((row) => Object.values(row));

  data2.map((e) => worksheet.addRow(e));

  let counts = {};

  for (let j = 0; j < data2.length; j++) {
    let srNo = data2[j][0];
    if (counts[srNo]) {
      counts[srNo]++;
    } else {
      counts[srNo] = 1;
    }
  }

  for (let i = 0; i < data2.length; i++) {
    for (let j = 0; j < 9; j++) {
      worksheet.mergeCells(
        i + 3,
        j + 1,
        i + 3 + counts[data2[i][0]] - 1,
        j + 1,
      );
    }
    i += counts[data2[i][0]] - 1;
  }
  worksheet.getColumn(9).numFmt = 'dd-mm-yyyy hh:mm:ss'; // Adjust format as per your preference

  // let indexofIndex1 = 0
  // for (let j = 3; j <= data2.length; j = j + index1[indexofIndex1]) {
  //   for (let i = 1; i <= 8; i++) {
  //     worksheet.mergeCells(j, i, j + 2, i);
  //   }
  // }

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForEmployeeGatePass = async (
  ShiftData,
  fileName,
  fileType,
  res,
) => {
  if (!ShiftData.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const header2 = [
    'Sr No',
    'Employee Name',
    'Company Name',
    'Branch',
    'Department',
    'Designation',
    'Stauts',
    'Description',
    'Date',
    'From Time',
    'To Time',
    'Purpose',
    'Rejection Reason',
    'Check In/Out Details',
    '',
    '',
    '',
  ];
  const header3 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',

    'Date',
    'Time',
    'Type',
    'Address',
  ];

  worksheet.addRow(header2);
  worksheet.addRow(header3);

  await styleRow(worksheet, 1);
  await styleRow(worksheet, 2);

  worksheet.mergeCells(1, 14, 1, 17);

  for (let i = 1; i <= 13; i++) {
    worksheet.mergeCells(1, i, 2, i);
  }

  const row2 = worksheet.getRow(1);
  row2.height = 20;
  row2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  const data2 = ShiftData.map((row) => Object.values(row));
  data2.map((e) => worksheet.addRow(e));

  let counts = {};

  for (let j = 0; j < data2.length; j++) {
    let srNo = data2[j][0];
    if (counts[srNo]) {
      counts[srNo]++;
    } else {
      counts[srNo] = 1;
    }
  }

  for (let i = 0; i < data2.length; i++) {
    for (let j = 0; j < 13; j++) {
      worksheet.mergeCells(
        i + 3,
        j + 1,
        i + 3 + counts[data2[i][0]] - 1,
        j + 1,
      );
    }
    i += counts[data2[i][0]] - 1;
  }

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForMonthlyAttendanceReport = async (
  data,
  companyName,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');

  workSheet.addRow([companyName]);
  workSheet.mergeCells(1, 1, 1, 5);
  workSheet.getRow(1).height = 22;

  await styleRow(workSheet, 1);

  workSheet.getRow(1).font = {
    bold: true,
    size: 15,
    color: { argb: '000000' },
  };

  function styleRowData(worksheet, row) {
    worksheet.getRow(row).font = {
      bold: true,
      color: { argb: '000000' },
    };
  }

  let merge = 1;

  for (let i = 0; i < data.length; i++) {
    merge++;
    workSheet.addRow([
      `Employee Code : ${data[i].EmployeeCode ? data[i].EmployeeCode : ''}`,
    ]);
    workSheet.mergeCells(merge, 1, merge, 5);
    styleRowData(workSheet, merge);
    merge++;
    workSheet.addRow([`Employee Name : ${data[i].EmployeeName} `]);
    workSheet.mergeCells(merge, 1, merge, 5);
    styleRowData(workSheet, merge);
    merge++;
    workSheet.addRow([`Designation : ${data[i].Designation} `]);
    workSheet.mergeCells(merge, 1, merge, 5);
    styleRowData(workSheet, merge);
    merge++;
    workSheet.addRow([`Month : ${data[i].month} `]);
    workSheet.mergeCells(merge, 1, merge, 5);
    styleRowData(workSheet, merge);
    merge++;
    workSheet.addRow(['DATE', 'SHIFT', 'IN TIME', 'OUT TIME', 'STATUS']);
    styleRowData(workSheet, merge);

    const data2 = data[i].attendanceData.map((row) => Object.values(row));

    data2.map((e) => workSheet.addRow(e));

    workSheet.addRow([
      `Total Days : ${data[i].monthDays} `,
      `Present : ${data[i].present}`,
      `Absent : ${data[i].absent}`,
      `Total Leave : ${data[i].totalleave}`,
      `WH/PH : ${data[i].weekoffHoliday}`,
    ]);
    merge += data[i].attendanceData.length + 1;
    styleRowData(workSheet, merge);
    workSheet.addRow([]);

    merge++;
  }

  workSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateDemoExcelForDivision = async (
  data,
  division,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Division');
  const workSheet1 = workBook.addWorksheet('Basic Instructions');
  workSheet1.addRow(['Date Format must be in yyyy-mm-dd format.']);
  workSheet1.addRow(['Division and Applicable Date are required fields.']);
  setColorInBackground(workSheet1, 1, 'FF0000'); // light red
  setColorInBackground(workSheet1, 2, 'FF0000'); // light red
  const keysArray = Object.keys(data[0]);
  workSheet.addRow(keysArray);
  setColorInBackground(workSheet, 1, '729fcf'); // blue
  await styleRow(workSheet, 1);

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  // set division in dropdown
  const divisionColumn = workSheet.getColumn(6);
  const paymentModeValues = division;
  divisionColumn.eachCell((cell, rowNumber) => {
    if (rowNumber !== 1) {
      // Skip the header row
      const dataValidation = {
        type: 'list',
        formulae: [`"${paymentModeValues.join(',')}"`],
        allowNulls: true,
      };
      cell.dataValidation = dataValidation;
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateDemoExcelForWorkingArea = async (
  data,
  workingArea,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Working Area');
  const workSheet1 = workBook.addWorksheet('Basic Instructions');
  workSheet1.addRow(['Date Format must be in yyyy-mm-dd format.']);
  workSheet1.addRow(['Working Area and Applicable Date are required fields.']);
  setColorInBackground(workSheet1, 1, 'FF0000'); // light red
  setColorInBackground(workSheet1, 2, 'FF0000'); // light red
  const keysArray = Object.keys(data[0]);
  workSheet.addRow(keysArray);
  setColorInBackground(workSheet, 1, '729fcf'); // blue
  await styleRow(workSheet, 1);

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  // set working Area  in dropdown
  const workingAreaColumn = workSheet.getColumn(6);
  const workingAreaValues = workingArea;
  workingAreaColumn.eachCell((cell, rowNumber) => {
    if (rowNumber !== 1) {
      // Skip the header row
      const dataValidation = {
        type: 'list',
        formulae: [`"${workingAreaValues.join(',')}"`],
        allowNulls: true,
      };
      cell.dataValidation = dataValidation;
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateDemoExcel = async (
  data,
  branch,
  department,
  designation,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Employee Data');
  const workSheet1 = workBook.addWorksheet('Branch');
  const workSheet2 = workBook.addWorksheet('Department');
  const workSheet3 = workBook.addWorksheet('Designation');

  // worksheeet
  const header = Object.keys(data[0]);

  workSheet.addRow(header);

  formatFirstRow(workSheet, 1);

  const data1 = data.map((row) => Object.values(row));

  data1.map((e) => workSheet.addRow(e));

  //worksheet1--branch

  workSheet1.addRow(['Branch']);
  formatFirstRow(workSheet1, 1);

  const data2 = branch.map((row) => [row.branchName]);

  data2.map((e) => workSheet1.addRow(e));

  //worksheet2--department

  workSheet2.addRow(['Department']);
  formatFirstRow(workSheet2, 1);

  const data3 = department.map((row) => [row.departmentName]);

  data3.map((e) => workSheet2.addRow(e));

  //worksheet1--desig

  workSheet3.addRow(['Designation']);
  formatFirstRow(workSheet3, 1);

  const data4 = designation.map((row) => [row.designationName]);

  data4.map((e) => workSheet3.addRow(e));

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateDemoExcelForPreviousSalary = async (
  employeeEarningHeader,
  employeeContributionHeader,
  employerContributionHeader,
  otherDeductionHeader,
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Previous Salary Data');

  const temp1 = Array.from(
    { length: +employeeEarningHeader.length - 1 },
    () => '',
  );

  const temp2 = Array.from(
    { length: +employeeContributionHeader.length - 1 },
    () => '',
  );

  const temp3 = Array.from(
    { length: +employerContributionHeader.length - 1 },
    () => '',
  );

  workSheet.addRow([
    ...['', '', '', '', '', 'Employee Earning Payhead'],
    ...temp1,
    ...['', 'Employee Contribution Payhead'],
    ...temp2,
    ...['', 'Employer Contribution Payhead'],
    ...temp3,
    ...['Other Payhead'],
  ]);

  workSheet.mergeCells(1, 6, 1, 5 + employeeEarningHeader.length);

  if (+employeeEarningHeader.length > 0 && employeeContributionHeader.length) {
    workSheet.mergeCells(
      1,
      6 + employeeEarningHeader.length + 1,
      1,
      5 + +employeeEarningHeader.length + 1 + employeeContributionHeader.length,
    );
  }

  if (
    employeeEarningHeader.length > 0 &&
    employeeContributionHeader.length > 0 &&
    employerContributionHeader.length
  ) {
    workSheet.mergeCells(
      1,
      6 +
        +employeeEarningHeader.length +
        1 +
        employeeContributionHeader.length +
        1,
      1,
      5 +
        employeeEarningHeader.length +
        1 +
        employeeContributionHeader.length +
        1 +
        employerContributionHeader.length,
    );
  }

  if (
    employeeEarningHeader.length > 0 &&
    employeeContributionHeader.length > 0 &&
    employerContributionHeader.length > 0 &&
    otherDeductionHeader.length
  ) {
    workSheet.mergeCells(
      1,
      6 +
        employeeEarningHeader.length +
        1 +
        employeeContributionHeader.length +
        1 +
        employerContributionHeader.length,
      1,
      5 +
        employeeEarningHeader.length +
        1 +
        employeeContributionHeader.length +
        1 +
        employerContributionHeader.length +
        otherDeductionHeader.length,
    );
  }

  workSheet.getRow(1).eachCell((cell) => {
    cell.font = { size: 12, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  workSheet.getRow(1).height = 20;

  const headerRow = workSheet.addRow(Object.keys(data[0]));

  // Set light blue color for cells 1 to 5
  setCellColor(headerRow, 1, 5, 'ADD8E6'); // Light Blue

  // Set light green color for cells 6 to incentiveHeader.length
  setCellColor(headerRow, 6, 5 + employeeEarningHeader.length, '90EE90'); // Light Green

  // Set red color for penaltyHeader
  setCellColor(
    headerRow,
    6 + employeeEarningHeader.length + 1,
    5 + employeeEarningHeader.length + 1 + employeeContributionHeader.length,
    'e6b8b7',
  );
  // light yellow FFFFE0

  setCellColor(
    headerRow,
    6 +
      employeeEarningHeader.length +
      1 +
      employeeContributionHeader.length +
      1,
    5 +
      employeeEarningHeader.length +
      1 +
      employeeContributionHeader.length +
      1 +
      employerContributionHeader.length,
    'FFFF00',
  );

  // Set red color for penaltyHeader

  setCellColor(
    headerRow,
    6 +
      employeeEarningHeader.length +
      1 +
      employeeContributionHeader.length +
      1 +
      employerContributionHeader.length,
    5 +
      employeeEarningHeader.length +
      1 +
      employeeContributionHeader.length +
      1 +
      employerContributionHeader.length +
      otherDeductionHeader.length,
    'e6b8b7',
  );

  const data1 = data.map((row) => Object.values(row));

  data1.map((e) => workSheet.addRow(e));

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateAuthorozationExcel = async (
  data,
  AuthCriteria,
  authorizationMasterID,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Employee Data');
  const workSheet1 = workBook.addWorksheet('AuthorizationCriteria');

  // worksheeet
  const header = Object.keys(data[0]);

  workSheet.addRow(header);

  formatFirstRow(workSheet, 1);

  const data1 = data.map((row) => Object.values(row));

  data1.map((e) => workSheet.addRow(e));

  //worksheet1--branch

  workSheet1.addRow(['Auth Criteria']);

  formatFirstRow(workSheet1, 1);

  const data2 = AuthCriteria.map((row) => [row.AuthorizationCriteria]);

  data2.map((e) => workSheet1.addRow(e));
  // Hide the ExpenseHead worksheet to keep it clean
  workSheet1.state = 'hidden';

  if (authorizationMasterID == 0) {
    //Expense
    workSheet
      .getColumn(8)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Leave
    workSheet
      .getColumn(11)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Overtime
    workSheet
      .getColumn(14)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Resignation
    workSheet
      .getColumn(17)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Gatepass
    workSheet
      .getColumn(20)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
    //Compensatory Off
    workSheet
      .getColumn(23)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Attendance Correction
    workSheet
      .getColumn(26)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
  } else {
    //One only
    workSheet
      .getColumn(8)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForVisitReportMail = async (
  visitData,
  userMasterID,
  fileName,
  fileType,
) => {
  if (!visitData.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const headerNames = Object.keys(visitData[0]);

  worksheet.addRow(headerNames);
  await styleRow(worksheet, 1);
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '729fcf' }, // Red color
    };
  });

  const data2 = visitData.map((row) => Object.values(row));
  data2.map((e) => worksheet.addRow(e));

  let count = 0;
  for (let i = 0; i < visitData.length; i++) {
    if (i == 0) {
      count += 2;
    } else {
      count = i + 2;
    }

    console.table([
      count,
      12,
      count + +visitData[i].TotalVisit - 1,
      12,
      visitData[i].TotalVisit,
      i,
    ]);

    worksheet.mergeCells(count, 12, count + +visitData[i].TotalVisit - 1, 12);

    worksheet.mergeCells(count, 13, count + +visitData[i].TotalVisit - 1, 13);

    worksheet.mergeCells(count, 14, count + +visitData[i].TotalVisit - 1, 14);
    worksheet.mergeCells(count, 15, count + +visitData[i].TotalVisit - 1, 15);

    worksheet.mergeCells(count, 16, count + +visitData[i].TotalVisit - 1, 16);

    i += +visitData[i].TotalVisit - 1;
  }

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  const filePath = path.join(
    __dirname,
    '../uploads',
    `${fileName}${userMasterID}_${Date.now()}.xlsx`,
  );
  workBook.xlsx
    .writeFile(filePath)
    .then(function () {})
    .catch(function (error) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
      );
    });

  return filePath;
};

const generateExcelDailyAttendanceCountDepartmentwise = async (
  data,
  dates,
  filename,
  fileExtension,
  res,
) => {
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Daily Attendance Count');
  const formatDate = (dateString) => {
    const parts = dateString.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Define formattedDates using the formatDate function
  const formattedDates = dates.map((date) => formatDate(date));

  // Add header row with styles
  const headerRow = ['Shift Name', ...formattedDates];
  const header = workSheet.addRow(headerRow);
  header.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  data.forEach((item) => {
    const row = [
      item['Shift Name'],
      ...formattedDates.map((date) => item[date] || 0),
    ];
    const rowCells = workSheet.addRow(row);
    rowCells.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        // Bold for shiftName
        cell.font = { bold: true };
      } else if (typeof cell.value === 'number') {
        // Center align numbers
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Adjust column widths
  workSheet.columns.forEach((column) => {
    column.width = column.values.reduce((maxWidth, value) => {
      const length = value ? value.toString().length : 10;
      return Math.max(maxWidth, length);
    }, 10);
  });

  // Set the response headers for file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.${fileExtension}`,
  );

  // Write the workbook to the response
  await workBook.xlsx.write(res);
  res.end();
};

const generateExcelDepartmentWisepunchinoutcountreport = async (
  data1,
  dates,
  filename,
  fileExtension,
  res,
) => {
  const Excel = require('exceljs');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Department ShiftWise');
  const formatDate = (dateString) => {
    const parts = dateString.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const formattedDates = dates.map(formatDate);

  data1.forEach((shiftData) => {
    const shiftName = shiftData['Shift Name'];
    const headerRow = [shiftName, ...formattedDates];
    const header = workSheet.addRow(headerRow);

    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F81BD' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Initialize totals array
    const totals = new Array(formattedDates.length).fill(0);

    // Add data rows
    Object.keys(shiftData).forEach((departmentName) => {
      if (departmentName !== 'Shift Name') {
        const departmentData = shiftData[departmentName];
        const row = [
          departmentData['Department Name'],
          ...formattedDates.map((date, index) => {
            const value = departmentData[date] || 0;
            totals[index] += value; // Accumulate totals
            return value;
          }),
        ];

        const rowCells = workSheet.addRow(row);
        rowCells.eachCell((cell, colNumber) => {
          if (colNumber === 1) {
            cell.font = { bold: true };
          } else if (typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'center' };
          }
        });
      }
    });

    // Add footer row with totals
    const totalRow = ['Total', ...totals];
    const total = workSheet.addRow(totalRow);

    total.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: '000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e3bce8' },
      };
      cell.alignment = { horizontal: 'center' };
    });
    // Add footer row with styles

    const fotterrow = [];
    const footer = workSheet.addRow(fotterrow);
    footer.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' },
      };
      cell.alignment = { horizontal: 'center' };
    });
    // Adjust column widths
    workSheet.columns.forEach((column) => {
      let maxWidth = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnWidth = cell.value ? cell.value.toString().length : 10;
        if (columnWidth > maxWidth) {
          maxWidth = columnWidth;
        }
      });
      column.width = maxWidth + 2;
    });
  });

  // Set the response headers for file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.${fileExtension}`,
  );

  // Write the workbook to the response
  await workBook.xlsx.write(res);
  res.end();
};

async function createZipFileForPortraitidIdCards(finalArray, res) {
  const fileName = 'id_cards';
  const zip = new JSZip();

  for (let i = 0; i < finalArray.length; i++) {
    const path = finalArray[i].path;

    const pdfBytes = base64ToUint8Array(path);
    zip.file(`${i + 1} ${finalArray[i].displayName}.pdf`, pdfBytes);
  }

  const zipbuffer = await zip.generateAsync({ type: 'nodebuffer' });
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename=${fileName}.zip`,
  });
  res.end(zipbuffer);
}

const generateExcelDepartmentWisepunchinoutcountreportMail = async (
  data1,
  dates,
  fileName,
  companyMasterID,
  userMasterID,
) => {
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Department ShiftWise');
  const formatDate = (dateString) => {
    const parts = dateString.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const formattedDates = dates.map(formatDate);

  data1.forEach((shiftData) => {
    const shiftName = shiftData['Shift Name'];
    const headerRow = [shiftName, ...formattedDates];
    const header = workSheet.addRow(headerRow);

    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F81BD' },
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Initialize totals array
    const totals = new Array(formattedDates.length).fill(0);

    // Add data rows
    Object.keys(shiftData).forEach((departmentName) => {
      if (departmentName !== 'Shift Name') {
        const departmentData = shiftData[departmentName];
        const row = [
          departmentData['Department Name'],
          ...formattedDates.map((date, index) => {
            const value = departmentData[date] || 0;
            totals[index] += value; // Accumulate totals
            return value;
          }),
        ];

        const rowCells = workSheet.addRow(row);
        rowCells.eachCell((cell, colNumber) => {
          if (colNumber === 1) {
            cell.font = { bold: true };
          } else if (typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'center' };
          }
        });
      }
    });

    // Add footer row with totals
    const totalRow = ['Total', ...totals];
    const total = workSheet.addRow(totalRow);

    total.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: '000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e3bce8' },
      };
      cell.alignment = { horizontal: 'center' };
    });
    // Add footer row with styles

    const fotterrow = [];
    const footer = workSheet.addRow(fotterrow);
    footer.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF' },
      };
      cell.alignment = { horizontal: 'center' };
    });
    // Adjust column widths
    workSheet.columns.forEach((column) => {
      let maxWidth = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnWidth = cell.value ? cell.value.toString().length : 10;
        if (columnWidth > maxWidth) {
          maxWidth = columnWidth;
        }
      });
      column.width = maxWidth + 2;
    });
  });

  const filePath = path.join(
    __dirname,
    '../uploads',
    `${fileName}${userMasterID}_${Date.now()}.xlsx`,
  );
  workBook.xlsx
    .writeFile(filePath)
    .then(function () {})
    .catch(function (error) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
      );
    });

  return filePath;
};

function getGradeForTarget(gradeObject, targetAchieved) {
  const target = parseFloat(targetAchieved);
  for (const [grade, range] of Object.entries(gradeObject)) {
    const [min, max] = range.split('-').map(Number);
    if (target >= min && target <= max) {
      return grade;
    }
  }
  return 'NA';
}
const genrateDemoExcelForExpenseHead = async (
  data,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Expense Head');
    const expenseHeadSheet = workBook.addWorksheet('ExpenseHead');
    expenseHeadSheet.addRow(['Expense Category']);

    workSheet.addRow(['Expense Category', 'Expense Head Name']);
    setColorInBackground(expenseHeadSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const ExpenseCategoryData = data;
    ExpenseCategoryData.forEach((Category, index) => {
      expenseHeadSheet.getCell(`A${index + 2}`).value = Category;
    });

    // Hide the ExpenseHead worksheet to keep it clean
    expenseHeadSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([null, null]);
    }

    workSheet
      .getColumn(1)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`ExpenseHead!$A$2:$A$${data.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForWorkingLocation = async (
  cityData,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Working Location');
    const citiesSheet = workBook.addWorksheet('Cities');
    citiesSheet.addRow(['City Name']);

    workSheet.addRow([
      'Working Location Name',
      'Latitude',
      'Longitude',
      'Radius',
      'Working Location Address',
      'Working Location City',
    ]);
    setColorInBackground(citiesSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const cityNames = cityData;
    cityNames.forEach((city, index) => {
      citiesSheet.getCell(`A${index + 2}`).value = city;
    });

    // const branchNames = branchData;
    // branchNames.forEach((city, index) => {
    //   branchSheet.getCell(`A${index + 2}`).value = city;
    // });

    // Hide the Cities worksheet to keep it clean
    citiesSheet.state = 'hidden';
    // branchSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([null, null, null, null, null, null]);
    }
    // workSheet
    // .getColumn(1)
    // .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    //   if (rowNumber !== 1) {
    //     // Skip the header row
    //     cell.dataValidation = {
    //       type: 'list',
    //       allowBlank: true,
    //       formulae: [`Branch!$A$2:$A$${branchData.length + 1}`],
    //     };
    //   }
    // });

    workSheet
      .getColumn(6)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Cities!$A$2:$A$${cityData.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForBranch = async (data, fileName, fileType, res) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Branch');
    const citiesSheet = workBook.addWorksheet('Cities');
    citiesSheet.addRow(['City Name']);

    workSheet.addRow([
      'Branch Name',
      'Branch Code',
      'Branch Address',
      'Branch City',
      'Latitude',
      'Longitude',
      'Radius',
      'GST Number',
      'LWF Number',
      'Professional Tax Number',
      'PF Number',
      'ESIC Number',
    ]);
    setColorInBackground(citiesSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const NonRequiredColumnStle = [
      { index: 5, color: '729fcf' },
      { index: 6, color: '729fcf' },
      { index: 7, color: '729fcf' },
      { index: 8, color: '729fcf' },
      { index: 9, color: '729fcf' },
      { index: 10, color: '729fcf' },
      { index: 11, color: '729fcf' },
      { index: 12, color: '729fcf' },
    ];

    // Apply the styles to each specified column
    NonRequiredColumnStle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });
    // setColorInBackground(workSheet, 1, '729fcf'); // blue
    // await styleRow(workSheet, 1);

    const cityNames = data;
    cityNames.forEach((city, index) => {
      citiesSheet.getCell(`A${index + 2}`).value = city;
    });

    // Hide the Cities worksheet to keep it clean
    citiesSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }

    workSheet
      .getColumn(4)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Cities!$A$2:$A$${data.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForCustomer = async (data, fileName, fileType, res) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Customer');
    const citiesSheet = workBook.addWorksheet('Cities');
    citiesSheet.addRow(['City Name']);

    workSheet.addRow([
      'CustomerName',
      'CompanyName',
      'Customer Industry',
      'Latitude',
      'Longitude',
      'mobileNumber1',
      'mobileNumber2',
      'email',
      'website',
      'Address',
      'Zipcode',
      'CityName',
      'StateName',
      'CountryName',
      'Status',
    ]);
    setColorInBackground(citiesSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
      { index: 10, color: 'FFFF6666' },
      { index: 11, color: 'FFFF6666' },
      { index: 12, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const NonRequiredColumnStle = [
      { index: 3, color: '729fcf' },
      { index: 4, color: '729fcf' },
      { index: 5, color: '729fcf' },
      { index: 7, color: '729fcf' },
      { index: 8, color: '729fcf' },
      { index: 9, color: '729fcf' },
    ];

    // Apply the styles to each specified column
    NonRequiredColumnStle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });
    // setColorInBackground(workSheet, 1, '729fcf'); // blue
    // await styleRow(workSheet, 1);

    const cityNames = data;
    cityNames.forEach((city, index) => {
      citiesSheet.getCell(`A${index + 2}`).value = city;
    });

    // Hide the Cities worksheet to keep it clean
    citiesSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }

    workSheet
      .getColumn(12)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Cities!$A$2:$A$${data.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForContractor = async (
  citydata,
  bankData,
  fileName,
  fileType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Customer');
    const citiesSheet = workBook.addWorksheet('Cities');
    const bankSheet = workBook.addWorksheet('Bank');
    citiesSheet.addRow(['City Name']);
    bankSheet.addRow(['Bank Name']);

    workSheet.addRow([
      'Contractor Name',
      'WebSite',
      'Short Name',
      'Contact Person Name',
      'Contractor Code',
      'Contact Number',
      'Email',
      'Contractor City',
      'Date of Incorporation',
      'Contractor Bank',
      'Bank IFSC Code',
      'Bank Account No',
      'Pan Card No',
      'GST No',
      'Registration Number',
      'About Contractor',
      'Contractor Address',
    ]);
    setColorInBackground(citiesSheet, 1, '729fcf');
    setColorInBackground(bankSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
      { index: 7, color: 'FFFF6666' },
      { index: 8, color: 'FFFF6666' },
      { index: 9, color: 'FFFF6666' },
      { index: 17, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const NonRequiredColumnStle = [
      { index: 2, color: '729fcf' },
      { index: 10, color: '729fcf' },
      { index: 11, color: '729fcf' },
      { index: 12, color: '729fcf' },
      { index: 13, color: '729fcf' },
      { index: 14, color: '729fcf' },
      { index: 15, color: '729fcf' },
      { index: 16, color: '729fcf' },
    ];

    // Apply the styles to each specified column
    NonRequiredColumnStle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });
    // setColorInBackground(workSheet, 1, '729fcf'); // blue
    // await styleRow(workSheet, 1);

    const cityNames = citydata;
    cityNames.forEach((city, index) => {
      citiesSheet.getCell(`A${index + 2}`).value = city;
    });

    const bankNames = bankData;
    bankNames.forEach((bank, index) => {
      bankSheet.getCell(`A${index + 2}`).value = bank;
    });

    // Hide the Cities worksheet to keep it clean
    citiesSheet.state = 'hidden';
    bankSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }

    workSheet
      .getColumn(8)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Cities!$A$2:$A$${citydata.length + 1}`],
          };
        }
      });
    // workSheet
    // .getColumn(9)
    // .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    //   if (rowNumber !== 1) {
    //     // Skip the header row
    //     cell.dataValidation = {
    //       type: 'date',
    //       allowBlank: true,
    //     };
    //   }
    // });
    workSheet
      .getColumn(10)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Bank!$A$2:$A$${bankData.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForAssetMaster = async (
  CategoyData,
  fileName,
  fileType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Asset');
    const assetcategorysheet = workBook.addWorksheet('AssetCategory');
    assetcategorysheet.addRow(['Asset Category Name']);

    workSheet.addRow([
      'Asset Category Name',
      'Asset Serial Number',
      'Asset Name',
      'Quantity',
      'Purchase Date',
      'Description',
    ]);
    setColorInBackground(assetcategorysheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    // setColorInBackground(workSheet, 1, '729fcf'); // blue
    // await styleRow(workSheet, 1);

    const categoryNames = CategoyData;
    categoryNames.forEach((city, index) => {
      assetcategorysheet.getCell(`A${index + 2}`).value = city;
    });

    // Hide the Cities worksheet to keep it clean
    assetcategorysheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([null, null, null, null, null, null]);
    }

    workSheet
      .getColumn(1)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`AssetCategory!$A$2:$A$${CategoyData.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const generateExcelForPunchInPunchOutReport = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = Object.keys(data[0]).filter(
      (key) => key !== 'isS3Upload' && key !== 'formValue',
    );
    const rowGroups = data.map((record) => {
      const base = {};
      headerNames.forEach((key) => {
        base[key] = record[key];
      });

      const formFields = Array.isArray(record.formValue)
        ? record.formValue
        : [];

      const customLines = formFields.length
        ? formFields.map((f) => {
            let fieldValue = f?.fieldValue || '';

            if (f.inputType === 'textarea') {
              fieldValue = stripHtml(fieldValue);
            }

            return `${f.fieldIndex}. ${f.fieldLabel} - ${fieldValue}`;
          })
        : [''];

      return { base, customLines, rawRecord: record };
    });

    const sampleIdx = findIndexParentWithMostKeys(rowGroups.map((g) => g.base));
    const keyData = flattenObj(rowGroups[sampleIdx].base);

    const columns = Object.keys(keyData)
      .filter((key) => key !== 'isS3Upload')
      .map((key) => ({ header: key, key, width: 20 }));

    columns.push({ header: 'Customize Form', key: 'customizeForm', width: 35 });

    workSheet.columns = columns;

    const base64regex =
      /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

    let currentRow = 2; // row 1 is the header

    for (const group of rowGroups) {
      const startRow = currentRow;
      const flatBase = flattenObj(group.base);
      delete flatBase.isS3Upload;

      for (let lineIdx = 0; lineIdx < group.customLines.length; lineIdx++) {
        const rowNum = currentRow;
        const row = workSheet.getRow(rowNum);

        const rowValues =
          lineIdx === 0
            ? { ...flatBase, customizeForm: group.customLines[lineIdx] }
            : { customizeForm: group.customLines[lineIdx] };

        row.values = rowValues;

        row.height = 24;
        currentRow++;
      }

      const endRow = currentRow - 1;

      for (const key of Object.keys(flatBase)) {
        if (key.includes('image') && group.rawRecord[key]) {
          const column = workSheet.getColumn(key);

          if (startRow === endRow) {
            workSheet.getRow(startRow).height = 90;
          }

          let base64Image = null;
          try {
            if (group.rawRecord.isS3Upload) {
              base64Image = await getS3File(bucketName, group.rawRecord[key]);
            } else if (
              fs.existsSync(path.join(__dirname, '../', group.rawRecord[key]))
            ) {
              base64Image = fs.readFileSync(
                path.join(__dirname, '../', group.rawRecord[key]),
                { encoding: 'base64' },
              );
            } else if (base64regex.test(group.rawRecord[key])) {
              base64Image = group.rawRecord[key];
            }

            if (base64Image) {
              const imageId = workBook.addImage({
                extension: 'png',
                base64: base64Image,
              });
              // workSheet.addImage(
              //   imageId,
              //   `${column.letter}${startRow}:${column.letter}${endRow}`,
              // );
              const colIndex = workSheet.getColumn(key).number - 1;

              workSheet.addImage(imageId, {
                tl: { col: colIndex, row: startRow - 1 },
                ext: { width: 140, height: 120 }, // maintain square/fixed aspect ratio
                editAs: 'oneCell',
              });
            }
          } catch (err) {
            console.error('Image load failed:', err.message);
          }

          workSheet.getCell(`${column.letter}${startRow}`).value = null;
        }
      }

      if (endRow > startRow) {
        for (const col of columns) {
          if (col.key === 'customizeForm') continue;
          const letter = workSheet.getColumn(col.key).letter;
          workSheet.mergeCells(`${letter}${startRow}:${letter}${endRow}`);
          workSheet.getCell(`${letter}${startRow}`).alignment = {
            vertical: 'middle',
            wrapText: true,
          };
        }
      }
    }

    formatFirstRow(workSheet, 1);

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};
const generateExcelForAttendaceReport4 = async (
  hrLeaveHeader = [],
  allUser_HrleaveData = [],
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('sheet');
  const workSheet1 = workBook.addWorksheet('With Attendance Summary');
  const date_header = data[0].attendance.map((e) => e.date);
  const mainHeader = [
    ...[
      'Sr No.',
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Joining Date',
      'Company',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
      'Time',
    ],
    ...date_header,
    ...[
      'Present',
      'Miss Punch',
      'Absent',
      'Leave',
      'Half Day',
      'LC+EG',
      'Week Off',
      'Holiday',
      'Total',
    ],
  ];

  workSheet.addRow(mainHeader);

  const mainHeader1 = [
    ...[
      'Sr No.',
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Joining Date',
      'Company',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
    ],
    ...date_header,
    ...[
      'Present',
      'Miss Punch',
      'Absent',
      'Leave',
      'Half Day',
      'LC+EG',
      'Week Off',
      'Holiday',
      'Total',
      '',
    ],
    ...hrLeaveHeader,
  ];

  workSheet1.addRow(mainHeader1);

  workSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });

  workSheet1.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });

  let countrow = 1;
  data.map((e, index) => {
    const rowdata = [
      index + 1,
      e.employeeCode,
      e.employeeName,
      e.employeeNumber,
      e.joiningDate,
      e.Company,
      e.Branch,
      e.Department,
      e.Designation,
      e.Division,
      e.WorkingArea,
    ];

    const obj = allUser_HrleaveData[index];

    const hrLeaveData = hrLeaveHeader.map((key) => (obj[key] ? obj[key] : 0));

    const indata = e.attendance.map((a) => a.inTime || '');
    const outdata = e.attendance.map((a) => a.outTime || '');
    const attandanceStatus = e.attendance.map((a) => a.title || '');

    const Total =
      e.presentCount +
      e.missPunChCount +
      e.absentCount +
      e.leaveCount +
      e.halfDayCount +
      e.weekOffCount +
      e.holidayCount;
    workSheet.addRow([
      ...rowdata,
      ...[''],
      ...(attandanceStatus ? attandanceStatus : []),
      ...[
        e.presentCount,
        e.missPunChCount,
        e.absentCount,
        e.leaveCount,
        e.halfDayCount,
        e.lcegCount,
        e.weekOffCount,
        e.holidayCount,
        Total,
      ],
    ]);

    workSheet1.addRow([
      ...rowdata,
      ...(attandanceStatus ? attandanceStatus : []),
      ...[
        e.presentCount,
        e.missPunChCount,
        e.absentCount,
        e.leaveCount,
        e.halfDayCount,
        e.lcegCount,
        e.weekOffCount,
        e.holidayCount,
        Total,
        '',
      ],
      ...hrLeaveData,
    ]);

    countrow++;
    const firstrow = countrow;
    workSheet.addRow([
      ...rowdata,
      ...['IN'],
      ...(indata ? indata : []),
      ...[
        e.presentCount,
        e.missPunChCount,
        e.absentCount,
        e.leaveCount,

        e.halfDayCount,
        e.lcegCount,
        e.weekOffCount,
        e.holidayCount,
        Total,
      ],
    ]);

    countrow++;
    workSheet.addRow([
      ...rowdata,
      ...['OUT'],
      ...(outdata ? outdata : []),
      ...[
        e.presentCount,
        e.missPunChCount,
        e.absentCount,
        e.leaveCount,

        e.halfDayCount,
        e.lcegCount,
        e.weekOffCount,
        e.holidayCount,
        Total,
      ],
    ]);

    countrow++;
    const lasttrow = countrow;

    // Highlight cells based on status
    attandanceStatus.forEach((status, colIndex) => {
      const cell = workSheet.getCell(firstrow, 13 + colIndex);
      const cell1 = workSheet1.getCell(index + 2, 12 + colIndex);
      if (status === 'MP') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'a80dd9' },
        };
      } else if (status === 'A') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'f50202' },
        };
        cell1.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'f50202' },
        };
      } else if (
        status === 'HD' ||
        status === 'HD' ||
        status === 'P+OH' ||
        status === 'P+HD' ||
        status === 'HFD+HD' ||
        status === 'A+HD' ||
        status === 'HFD+OH' ||
        status === 'A+OH' ||
        status === 'MP+HD'
      ) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '729fcf' },
        };
        cell1.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '729fcf' },
        };
      } else if (status === 'HFD') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'fc7303' },
        };
      } else if (status === 'P+LC' || status === 'P+EG') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '7b68ee' },
        };
      } else if (status === 'P +LC' || status === 'P +EG') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ffe83d' },
        };
      } else if (
        status === 'WO' ||
        status === 'P+WO' ||
        status === 'HFD+WO' ||
        status === 'A+WO' ||
        status === 'MP+WO'
      ) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '729fcf' },
        };
        cell1.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '729fcf' },
        };
      } else if (status === 'P') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '00FF00' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6666' },
        };
      }
    });

    workSheet.mergeCells(firstrow, 1, lasttrow, 1);
    workSheet.mergeCells(firstrow, 2, lasttrow, 2);
    workSheet.mergeCells(firstrow, 3, lasttrow, 3);
    workSheet.mergeCells(firstrow, 4, lasttrow, 4);
    workSheet.mergeCells(firstrow, 5, lasttrow, 5);
    workSheet.mergeCells(firstrow, 6, lasttrow, 6);
    workSheet.mergeCells(firstrow, 7, lasttrow, 7);
    workSheet.mergeCells(firstrow, 8, lasttrow, 8);
    workSheet.mergeCells(firstrow, 9, lasttrow, 9);
    workSheet.mergeCells(firstrow, 10, lasttrow, 10);
    workSheet.mergeCells(firstrow, 11, lasttrow, 11);

    workSheet.mergeCells(
      firstrow,
      13 + +indata.length,
      lasttrow,
      13 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      14 + +indata.length,
      lasttrow,
      14 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      15 + +indata.length,
      lasttrow,
      15 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      16 + +indata.length,
      lasttrow,
      16 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      17 + +indata.length,
      lasttrow,
      17 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      18 + +indata.length,
      lasttrow,
      18 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      19 + +indata.length,
      lasttrow,
      19 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      20 + +indata.length,
      lasttrow,
      20 + +indata.length,
    );
    workSheet.mergeCells(
      firstrow,
      21 + +indata.length,
      lasttrow,
      21 + +indata.length,
    );
  });

  // Set dynamic column widths based on the length of the data
  workSheet.columns.forEach((column, index) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnTextLength = cell.value ? cell.value.toString().length : 5;
      if (columnTextLength > maxLength) {
        maxLength = columnTextLength;
      }
    });
    column.width = maxLength; // Set a minimum width of 10 and add padding
  });

  workSheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 0) {
      row.eachCell((cell, colNumber) => {
        alignmentmiddle(workSheet, rowNumber);
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
      });
    }
  });

  // ------------Set For Seat1--------------------------

  // Set dynamic column widths based on the length of the data
  workSheet1.columns.forEach((column, index) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnTextLength = cell.value ? cell.value.toString().length : 5;
      if (columnTextLength > maxLength) {
        maxLength = columnTextLength;
      }
    });
    column.width = maxLength; // Set a minimum width of 10 and add padding
  });

  workSheet1.eachRow((row, rowNumber) => {
    if (rowNumber >= 0) {
      row.eachCell((cell, colNumber) => {
        alignmentmiddle(workSheet, rowNumber);
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
      });
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const genrateDemoExcelForManualLeave = async (
  CategoyData,
  leaveNameData,
  fileName,
  fileType,
  fileUploadType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Manual Leave');
    const employeeDatasheet = workBook.addWorksheet('EmployeeData');
    employeeDatasheet.addRow([
      // '',
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Branch',
      'Department',
      'Designation',
    ]);
    const leaveNamessheet = workBook.addWorksheet('LeaveName');
    leaveNamessheet.addRow(['Leave Name', 'Leave Description']);
    const dayTypesheet = workBook.addWorksheet('DayType');
    dayTypesheet.addRow(['Day Type']);
    workSheet.addRow([
      fileUploadType,
      'Leave Type',
      'Day Type',
      'From Date(yyyy-mm-dd)',
      'To Date(yyyy-mm-dd)',
      'Reason',
    ]);
    setColorInBackground(employeeDatasheet, 1, '729fcf');
    setColorInBackground(leaveNamessheet, 1, '729fcf');
    setColorInBackground(dayTypesheet, 1, '729fcf');
    // const nonRequiredColumnStyle = [
    //   { index: 6, color: '729fcf' },
    // ];
    // // Apply the styles to each specified column
    // nonRequiredColumnStyle.forEach((column) => {
    //   workSheet
    //     .getColumn(column.index)
    //     .eachCell({ includeEmpty: true }, (cell) => {
    //       cell.fill = {
    //         type: 'pattern',
    //         pattern: 'solid',
    //         fgColor: { argb: column.color }, // Set the background color
    //       };
    //     });
    // });
    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    // setColorInBackground(workSheet, 1, '729fcf'); // blue
    // await styleRow(workSheet, 1);

    const leaveNames = leaveNameData;
    leaveNames.forEach((leave, index) => {
      leaveNamessheet.getCell(`A${index + 2}`).value = leave;
    });
    const employeeData = CategoyData;
    employeeData.forEach((data, index) => {
      // employeeDatasheet.getCell(`A${index + 2}`).value = data.mergedData;
      employeeDatasheet.getCell(`A${index + 2}`).value = data.employeeCode;
      employeeDatasheet.getCell(`B${index + 2}`).value = data.displayName;
      employeeDatasheet.getCell(`C${index + 2}`).value = data.userNumber;
      employeeDatasheet.getCell(`D${index + 2}`).value = data.branch;
      employeeDatasheet.getCell(`E${index + 2}`).value = data.department;
      employeeDatasheet.getCell(`F${index + 2}`).value = data.designation;
    });
    const dayType = ['First Half', 'Second Half', 'Full Day'];
    dayType.forEach((day, index) => {
      dayTypesheet.getCell(`A${index + 2}`).value = day;
    });
    // Hide the Cities worksheet to keep it clean
    // employeeDatasheet.state = 'hidden';
    leaveNamessheet.state = 'hidden';
    dayTypesheet.state = 'hidden';
    for (let i = 0; i < 1000; i++) {
      workSheet.addRow([null, null, null, null, null, null]);
    }
    // workSheet
    //   .getColumn(1)
    //   .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    //     if (rowNumber !== 1) {
    //       // Skip the header row
    //       cell.dataValidation = {
    //         type: 'list',
    //         allowBlank: true,
    //         formulae: [`EmployeeData!$A$2:$A$${CategoyData.length + 1}`],
    //       };
    //     }
    //   });
    workSheet
      .getColumn(3)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`DayType!$A$2:$A$${dayType.length + 1}`],
          };
        }
      });
    workSheet
      .getColumn(2)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`LeaveName!$A$2:$A$${leaveNameData.length + 1}`],
          };
        }
      });
    // workSheet
    //   .getColumn(4)
    //   .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    //     if (rowNumber !== 1) {
    //       // Skip the header row
    //       cell.dataValidation = {
    //         type: 'date',
    //         allowBlank: true,
    //         type: 'date',
    //         operator: 'between',
    //         formula1: '2020-01-01', // Start date
    //         formula2: '2030-12-31', // End date
    //         numFmt: 'yyyy-mm-dd',
    //       };
    //     }
    //   });
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const genrateDemoExcelForAssignAsset = async (
  categoryNames,
  userDataNames,
  fileUploadType,
  fileName,
  fileType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Assign Asset');

    const assetMastersheet = workBook.addWorksheet('AssetMaster');
    assetMastersheet.addRow(['Asset Master']);
    workSheet.addRow([
      fileUploadType,
      'Asset Name',
      'Description',
      'Quantity',
      'Assign Date (YYYY-MM-DD)',
      'Return Date (YYYY-MM-DD)',
    ]);
    setColorInBackground(assetMastersheet, 1, '729fcf');
    const employeeDatasheet = workBook.addWorksheet('EmployeeData');
    employeeDatasheet.addRow([
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Branch',
      'Department',
      'Designation',
    ]);
    setColorInBackground(employeeDatasheet, 1, '729fcf');
    userDataNames.forEach((data, index) => {
      // employeeDatasheet.getCell(`A${index + 2}`).value = data.mergedData;
      employeeDatasheet.getCell(`A${index + 2}`).value = data.employeeCode;
      employeeDatasheet.getCell(`B${index + 2}`).value = data.displayName;
      employeeDatasheet.getCell(`C${index + 2}`).value = data.userNumber;
      employeeDatasheet.getCell(`D${index + 2}`).value = data.branch;
      employeeDatasheet.getCell(`E${index + 2}`).value = data.department;
      employeeDatasheet.getCell(`F${index + 2}`).value = data.designation;
    });
    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
      { index: 6, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    categoryNames.forEach((day, index) => {
      assetMastersheet.getCell(`A${index + 2}`).value = day;
    });
    // Hide the Cities worksheet to keep it clean
    // employeeDatasheet.state = 'hidden';
    assetMastersheet.state = 'hidden';
    for (let i = 0; i < 1000; i++) {
      workSheet.addRow([null, null, null, null, null, null]);
    }
    // workSheet
    //   .getColumn(1)
    //   .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    //     if (rowNumber !== 1) {
    //       // Skip the header row
    //       cell.dataValidation = {
    //         type: 'list',
    //         allowBlank: true,
    //         formulae: [`EmployeeData!$A$2:$A$${CategoyData.length + 1}`],
    //       };
    //     }
    //   });
    workSheet
      .getColumn(2)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`AssetMaster!$A$2:$A$${categoryNames.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const generateExcelLateComeEarlyGoMail = async (
  data,
  fileName,
  userId,
  CheckListNames,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  let i = 0;
  for (let checkList of data) {
    const sheetName = getUniqueSheetName(workBook, CheckListNames[i]);
    const workSheet = workBook.addWorksheet(sheetName);
    i++;

    const headerNames = Object.keys(checkList[0]);

    const transformedObject = [];
    for (let i = 0; i < checkList.length; i++) {
      let isNotArray = true;
      headerNames.forEach((key) => {
        if (Array.isArray(checkList[i][key]) === true) {
          checkList[i][key].forEach((obj) => {
            isNotArray = false;
            // Deep copy so that values in data[i] does not get changed
            const transformedElement = JSON.parse(JSON.stringify(checkList[i]));
            transformedElement[key] = obj;
            transformedObject.push({ ...transformedElement });
          });
        }
      });
      if (isNotArray)
        transformedObject.push(JSON.parse(JSON.stringify(checkList[i])));
    }
    if (transformedObject.length === 0) transformedObject.push(...checkList);

    const keyData = flattenObj(
      transformedObject[findIndexParentWithMostKeysV2(transformedObject)],
    );

    const columns = Object.keys(keyData).map((key) => ({
      header: key,
      key,
      width: 15,
    }));

    workSheet.columns = columns;

    transformedObject.forEach((element) => {
      workSheet.addRow(flattenObj(element));
    });
    formatFirstRow(workSheet, 1);
  }

  const filePath = path.join(
    __dirname,
    '../uploads',
    `${fileName}${userId}_${Date.now()}.xlsx`,
  );
  workBook.xlsx
    .writeFile(filePath)
    .then(function () {})
    .catch(function (error) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
      );
    });

  return filePath;

  // res.attachment(`${fileName}.${fileType}`);
  // res.set({ 'Access-Control-Expose-Headers': '*' });

  // return fileType === 'csv'
  //   ? workBook.csv.write(res)
  //   : workBook.xlsx.write(res);
};

const generateExcelForFYLeaveReportMail = async (
  Leaveata,
  firstHeader,
  leaveHeader,
  userId,
  fileName,
  SheetsNames,
) => {
  if (!Leaveata.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  let i = 0;
  for (let data of Leaveata) {
    const sheetName = getUniqueSheetName(workBook, SheetsNames[i]);
    const worksheet = workBook.addWorksheet(sheetName);
    i++;
    worksheet.addRow([]);
    worksheet.addRow([firstHeader]);

    const leave_header = Array.from(
      { length: leaveHeader.length - 1 },
      () => '',
    );

    const header2 = [
      ...[
        'Sr. No.',
        'Name Of Employee',
        'Department',
        'Leave',
        '',
        'Leave Approved/Pending/Absent',
        'No. Of',
        'Before This Application Leave Taken',
      ],
      ...leave_header,
      ...[
        'No. Of Absent Leaves in this Financial Year',
        'No. Of Late In/Early Out in Financial Year',
      ],
    ];
    const header3 = [
      ...['', '', '', 'From', 'To', '', 'Days'],
      ...leaveHeader,
      ...['No.', 'No.'],
    ];

    worksheet.addRow(header2);
    worksheet.addRow(header3);

    await styleRow(worksheet, 2);
    await styleRow(worksheet, 3);
    await styleRow(worksheet, 4);

    worksheet.mergeCells(2, 1, 2, +header2.length);
    worksheet.mergeCells(3, 1, 4, 1);
    worksheet.mergeCells(3, 2, 4, 2);
    worksheet.mergeCells(3, 3, 4, 3);
    worksheet.mergeCells(3, 4, 3, 5);
    worksheet.mergeCells(3, 8, 3, 8 + +leave_header.length);

    const row2 = worksheet.getRow(2);
    row2.height = 20;

    row2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'daeef3' }, // Red color
      };
    });

    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ebf1de' }, // Red color
      };
    });

    worksheet.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ebf1de' }, // Red color
      };
    });

    const mergeRanges = {};
    const data2 = data.map((row, index) => {
      row['SrNo'] = index;
      return Object.values(row);
    });

    let num = 1;
    await Promise.all(
      data2.map(async (d, i) => {
        const currentDisplayName = data[i].displayName;

        // Check if the display name is the same as the previous row
        if (i > 0 && currentDisplayName === data[i - 1].displayName) {
          d[0] = '';
          // Increment the end column of the merged range
          mergeRanges[currentDisplayName].map((a) => {
            a.endRow++;
          });
        } else {
          d[0] = num++;
          const leavemergecell = leaveHeader.map((m, index) => {
            return {
              startRow: i + 5,
              startColumn: 8 + index, // Assuming display name is in the second column
              endRow: i + 5,
              endColumn: 8 + index,
            };
          });

          // Create a new entry for the display name
          mergeRanges[currentDisplayName] = [
            ...[
              {
                startRow: i + 5,
                startColumn: 1, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 1,
              },
              {
                startRow: i + 5,
                startColumn: 2, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 2,
              },
              {
                startRow: i + 5,
                startColumn: 3, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 3,
              },
              {
                startRow: i + 5,
                startColumn: 8 + +leaveHeader.length, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 8 + +leaveHeader.length,
              },
              {
                startRow: i + 5,
                startColumn: 9 + +leaveHeader.length, // Assuming display name is in the second column
                endRow: i + 5,
                endColumn: 9 + +leaveHeader.length,
              },
            ],
            ...leavemergecell,
          ];
        }
        worksheet.addRow(d);
      }),
    );

    for (const displayName in mergeRanges) {
      const range = mergeRanges[displayName];

      range.map((e) => {
        worksheet.mergeCells(e.startRow, e.startColumn, e.endRow, e.endColumn);
      });
    }

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        alignment(worksheet, rowNumber + 3);
        // if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
        // }
      });
    });
  }

  const filePath = path.join(
    __dirname,
    '../uploads',
    `${fileName}${userId}_${Date.now()}.xlsx`,
  );
  workBook.xlsx
    .writeFile(filePath)
    .then(function () {})
    .catch(function (error) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
      );
    });

  return filePath;

  // res.attachment(`${fileName}.${fileType}`);
  // res.set({ 'Access-Control-Expose-Headers': '*' });
};

const generateExcelForDailyCostReportMail = async (
  headerMonth,
  datesArray,
  finaldata,
  wagessumArray,
  staffsumArray,
  othersumArray,
  sheetNames,
  userId,
  fileName,
) => {
  if (!finaldata.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  datesArray.unshift('Date');

  finaldata.map((data, index) => {
    const sheetName = getUniqueSheetName(workBook, sheetNames[index]);
    const worksheet = workBook.addWorksheet(sheetName);

    worksheet.addRow([]);
    worksheet.addRow([`Month:- ${headerMonth}`]);

    worksheet.getRow(2).height = 30;

    //  worksheet.getRow(2).font = { size: 40, bold: true };

    worksheet.addRow(datesArray);

    const costheader = Array.from(
      { length: datesArray.length - 1 },
      () => 'Cost',
    );

    costheader.unshift('Department Name');

    worksheet.addRow(costheader);

    worksheet.getRow(4).height = 22;

    worksheet.mergeCells(2, 1, 2, +costheader.length);

    data.map((e) => {
      const amountArray = e.amount;

      amountArray.unshift(e.department);

      worksheet.addRow(amountArray);
    });

    worksheet.addRow([]);

    if (sheetNames[index] == 'Wages') {
      wagessumArray.unshift('Total Cost');
      worksheet.addRow(wagessumArray);
    } else if (sheetNames[index] == 'Staff') {
      staffsumArray.unshift('Total Cost');
      worksheet.addRow(staffsumArray);
    } else {
      othersumArray.unshift('Total Cost');
      worksheet.addRow(othersumArray);
    }

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (colNumber == 1 && rowNumber > 4) {
          cell.font = {
            size: 12,
            bold: true,
            color: { argb: '000000' },
          };
        }

        if (rowNumber < 5 && rowNumber != 2) {
          bold(worksheet, rowNumber);
        }

        alignmentmiddle(worksheet, rowNumber);
        // if (cell.value !== null && cell.value !== '') {
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };

        if (rowNumber === 2) {
          cell.border = {
            top: { style: 'thick', color: { argb: '000000' } },
            left: { style: 'thick', color: { argb: '000000' } },
            bottom: { style: 'thick', color: { argb: '000000' } },
            right: { style: 'thick', color: { argb: '000000' } },
          };
          cell.font = { size: 20, bold: true }; // Make the text bold as well
        }
        // }
      });
    });

    worksheet.getRow(2).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'eeece1' },
      };
      // cell.font = {size:15, bold: true };
    });

    worksheet.getRow(3).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'e6b8b7' },
      };
    });

    worksheet.getRow(4).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'f2dcdb' },
      };
    });
  });

  const filePath = path.join(
    __dirname,
    '../uploads',
    `${fileName}${userId}_${Date.now()}.xlsx`,
  );
  workBook.xlsx
    .writeFile(filePath)
    .then(function () {})
    .catch(function (error) {
      accessLogStream.write(
        `${new Date().toLocaleString()} ===> Error Saving Workbook \n ${error}`,
      );
    });

  return filePath;
};

async function generateweekoffWorkDayExcel(
  finaldata,
  weekoffDate,
  fileName,
  fileType,
  res,
) {
  if (!finaldata.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Sheet1');
  const date_header = weekoffDate.map((e) =>
    moment(e, 'YYYY-MM-DD').format('DD-MM-YYYY'),
  );
  const mainHeader = [
    ...[
      'Sr No.',
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Joining Date',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
      ' ',
    ],
    ...date_header,
  ];
  workSheet.addRow(mainHeader);
  workSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'add8e6' }, // Red color
    };
    cell.font = { bold: true };
  });
  let countrow = 1;
  finaldata.map((e, index) => {
    const rowdata = [
      index + 1,
      e.employeeCode,
      e.employeeName,
      e.employeeNumber,
      e.joiningDate,
      e.Branch,
      e.Department,
      e.Designation,
      e.Division,
      e['Working Area'],
    ];
    const indata = e.attendance.map((a) => a.intime || '');
    const outdata = e.attendance.map((a) => a.outtime || '');
    const attandanceStatus = e.attendance.map((a) => a.hrs || '');
    workSheet.addRow([...rowdata, ...['IN'], ...(indata ? indata : [])]);
    countrow++;
    const firstrow = countrow;
    workSheet.addRow([...rowdata, ...['OUT'], ...(outdata ? outdata : [])]);
    countrow++;
    workSheet.addRow([
      ...rowdata,
      ...['IN Minutes'],
      ...(attandanceStatus ? attandanceStatus : []),
    ]);
    countrow++;
    const lasttrow = countrow;

    workSheet.mergeCells(firstrow, 1, lasttrow, 1);
    workSheet.mergeCells(firstrow, 2, lasttrow, 2);
    workSheet.mergeCells(firstrow, 3, lasttrow, 3);
    workSheet.mergeCells(firstrow, 4, lasttrow, 4);
    workSheet.mergeCells(firstrow, 5, lasttrow, 5);
    workSheet.mergeCells(firstrow, 6, lasttrow, 6);
    workSheet.mergeCells(firstrow, 7, lasttrow, 7);
    workSheet.mergeCells(firstrow, 8, lasttrow, 8);
  });
  workSheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      alignmentmiddle(workSheet, rowNumber);
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
    });
  });
  // Send the file as response
  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
}
const generateExcelForShiftRoster = async (
  data,
  dates,
  filename,
  fileExtension,
  res,
) => {
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Shift Roster');

  // Add header row with styles
  const headerRow = [
    'Employee Code',
    'Employee Name',
    'Employee Number',
    'Branch',
    'Department',
    'Designation',
    ...dates,
  ];
  const header = workSheet.addRow(headerRow);
  header.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } },
    };
  });

  data.forEach((item) => {
    const row = [
      item['Employee Code'],
      item['Employee Name'],
      item['Employee Number'],
      item['Branch'],
      item['Department'],
      item['Designation'],
      ...dates.map((date) => item[date] || ''),
    ];
    const rowCells = workSheet.addRow(row);
    rowCells.eachCell((cell, colNumber) => {
      if (colNumber <= 6) {
        // Bold for shiftName
        cell.font = { bold: true };
      } else {
        // Center align numbers
        cell.alignment = { horizontal: 'center' };
      }
      if (cell.value.includes(' / Weekoff')) {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '3462f6' },
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
    });
  });

  // Adjust column widths
  workSheet.columns.forEach((column) => {
    column.width = column.values.reduce((maxWidth, value) => {
      const length = value ? value.toString().length : 10;
      return Math.max(maxWidth, length);
    }, 10);
  });

  // Set the response headers for file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.${fileExtension}`,
  );

  // Write the workbook to the response
  await workBook.xlsx.write(res);
  res.end();
};

const generateDemoExcelForShiftRoster = async (
  data,
  dates,
  shiftNames,
  fileUploadType,
  employeeData,
  filename,
  fileExtension,
  res,
) => {
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Shift Roster');
  const shiftDataSheet = workBook.addWorksheet('Shift');
  shiftDataSheet.addRow(['Shift Name']);
  setColorInBackground(shiftDataSheet, 1, '729fcf');
  shiftNames.forEach((shift, index) => {
    shiftDataSheet.getCell(`A${index + 2}`).value = shift;
  });
  const InstructionsSheet = workBook.addWorksheet('Basic Instructions');
  InstructionsSheet.addRow(['1) Select Shift From DropDown']);
  InstructionsSheet.addRow([
    '2) To Add Weekoff Select Weekoff From Below Cell',
  ]);
  InstructionsSheet.addRow(['Weekoff']);
  shiftDataSheet.state = 'hidden';
  const employeeDatasheet = workBook.addWorksheet('EmployeeData');
  employeeDatasheet.addRow([
    // '',
    'Employee Code',
    'Employee Name',
    'Employee Number',
    'Branch',
    'Department',
    'Designation',
  ]);
  setColorInBackground(employeeDatasheet, 1, '729fcf');
  employeeData.forEach((data, index) => {
    // employeeDatasheet.getCell(`A${index + 2}`).value = data.mergedData;
    employeeDatasheet.getCell(`A${index + 2}`).value = data.employeeCode;
    employeeDatasheet.getCell(`B${index + 2}`).value = data.displayName;
    employeeDatasheet.getCell(`C${index + 2}`).value = data.userNumber;
    employeeDatasheet.getCell(`D${index + 2}`).value = data.branch;
    employeeDatasheet.getCell(`E${index + 2}`).value = data.department;
    employeeDatasheet.getCell(`F${index + 2}`).value = data.designation;
  });
  // Add header row with styles
  const headerRow =
    fileUploadType == 'mobileNumber'
      ? [
          'Employee Name',
          'Employee Branch',
          'Employee Department',
          'Employee Designation',
          'Employee Number',
          ...dates,
        ]
      : [
          'Employee Name',
          'Employee Branch',
          'Employee Department',
          'Employee Designation',
          'Employee Code',
          ...dates,
        ];
  const header = workSheet.addRow(headerRow);
  header.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  data.forEach((item) => {
    const row = [
      item.displayName,
      item.branch,
      item.department,
      item.designation,
      fileUploadType == 'mobileNumber' ? item.userNumber : item.employeeCode,
      ...dates.map((date) => item[date] || ''),
    ];
    const rowCells = workSheet.addRow(row);
    rowCells.eachCell((cell, colNumber) => {
      if (colNumber <= 5) {
        // Bold for shiftName
        cell.font = { bold: true };
      } else if (typeof cell.value === 'number') {
        // Center align numbers
        cell.alignment = { horizontal: 'center' };
      }
      if (colNumber > 5) {
        workSheet
          .getColumn(colNumber)
          .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber !== 1) {
              // Skip the header row
              cell.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`Shift!$A$2:$A$${shiftNames.length + 1}`],
              };
            }
          });
      }
    });
  });

  // Adjust column widths
  workSheet.columns.forEach((column) => {
    column.width = column.values.reduce((maxWidth, value) => {
      const length = value ? value.toString().length : 10;
      return Math.max(maxWidth, length);
    }, 10);
  });

  // Set the response headers for file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.${fileExtension}`,
  );

  // Write the workbook to the response
  await workBook.xlsx.write(res);
  res.end();
};

const genrateDemoExcelForBiometricAttendance = async (
  CategoyData,
  fileName,
  fileType,
  dateTimeType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Manual Leave');
    const employeeDatasheet = workBook.addWorksheet('EmployeeData');
    employeeDatasheet.addRow([
      // '',
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Biometric Code',
      'Biometric SerialNumber',
      'Branch',
      'Department',
      'Designation',
    ]);
    const nationalityNamessheet = workBook.addWorksheet('NationalityName');
    nationalityNamessheet.addRow(['Name']);
    const dayTypesheet = workBook.addWorksheet('DayType');
    dayTypesheet.addRow(['Day Type']);

    if (dateTimeType == DateTimeType.SEPERATED) {
      workSheet.addRow([
        'Biometric Code',
        'Nationality',
        'Name',
        'Punch Type',
        'Log Date',
        'Log Time',
      ]);
    } else {
      workSheet.addRow([
        'Biometric Code',
        'Nationality',
        'Name',
        'Punch Type',
        'Log Date Time',
      ]);
    }

    setColorInBackground(employeeDatasheet, 1, '729fcf');
    setColorInBackground(nationalityNamessheet, 1, '729fcf');
    setColorInBackground(dayTypesheet, 1, '729fcf');

    const nationalityNames = ['Expat', 'National'];
    nationalityNames.forEach((leave, index) => {
      nationalityNamessheet.getCell(`A${index + 2}`).value = leave;
    });
    const employeeData = CategoyData;

    employeeData.forEach((data, index) => {
      // employeeDatasheet.getCell(`A${index + 2}`).value = data.mergedData;
      employeeDatasheet.getCell(`A${index + 2}`).value = data.employeeCode;
      employeeDatasheet.getCell(`B${index + 2}`).value = data.displayName;
      employeeDatasheet.getCell(`C${index + 2}`).value = data.userNumber;
      employeeDatasheet.getCell(`D${index + 2}`).value = data.biometricCode;
      employeeDatasheet.getCell(`E${index + 2}`).value = data.biometricSerialNo;
      employeeDatasheet.getCell(`F${index + 2}`).value = data.branch;
      employeeDatasheet.getCell(`G${index + 2}`).value = data.department;
      employeeDatasheet.getCell(`H${index + 2}`).value = data.designation;
    });
    const punchType = ['PUNCH-IN', 'PUNCH-OUT'];
    punchType.forEach((day, index) => {
      dayTypesheet.getCell(`A${index + 2}`).value = day;
    });
    // Hide the Cities worksheet to keep it clean
    // employeeDatasheet.state = 'hidden';
    nationalityNamessheet.state = 'hidden';
    dayTypesheet.state = 'hidden';
    for (let i = 0; i < 10000; i++) {
      workSheet.addRow([null, null, null, null, null, null]);
    }

    workSheet
      .getColumn(4)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`DayType!$A$2:$A$${punchType.length + 1}`],
          };
        }
      });
    workSheet
      .getColumn(2)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `NationalityName!$A$2:$A$${nationalityNames.length + 1}`,
            ],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const generateExcel_SlotWise_Attendance_Report = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = Object.keys(data[0]);

    workSheet.addRow(headerNames);

    const attnData = [
      'slot1_In',
      'slot1_Out',
      'slot1_LateBy(Minutes)',
      'slot1_EarlyBy(Minutes)',
      'slot2_In',
      'slot2_Out',
      'slot2_LateBy(Minutes)',
      'slot2_EarlyBy(Minutes)',
    ];

    let cell = 1;
    data.forEach((e) => {
      const baicData = [
        e['Employee Code'],
        e['Employee Name'],
        e['Employee Number'],
        e['Branch'],
        e['Department'],
        e['Designation'],
        e['Division'],
        e['Working Area'],
      ];

      attnData.map((a) => {
        const toAddattnData = [];

        for (const date in e) {
          if (
            date != 'Employee Code' &&
            date != 'Employee Name' &&
            date != 'Employee Number' &&
            date != 'Branch' &&
            date != 'Department' &&
            date != 'Designation' &&
            date != 'Division' &&
            date != 'Working Area' &&
            date != 'Date'
          ) {
            toAddattnData.push(e[date][a]);
          }
        }

        const row = workSheet.addRow([...baicData, ...[a], ...toAddattnData]);

        // Set light green color for column 7
        row.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C6EFCE' }, // Light green color
        };

        // Set light red color for lateBy and earlyBy cells
        toAddattnData.forEach((value, index) => {
          const columnIndex = 8 + index; // Columns start after the basic data and 'a'
          if (
            +value > 0 &&
            [
              'slot1_LateBy(Minutes)',
              'slot1_EarlyBy(Minutes)',
              'slot2_LateBy(Minutes)',
              'slot2_EarlyBy(Minutes)',
            ].includes(a)
          ) {
            row.getCell(columnIndex).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF0000' }, // Light red color
            };
          }
        });

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } },
          };
        });
      });

      workSheet.mergeCells(cell + 1, 1, cell + 8, 1);
      workSheet.mergeCells(cell + 1, 2, cell + 8, 2);
      workSheet.mergeCells(cell + 1, 3, cell + 8, 3);
      workSheet.mergeCells(cell + 1, 4, cell + 8, 4);
      workSheet.mergeCells(cell + 1, 5, cell + 8, 5);
      workSheet.mergeCells(cell + 1, 6, cell + 8, 6);

      cell += 8;
    });

    formatFirstRow(workSheet, 1);

    workSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 0) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber != 7) {
            alignmentmiddle(workSheet, rowNumber);
          }
          // Apply border to each cell
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } },
          };
        });
      }
    });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateAuthorozationExcelWithUserData = async (
  data,
  AuthCriteria,
  authorizationMasterID,
  companyWiseUserData,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Authorization Data');
  const workSheet1 = workBook.addWorksheet('AuthorizationCriteria');
  let count = 0;
  const companyNameArray = [];
  for (let comp of companyWiseUserData) {
    count++;
    const companyNameLength = comp.companyName.length;

    let sheetName = comp.companyName;

    if (companyNameLength > 30) {
      sheetName = `${comp.companyName.slice(0, 25)}-${count}`;
    } else {
      const duplicateCompanyName = companyNameArray.find(
        (s) =>
          typeof s === 'string' &&
          s.toLowerCase() === comp.companyName.toLowerCase(),
      );

      if (duplicateCompanyName) {
        sheetName = `${comp.companyName.slice(0, 25)}-${count}`;
      }
    }

    companyNameArray.push(comp.companyName);
    const finalSheetName = getUniqueSheetName(workBook, sheetName);

    const employeeDatasheet = workBook.addWorksheet(finalSheetName);
    // Row 1 - Merge A1 to G1 for Company Name
    employeeDatasheet.mergeCells('A1:G1');
    employeeDatasheet.getCell('A1').value =
      `Company Name - ${comp.companyName}`; // dynamic company name
    employeeDatasheet.getCell('A1').alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    employeeDatasheet.getCell('A1').font = { bold: true, size: 14 }; // Optional styling
    employeeDatasheet.addRow([
      'Company Name',
      'Branch',
      'Department',
      'Designation',
      'Employee Code',
      'Employee Name',
      'Employee Number',
    ]);
    setColorInBackground(employeeDatasheet, 1, '729fcf');
    setColorInBackground(employeeDatasheet, 2, '729fcf');
    comp.employeeData.forEach((data, index) => {
      const rowIndex = index + 3; // Start from Row 3

      employeeDatasheet.getCell(`A${rowIndex}`).value = data.company;
      employeeDatasheet.getCell(`B${rowIndex}`).value = data.branch;
      employeeDatasheet.getCell(`C${rowIndex}`).value = data.department;
      employeeDatasheet.getCell(`D${rowIndex}`).value = data.designation;
      employeeDatasheet.getCell(`E${rowIndex}`).value = data.employeeCode
        ? data.employeeCode
        : '';
      employeeDatasheet.getCell(`F${rowIndex}`).value = data.displayName;
      employeeDatasheet.getCell(`G${rowIndex}`).value = data.userNumber;

      // Apply border to all cells of current row
      employeeDatasheet.getRow(rowIndex).eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }
  // worksheeet
  const header = Object.keys(data[0]);

  workSheet.addRow(header);

  formatFirstRow(workSheet, 1);

  const data1 = data.map((row) => Object.values(row));

  data1.map((e) => workSheet.addRow(e));

  //worksheet1--branch

  workSheet1.addRow(['Auth Criteria']);

  formatFirstRow(workSheet1, 1);

  const data2 = AuthCriteria.map((row) => [row.AuthorizationCriteria]);

  data2.map((e) => workSheet1.addRow(e));
  // Hide the ExpenseHead worksheet to keep it clean
  workSheet1.state = 'hidden';

  if (authorizationMasterID == 0) {
    //Expense
    workSheet
      .getColumn(8)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Leave
    workSheet
      .getColumn(11)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Overtime
    workSheet
      .getColumn(14)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Resignation
    workSheet
      .getColumn(17)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Gatepass
    workSheet
      .getColumn(20)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
    //Compensatory Off
    workSheet
      .getColumn(23)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });

    //Attendance Correction
    workSheet
      .getColumn(26)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
  } else {
    //One only
    workSheet
      .getColumn(8)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [
              `AuthorizationCriteria!$A$2:$A$${AuthCriteria.length + 1}`,
            ],
          };
        }
      });
  }

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForVisitReport = async (data, fileName, fileType, res) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Visit');

    const columns = Object.keys(flattenObj(data[0])).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    workSheet.columns = columns;

    // Columns that should contain clickable hyperlinks
    const hyperlinkColumns = ['Check-In-Attachment', 'Check-Out-Attachment'];

    data.forEach((item, index) => {
      const flatItem = flattenObj(item);

      Object.keys(flatItem).forEach((key) => {
        const value = flatItem[key];

        if (typeof value === 'string') {
          flatItem[key] = value
            .replace(/ visitreportSeperate,/g, '\n')
            .replace(/ visitreportSeperate/g, ' ');
        }
      });

      // Write row data
      const row = workSheet.getRow(index + 2);
      row.values = flatItem;

      // Convert attachment URLs into clickable Excel hyperlinks
      hyperlinkColumns.forEach((columnName) => {
        const attachmentUrl = flatItem[columnName];

        if (
          typeof attachmentUrl === 'string' &&
          attachmentUrl.trim() &&
          /^https?:\/\//i.test(attachmentUrl)
        ) {
          const columnNumber =
            columns.findIndex((column) => column.key === columnName) + 1;

          if (columnNumber > 0) {
            const cell = row.getCell(columnNumber);

            cell.value = {
              text: 'View Attachment',
              hyperlink: attachmentUrl,
              tooltip: 'Click to open attachment',
            };

            // Make the hyperlink blue and underlined
            cell.font = {
              color: { argb: 'FF0563C1' },
              underline: true,
            };
          }
        }
      });

      row.alignment = { wrapText: true };
    });

    // Format the first row (header)
    formatFirstRow(workSheet, 1);

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateExcelForIncrementReport = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = [
      'Employee Code',
      'Employee Name',
      'Number',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
      'Joining Date',
    ];
    data.map((x) => {
      const headerRows = workSheet.addRow(headerNames);
      headerRows.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: '87CEEB',
          }, // blue background
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        cell.font = {
          bold: true, // Make text bold for better readability
        };

        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
      });
      workSheet.addRow([
        x.employeeCode,
        x.displayName,
        x.userNumber,
        x.branch,
        x.department,
        x.designation,
        x.division,
        x.workingArea,
        moment(x.joiningDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
      ]);

      workSheet.getColumn(1).width = 20;
      workSheet.getColumn(2).width = 20;
      workSheet.getColumn(3).width = 20;
      workSheet.getColumn(4).width = 20;
      workSheet.getColumn(5).width = 20;
      workSheet.getColumn(6).width = 15;
      workSheet.getColumn(7).width = 15;

      x.salaryData.map((data) => {
        workSheet.addRow(['']);
        const monthRow = workSheet.addRow([
          'Applicable Month : ',
          data.salaryFromYYYYMM,
          '',
          'Based on calculation',
          data.baseOnCalculation == 'M'
            ? 'Monthly'
            : data.baseOnCalculation == 'D'
              ? 'Daily'
              : 'Hourly',
        ]);

        monthRow?.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'ADD8E6' },
          };

          cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
        });

        const rowData = [];
        const rowDataValues = [];
        data.achildData.map((child) => {
          rowData.push(
            child.payheadDisplayName
              ? child.payheadDisplayName
              : child.payheadName,
          );
        });
        rowData.push(
          data?.grossData?.payheadDisplayName
            ? data?.grossData?.payheadDisplayName
            : data?.grossData?.payheadName,
        );

        data.bchildData.map((child) => {
          rowData.push(
            child.payheadDisplayName
              ? child.payheadDisplayName
              : child.payheadName,
          );
        });
        data.extra_achild.map((child) => {
          rowData.push(
            child.payheadDisplayName
              ? child.payheadDisplayName
              : child.payheadName,
          );
        });
        rowData.push(
          data?.netPayData?.payheadDisplayName
            ? data?.netPayData?.payheadDisplayName
            : data?.netPayData?.payheadName,
        );
        data.cchildData.map((child) => {
          rowData.push(
            child.payheadDisplayName
              ? child.payheadDisplayName
              : child.payheadName,
          );
        });

        rowData.push(
          data?.ctcData?.payheadDisplayName
            ? data?.ctcData?.payheadDisplayName
            : data?.ctcData?.payheadName,
        );

        data.achildData.map((child) => {
          rowDataValues.push(child.EmployeeSalaryAmount);
        });
        rowDataValues.push(data?.grossData?.EmployeeSalaryAmount);

        data.bchildData.map((child) => {
          rowDataValues.push(child.EmployeeSalaryAmount);
        });
        data.extra_achild.map((child) => {
          rowDataValues.push(child.EmployeeSalaryAmount);
        });
        rowDataValues.push(data?.netPayData?.EmployeeSalaryAmount);

        data.cchildData.map((child) => {
          rowDataValues.push(child.EmployeeSalaryAmount);
        });

        rowDataValues.push(data?.ctcData?.EmployeeSalaryAmount);

        const dataRow = workSheet.addRow(rowData);
        dataRow?.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D3D3D3' }, // Light Grey background
          };

          cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
        });
        const dataRowValue = workSheet.addRow(rowDataValues);
        dataRowValue?.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
      workSheet.addRow(['']);
      workSheet.addRow(['']);
      workSheet.addRow(['']);
    });

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateExcelForExtraDays = async (data, fileName, fileType, res) => {
  if (!data.length) throw new Error('No data found to generate the file!');

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = [
      'Employee Code',
      'User Name',
      'Number',
      'Branch',
      'Department',
      'Designation',
      'Days',
      'Date',
      'Remarks',
      'Cancel Remarks',
      'Status',
      'Auth Criteria',
      'Authorization',
      'Created By',
    ];

    const headerRow = workSheet.addRow(headerNames);
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true,
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    data.map((x) => {
      const row = workSheet.addRow([
        x.employeeCode,
        x.displayName,
        x.userNumber,
        x.branchName,
        x.departmentName,
        x.designationName,
        x.days,
        x.date,
        x.remarks ? x.remarks : '',
        x.cancelRemarks ? x.cancelRemarks : '',
        x.status,
        x.AuthorizationCriteria,
        x.Authorization,
        x.createBy,
      ]);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    workSheet.getColumn(1).width = 20;
    workSheet.getColumn(2).width = 20;
    workSheet.getColumn(3).width = 20;
    workSheet.getColumn(4).width = 15;
    workSheet.getColumn(5).width = 20;
    workSheet.getColumn(6).width = 15;
    workSheet.getColumn(7).width = 20;
    workSheet.getColumn(8).width = 20;
    workSheet.getColumn(9).width = 20;
    workSheet.getColumn(10).width = 20;
    workSheet.getColumn(11).width = 20;
    workSheet.getColumn(12).width = 20;
    workSheet.getColumn(13).width = 30;
    workSheet.getColumn(14).width = 30;

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

function setBorder(row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

const generateExcelOTReportWithESIC = async (data, fileName, fileType, res) => {
  const {
    companyName,
    month,
    finalData,
    sum1,
    total1,
    total2,
    totalSalaryDue,
    totalEmpESI,
    totalNetsalary,
    totalEmployerESI,
  } = data;

  if (!finalData.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    workSheet.addRow([companyName]);

    workSheet.getRow(1).font = {
      bold: true,
      size: 12,
      // color: { argb: "FFFFFF" },
    };

    workSheet.mergeCells(1, 1, 1, 9);

    workSheet.getRow(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    workSheet.addRow([`OT SHEET FOR THE MONTH OF ${month}`]);

    workSheet.getRow(2).font = {
      bold: true,
      size: 12,
      // color: { argb: "FFFFFF" },
    };

    workSheet.getRow(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    workSheet.mergeCells(2, 1, 2, 9);

    workSheet.addRow(['']);

    const header = Object.keys(finalData[0]);

    workSheet.addRow(header);

    workSheet.getRow(4).font = {
      bold: true,
    };

    const values = finalData.map((row) => Object.values(row));

    values.map((e, i) => {
      const dataRow = workSheet.addRow(e);

      setBorder(dataRow);

      if (i == values.length - 1) {
        dataRow.eachCell((cell) => {
          cell.font = {
            bold: true,
            // color: { argb: "FFFFFF" },
          };
        });
      }
    });

    workSheet.mergeCells(finalData.length + 4, 1, finalData.length + 4, 5);

    workSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 0) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          alignmentmiddle(workSheet, rowNumber);

          // Apply border to each cell
          cell.border = {
            top: { style: 'thin', color: { argb: '000000' } },
            left: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'thin', color: { argb: '000000' } },
            right: { style: 'thin', color: { argb: '000000' } },
          };
        });
      }
    });

    workSheet.addRow(['']);
    workSheet.addRow(['']);
    workSheet.addRow(['']);

    const row1 = workSheet.addRow([
      'CALCULATION OF AMOUNT PAYABLE FOR E.S.I.C AMOUNT (TOTAL)',
    ]);

    row1.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
    });

    workSheet.mergeCells(row1.number, 1, row1.number, 3);

    workSheet.addRow(['CONTRIBUTION OF EMPLOYEES (0.75%)', `${totalEmpESI}`]);
    workSheet.addRow([
      'CONTRIBUTION OF EMPLOYERS (3.25%)',
      `${totalEmployerESI}`,
    ]);
    const totalrow = workSheet.addRow([
      'TOTAL',
      `${totalEmpESI + totalEmployerESI}`,
    ]);

    totalrow.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
    });

    workSheet.addRow(['']);
    workSheet.addRow(['']);

    const row = workSheet.addRow([`Journal Entry of OT Exp. For ${month}`]);
    workSheet.mergeCells(row.number, 1, row.number, 3);

    row.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
    });

    alignmentmiddle(workSheet, row.number);

    const row2 = workSheet.addRow(['Salary Exp. A/c DR', `${totalSalaryDue}`]);
    setBorder(row2);
    const row3 = workSheet.addRow(['ESI Exp. A/c DR', `${totalEmployerESI}`]);
    setBorder(row3);
    const row4 = workSheet.addRow([
      'To Salary Payable',
      '',
      `${totalNetsalary}`,
    ]);
    setBorder(row4);
    const row5 = workSheet.addRow([
      'To ESI Payable',
      '',
      `${totalEmpESI + totalEmployerESI}`,
    ]);
    setBorder(row5);
    const finalrow = workSheet.addRow([
      'TOTAL',
      `${totalSalaryDue + totalEmployerESI}`,
      `${totalNetsalary + totalEmpESI + totalEmployerESI}`,
    ]);
    setBorder(finalrow);
    finalrow.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
    });

    workSheet.addRow(['']);
    workSheet.addRow(['']);
    workSheet.addRow(['']);
    workSheet.addRow(['']);

    const lastrow = workSheet.addRow([
      'PREPARED BY',
      '',
      '',
      '',
      'CHECKED BY',
      '',
      '',
      '',
      'PASSED BY',
    ]);
    lastrow.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
    });

    workSheet.mergeCells(lastrow.number, 1, lastrow.number, 4);
    workSheet.mergeCells(lastrow.number, 5, lastrow.number, 8);
    workSheet.mergeCells(lastrow.number, 9, lastrow.number, 9);

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generatePdfForEmploeeMonthWiseSalary = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const getTemplate1 = (type) => {
      const file = path.join(__dirname, `../html/${type}.html`);
      return file;
    };

    const filePath = await getTemplate1('employeeWiseSalaryReport');

    const readFile = (name) => {
      return new Promise((resolve, reject) => {
        fs.readFile(name, 'utf-8', (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    };

    const file = await readFile(filePath);
    const template = Handlebars.compile(file);
    const html = template({ data: data });

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();

    // Set the HTML content of the page
    await page.setContent(html);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4', // Page format (A4 in this case)
      printBackground: true, // print background
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
      landscape: true, // Set PDF to landscape mode
    });
    await browser.close();

    let base64path = Buffer.from(pdfBuffer).toString('base64');

    return res.status(200).json({
      status: 200,
      data: base64path,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const genrateDemoExcelForDesinationWiseDocument = async (
  designationDocData,
  fileName,
  fileType,
  res,
) => {
  try {
    // if (!data.length) throw new Error('No data found to generate the file!');

    const workBook = new Excel.Workbook();

    const companyDesignationDataSheet = workBook.addWorksheet('Document');
    const usertypeSheet = workBook.addWorksheet('UserType');
    const userTypes = ['National', 'Expat', 'Both'];
    userTypes.forEach((leave, index) => {
      usertypeSheet.getCell(`A${index + 2}`).value = leave;
    });
    usertypeSheet.state = 'hidden';
    const dayTypesheet = workBook.addWorksheet('DayType');
    const dayType = ['Y', 'N'];
    dayType.forEach((day, index) => {
      dayTypesheet.getCell(`A${index + 2}`).value = day;
    });
    dayTypesheet.state = 'hidden';
    companyDesignationDataSheet.addRow([
      'Designation',
      'Document',
      'Is Needed',
      'Is Required',
      'Required User Type',
    ]);
    const RequiredColumnStyle = [
      { index: 3, color: 'FFFF6666' },
      { index: 4, color: 'FFFF6666' },
      { index: 5, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      companyDesignationDataSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });
    const notRequiredColumnStyle = [
      { index: 1, color: '729fcf' },
      { index: 2, color: '729fcf' },
    ];
    // Apply the styles to each specified column
    notRequiredColumnStyle.forEach((column) => {
      companyDesignationDataSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });
    for (let i = 0; i <= designationDocData.length; i++) {
      companyDesignationDataSheet.addRow([null, null, null, null, null, null]);
    }
    companyDesignationDataSheet
      .getColumn(3)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`DayType!$A$1:$A$${dayType.length + 1}`],
          };
        }
      });
    companyDesignationDataSheet
      .getColumn(4)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`DayType!$A$1:$A$${dayType.length + 1}`],
          };
        }
      });
    companyDesignationDataSheet
      .getColumn(5)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`UserType!$A$1:$A$${userTypes.length + 1}`],
          };
        }
      });

    designationDocData.forEach((data, index) => {
      companyDesignationDataSheet.getCell(`A${index + 2}`).value =
        data.designationName;
      companyDesignationDataSheet.getCell(`B${index + 2}`).value =
        data.documentName;
      companyDesignationDataSheet.getCell(`C${index + 2}`).value =
        data.isNeeded;
      companyDesignationDataSheet.getCell(`D${index + 2}`).value =
        data.isRequired;
      companyDesignationDataSheet.getCell(`E ${index + 2}`).value =
        data.requiredUserType;
    });
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const generateDemoExcelForPaySlipGenerator = async (
  employeeTaxableHeader,
  employeeNonTaxableHeader,
  employeeContributionHeader,
  employerContributionHeader,
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Pay Slip Data');

  const temp1 = Array.from(
    { length: (employeeTaxableHeader.length - 1) * 3 },
    () => '',
  );

  const temp2 = Array.from(
    { length: (employeeNonTaxableHeader.length - 1) * 2 },
    () => '',
  );

  const temp3 = Array.from(
    { length: (employeeContributionHeader.length - 1) * 2 },
    () => '',
  );

  const temp4 = Array.from(
    { length: (employerContributionHeader.length - 1) * 2 },
    () => '',
  );

  workSheet.addRow([
    ...['', '', '', '', '', '', '', '', 'Taxable Earnings', '', ''],
    ...temp1,
    ...['Non-Taxable Earnings', ''],
    ...temp2,
    ...['', 'Deductions', ''],
    ...temp3,
    ...['', 'Employer Contributions', ''],
    ...temp4,
  ]);

  workSheet.mergeCells(1, 9, 1, 8 + employeeTaxableHeader.length * 3);

  if (+employeeTaxableHeader.length > 0 && employeeNonTaxableHeader.length) {
    workSheet.mergeCells(
      1,
      9 + employeeTaxableHeader.length * 3,
      1,
      8 +
        employeeTaxableHeader.length * 3 +
        employeeNonTaxableHeader.length * 2,
    );
  }

  if (
    employeeTaxableHeader.length > 0 &&
    employeeNonTaxableHeader.length > 0 &&
    employeeContributionHeader.length
  ) {
    workSheet.mergeCells(
      1,
      9 +
        employeeTaxableHeader.length * 3 +
        employeeNonTaxableHeader.length * 2 +
        1,
      1,
      8 +
        employeeTaxableHeader.length * 3 +
        employeeNonTaxableHeader.length * 2 +
        1 +
        employeeContributionHeader.length * 2,
    );
  }

  if (
    employeeTaxableHeader.length > 0 &&
    employeeNonTaxableHeader.length > 0 &&
    employeeContributionHeader.length > 0 &&
    employerContributionHeader.length > 0
  ) {
    workSheet.mergeCells(
      1,
      9 +
        employeeTaxableHeader.length * 3 +
        employeeNonTaxableHeader.length * 2 +
        1 +
        employeeContributionHeader.length * 2 +
        1,
      1,
      8 +
        employeeTaxableHeader.length * 3 +
        employeeNonTaxableHeader.length * 2 +
        1 +
        employeeContributionHeader.length * 2 +
        1 +
        employerContributionHeader.length * 2,
    );
  }

  workSheet.getRow(1).eachCell((cell) => {
    cell.font = { size: 12, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  workSheet.getRow(1).height = 20;

  const taxableData = (employeeTaxableHeader || []).flatMap((item) => [
    item,
    '',
    '',
  ]);
  const nontaxableData = (employeeNonTaxableHeader || []).flatMap((item) => [
    item,
    '',
  ]);
  const emp_deductionData = (employeeContributionHeader || []).flatMap(
    (item) => [item, ''],
  );
  const employer_deductionData = (employerContributionHeader || []).flatMap(
    (item) => [item, ''],
  );

  const header = Object.keys(data[0]);

  const header1 = header.slice(0, 8);

  const headerRow = workSheet.addRow([
    ...header1,
    ...taxableData,
    ...nontaxableData,
    ...['GROSS'],
    ...emp_deductionData,
    ...['NET SALARY'],
    ...employer_deductionData,
  ]);

  if (taxableData.length) {
    let left = 9;
    for (let i = 0; i < taxableData.length; i += 3) {
      workSheet.mergeCells(2, left, 2, left + 2);
      left += 3;
    }
  }

  if (nontaxableData.length) {
    let left = 9 + taxableData.length;
    for (let i = 0; i < nontaxableData.length; i += 2) {
      workSheet.mergeCells(2, left, 2, left + 1);
      left += 2;
    }
  }

  if (emp_deductionData.length) {
    let left = 9 + taxableData.length + nontaxableData.length + 1;
    for (let i = 0; i < emp_deductionData.length; i += 2) {
      workSheet.mergeCells(2, left, 2, left + 1);
      left += 2;
    }
  }

  if (employer_deductionData.length) {
    let left =
      9 +
      taxableData.length +
      nontaxableData.length +
      1 +
      emp_deductionData.length +
      1;
    for (let i = 0; i < employer_deductionData.length; i += 2) {
      workSheet.mergeCells(2, left, 2, left + 1);
      left += 2;
    }
  }

  const taxableHeaderData = employeeTaxableHeader.flatMap((key) =>
    ['Amount', 'WorkingHrs', 'YTD'].map((suffix) => `${suffix}`),
  );

  const NontaxableHeaderData = employeeNonTaxableHeader.flatMap((key) =>
    ['Amount', 'YTD'].map((suffix) => `${suffix}`),
  );

  const emp_contri_HeaderData = employeeContributionHeader.flatMap((key) =>
    ['Amount', 'YTD'].map((suffix) => `${suffix}`),
  );

  const employer_contri_HeaderData = employerContributionHeader.flatMap((key) =>
    ['Amount', 'YTD'].map((suffix) => `${suffix}`),
  );

  const headerRow1 = workSheet.addRow([
    ...['', '', '', '', '', '', '', ''],
    ...taxableHeaderData,
    ...NontaxableHeaderData,
    ...[''],
    ...emp_contri_HeaderData,
    ...[''],
    ...employer_contri_HeaderData,
  ]);

  workSheet.mergeCells(2, 1, 3, 1);
  workSheet.mergeCells(2, 2, 3, 2);
  workSheet.mergeCells(2, 3, 3, 3);
  workSheet.mergeCells(2, 4, 3, 4);
  workSheet.mergeCells(2, 5, 3, 5);
  workSheet.mergeCells(2, 6, 3, 6);
  workSheet.mergeCells(2, 7, 3, 7);
  workSheet.mergeCells(2, 8, 3, 8);

  // Set light blue color for cells 1 to 5
  setCellColor(headerRow, 1, 8, 'ADD8E6'); // Light Blue

  // Set light green color for cells 6 to incentiveHeader.length
  setCellColor(headerRow, 9, 8 + taxableData.length, '90EE90'); // Light Green

  // Set red color for penaltyHeader
  setCellColor(
    headerRow,
    9 + taxableData.length,
    8 + taxableData.length + nontaxableData.length,
    '90EE90',
  );
  // light yellow FFFFE0

  setCellColor(
    headerRow,
    9 + taxableData.length + nontaxableData.length + 1,
    8 +
      taxableData.length +
      nontaxableData.length +
      1 +
      emp_deductionData.length,
    'e6b8b7',
  );

  setCellColor(
    headerRow,
    9 +
      taxableData.length +
      nontaxableData.length +
      1 +
      emp_deductionData.length +
      1,
    8 +
      taxableData.length +
      nontaxableData.length +
      1 +
      emp_deductionData.length +
      1 +
      employer_deductionData.length,
    'e6b8b7',
  );

  // // Set red color for penaltyHeader

  // setCellColor(
  //   headerRow,
  //   6 +
  //   employeeEarningHeader.length +
  //   1 +
  //   employeeContributionHeader.length +
  //   1 +
  //   employerContributionHeader.length,
  //   5 +
  //   employeeEarningHeader.length +
  //   1 +
  //   employeeContributionHeader.length +
  //   1 +
  //   employerContributionHeader.length +
  //   otherDeductionHeader.length,
  //   'e6b8b7'
  // );

  // Set light green color for cells 6 to incentiveHeader.length
  setCellColor(headerRow1, 9, 8 + taxableData.length, '90EE90'); // Light Green

  // Set red color for penaltyHeader
  setCellColor(
    headerRow1,
    9 + taxableData.length,
    8 + taxableData.length + nontaxableData.length,
    '90EE90',
  );
  // light yellow FFFFE0

  setCellColor(
    headerRow1,
    9 + taxableData.length + nontaxableData.length + 1,
    8 +
      taxableData.length +
      nontaxableData.length +
      1 +
      emp_deductionData.length,
    'e6b8b7',
  );

  const data1 = data.map((row) => Object.values(row));

  data1.map((e) => workSheet.addRow(e));

  workSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > 0) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > 6) {
          alignmentmiddle(workSheet, rowNumber);
        }
        // Apply border to each cell
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
      });
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generatePaySlipExcel = async (data, fileName, fileType, res) => {
  try {
    const setBorder = (row) => {
      row?.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (cell.value == 'GROSS' || cell.value == 'NET SALARY')
          cell.font = {
            bold: true,
          };

        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
      });
    };

    if (!data.length) throw new Error('No data found to generate the file!');
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Pay Slip Data');

    const headerNames = [
      'Employee Code',
      'Employee Name',
      'Number',
      'Branch',
      'Department',
      'Designation',
    ];
    data?.map((x) => {
      const headerRows = workSheet.addRow(headerNames);
      headerRows.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'aaaaaa',
          },
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        cell.font = {
          bold: true, // Make text bold for better readability
        };

        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
      });
      workSheet.addRow([
        x.employeeCode,
        x.displayName,
        x.userNumber,
        x.branch,
        x.department,
        x.designation,
      ]);

      workSheet.addRow(['']);

      let rowData = ['From Date :', x.startDate, '', 'To Date:', x.endDate];

      if (x.month) {
        rowData = ['Month :', x.month];
      }

      const monthRow = workSheet.addRow([
        ...['Payroll Frequency : ', x.payrollFrequency, ''],
        ...rowData,
      ]);

      monthRow?.eachCell((cell) => {
        cell.font = {
          bold: true,
        };

        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
      });

      const payheadData = [
        ...[''],
        ...x.earning_paySlipData.map((e) => e.hrSalaryField?.PHM?.payheadName),
        ...['GROSS'],
        ...x.deduction_paySlipData.map(
          (e) => e.hrSalaryField?.PHM?.payheadName,
        ),
        ...['NET SALARY'],
      ];

      const payheadRow = workSheet.addRow(payheadData);

      setBorder(payheadRow);

      workSheet.columns.forEach((column) => {
        column.width = 15;
      });

      const ActualWorkingHrs = [
        ...['Actual WorkingHrs'],
        ...x.earning_paySlipData.map((e) => e.actualWorkingHrs || '-'),
        ...['-'],
        ...x.deduction_paySlipData.map((e) => '-'),
        ...['-'],
      ];

      const hrsRow = workSheet.addRow(ActualWorkingHrs);

      setBorder(hrsRow);

      const amount = [
        ...['Amount'],
        ...x.earning_paySlipData.map((e) => e.amount || '-'),
        ...[x.gross],
        ...x.deduction_paySlipData.map((e) => e.amount || '-'),
        ...[x.netPay],
      ];

      const amountRow = workSheet.addRow(amount);

      setBorder(amountRow);

      const YTD = [
        ...['YTD'],
        ...x.earning_paySlipData.map((e) => e.YTD || '-'),
        ...['-'],
        ...x.deduction_paySlipData.map((e) => e.YTD || '-'),
        ...['-'],
      ];

      const YTDRow = workSheet.addRow(YTD);

      setBorder(YTDRow);

      workSheet.addRow(['']);
      workSheet.addRow(['']);
      workSheet.addRow(['']);
    });

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function createZipFileForProfilePics(finalArray, res) {
  const fileName = 'profilePics';
  const zip = new JSZip();

  for (let i = 0; i < finalArray.length; i++) {
    const filePath = path.join(
      __dirname,
      '../uploads/user/photo',
      finalArray[i]?.photo,
    );
    let extension = filePath?.split('.').pop();
    if (extension == 'bin') {
      extension = 'jpeg';
    }
    try {
      const imageBytes = await readFileAsync(filePath);
      const employeeCode = finalArray[i].employeeJoiningDetails[0].employeeCode
        ? `[${finalArray[i].employeeJoiningDetails[0].employeeCode}]`
        : '';
      const fileName = `${i + 1} ${finalArray[i].displayName} ${employeeCode}.${extension}`;

      zip.file(fileName, imageBytes);
    } catch (err) {}
  }

  const zipbuffer = await zip.generateAsync({ type: 'nodebuffer' });
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename=${fileName}.zip`,
  });
  res.end(zipbuffer);
}

const generateExcelForAttendanceCorrectionReport = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    // =====================================================
    // HEADER STYLE FUNCTION
    // =====================================================

    const formatFirstRow = (workSheet, row) => {
      const firstRow = workSheet.getRow(row);

      firstRow.height = 28;

      firstRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '729fcf' },
        };

        cell.font = {
          bold: true,
          name: 'calibri',
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    };

    // =====================================================
    // MERGE CELLS
    // =====================================================

    // Group Header Merge
    workSheet.mergeCells('I1:S1');
    workSheet.mergeCells('T1:Z1');

    // =====================================================
    // HEADER VALUES
    // =====================================================

    // Main Headers
    workSheet.getCell('A1').value = 'Employee Code';
    workSheet.getCell('B1').value = 'Employee Name';
    workSheet.getCell('C1').value = 'Branch';
    workSheet.getCell('D1').value = 'Department';
    workSheet.getCell('E1').value = 'Designation';
    workSheet.getCell('F1').value = 'Division';
    workSheet.getCell('G1').value = 'Working Area';
    workSheet.getCell('H1').value = 'Attendance Date';

    // Group Headers
    workSheet.getCell('I1').value = 'Requested Correction';
    workSheet.getCell('T1').value = 'Attendance Info';

    // Sub Headers
    workSheet.getRow(2).values = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',

      // Requested Correction
      'Auth Criteria',
      'Auth Status',
      'Correction Remarks',
      'Correction Reason',
      'Attendance Status',
      'Log Time',
      'Authorizations',
      'Create By',
      'Created At',
      'Update By',
      'Updated At',

      // Attendance Info
      'Shift',
      'Shift Details',
      'In Time',
      'Out Time',
      'Working Minutes',
      'Attendance Status',
      'Attendance Logs',
    ];
    // Vertical Merge
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col) => {
      workSheet.mergeCells(`${col}1:${col}2`);
    });

    // =====================================================
    // APPLY HEADER STYLE
    // =====================================================

    formatFirstRow(workSheet, 1);
    formatFirstRow(workSheet, 2);

    // =====================================================
    // DATA
    // =====================================================

    data.forEach((x) => {
      const attendanceLogs =
        x?.attData?.attendaceLogs.map(
          (item) => `${item.direction?.toUpperCase()} : ${item.logDateTime}`,
        ) || [];

      const shiftData = x?.attData
        ? [
            `Shift Hours : ${x.attData?.Shifthrs || ''}`,
            `Shift In Time : ${x.attData?.ShiftIntime || ''}`,
            `Shift Out Time : ${x.attData?.ShiftoutTime || ''}`,
          ].join('\n')
        : '';

      const row = workSheet.addRow([
        x.employeeCode,
        x.displayName,
        x.Branch,
        x.Department,
        x.Designation,
        x.Division,
        x.workingArea,
        x.AttendanceDate,

        // Requested Correction
        x.authCriteria,
        x.authorizationStatus,
        x.remark,
        x.reason,
        x.attendanceStatus,
        Array.isArray(x.logTime) ? x.logTime.join('\n') : '',
        Array.isArray(x.authorizations) ? x.authorizations.join('\n') : '',
        x.createBy,
        x.createdAt,
        x.updateBy,
        x.updateBy ? x.updatedAt : '',

        // Attendance Info
        x?.attData?.ShiftName || '',
        shiftData,
        x?.attData?.InDatetime || '',
        x?.attData?.OutDateTime || '',
        x?.attData?.roundOffMinutes || '',
        x?.attData?.fulldayhalfday || '',
        Array.isArray(attendanceLogs) ? attendanceLogs.join('\n') : '',
      ]);

      row.eachCell((cell) => {
        cell.alignment = {
          vertical: 'top',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      row.height = 90;
    });

    // =====================================================
    // COLUMN WIDTHS
    // =====================================================

    const widths = [
      20, // Employee Code
      25, // Employee Name
      20, // Branch
      20, // Department
      20, // Designation
      20, // Division
      20, // Working Area
      18, // Attendance Date

      // Requested Correction
      18, // Auth Criteria
      18, // Auth Status
      35, // Correction Remarks
      25, // Correction Reason
      18, // Attendance Status
      30, // Log Time
      30, // Authorizations
      20, // Create By
      20, // Created At
      20, // Update By
      20, // Updated At

      // Attendance Info
      35, // Shift
      20, // Shift Details
      22, // In Time
      22, // Out Time
      18, // Working Minutes
      18, // Attendance Status
      30, // Attendance Logs
    ];

    widths.forEach((width, index) => {
      workSheet.getColumn(index + 1).width = width;
    });

    // =====================================================
    // FREEZE HEADER
    // =====================================================

    workSheet.views = [
      {
        state: 'frozen',
        ySplit: 2,
      },
    ];

    // =====================================================
    // RESPONSE
    // =====================================================

    res.attachment(`${fileName}.${fileType}`);

    res.set({
      'Access-Control-Expose-Headers': '*',
    });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};
const generateExcelForLeaveApplicationReport = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = Object.keys(data[0]);
    headerNames.pop();
    headerNames.push('Approved Leave Date');
    headerNames.push('Approved Leave Name');
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true, // Make text bold for better readability
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });
    const columnWidths = [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 25, 20, 20, 20,
    ];
    columnWidths.forEach((width, i) => {
      workSheet.getColumn(i + 1).width = width;
    });

    let index1 = 0;

    data.forEach((x) => {
      if (x.Approved && x.Approved.length > 0) {
        x.Approved.forEach((leave) => {
          const rowData = headerNames.map((key) => {
            if (key === 'Approved Leave Date') return leave['Leave Date'];
            if (key === 'Approved Leave Name') return leave['Leave Name'];
            return x[key];
          });

          const newRow = workSheet.addRow(rowData);
          newRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };

            cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
          });
        });
        workSheet.mergeCells(
          index1 + 2,
          1,
          index1 + 2 + x.Approved?.length - 1,
          1,
        );
        workSheet.mergeCells(
          index1 + 2,
          2,
          index1 + 2 + x.Approved?.length - 1,
          2,
        );
        workSheet.mergeCells(
          index1 + 2,
          3,
          index1 + 2 + x.Approved?.length - 1,
          3,
        );
        workSheet.mergeCells(
          index1 + 2,
          4,
          index1 + 2 + x.Approved?.length - 1,
          4,
        );
        workSheet.mergeCells(
          index1 + 2,
          5,
          index1 + 2 + x.Approved?.length - 1,
          5,
        );
        workSheet.mergeCells(
          index1 + 2,
          6,
          index1 + 2 + x.Approved?.length - 1,
          6,
        );
        workSheet.mergeCells(
          index1 + 2,
          7,
          index1 + 2 + x.Approved?.length - 1,
          7,
        );
        workSheet.mergeCells(
          index1 + 2,
          8,
          index1 + 2 + x.Approved?.length - 1,
          8,
        );
        workSheet.mergeCells(
          index1 + 2,
          9,
          index1 + 2 + x.Approved?.length - 1,
          9,
        );
        workSheet.mergeCells(
          index1 + 2,
          10,
          index1 + 2 + x.Approved?.length - 1,
          10,
        );
        workSheet.mergeCells(
          index1 + 2,
          11,
          index1 + 2 + x.Approved?.length - 1,
          11,
        );
        workSheet.mergeCells(
          index1 + 2,
          12,
          index1 + 2 + x.Approved?.length - 1,
          12,
        );
        workSheet.mergeCells(
          index1 + 2,
          13,
          index1 + 2 + x.Approved?.length - 1,
          13,
        );
        workSheet.mergeCells(
          index1 + 2,
          14,
          index1 + 2 + x.Approved?.length - 1,
          14,
        );
        workSheet.mergeCells(
          index1 + 2,
          15,
          index1 + 2 + x.Approved?.length - 1,
          15,
        );
        workSheet.mergeCells(
          index1 + 2,
          16,
          index1 + 2 + x.Approved?.length - 1,
          16,
        );

        index1 += +x.Approved?.length;
      } else {
        const rowData = headerNames.map((key) => (x[key] ? x[key] : ''));
        index1++;
        const newRow = workSheet.addRow(rowData);
        newRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
        });
      }
    });

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const streamLeaveReportToExcel = async (res, headerNames = []) => {
  try {
    // Initialize exceljs WorkbookWriter with streaming options
    const workbook = new Excel.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    // Create worksheet with name 'sheet'
    const worksheet = workbook.addWorksheet('Sheet');

    // Write header row
    const headerRow = worksheet.addRow(headerNames);

    // Apply header styling: bold font, centered alignment, thin borders
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = {
        bold: true,
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Set column widths
    const columnWidths = [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 25, 20, 20, 20,
    ];
    columnWidths.forEach((width, i) => {
      worksheet.getColumn(i + 1).width = width;
    });

    // Commit header row to stream
    headerRow.commit();

    // Return worksheet object for chunk streaming
    return { workbook, worksheet };
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Streams a chunk of transformed employee leave data to an Excel worksheet
 * @param {Object} worksheet - ExcelJS worksheet object for streaming
 * @param {Array} transformedChunkData - Array of employee records with leave data
 * @param {Number} currentRowIndex - Current row index (0-based count of data rows written so far)
 * @returns {Number} Updated row index for next chunk
 *
 * For employees with approved leaves:
 * - Writes one row per approved leave
 * - Merges cells in columns 1-16 across all rows for that employee
 *
 * For employees without approved leaves:
 * - Writes single row with empty values for Approved Leave Date/Name columns
 */
const streamChunkToExcel = (
  worksheet,
  transformedChunkData,
  currentRowIndex,
  headerNames = [],
) => {
  let rowIndex = currentRowIndex;

  transformedChunkData.forEach((employeeRecord) => {
    if (employeeRecord.Approved && employeeRecord.Approved.length > 0) {
      // Employee has approved leaves - write one row per approved leave
      // Buffer rows before committing to enable cell merging
      const rows = [];

      employeeRecord.Approved.forEach((leave) => {
        const rowData = headerNames.map((key) => {
          if (key === 'Approved Leave Date') return leave['Leave Date'];
          if (key === 'Approved Leave Name') return leave['Leave Name'];
          return employeeRecord[key];
        });

        const newRow = worksheet.addRow(rowData);

        // Apply cell styling: centered alignment, thin borders
        newRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Store row without committing yet
        rows.push(newRow);
      });

      // Apply cell merging for columns 1-16 BEFORE committing rows
      // rowIndex is the count of data rows written so far (0-based)
      // Excel rows are 1-based, and row 1 is the header, so first data row is row 2
      // Merge from (rowIndex + 2) to (rowIndex + 2 + approvedLength - 1)
      const startRow = rowIndex + 2;
      const endRow = rowIndex + 2 + employeeRecord.Approved.length - 1;

      // Merge cells for columns 1-16 (all columns except Approved Leave Date and Approved Leave Name)
      for (let col = 1; col <= 16; col++) {
        worksheet.mergeCells(startRow, col, endRow, col);
      }

      // Now commit all rows after merging
      rows.forEach((row) => row.commit());

      rowIndex += employeeRecord.Approved.length;
    } else {
      // Employee has no approved leaves - write single row with empty values for Approved Leave Date/Name
      const rowData = headerNames.map((key) => {
        if (key === 'Approved Leave Date' || key === 'Approved Leave Name') {
          return '';
        }
        return employeeRecord[key] ? employeeRecord[key] : '';
      });

      const newRow = worksheet.addRow(rowData);

      // Apply cell styling: centered alignment, thin borders
      newRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      newRow.commit();
      rowIndex++;
    }
  });

  // Return updated row index for next chunk
  return rowIndex;
};

const generateDemoExcelBranchJob = async (
  userData,
  excelData,
  uploadObject,
  fileName,
  fileType,
  res,
) => {
  if (!userData.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const datatobeExportSheet = workBook.addWorksheet('Employee Data');
  const header = Object.keys(userData[0]);
  datatobeExportSheet.addRow(header);
  formatFirstRow(datatobeExportSheet, 1);
  const data1 = userData.map((row) => Object.values(row));
  data1.map((e) => datatobeExportSheet.addRow(e));
  if (uploadObject.isUploadBranch) {
    const branchSheet = workBook.addWorksheet('Branch');
    branchSheet.addRow(['Branch']);
    formatFirstRow(branchSheet, 1);
    const data = excelData.allBranch.map((row) => [row.branchName]);
    data.map((e) => branchSheet.addRow(e));
  }

  if (uploadObject.isUploadDepartment) {
    const departmentSheet = workBook.addWorksheet('Department');
    departmentSheet.addRow(['Department']);
    formatFirstRow(departmentSheet, 1);
    const data = excelData.allDepartment.map((row) => [row.departmentName]);
    data.map((e) => departmentSheet.addRow(e));
  }

  if (uploadObject.isUploadDesignation) {
    const designationSheet = workBook.addWorksheet('Designation');
    designationSheet.addRow(['Designation']);
    formatFirstRow(designationSheet, 1);
    const data = excelData.allDesignation.map((row) => [row.designationName]);
    data.map((e) => designationSheet.addRow(e));
  }
  if (uploadObject.isUploadDivision) {
    const divisionSheet = workBook.addWorksheet('Division');
    divisionSheet.addRow(['Division']);
    formatFirstRow(divisionSheet, 1);
    const data = excelData.allDivision.map((row) => [row.divisionName]);
    data.map((e) => divisionSheet.addRow(e));
  }
  if (uploadObject.isUploadWorkingArea) {
    const workingAreaSheet = workBook.addWorksheet('WorkingArea');
    workingAreaSheet.addRow(['WorkingArea']);
    formatFirstRow(workingAreaSheet, 1);
    const data = excelData.allWorkingArea.map((row) => [row.workingAreaName]);
    data.map((e) => workingAreaSheet.addRow(e));
  }

  if (uploadObject.isUploadWorkingLocation) {
    const workingLocationSheet = workBook.addWorksheet('WorkingLocation');
    workingLocationSheet.addRow(['WorkingLocation']);
    formatFirstRow(workingLocationSheet, 1);
    const data = excelData.allWorkingLocation.map((row) => [
      row.workingLocationName,
    ]);
    data.map((e) => workingLocationSheet.addRow(e));
  }

  if (uploadObject.isUploadProject) {
    const projectSheet = workBook.addWorksheet('Projects');

    projectSheet.addRow(['Project', 'Project Code']);
    formatFirstRow(projectSheet, 1);

    const data = excelData.allProjects.map((row) => [
      row.projectName,
      row.display_id || '',
    ]);

    data.forEach((e) => projectSheet.addRow(e));
  }

  if (uploadObject.isUploadSkillCategory) {
    const skillCategorySheet = workBook.addWorksheet('SkillCategory');
    skillCategorySheet.addRow(['SkillCategory']);
    formatFirstRow(skillCategorySheet, 1);
    const data = excelData.allSkillCategory.map((row) => [row.skillCategory]);
    data.map((e) => skillCategorySheet.addRow(e));
  }

  if (uploadObject.isUploadReportsTo) {
    let count = 0;
    const companyNameArray = [];
    for (let comp of excelData.companyWiseUserData) {
      count++;
      const companyNameLength = comp.companyName.length;

      let sheetName = comp.companyName;

      if (companyNameLength > 30) {
        sheetName = `${comp.companyName.slice(0, 25)}-${count}`;
      } else {
        const duplicateCompanyName = companyNameArray.find(
          (s) =>
            typeof s === 'string' &&
            s.toLowerCase() === comp.companyName.toLowerCase(),
        );

        if (duplicateCompanyName) {
          sheetName = `${comp.companyName.slice(0, 25)}-${count}`;
        }
      }

      companyNameArray.push(comp.companyName);
      const finalSheetName = getUniqueSheetName(workBook, sheetName);
      const employeeDatasheet = workBook.addWorksheet(finalSheetName);
      // Row 1 - Merge A1 to G1 for Company Name
      employeeDatasheet.mergeCells('A1:G1');
      employeeDatasheet.getCell('A1').value =
        `Company Name - ${comp.companyName}`; // dynamic company name
      employeeDatasheet.getCell('A1').alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      employeeDatasheet.getCell('A1').font = { bold: true, size: 14 }; // Optional styling
      employeeDatasheet.addRow([
        'Company Name',
        'Branch',
        'Department',
        'Designation',
        'Employee Code',
        'Employee Name',
        'Employee Number',
      ]);
      setColorInBackground(employeeDatasheet, 1, '729fcf');
      setColorInBackground(employeeDatasheet, 2, '729fcf');
      comp.employeeData.forEach((data, index) => {
        const rowIndex = index + 3; // Start from Row 3

        employeeDatasheet.getCell(`A${rowIndex}`).value = data.company;
        employeeDatasheet.getCell(`B${rowIndex}`).value = data.branch;
        employeeDatasheet.getCell(`C${rowIndex}`).value = data.department;
        employeeDatasheet.getCell(`D${rowIndex}`).value = data.designation;
        employeeDatasheet.getCell(`E${rowIndex}`).value = data.employeeCode
          ? data.employeeCode
          : '';
        employeeDatasheet.getCell(`F${rowIndex}`).value = data.displayName;
        employeeDatasheet.getCell(`G${rowIndex}`).value = data.userNumber;

        // Apply border to all cells of current row
        employeeDatasheet.getRow(rowIndex).eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    }
  }
  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};
const generateExcelForOfficeExpenseCategory = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = ['Office Expense Category', 'Company Name', 'Status'];
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true, // Make text bold for better readability
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });
    data.map((x) => {
      workSheet.addRow([x.officeExpenseCategory, x.companyName, x.status]);

      workSheet.getColumn(1).width = 20;
      workSheet.getColumn(2).width = 20;
      workSheet.getColumn(3).width = 20;
      workSheet.getColumn(4).width = 20;
      workSheet.getColumn(5).width = 20;
    });

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateExcelForOfficeExpenseHead = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = [
      'Office Expense Head',
      'Office Expense Category',
      'Company Name',
      'Status',
    ];
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true, // Make text bold for better readability
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });
    data.map((x) => {
      workSheet.addRow([
        x.officeExpenseHead,
        x.officeExpenseCategory,
        x.companyName,
        x.status,
      ]);

      workSheet.getColumn(1).width = 20;
      workSheet.getColumn(2).width = 20;
      workSheet.getColumn(3).width = 20;
      workSheet.getColumn(4).width = 20;
      workSheet.getColumn(5).width = 20;
    });

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateDemoExcelForOfficeExpenseCategory = async (
  data,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = ['Office Expense Category', 'Company Name'];
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true, // Make text bold for better readability
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });

    workSheet.getColumn(1).width = 20;
    workSheet.getColumn(2).width = 20;
    workSheet.getColumn(3).width = 20;
    workSheet.getColumn(4).width = 20;
    workSheet.getColumn(5).width = 20;

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateDemoExcelForOfficeExpenseHead = async (
  data,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Office Expense Head');
    const expenseHeadSheet = workBook.addWorksheet('OfficeExpenseHead');
    expenseHeadSheet.addRow(['Office Expense Category']);

    workSheet.addRow(['Office Expense Category', 'Office Expense Head']);
    setColorInBackground(expenseHeadSheet, 1, '729fcf');

    const RequiredColumnStyle = [
      { index: 1, color: 'FFFF6666' },
      { index: 2, color: 'FFFF6666' },
    ];

    // Apply the styles to each specified column
    RequiredColumnStyle.forEach((column) => {
      workSheet
        .getColumn(column.index)
        .eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: column.color }, // Set the background color
          };
        });
    });

    const ExpenseCategoryData = data;
    ExpenseCategoryData.forEach((Category, index) => {
      expenseHeadSheet.getCell(`A${index + 2}`).value = Category;
    });

    // Hide the ExpenseHead worksheet to keep it clean
    expenseHeadSheet.state = 'hidden';
    for (let i = 0; i < 100; i++) {
      workSheet.addRow([null, null]);
    }

    workSheet
      .getColumn(1)
      .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber !== 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`OfficeExpenseHead!$A$2:$A$${data.length + 1}`],
          };
        }
      });

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error(error);
  }
};

const generateExcelForMarsExpenseReport = async (
  expenseRows,
  fileName,
  fileType,
  res,
  status,
) => {
  if (!expenseRows.length)
    throw new Error('No data found to generate the file!');

  const isApproved = status === expenseApprovalTypes.APPROVED;

  const workBook = new Excel.Workbook();
  const ws = workBook.addWorksheet('sheet');

  // ============================================================
  //                UTILITY: WRAP TEXT AFTER 5 WORDS
  // ============================================================
  const wrapAfterWords = (text = '', wordLimit = 5) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    const lines = [];
    for (let i = 0; i < words.length; i += wordLimit) {
      lines.push(words.slice(i, i + wordLimit).join(' '));
    }
    return lines.join('\n'); // Excel line break
  };

  // ============================================================
  //                         HEADER
  // ============================================================
  const header = [
    'Sr No',
    'Employee Code',
    'User Name',
    'State',
    'Site',
    'Voucher Number',
    'Project ID',
    'Expense Date',
    'Expense Category',
    'Expense Head',
    'Description',
    'Amount',
    'Applied Date',
  ];

  if (isApproved) {
    header.push('Approved At', 'Approved By', 'TAT');
  } else {
    header.push('Ageing Days');
  }

  header.push('Total Expense');

  ws.addRow(header);

  // ============================================================
  //                    HEADER STYLING
  // ============================================================
  const styleHeaderRow = (row, color) => {
    row.height = 22;
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color },
      };
    });
  };

  styleHeaderRow(ws.getRow(1), 'DAEEF3');

  // ============================================================
  //                     ADD DATA ROWS
  // ============================================================
  const DESCRIPTION_COL = 11;

  for (const row of expenseRows) {
    if (row[DESCRIPTION_COL - 1]) {
      row[DESCRIPTION_COL - 1] = wrapAfterWords(row[DESCRIPTION_COL - 1], 5);
    }
    ws.addRow(row);
  }

  // ============================================================
  //           MERGE COMMON FIELDS BASED ON SR NO
  // ============================================================
  const srCounts = {};
  for (const r of expenseRows) srCounts[r[0]] = (srCounts[r[0]] || 0) + 1;

  const commonCols = isApproved
    ? [1, 2, 3, 4, 5, 6, 7, 8, 16, 17]
    : [1, 2, 3, 4, 5, 6, 7, 8, 14, 15];

  let startRow = 2;

  Object.keys(srCounts).forEach((sr) => {
    const count = srCounts[sr];
    const endRow = startRow + count - 1;

    if (count > 1) {
      for (const col of commonCols) {
        ws.mergeCells(startRow, col, endRow, col);
      }
    }

    startRow = endRow + 1;
  });

  // ============================================================
  //              STYLING + NUMBER FORMAT (SINGLE PASS)
  // ============================================================
  const AMOUNT_COL = 12;
  const TOTAL_EXPENSE_COL = isApproved ? 17 : 15;

  ws.eachRow((row, rowNum) => {
    if (rowNum < 2) return;

    row.eachCell((cell, colNumber) => {
      // Common styling
      cell.alignment = {
        horizontal: 'left',
        vertical: 'middle',
        wrapText: true,
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Amount + Total Expense formatting
      if (
        (colNumber === AMOUNT_COL || colNumber === TOTAL_EXPENSE_COL) &&
        typeof cell.value === 'number'
      ) {
        cell.numFmt = '#,##,##0';
        cell.alignment = {
          horizontal: 'right',
          vertical: 'middle',
        };
      }
    });
  });

  ws.columns.forEach((col, colIndex) => {
    let maxLength = 12;

    col.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.value) return;

      const text = cell.value.toString();

      // 🔹 If description column → check each wrapped line
      if (colIndex + 1 === DESCRIPTION_COL && text.includes('\n')) {
        const lines = text.split('\n');
        lines.forEach((line) => {
          maxLength = Math.max(maxLength, line.length);
        });
      } else {
        maxLength = Math.max(maxLength, text.length);
      }
    });

    // 🔹 Limit description width so it doesn't become too wide
    if (colIndex + 1 === DESCRIPTION_COL) {
      col.width = Math.min(maxLength + 2, 40); // cap at 40
    } else {
      col.width = maxLength + 2;
    }
  });

  // ============================================================
  //                   SEND FILE TO CLIENT
  // ============================================================
  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForMyExpense = async (
  expenseData,
  fileName,
  fileType,
  res,
) => {
  if (!expenseData.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const worksheet = workBook.addWorksheet('sheet');

    // =========================================================
    // HEADER
    // =========================================================

    const header2 = [
      'Sr No',
      'Expense Type',
      'Expense Date',
      'Voucher Number',
      'Applied Date',
      'Expense Transactions',
      'Customer Company Name',
      'Customer Name',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    const header3 = [
      '',
      '',
      '',
      '',
      '',
      'Expense Pupose',
      '',
      '',
      'Expense Category',
      'Expense Head',
      'Amount',
      'Description',
      'Expense Auth Status',
      'Auth Data',
      'Attachment-1',
      'Attachment-2',
      'Attachment-3',
      'Attachment-4',
    ];

    worksheet.addRow(header2);
    worksheet.addRow(header3);

    await styleRow(worksheet, 1);
    await styleRow(worksheet, 2);

    // Merge Attachment header
    worksheet.mergeCells(1, 9, 1, 18);

    // Merge first 8 headers
    for (let i = 1; i <= 8; i++) {
      worksheet.mergeCells(1, i, 2, i);
    }

    // =========================================================
    // HEADER STYLE
    // =========================================================

    const row1 = worksheet.getRow(1);

    row1.height = 20;

    row1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'ebf1de',
        },
      };
    });

    worksheet.getRow(2).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'daeef3',
        },
      };
    });

    const data2 = expenseData.map((row) => {
      return row.map((value) => {
        // Don't write attachment object into Excel cell.
        if (
          value &&
          typeof value === 'object' &&
          value.original !== undefined &&
          value.thumbnail !== undefined
        ) {
          return '';
        }

        return value;
      });
    });

    // =========================================================
    // ADD DATA ROWS
    // =========================================================

    data2.forEach((row) => {
      worksheet.addRow(row);
    });

    // =========================================================
    // FRONTEND URL
    // =========================================================

    const frontendUrl = (appURL || '').replace(/\/$/, '');

    if (!frontendUrl) {
      throw new Error('HRMS_FRONTEND_URL is not configured');
    }

    // =========================================================
    // ATTACHMENT THUMBNAILS
    // =========================================================

    const attachmentStartIndex = 14;
    const attachmentEndIndex = 17;

    for (let i = 0; i < expenseData.length; i++) {
      const rowIndex = i + 3;
      const row = worksheet.getRow(rowIndex);

      // Thumbnail requires more row height
      row.height = 90;
      for (
        let attachmentIndex = attachmentStartIndex;
        attachmentIndex <= attachmentEndIndex;
        attachmentIndex++
      ) {
        const attachment = expenseData[i][attachmentIndex];

        // =====================================================
        // VALIDATE ATTACHMENT
        // =====================================================

        if (
          !attachment ||
          typeof attachment !== 'object' ||
          !attachment.original
        ) {
          continue;
        }

        try {
          // ===================================================
          // FILE PATH
          // ===================================================

          const originalFilePath = attachment.original;

          const isS3Upload = Boolean(attachment.s3UploadattachFile);

          // ===================================================
          // FRONTEND FILE VIEWER TOKEN
          // ===================================================

          /*
            IMPORTANT:

            Same isS3Upload flag is passed here.

            true  -> token handles S3 key
            false -> token handles local uploads/... path
          */

          const jwtSignedUrl = await getJwtTokenNoExpiryData({
            filePath: originalFilePath,
            isS3Upload,
          });

          const fileViewerUrl = `${fileViewerAppURL}${jwtSignedUrl}`;

          const columnNumber = attachmentIndex + 1;

          const cell = row.getCell(columnNumber);

          // ===================================================
          // CELL ALIGNMENT
          // ===================================================

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };

          // ===================================================
          // GET THUMBNAIL
          // ===================================================

          let thumbnailBase64 = null;

          if (attachment.thumbnail) {
            if (isS3Upload) {
              // =================================================
              // S3 THUMBNAIL
              // =================================================

              thumbnailBase64 = await getS3File(
                bucketName,
                attachment.thumbnail,
                'base64',
              );
            } else {
              // =================================================
              // LOCAL THUMBNAIL
              // =================================================

              /*
                DB contains:

                uploads/68/expenseAttachment/092026/xxx_thumb.jpg

                So don't prepend "uploads" again.
              */

              const thumbnailPath = path.join(
                process.cwd(),
                attachment.thumbnail,
              );

              if (fs.existsSync(thumbnailPath)) {
                thumbnailBase64 = fs
                  .readFileSync(thumbnailPath)
                  .toString('base64');
              } else {
                console.warn(`Local thumbnail not found: ${thumbnailPath}`);
              }
            }
          }

          // ===================================================
          // THUMBNAIL EXISTS
          // ===================================================

          if (thumbnailBase64) {
            const imageId = workBook.addImage({
              base64: thumbnailBase64,
              extension: 'png',
            });

            // =================================================
            // ADD CLICKABLE THUMBNAIL
            // =================================================

            worksheet.addImage(imageId, {
              tl: {
                col: columnNumber - 1 + 0.1,
                row: rowIndex - 1 + 0.05,
              },

              ext: {
                width: 80,
                height: 75,
              },

              hyperlinks: {
                hyperlink: fileViewerUrl,
                tooltip: 'Click to open original file',
              },
            });

            // Keep cell empty.
            cell.value = null;
          }

          // ===================================================
          // THUMBNAIL NOT AVAILABLE
          // ===================================================
          else {
            cell.value = {
              text: 'View',
              hyperlink: fileViewerUrl,
            };

            cell.font = {
              color: {
                argb: 'FF0000FF',
              },
              underline: true,
            };

            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center',
            };
          }
        } catch (error) {
          console.error(
            `Failed to process attachment. Row: ${rowIndex}, Attachment: ${
              attachmentIndex - attachmentStartIndex + 1
            }`,
            error.message,
          );
        }
      }
    }

    // =========================================================
    // MERGE SAME SR NO
    // =========================================================

    const counts = {};

    for (let j = 0; j < data2.length; j++) {
      const srNo = data2[j][0];

      if (counts[srNo]) {
        counts[srNo]++;
      } else {
        counts[srNo] = 1;
      }
    }

    for (let i = 0; i < data2.length; i++) {
      for (let j = 0; j < 5; j++) {
        worksheet.mergeCells(
          i + 3,
          j + 1,
          i + 3 + counts[data2[i][0]] - 1,
          j + 1,
        );
      }

      i += counts[data2[i][0]] - 1;
    }

    // =========================================================
    // DATE FORMAT
    // =========================================================

    worksheet.getColumn(5).numFmt = 'dd-mm-yyyy hh:mm:ss';

    // =========================================================
    // BORDER + ALIGNMENT
    // =========================================================

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };

        alignment2(worksheet, rowNumber);

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
        };
      });
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    res.attachment(`${fileName}.${fileType}`);

    res.set({
      'Access-Control-Expose-Headers': '*',
    });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error('generateExcelForMyExpense error:', error);

    throw new Error(error.message);
  }
};

const generateExcelForOfficeExpense = async (
  officeExpenseData,
  fileName,
  fileType,
  res,
) => {
  if (!officeExpenseData.length)
    throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const header2 = [
    'Sr No',
    'Branch Name',
    'Site Name',
    'Expense Date',
    'Voucher Number',
    'Applied Date',
    'Expense Transactions',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const header3 = [
    '',
    '',
    '',
    '',
    '',
    '',
    'Expense Category',
    'Expense Head',
    'Amount',
    'Description',
    'Expense Auth Status',
    'Auth Data',
    'Attachment-1',
    'Attachment-2',
    'Attachment-3',
    'Attachment-4',
  ];

  worksheet.addRow(header2);
  worksheet.addRow(header3);

  await styleRow(worksheet, 1);
  await styleRow(worksheet, 2);

  worksheet.mergeCells(1, 7, 1, 16);

  for (let i = 1; i <= 6; i++) {
    worksheet.mergeCells(1, i, 2, i);
  }

  const row2 = worksheet.getRow(1);
  row2.height = 20;
  row2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  const data2 = officeExpenseData.map((row) => Object.values(row));

  data2.map((e) => worksheet.addRow(e));

  // Add hyperlink to attachment columns
  const attachmentStartIndex = 12;
  const attachmentEndIndex = 15;

  for (let i = 0; i < officeExpenseData.length; i++) {
    const rowIndex = i + 3;
    const row = worksheet.getRow(rowIndex);

    for (let j = attachmentStartIndex; j <= attachmentEndIndex; j++) {
      const link = officeExpenseData[i][Object.keys(officeExpenseData[i])[j]];
      if (link && typeof link === 'string' && link.startsWith('http')) {
        const cell = row.getCell(j + 1);
        cell.value = {
          text: 'View',
          hyperlink: link,
        };
        cell.font = { color: { argb: 'FF0000FF' }, underline: true };
      }
    }
  }

  let counts = {};

  for (let j = 0; j < data2.length; j++) {
    let srNo = data2[j][0];
    if (counts[srNo]) {
      counts[srNo]++;
    } else {
      counts[srNo] = 1;
    }
  }

  for (let i = 0; i < data2.length; i++) {
    for (let j = 0; j < 6; j++) {
      worksheet.mergeCells(
        i + 3,
        j + 1,
        i + 3 + counts[data2[i][0]] - 1,
        j + 1,
      );
    }
    i += counts[data2[i][0]] - 1;
  }
  // let indexofIndex1 = 0
  // for (let j = 3; j <= data2.length; j = j + index1[indexofIndex1]) {
  //   for (let i = 1; i <= 8; i++) {
  //     worksheet.mergeCells(j, i, j + 2, i);
  //   }
  // }
  worksheet.getColumn(4).numFmt = 'dd-mm-yyyy hh:mm:ss'; // Adjust format as per your preference
  worksheet.getColumn(6).numFmt = 'dd-mm-yyyy hh:mm:ss'; // Adjust format as per your preference

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateDemoExcelForExpensePayment = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Advance Data');
  const workSheet1 = workBook.addWorksheet('Basic Instructions');
  workSheet1.addRow(['Date Format must be in yyyy-mm-dd format.']);
  workSheet1.addRow([
    'Reference Date is required ,if you are selecting payment mode Cheque,UPI or NetBanking.',
  ]);
  if (showPayWithSalary) {
    workSheet1.addRow([
      'Pay With Salary Month is required, if you are selecting payment mode PayWithSalary.',
    ]);

    workSheet1.addRow(['Pay With Salary Month must be in YYYY-MM format.']);
  }
  setColorInBackground(workSheet1, 1, 'FF0000'); // light red
  setColorInBackground(workSheet1, 2, 'FF0000');
  setColorInBackground(workSheet1, 3, 'FF0000'); // light red
  setColorInBackground(workSheet1, 4, 'FF0000');

  const keysArray = Object.keys(data[0]);
  workSheet.addRow(keysArray);
  setColorInBackground(workSheet, 1, '729fcf'); // blue
  await styleRow(workSheet, 1);

  const data2 = data.map((row) => Object.values(row));

  data2.map((e) => workSheet.addRow(e));

  // set payment mode in dropdown
  const paymentModeColumn = workSheet.getColumn(
    ProjectName == projectNamesList.MARS ? 10 : 14,
  );
  const paymentModeValues = paymentOptionsForExensePayment;
  paymentModeColumn.eachCell((cell, rowNumber) => {
    if (rowNumber !== 1) {
      // Skip the header row
      const dataValidation = {
        type: 'list',
        formulae: [`"${paymentModeValues.join(',')}"`],
        allowNulls: true,
      };
      cell.dataValidation = dataValidation;
    }
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateExcelForCompanySubscriptionData = async (
  expenseData,
  fileName,
  fileType,
  res,
  status,
) => {
  if (!expenseData.length)
    throw new Error('No data found to generate the file!');
  const workBook = new Excel.Workbook();

  const worksheet = workBook.addWorksheet('sheet');

  const header2 = [
    'Sr No',
    'Subscription Type',
    'Product Name',
    'Plan Start Date',
    'Plan End Date',
    'Total Users',
    'Total Tracking Users',
    'Created By',
    'Created At',
    'Add-Ons',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const header3 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Add-On Users',
    'Add-On Tracking Users',
    'Add-On Biometric Cost',
    'Add-On Software Cost',
    'Add-On Customization Cost',
    'Add-On Customization Desacription',
    'Total Excluding GST',
    'GST Amount',
    'Total Including GST',
    'Add-On Created By',
    'Add-On Created At',
  ];

  worksheet.addRow(header2);
  worksheet.addRow(header3);

  await styleRow(worksheet, 1);
  await styleRow(worksheet, 2);

  worksheet.mergeCells(1, 10, 1, 20);

  for (let i = 1; i <= 9; i++) {
    worksheet.mergeCells(1, i, 2, i);
  }

  const row2 = worksheet.getRow(1);
  row2.height = 20;
  row2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ebf1de' }, // Red color
    };
  });

  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'daeef3' }, // Red color
    };
  });

  const data2 = expenseData.map((row) => Object.values(row));

  data2.map((e) => worksheet.addRow(e));

  let counts = {};

  for (let j = 0; j < data2.length; j++) {
    let srNo = data2[j][0];
    if (counts[srNo]) {
      counts[srNo]++;
    } else {
      counts[srNo] = 1;
    }
  }

  for (let i = 0; i < data2.length; i++) {
    for (let j = 0; j < 9; j++) {
      worksheet.mergeCells(
        i + 3,
        j + 1,
        i + 3 + counts[data2[i][0]] - 1,
        j + 1,
      );
    }
    i += counts[data2[i][0]] - 1;
  }
  // let indexofIndex1 = 0
  // for (let j = 3; j <= data2.length; j = j + index1[indexofIndex1]) {
  //   for (let i = 1; i <= 8; i++) {
  //     worksheet.mergeCells(j, i, j + 2, i);
  //   }
  // }
  // worksheet.getColumn(8).numFmt = 'dd-mm-yyyy hh:mm:ss'; // Adjust format as per your preference

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      worksheet.getRow(row).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      alignment2(worksheet, rowNumber);

      // if (cell.value !== null && cell.value !== '') {
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      };
      // }
    });
  });

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

async function createZipFileForUserDocuments(finalArray, res) {
  const user = finalArray?.[0]?.userMaster;
  const isSingleUser = finalArray.every(
    (item) => item?.userMasterID === finalArray[0]?.userMasterID,
  );
  let ZipFileName;
  if (isSingleUser && user) {
    const empName = (user.displayName || 'employee')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    ZipFileName = `${empName}_documents_${Date.now()}`;
  } else {
    const docName = (finalArray[0]?.documentList?.documentName || 'documents')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    ZipFileName = `${docName}_documents_${Date.now()}`;
  }

  const zip = new JSZip();

  for (let i = 0; i < finalArray.length; i++) {
    if (finalArray[i]?.document == null || !finalArray[i]?.document) {
      finalArray[i].document = '';
    }
    const filePath = path.join(
      __dirname,
      '../uploads/user/document',
      finalArray[i]?.document,
    );
    let extension = filePath?.split('.').pop();
    if (extension == 'bin') {
      extension = 'jpeg';
    }

    const empName = (
      finalArray[i]?.userMaster?.displayName ||
      user?.displayName ||
      'employee'
    )
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const docType = (finalArray[i]?.documentList?.documentName || 'document')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = finalArray[i]?.createdAt
      ? new Date(finalArray[i].createdAt).getTime()
      : Date.now();

    try {
      const imageBytes = await readFileAsync(filePath);
      const fileName = `${empName}_${docType}_${timestamp}.${extension}`;

      zip.file(fileName, imageBytes);
    } catch (err) {}

    if (finalArray[i].isMultiPageAadharCard) {
      if (finalArray[i]?.document1 == null || !finalArray[i]?.document1) {
        finalArray[i].document1 = '';
      }
      const filePath2 = path.join(
        __dirname,
        '../uploads/user/document',
        finalArray[i]?.document1,
      );
      let extension2 = filePath2?.split('.').pop();
      if (extension2 == 'bin') {
        extension2 = 'jpeg';
      }
      try {
        const imageBytes2 = await readFileAsync(filePath2);
        const fileName2 = `${empName}_${docType}_back_${timestamp}.${extension2}`;

        zip.file(fileName2, imageBytes2);
      } catch (err) {}
    }
  }

  const zipbuffer = await zip.generateAsync({ type: 'nodebuffer' });
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename=${encodeURIComponent(ZipFileName)}.zip`,
    'X-File-Name': `${ZipFileName}.zip`,
    'Access-Control-Expose-Headers': 'Content-Disposition',
  });
  res.end(zipbuffer);
}

const generateExcelForEmployeeExpenseReimbursement = async (
  expenseData,
  fileName,
  fileType,
  res,
) => {
  if (!expenseData.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const worksheet = workBook.addWorksheet('Employee Expense Reimbursement');

    // =========================================================
    // HEADER
    // =========================================================

    const header2 = [
      'Sr No',
      'Employee Code',
      'Employee Name',
      'Branch',
      'Department',
      'Designation',
      'Expense Type',
      'Expense Date',
      'Voucher Number',
      'Applied Date',
      'Expense Transactions',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const header3 = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Expense Purpose',
      'Expense Category',
      'Expense Head',
      'Amount',
      'Description',
      'Expense Auth Status',
      'Final Authorized By',
      'Final Auth Remarks',
      'Auth Data',
      'Attachment-1',
      'Attachment-2',
      'Attachment-3',
      'Attachment-4',
    ];

    worksheet.addRow(header2);
    worksheet.addRow(header3);

    // =========================================================
    // MERGE HEADER
    // =========================================================

    // Expense Transactions
    worksheet.mergeCells(1, 11, 1, 23);

    // First 10 columns
    for (let i = 1; i <= 10; i++) {
      worksheet.mergeCells(1, i, 2, i);
    }

    // =========================================================
    // HEADER STYLE
    // =========================================================

    const row1 = worksheet.getRow(1);
    row1.height = 20;

    row1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'ebf1de',
        },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.font = {
        bold: true,
      };
    });

    const row2 = worksheet.getRow(2);
    row2.height = 20;

    row2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'daeef3',
        },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.font = {
        bold: true,
      };
    });

    // =========================================================
    // DATA
    // =========================================================

    /*
      expenseData structure:

      [
        Sr No,
        Employee Code,
        Employee Name,
        Branch,
        Department,
        Designation,
        Expense Type,
        Expense Date,
        Voucher Number,
        Applied Date,
        Expense Purpose,
        Expense Category,
        Expense Head,
        Amount,
        Description,
        Expense Auth Status,
        Final Authorized By,
        Final Auth Remarks,
        Auth Data,
        Attachment-1,
        Attachment-2,
        Attachment-3,
        Attachment-4
      ]
    */

    const data2 = expenseData.map((row) => {
      return row.map((value) => {
        // Do not write attachment object into Excel cell.
        if (
          value &&
          typeof value === 'object' &&
          value.original !== undefined &&
          value.thumbnail !== undefined
        ) {
          return '';
        }

        // Auth Data array -> readable Excel text
        if (Array.isArray(value)) {
          return value.join('\n');
        }

        return value;
      });
    });

    // =========================================================
    // ADD DATA ROWS
    // =========================================================

    data2.forEach((row) => {
      worksheet.addRow(row);
    });

    // =========================================================
    // FRONTEND URL
    // =========================================================

    const frontendUrl = (appURL || '').replace(/\/$/, '');

    if (!frontendUrl) {
      throw new Error('HRMS_FRONTEND_URL is not configured');
    }

    // =========================================================
    // ATTACHMENT THUMBNAILS
    // =========================================================

    // 0-based indexes in expenseData
    const attachmentStartIndex = 19;
    const attachmentEndIndex = 22;

    for (let i = 0; i < expenseData.length; i++) {
      const rowIndex = i + 3;
      const row = worksheet.getRow(rowIndex);

      // Thumbnail requires more row height
      row.height = 90;

      for (
        let attachmentIndex = attachmentStartIndex;
        attachmentIndex <= attachmentEndIndex;
        attachmentIndex++
      ) {
        const attachment = expenseData[i][attachmentIndex];

        // =====================================================
        // VALIDATE ATTACHMENT
        // =====================================================

        if (
          !attachment ||
          typeof attachment !== 'object' ||
          !attachment.original
        ) {
          continue;
        }

        try {
          // ===================================================
          // ORIGINAL FILE
          // ===================================================

          const originalFilePath = attachment.original;

          const isS3Upload = Boolean(attachment.s3UploadattachFile);

          // ===================================================
          // FRONTEND FILE VIEWER TOKEN
          // ===================================================

          const jwtSignedUrl = await getJwtTokenNoExpiryData({
            filePath: originalFilePath,
            isS3Upload,
          });

          const fileViewerUrl = `${fileViewerAppURL}${jwtSignedUrl}`;

          // Excel column number
          const columnNumber = attachmentIndex + 1;

          const cell = row.getCell(columnNumber);

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };

          // ===================================================
          // GET THUMBNAIL
          // ===================================================

          let thumbnailBase64 = null;

          if (attachment.thumbnail) {
            if (isS3Upload) {
              // ===============================================
              // S3 THUMBNAIL
              // ===============================================

              thumbnailBase64 = await getS3File(
                bucketName,
                attachment.thumbnail,
                'base64',
              );
            } else {
              // ===============================================
              // LOCAL THUMBNAIL
              // ===============================================

              const thumbnailPath = path.join(
                process.cwd(),
                attachment.thumbnail,
              );

              if (fs.existsSync(thumbnailPath)) {
                thumbnailBase64 = fs
                  .readFileSync(thumbnailPath)
                  .toString('base64');
              } else {
                console.warn(`Local thumbnail not found: ${thumbnailPath}`);
              }
            }
          }

          // ===================================================
          // THUMBNAIL EXISTS
          // ===================================================

          if (thumbnailBase64) {
            const imageId = workBook.addImage({
              base64: thumbnailBase64,
              extension: 'png',
            });

            // ===============================================
            // CLICKABLE THUMBNAIL
            // ===============================================

            worksheet.addImage(imageId, {
              tl: {
                col: columnNumber - 1 + 0.1,
                row: rowIndex - 1 + 0.05,
              },

              ext: {
                width: 80,
                height: 75,
              },

              hyperlinks: {
                hyperlink: fileViewerUrl,
                tooltip: 'Click to open original file',
              },
            });

            // Keep cell empty
            cell.value = null;
          }

          // ===================================================
          // THUMBNAIL NOT AVAILABLE
          // ===================================================
          else {
            cell.value = {
              text: 'View',
              hyperlink: fileViewerUrl,
            };

            cell.font = {
              color: {
                argb: 'FF0000FF',
              },
              underline: true,
            };

            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center',
            };
          }
        } catch (error) {
          console.error(
            `Failed to process attachment. Row: ${rowIndex}, Attachment: ${
              attachmentIndex - attachmentStartIndex + 1
            }`,
            error.message,
          );
        }
      }
    }

    // =========================================================
    // MERGE SAME SR NO
    // =========================================================

    const counts = {};

    for (let j = 0; j < data2.length; j++) {
      const srNo = data2[j][0];

      if (counts[srNo]) {
        counts[srNo]++;
      } else {
        counts[srNo] = 1;
      }
    }

    for (let i = 0; i < data2.length; i++) {
      for (let j = 0; j < 10; j++) {
        worksheet.mergeCells(
          i + 3,
          j + 1,
          i + 3 + counts[data2[i][0]] - 1,
          j + 1,
        );
      }

      i += counts[data2[i][0]] - 1;
    }

    // =========================================================
    // DATE FORMAT
    // =========================================================

    worksheet.getColumn(8).numFmt = 'dd-mm-yyyy';

    worksheet.getColumn(10).numFmt = 'dd-mm-yyyy';

    // =========================================================
    // BORDER + ALIGNMENT
    // =========================================================

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };

        if (typeof alignment2 === 'function') {
          alignment2(worksheet, rowNumber);
        }

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
        };
      });
    });

    // =========================================================
    // COLUMN WIDTHS
    // =========================================================

    const columnWidths = [
      8, // 1  Sr No
      15, // 2  Employee Code
      25, // 3  Employee Name
      20, // 4  Branch
      20, // 5  Department
      20, // 6  Designation
      20, // 7  Expense Type
      15, // 8  Expense Date
      20, // 9  Voucher Number
      18, // 10 Applied Date
      20, // 11 Expense Transactions
      20, // 12 Expense Purpose
      20, // 13 Expense Category
      20, // 14 Expense Head
      15, // 15 Amount
      25, // 16 Description
      20, // 17 Expense Auth Status
      20, // 18 Final Authorized By
      20, // 19 Final Authorized At
      25, // 20 Final Auth Remarks
      30, // 21 Auth Data
      15, // 22 Attachment-1
      15, // 23 Attachment-2
      15, // 24 Attachment-3
      15, // 25 Attachment-4
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    res.attachment(`${fileName}.${fileType}`);

    res.set({
      'Access-Control-Expose-Headers': '*',
    });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    console.error('generateExcelForEmployeeExpenseReimbursement error:', error);
    throw new Error(error.message);
  }
};

const generateExcelForAssignCustomersToEmployee = async (
  data,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = ['Employee Name', data[0]?.userMaster?.displayName];
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });

    workSheet.addRow([]);
    const customerHeaderRow = workSheet.addRow([
      'Customer Name',
      'Company Name',
      'Email',
      'Mobile',
      'Website',
      'Customer Industry',
      'Current Location',
      'Lattitude',
      'Longitude',
      'Address',
      'Zipcode',
      'City',
      'State',
      'Country',
      'Assigned By',
    ]);
    customerHeaderRow.eachCell((cell) => {
      cell.font = {
        bold: true,
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });
    data?.map((c) => {
      workSheet.addRow([
        c?.customer?.customerName,
        c?.customer?.companyName,
        c?.customer?.email,
        c?.customer?.mobileNumber1,
        c?.customer?.website,
        c?.customer?.ci?.name,
        c?.customer?.currentLocation,
        c?.customer?.latitude,
        c?.customer?.longitude,
        c?.customer?.address,
        c?.customer?.zipcode,
        c?.customer?.cityMaster?.cityName,
        c?.customer?.cityMaster?.stateMaster?.stateName,
        c?.customer?.cityMaster?.stateMaster?.countryMaster?.countryName,
        c?.createdBy?.displayName,
      ]);
    });

    workSheet.getColumn(1).width = 20;
    workSheet.getColumn(2).width = 20;
    workSheet.getColumn(3).width = 20;
    workSheet.getColumn(4).width = 20;
    workSheet.getColumn(5).width = 20;

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

async function createZipFileForFormF(formFPdfList, fileName, res) {
  try {
    const zip = new JSZip();

    for (let i = 0; i < formFPdfList.length; i++) {
      const filePath = formFPdfList[i].path;
      const employeeName = formFPdfList[i].displayName;

      if (fs.existsSync(filePath)) {
        const pdfBuffer = fs.readFileSync(filePath);
        zip.file(`${employeeName}.pdf`, pdfBuffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}.zip"`,
    });

    res.end(zipBuffer);

    for (let i = 0; i < formFPdfList.length; i++) {
      const filePath = formFPdfList[i].path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error creating Form F ZIP:', error);
    res.status(500).json({ message: 'Error generating ZIP file', error });
  }
}

const generateDemoExcelForExpensePurpose = async (
  data,
  fileName,
  fileType,
  res,
) => {
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');
    const headerNames = [' Expense Purpose'];
    const headerRows = workSheet.addRow(headerNames);
    headerRows.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      cell.font = {
        bold: true, // Make text bold for better readability
      };

      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center align text
    });

    workSheet.getColumn(1).width = 20;
    workSheet.getColumn(2).width = 20;
    workSheet.getColumn(3).width = 20;
    workSheet.getColumn(4).width = 20;
    workSheet.getColumn(5).width = 20;

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateExcelDailyAttendanceCountShiftDepartmentwise = async (
  data,
  shifts,
  filename,
  fileExtension,
  res,
) => {
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet('Department Shift Count');

  // Header Row
  const headerRow = ['Department Name', ...shifts];
  const header = workSheet.addRow(headerRow);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Data Rows
  data.forEach((item) => {
    const row = [
      item['Department Name'],
      ...shifts.map((shift) => item[shift]),
    ];
    const rowCells = workSheet.addRow(row);

    rowCells.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.font = { bold: true };
      } else {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Adjust column widths
  workSheet.columns.forEach((column) => {
    column.width = column.values.reduce(
      (max, v) => Math.max(max, v ? v.toString().length : 10),
      10,
    );
  });

  // Set headers for response
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.${fileExtension}`,
  );

  await workBook.xlsx.write(res);
  res.end();
};

const createZipAndCleanup = async (pdfList, fileName, res) => {
  try {
    const zip = new JSZip();

    for (let i = 0; i < pdfList.length; i++) {
      const filePath = pdfList[i].path;
      const displayName = pdfList[i].displayName || `File_${i + 1}`;

      if (fs.existsSync(filePath)) {
        const pdfBuffer = fs.readFileSync(filePath);
        zip.file(`${displayName}.pdf`, pdfBuffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}.zip"`,
    });

    res.end(zipBuffer);

    // 🔥 Delete PDFs after sending
    for (let i = 0; i < pdfList.length; i++) {
      const filePath = pdfList[i].path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('Error creating ZIP:', error);
    res.status(500).json({ message: 'Error generating ZIP file', error });
  }
};

function flattenEmployeeObject(emp) {
  const row = {};

  Object.keys(emp).forEach((key) => {
    const value = emp[key];

    // ✅ Case 1: Normal field → add directly (order preserved)
    if (!Array.isArray(value)) {
      row[key] = value;
      return;
    }

    // ✅ Case 2: Array field → expand it RIGHT HERE (order preserved)
    value.forEach((item) => {
      if (item?.payheadName && item?.EmployeeSalaryAmount !== undefined) {
        row[item.payheadName] = item.EmployeeSalaryAmount;
      }
    });
  });

  return row;
}

const generatePNGNationalSalaryRegister = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('National Salary Register');

  /* =========================================================
 BASIC LENGTHS
========================================================= */
  const basicDetailsLength = 18;
  const attnCalDataLength = data[0].attnCalData?.length || 0;
  const taxableDataLength = data[0].taxableData?.length || 0;
  const incentiveDataLength = data[0].incentiveData?.length || 0;
  const calculatedDataLength = data[0].calculatedData?.length || 0;
  const nonTaxableLength = data[0].nonTaxableData?.length || 0;
  const ncslLength = data[0].ncslData?.length || 0;

  /* =========================================================
 STEP 1: FLATTEN DATA
========================================================= */
  const excelRows = data.map(flattenEmployeeObject);

  /* =========================================================
 STEP 2: CREATE COLUMNS
========================================================= */
  const columns = Object.keys(excelRows[0]).map((key) => ({
    header: key,
    key: key,
    width: key.length + 5,
  }));

  worksheet.columns = columns;

  /* =========================================================
 STEP 3: DEFINE GROUP HEADERS
========================================================= */
  const groups = [];

  if (attnCalDataLength) {
    groups.push({
      start: basicDetailsLength + 1,
      end: basicDetailsLength + attnCalDataLength - 1,
      title: 'Actual Total Hours',
    });
  }

  if (calculatedDataLength) {
    groups.push({
      start:
        basicDetailsLength +
        attnCalDataLength +
        incentiveDataLength +
        taxableDataLength +
        2,
      end:
        basicDetailsLength +
        attnCalDataLength +
        incentiveDataLength +
        taxableDataLength +
        calculatedDataLength +
        1,
      title: 'Calculated',
    });
  }

  if (ncslLength) {
    groups.push({
      start:
        basicDetailsLength +
        attnCalDataLength +
        incentiveDataLength +
        taxableDataLength +
        calculatedDataLength +
        nonTaxableLength +
        5,
      end:
        basicDetailsLength +
        attnCalDataLength +
        incentiveDataLength +
        taxableDataLength +
        calculatedDataLength +
        nonTaxableLength +
        ncslLength +
        4,
      title: 'NCSL Detail Savings',
    });
  }

  /* =========================================================
 STEP 4: ADD GROUP TITLES TO ROW 1
========================================================= */
  groups.forEach((group) => {
    worksheet.mergeCells(1, group.start, 1, group.end);

    const cell = worksheet.getCell(1, group.start);
    cell.value = group.title;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { bold: true, size: 12 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  /* =========================================================
 STEP 5: SET ALL COLUMN HEADERS IN ROW 2
========================================================= */
  worksheet.getRow(2).values = columns.map((col) => col.header);

  /* =========================================================
 STEP 6: MERGE ROW 1 & 2 ONLY FOR NON-GROUP COLUMNS
========================================================= */
  const groupedColumns = new Set();

  groups.forEach((g) => {
    for (let i = g.start; i <= g.end; i++) {
      groupedColumns.add(i);
    }
  });

  for (let col = 1; col <= columns.length; col++) {
    if (!groupedColumns.has(col)) {
      worksheet.mergeCells(1, col, 2, col);
    }
  }

  /* =========================================================
 STEP 7: STYLE ONLY ROW 2 (REAL HEADERS)
========================================================= */
  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };

    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    cell.alignment = { vertical: 'middle', horizontal: 'center' };

    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 4, // ✅ Freeze first 4 columns
      ySplit: 2, // ✅ Freeze first 2 rows
    },
  ];

  /* =========================================================
 ADD DATA FROM ROW 3
========================================================= */
  worksheet.addRows(excelRows);

  /* =========================================================
 STEP 9: SEND FILE
========================================================= */
  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workbook.csv.write(res)
    : workbook.xlsx.write(res);
};

const generatePNGExpatSalaryRegister = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly Salary Register');

  /* =========================================================
 BASIC LENGTHS
========================================================= */
  const basicDetailsLength = 22;
  const attnCalDataLength = data[0].attnCalData?.length || 0;
  const taxableActualLength = data[0].taxableActualData?.length || 0;
  const nonTaxableActualLength = data[0].nonTaxableActualData?.length || 0;

  const taxableDataLength = data[0].taxableData?.length || 0;
  const incentiveDataLength = data[0].incentiveData?.length || 0;
  const nonTaxableLength = data[0].nonTaxableData?.length || 0;

  /* =========================================================
 STEP 1: FLATTEN DATA
========================================================= */
  const excelRows = data.map(flattenEmployeeObject);

  /* =========================================================
 STEP 2: CREATE COLUMNS
========================================================= */
  const columns = Object.keys(excelRows[0]).map((key) => ({
    header: key,
    key: key,
    width: key.length + 5,
  }));

  worksheet.columns = columns;

  /* =========================================================
 STEP 3: DEFINE GROUP HEADERS
========================================================= */
  const groups = [];

  if (taxableActualLength) {
    groups.push({
      start: basicDetailsLength + attnCalDataLength + 1,
      end: basicDetailsLength + attnCalDataLength + taxableActualLength,
      title: 'Contractual Amount',
    });
  }

  if (nonTaxableActualLength) {
    groups.push({
      start: basicDetailsLength + attnCalDataLength + taxableActualLength + 2,
      end:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        1,
      title: 'Contractual Amount',
    });
  }

  if (taxableDataLength) {
    groups.push({
      start:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        2,
      end:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        taxableDataLength +
        1,
      title: 'Employee Earnings',
    });
  }

  if (incentiveDataLength) {
    groups.push({
      start:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        taxableDataLength +
        2,
      end:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        taxableDataLength +
        incentiveDataLength +
        1,
      title: 'Variable Earnings',
    });
  }

  if (nonTaxableLength) {
    groups.push({
      start:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        taxableDataLength +
        incentiveDataLength +
        3,
      end:
        basicDetailsLength +
        attnCalDataLength +
        taxableActualLength +
        nonTaxableActualLength +
        taxableDataLength +
        incentiveDataLength +
        nonTaxableLength +
        2,
      title: 'Non Taxable Allowances',
    });
  }

  const colorCodes = {
    'Employee Earnings': '99ba80',
    'Variable Earnings': 'e6e600',
    'Non Taxable Allowances': 'd99d75',
  };

  /* =========================================================
 STEP 4: ADD GROUP TITLES TO ROW 1
========================================================= */
  groups.forEach((group) => {
    worksheet.mergeCells(1, group.start, 1, group.end);

    const cell = worksheet.getCell(1, group.start);
    cell.value = group.title;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { bold: true, size: 12 };
    const bgColor = colorCodes[group.title]
      ? `FF${colorCodes[group.title]}` // ✅ Convert to ARGB
      : 'FFD9E1F2'; // ✅ Default fallback
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  /* =========================================================
 STEP 5: SET ALL COLUMN HEADERS IN ROW 2
========================================================= */
  worksheet.getRow(2).values = columns.map((col) => col.header);

  /* =========================================================
 STEP 6: MERGE ROW 1 & 2 ONLY FOR NON-GROUP COLUMNS
========================================================= */
  const groupedColumns = new Set();

  groups.forEach((g) => {
    for (let i = g.start; i <= g.end; i++) {
      groupedColumns.add(i);
    }
  });

  for (let col = 1; col <= columns.length; col++) {
    if (!groupedColumns.has(col)) {
      worksheet.mergeCells(1, col, 2, col);
    }
  }

  /* =========================================================
 STEP 7: STYLE ONLY ROW 2 (REAL HEADERS)
========================================================= */
  worksheet.getRow(2).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };

    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    cell.alignment = { vertical: 'middle', horizontal: 'center' };

    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 4, // ✅ Freeze first 4 columns
      ySplit: 2, // ✅ Freeze first 2 rows
    },
  ];

  /* =========================================================
 ADD DATA FROM ROW 3
========================================================= */
  worksheet.addRows(excelRows);

  /* =========================================================
 STEP 9: SEND FILE
========================================================= */
  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workbook.csv.write(res)
    : workbook.xlsx.write(res);
};

async function createZipFileForPdf(fileName, pdfArray, res) {
  const zip = new JSZip();

  for (let i = 0; i < pdfArray.length; i++) {
    const path = pdfArray[i].path;

    const pdfBytes = base64ToUint8Array(path);
    zip.file(`${pdfArray[i].pdfFileName}.pdf`, pdfBytes);
  }

  const zipbuffer = await zip.generateAsync({ type: 'nodebuffer' });
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename=${fileName}.zip`,
  });
  res.end(zipbuffer);
}

const borderStyle = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

function applyHeaderStyle(row, style) {
  row.eachCell((cell) => (cell.style = style));
}

function styleRowEMI(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = borderStyle;
  });
}

function setSectionHeader(sheet, row, colEnd, colStart) {
  sheet.mergeCells(row.number, colStart, row.number, colEnd);
  const cell = row.getCell(colStart);
  cell.font = { bold: true, size: 12 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = borderStyle;
}

/* =========================================================
  STYLES
========================================================= */

const tableHeaderStyles = {
  loan: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }, // Blue
    },
    alignment: { horizontal: 'center' },
    border: borderStyle,
  },

  emi: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF548235' }, // Green
    },
    alignment: { horizontal: 'center' },
    border: borderStyle,
  },

  advance: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' }, // Orange
    },
    alignment: { horizontal: 'center' },
    border: borderStyle,
  },
};

function applyTableHeaderStyle(row, style) {
  row.eachCell((cell) => {
    cell.style = style;
  });
}

const indexHeaderStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' },
  },
  alignment: { horizontal: 'center' },
  border: borderStyle,
};

function styleRowLoan(row, fill = '', bold = false) {
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (fill) cell.fill = fill;
    if (colNumber !== 6) {
      cell.border = borderStyle;
    }
    if (bold) cell.font = { bold: true };
  });
}

async function generateLoanReportWithEMI(userData, res, next) {
  const filePath = path.join(__dirname, 'LoanReportWithEMI.xlsx');
  const workbook = new ExcelJS.Workbook();

  /* ================= INDEX SHEET ================= */

  const indexSheet = workbook.addWorksheet('Index Sheet', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const indexHeaderRow = indexSheet.addRow([
    'Employee Code',
    'Employee Name',
    'Number',
    'Open Sheet',
  ]);
  applyHeaderStyle(indexHeaderRow, indexHeaderStyle);

  indexSheet.columns = [
    { width: 20 },
    { width: 30 },
    { width: 18 },
    { width: 15 },
  ];

  /* ================= USER SHEETS ================= */

  for (const user of userData) {
    const empCode = user.employeeJoiningDetails?.[0]?.employeeCode || '';
    const sheetName = getUniqueSheetName(workbook, user.displayName, empCode);

    const userSheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 2 }],
    });

    /* ---------- USER INFO ---------- */

    const userHeader = userSheet.addRow([
      'Employee Code',
      'Employee Name',
      'Number',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
    ]);
    applyHeaderStyle(userHeader, indexHeaderStyle);

    styleRowEMI(
      userSheet.addRow([
        empCode,
        user.displayName,
        user.userNumber,
        user.emp_branch?.[0]?.branchMaster?.branchName || '',
        user.emp_dept?.[0]?.department?.departmentName || '',
        user.emp_desig?.[0]?.designation?.designationName || '',
        user.emp_div?.[0]?.division?.divisionName || '',
        user.emp_area?.[0]?.workingArea?.workingAreaName || '',
      ]),
    );

    /* ---------- LOANS ---------- */

    const loans = (user.loanMasters || []).sort(
      (a, b) => b.startMonth - a.startMonth,
    );

    for (const [loanIndex, loan] of loans.entries()) {
      const EMIData = (loan.loanTransactions || []).sort(
        (a, b) => a.EMIMonth - b.EMIMonth,
      );
      const advanceData = (loan.loanAdvances || []).sort(
        (a, b) => a.givenDate - b.givenDate,
      );

      userSheet.addRow([]);
      userSheet.addRow([]);

      /* ---------- LOAN DETAILS ---------- */

      setSectionHeader(
        userSheet,
        userSheet.addRow([`${loanIndex + 1}. Loan Details`]),
        7,
        1,
      );

      const loanHeaderRow = userSheet.addRow([
        'Loan Amount',
        'EMI Months',
        'Interest Rate',
        'Given Date',
        'Payment Mode',
        'Reference No.',
        'Reference Date',
      ]);
      applyTableHeaderStyle(loanHeaderRow, tableHeaderStyles.loan);

      styleRowEMI(
        userSheet.addRow([
          loan.LoanAmount,
          loan.EMIMonths,
          loan.interest,
          formatDateMMDDYYYY(loan.givenDate),
          loan.paymentmode,
          loan.referenceNO,
          formatDateMMDDYYYY(loan.referenceDate),
        ]),
      );

      userSheet.addRow([]);

      /* ---------- EMI + ADVANCE SIDE BY SIDE ---------- */

      const startRow = userSheet.lastRow.number + 1;
      const row = userSheet.addRow(['EMI Details']);

      setSectionHeader(userSheet, row, 5, 1);

      const headerRow = userSheet.addRow([]);

      [
        'EMI Month',
        'Loan Installment',
        'Principal',
        'Interest',
        'Status',
      ].forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.style = tableHeaderStyles.emi;
      });

      // only if advanceData

      if (advanceData.length) {
        userSheet.getRow(startRow).getCell(7).value =
          'Loan Advance Payment History';
        setSectionHeader(userSheet, row, 10, 7);

        ['Amount', 'Given Date', 'Payment Mode', 'Remarks'].forEach((h, i) => {
          const cell = headerRow.getCell(i + 7);
          cell.value = h;
          cell.style = tableHeaderStyles.advance;
        });
      }

      const totalRows = Math.max(EMIData.length, advanceData.length);
      const payrollFrequency = loan.payrollFrequency;

      for (let i = 0; i < totalRows; i++) {
        const row = userSheet.addRow([]);

        if (EMIData[i]) {
          const EMI = EMIData[i];
          row.getCell(1).value = getEMIMonthByPayrollFrequency(
            payrollFrequency,
            EMI.EMIMonth,
            EMI.startDate,
            EMI.endDate,
          );
          row.getCell(2).value = EMI.EMIAmount;
          row.getCell(3).value = EMI.monthlyPrinciple;
          row.getCell(4).value = EMI.monthlyInterest;
          row.getCell(5).value = EMI.RefrenceId ? 'Paid' : 'Pending';
        }

        if (advanceData[i]) {
          const adv = advanceData[i];
          row.getCell(7).value = adv.Amount;
          row.getCell(8).value = formatDateMMDDYYYY(adv.givenDate);
          row.getCell(9).value = adv.paymentmode;
          row.getCell(10).value = adv.remarks;
        }

        styleRowLoan(row);
      }
    }

    /* ---------- INDEX LINK ---------- */

    const indexRow = indexSheet.addRow([
      empCode,
      user.displayName,
      user.userNumber,
      'Open',
    ]);

    indexRow.getCell(4).value = {
      text: 'Open',
      hyperlink: `#'${sheetName}'!A1`,
    };
    indexRow.getCell(4).font = {
      color: { argb: 'FF0000FF' },
      underline: true,
    };

    styleRowEMI(indexRow);
  }

  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, 'EmployeeLoanReport.xlsx', (err) => {
    if (err) next(err);
    fs.unlinkSync(filePath);
  });
}

const generateExcelForDailyInOutReport = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data.length) throw new Error('No data found to generate the file!');
  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('Visit');
    const columns = Object.keys(flattenObj(data[0])).map((key) => ({
      header: key,
      key,
      width: 20,
    }));

    workSheet.columns = columns;
    data.map((item, index) => {
      const flatItem = flattenObj(item);
      Object.keys(flatItem).forEach((key) => {
        const value = flatItem[key];
        if (typeof value === 'string') {
          // Process custom markers
          flatItem[key] = value
            .replace(/ logNewLine,/g, '\n')
            .replace(/ logNewLine/g, ' ');
        }
      });

      // Write row data
      const row = workSheet.getRow(index + 2);
      row.values = flatItem;
      row.alignment = { wrapText: true };
    });

    // Format the first row (header)
    formatFirstRow(workSheet, 1);

    // Set response headers and return the file
    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? workBook.csv.write(res)
      : workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error);
  }
};

const generateExcelProjectWiseSalaryDistribution = async (
  data,
  fileName,
  fileType,
  res,
) => {
  if (!data || !data.length) {
    throw new Error('No data found to generate the file!');
  }

  const workBook = new Excel.Workbook();
  const worksheet = workBook.addWorksheet('Project Wise Salary Distribution', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 3 }],
  });

  /* ---------------- DYNAMIC HEADERS ---------------- */

  const employeeKeySet = new Set();
  const projectKeySet = new Set();

  data.forEach((emp) => {
    Object.keys(emp).forEach((key) => {
      if (key !== 'ProjectDetails') employeeKeySet.add(key);
    });

    emp.ProjectDetails?.forEach((project) => {
      Object.keys(project).forEach((key) => projectKeySet.add(key));
    });
  });

  const employeeKeys = Array.from(employeeKeySet);
  const projectKeys = Array.from(projectKeySet);

  const header = [...employeeKeys, ...projectKeys];
  worksheet.addRow(header);

  /* ---------------- HEADER STYLE (NAVY BLUE) ---------------- */

  const headerRow = worksheet.getRow(1);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '729fcf' }, // Navy Blue
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
  });

  /* ---------------- DATA ROWS + MERGE ---------------- */

  let currentRow = 2;

  data.forEach((emp) => {
    const startRow = currentRow;

    emp.ProjectDetails.forEach((project) => {
      const rowData = [
        ...employeeKeys.map((k) => emp[k] ?? ''),
        ...projectKeys.map((k) => project[k] ?? ''),
      ];
      worksheet.addRow(rowData);
      currentRow++;
    });

    const endRow = currentRow - 1;

    // Merge employee cells vertically
    employeeKeys.forEach((_, index) => {
      worksheet.mergeCells(startRow, index + 1, endRow, index + 1);
      worksheet.getCell(startRow, index + 1).alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
    });

    // Group border per employee
    for (let col = 1; col <= header.length; col++) {
      worksheet.getCell(startRow, col).border = {
        top: { style: 'medium' },
      };
      worksheet.getCell(endRow, col).border = {
        bottom: { style: 'medium' },
      };
    }
  });

  /* ---------------- GENERAL CELL STYLING ---------------- */

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.border = {
        ...cell.border,
        left: { style: 'thin' },
        right: { style: 'thin' },
      };

      if (rowNumber !== 1) {
        cell.font = { color: { argb: 'FF000000' } };
      }
    });
  });

  worksheet.columns.forEach((col) => {
    col.width = 22;
  });

  /* ---------------- RESPONSE ---------------- */

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};
const generateAttendanceReport_2_Excel = async (
  dataObj,
  fileName,
  fileType,
  reportType,
  selectedShowFields = [],
  res,
) => {
  const users = dataObj.users || [];
  if (!users.length) throw new Error('No data found to generate the file!');

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);

  const isPA = +reportType === attendanceReportMainReportTypes.REGISTER_2_PA;

  const isInOut =
    +reportType === attendanceReportMainReportTypes.REGISTER_2_INOUT;

  const isWithLogs =
    +reportType === attendanceReportMainReportTypes.REGISTER_2_INOUT_WITHLOGS;
  if (!isWithLogs) selectedShowFields = [];
  /* ---------------------------------------------------
     1. Find Max Punch Logs
  --------------------------------------------------- */

  let maxPunchPairs = 0;

  if (isWithLogs) {
    let maxLogs = 0;

    for (const user of users) {
      for (const att of user.attendanceData || []) {
        const logs = att.logData || [];
        if (logs.length > maxLogs) maxLogs = logs.length;
      }
    }

    maxPunchPairs = Math.ceil(maxLogs / 2);
  }

  /* ---------------------------------------------------
     2. Punch Column Builder
  --------------------------------------------------- */

  const buildPunchColumns = (logData = []) => {
    if (!isWithLogs) return {};

    const cols = {};
    let inIndex = 1;
    let outIndex = 1;

    for (const log of logData) {
      const lower = log.toLowerCase();

      if (lower.includes(' - in')) {
        cols[`In${inIndex++}`] = log.replace(/ - in/i, '').trim();
      } else if (lower.includes(' - out')) {
        cols[`Out${outIndex++}`] = log.replace(/ - out/i, '').trim();
      }
    }

    for (let i = 1; i <= maxPunchPairs; i++) {
      if (!cols[`In${i}`]) cols[`In${i}`] = '-';
      if (!cols[`Out${i}`]) cols[`Out${i}`] = '-';
    }

    return cols;
  };

  function filterOptionalFields(row, selectedShowFields = []) {
    const filteredRow = { ...row };

    const optionalFields = [
      'Employee Number',
      'Joining Date',
      'Department',
      'Division',
      'Working Area',
      'In Time',
      'Out Time',
      'Hours_Minutes',
      'Minutes',
    ];

    optionalFields.forEach((field) => {
      if (!selectedShowFields.includes(field)) {
        delete filteredRow[field];
      }
    });

    return filteredRow;
  }

  /* ---------------------------------------------------
     4. Prepare Rows
  --------------------------------------------------- */

  const rows = [];

  for (const user of users) {
    const baseUser = {
      'Employee Code': user.employeeCode,
      'Employee Name': user.displayName,
      'Employee Number': user.userNumber,
      Branch: user.branch,
      Department: user.department,
      Designation: user.designation,
      Division: user.division,
      'Working Area': user.workingArea,
      'Joining Date': user.formattendJoiningDate,
    };

    for (const att of user.attendanceData || []) {
      const row = {
        ...baseUser,
        'Attendance Date': att.formattedAttendanceDate,
        Minutes: Math.round(att.finalminutes),
      };

      if (isPA) {
        row.Status = att.title;
      }

      if (isInOut || isWithLogs) {
        row['In Time'] = att.inDateTime;
        row['Out Time'] = att.outDateTime;
        row['Hours_Minutes'] = att.roundOffHours;
      }

      if (isWithLogs) {
        row.Shift = att.shift;
        row['Shift Start Time'] = att.shiftInTime;
        row['Shift End Time'] = att.shiftOutTime;
        row['Shift Hours'] = att.shiftHours;
      } else {
        row.Shift = att.shift;
        row['Shift Hours'] = att.shiftHours;
        row['Shift In-Time'] = att.shiftInTime;
        row['Shift Out-Time'] = att.shiftOutTime;
      }

      if (isWithLogs) {
        Object.assign(row, buildPunchColumns(att.logData));

        row['Lunch Excess'] = att.outMinutes;
        row['Hours Worked'] = att.roundOffHours;
        row.Status = att.title;
        row['No Of Punches'] = att.noOfPunches;
        row['Punching Devices'] = att.punchingDevices?.length
          ? `${att.punchingDevices.join(', ')}${att.isManual ? ' (Time Unchanged)' : ''}`
          : '-';
        row['New Remarks'] = att.punchingDevicesRemarks?.length
          ? `${att.punchingDevicesRemarks.join(', ')}`
          : '-';
        row['Shift Late'] = att.Lateby;
        row['Shift Early'] = att.EarlyBy;
        row['KMS Travelled'] = att.KMSTravelled;
        row['Expense (Pending + Approved)'] = att.expenseApplied;

        const finalRow = filterOptionalFields(row, selectedShowFields);
        rows.push(finalRow);
      } else {
        row['Late By'] = att.Lateby;
        row['Early By'] = att.EarlyBy;
        row.Penalty = att.Penalty;
        row.PenaltyDeduction = att.PenaltyDeduction;
        row['EarlyGoing Penalty'] = att.goEarlyPanalty || '';
        row['EarlyGoing Penalty Deduction'] = att.goEarlyPanaltyDeduction || '';

        rows.push(row);
      }
    }
    if (isWithLogs) {
      const totalRow = {
        // Always keep ALL base user data
        'Employee Code': user.employeeCode,
        'Employee Name': user.displayName,
        Branch: user.branch,
        Designation: user.designation,
        // Total data
        'Attendance Date': 'TOTAL',
        'In Time': `Total Present: ${user.presentCount || 0}`,
        'Out Time': `Total Absent: ${user.absentCount || 0}`,
        Shift: `Total Half Day: ${user.halfDayCount || 0}`,
        'Shift Start Time': `Total Weekoff: ${user.weekOffCount || 0}`,
        'Shift End Time': `Total Holiday: ${user.holidayCount || 0}`,
        'Shift Hours': `Total MissPunch: ${user.missPunchCount || 0}`,
        'Lunch Excess': `Total Approved Leaves: ${
          (user.paidLeaveCount || 0) + (user.unPaidLeaveCount || 0)
        }`,
        'Hours Worked': `Total Pending Leaves: ${user.pendingLeaveCount || 0}`,
        Status: `Total Approved Outduty: ${user.approvedOutDuty || 0}`,
        'No Of Punches': `Total Pending Outduty: ${user.pendingOutDuty || 0}`,
        'Punching Devices': `Total Present Weekoff/Holiday: ${user.presentOnWeekOffHolidayCount || 0}`,
      };

      rows.push(totalRow);
      rows.push({});
    }
    if (isPA || isInOut) {
      rows.push({
        'Employee Code': `Total Present: ${user.presentCount}`,
        'Employee Name': `Total Absent: ${user.absentCount}`,
        'Employee Number': `Total Half Day: ${user.halfDayCount}`,
        Branch: `Total Weekoff: ${user.weekOffCount}`,
        Department: `Total Holiday: ${user.holidayCount}`,
        Designation: `Total MissPunch: ${user.missPunchCount}`,
        Division: `Total Approved Leaves: ${
          (user.paidLeaveCount || 0) + (user.unPaidLeaveCount || 0)
        }`,
        'Working Area': `Total Pending Leaves: ${user.pendingLeaveCount}`,
      });

      rows.push({});
    }
  }

  /* ---------------------------------------------------
     5. Header Sorting (For With Logs)
  --------------------------------------------------- */

  function getHeaders(rows) {
    const set = new Set();
    rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set);
  }
  function sortHeaders(headers) {
    const fixedStart = [
      'Employee Code',
      'Employee Name',
      'Employee Number',
      'Joining Date',
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
      'Attendance Date',
      'In Time',
      'Out Time',
      'Shift',
      'Shift Start Time',
      'Shift End Time',
      'Shift Hours',
    ].filter((h) => headers.includes(h)); // 🔥 important fix

    const punchHeaders = headers
      .filter((h) => /^In\d+$|^Out\d+$/.test(h))
      .sort((a, b) => {
        const an = parseInt(a.match(/\d+/)[0]);
        const bn = parseInt(b.match(/\d+/)[0]);
        if (an === bn) return a.startsWith('In') ? -1 : 1;
        return an - bn;
      });

    const fixedEnd = headers.filter(
      (h) => !fixedStart.includes(h) && !punchHeaders.includes(h),
    );

    return [...fixedStart, ...punchHeaders, ...fixedEnd];
  }

  const headers = isWithLogs
    ? sortHeaders(getHeaders(rows))
    : Object.keys(
        rows.reduce((a, b) =>
          Object.keys(a).length > Object.keys(b).length ? a : b,
        ),
      );

  workSheet.columns = headers.map((key) => ({
    header: key,
    key,
    width: 15,
  }));

  /* ---------------------------------------------------
     6. Add Rows
  --------------------------------------------------- */

  for (const r of rows) {
    workSheet.addRow(r);
  }

  formatFirstRow(workSheet, 1);

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};

const generateAttendanceReport_2_with_PA_INOUT_Excel = async (
  dataObj,
  fileName,
  fileType,
  res,
) => {
  const users = dataObj.users || [];
  if (!users.length) throw new Error('No data found to generate the file!');

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);
  const rows = [];

  for (const user of users) {
    const baseUser = {
      'Employee Code': user.employeeCode,
      'Employee Name': user.displayName,
      'Employee Number': user.employeeCode,
      Branch: user.branch,
      Department: user.department,
      Designation: user.designation,
      Division: user.division,
      'Working Area': user.workingArea,
      'Joining Date': user.formattendJoiningDate,
    };

    for (const att of user.attendanceData || []) {
      const row = {
        ...baseUser,
        'Attendance Date': att.formattedAttendanceDate,
        Status: att.title,
        'Attendance InTime': att.inDateTime,
        'Attendance OutTime': att.outDateTime,
        Shift: att.shift,
        'Shift Hours': att.shiftHours,
        'Shift InTime': att.shiftInTime,
        'Shift OutTime': att.shiftOutTime,
        'In Minutes': att.inHours,
        'Out Minutes': att.outHours,
        'Working Hours': att.roundOffHours,
        'Working Minutes': att.roundOffMinutes,
        'Without OT Minutes': att.withoutOtMinutes,
        'Late By Minutes': att.Lateby,
        'Early By Minutes': att.EarlyBy,
        Penalty: att.Penalty,
        'Penalty Deduction By': att.PenaltyDeduction,
        'GoEarly Penalty': att.goEarlyPanalty,
        'GoEarly Penalty Deduction By': att.goEarlyPanaltyDeduction,
        'Shift Shortfall Minutes': att.shiftShortfallMinutes,
        'Overtime Minutes': att.otMinutes,
        'Overtime Status': att.otStatus,
        'Break-1 Start Time': att.breakStartTime1,
        'Break-1 End Time': att.breakEndTime1,
        'Break-1 Minutes': att.breakMinutes1,
        'Break-2 Start Time': att.breakStartTime2,
        'Break-2 End Time': att.breakEndTime2,
        'Break-2 Minutes': att.breakMinutes2,
        Remarks: att.remarks,
        'Attendance Change From': att.isManual
          ? `Status Correction(Time Unchanged)`
          : '',
        'Working Minutes Converted To Overtime': att.isWHConvertedToOT || '',
      };

      rows.push(row);
    }
    const totalRow = {
      ...baseUser,
      'Attendance Date': 'Total',
      'In Minutes': user.totalInHours,
      'Out Minutes': user.totalOutHours,
      'Working Hours': user.totalRoundOffHours,
      'Working Minutes': user.totalRoundOffMinutes,
      'Without OT Minutes': user.totalWithoutOtMinutes,
      'Late By Minutes': user.totalLateby,
      'Early By Minutes': user.totalEarlyBy,
      'Shift Shortfall Minutes': user.totalShiftShortfallMinutes,
      'Overtime Minutes': user.totalOtMinutes,
      'Break-1 Minutes': user.totalBreakMinutes1,
      'Break-2 Minutes': user.totalBreakMinutes2,
    };

    rows.push(totalRow);
    rows.push({}); // blank row
  }

  /* ---------------------------------------------------
     4. Dynamic Column Setup (only once)
  --------------------------------------------------- */
  const widestRow =
    rows.reduce((a, b) =>
      Object.keys(a).length > Object.keys(b).length ? a : b,
    ) || {};

  workSheet.columns = Object.keys(widestRow).map((key) => ({
    header: key,
    key,
    width: 15,
  }));

  /* ---------------------------------------------------
     5. Add Rows (faster than flattenObj multiple times)
  --------------------------------------------------- */
  for (const r of rows) {
    workSheet.addRow(r);
  }

  formatFirstRow(workSheet, 1);

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return fileType === 'csv'
    ? workBook.csv.write(res)
    : workBook.xlsx.write(res);
};
const generateAttendanceReport_Consolidate_Excel = async (
  dataObj,
  fileName,
  fileType,
  reportType,
  formattedDatesArray = [],
  res,
) => {
  const userAttendanceData = dataObj.users || [];

  if (!userAttendanceData.length) {
    throw new Error('No data found to generate the file!');
  }

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);

  /* ================= HEADER ================= */

  const fixedHeader = ['Sr No.', 'Employee Code', 'Employee Name'];
  if (
    +reportType !=
    attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
  ) {
    const listHeader = ['Employee Number', 'Joining Date'];
    fixedHeader.push(...listHeader);
  }
  const dataHeader = ['Branch', 'Department', 'Designation'];
  fixedHeader.push(...dataHeader);

  const fixHeaderForVertical = [
    'Pending Work From Home',
    'Approved Work From Home',
    'Pending Attendance Correction',
    'Approved Attendance Correction',
  ];

  if (
    +reportType !=
    attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
  ) {
    const listHeader = [
      'Division',
      'Working Area',
      'Project',
      'Present',
      'Absent',
      'Half Day',
      'Miss Punch',
      'Week Off',
      'Holiday',
      'Approved Leave',
      'Pending Leave',
      'Approved OutDuty',
      'Pending OutDuty',
    ];

    if (
      +reportType ==
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
    ) {
      listHeader.push(...fixHeaderForVertical);
    }

    fixedHeader.push(...listHeader);
  }
  fixedHeader.push(' ');
  let dynamicHeader = [];

  // ✅ NEW HORIZONTAL HEADER
  if (
    +reportType ===
    attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
  ) {
    formattedDatesArray.forEach((date) => {
      dynamicHeader.push(
        `Date`,
        `Shift`,
        `In`,
        `Out`,
        `Working Hours`,
        `Overtime Hours`,
        `Status`,
      );
    });
  } else {
    dynamicHeader = formattedDatesArray;
  }

  const mainHeader = [...fixedHeader, ...dynamicHeader];

  const headerRow = workSheet.addRow(mainHeader);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ADD8E6' },
    };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  /* ================= DATA ================= */

  userAttendanceData.forEach((e, index) => {
    const rowdata = [index + 1, e.employeeCode, e.displayName];
    if (
      +reportType !=
      +attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
    ) {
      const rowDataList = [e.userNumber, e.formattendJoiningDate];
      rowdata.push(...rowDataList);
    }
    const dataListData = [e.branch, e.department, e.designation];
    rowdata.push(...dataListData);
    if (
      +reportType !=
      +attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
    ) {
      const rowDataList = [
        e.division,
        e.workingArea,
        e.project,
        e.presentCount,
        e.absentCount,
        e.halfDayCount,
        e.missPunchCount,
        e.weekOffCount,
        e.holidayCount,
        (e.paidLeaveCount || 0) + (e.unPaidLeaveCount || 0),
        e.pendingLeaveCount,
        e.approvedOutDuty,
        e.pendingOutDuty,
      ];

      if (
        +reportType ==
        attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
      ) {
        rowDataList.push(
          ...[
            e.pendingWorkFromHome,
            e.approvedWorkFromHome,
            e.pendingAttendanceCorrection,
            e.approvedAttendanceCorrection,
          ],
        );
      }

      rowdata.push(...rowDataList);
    }
    const indata =
      +attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL ===
      +reportType
        ? e.allDayOnlyIntimes || []
        : e.allDayIntimes || [];
    const outdata =
      +attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL ===
      +reportType
        ? e.allDayOnlyOuttimes || []
        : e.allDayOuttimes || [];
    const attStatus = e.allDayAttedanceStatus || [];
    const attRoundOffHours = e.allDayRoundOffHours || [];
    const shiftData = e.allDayShiftNames || [];
    const overTimeHours = e.allDayOvertimeHours || [];
    let firstRowNumber = null;
    let lastRowNumber = null;

    const isGrey = index % 2 !== 0;
    const fillColor = isGrey ? 'F2F2F2' : 'FFFFFF';

    const applyRowColor = (startRow, endRow) => {
      for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const row = workSheet.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor },
          };
        });
      }
    };

    /* ================= ✅ NEW HORIZONTAL ================= */
    if (
      +reportType ===
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
    ) {
      rowdata.push(' ');

      let horizontalData = [];

      for (let i = 0; i < formattedDatesArray.length; i++) {
        horizontalData.push(
          formattedDatesArray[i], // Date
          shiftData[i] || '', // Shift
          indata[i] || '', // In
          outdata[i] || '', // Out
          attRoundOffHours[i] || '', // WrkHrs
          overTimeHours[i] || '', // Overtime Hours
          attStatus[i] || '', // Status
        );
      }

      const row = workSheet.addRow([...rowdata, ...horizontalData]);
      applyRowColor(row.number, row.number);

      return;
    }

    /* ================= CONSOLIDATED_PA ================= */
    if (+reportType === attendanceReportMainReportTypes.CONSOLIDATED_PA) {
      const row = workSheet.addRow([...rowdata, 'Status', ...attStatus]);
      applyRowColor(row.number, row.number);
      return;
    }

    /* ================= CONSOLIDATED_PA_INOUT_VERTICAL ================= */
    if (
      +reportType ===
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
    ) {
      const statusRow = workSheet.addRow([...rowdata, 'Status', ...attStatus]);
      firstRowNumber = statusRow.number;
    }

    /* ================= CONSOLIDATED_INOUT ================= */
    if (
      +reportType === attendanceReportMainReportTypes.CONSOLIDATED_INOUT ||
      +reportType ===
        attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
    ) {
      const shiftRow = workSheet.addRow([...rowdata, 'Shift', ...shiftData]);
      const inRow = workSheet.addRow([...rowdata, 'IN', ...indata]);
      const outRow = workSheet.addRow([...rowdata, 'OUT', ...outdata]);
      const workingHoursRow = workSheet.addRow([
        ...rowdata,
        'Working Hours',
        ...attRoundOffHours,
      ]);
      const overtimeHoursRow = workSheet.addRow([
        ...rowdata,
        'Overtime Hours',
        ...overTimeHours,
      ]);
      if (!firstRowNumber) {
        firstRowNumber = shiftRow.number;
      }

      lastRowNumber = overtimeHoursRow.number;

      // Merge employee columns (1–21)
      for (let col = 1; col <= fixedHeader.length - 1; col++) {
        const cell = workSheet.getCell(firstRowNumber, col);
        if (!cell.isMerged) {
          workSheet.mergeCells(firstRowNumber, col, lastRowNumber, col);
        }
      }

      // Apply alternate color to entire user block
      applyRowColor(firstRowNumber, lastRowNumber);
    }
  });

  /* ================= WIDTH ================= */

  workSheet.columns.forEach((column) => {
    let maxLength = 10;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, value.length);
    });

    column.width = maxLength + 2;
  });

  /* ================= STYLE ================= */

  workSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  /* ================= RESPONSE ================= */

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  await workBook.xlsx.write(res);
  res.end();
};

const generateAttendanceReport_Punch_IN_Out_Excel = async (
  dataObj,
  fileName,
  fileType,
  reportType,
  formattedDatesArray = [],
  res,
) => {
  const userAttendanceData = dataObj.users || [];

  if (!userAttendanceData.length) {
    throw new Error('No data found to generate the file!');
  }

  const workBook = new Excel.Workbook();
  const sheetName = getUniqueSheetName(workBook, fileName);
  const workSheet = workBook.addWorksheet(sheetName);

  /* ================= HEADER ================= */

  const fixedHeader = [
    'Sr No.',
    'Employee Code',
    'Employee Name',
    'Employee Number',
    'Joining Date',
    'Branch',
    'Department',
    'Designation',
    'Division',
    'Working Area',
    ' ',
  ];

  const mainHeader = [...fixedHeader, ...formattedDatesArray];

  const headerRow = workSheet.addRow(mainHeader);

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ADD8E6' },
    };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  /* ================= DATA ================= */

  userAttendanceData.forEach((e, index) => {
    const rowdata = [
      index + 1,
      e.employeeCode,
      e.displayName,
      e.userNumber,
      e.formattendJoiningDate,
      e.branch,
      e.department,
      e.designation,
      e.division,
      e.workingArea,
    ];

    const indata = e.allDayIntimes || [];
    const outdata = e.allDayOuttimes || [];
    const attStatus = e.allDayAttedanceStatus || [];

    let firstRowNumber = null;
    let lastRowNumber = null;

    // Alternate color (white / grey)
    const isGrey = index % 2 !== 0;
    const fillColor = isGrey ? 'F2F2F2' : 'FFFFFF';

    const applyRowColor = (startRow, endRow) => {
      for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const row = workSheet.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: fillColor },
          };
        });
      }
    };

    /* ================= EMPLOYEE_PUNCH_IN_OUT_PA ================= */
    if (
      +reportType === attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_PA
    ) {
      const row = workSheet.addRow([...rowdata, 'Status', ...attStatus]);
      applyRowColor(row.number, row.number);
      return;
    }

    /* ================= EMPLOYEE_PUNCH_IN_OUT_INOUT ================= */
    if (
      +reportType ===
      attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_INOUT
    ) {
      const inRow = workSheet.addRow([...rowdata, 'IN', ...indata]);
      const outRow = workSheet.addRow([...rowdata, 'OUT', ...outdata]);

      if (!firstRowNumber) {
        firstRowNumber = inRow.number;
      }

      lastRowNumber = outRow.number;

      // Merge employee columns (1-10)
      for (let col = 1; col <= 10; col++) {
        const cell = workSheet.getCell(firstRowNumber, col);
        if (!cell.isMerged) {
          workSheet.mergeCells(firstRowNumber, col, lastRowNumber, col);
        }
      }

      // Apply alternate color to entire user block
      applyRowColor(firstRowNumber, lastRowNumber);
    }
  });

  /* ================= WIDTH ================= */

  workSheet.columns.forEach((column) => {
    let maxLength = 10;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, value.length);
    });

    column.width = maxLength + 2;
  });

  /* ================= STYLE ================= */

  workSheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  /* ================= RESPONSE ================= */

  res.attachment(`${fileName}.${fileType}`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  await workBook.xlsx.write(res);
  res.end();
};
const generateDailyPhysicalPresentAbsentReportExcel = async (
  presentUserData,
  absentUserData,
  filePath,
  fromDate,
) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workBook = new Excel.Workbook();

  // =========================
  // ✅ PRESENT SHEET
  // =========================
  const presentSheet = workBook.addWorksheet('Present');

  const presentHeaders = [
    'Employee Code',
    'Employee Name',
    'Number',
    'Branch',
    'Department',
    'Designation',
    'Division',
    'Working Area',
    'Attendance In Time',
    'Attendance Out Time',
    'Working Hours',
  ];
  const styleHeaderRow = (row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }, // Blue background
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  };
  // Attendance Date Row
  const presentTitleRow = presentSheet.addRow([
    `Attendance Date : ${moment(fromDate).format('DD-MM-YYYY')}`,
  ]);
  presentSheet.mergeCells('A1:J1');

  presentTitleRow.getCell(1).alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  presentTitleRow.getCell(1).font = { bold: true, size: 14 };

  // Header Row
  if (presentUserData.length === 1 && presentUserData[0].Message) {
    // 👉 No Data Case
    const msgRow = presentSheet.addRow([presentUserData[0].Message]);
    presentSheet.mergeCells('A2:J2');

    msgRow.getCell(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    msgRow.getCell(1).font = { bold: true, size: 12 };
  } else {
    // 👉 Data Exists
    const presentHeaderRow = presentSheet.addRow(presentHeaders);

    presentUserData.forEach((row) => {
      presentSheet.addRow(presentHeaders.map((h) => row[h] || ''));
    });

    styleHeaderRow(presentHeaderRow);
  }

  // =========================
  // ❌ ABSENT SHEET
  // =========================
  const absentSheet = workBook.addWorksheet('Absent');

  const absentHeaders = [
    'Employee Code',
    'Employee Name',
    'Number',
    'Branch',
    'Department',
    'Designation',
    'Division',
    'Working Area',
  ];

  // Attendance Date Row
  const absentTitleRow = absentSheet.addRow([
    `Attendance Date : ${moment(fromDate).format('DD-MM-YYYY')}`,
  ]);
  absentSheet.mergeCells('A1:H1');

  absentTitleRow.getCell(1).alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  absentTitleRow.getCell(1).font = { bold: true, size: 14 };

  // Header Row
  if (absentUserData.length === 1 && absentUserData[0].Message) {
    const msgRow = absentSheet.addRow([absentUserData[0].Message]);
    absentSheet.mergeCells('A2:H2');

    msgRow.getCell(1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    msgRow.getCell(1).font = { bold: true, size: 12 };
  } else {
    const absentHeaderRow = absentSheet.addRow(absentHeaders);

    absentUserData.forEach((row) => {
      absentSheet.addRow(absentHeaders.map((h) => row[h] || ''));
    });

    styleHeaderRow(absentHeaderRow);
  }

  [presentSheet, absentSheet].forEach((sheet) => {
    sheet.columns.forEach((col) => {
      col.width = 22;
    });
  });

  await workBook.xlsx.writeFile(filePath);

  return filePath;
};

// Helper function to detect image extension from base64
const getImageExtension = (base64String) => {
  // If base64 has data URI prefix like: data:image/png;base64,iVBOR...
  if (base64String.startsWith('data:')) {
    const mimeType = base64String.split(';')[0].split(':')[1]; // e.g. 'image/png'
    const ext = mimeType.split('/')[1]; // e.g. 'png'
    return ext === 'jpg' ? 'jpeg' : ext; // jpg → jpeg
  }

  // If base64 has NO prefix, detect from magic bytes
  const raw = base64String.substring(0, 16);
  const decoded = Buffer.from(raw, 'base64').toString('hex');

  if (decoded.startsWith('ffd8ff')) return 'jpeg'; // JPG magic bytes
  if (decoded.startsWith('89504e47')) return 'png'; // PNG magic bytes
  if (decoded.startsWith('47494638')) return 'gif'; // GIF magic bytes
  if (decoded.startsWith('52494646')) return 'webp'; // WEBP magic bytes

  return 'jpeg'; // default fallback
};

/**
 * Generate FORM B - Wage Register Excel with Dynamic Columns
 * @param {Object} exportData - Contains all the data needed for the report
 * @param {Object} res - Express response object
 */
async function generateFormBWagesRegister(exportData, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FORM B');

    // Analyze data to get all unique columns dynamically
    const columnStructure = analyzeDataStructure(exportData.finalData);

    // Build all columns dynamically
    const allColumns = [
      { key: 'srNo', width: 8, header: 'Sr. No.' },
      { key: 'srNoEmpReg', width: 12, header: 'Sr. No. in Employee Register' },
      { key: 'epfUan', width: 15, header: 'EPF\nUAN Number' },
      { key: 'esicNo', width: 15, header: 'ESIC Number' },
      { key: 'designation', width: 20, header: 'Designation' },
      {
        key: 'employeeName',
        width: 25,
        header: 'Employee Name\nFather/Husband Name',
      },
      { key: 'rateOfWages', width: 12, header: 'Rate of Wages' },
      { key: 'daysWorked', width: 12, header: 'No. of Days Worked' },
      { key: 'overtimeHours', width: 12, header: 'Overtime\nhours worked' },
    ];

    // Add earning columns dynamically
    columnStructure.earnings.forEach((earning, index) => {
      allColumns.push({
        key: `earning_${index}`,
        width: 12,
        header: earning.displayName,
        isEarning: true,
        payheadName: earning.payheadName,
      });
    });

    // Add Gross column
    allColumns.push({
      key: 'gross',
      width: 12,
      header: 'Gross',
      isGross: true,
    });

    // Add deduction columns dynamically
    columnStructure.deductions.forEach((deduction, index) => {
      allColumns.push({
        key: `deduction_${index}`,
        width: 10,
        header: deduction.displayName,
        isDeduction: true,
        payheadName: deduction.payheadName,
      });
    });

    // Add Total Deduction column
    allColumns.push({
      key: 'totalDeduction',
      width: 12,
      header: 'Total',
      isTotalDeduction: true,
    });

    // Add extra earning columns dynamically
    columnStructure.extraEarnings.forEach((extra, index) => {
      allColumns.push({
        key: `extraEarning_${index}`,
        width: 12,
        header: extra.displayName,
        isExtraEarning: true,
        payheadName: extra.payheadName,
      });
    });

    // Add Net Payable column
    allColumns.push({
      key: 'netPayable',
      width: 12,
      header: 'Net\nPayment',
      isNetPayable: true,
    });

    // Add other field columns dynamically (Employer Share)
    columnStructure.otherFields.forEach((field, index) => {
      allColumns.push({
        key: `otherField_${index}`,
        width: 10,
        header: field.displayName,
        isOtherField: true,
        payheadName: field.payheadName,
      });
    });

    // Add Receipt and Date columns
    allColumns.push({
      key: 'receipt',
      width: 20,
      header: 'Receipt by Employee/Bank\nTransaction ID',
    });
    allColumns.push({
      key: 'dateOfPayment',
      width: 12,
      header: 'Date Of Payment',
    });

    worksheet.columns = allColumns;

    let currentRow = 1;

    // Row 1: FORM B - Centered
    worksheet.mergeCells(currentRow, 1, currentRow, allColumns.length);
    const formBCell = worksheet.getCell(currentRow, 1);
    formBCell.value = 'FORM B';
    formBCell.font = { bold: true, size: 14 };
    formBCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Row 2: FORMAT OF WAGES REGISTER - Centered
    worksheet.mergeCells(currentRow, 1, currentRow, allColumns.length);
    const formatCell = worksheet.getCell(currentRow, 1);
    formatCell.value = 'FORMAT OF WAGES REGISTER';
    formatCell.font = { bold: true, size: 12 };
    formatCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Row 3: Rate of minimum wage header - Centered
    const detailsStartRow = currentRow;
    worksheet.mergeCells(currentRow, 1, currentRow, allColumns.length);
    worksheet.getCell(currentRow, 1).value =
      'Rate of Minimum Wage and since the Date : ' +
      (exportData.MinWagesStartDate || '');
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 11 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    currentRow++;

    // Row 4: Category headers (removed empty row spacing)
    worksheet.getCell(currentRow, 1).value = '';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };

    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    worksheet.getCell(currentRow, 2).value = 'Highly Skilled (Per Day in Rs.)';
    worksheet.getCell(currentRow, 2).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 5, currentRow, 7);
    worksheet.getCell(currentRow, 5).value = 'Skilled (Per Day in Rs.)';
    worksheet.getCell(currentRow, 5).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 5).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 8, currentRow, 10);
    worksheet.getCell(currentRow, 8).value = 'Semi - Skilled (Per Day in Rs.)';
    worksheet.getCell(currentRow, 8).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 8).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 11, currentRow, 13);
    worksheet.getCell(currentRow, 11).value = 'Un Skilled (Per Day in Rs.)';
    worksheet.getCell(currentRow, 11).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 11).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    currentRow++;

    // Row 6: Minimum Basic
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.getCell(currentRow, 1).value = 'Minimum Basic';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    worksheet.getCell(currentRow, 2).value = exportData.highlySkilledRate || 0;
    worksheet.getCell(currentRow, 2).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 5, currentRow, 7);
    worksheet.getCell(currentRow, 5).value = exportData.skilledRate || 0;
    worksheet.getCell(currentRow, 5).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 5).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 8, currentRow, 10);
    worksheet.getCell(currentRow, 8).value = exportData.semiSkilledRate || 0;
    worksheet.getCell(currentRow, 8).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 8).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 11, currentRow, 13);
    worksheet.getCell(currentRow, 11).value = exportData.unSkilledRate || 0;
    worksheet.getCell(currentRow, 11).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 11).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    currentRow++;

    // Row 7: DA
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.getCell(currentRow, 1).value = 'DA';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    worksheet.getCell(currentRow, 2).value = '';
    worksheet.getCell(currentRow, 2).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 5, currentRow, 7);
    worksheet.getCell(currentRow, 5).value = '';
    worksheet.getCell(currentRow, 5).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 5).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 8, currentRow, 10);
    worksheet.getCell(currentRow, 8).value = '';
    worksheet.getCell(currentRow, 8).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 8).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 11, currentRow, 13);
    worksheet.getCell(currentRow, 11).value = '';
    worksheet.getCell(currentRow, 11).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 11).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    currentRow++;

    // Row 8: Overtime
    worksheet.mergeCells(currentRow, 1, currentRow, 1);
    worksheet.getCell(currentRow, 1).value = 'Overtime';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    worksheet.getCell(currentRow, 2).value = 'Double rate of Minimum wages';
    worksheet.getCell(currentRow, 2).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 5, currentRow, 7);
    worksheet.getCell(currentRow, 5).value = 'Double rate of Minimum wages';
    worksheet.getCell(currentRow, 5).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 5).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 8, currentRow, 10);
    worksheet.getCell(currentRow, 8).value = 'Double rate of Minimum wages';
    worksheet.getCell(currentRow, 8).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 8).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, 11, currentRow, 13);
    worksheet.getCell(currentRow, 11).value = 'Double rate of Minimum wages';
    worksheet.getCell(currentRow, 11).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 11).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    currentRow++;

    // Row 8: Establishment info (removed empty row spacing) - Single row layout using full width
    const labelCols = 3; // Use 3 columns for labels
    const halfWidth = Math.floor(allColumns.length / 2);

    worksheet.mergeCells(currentRow, 1, currentRow, labelCols);
    worksheet.getCell(currentRow, 1).value =
      'Name and Address of Establishment :-';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    // Company address - from col 4 to halfWidth
    const companyEndCol = Math.max(labelCols + 1, halfWidth - 3);
    worksheet.mergeCells(currentRow, labelCols + 1, currentRow, companyEndCol);
    worksheet.getCell(currentRow, labelCols + 1).value =
      `${exportData.companyName || ''}, ${exportData.companyAddress || ''}`;
    worksheet.getCell(currentRow, labelCols + 1).alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'left',
    };
    worksheet.getCell(currentRow, labelCols + 1).font = { bold: true, size: 9 };

    // Name of Owner label
    const ownerLabelStart = companyEndCol + 1;
    const ownerLabelEnd = ownerLabelStart + 1;
    worksheet.mergeCells(
      currentRow,
      ownerLabelStart,
      currentRow,
      ownerLabelEnd,
    );
    worksheet.getCell(currentRow, ownerLabelStart).value = 'Name of Owner :';
    worksheet.getCell(currentRow, ownerLabelStart).font = {
      bold: true,
      size: 9,
    };
    worksheet.getCell(currentRow, ownerLabelStart).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    // Owner name value
    const ownerValueStart = ownerLabelEnd + 1;
    const ownerValueEnd = ownerValueStart + 2;
    worksheet.mergeCells(
      currentRow,
      ownerValueStart,
      currentRow,
      ownerValueEnd,
    );
    worksheet.getCell(currentRow, ownerValueStart).value =
      exportData.ownerName || '';
    worksheet.getCell(currentRow, ownerValueStart).font = {
      bold: true,
      size: 9,
    };
    worksheet.getCell(currentRow, ownerValueStart).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    // LIN label
    const linLabelCol = ownerValueEnd + 1;
    if (linLabelCol <= allColumns.length) {
      worksheet.getCell(currentRow, linLabelCol).value = 'LIN :';
      worksheet.getCell(currentRow, linLabelCol).font = { bold: true, size: 9 };
      worksheet.getCell(currentRow, linLabelCol).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
    }

    // LIN value
    const linValueStart = linLabelCol + 1;
    const linValueEnd = Math.min(linValueStart + 2, allColumns.length);
    if (linValueStart <= allColumns.length && linValueEnd > linValueStart) {
      worksheet.mergeCells(currentRow, linValueStart, currentRow, linValueEnd);
      worksheet.getCell(currentRow, linValueStart).value = exportData.LIN || '';
      worksheet.getCell(currentRow, linValueStart).font = {
        bold: true,
        size: 9,
      };
      worksheet.getCell(currentRow, linValueStart).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
    }

    // Wage Period label
    const wageLabelStart = linValueEnd + 1;
    const wageLabelEnd = Math.min(wageLabelStart + 1, allColumns.length);
    if (wageLabelStart <= allColumns.length && wageLabelEnd > wageLabelStart) {
      worksheet.mergeCells(
        currentRow,
        wageLabelStart,
        currentRow,
        wageLabelEnd,
      );
      worksheet.getCell(currentRow, wageLabelStart).value = 'Wage Period :';
      worksheet.getCell(currentRow, wageLabelStart).font = {
        bold: true,
        size: 9,
      };
      worksheet.getCell(currentRow, wageLabelStart).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
    }

    // Wage Period value
    const wageValueStart = wageLabelEnd + 1;
    if (wageValueStart <= allColumns.length) {
      worksheet.mergeCells(
        currentRow,
        wageValueStart,
        currentRow,
        allColumns.length,
      );
      worksheet.getCell(currentRow, wageValueStart).value =
        exportData.wagesPeriod || '';
      worksheet.getCell(currentRow, wageValueStart).font = {
        bold: true,
        size: 9,
      };
      worksheet.getCell(currentRow, wageValueStart).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
    }
    currentRow++;

    // Row 11: Principal employer info - Single row layout using full width
    worksheet.mergeCells(currentRow, 1, currentRow, labelCols);
    worksheet.getCell(currentRow, 1).value =
      'Name And Address of Principal Employer : -';
    worksheet.getCell(currentRow, 1).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, 1).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    worksheet.mergeCells(currentRow, labelCols + 1, currentRow, halfWidth + 5);
    worksheet.getCell(currentRow, labelCols + 1).value =
      `${exportData.branchName || ''}, ${exportData.branchAddress || ''}`;
    worksheet.getCell(currentRow, labelCols + 1).alignment = {
      wrapText: true,
      vertical: 'middle',
      horizontal: 'left',
    };
    worksheet.getCell(currentRow, labelCols + 1).font = { bold: true, size: 9 };

    worksheet.mergeCells(
      currentRow,
      halfWidth + 6,
      currentRow,
      allColumns.length,
    );
    worksheet.getCell(currentRow, halfWidth + 6).value = 'Monthly';
    worksheet.getCell(currentRow, halfWidth + 6).font = { bold: true, size: 9 };
    worksheet.getCell(currentRow, halfWidth + 6).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    const detailsEndRow = currentRow;

    // Set row heights for details section - minimized for compactness
    worksheet.getRow(detailsStartRow).height = 20; // Rate of Minimum Wage header
    worksheet.getRow(detailsStartRow + 1).height = 20; // Category headers
    worksheet.getRow(detailsStartRow + 2).height = 18; // Minimum Basic
    worksheet.getRow(detailsStartRow + 3).height = 18; // DA
    worksheet.getRow(detailsStartRow + 4).height = 18; // Overtime
    worksheet.getRow(detailsStartRow + 5).height = 22; // Establishment info (single row with address)
    worksheet.getRow(detailsStartRow + 6).height = 22; // Principal employer info (single row with address)

    // Add borders to all detail rows (all columns)
    for (let row = detailsStartRow; row <= detailsEndRow; row++) {
      for (let col = 1; col <= allColumns.length; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    currentRow++;

    // Table header rows
    const headerStartRow = currentRow;

    // Header Row 1 - Main categories with merged cells
    let colIndex = 1;

    // Fixed columns - merge both header rows (no sub-headers needed)
    for (let i = 0; i < 9; i++) {
      worksheet.mergeCells(
        headerStartRow,
        colIndex,
        headerStartRow + 1,
        colIndex,
      );
      const cell = worksheet.getCell(headerStartRow, colIndex);
      cell.value = allColumns[i].header;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      colIndex++;
    }

    // Earnings header (merged)
    if (columnStructure.earnings.length > 0) {
      const earningsEndCol = colIndex + columnStructure.earnings.length - 1;
      worksheet.mergeCells(
        headerStartRow,
        colIndex,
        headerStartRow,
        earningsEndCol,
      );
      worksheet.getCell(headerStartRow, colIndex).value = 'Earnings';
      worksheet.getCell(headerStartRow, colIndex).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      colIndex += columnStructure.earnings.length;
    }

    // Gross column - merge both header rows (no sub-header needed)
    worksheet.mergeCells(
      headerStartRow,
      colIndex,
      headerStartRow + 1,
      colIndex,
    );
    worksheet.getCell(headerStartRow, colIndex).value = 'Gross';
    worksheet.getCell(headerStartRow, colIndex).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    colIndex++;

    // Deductions header (merged)
    if (columnStructure.deductions.length > 0) {
      const deductionsEndCol = colIndex + columnStructure.deductions.length - 1;
      worksheet.mergeCells(
        headerStartRow,
        colIndex,
        headerStartRow,
        deductionsEndCol,
      );
      worksheet.getCell(headerStartRow, colIndex).value = 'Deduction';
      worksheet.getCell(headerStartRow, colIndex).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      colIndex += columnStructure.deductions.length;
    }

    // Total Deduction column - merge both header rows (no sub-header needed)
    worksheet.mergeCells(
      headerStartRow,
      colIndex,
      headerStartRow + 1,
      colIndex,
    );
    worksheet.getCell(headerStartRow, colIndex).value = 'Total';
    worksheet.getCell(headerStartRow, colIndex).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    colIndex++;

    // Extra Earnings - merge both header rows for each (no sub-headers)
    columnStructure.extraEarnings.forEach((extra) => {
      worksheet.mergeCells(
        headerStartRow,
        colIndex,
        headerStartRow + 1,
        colIndex,
      );
      worksheet.getCell(headerStartRow, colIndex).value = extra.displayName;
      worksheet.getCell(headerStartRow, colIndex).alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      colIndex++;
    });

    // Net Payable column - merge both header rows (no sub-header needed)
    worksheet.mergeCells(
      headerStartRow,
      colIndex,
      headerStartRow + 1,
      colIndex,
    );
    worksheet.getCell(headerStartRow, colIndex).value = 'Net\nPayment';
    worksheet.getCell(headerStartRow, colIndex).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    colIndex++;

    // Employer Share header (merged)
    if (columnStructure.otherFields.length > 0) {
      const employerShareEndCol =
        colIndex + columnStructure.otherFields.length - 1;
      worksheet.mergeCells(
        headerStartRow,
        colIndex,
        headerStartRow,
        employerShareEndCol,
      );
      worksheet.getCell(headerStartRow, colIndex).value = 'Employer Share';
      worksheet.getCell(headerStartRow, colIndex).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      colIndex += columnStructure.otherFields.length;
    }

    // Receipt and Date columns - merge both header rows (no sub-headers needed)
    worksheet.mergeCells(
      headerStartRow,
      colIndex,
      headerStartRow + 1,
      colIndex,
    );
    worksheet.getCell(headerStartRow, colIndex).value =
      'Receipt by Employee / Bank\nTransaction ID';
    worksheet.getCell(headerStartRow, colIndex).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    colIndex++;

    worksheet.mergeCells(
      headerStartRow,
      colIndex,
      headerStartRow + 1,
      colIndex,
    );
    worksheet.getCell(headerStartRow, colIndex).value = 'Date Of Payment';
    worksheet.getCell(headerStartRow, colIndex).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Header Row 2 - Sub headers (only for dynamic columns under category headers)
    const headerRow2 = headerStartRow + 1;
    let subHeaderCol = 10; // Start after fixed columns (9 columns)

    // Earnings sub-headers
    columnStructure.earnings.forEach((earning) => {
      const cell = worksheet.getCell(headerRow2, subHeaderCol);
      cell.value = earning.displayName;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      subHeaderCol++;
    });

    subHeaderCol++; // Skip Gross (already merged)

    // Deductions sub-headers
    columnStructure.deductions.forEach((deduction) => {
      const cell = worksheet.getCell(headerRow2, subHeaderCol);
      cell.value = deduction.displayName;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      subHeaderCol++;
    });

    subHeaderCol++; // Skip Total Deduction (already merged)
    subHeaderCol += columnStructure.extraEarnings.length; // Skip Extra Earnings (already merged)
    subHeaderCol++; // Skip Net Payable (already merged)

    // Other fields sub-headers
    columnStructure.otherFields.forEach((field) => {
      const cell = worksheet.getCell(headerRow2, subHeaderCol);
      cell.value = field.displayName;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      subHeaderCol++;
    });

    // Style header rows
    for (let row = headerStartRow; row <= headerRow2; row++) {
      const headerRow = worksheet.getRow(row);
      headerRow.font = { bold: true, size: 9 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CEEB' }, // Light blue
      };
      headerRow.height = 30;

      // Add borders
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Freeze header rows only (not columns)
    worksheet.views = [{ state: 'frozen', ySplit: headerRow2 }];

    currentRow = headerRow2 + 1;

    // Data rows
    const totalSummary = initializeTotals(columnStructure);

    exportData.finalData.forEach((emp, index) => {
      const row = worksheet.getRow(currentRow);
      colIndex = 1;

      // Fixed columns
      row.getCell(colIndex++).value = index + 1;
      row.getCell(colIndex++).value = emp['Employee Code'] || '';
      row.getCell(colIndex++).value = emp['EPF UAN Number'] || '';
      row.getCell(colIndex++).value = emp['ESIC Number'] || '';
      row.getCell(colIndex++).value = emp.Designation || '';

      // Employee Name - Bold
      const empNameCell = row.getCell(colIndex++);
      empNameCell.value = emp['Employee Name'] || '';
      empNameCell.font = { bold: true };

      const rateOfWages = emp['Rate of Wages'] || 0;
      const daysWorked = emp['No. of Days Worked'] || 0;
      const overtimeHours = emp['Overtime Hours'] || 0;

      // Rate of Wages - Right aligned
      const rateCell = row.getCell(colIndex++);
      rateCell.value = rateOfWages;
      rateCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Days Worked - Right aligned
      const daysCell = row.getCell(colIndex++);
      daysCell.value = daysWorked;
      daysCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Overtime hours - Right aligned
      const overtimeCell = row.getCell(colIndex++);
      overtimeCell.value = overtimeHours;
      overtimeCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // No total tracking for Rate of Wages
      totalSummary.daysWorked += daysWorked;

      const otMinutes = convertHoursAndMinutesToMinutes(overtimeHours);

      totalSummary.overtimeHours += otMinutes;

      // Earnings - Right aligned
      const earningsMap = createPayheadMap(emp.earninggrossArray);
      columnStructure.earnings.forEach((earning) => {
        const value = earningsMap.get(earning.payheadName) || 0;
        const earningCell = row.getCell(colIndex++);
        earningCell.value = value;
        earningCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalSummary.earnings[earning.payheadName] =
          (totalSummary.earnings[earning.payheadName] || 0) + value;
      });

      // Gross - Bold and Right aligned
      const gross = emp.Gross || 0;
      const grossCell = row.getCell(colIndex++);
      grossCell.value = gross;
      grossCell.font = { bold: true };
      grossCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalSummary.gross += gross;

      // Deductions - Right aligned
      const deductionsMap = createPayheadMap(emp.deductionArray);
      columnStructure.deductions.forEach((deduction) => {
        const value = deductionsMap.get(deduction.payheadName) || 0;
        const deductionCell = row.getCell(colIndex++);
        deductionCell.value = value;
        deductionCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalSummary.deductions[deduction.payheadName] =
          (totalSummary.deductions[deduction.payheadName] || 0) + value;
      });

      // Total Deduction - Right aligned
      const totalDeduction = emp.TotalDeduction || 0;
      const totalDeductionCell = row.getCell(colIndex++);
      totalDeductionCell.value = totalDeduction;
      totalDeductionCell.alignment = {
        horizontal: 'right',
        vertical: 'middle',
      };
      totalSummary.totalDeduction += totalDeduction;

      // Extra Earnings - Right aligned
      const extraEarningsMap = createPayheadMap(emp.extraEarningArray);
      columnStructure.extraEarnings.forEach((extra) => {
        const value = extraEarningsMap.get(extra.payheadName) || 0;
        const extraCell = row.getCell(colIndex++);
        extraCell.value = value;
        extraCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalSummary.extraEarnings[extra.payheadName] =
          (totalSummary.extraEarnings[extra.payheadName] || 0) + value;
      });

      // Net Payable - Bold and Right aligned
      const netPayable = emp.NetPayable || 0;
      const netPayableCell = row.getCell(colIndex++);
      netPayableCell.value = netPayable;
      netPayableCell.font = { bold: true };
      netPayableCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalSummary.netPayable += netPayable;

      // Other Fields (Employer Share) - Right aligned
      const otherFieldsMap = createPayheadMap(emp.otherfield);
      columnStructure.otherFields.forEach((field) => {
        const value = otherFieldsMap.get(field.payheadName) || 0;
        const otherCell = row.getCell(colIndex++);
        otherCell.value = value;
        otherCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalSummary.otherFields[field.payheadName] =
          (totalSummary.otherFields[field.payheadName] || 0) + value;
      });

      // Receipt and Date
      row.getCell(colIndex++).value =
        emp['Receipt by Employee/Bank Transaction ID'] || '';
      row.getCell(colIndex++).value = emp['Date Of Payment'] || '';

      // Style row - set height first
      row.height = 20;

      // Set alignment for each cell individually to preserve specific alignments
      row.eachCell((cell, colNumber) => {
        // Preserve existing alignment or set default vertical middle
        if (!cell.alignment || !cell.alignment.horizontal) {
          cell.alignment = {
            horizontal: cell.alignment?.horizontal || 'left',
            vertical: 'middle',
          };
        } else {
          // Keep existing alignment but ensure vertical middle
          cell.alignment = {
            ...cell.alignment,
            vertical: 'middle',
          };
        }
      });

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      currentRow++;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    colIndex = 1;

    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = 'TOTAL';
    totalRow.getCell(colIndex++).value = ''; // Rate Per Day - no total
    totalRow.getCell(colIndex++).value = totalSummary.daysWorked;
    totalRow.getCell(colIndex++).value = minutesToHoursMinutes(
      +totalSummary.overtimeHours,
    );

    // Earnings totals
    columnStructure.earnings.forEach((earning) => {
      totalRow.getCell(colIndex++).value =
        totalSummary.earnings[earning.payheadName] || 0;
    });

    totalRow.getCell(colIndex++).value = totalSummary.gross;

    // Deductions totals
    columnStructure.deductions.forEach((deduction) => {
      totalRow.getCell(colIndex++).value =
        totalSummary.deductions[deduction.payheadName] || 0;
    });

    totalRow.getCell(colIndex++).value = totalSummary.totalDeduction;

    // Extra Earnings totals
    columnStructure.extraEarnings.forEach((extra) => {
      totalRow.getCell(colIndex++).value =
        totalSummary.extraEarnings[extra.payheadName] || 0;
    });

    totalRow.getCell(colIndex++).value = totalSummary.netPayable;

    // Other Fields totals
    columnStructure.otherFields.forEach((field) => {
      totalRow.getCell(colIndex++).value =
        totalSummary.otherFields[field.payheadName] || 0;
    });

    totalRow.getCell(colIndex++).value = '';
    totalRow.getCell(colIndex++).value = '';

    // Style total row
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' },
    };
    totalRow.alignment = { vertical: 'middle', horizontal: 'right' };

    // Add borders to total row
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Form_B_Wages_Register_${moment().format('YYYYMMDD')}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Form B Wages Register:', error);
    throw error;
  }
}

// Helper functions

/**
 * Analyze data structure to find all unique columns
 */
function analyzeDataStructure(finalData) {
  const earnings = new Map();
  const deductions = new Map();
  const extraEarnings = new Map();
  const otherFields = new Map();

  finalData.forEach((emp) => {
    // Analyze earnings
    if (Array.isArray(emp.earninggrossArray)) {
      emp.earninggrossArray.forEach((item) => {
        const payheadName = item.payheadName || item.payheadDisplayName || '';
        const displayName = item.payheadDisplayName || item.payheadName || '';
        if (payheadName && !earnings.has(payheadName)) {
          earnings.set(payheadName, { payheadName, displayName });
        }
      });
    }

    // Analyze deductions
    if (Array.isArray(emp.deductionArray)) {
      emp.deductionArray.forEach((item) => {
        const payheadName = item.payheadName || item.payheadDisplayName || '';
        const displayName = item.payheadDisplayName || item.payheadName || '';
        if (payheadName && !deductions.has(payheadName)) {
          deductions.set(payheadName, { payheadName, displayName });
        }
      });
    }

    // Analyze extra earnings
    if (Array.isArray(emp.extraEarningArray)) {
      emp.extraEarningArray.forEach((item) => {
        const payheadName = item.payheadName || item.payheadDisplayName || '';
        const displayName = item.payheadDisplayName || item.payheadName || '';
        if (payheadName && !extraEarnings.has(payheadName)) {
          extraEarnings.set(payheadName, { payheadName, displayName });
        }
      });
    }

    // Analyze other fields
    if (Array.isArray(emp.otherfield)) {
      emp.otherfield.forEach((item) => {
        const payheadName = item.payheadName || item.payheadDisplayName || '';
        const displayName = item.payheadDisplayName || item.payheadName || '';
        if (payheadName && !otherFields.has(payheadName)) {
          otherFields.set(payheadName, { payheadName, displayName });
        }
      });
    }
  });

  return {
    earnings: Array.from(earnings.values()),
    deductions: Array.from(deductions.values()),
    extraEarnings: Array.from(extraEarnings.values()),
    otherFields: Array.from(otherFields.values()),
  };
}

/**
 * Create a map of payheads from array
 */
function createPayheadMap(payheadArray) {
  const map = new Map();
  if (Array.isArray(payheadArray)) {
    payheadArray.forEach((item) => {
      const key = item.payheadName || item.payheadDisplayName || '';
      const value = item.EmployeeSalaryAmount || 0;
      if (key) {
        map.set(key, value);
      }
    });
  }
  return map;
}

/**
 * Initialize totals object
 */
function initializeTotals(columnStructure) {
  const totals = {
    daysWorked: 0,
    overtimeHours: 0,
    earnings: {},
    gross: 0,
    deductions: {},
    totalDeduction: 0,
    extraEarnings: {},
    netPayable: 0,
    otherFields: {},
  };

  columnStructure.earnings.forEach((earning) => {
    totals.earnings[earning.payheadName] = 0;
  });

  columnStructure.deductions.forEach((deduction) => {
    totals.deductions[deduction.payheadName] = 0;
  });

  columnStructure.extraEarnings.forEach((extra) => {
    totals.extraEarnings[extra.payheadName] = 0;
  });

  columnStructure.otherFields.forEach((field) => {
    totals.otherFields[field.payheadName] = 0;
  });

  return totals;
}

const AuthStatusLabel = {
  2: 'Pending',
  1: 'Approved',
  0: 'Rejected',
};

const MasterStatusLabel = {
  0: 'Pending',
  1: 'Pending',
  2: 'Pending',
  3: 'Approved',
  4: 'Rejected',
};

const formatHeaderLabel = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split lower->Upper boundary
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // split ABCText -> ABC Text
    .replace(/^./, (c) => c.toUpperCase()) // capitalize first letter
    .trim();

const generateExcelWithAuthorizers = async (
  data,
  fileName,
  fileType,
  res,
  config = {},
) => {
  if (!data.length) {
    return res.status(200).json({ status: 201, message: 'no data found' });
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    // Columns that are the SAME for every authorizer row of a given tour
    // -> these get merged vertically
    const commonColumns = Object.keys(data[0]).filter(
      (key) => key !== 'authorizers',
    );

    // Columns that differ per authorizer -> one value per row, no merge
    const authorizerColumns = ['AuthorizerName', 'AuthorizerStatus'];

    workSheet.columns = [
      ...commonColumns.map((key) => ({
        header: formatHeaderLabel(key),
        key,
        width: 20,
      })),
      ...authorizerColumns.map((key) => ({
        header: formatHeaderLabel(key),
        key,
        width: 20,
      })),
    ];

    let currentRow = 2; // row 1 is the header

    data.forEach((item) => {
      // Normalize: if no authorizers, still emit exactly one row
      const authorizers =
        Array.isArray(item.authorizers) && item.authorizers.length
          ? item.authorizers
          : [null];

      const startRow = currentRow;

      authorizers.forEach((auth) => {
        const row = workSheet.getRow(currentRow);

        commonColumns.forEach((key) => {
          const rawValue = item[key] ?? '';
          row.getCell(key).value =
            key === 'status'
              ? (MasterStatusLabel[rawValue] ?? rawValue)
              : rawValue;
        });

        row.getCell('AuthorizerName').value =
          auth?.authorizedPerson?.displayName || '';
        row.getCell('AuthorizerStatus').value =
          AuthStatusLabel[auth?.authStatus] ?? '';

        currentRow += 1;
      });

      const endRow = currentRow - 1;

      // Merge the common columns vertically only if this tour spanned >1 row
      if (endRow > startRow) {
        commonColumns.forEach((key) => {
          const column = workSheet.getColumn(key);
          workSheet.mergeCells(
            `${column.letter}${startRow}:${column.letter}${endRow}`,
          );
          workSheet.getCell(`${column.letter}${startRow}`).alignment = {
            vertical: 'middle',
            wrapText: true,
          };
        });
      }
    });

    // Style header row - blue fill, white bold text
    const headerRow = workSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }, // dark blue - change to taste
      };
    });
    headerRow.height = 20;

    // Add a thin border to every used cell so merged blocks look clean
    workSheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    if (config?.saveToFile && config?.filePath) {
      await workBook.xlsx.writeFile(config.filePath);
      return config.filePath;
    }

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? await workBook.csv.write(res)
      : await workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

function collectKeysAndIndexes(reportData, property) {
  const keySet = new Set();
  const indexMap = new Map();

  reportData.forEach((row) => {
    Object.entries(row[property] || {}).forEach(([key, value]) => {
      keySet.add(key);

      if (!indexMap.has(key)) {
        indexMap.set(key, value?.salaryFieldIndex ?? Number.MAX_SAFE_INTEGER);
      }
    });
  });

  return [...keySet].sort((a, b) => indexMap.get(a) - indexMap.get(b));
}

// Generate Payroll Statutory Report Excel
async function generatePayrollStatutoryExcel(
  reportData,
  companyData,
  monthFormatted,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('EmployeePayrollStatutory');

  // Define columns - matching the exact format from sample
  const columns = [
    { header: 'Employee Code', key: 'employeeCode', width: 15 },
    { header: 'Employee Name', key: 'displayName', width: 20 },
    { header: 'Mobile No', key: 'mobileNo', width: 15 },
    { header: 'Gender', key: 'gender', width: 12 },
    { header: 'Joining Date', key: 'joiningDate', width: 15 },
    { header: 'Branch', key: 'branch', width: 15 },
    { header: 'Department', key: 'department', width: 15 },
    { header: 'Designation', key: 'designation', width: 15 },
    { header: 'Division', key: 'division', width: 15 },
    { header: 'WorkingArea', key: 'workingArea', width: 15 },
    { header: 'Pan Number', key: 'panNumber', width: 15 },
    { header: 'Account No', key: 'accountNo', width: 15 },
    { header: 'IFSC No', key: 'ifscNo', width: 15 },
    { header: 'ESIC No', key: 'esicNo', width: 15 },
    { header: 'UAN No', key: 'uanNo', width: 15 },
    { header: 'Paid Days', key: 'paidDays', width: 12 },
    { header: 'UnPaid Days', key: 'unpaidDays', width: 12 },
    { header: 'Total Days', key: 'totalDays', width: 12 },
    { header: 'Actual Gross Salary', key: 'actualGrossSalary', width: 18 },
  ];

  // Get all unique earning, deduction, and employer contribution keys
  // Controller already excludes Gross (ID=50), Net Salary (ID=92), and CTC (ID=1)

  const earningKeys = collectKeysAndIndexes(reportData, 'earnings');
  const deductionKeys = collectKeysAndIndexes(reportData, 'deductions');
  const employerKeys = collectKeysAndIndexes(
    reportData,
    'employerContributions',
  );

  // Add earning columns
  earningKeys.forEach((key) => {
    columns.push({ header: key, key: `earning_${key}`, width: 15 });
  });

  // Add Gross Earning Salary as separate column
  columns.push({
    header: 'Gross Earning Salary',
    key: 'grossSalary',
    width: 18,
  });

  // Add deduction columns
  deductionKeys.forEach((key) => {
    columns.push({ header: key, key: `deduction_${key}`, width: 15 });
  });

  // Add Total Deduction and Net Payable as separate columns
  columns.push({
    header: 'Total Deduction',
    key: 'totalDeductions',
    width: 15,
  });
  columns.push({ header: 'Net Payable', key: 'netSalary', width: 15 });

  // Add employer contribution columns
  employerKeys.forEach((key) => {
    columns.push({ header: key, key: `employer_${key}`, width: 15 });
  });

  // Add CTC as separate column
  columns.push({ header: 'CTC', key: 'ctc', width: 15 });

  worksheet.columns = columns;

  // Add data rows
  reportData.forEach((row) => {
    const excelRow = {
      employeeCode: row.employeeCode,
      displayName: row.displayName,
      mobileNo: row.mobileNo,
      gender: row.gender,
      joiningDate: row.joiningDate,
      branch: row.branch,
      department: row.department,
      designation: row.designation,
      division: row.division,
      workingArea: row.workingArea,
      panNumber: row.panNumber,
      accountNo: row.accountNo,
      ifscNo: row.ifscNo,
      esicNo: row.esicNo,
      uanNo: row.uanNo,
      paidDays: row.paidDays,
      unpaidDays: row.unpaidDays,
      totalDays: row.totalDays,
      actualGrossSalary: row.actualGrossSalary,
    };

    // Add earnings
    earningKeys.forEach((key) => {
      excelRow[`earning_${key}`] = row.earnings[key] || 0;
    });

    excelRow.grossSalary = row.grossSalary;

    // Add deductions
    deductionKeys.forEach((key) => {
      excelRow[`deduction_${key}`] = row.deductions[key] || 0;
    });

    excelRow.totalDeductions = row.totalDeductions;
    excelRow.netSalary = row.netSalary;

    // Add employer contributions
    employerKeys.forEach((key) => {
      excelRow[`employer_${key}`] = row.employerContributions[key] || 0;
    });

    excelRow.ctc = row.ctc;

    worksheet.addRow(excelRow);
  });

  // Add Total row
  const totalRow = {
    employeeCode: '',
    displayName: 'Total',
    mobileNo: '',
    gender: '',
    joiningDate: '',
    branch: '',
    department: '',
    designation: '',
    division: '',
    workingArea: '',
    salaryType: '',
    panNumber: '',
    accountNo: '',
    ifscNo: '',
    esicNo: '',
    uanNo: '',
    paidDays: reportData.reduce((sum, row) => sum + row.paidDays, 0),
    unpaidDays: reportData.reduce((sum, row) => sum + row.unpaidDays, 0),
    weekOff: reportData.reduce((sum, row) => sum + row.weekOff, 0),
    attendancePenalty: reportData.reduce(
      (sum, row) => sum + row.attendancePenalty,
      0,
    ),
    totalDays: reportData.reduce((sum, row) => sum + row.totalDays, 0),
    monthDays: '',
    actualGrossSalary: reportData.reduce(
      (sum, row) => sum + row.actualGrossSalary,
      0,
    ),
  };

  // Add earning totals
  earningKeys.forEach((key) => {
    totalRow[`earning_${key}`] = reportData.reduce(
      (sum, row) => sum + (row.earnings[key] || 0),
      0,
    );
  });

  totalRow.grossSalary = reportData.reduce(
    (sum, row) => sum + row.grossSalary,
    0,
  );

  // Add deduction totals
  deductionKeys.forEach((key) => {
    totalRow[`deduction_${key}`] = reportData.reduce(
      (sum, row) => sum + (row.deductions[key] || 0),
      0,
    );
  });

  totalRow.totalDeductions = reportData.reduce(
    (sum, row) => sum + row.totalDeductions,
    0,
  );
  totalRow.netSalary = reportData.reduce((sum, row) => sum + row.netSalary, 0);

  // Add employer contribution totals
  employerKeys.forEach((key) => {
    totalRow[`employer_${key}`] = reportData.reduce(
      (sum, row) => sum + (row.employerContributions[key] || 0),
      0,
    );
  });

  totalRow.ctc = reportData.reduce((sum, row) => sum + row.ctc, 0);

  worksheet.addRow(totalRow);

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Style total row
  const lastRow = worksheet.lastRow;
  lastRow.font = { bold: true };
  lastRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE4B5' },
  };

  return await workbook.xlsx.writeBuffer();
}

async function generatePerDaySalaryFormat2(employeesData, res) {
  const DAY_HEADERS = [
    'Date',
    'Day',
    'Shift Timing (From - To)',
    'In - Out',
    'Shift Time(Hrs.)',
    'Status',
    'Working Hours',
    'OT Hours',
    'Pay per Day (Gross)',
    'Salary Amount',
    'OT Amount',
    'Payable for the day (Gross)',
  ];

  const THIN_BORDER = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const BOLD = { bold: true };

  // Converts a Date object or a string in any of the given formats to 'DD-MM-YYYY'.
  // Leaves unparseable values untouched instead of throwing.
  const toDDMMYYYY = (value) => {
    if (!value) return '';

    const parsed = moment(
      value,
      ['YYYY-MM-DD', 'DD-MM-YYYY', moment.ISO_8601],
      true,
    );
    return parsed.isValid() ? parsed.format('DD-MM-YYYY') : value;
  };

  // Writes a bold "label: value" info row across a few cells so it reads
  // cleanly without needing merged cells in streaming mode.
  const addInfoRow = (worksheet, pairs) => {
    const cells = [];
    pairs.forEach(([label, value]) => {
      cells.push(`${label}: ${value ?? ''}`);
      cells.push(''); // spacer column between label groups
    });
    const row = worksheet.addRow(cells);
    row.eachCell((cell) => {
      cell.font = BOLD;
    });
    return row;
  };

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true,
  });

  const worksheet = workbook.addWorksheet('Per Day Salary Report');

  worksheet.columns = [
    { width: 14 }, // Date
    { width: 12 }, // Day
    { width: 24 }, // Shift Timing
    { width: 30 }, // In - Out
    { width: 15 }, // Shift Hrs
    { width: 10 }, // Status
    { width: 14 }, // Working Hours
    { width: 12 }, // OT Hours
    { width: 18 }, // Pay per Day (Gross)
    { width: 14 }, // Salary Amount
    { width: 12 }, // OT Amount
    { width: 22 }, // Payable for the day (Gross)
  ];

  employeesData.forEach((emp) => {
    // ---- Employee heading block ----
    addInfoRow(worksheet, [
      ['Employee Code', emp['Employee Code']],
      ['Employee Name', emp['Employee Name']],
      ['Number', emp['Number']],
    ]);
    addInfoRow(worksheet, [
      ['Branch', emp['Branch']],
      ['Department', emp['Department']],
      ['Designation', emp['Designation']],
    ]);

    worksheet.addRow([]); // spacer

    // ---- Column header row ----
    const headerRow = worksheet.addRow(DAY_HEADERS);
    headerRow.eachCell((cell) => {
      cell.font = BOLD;
      cell.border = THIN_BORDER;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });

    // ---- Daily rows ----
    (emp.datesArray || []).forEach((d) => {
      const row = worksheet.addRow([
        toDDMMYYYY(d.date),
        d.day,
        d.shiftTiming,
        d.InOut,
        d.shiftHrs,
        d.Status,
        d.workingHrs,
        d['OT Hrs'],
        d.perDaySlary,
        d.Salary,
        d['OT Amount'],
        d['Total Salary'],
      ]);
      row.eachCell((cell) => {
        cell.border = THIN_BORDER;
      });
    });

    // ---- Totals row (from userWiseTotalSalary[0]) ----
    const totals =
      (emp.userWiseTotalSalary && emp.userWiseTotalSalary[0]) || {};
    const totalRow = worksheet.addRow([
      '',
      '',
      '',
      'Total',
      '',
      '',
      totals.workingHrs || '',
      totals['OT Hrs'] || '',
      '',
      totals.Salary || '',
      totals['OT Amount'] || '',
      totals['Total Salary'] || '',
    ]);
    totalRow.eachCell((cell) => {
      cell.font = BOLD;
      cell.border = THIN_BORDER;
    });

    // spacer rows between employees
    worksheet.addRow([]);
    worksheet.addRow([]);
  });

  worksheet.commit();
  await workbook.commit();
}

const BORDER_THIN = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

async function generatePerDaySalaryFormat1(
  finalData,
  res,
  companyData,
  divisionSummary,
  allDates,
  formattedStartDate,
  formattedEndDate,
) {
  // Generate Excel with Streaming
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: true,
  });

  const worksheet = workbook.addWorksheet('Per Day Salary Report');

  // ✅ SET COLUMN WIDTHS FIRST (before any data)
  // Calculate total columns needed
  const fixedColumnCount = 11;
  const totalColumns = fixedColumnCount + allDates.length * 5 + 3;

  // Define all columns with default widths
  const columns = [];
  for (let i = 0; i < totalColumns; i++) {
    if (i === 1) {
      // Employee Name column (index 1)
      columns.push({ width: 20 });
    } else if (i < fixedColumnCount) {
      // Other fixed columns
      columns.push({ width: 15 });
    } else {
      // Date columns and total columns
      columns.push({ width: 12 });
    }
  }
  worksheet.columns = columns;

  // Get company info
  const companyName = companyData?.companyName || '';
  const companyAddress = companyData?.companyAddress || '';

  // Get divisions with data (sorted)
  const divisionsWithData = Object.keys(divisionSummary)
    .filter((d) => divisionSummary[d].count > 0)
    .sort();

  // Calculate totals from division summary
  const totalEmployee = Object.values(divisionSummary).reduce(
    (acc, d) => acc + d.count,
    0,
  );
  const totalSalary = Object.values(divisionSummary).reduce(
    (acc, d) => acc + d.salary,
    0,
  );
  const totalOTAmount = Object.values(divisionSummary).reduce(
    (acc, d) => acc + d.otAmount,
    0,
  );
  const grandTotalSalary = Object.values(divisionSummary).reduce(
    (acc, d) => acc + d.totalSalary,
    0,
  );

  const dateRangeText = `${formattedStartDate} to ${formattedEndDate}`;

  // Row 1: Company Name (Center aligned, merged)
  worksheet.mergeCells(1, 1, 1, totalColumns);
  const companyNameCell = worksheet.getCell(1, 1);
  companyNameCell.value = companyName;
  companyNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
  companyNameCell.font = { bold: true, size: 16 };
  worksheet.getRow(1).height = 25;

  // Row 2: Company Address (Center aligned, merged)
  worksheet.mergeCells(2, 1, 2, totalColumns);
  const companyAddressCell = worksheet.getCell(2, 1);
  companyAddressCell.value = companyAddress;
  companyAddressCell.alignment = { horizontal: 'center', vertical: 'middle' };
  companyAddressCell.font = { size: 12 };
  worksheet.getRow(2).height = 20;

  // Row 3: Empty

  // Row 4: Division Summary Header
  let summaryHeaderRow = ['Date Range'];

  // Employee Count Section
  divisionsWithData.forEach((div) => summaryHeaderRow.push(div));
  summaryHeaderRow.push('Total Employee');

  // Salary Section
  divisionsWithData.forEach((div) => summaryHeaderRow.push(`${div} Salary`));
  summaryHeaderRow.push('Total Salary');

  // OT Amount Section
  divisionsWithData.forEach((div) => summaryHeaderRow.push(`${div} OT`));
  summaryHeaderRow.push('Total OT');

  // Total Salary Section
  divisionsWithData.forEach((div) => summaryHeaderRow.push(`${div} Total`));
  summaryHeaderRow.push('Grand Total');

  const headerRow4 = worksheet.getRow(4);
  summaryHeaderRow.forEach((header, idx) => {
    const cell = headerRow4.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    cell.border = BORDER_THIN;
  });
  headerRow4.commit(); // ✅ Commit row to stream

  // Row 5: Division Summary Values
  let summaryValueRow = [dateRangeText];

  // Employee Count Section
  divisionsWithData.forEach((div) =>
    summaryValueRow.push(divisionSummary[div].count),
  );
  summaryValueRow.push(totalEmployee);

  // Salary Section
  divisionsWithData.forEach((div) =>
    summaryValueRow.push(divisionSummary[div].salary),
  );
  summaryValueRow.push(totalSalary);

  // OT Amount Section
  divisionsWithData.forEach((div) =>
    summaryValueRow.push(divisionSummary[div].otAmount),
  );
  summaryValueRow.push(totalOTAmount);

  // Total Salary Section
  divisionsWithData.forEach((div) =>
    summaryValueRow.push(divisionSummary[div].totalSalary),
  );
  summaryValueRow.push(grandTotalSalary);

  const valueRow5 = worksheet.getRow(5);
  summaryValueRow.forEach((value, idx) => {
    const cell = valueRow5.getCell(idx + 1);
    cell.value = value;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  });
  valueRow5.commit(); // ✅ Commit row to stream

  // Row 6: Empty
  worksheet.getRow(6).commit(); // ✅ Commit empty row

  // Row 7 & 8: Headers with merged cells for fixed columns
  const fixedHeaders = [
    'Employee Code',
    'Employee Name',
    'Number',
    'DOB',
    'Joining Date',
    'Branch',
    'Department',
    'Designation',
    'Division',
    'WorkingArea',
    'Gross Salary',
  ];

  // Merge Row 7 and Row 8 for fixed columns
  fixedHeaders.forEach((header, idx) => {
    const colNum = idx + 1;

    // Merge row 7 and row 8 for fixed columns
    worksheet.mergeCells(7, colNum, 8, colNum);

    const cell = worksheet.getCell(7, colNum);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.border = BORDER_THIN;
  });

  // Date headers with merged cells (5 columns each) - Row 7
  allDates.forEach((date, index) => {
    const startCol = fixedColumnCount + 1 + index * 5;
    const endCol = startCol + 4;

    worksheet.mergeCells(7, startCol, 7, endCol);
    const dateCell = worksheet.getCell(7, startCol);
    dateCell.value = moment(date).format('DD-MM-YYYY');
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.font = { bold: true };
    dateCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB4C7E7' },
    };
    dateCell.border = BORDER_THIN;
  });

  // Total header (merge 3 columns) - Row 7
  const totalStartCol = fixedColumnCount + 1 + allDates.length * 5;
  const totalEndCol = totalStartCol + 2;

  worksheet.mergeCells(7, totalStartCol, 7, totalEndCol);
  const totalHeaderCell = worksheet.getCell(7, totalStartCol);
  totalHeaderCell.value = 'TOTAL';
  totalHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalHeaderCell.font = { bold: true };
  totalHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' },
  };
  totalHeaderCell.border = BORDER_THIN;

  worksheet.getRow(7).commit(); // ✅ Commit row 7

  // Row 8: Sub-Headers (ONLY for date and total columns)
  const headerRow8 = worksheet.getRow(8);
  let subHeaderColIndex = fixedColumnCount + 1;

  // Add date-wise sub-headers
  allDates.forEach(() => {
    const dateSubHeaders = ['Status', 'Salary', 'OT Hrs', 'OT Amount', 'Total'];

    dateSubHeaders.forEach((header) => {
      const cell = headerRow8.getCell(subHeaderColIndex);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.border = BORDER_THIN;
      subHeaderColIndex++;
    });
  });

  // Add total sub-headers
  const totalSubHeaders = ['Salary', 'OT Amount', 'Total Salary'];
  totalSubHeaders.forEach((header) => {
    const cell = headerRow8.getCell(subHeaderColIndex);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.border = BORDER_THIN;
    subHeaderColIndex++;
  });

  headerRow8.commit(); // ✅ Commit row 8

  // Row 9 onwards: Employee Data
  let currentRow = 9;

  for (const emp of finalData) {
    const row = worksheet.getRow(currentRow);
    let colIndex = 1;

    // Fixed employee details
    const fixedData = [
      emp['Employee Code'],
      emp['Employee Name'],
      emp['Number'],
      emp['DOB'],
      emp['Joining Date'],
      emp['Branch'],
      emp['Department'],
      emp['Designation'],
      emp['Division'],
      emp['WorkingArea'],
      emp['Gross Salary'],
    ];

    fixedData.forEach((value) => {
      const cell = row.getCell(colIndex);
      cell.value = value ?? '';
      cell.border = BORDER_THIN;
      colIndex++;
    });

    // Date-wise data (exclude 'Total')
    const dateData = emp.datesArray.filter((d) => d.date !== 'Total');
    dateData.forEach((dateObj) => {
      const dateValues = [
        dateObj.Status,
        dateObj.Salary,
        dateObj['OT Hrs'],
        dateObj['OT Amount'],
        dateObj['Total Salary'],
      ];

      dateValues.forEach((value) => {
        const cell = row.getCell(colIndex);
        cell.value = value ?? '';
        cell.border = BORDER_THIN;
        colIndex++;
      });
    });

    // Total data (only the item where date === 'Total')
    const totalData = emp.userWiseTotalSalary?.[0];
    if (totalData) {
      const totalValues = [
        totalData.Salary,
        totalData['OT Amount'],
        totalData['Total Salary'],
      ];

      totalValues.forEach((value) => {
        const cell = row.getCell(colIndex);
        cell.value = value ?? 0;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
        cell.border = BORDER_THIN;
        colIndex++;
      });
    }

    row.commit(); // ✅ Commit each employee row immediately
    currentRow++;
  }

  // Last Row: Column Totals
  const totalRow = worksheet.getRow(currentRow);

  // Merge first 11 columns for "Total" label
  worksheet.mergeCells(currentRow, 1, currentRow, fixedColumnCount);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'Total';
  totalLabelCell.font = { bold: true };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totalLabelCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' },
  };

  // Apply borders to all merged cells
  for (let i = 1; i <= fixedColumnCount; i++) {
    const cell = totalRow.getCell(i);
    cell.border = BORDER_THIN;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
  }

  let totalColIndex = fixedColumnCount + 1;

  // Calculate column totals for each date
  allDates.forEach((date, dateIndex) => {
    let dateSalarySum = 0;
    let dateOTSum = 0;
    let dateTotalSum = 0;

    finalData.forEach((emp) => {
      const dateData = emp.datesArray.filter((d) => d.date !== 'Total');
      if (dateData[dateIndex]) {
        dateSalarySum += +(dateData[dateIndex].Salary || 0);
        dateOTSum += +(dateData[dateIndex]['OT Amount'] || 0);
        dateTotalSum += +(dateData[dateIndex]['Total Salary'] || 0);
      }
    });

    // Status column - empty
    const statusCell = totalRow.getCell(totalColIndex);
    statusCell.value = '';
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    statusCell.border = BORDER_THIN;
    totalColIndex++;

    // Salary column
    const salaryCell = totalRow.getCell(totalColIndex);
    salaryCell.value = dateSalarySum.toFixed(2);
    salaryCell.font = { bold: true };
    salaryCell.alignment = { horizontal: 'right', vertical: 'middle' };
    salaryCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    salaryCell.border = BORDER_THIN;
    totalColIndex++;

    // OT Hrs column - empty
    const otHrsCell = totalRow.getCell(totalColIndex);
    otHrsCell.value = '';
    otHrsCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    otHrsCell.border = BORDER_THIN;
    totalColIndex++;

    // OT Amount column
    const otAmountCell = totalRow.getCell(totalColIndex);
    otAmountCell.value = dateOTSum.toFixed(2);
    otAmountCell.font = { bold: true };
    otAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };
    otAmountCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    otAmountCell.border = BORDER_THIN;
    totalColIndex++;

    // Total column
    const totalCell = totalRow.getCell(totalColIndex);
    totalCell.value = dateTotalSum.toFixed(2);
    totalCell.font = { bold: true };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };
    totalCell.border = BORDER_THIN;
    totalColIndex++;
  });

  // Grand totals (from division summary)
  const grandTotalValues = [totalSalary, totalOTAmount, grandTotalSalary];

  grandTotalValues.forEach((value) => {
    const cell = totalRow.getCell(totalColIndex);
    cell.value = value.toFixed(2);
    cell.font = { bold: true, size: 12 };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF6B6B' },
    };
    cell.border = BORDER_THIN;
    totalColIndex++;
  });

  totalRow.commit(); // ✅ Commit total row

  // ✅ Commit the workbook (this writes to the response stream)
  await workbook.commit();
}
const generateVisitAuthExcelWithAuthorizers = async (
  data,
  fileName,
  fileType,
  res,
  config = {},
) => {
  if (!data.length) {
    return res.status(200).json({ status: 201, message: 'no data found' });
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    // Columns that are the SAME for every authorizer row of a given tour
    // -> these get merged vertically
    const commonColumns = Object.keys(data[0]).filter(
      (key) => key !== 'authorizers',
    );

    // Columns that differ per authorizer -> one value per row, no merge
    const authorizerColumns = ['AuthorizerName', 'AuthorizerStatus'];

    workSheet.columns = [
      ...commonColumns.map((key) => ({
        header: formatHeaderLabel(key),
        key,
        width: 20,
      })),
      ...authorizerColumns.map((key) => ({
        header: formatHeaderLabel(key),
        key,
        width: 20,
      })),
    ];

    let currentRow = 2; // row 1 is the header

    data.forEach((item) => {
      // Normalize: if no authorizers, still emit exactly one row
      const authorizers =
        Array.isArray(item.authorizers) && item.authorizers.length
          ? item.authorizers
          : [null];

      const startRow = currentRow;

      authorizers.forEach((auth) => {
        const row = workSheet.getRow(currentRow);

        commonColumns.forEach((key) => {
          const rawValue = item[key] ?? '';
          row.getCell(key).value =
            key === 'status'
              ? (MasterStatusLabel[rawValue] ?? rawValue)
              : rawValue;
        });

        row.getCell('AuthorizerName').value =
          auth?.authPerson?.displayName || '';
        row.getCell('AuthorizerStatus').value =
          AuthStatusLabel[auth?.authStatus] ?? '';

        currentRow += 1;
      });

      const endRow = currentRow - 1;

      // Merge the common columns vertically only if this tour spanned >1 row
      if (endRow > startRow) {
        commonColumns.forEach((key) => {
          const column = workSheet.getColumn(key);
          workSheet.mergeCells(
            `${column.letter}${startRow}:${column.letter}${endRow}`,
          );
          workSheet.getCell(`${column.letter}${startRow}`).alignment = {
            vertical: 'middle',
            wrapText: true,
          };
        });
      }
    });

    // Style header row - blue fill, white bold text
    const headerRow = workSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }, // dark blue - change to taste
      };
    });
    headerRow.height = 20;

    // Add a thin border to every used cell so merged blocks look clean
    workSheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    if (config?.saveToFile && config?.filePath) {
      await workBook.xlsx.writeFile(config.filePath);
      return config.filePath;
    }

    res.attachment(`${fileName}.${fileType}`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return fileType === 'csv'
      ? await workBook.csv.write(res)
      : await workBook.xlsx.write(res);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

async function generateEsicExcel(finaldata, TotalWages, res) {
  const workbook = new ExcelJS.Workbook();

  const esicSheet = workbook.addWorksheet('ESIC');

  const esicHeaders = [
    'IP Number',
    'IP NAME',
    'No of Days for which wages paid/payable during the month',
    'Total Monthly Wages',
    'Reason Code for Zero workings days(numeric only: provide 0 for all other reasns: Click on the link for reference)',
    'Last working day (Format DD/MM/YYYY or DD-MM-YYYY)',
  ];

  esicSheet.columns = [
    { width: 20 },
    { width: 25 },
    { width: 30 },
    { width: 20 },
    { width: 45 },
    { width: 30 },
  ];

  const esicHeaderRow = esicSheet.addRow(esicHeaders);
  esicHeaderRow.height = 30;
  esicHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF729FCF' },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    };
  });

  finaldata.forEach((row) => {
    esicSheet.addRow([
      row['IP Number'],
      row['IP NAME'],
      row['No of Days for which wages paid/payable during the month'],
      row['Total Monthly Wages'],
      '',
      '',
    ]);
  });

  // two blank spacer rows, same as your original logic
  esicSheet.addRow([]);
  esicSheet.addRow([]);

  const esicTotalRow = esicSheet.addRow(['TOTAL', '', '', TotalWages, '', '']);
  esicTotalRow.font = { name: 'Calibri', bold: true };

  // =========================================================
  // SHEET 2 - "Instructions & Reason Codes" (copied as-is from MC_Template)
  // =========================================================
  const instrSheet = workbook.addWorksheet('Instructions & Reason Codes');

  // column widths copied from MC_Template11_10_.xls
  instrSheet.columns = [
    { width: 24.2 },
    { width: 9.2 },
    { width: 80.8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
  ];

  const reasonTableBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  // row 1 - blank spacer (matches template)
  instrSheet.addRow([]);

  // row 2 - table header: Reason | Code | Note
  const reasonHeaderRow = instrSheet.addRow(['Reason', 'Code', 'Note']);
  reasonHeaderRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF99CCFF' },
    };
    cell.border = reasonTableBorder;
    cell.alignment =
      colNumber === 1 ? { horizontal: 'left' } : { horizontal: 'center' };
  });

  // rows 3-16 - reason code table data
  const reasonCodes = [
    ['Without Reason', 0, 'Leave last working day as blank'],
    ['On Leave', 1, 'Leave last working day as blank'],
    [
      'Left Service',
      2,
      'Please provide last working day (dd/mm/yyyy). IP will not appear from next wage period',
    ],
    [
      'Retired',
      3,
      'Please provide last working day (dd/mm/yyyy). IP will not appear from next wage period',
    ],
    [
      'Out of Coverage',
      4,
      'Please provide last working day (dd/mm/yyyy). IP will not appear from next contribution period. This option is valid only if Wage Period is April/October. In case any other month then IP will continue to appear in the list',
    ],
    [
      'Expired',
      5,
      'Please provide last working day (dd/mm/yyyy). IP will not appear from next wage period',
    ],
    [
      'Non Implemented area',
      6,
      'Please provide last working day (dd/mm/yyyy). ',
    ],
    ['Compliance by Immediate Employer', 7, 'Leave last working day as blank'],
    ['Suspension of work', 8, 'Leave last working day as blank'],
    ['Strike/Lockout', 9, 'Leave last working day as blank'],
    [
      'Retrenchment',
      10,
      'Please provide last working day (dd/mm/yyyy). IP will not appear from next wage period',
    ],
    ['No Work', 11, 'Leave last working day as blank'],
    ['Doesnt Belong To This Employer', 12, 'Leave last working day as blank'],
    ['Duplicate IP', 13, 'Leave last working day as blank'],
  ];

  reasonCodes.forEach(([reason, code, note]) => {
    const row = instrSheet.addRow([reason, code, note]);
    row.getCell(1).font = { name: 'Arial', size: 10 };
    row.getCell(2).font = { name: 'Arial', size: 10 };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).border = reasonTableBorder;
    row.getCell(3).font = { name: 'Arial', size: 10 };
  });

  // blank spacer row
  instrSheet.addRow([]);

  // "Click Here to Go back to Data Entry Page" - red, larger font
  const clickRow = instrSheet.addRow([
    'Click Here to Go back to Data Entry Page',
  ]);
  clickRow.getCell(1).font = {
    name: 'Arial',
    size: 16,
    color: { argb: 'FFFF0000' },
  };

  // blank spacer row
  instrSheet.addRow([]);

  // "Instructions to fill in the excel file:" heading
  const instrHeadingRow = instrSheet.addRow([
    'Instructions to fill in the excel file: ',
  ]);
  instrHeadingRow.getCell(1).font = { name: 'Arial', size: 14, bold: true };

  // numbered instructions - each merged across columns A:G and wrapped
  const instructions = [
    "1. Enter the IP number,  IP name, No. of Days, Total Monthly Wages, Reason for 0 wages(If Wages '0') & Last Working Day( only if employee \n     has left service, Retired, Out of coverage, Expired, Non-Implemented area or Retrenchment. For other reasons,  last working day  must be left  BLANK).  ",
    '2. Number of days must me a whole number.  Fractions should be rounded up to next higher whole number/integer',
    "3. Excel sheet upload will lead to successful transaction only when all the Employees' (who are currently mapped in the system) details\n      are entered perfectly in the excel sheet",
    '4. Reasons are to be assigned numeric code  and date has to be provided as mentioned in the table above',
    "5. Once  0 wages given and last working day is mentioned as in reason codes (2,3,4,5,10)  IP will be removed from the employer's record. Subsequent months will not have this IP listed under the employer. Last working day should be mentioned only if 'Number of days wages paid/payable' is '0'.",
    "6. In case IP has worked for part of the month(i.e. atleast 1 day wage is paid/payable) and left in between of the month, then last working day shouldn't be mentioned.",
    '7. Calculations – IP Contribution and Employer contribution calculation will be automatically done by the system',
    '8. Date  column format is  dd/mm/yyyy or dd-mm-yyyy.  Pad single digit dates with 0.  Eg:- 2/5/2010  or  2-May-2010 is NOT acceptable.  Correct format  is 02/05/2010  \n    or 02-05-2010',
    '9. Excel file should be saved in .xls format (Excel 97-2003)',
    "10. Note that all the column including date column should be in 'Text' format",
    '10a. To convert  all columns to text,',
    '      a.  Select column A; Click Data in Menu Bar on top;  Select Text to Columns ; Click Next (keep default selection of Delimited);  Click \n           Next (keep default selection of Tab); Select  TEXT;  Click FINISH.  Excel 97 – 2003 as well have TEXT to COLUMN  conversion\n            facility',
    '      b.  Repeat the above step for each of the 6 columns. (Columns A – F )',
    '10b.   Another method that can be used to text conversion is – copy the column with data and paste it in NOTEPAD.  Select the column (in \n        excel) and convert to text. Copy the data back from notepad to excel',
    "11.   If problem continues while upload,  download a fresh template by clicking 'Sample MC Excel Template'. Then copy the data area from \n       Step 8a.a – eg:  copy Cell A2 to F8 (if there is data in 8 rows); Paste it in cell A2 in the fresh template. Upload it ",
  ];

  instructions.forEach((text) => {
    const row = instrSheet.addRow([text]);
    const rowNum = row.number;
    instrSheet.mergeCells(rowNum, 1, rowNum, 7);
    row.getCell(1).font = { name: 'Arial', size: 10 };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  });

  // blank spacer row
  instrSheet.addRow([]);

  const popupNote = [
    "Note :   Kindly turn  OFF   'POP UP BLOCKER'  if it is ON in your  browser.  Follow the steps given to turn off  pop up blocker . \n                 This  is required to  upload Monthly contribution,  view or print  Challan /  TIC after uploading the excel   ",
    "              1.Mozilla Firefox  3.5.11 :  From Menu Bar, select  Tools => Options => Content => Uncheck (remove tick mark)\n                       'Block Popup Windows'.   Click OK",
    '              2.  IE 7.0  :     From Menu Bar, select  Tools => Pop up Blocker => Turn Off Pop up Blocker ',
  ];

  popupNote.forEach((text) => {
    const row = instrSheet.addRow([text]);
    const rowNum = row.number;
    instrSheet.mergeCells(rowNum, 1, rowNum, 7);
    row.getCell(1).font = { name: 'Arial', size: 10 };
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  });

  // =========================================================
  // stream workbook to response
  // =========================================================
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', 'attachment; filename=ESIC.xlsx');

  await workbook.xlsx.write(res);
  res.end();
}

const generateExcelForAttritionReport = async (filters, res) => {
  const Excel = require('exceljs');
  const workBook = new Excel.Workbook();

  const startMonthStr = filters.StartMonth || '';
  const endMonthStr = filters.EndMonth || '';

  const sortByMonth = (a, b) =>
    moment(a.Month, 'MMM YYYY').valueOf() -
    moment(b.Month, 'MMM YYYY').valueOf();

  if (filters.joinData) filters.joinData.sort(sortByMonth);
  if (filters.leftData) filters.leftData.sort(sortByMonth);
  if (filters.onLeaveData) filters.onLeaveData.sort(sortByMonth);
  if (filters.transferInData) filters.transferInData.sort(sortByMonth);
  if (filters.transferOutData) filters.transferOutData.sort(sortByMonth);

  // 1) "Summary" worksheet
  const formattedStart = startMonthStr
    ? moment(startMonthStr, 'YYYY-MM').format('MMM YYYY')
    : '';
  const formattedEnd = endMonthStr
    ? moment(endMonthStr, 'YYYY-MM').format('MMM YYYY')
    : '';
  const summaryTitleText =
    formattedStart && formattedEnd
      ? `Summary of ${formattedStart} to ${formattedEnd}`
      : `Summary`;

  const summarySheetName = summaryTitleText;
  const summarySheet = workBook.addWorksheet(
    summarySheetName.substring(0, 31),
    { views: [{ state: 'frozen', ySplit: 2 }] },
  );

  const summaryColumns = [
    'Month',
    'Opening Strength',
    'Join',
    ...(filters.branchMasterID ? ['Transfer In', 'Transfer Out'] : []),
    'Left',
    'On Leave',
    'Closing Strength',
    'Salary Register',
  ];

  summarySheet.addRow([summaryTitleText]);
  summarySheet.mergeCells(1, 1, 1, summaryColumns.length);

  summarySheet.addRow(summaryColumns);
  if (typeof formatFirstRow === 'function') {
    formatFirstRow(summarySheet, 1);
    formatFirstRow(summarySheet, 2);
  }

  // Add borders to separate header rows
  for (let col = 1; col <= summaryColumns.length; col++) {
    summarySheet.getRow(1).getCell(col).border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }

  summarySheet.columns = [
    { width: 15 },
    { width: 18 },
    { width: 10 },
    ...(filters.branchMasterID ? [{ width: 12 }, { width: 12 }] : []),
    { width: 10 },
    { width: 10 },
    { width: 18 },
    { width: 18 },
  ];

  const summaryData = filters.summaryData || [];

  let totalJoin = 0;
  let totalTransferIn = 0;
  let totalTransferOut = 0;
  let totalLeft = 0;
  let totalOnLeave = 0;
  let totalSalaryRegister = 0;

  summaryData.forEach((row) => {
    totalJoin += row.Join || 0;
    totalTransferIn += row.TransferIn || 0;
    totalTransferOut += row.TransferOut || 0;
    totalLeft += row.Left || 0;
    totalOnLeave += row.OnLeave || 0;
    totalSalaryRegister += row.SalaryRegister || 0;

    summarySheet.addRow([
      row.Month,
      row.OpeningStrength,
      row.Join,
      ...(filters.branchMasterID ? [row.TransferIn, row.TransferOut] : []),
      row.Left,
      row.OnLeave,
      row.ClosingStrength,
      row.SalaryRegister,
    ]);
  });

  if (summaryData.length > 0) {
    const totalRow = summarySheet.addRow([
      'TOTAL',
      '',
      totalJoin,
      ...(filters.branchMasterID ? [totalTransferIn, totalTransferOut] : []),
      totalLeft,
      totalOnLeave,
      '',
      totalSalaryRegister,
    ]);
    totalRow.font = { bold: true };
  }

  // Center align the merged header row
  const firstRow = summarySheet.getRow(1);
  firstRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Helper to create detail sheets to avoid repetitive code
  const createDetailSheet = (sheetName, data, dateColumnName) => {
    const sheet = workBook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.addRow([
      'Sr.No',
      'Month',
      'Status',
      'Employee Code',
      'Name',
      dateColumnName,
      'Branch',
      'Department',
      'Designation',
      'Division',
      'Working Area',
    ]);
    if (typeof formatFirstRow === 'function') formatFirstRow(sheet, 1);

    sheet.columns = [
      { width: 8 },
      { width: 15 },
      { width: 12 },
      { width: 18 },
      { width: 25 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
      { width: 20 },
      { width: 20 },
    ];

    (data || []).forEach((row, index) => {
      sheet.addRow([
        index + 1,
        row.Month,
        row.Status,
        row.EmployeeCode,
        row.Name,
        row.Date,
        row.Branch,
        row.Department,
        row.Designation,
        row.Division,
        row.WorkingArea,
      ]);
    });
  };

  createDetailSheet('Join', filters.joinData, 'Joining Date');
  createDetailSheet('Left', filters.leftData, 'Left Date');
  createDetailSheet('On Leave', filters.onLeaveData, 'Month');

  if (filters.branchMasterID) {
    createDetailSheet(
      'Transfer In',
      filters.transferInData,
      'Transfer In Date',
    );
    createDetailSheet(
      'Transfer Out',
      filters.transferOutData,
      'Transfer Out Date',
    );
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',

    'attachment; filename=Attrition_Report.xlsx',
  );

  await workBook.xlsx.write(res);
  res.end();
};

const generateExcelForEmployeeSalaryAndHeadcountReport = async (
  filters,
  res,
) => {
  const Excel = require('exceljs');
  const moment = require('moment');
  const workBook = new Excel.Workbook();

  const startMonthStr = filters.startMonth || '';
  const endMonthStr = filters.endMonth || '';

  const formattedStart = startMonthStr
    ? moment(startMonthStr, 'YYYY-MM').format('MMM YYYY')
    : '';
  const formattedEnd = endMonthStr
    ? moment(endMonthStr, 'YYYY-MM').format('MMM YYYY')
    : '';
  const titleText =
    formattedStart && formattedEnd
      ? `${formattedStart} - ${formattedEnd}`
      : `Employee Salary And Headcount Report`;

  // Sheet 1: Salary Data
  const salarySheet = workBook.addWorksheet('Salary Data', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  salarySheet.addRow([titleText]);
  salarySheet.mergeCells(1, 1, 1, 7);
  salarySheet.getRow(1).getCell(1).alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  salarySheet.getRow(1).getCell(1).font = { bold: true };
  if (typeof formatFirstRow === 'function') formatFirstRow(salarySheet, 1);

  salarySheet.addRow([
    'Month',
    'On Roll',
    '',
    'Contract Workers',
    '',
    'Total',
    '',
  ]);
  salarySheet.addRow([
    '',
    'Strength',
    'Amount',
    'Strength',
    'Amount',
    'Total Strength',
    'Total Amount',
  ]);

  salarySheet.mergeCells(2, 1, 3, 1); // Month
  salarySheet.mergeCells(2, 2, 2, 3); // On Roll
  salarySheet.mergeCells(2, 4, 2, 5); // Contract Workers
  salarySheet.mergeCells(2, 6, 2, 7); // Total

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF5B38B' }, // Light orange background
  };

  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F2F8' }, // Light blue background
  };

  ['A2', 'B2', 'D2', 'F2'].forEach((cell) => {
    const c = salarySheet.getCell(cell);
    c.fill = headerFill;
    c.font = { bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  ['B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach((cell) => {
    const c = salarySheet.getCell(cell);
    c.fill = subHeaderFill;
    c.font = { bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  salarySheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  if (filters.salarySummaryData && filters.salarySummaryData.length > 0) {
    let totalOnRollStrength = 0;
    let totalOnRollAmount = 0;
    let totalContractStrength = 0;
    let totalContractAmount = 0;
    let grandTotalStrength = 0;
    let grandTotalAmount = 0;

    filters.salarySummaryData.forEach((row) => {
      salarySheet.addRow([
        row.month,
        row.onRollStrength || 0,
        row.onRollAmount || 0,
        row.contractStrength || 0,
        row.contractAmount || 0,
        row.totalStrength || 0,
        row.totalAmount || 0,
      ]);

      totalOnRollStrength += row.onRollStrength || 0;
      totalOnRollAmount += row.onRollAmount || 0;
      totalContractStrength += row.contractStrength || 0;
      totalContractAmount += row.contractAmount || 0;
      grandTotalStrength += row.totalStrength || 0;
      grandTotalAmount += row.totalAmount || 0;
    });

    const monthCount = filters.salarySummaryData.length;
    const avgOnRollStrength = monthCount
      ? Number((totalOnRollStrength / monthCount).toFixed(2))
      : 0;
    const avgContractStrength = monthCount
      ? Number((totalContractStrength / monthCount).toFixed(2))
      : 0;
    const avgGrandTotalStrength = monthCount
      ? Number((grandTotalStrength / monthCount).toFixed(2))
      : 0;

    const lastRow = salarySheet.addRow([
      'Summary',
      avgOnRollStrength,
      totalOnRollAmount,
      avgContractStrength,
      totalContractAmount,
      avgGrandTotalStrength,
      grandTotalAmount,
    ]);
    lastRow.font = { bold: true };
    lastRow.getCell(1).alignment = { horizontal: 'right' };
  }

  // Sheet 2: HC Summary
  const hcSummarySheet = workBook.addWorksheet('HC Summary', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });
  const hcTitle = `Head Count Progress - ${titleText}`;
  hcSummarySheet.addRow([hcTitle]);

  // Create months array
  const months = [];
  const fullMonthStrs = []; // Used to match keys from hcSummaryData
  if (startMonthStr && endMonthStr) {
    let curr = moment(startMonthStr, 'YYYY-MM');
    const end = moment(endMonthStr, 'YYYY-MM');
    while (curr.isSameOrBefore(end, 'month')) {
      months.push(curr.format('MMM-YY'));
      fullMonthStrs.push(curr.format('MMM YYYY'));
      curr.add(1, 'month');
    }
  }

  hcSummarySheet.mergeCells(1, 1, 1, months.length + 2);
  hcSummarySheet.getRow(1).getCell(1).alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  hcSummarySheet.getRow(1).getCell(1).font = { bold: true };
  if (typeof formatFirstRow === 'function') formatFirstRow(hcSummarySheet, 1);

  const hcHeaders = [
    'Department Name',
    ...months,
    `AVG ${formattedStart} - ${formattedEnd}`,
  ];
  hcSummarySheet.addRow(hcHeaders);

  hcSummarySheet.getRow(2).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  hcSummarySheet.columns = [
    { width: 30 },
    ...months.map(() => ({ width: 15 })),
    { width: 25 },
  ];

  if (filters.hcSummaryData && Object.keys(filters.hcSummaryData).length > 0) {
    const deptNames = Object.keys(filters.hcSummaryData).sort();

    // To track totals for each month
    const monthTotals = Array(fullMonthStrs.length).fill(0);

    deptNames.forEach((dept) => {
      const deptData = filters.hcSummaryData[dept];
      let rowTotal = 0;

      const rowData = fullMonthStrs.map((mStr, idx) => {
        const count = deptData[mStr] || 0;
        rowTotal += count;
        monthTotals[idx] += count;
        return count; // Output 0 instead of empty string
      });

      const avg =
        fullMonthStrs.length > 0
          ? Number((rowTotal / fullMonthStrs.length).toFixed(2))
          : 0;
      hcSummarySheet.addRow([dept, ...rowData, avg]);
    });

    // Add Total Row
    let grandTotal = 0;
    const finalMonthTotals = monthTotals.map((t) => {
      grandTotal += t;
      return t;
    });
    const grandAvg =
      fullMonthStrs.length > 0
        ? Number((grandTotal / fullMonthStrs.length).toFixed(2))
        : 0;

    const lastHcRow = hcSummarySheet.addRow([
      'Total',
      ...finalMonthTotals,
      grandAvg,
    ]);
    lastHcRow.font = { bold: true };
    lastHcRow.getCell(1).alignment = { horizontal: 'right' };
  }

  // Sheet 3: Monthly HC
  const monthlyHcSheet = workBook.addWorksheet('Monthly HC', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const monthlyHcHeaders = [
    'Sr. no',
    'Month',
    'Employee Status',
    'Employee Code',
    'Employee Name',
    'Mobile number',
    'Branch',
    'Department',
    'Designation',
    'Division',
    'Working Area',
    'Projects',
    'Net Salary',
  ];

  monthlyHcSheet.addRow(monthlyHcHeaders);
  if (typeof formatFirstRow === 'function') formatFirstRow(monthlyHcSheet, 1);

  monthlyHcSheet.columns = [
    { width: 8 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 25 },
    { width: 15 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 15 },
  ];

  if (filters.monthlyHcData && filters.monthlyHcData.length > 0) {
    filters.monthlyHcData.forEach((row) => {
      monthlyHcSheet.addRow([
        row.srNo,
        row.month,
        row.status,
        row.employeeCode,
        row.employeeName,
        row.mobileNumber,
        row.branch,
        row.department,
        row.designation,
        row.division,
        row.workingArea,
        row.projects,
        row.netSalary,
      ]);
    });
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=Employee_Salary_And_Headcount_Report.xlsx',
  );

  await workBook.xlsx.write(res);
  res.end();
};
const generateExcelForExpenseReport = async (
  data,
  fileName,
  fileType,
  res,
  config = {},
) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    // =========================================================
    // CONFIG
    // =========================================================

    const attachmentKeys = [
      'Attachment-1',
      'Attachment-2',
      'Attachment-3',
      'Attachment-4',
    ];

    const headerNames = Object.keys(data[0]);

    // false => attachments are written as "View" links (no thumbnails)
    const showThumbnail = config?.showThumbnail !== false;

    // =========================================================
    // COLUMNS
    // =========================================================

    workSheet.columns = headerNames.map((key) => ({
      header: key,
      key,
      width: attachmentKeys.includes(key) ? 18 : 20,
    }));

    // =========================================================
    // HEADER
    // =========================================================

    const headerRow = workSheet.getRow(1);

    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        name: 'Calibri',
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'EBF1DE',
        },
      };

      cell.border = {
        top: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        left: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        bottom: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        right: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
      };
    });

    // =========================================================
    // ADD DATA ROWS
    // =========================================================

    data.forEach((item) => {
      const rowData = {};

      headerNames.forEach((key) => {
        // Attachment object should NOT be written directly
        if (attachmentKeys.includes(key)) {
          rowData[key] = '';
        } else {
          rowData[key] = item[key];
        }
      });

      const row = workSheet.addRow(rowData);

      row.height = 25;
    });

    // =========================================================
    // FRONTEND FILE VIEWER URL
    // =========================================================

    const frontendUrl = (appURL || '').replace(/\/$/, '');

    if (!frontendUrl) {
      throw new Error('HRMS_FRONTEND_URL is not configured');
    }

    // =========================================================
    // ATTACHMENTS
    // =========================================================

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex];

      // Excel row starts from 2 because row 1 is header
      const rowIndex = dataIndex + 2;
      const row = workSheet.getRow(rowIndex);

      // Thumbnail needs more height
      if (showThumbnail) {
        row.height = 90;
      }

      for (const attachmentKey of attachmentKeys) {
        const attachment = item[attachmentKey];

        // =====================================================
        // VALIDATE ATTACHMENT
        // =====================================================

        if (
          !attachment ||
          typeof attachment !== 'object' ||
          !attachment.original
        ) {
          continue;
        }

        try {
          const originalFilePath = attachment.original;

          const isS3Upload = Boolean(attachment.s3UploadattachFile);

          // ===================================================
          // FILE VIEWER TOKEN
          // ===================================================

          const jwtSignedUrl = await getJwtTokenNoExpiryData({
            filePath: originalFilePath,
            isS3Upload,
          });

          const fileViewerUrl = `${fileViewerAppURL}${jwtSignedUrl}`;

          // ===================================================
          // COLUMN
          // ===================================================

          const columnNumber = headerNames.indexOf(attachmentKey) + 1;

          if (columnNumber <= 0) {
            continue;
          }

          const cell = row.getCell(columnNumber);

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };

          // ===================================================
          // GET THUMBNAIL
          // ===================================================

          let thumbnailBase64 = null;

          if (showThumbnail && attachment.thumbnail) {
            if (isS3Upload) {
              // =================================================
              // S3 THUMBNAIL
              // =================================================

              thumbnailBase64 = await getS3File(
                bucketName,
                attachment.thumbnail,
                'base64',
              );
            } else {
              // =================================================
              // LOCAL THUMBNAIL
              // =================================================

              const thumbnailPath = path.join(
                process.cwd(),
                attachment.thumbnail,
              );

              if (fs.existsSync(thumbnailPath)) {
                thumbnailBase64 = fs
                  .readFileSync(thumbnailPath)
                  .toString('base64');
              } else {
                console.warn(`Local thumbnail not found: ${thumbnailPath}`);
              }
            }
          }

          // ===================================================
          // THUMBNAIL EXISTS
          // ===================================================

          if (thumbnailBase64) {
            try {
              const imageBuffer = Buffer.from(thumbnailBase64, 'base64');

              // -----------------------------------------------
              // Validate image
              // -----------------------------------------------

              if (imageBuffer.length < 100) {
                throw new Error('Invalid or corrupted thumbnail');
              }

              // -----------------------------------------------
              // Detect extension
              // -----------------------------------------------

              let extension = 'jpeg';

              // PNG
              if (
                imageBuffer[0] === 0x89 &&
                imageBuffer[1] === 0x50 &&
                imageBuffer[2] === 0x4e &&
                imageBuffer[3] === 0x47
              ) {
                extension = 'png';
              }

              // JPEG
              else if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) {
                extension = 'jpeg';
              }

              // GIF
              else if (
                imageBuffer[0] === 0x47 &&
                imageBuffer[1] === 0x49 &&
                imageBuffer[2] === 0x46
              ) {
                extension = 'gif';
              }

              // WEBP
              else if (
                imageBuffer[0] === 0x52 &&
                imageBuffer[1] === 0x49 &&
                imageBuffer[2] === 0x46 &&
                imageBuffer[3] === 0x46 &&
                imageBuffer[8] === 0x57 &&
                imageBuffer[9] === 0x45
              ) {
                extension = 'webp';
              } else {
                throw new Error('Unsupported thumbnail image format');
              }

              // =================================================
              // ADD IMAGE TO WORKBOOK
              // =================================================

              const imageId = workBook.addImage({
                base64: thumbnailBase64,
                extension,
              });

              // =================================================
              // CLICKABLE THUMBNAIL
              // =================================================

              workSheet.addImage(imageId, {
                tl: {
                  col: columnNumber - 1 + 0.1,
                  row: rowIndex - 1 + 0.05,
                },

                ext: {
                  width: 80,
                  height: 75,
                },

                hyperlinks: {
                  hyperlink: fileViewerUrl,
                  tooltip: 'Click to open original file',
                },
              });

              // Keep cell empty because image occupies it
              cell.value = null;

              cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
              };
            } catch (thumbnailError) {
              console.error(
                `Thumbnail processing failed for ${attachmentKey}, row ${rowIndex}:`,
                thumbnailError.message,
              );

              // =================================================
              // FALLBACK TO VIEW LINK
              // =================================================

              cell.value = {
                text: 'View',
                hyperlink: fileViewerUrl,
              };

              cell.font = {
                color: {
                  argb: 'FF0000FF',
                },
                underline: true,
              };

              cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
              };
            }
          }

          // ===================================================
          // THUMBNAIL NOT AVAILABLE / THUMBNAILS DISABLED
          // ===================================================
          else {
            cell.value = {
              text: 'View',
              hyperlink: fileViewerUrl,
            };

            cell.font = {
              color: {
                argb: 'FF0000FF',
              },
              underline: true,
            };

            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center',
            };
          }
        } catch (error) {
          console.error(
            `Failed to process ${attachmentKey}, row ${rowIndex}:`,
            error.message,
          );
        }
      }
    }

    // =========================================================
    // TOTAL ROW
    // =========================================================

    const totalColumns = (config?.totalColumns || []).filter((key) =>
      headerNames.includes(key),
    );

    let totalRowNumber = null;

    if (totalColumns.length) {
      const totals = {};

      totalColumns.forEach((key) => {
        const columnNumber = headerNames.indexOf(key) + 1;
        let total = 0;

        // Store amounts as numbers so Excel can sum/format them
        for (let rowIndex = 2; rowIndex <= data.length + 1; rowIndex++) {
          const cell = workSheet.getRow(rowIndex).getCell(columnNumber);
          const amount = Number(cell.value);

          if (cell.value !== null && cell.value !== '' && !isNaN(amount)) {
            cell.value = amount;
            total += amount;
          }
        }

        totals[key] = Math.round(total * 100) / 100;
      });

      const totalRow = workSheet.addRow(
        headerNames.map((key, index) => {
          if (totals[key] !== undefined) return totals[key];
          return index === 0 ? 'Total' : '';
        }),
      );

      totalRowNumber = totalRow.number;

      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { bold: true, name: 'Calibri' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'EBF1DE' },
        };
      });
    }

    // =========================================================
    // GENERAL STYLING
    // =========================================================

    const isWrapCell = (cell, colNumber) =>
      config?.isWrapText ? Boolean(config.isWrapText(cell, colNumber)) : true;

    workSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Don't override attachment image cells
        if (!attachmentKeys.includes(cell._column?.key)) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: isWrapCell(cell, colNumber),
          };
        }

        // -----------------------------------------------
        // Config fill
        // -----------------------------------------------

        const fill = config?.fillColor?.(cell, colNumber);

        if (fill) {
          cell.fill = fill;
        }

        // -----------------------------------------------
        // Config font
        // -----------------------------------------------

        const font = config?.font?.(cell, colNumber);

        if (font) {
          cell.font = font;
        }

        // -----------------------------------------------
        // Border
        // -----------------------------------------------

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
        };
      });
    });

    // =========================================================
    // FIT COLUMN WIDTH / ROW HEIGHT TO CONTENT
    // =========================================================

    const MIN_COL_WIDTH = 8;
    const MAX_COL_WIDTH = 60;
    const THUMBNAIL_COL_WIDTH = 14; // 80px thumbnail
    const LINE_HEIGHT = 15;

    const getCellLines = (value) => {
      if (value === null || value === undefined) return [''];
      if (value instanceof Date) return ['DD-MM-YYYY'];
      if (typeof value === 'object') {
        if (value.text !== undefined) return String(value.text).split('\n');
        if (value.richText) {
          return value.richText
            .map((t) => t.text)
            .join('')
            .split('\n');
        }
        if (value.result !== undefined) return String(value.result).split('\n');
        return [''];
      }
      return String(value).split('\n');
    };

    const longestLine = (lines) =>
      lines.reduce((max, line) => Math.max(max, line.length), 0);

    const columnWidths = headerNames.map((key, index) => {
      const column = workSheet.getColumn(index + 1);

      // Header wraps, so its longest word is the minimum it needs
      let maxLength = longestLine(key.split(/\s+/));

      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber === 1) return;
        maxLength = Math.max(maxLength, longestLine(getCellLines(cell.value)));
      });

      let width = Math.min(
        Math.max(maxLength + 2, MIN_COL_WIDTH),
        MAX_COL_WIDTH,
      );

      if (showThumbnail && attachmentKeys.includes(key)) {
        width = Math.max(width, THUMBNAIL_COL_WIDTH);
      }

      column.width = width;
      return width;
    });

    const countWrappedLines = (lines, width) => {
      const charsPerLine = Math.max(width - 2, 1);
      return lines.reduce(
        (total, line) =>
          total + Math.max(1, Math.ceil(line.length / charsPerLine)),
        0,
      );
    };

    // Header row
    const headerLines = headerNames.reduce(
      (max, key, index) =>
        Math.max(max, countWrappedLines([key], columnWidths[index])),
      1,
    );
    headerRow.height = Math.max(25, headerLines * LINE_HEIGHT + 5);

    // Data rows
    workSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      let maxLines = 1;

      row.eachCell((cell, colNumber) => {
        if (attachmentKeys.includes(cell._column?.key)) return;

        const lines = getCellLines(cell.value);
        const lineCount = isWrapCell(cell, colNumber)
          ? countWrappedLines(lines, columnWidths[colNumber - 1])
          : lines.length;

        maxLines = Math.max(maxLines, lineCount);
      });

      const contentHeight = Math.max(20, maxLines * LINE_HEIGHT + 5);

      row.height =
        showThumbnail && rowNumber !== totalRowNumber
          ? Math.max(90, contentHeight)
          : contentHeight;
    });

    // =========================================================
    // RESPONSE / FILE
    // =========================================================

    if (config?.saveToFile && config?.filePath) {
      const dir = path.dirname(config.filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }

      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(config.filePath);

        stream.on('finish', resolve);
        stream.on('error', reject);

        if (fileType === 'csv') {
          workBook.csv.write(stream).then(resolve).catch(reject);
        } else {
          workBook.xlsx.write(stream).then(resolve).catch(reject);
        }
      });

      return config.filePath;
    }

    res.attachment(`${fileName}.${fileType}`);

    res.set({
      'Access-Control-Expose-Headers': '*',
    });

    return fileType === 'csv'
      ? await workBook.csv.write(res)
      : await workBook.xlsx.write(res);
  } catch (error) {
    console.error('generateExcelForExpense error:', error);

    throw new Error(error.message || error);
  }
};
const generateExcelForVehicleMeterDetails = async (
  data,
  fileName,
  fileType,
  res,
  config = {},
) => {
  if (!data.length) {
    throw new Error('No data found to generate the file!');
  }

  try {
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet('sheet');

    // =========================================================
    // CONFIG
    // =========================================================

    const attachmentKeys = ['Starting Meter Image', 'Ending Meter Image'];

    const headerNames = Object.keys(data[0]);

    // =========================================================
    // COLUMNS
    // =========================================================

    workSheet.columns = headerNames.map((key) => ({
      header: key,
      key,
      width: attachmentKeys.includes(key) ? 18 : 20,
    }));

    // =========================================================
    // HEADER
    // =========================================================

    const headerRow = workSheet.getRow(1);

    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        name: 'Calibri',
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'EBF1DE',
        },
      };

      cell.border = {
        top: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        left: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        bottom: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
        right: {
          style: 'thin',
          color: {
            argb: '000000',
          },
        },
      };
    });

    // =========================================================
    // ADD DATA ROWS
    // =========================================================

    data.forEach((item) => {
      const rowData = {};

      headerNames.forEach((key) => {
        // Attachment object should NOT be written directly
        if (attachmentKeys.includes(key)) {
          rowData[key] = '';
        } else {
          rowData[key] = item[key];
        }
      });

      const row = workSheet.addRow(rowData);

      row.height = 25;
    });

    // =========================================================
    // FRONTEND FILE VIEWER URL
    // =========================================================

    const frontendUrl = (appURL || '').replace(/\/$/, '');

    if (!frontendUrl) {
      throw new Error('HRMS_FRONTEND_URL is not configured');
    }

    // =========================================================
    // ATTACHMENTS
    // =========================================================

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex];

      // Excel row starts from 2 because row 1 is header
      const rowIndex = dataIndex + 2;
      const row = workSheet.getRow(rowIndex);

      // Thumbnail needs more height
      row.height = 90;

      for (const attachmentKey of attachmentKeys) {
        const attachment = item[attachmentKey];

        // =====================================================
        // VALIDATE ATTACHMENT
        // =====================================================

        if (
          !attachment ||
          typeof attachment !== 'object' ||
          !attachment.original
        ) {
          continue;
        }

        try {
          const originalFilePath = attachment.original;

          const isS3Upload = Boolean(attachment.s3UploadattachFile);

          // ===================================================
          // FILE VIEWER TOKEN
          // ===================================================

          const jwtSignedUrl = await getJwtTokenNoExpiryData({
            filePath: originalFilePath,
            isS3Upload,
          });

          const fileViewerUrl = `${fileViewerAppURL}${jwtSignedUrl}`;

          // ===================================================
          // COLUMN
          // ===================================================

          const columnNumber = headerNames.indexOf(attachmentKey) + 1;

          if (columnNumber <= 0) {
            continue;
          }

          const cell = row.getCell(columnNumber);

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };

          // ===================================================
          // GET THUMBNAIL
          // ===================================================

          let thumbnailBase64 = null;

          if (attachment.thumbnail) {
            if (isS3Upload) {
              // =================================================
              // S3 THUMBNAIL
              // =================================================

              thumbnailBase64 = await getS3File(
                bucketName,
                attachment.thumbnail,
                'base64',
              );
            } else {
              // =================================================
              // LOCAL THUMBNAIL
              // =================================================

              const thumbnailPath = path.join(
                process.cwd(),
                attachment.thumbnail,
              );

              if (fs.existsSync(thumbnailPath)) {
                thumbnailBase64 = fs
                  .readFileSync(thumbnailPath)
                  .toString('base64');
              } else {
                console.warn(`Local thumbnail not found: ${thumbnailPath}`);
              }
            }
          }

          // ===================================================
          // THUMBNAIL EXISTS
          // ===================================================

          if (thumbnailBase64) {
            try {
              const imageBuffer = Buffer.from(thumbnailBase64, 'base64');

              // -----------------------------------------------
              // Validate image
              // -----------------------------------------------

              if (imageBuffer.length < 100) {
                throw new Error('Invalid or corrupted thumbnail');
              }

              // -----------------------------------------------
              // Detect extension
              // -----------------------------------------------

              let extension = 'jpeg';

              // PNG
              if (
                imageBuffer[0] === 0x89 &&
                imageBuffer[1] === 0x50 &&
                imageBuffer[2] === 0x4e &&
                imageBuffer[3] === 0x47
              ) {
                extension = 'png';
              }

              // JPEG
              else if (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) {
                extension = 'jpeg';
              }

              // GIF
              else if (
                imageBuffer[0] === 0x47 &&
                imageBuffer[1] === 0x49 &&
                imageBuffer[2] === 0x46
              ) {
                extension = 'gif';
              }

              // WEBP
              else if (
                imageBuffer[0] === 0x52 &&
                imageBuffer[1] === 0x49 &&
                imageBuffer[2] === 0x46 &&
                imageBuffer[3] === 0x46 &&
                imageBuffer[8] === 0x57 &&
                imageBuffer[9] === 0x45
              ) {
                extension = 'webp';
              } else {
                throw new Error('Unsupported thumbnail image format');
              }

              // =================================================
              // ADD IMAGE TO WORKBOOK
              // =================================================

              const imageId = workBook.addImage({
                base64: thumbnailBase64,
                extension,
              });

              // =================================================
              // CLICKABLE THUMBNAIL
              // =================================================

              workSheet.addImage(imageId, {
                tl: {
                  col: columnNumber - 1 + 0.1,
                  row: rowIndex - 1 + 0.05,
                },

                ext: {
                  width: 100,
                  height: 90,
                },

                hyperlinks: {
                  hyperlink: fileViewerUrl,
                  tooltip: 'Click to open original file',
                },
              });

              // Keep cell empty because image occupies it
              cell.value = null;

              cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
              };
            } catch (thumbnailError) {
              console.error(
                `Thumbnail processing failed for ${attachmentKey}, row ${rowIndex}:`,
                thumbnailError.message,
              );

              // =================================================
              // FALLBACK TO VIEW LINK
              // =================================================

              cell.value = {
                text: 'View',
                hyperlink: fileViewerUrl,
              };

              cell.font = {
                color: {
                  argb: 'FF0000FF',
                },
                underline: true,
              };

              cell.alignment = {
                vertical: 'middle',
                horizontal: 'center',
              };
            }
          }

          // ===================================================
          // THUMBNAIL NOT AVAILABLE
          // ===================================================
          else {
            cell.value = {
              text: 'View',
              hyperlink: fileViewerUrl,
            };

            cell.font = {
              color: {
                argb: 'FF0000FF',
              },
              underline: true,
            };

            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center',
            };
          }
        } catch (error) {
          console.error(
            `Failed to process ${attachmentKey}, row ${rowIndex}:`,
            error.message,
          );
        }
      }
    }

    // =========================================================
    // GENERAL STYLING
    // =========================================================

    workSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Don't override attachment image cells
        if (!attachmentKeys.includes(cell._column?.key)) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: config?.isWrapText
              ? Boolean(config.isWrapText(cell, colNumber))
              : true,
          };
        }

        // -----------------------------------------------
        // Config fill
        // -----------------------------------------------

        const fill = config?.fillColor?.(cell, colNumber);

        if (fill) {
          cell.fill = fill;
        }

        // -----------------------------------------------
        // Config font
        // -----------------------------------------------

        const font = config?.font?.(cell, colNumber);

        if (font) {
          cell.font = font;
        }

        // -----------------------------------------------
        // Border
        // -----------------------------------------------

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: '000000',
            },
          },
        };
      });
    });

    // =========================================================
    // RESPONSE / FILE
    // =========================================================

    if (config?.saveToFile && config?.filePath) {
      const dir = path.dirname(config.filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }

      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(config.filePath);

        stream.on('finish', resolve);
        stream.on('error', reject);

        if (fileType === 'csv') {
          workBook.csv.write(stream).then(resolve).catch(reject);
        } else {
          workBook.xlsx.write(stream).then(resolve).catch(reject);
        }
      });

      return config.filePath;
    }

    res.attachment(`${fileName}.${fileType}`);

    res.set({
      'Access-Control-Expose-Headers': '*',
    });

    return fileType === 'csv'
      ? await workBook.csv.write(res)
      : await workBook.xlsx.write(res);
  } catch (error) {
    console.error('generateExcelForExpense error:', error);

    throw new Error(error.message || error);
  }
};
module.exports = {
  generateLoanReportWithEMI,
  generatePNGExpatSalaryRegister,
  generatePNGNationalSalaryRegister,
  generatePaySlipExcel,
  generateDemoExcelForPaySlipGenerator,
  generateExcelOTReportWithESIC,
  generateExcel_SlotWise_Attendance_Report,
  generateExcelForDailyCostReportMail,
  generateExcelForFYLeaveReportMail,
  generateExcelLateComeEarlyGoMail,
  getGradeForTarget,
  generateExcelDailyAttendanceCountDepartmentwise,
  generateDemoExcelForPreviousSalary,
  generateDemoExcelForDivision,
  generateDemoExcelForWorkingArea,
  generateExcelForMonthlyAttendanceReport,
  generateExcelForSalaryRegister,
  generateExcel,
  generateChecklistExcel,
  generateExcelforSalaryStructure,
  generateExcelForLeave,
  generateDemoExcelForVariable,
  generateExcelForLeaveBalance,
  generateExcelForFormELeaveRegister,
  generateExcelForDailyCost,
  EmailSalarySlip,
  generateExcelForAttendanceData,
  generateExcelForTackingReport,
  generateExcelForMusterRoll,
  generateExcelForFORM_D_AttendanceRegister,
  generateExcelForShift,
  generateExcelForFiveMinuteTackingReport,
  createZipFileForsalarySlip,
  generateDemoExcelForAdvance,
  generateExcelForPreboarding,
  generateExcelForEmployeeGatePass,
  generateDemoExcel,
  generateAuthorozationExcel,
  generateExcelForVisitReportMail,
  generateExcelDepartmentWisepunchinoutcountreport,
  createZipFileForPortraitidIdCards,
  generateExcelDepartmentWisepunchinoutcountreportMail,
  genrateDemoExcelForExpenseHead,
  genrateDemoExcelForWorkingLocation,
  genrateDemoExcelForBranch,
  genrateDemoExcelForCustomer,
  genrateDemoExcelForContractor,
  genrateDemoExcelForAssetMaster,
  generateExcelForPunchInPunchOutReport,
  generateExcelForAttendaceReport4,
  genrateDemoExcelForManualLeave,
  generateweekoffWorkDayExcel,
  genrateDemoExcelForAssignAsset,
  generateExcelForShiftRoster,
  generateDemoExcelForShiftRoster,
  genrateDemoExcelForBiometricAttendance,
  generateAuthorozationExcelWithUserData,
  generateExcelForVisitReport,
  generateExcelForIncrementReport,
  generateExcelGatePass,
  generatePdfForEmploeeMonthWiseSalary,
  generateExcelForExtraDays,
  genrateDemoExcelForDesinationWiseDocument,
  createZipFileForProfilePics,
  generateExcelForAttendanceCorrectionReport,
  generateExcelForLeaveApplicationReport,
  streamLeaveReportToExcel,
  streamChunkToExcel,
  generateDemoExcelBranchJob,
  generateExcelForOfficeExpenseCategory,
  generateExcelForOfficeExpenseHead,
  generateDemoExcelForOfficeExpenseCategory,
  generateDemoExcelForOfficeExpenseHead,
  formatFirstRow,
  generateExcelForMarsExpenseReport,
  generateExcelForMyExpense,
  generateExcelForOfficeExpense,
  generateDemoExcelForExpensePayment,
  generateExcelForCompanySubscriptionData,
  createZipFileForUserDocuments,
  generateExcelForEmployeeExpenseReimbursement,
  generateExcelForAssignCustomersToEmployee,
  createZipFileForFormF,
  generateDemoExcelForExpensePurpose,
  generateExcelDailyAttendanceCountShiftDepartmentwise,
  createZipAndCleanup,
  createZipFileForPdf,
  generateExcelForDailyInOutReport,
  generateExcelProjectWiseSalaryDistribution,
  generateAttendanceReport_2_Excel,
  generateAttendanceReport_Consolidate_Excel,
  generateAttendanceReport_Punch_IN_Out_Excel,
  generateAttendanceReport_2_with_PA_INOUT_Excel,
  generateDailyPhysicalPresentAbsentReportExcel,
  generateFormBWagesRegister,
  generatePayrollStatutoryExcel,
  generatePerDaySalaryFormat2,
  generatePerDaySalaryFormat1,
  generateExcelWithAuthorizers,
  generateVisitAuthExcelWithAuthorizers,
  generateEsicExcel,
  generateExcelForAttritionReport,
  generateExcelForEmployeeSalaryAndHeadcountReport,
  generateExcelForExpenseReport,
  generateExcelForVehicleMeterDetails,
};
