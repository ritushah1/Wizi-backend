const Sequelize = require('sequelize');
const VehicleUsage = require('../models/vehicleUsage');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const attendanceTransaction = require('../models/attendanceTransaction');
const BranchMaster = require('../models/branchMaster');
const {
  asiaKolkataDateTime,
  checkIsAttendanceMissPunch,
} = require('../utils/commonUtilFunctions');
const UserLeaves = require('../models/userleave');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const ShiftTIme = require('../models/shiftTime');
const moment = require('moment');
const {
  formatFirstRow,
  generateExcelForVehicleMeterDetails,
} = require('../utils/exportData');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');
const {
  updateVisitReportInSheet,
  addStartingVehicleMeterData,
  addEndingVehicleUsageToGoogleSheet,
} = require('./googleSheetIntegration.controller');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const Division = require('../models/division');
const EmployeeDivision = require('../models/employeeDivision');
const { s3UploadVehicleMeterPhoto } = require('../middleware/s3UploadFile');
const { isStoreFileToS3Bucket } = require('../utils/labelUtils');
const { attachmentFilePathFolderNames } = require('../utils/commonVars');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

exports.addStartingVehicleUsage = async (req, res, next) => {
  try {
    let { userMasterID, startingMeterImage, startkilometer, vehicleType } =
      req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const companyMasterID = req.userDetails.companyMasterId;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const leaveCondition = {
      FromDate: {
        [Sequelize.Op.lte]: currentDate,
      },
      ToDate: {
        [Sequelize.Op.gte]: currentDate,
      },
      userMasterID: userMasterID,
      status: 1,
      authorizationStatus: { [Sequelize.Op.ne]: 4 },
    };
    /* -----------------------------------------------------------
       1️⃣ Check Outdoor Duty Leave (LeaveID = 25)
    ------------------------------------------------------------*/
    const userOutDoorDuty = await UserLeaves.findOne({
      where: {
        ...leaveCondition,
        [Sequelize.Op.or]: [
          // Pending → no transaction required
          {
            authorizationStatus: { [Sequelize.Op.in]: [0, 1, 2] },
          },

          // Approved → transaction required
          {
            [Sequelize.Op.and]: [
              { authorizationStatus: 3 },
              Sequelize.literal(`
            EXISTS (
              SELECT 1 
              FROM "userLeaveTransactions" ult
              WHERE ult."ReferenceID" = "userLeave"."UserLeaveApplicationID"
              AND ult."date" = '${currentDate}'
              AND ult."status" = 1
            )
          `),
            ],
          },
        ],
      },
      include: [
        {
          required: true,
          model: HrLeaveTypes,
          attributes: [],
          where: { LeaveID: 25 },
        },
      ],
    });

    if (userOutDoorDuty) {
      return createVehicleUsage();
    }

    /* -----------------------------------------------------------
       2️⃣ Get Last Attendance
    ------------------------------------------------------------*/
    const lastAttendance = await attendanceTransaction.findOne({
      raw: true,
      where: {
        userMasterID,
        Status: 1,
      },
      order: [['AttendanceDate', 'DESC']],
    });

    if (!lastAttendance || lastAttendance.OutDateTime) {
      return res.status(200).json({
        status: 401,
        message: 'You need to punchIN to add vehicle Usage',
      });
    }

    /* -----------------------------------------------------------
       3️⃣ Get Attendance Policy
    ------------------------------------------------------------*/
    const dateFilter = new Date();

    const employeePolicy = await EmployeeAttendancePolicy.findOne({
      where: {
        userMasterID,
        status: 1,
        startDate: { [Sequelize.Op.lte]: dateFilter },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: dateFilter } },
          { endDate: null },
        ],
      },
      include: [
        {
          model: AttendancePolicy,
          as: 'attendancePolicy',
          attributes: [
            'missPunchMinutes',
            'latePunchRestricted',
            'shiftBasedRestriction',
          ],
        },
      ],
    });

    /* -----------------------------------------------------------
       4️⃣ Miss Punch Validation
    ------------------------------------------------------------*/
    if (employeePolicy) {
      let day = new Date(lastAttendance.AttendanceDate).toLocaleString(
        'en-us',
        { weekday: 'long' },
      );

      const dayWiseShiftTime = await ShiftTIme.findOne({
        where: {
          shiftID: lastAttendance.Shift,
          day: day,
        },
      });
      const missPunchObj = await checkIsAttendanceMissPunch(
        employeePolicy?.attendancePolicy, //Attendance Policy
        lastAttendance, // Attendance Data
        dayWiseShiftTime, // Day-Wise Shift Time Data
        new Date(), // Attendance Log Time
      );
      if (missPunchObj.isMissPunch) {
        return res.json({
          status: missPunchObj.status,
          message: missPunchObj.message,
          data: {},
        });
      }
    }
    let startingMeterThumb = null;

    if (startingMeterImage) {
      const attachmentPath = await s3UploadVehicleMeterPhoto({
        photo: `data:image/png;base64,${startingMeterImage}`,
        userMasterID: userMasterID,
        companyMasterId: companyMasterID,
        meterType: 'start',
        folderName: attachmentFilePathFolderNames.VEHICLE_METER,
      });

      startingMeterImage = attachmentPath.original || null;
      startingMeterThumb = attachmentPath.thumbnail || null;
    } else {
      startingMeterImage = null;
    }
    /* -----------------------------------------------------------
       5️⃣ Create Vehicle Usage
    ------------------------------------------------------------*/
    return createVehicleUsage();

    async function createVehicleUsage() {
      const vehicle = await VehicleUsage.create({
        userMasterID,
        startingMeterImage,
        startkilometer,
        startingDateTime: new Date(),
        createBy,
        createByIp,
        vehicleType,
        isS3Starting: isStoreFileToS3Bucket,
        migration: true,
      });

      addStartingVehicleMeterData(
        vehicle.vehicleUsageID,
        companyMasterID,
        req.userDetails,
      ).catch((err) => {
        console.error('Background Task error (Vehicle meter data)', err);
      });

      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('Vehicle Usage'),
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.addEndingVehicleUsage = async (req, res, next) => {
  try {
    let {
      vehicleUsageID,
      endingMeterImage,
      endkilometer,
      vehicleType,
      startkilometerValue,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const companyMasterID = req.userDetails.companyMasterId;

    const data = await VehicleUsage.findOne({
      where: {
        vehicleUsageID,
      },
    });
    let endingMeterThumb = null;
    if (endingMeterImage) {
      const attachmentPath = await s3UploadVehicleMeterPhoto({
        photo: `data:image/png;base64,${endingMeterImage}`,
        userMasterID: data.userMasterID,
        companyMasterId: companyMasterID,
        meterType: 'end',
        folderName: attachmentFilePathFolderNames.VEHICLE_METER,
      });

      endingMeterImage = attachmentPath.original || null;
      endingMeterThumb = attachmentPath.thumbnail || null;
    } else {
      endingMeterImage = null;
    }
    await VehicleUsage.update(
      {
        endingMeterImage: endingMeterImage
          ? endingMeterImage
          : data.endingMeterImage,
        endingDateTime: new Date().toISOString(),
        endkilometer,
        startkilometer: startkilometerValue,
        updateBy,
        updateByIp,
        vehicleType,
        isS3Ending: isStoreFileToS3Bucket,
        migration: true,
      },
      {
        where: { vehicleUsageID: vehicleUsageID },
      },
    );

    // Update Google Sheet record in background
    addEndingVehicleUsageToGoogleSheet(
      vehicleUsageID,
      companyMasterID,
      req.userDetails,
    ).catch((err) => {
      console.error('Background Task error (Vehicle ending meter data)', err);
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Ending Meter'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getUserDailyVehicleUsageReport = async (req, res, next) => {
  try {
    const { userMasterID, fromdate, todate, limit, page } = await req.body;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    let fromdate1 = new Date(
      new Date(new Date(fromdate).setHours(0, 0, 0, 0))
        .toString()
        .split('GMT')[0] + ' UTC',
    ).toISOString();
    let enddate1 = new Date(
      new Date(new Date(todate).setHours(23, 59, 59, 999))
        .toString()
        .split('GMT')[0] + ' UTC',
    ).toISOString();
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const vehicleUsageData = await VehicleUsage.findAndCountAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
        startingDateTime: {
          [Sequelize.Op.between]: [new Date(fromdate1), new Date(enddate1)],
        },
        status: 1,
      },
      ...paginationQuery,
      order: [['startingDateTime', 'DESC']],
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: [
            ['displayName', 'displayName'],
            ['userNumber', 'userNumber'],
          ],
        },
      ],
    });

    for (var i = 0; i < vehicleUsageData.rows.length; i++) {
      branch_contact = await EmployeeBranch.findOne({
        raw: true,
        where: {
          userMasterID: vehicleUsageData.rows[i].userMasterID,
          applicableDate: {
            [Sequelize.Op.lte]: vehicleUsageData.rows[i].startingDateTime,
          },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.eq]: null } },
            {
              endDate: {
                [Sequelize.Op.gte]: vehicleUsageData.rows[i].startingDateTime,
              },
            },
          ],
          status: 1,
        },
        include: [
          { model: BranchMaster, as: 'branchMaster' },
          { model: UserMaster, as: 'employee' },
        ],
      });

      vehicleUsageData.rows[i].dataValues.branchName = branch_contact
        ? branch_contact['branchMaster.branchName']
        : '';
    }

    return res.json({
      status: 200,
      message: 'Data got successfully',
      data: vehicleUsageData.rows,
      totalcount: vehicleUsageData.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getVehicleUsageByCompanyId = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      companyMasterID,
      fromdate,
      todate,
      userMasterID,
      branchMasterID,
      Export,
    } = req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};
    const { Op } = Sequelize;

    const condition = {
      status: 1,
    };

    if (userMasterID) {
      condition.userMasterID = userMasterID;
    }

    if (fromdate && todate) {
      let todate1 = new Date(todate);
      todate1.setDate(todate1.getDate() + 1);

      condition.startingDateTime = {
        [Sequelize.Op.between]: [new Date(fromdate), new Date(todate1)],
      };
    }

    const vehicleUsageAttributes = [
      'vehicleUsageID',
      'userMasterID',
      'startingDateTime',
      'endingDateTime',
      'startkilometer',
      'endkilometer',
      'status',
      'startingMeterImage',
      'isS3Starting',
      'startingMeterThumb',
      'endingMeterImage',
      'isS3Ending',
      'endingMeterThumb',
      'createBy',
      'createdAt',
      'updateBy',
      'updatedAt',
      'vehicleType',
    ];

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    // Fetch vehicle usage along with user and branch data in one query
    const vehicle_Usage = await VehicleUsage.findAndCountAll({
      where: condition,
      attributes: vehicleUsageAttributes,
      ...paginationQuery,

      order: [['vehicleUsageID', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          attributes: [
            ['displayName', 'displayName'],
            ['userNumber', 'userNumber'],
          ],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeBranch,
              where: {
                ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
                ],
              },
              required: branchMasterID ? true : false,
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
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
                ],
              },

              attributes: ['divisionId', 'startDate'],
              include: [
                {
                  model: Division,
                  attributes: ['divisionName'],
                },
              ],
            },

            {
              required: false,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
                ],
              },

              attributes: ['workingAreaId', 'startDate'],
              include: [
                {
                  model: WorkingArea,
                  attributes: ['workingAreaName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
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
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
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
          ],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
      ],
    });

    if (Export) {
      const finalExportData = [];
      for (let e of vehicle_Usage.rows) {
        const obj = {
          'User Name': e.userMaster.displayName,
          'User Number': e.userMaster.userNumber,
          Branch:
            e.userMaster.employeeBranches.length > 0
              ? e.userMaster.employeeBranches?.[0].branchMaster.branchName
              : '',
          Department:
            e.userMaster?.employeeDepartments?.[0]?.department?.departmentName,
          Designation:
            e.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName,
          Division:
            e.userMaster?.employeeDivisions?.[0]?.division?.divisionName,
          'Working Area':
            e.userMaster?.employeeWorkingAreas?.[0]?.workingArea
              ?.workingAreaName,
          'Starting Date Time': e.startingDateTime
            ? moment(asiaKolkataDateTime(e.startingDateTime)).format(
                'DD-MM-YYYY hh:mm:ss A',
              )
            : '',
          'Starting Meter': e.startkilometer,
          'Starting Meter Image': {
            original: e.startingMeterImage,
            thumbnail: e.startingMeterThumb,
            s3UploadattachFile: e.isS3Starting,
          },
          'Ending Date Time': e.endingDateTime
            ? moment(asiaKolkataDateTime(e.endingDateTime)).format(
                'DD-MM-YYYY hh:mm:ss A',
              )
            : '',
          'Ending Meter': e.endkilometer,
          Kilometer: e.endkilometer
            ? Number(e.endkilometer) - Number(e.startkilometer)
            : '',
          'Ending Meter Image': {
            original: e.endingMeterImage,
            thumbnail: e.endingMeterThumb,
            s3UploadattachFile: e.isS3Ending,
          },
          'Created By': e.createdBy?.displayName || '',
          'Created At': moment(e.createdAt).format('DD-MM-YYYY hh:mm:ss A'),
          'Updated By': e.updatedBy?.displayName || '',
          'Updated At': e.updatedBy?.displayName
            ? moment(e.updatedAt).format('DD-MM-YYYY hh:mm:ss A')
            : '',
        };
        finalExportData.push(obj);
      }
      return await generateExcelForVehicleMeterDetails(
        finalExportData,
        `VehicleMeterDetails`,
        'xlsx',
        res,
      );
    }

    // Process the fetched data
    vehicle_Usage.rows.forEach((vehicle) => {
      const branchContact = vehicle.userMaster.employeeBranches[0];
      vehicle.dataValues.branchName = branchContact
        ? branchContact.branchMaster.branchName
        : '';
    });

    return res.status(200).json({
      status: 200,
      data: vehicle_Usage.rows,
      totalcount: vehicle_Usage.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyVehicleMeterUsage = async (req, res, next) => {
  try {
    const { fromdate, todate, page = 1, limit = 10, Export = false } = req.body;

    // Get these from authenticated token
    const userMasterID = req.userDetails.userMasterId;
    const companyMasterID = req.userDetails.companyMasterId;

    const condition = {
      userMasterID,
    };

    // Date filter
    if (fromdate && todate) {
      condition.startingDateTime = {
        [Sequelize.Op.between]: [`${fromdate} 00:00:00`, `${todate} 23:59:59`],
      };
    } else if (fromdate) {
      condition.startingDateTime = {
        [Sequelize.Op.gte]: `${fromdate} 00:00:00`,
      };
    } else if (todate) {
      condition.startingDateTime = {
        [Sequelize.Op.lte]: `${todate} 23:59:59`,
      };
    }

    if (Export) {
      const vehicleUsage = await VehicleUsage.findAll({
        where: condition,
        order: [['startingDateTime', 'DESC']],
        attributes: [
          'userMasterID',
          'startingDateTime',
          'startingMeterImage',
          'startingMeterThumb',
          'isS3Starting',
          'startkilometer',
          'endingDateTime',
          'endingMeterImage',
          'endingMeterThumb',
          'isS3Ending',
          'endkilometer',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['displayName', 'userNumber'],
            include: [
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: ['displayName', 'userMasterID'],
          },
        ],
      });

      const finalExportData = [];

      let totalKilometers = 0;

      for (const vehicle of vehicleUsage) {
        const startMeter = Number(vehicle.startkilometer);
        const endMeter = Number(vehicle.endkilometer);

        const kilometers =
          vehicle.endkilometer !== null &&
          vehicle.endkilometer !== undefined &&
          vehicle.startkilometer !== null &&
          vehicle.startkilometer !== undefined
            ? endMeter - startMeter
            : '';

        if (kilometers !== '') {
          totalKilometers += Number(kilometers);
        }

        finalExportData.push({
          'Employee Code':
            vehicle.userMaster.employeeJoiningDetails[0]?.employeeCode || '',
          'User Name': vehicle.userMaster?.displayName || '',
          'User Number': vehicle.userMaster?.userNumber || '',

          'Starting Date Time': vehicle.startingDateTime
            ? moment(
                asiaKolkataDateTime(vehicle.startingDateTime),
                'YYYY-MM-DD, h:mm:ss A',
              ).format('DD-MM-YYYY hh:mm:ss A')
            : '',

          'Starting Meter': vehicle.startkilometer,

          'Starting Meter Image': {
            original: vehicle.startingMeterImage,
            thumbnail: vehicle.startingMeterThumb,
            s3UploadattachFile: vehicle.isS3Starting,
          },

          'Ending Date Time': vehicle.endingDateTime
            ? moment(
                asiaKolkataDateTime(vehicle.endingDateTime),
                'YYYY-MM-DD, h:mm:ss A',
              ).format('DD-MM-YYYY hh:mm:ss A')
            : '',

          'Ending Meter': vehicle.endkilometer,

          'Ending Meter Image': {
            original: vehicle.endingMeterImage,
            thumbnail: vehicle.endingMeterThumb,
            s3UploadattachFile: vehicle.isS3Ending,
          },

          Kilometer: kilometers,
        });
      }

      finalExportData.push({
        'Employee Code': 'Total',
        'User Name': '',
        'User Number': '',
        'Starting Date Time': '',
        'Starting Meter': '',
        'Starting Meter Image': '',
        'Ending Date Time': '',
        'Ending Meter': '',
        'Ending Meter Image': '',
        Kilometer: totalKilometers,
      });

      return await generateExcelForVehicleMeterDetails(
        finalExportData,
        `MyVehicleMeterDetails`,
        'xlsx',
        res,
      );
    }

    const offset = (page - 1) * limit;

    const result = await VehicleUsage.findAndCountAll({
      where: condition,
      order: [['startingDateTime', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName', 'userMasterID'],
        },
      ],
      offset,
      limit: Number(limit),
    });

    return res.status(200).json({
      status: 200,
      message: 'My vehicle meter usage get successfully.',
      data: result.rows,
      totalcount: result.count,
    });
  } catch (error) {
    next(error);
  }
};
