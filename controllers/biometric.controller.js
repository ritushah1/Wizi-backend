const sql = require('mssql');
const AttendanceLogs = require('../models/attendancelogs');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const UserMaster = require('../models/userMaster');
const userMaster = require('../models/userMaster');
const Sequelize = require('sequelize');
const readXlsxFile = require('read-excel-file/node');
const biometricIntegration = require('../models/biometricIntegration');
const axios = require('axios');
const getbioMetricsConfig = require('../config/biometricIntegrationdb');
const SN_Code = require('../models/sn_code');
const BiometricLogs = require('../models/biometricLogs');
const fs = require('fs');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const {
  generateExcel,
  genrateDemoExcelForBiometricAttendance,
} = require('../utils/exportData');
const Employeeincentive = require('../models/employeeincentive');
const path = require('path');
const BranchMaster = require('../models/branchMaster');
const Designation = require('../models/designation');
const Department = require('../models/department');
const companyMaster = require('../models/companyMaster');
const {
  DateTimeType,
  attendaceTransType,
  biometricIntegrationTypes,
} = require('../utils/dbUtils');

exports.excelattendance = async (req, res, next) => {
  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    let CompanyContacts = [];
    readXlsxFile(filePath).then(async (rows) => {
      // skip header
      rows.shift();

      let userContacts = [];
      rows.forEach((row) => {
        let CompanyContact2 = {
          EmployeeCode: row[0],
          logdatetime: row[1],
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        };
        userContacts.push(CompanyContact2);
      });

      const result = userContacts;
      for (var i = 0; i < result.length; i++) {
        let joiningdata = await EmployeeJoiningDetails.findOne({
          where: {
            biometricCode: String(result[i].EmployeeCode),
            '$userMaster.companyMasterId$': req.body.companyMasterID,
          },
          include: [
            {
              model: userMaster,
            },
          ],
        });
        if (joiningdata) {
          insert_db = await AttendanceLogs.create({
            userMasterID: joiningdata.userMasterID,
            AttendanceTransID: attendaceTransType.biometricNotValidated,
            logDateTime: result[i].logdatetime - 1000 * (60 * 330),
            direction: '',
            photo: '',
            attendnaceFrom: 'biometric',
            longitude: '',
            latitude: '',
            address: '',
            createBy: 1,
          });
        }
      }
      res.status(200).json({
        status: 200,
        message: 'Attendance Sync Successfully.',
        count: result.length,
        data: result,
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.AaryavartData = async (req, res, next) => {
  try {
    const currentDate = new Date();

    // Extract the month and year
    const month = currentDate.getMonth() + 1; // Adding 1 because months are zero-based
    const year = currentDate.getFullYear();

    // Create the formatted string "MMYYYY"
    const formattedDate = `${month < 10 ? '0' : ''}${month}${year}`;

    var basicauth = 'ICONRMC:ICONRMC:123456:true';
    let res1 = await axios.get(
      'https://api.etimeoffice.com/api/DownloadLastPunchData?Empcode=ALL&LastRecord=' +
        formattedDate +
        '$0',
      {
        auth: {
          username: basicauth,
          password: '123456',
        },
      },
    );
    var apidata = res1.data.PunchData;

    if (apidata.length == 0) {
      return res.status(200).json({
        status: 200,
        message: 'No data Present',
        data: apidata,
      });
    }

    const AaryavartConfig = getbioMetricsConfig(false);
    for (var i = 0; i < apidata.length; i++) {
      if (apidata[i].PunchDate) {
        // Input date string
        const dateString = apidata[i].PunchDate;

        // Split the date and time parts
        const [datePart, timePart] = dateString.split(' ');

        // Split the date part into day, month, and year
        const [day, month, year] = datePart.split('/');

        // Split the time part into hours, minutes, and seconds
        const [hours, minutes, seconds] = timePart.split(':');

        // Create the ISO 8601 formatted date string
        const isoFormattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

        let finalDateTime = isoFormattedDate;
        let convertedDate = finalDateTime.slice(0, 10);
        let convertedTime = hours + ':' + minutes;

        let queryString =
          "select * from AaryavartPunchLog where logdatetime='" +
          finalDateTime +
          "' and EmployeeCode='" +
          apidata[i].Empcode +
          "'";
        let pool = await sql.connect(AaryavartConfig);
        let result = await pool.request().query(queryString);

        if (result.length == 0) {
          let insertqueryString =
            "INSERT INTO [dbo].[AaryavartPunchLog] ([EmployeeCode], [logdate], [logtime], [logdatetime], [Serialnumber], [InOut], [DataUploaded]) VALUES ('" +
            apidata[i].Empcode +
            "', '" +
            convertedDate +
            "', '" +
            convertedTime +
            "', '" +
            finalDateTime +
            "', 'aaryavart1', '', 0);";
          let pool1 = await sql.connect(AaryavartConfig);
          let insertresult = await pool1.request().query(insertqueryString);
        }
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Data Updated Successfully',
      count: 0,
      data: apidata.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.pendingbiometricsync = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      serialNo,
      fromDate,
      toDate,
      status,
      page,
      limit,
      exportData,
      exportFileType,
    } = req.body;
    const offset = (page - 1) * limit;

    let get_one_data = await biometricIntegration.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    if (
      !get_one_data ||
      (get_one_data.biometricSerialNo &&
        get_one_data.biometricSerialNo.length == 0)
    ) {
      return res.status(200).json({
        status: 401,
        message: 'Biometric integration not found',
        data: [],
      });
    } else {
      let result = [],
        totalcount = [];

      if (exportData) {
        if (serialNo) {
          if (!get_one_data.biometricSerialNo.includes(serialNo)) {
            return res.status(200).json({
              status: 401,
              message: 'Serial number did not match',
              data: [],
            });
          }

          const index = get_one_data.biometricSerialNo.indexOf(serialNo);

          if (
            get_one_data.table[index] == biometricIntegrationTypes.AIFACE ||
            get_one_data.table[index] == biometricIntegrationTypes.IPBASED
          ) {
            let futureDate = new Date(new Date(toDate).getTime() + 86400000)
              .toISOString()
              .slice(0, 10);

            const allLogs = await BiometricLogs.findAndCountAll({
              where: {
                Serialnumber: serialNo,
                logDateTime: {
                  [Sequelize.Op.between]: [
                    new Date(fromDate),
                    new Date(futureDate),
                  ],
                },
              },
              raw: true,
            });

            for (var item of allLogs.rows) {
              let tempLog = {
                Biomatriclogid: '',
                EmployeeCode: item.EmployeeCode,
                logdate: '',
                logtime: '',
                logdatetime: item.logDateTime,
                Serialnumber: item.Serialnumber,
                InOut: '0',
                DataUploaded: null,
                Image64: item.Image64,
                InOut: '0',
                Mode: '',
              };
              result.push(tempLog);
            }
            let temp = { recordCount: allLogs.count };
            totalcount.push(temp);
          } else {
            const sqlConfig1 = getbioMetricsConfig(
              false,
              get_one_data.database[index],
            );

            let queryString = '';

            if (status == 'pending') {
              queryString =
                `select * from ` +
                get_one_data.table[index] +
                ` where isnull(datauploaded,0)=0 and Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `' order by logdate DESC`;
            } else {
              queryString =
                `select * from ` +
                get_one_data.table[index] +
                ` where Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `' order by logdate DESC`;
            }

            let pool = await sql.connect(sqlConfig1);
            result = await pool.request().query(queryString);

            result = result.recordsets[0] || [];
          }
        }

        result.forEach((item) => {
          delete item.Image64;
          item.DataUploaded = item.DataUploaded ? 'YES' : 'NO';
        });

        await generateExcel(
          result,
          'Biometric-Sync-Excel',
          exportFileType,
          res,
        );
        return;
      } else {
        // let result = []
        if (serialNo) {
          if (!get_one_data.biometricSerialNo.includes(serialNo)) {
            return res.status(200).json({
              status: 401,
              message: 'Serial number did not match',
              data: [],
            });
          }

          const index = get_one_data.biometricSerialNo.indexOf(serialNo);

          if (
            get_one_data.table[index] == biometricIntegrationTypes.AIFACE ||
            get_one_data.table[index] == biometricIntegrationTypes.IPBASED
          ) {
            let futureDate = new Date(new Date(toDate).getTime() + 86400000)
              .toISOString()
              .slice(0, 10);

            const allLogs = await BiometricLogs.findAndCountAll({
              where: {
                Serialnumber: serialNo,
                logDateTime: {
                  [Sequelize.Op.between]: [
                    new Date(fromDate),
                    new Date(futureDate),
                  ],
                },
              },
              raw: true,
              limit: limit,
              offset: offset,
            });

            for (var item of allLogs.rows) {
              let tempLog = {
                Biomatriclogid: '',
                EmployeeCode: item.EmployeeCode,
                logdate: '',
                logtime: '',
                logdatetime: item.logDateTime,
                Serialnumber: item.Serialnumber,
                InOut: '0',
                DataUploaded: null,
                Image64: item.Image64,
                InOut: '0',
                Mode: '',
                isS3Upload: item.isS3Upload,
              };
              result.push(tempLog);
            }
            let temp = { recordCount: allLogs.count };
            totalcount.push(temp);
          } else {
            const sqlConfig1 = getbioMetricsConfig(
              false,
              get_one_data.database[index],
            );

            let queryString = '',
              queryStringtotalcount = '';

            if (status == 'pending') {
              queryString =
                `select * from ` +
                get_one_data.table[index] +
                ` where isnull(datauploaded,0)=0 and Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `' order by logdatetime DESC OFFSET ` +
                offset +
                ` ROWS
              FETCH NEXT ` +
                limit +
                ` ROWS ONLY`;

              queryStringtotalcount =
                `select COUNT(*) AS recordCount from ` +
                get_one_data.table[index] +
                ` where isnull(datauploaded,0)=0 and Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `'`;
            } else {
              queryString =
                `select * from ` +
                get_one_data.table[index] +
                ` where Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `' order by logdatetime DESC OFFSET ` +
                offset +
                ` ROWS
              FETCH NEXT ` +
                limit +
                ` ROWS ONLY`;

              queryStringtotalcount =
                `select COUNT(*) AS recordCount from ` +
                get_one_data.table[index] +
                ` where Serialnumber in('` +
                get_one_data.biometricSerialNo[index] +
                `') AND logdate BETWEEN '` +
                fromDate +
                `' AND '` +
                toDate +
                `'`;
            }

            let pool = await sql.connect(sqlConfig1);
            result = await pool.request().query(queryString);

            let pool1 = await sql.connect(sqlConfig1);
            totalcount = await pool1.request().query(queryStringtotalcount);

            result = result.recordsets[0];

            totalcount = totalcount.recordsets[0];
          }
        }

        return res.status(200).json({
          status: 200,
          message: 'Logs got Successfully.',
          data: result,
          totalcount: totalcount?.[0]?.recordCount || 0,
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

function formatDates(dateStr) {
  // Convert the input string to a Date object
  var dateObj = new Date(dateStr);

  // Get the first date of the month
  var firstDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);

  // Format dates in the desired format
  var firstDateFormatted = formatDate(firstDate);
  var passedDateFormatted = formatDate(dateObj);

  return [firstDateFormatted, passedDateFormatted];
}

function formatDate(date) {
  var months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  var day = date.getDate();
  var month = months[date.getMonth()];
  var year = date.getFullYear();
  return (day < 10 ? '0' : '') + day + '-' + month + '-' + year;
}

exports.asopalavCommissionAPI = async (req, res, next) => {
  try {
    //Static Body for the API with Custom Dates
    const AllBranchCodes = [
      '0010', //Satellite
      '0011', //ASHRAMROAD
      '0016', //RATANPOLE
      '0017', //Vadaj
      '0019', //Surat
    ];
    const body = [
      {
        ACTION: 'ASP_SR_COMMISSION',
        CHANNEL: 'I',
        MODULE_CD: '0',
        ACTIVITY_CD: '0',
        REQUEST_DATA: [
          {
            COMP_CD: '0010',
            BRANCH_CD: '',
            SR_CODE: 'ALL',
            FROM_DT: '',
            TO_DT: '',
          },
        ],
      },
    ];

    // To get the Dates
    var date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const prevDate = new Date(
      new Date(date).setDate(new Date(date).getDate() - 1),
    )
      .toISOString()
      .slice(0, 10);

    if (+new Date().getDate() == 1) {
      date = new Date(new Date().setDate(new Date().getDate() - 1));
      date = new Date(date).toISOString().slice(0, 10);
    }

    var formattedDates = formatDates(date);
    body[0].REQUEST_DATA[0].FROM_DT = formattedDates[0];
    body[0].REQUEST_DATA[0].TO_DT = formattedDates[1];

    //API URL
    const APIURL = `http://103.50.152.26:8081/easyreport_asp/api/fas/request`;

    for (var code of AllBranchCodes) {
      body[0].REQUEST_DATA[0].BRANCH_CD = code;
      //To get the commission Data
      const allCMs = await axios.post(APIURL, body);

      if (
        allCMs.data &&
        allCMs.data.length != 0 &&
        allCMs.data[0].RESPONSE_DATA &&
        allCMs.data[0].RESPONSE_DATA.length != 0
      ) {
        const YYYYMM = date.slice(0, 4) + date.slice(5, 7);

        for (var item of allCMs.data[0].RESPONSE_DATA) {
          const findEmp = await SN_Code.findAll({
            where: {
              status: 1,
              [Sequelize.Op.and]: [
                { sn_code: item.SR_CODE.toString().trim() },
                { sn_code: { [Sequelize.Op.notIn]: ['V100'] } },
              ],
            },
            include: [
              {
                model: UserMaster,
                attributes: ['companyMasterId'],
                where: { companyMasterId: 277 },
              },
            ],
          });

          if (findEmp.length == 1) {
            if (item.HS_PERC1) {
              const findIncentive = await Employeeincentive.findOne({
                where: {
                  userMasterID: findEmp[0].userMasterID,
                  IncentivetypeID: 191,
                  yearmonth: +YYYYMM,
                  status: 1,
                },
                raw: true,
              });
              let description = 'Amount: ' + item.HS_AMOUNT;
              if (findIncentive) {
                await Employeeincentive.update(
                  {
                    amount: +item.HS_PERC1,
                    description: description,
                    incentiveDate: prevDate,
                  },
                  {
                    where: {
                      employeeincentiveID: findIncentive.employeeincentiveID,
                    },
                  },
                );
              } else {
                await Employeeincentive.create({
                  userMasterID: findEmp[0].userMasterID,
                  amount: +item.HS_PERC1,
                  yearmonth: +YYYYMM,
                  description: description,
                  IncentivetypeID: 191,
                  createBy: findEmp[0].userMasterID,
                  incentiveDate: prevDate,
                });
              }
            }

            if (item.GL_PERC1) {
              const findIncentive = await Employeeincentive.findOne({
                where: {
                  userMasterID: findEmp[0].userMasterID,
                  IncentivetypeID: 192,
                  yearmonth: +YYYYMM,
                  status: 1,
                },
                raw: true,
              });
              let description =
                'Quantity: ' + item.QTY + ', Amount: ' + item.GL_AMOUNT;

              if (findIncentive) {
                await Employeeincentive.update(
                  {
                    amount: +item.GL_PERC1,
                    description: description,
                    incentiveDate: prevDate,
                  },
                  {
                    where: {
                      employeeincentiveID: findIncentive.employeeincentiveID,
                    },
                  },
                );
              } else {
                await Employeeincentive.create({
                  userMasterID: findEmp[0].userMasterID,
                  amount: +item.GL_PERC1,
                  yearmonth: +YYYYMM,
                  description: description,
                  IncentivetypeID: 192,
                  createBy: findEmp[0].userMasterID,
                  incentiveDate: prevDate,
                });
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'commission Synced successfully',
      // body: body,
      // data: allCMs.data[0],
    });
  } catch (err) {
    next(err);
  }
};

exports.generateDemoExcel = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, dateTimeType } = await req.body;
    const condition = {};
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    condition.companyMasterId = companyMasterID;
    condition.status = 1;
    const order = [['displayName', 'ASC']];
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userData = await UserMaster.findAndCountAll({
      // raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: EmployeeJoiningDetails,
          required: true,
          attributes: [
            'employeeJoiningDetailId',
            'employeeCode',
            'biometricCode',
            'biometricSerialNo',
          ],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(currentdate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(currentdate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName', 'fileUploadType'],
        },
      ],
      attributes: [
        'userMasterID',
        'displayName',
        'companyMasterId',
        'userNumber',
      ],
    });
    const userDataNames = userData.rows.map((row) => {
      const mergeCellData =
        row.displayName +
        ' (' +
        row.userNumber +
        ')' +
        (row.employeeJoiningDetails &&
        row.employeeJoiningDetails.length > 0 &&
        row.employeeJoiningDetails[0].employeeCode != null
          ? ' (' + row.employeeJoiningDetails[0].employeeCode + ')'
          : '');

      return {
        userMasterID: row.userMasterID,
        displayName: row.displayName,
        userNumber: row.userNumber,
        companyMasterId: row.companyMasterId,
        employeeCode:
          row.employeeJoiningDetails && row.employeeJoiningDetails.length > 0
            ? row.employeeJoiningDetails[0].employeeCode
            : '',
        biometricCode:
          row.employeeJoiningDetails && row.employeeJoiningDetails.length > 0
            ? row.employeeJoiningDetails[0].biometricCode
            : '',
        biometricSerialNo:
          row.employeeJoiningDetails && row.employeeJoiningDetails.length > 0
            ? row.employeeJoiningDetails[0].biometricSerialNo
            : '',
        branch:
          (row.employeeBranches && row.employeeBranches.length) > 0
            ? row.employeeBranches[0].branchMaster
              ? row.employeeBranches[0].branchMaster.branchName
              : ''
            : '',
        designation:
          (row.employeeDesignations && row.employeeDesignations.length) > 0
            ? row.employeeDesignations[0].designation
              ? row.employeeDesignations[0].designation.designationName
              : ''
            : '',
        department:
          (row.employeeDepartments && row.employeeDepartments.length) > 0
            ? row.employeeDepartments[0].department
              ? row.employeeDepartments[0].department.departmentName
              : ''
            : '',
        company: row.companyMaster.companyName,
        mergedData: mergeCellData,
      };
    });

    await genrateDemoExcelForBiometricAttendance(
      userDataNames,
      'Upload Biometric Attendance',
      'xlsx',
      dateTimeType,
      res,
    );
  } catch (err) {
    next(err);
  }
};

function isValidDateTime(date, time) {
  // Check if date and time are valid Date objects
  if (
    date instanceof Date &&
    !isNaN(date) &&
    time instanceof Date &&
    !isNaN(time)
  ) {
    // Combine the date and time into a single DateTime using UTC
    const mergedDateTime = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds(),
      ),
    );

    // Return the merged DateTime if valid, else false
    return !isNaN(mergedDateTime) ? mergedDateTime : false;
  }
  // Return false if either date or time is invalid
  return false;
}

function isValidDateTime2(datetime) {
  // Check if date and time are valid Date objects
  if (datetime instanceof Date && !isNaN(datetime)) {
    // Combine the date and time into a single DateTime using UTC
    const mergedDateTime = new Date(
      Date.UTC(
        datetime.getUTCFullYear(),
        datetime.getUTCMonth(),
        datetime.getUTCDate(),
        datetime.getUTCHours(),
        datetime.getUTCMinutes(),
        datetime.getUTCSeconds(),
      ),
    );

    // Return the merged DateTime if valid, else false
    return !isNaN(mergedDateTime) ? mergedDateTime : false;
  }
  // Return false if either date or time is invalid
  return false;
}

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }
  const { companyMasterID, dateTimeType } = req.body;
  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const users = await UserMaster.findAll({
      raw: true,
      where: { companyMasterId: companyMasterID, status: 1 },
      include: [
        {
          model: EmployeeJoiningDetails,
          where: {
            [Sequelize.Op.and]: [
              { biometricSerialNo: { [Sequelize.Op.ne]: null } },
              { biometricSerialNo: { [Sequelize.Op.ne]: '' } },
              { biometricCode: { [Sequelize.Op.ne]: null } },
              { biometricCode: { [Sequelize.Op.ne]: '' } },
            ],
          },
          required: true,
          attributes: [
            'employeeJoiningDetailId',
            'employeeCode',
            'biometricCode',
            'biometricSerialNo',
          ],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(currentdate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(currentdate),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName'],
        },
      ],
    });

    const biometricData = [];
    let pendinguserData = [];
    const uniqueValues = new Set();

    for (const row of rows) {
      if (!row[0]) continue;

      const biometricCode = row[0].toString().trim();

      const userMaster = users.find(
        (item) =>
          item['employeeJoiningDetails.biometricCode'] === biometricCode,
      );

      if (!userMaster) {
        if (!uniqueValues.has(row[0])) {
          pendinguserData.push(row[0]);
          uniqueValues.add(row[0]); // Use 'add' instead of 'push'
        }
        continue;
      }

      let logData = {
        userMasterID: userMaster.userMasterID,
        companyMasterID: companyMasterID,
        displayName: userMaster.displayName,
        employeeCode: userMaster['employeeJoiningDetails.employeeCode'],
        branch: userMaster['employeeBranches.branchMaster.branchName'],
        designation:
          userMaster['employeeDesignations.designation.designationName'],
        department: userMaster['employeeDepartments.department.departmentName'],
        company: userMaster['companyMaster.companyName'],
        biometricCode: userMaster['employeeJoiningDetails.biometricCode'],
        biometricSerialNo:
          userMaster['employeeJoiningDetails.biometricSerialNo'].split(',')[0],
        userNumber: userMaster.userNumber,
        direction: row[3],
        remarks: [],
        logDateTime: null,
      };

      if (dateTimeType == DateTimeType.SEPERATED) {
        if (!row[4]) logData.remarks.push('Please Enter Valid Log Date');
        if (!row[5]) logData.remarks.push('Please Enter Valid Log Time');

        if (!logData.remarks.length) {
          const logDateTime = isValidDateTime(row[4], row[5]);
          if (logDateTime) logData.logDateTime = logDateTime;
          else logData.remarks.push('Please Enter Valid Log DateTime');
        }
      } else {
        if (!row[4]) logData.remarks.push('Please Enter Valid Log Date Time');

        if (!logData.remarks.length) {
          const logDateTime = isValidDateTime2(row[4]);
          if (logDateTime) logData.logDateTime = logDateTime;
          else logData.remarks.push('Please Enter Valid Log DateTime');
        }
      }

      logData.remarks = logData.remarks.join(',');
      biometricData.push(logData);
    }

    fs.unlink(filePath, function (err) {});

    if (pendinguserData.length)
      pendinguserData = `User with biometric code ${pendinguserData.join(' ')} cannot be uploaded`;
    else pendinguserData = '';

    return res.status(200).json({
      status: 200,
      message: 'Biometric Logs Validate successfully.',
      data: biometricData,
      pendinguserData,
    });
  } catch (error) {
    next(error);
  }
};
