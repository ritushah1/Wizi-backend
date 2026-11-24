const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserShortLeave = require('../models/userShortLeave');
const ShortLeaveAuthorization = require('../models/shortLeaveAuthorization');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const ShortLeave = require('../models/shortLeave');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const attendanceTransaction = require('../models/attendanceTransaction');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const { error } = require('winston');
const Shift = require('../models/shift');
const {
  sendNotification,
  asiaKolkataDateTime,
  daysInMonth,
  updateAttendanceTrans,
  calculateFullDayHalfDay,
} = require('../utils/commonUtilFunctions');
const UserInbox = require('../models/UserInbox');
const moment = require('moment');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const message = require('../response_message/message');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ExcelJS = require('exceljs');
const companyMaster = require('../models/companyMaster');

async function checkShortLeaveAcceptValidation(userDetails, date, referenceId) {
  let message = null,
    attendanceStatus = null;

  if (!userDetails) return;

  // To Find Day
  const day = new Date(date).toLocaleString('en-us', {
    weekday: 'long',
  });

  // Check if the date is in the future or current

  if (
    new Date(date).getTime() >=
    new Date(asiaKolkataDateTime(new Date()).slice(0, 10)).getTime()
  ) {
    return {
      message: 'Short leave can only be approved for past dates.',
      attendanceStatus,
    };
  }

  const weekoffHoliday = userDetails.weekoffHolidayTrans[0] || null;

  if (weekoffHoliday)
    return {
      message: 'Short leave cannot be approved on a Weekoff/Holiday ',
      attendanceStatus,
    };

  const attendance = userDetails.attendanceTransactions[0] || null;

  if (!attendance)
    return {
      message: `No attendance record found for ${date}.`,
      attendanceStatus,
    };

  if (attendance.fulldayhalfday == 1)
    return {
      message: `You are already marked present on ${date}. Short leave approve is not allowed.`,
      attendanceStatus,
    };

  if (!attendance.OutDateTime)
    return {
      message: `Out time is not recorded for ${date}. Short leave approve cannot be processed.`,
      attendanceStatus,
    };

  const verifiedData = userDetails.hrLeaveMonthlyTrans[0] || null;

  // if verified data found
  if (verifiedData)
    return {
      message:
        'You cannot approve short leave as your attendance has already been verified. ',
      attendanceStatus,
    };

  const shortLeavePolicy =
    userDetails.employeeShortLeavePolicies?.[0]?.shortLeave || null;

  // Check Short Leave Policy assign or not
  if (!shortLeavePolicy)
    return {
      message: 'Please assign a short leave policy before approving.',
      attendanceStatus,
    };

  const salaryPolicy =
    userDetails.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

  let monday = daysInMonth(date.slice(5, 7), date.slice(0, 4));

  let startDate = date.slice(0, 8) + '01',
    endDate = date.slice(0, 8) + monday;

  // if salary policy is available
  if (salaryPolicy) {
    let salaryDate = salaryPolicy.salaryCycleDate;
    startDate = startDate.slice(0, 8) + String(salaryDate).padStart(2, '0');

    // To Check salary consider Month

    if (salaryPolicy.salaryCycleConsider == 'E') {
      const tempDate = new Date(startDate);
      tempDate.setMonth(tempDate.getMonth() - 1);

      startDate =
        tempDate.getFullYear() +
        '-' +
        String(tempDate.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(tempDate.getDate()).padStart(2, '0');

      // set Month days
      monday = daysInMonth(startDate.slice(5, 7), startDate.slice(0, 4));
    }

    // Calculate the end date
    const startDateObj = new Date(startDate);
    startDateObj.setDate(startDateObj.getDate() + (monday - 1));

    endDate = `${startDateObj.getFullYear()}-${String(
      startDateObj.getMonth() + 1,
    ).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`;
  }

  const shortleaveCondition = {
    userMasterID: userDetails.userMasterID,
    date: {
      [Sequelize.Op.between]: [startDate, endDate],
    },
    authorizationStatus: {
      [Sequelize.Op.notIn]: [4, 5],
    },
    userShortLeaveId: {
      [Sequelize.Op.ne]: referenceId,
    },
  };

  const findUsedShortLeaveCount = await UserShortLeave.count({
    where: shortleaveCondition,
  });

  // if used slot leave is greater than to allowed short leave
  if (+findUsedShortLeaveCount >= +shortLeavePolicy.noOfShortLeave)
    return {
      message: `You have reached your limit of ${shortLeavePolicy.noOfShortLeave} short leaves.`,
      attendanceStatus,
    };

  // Shift grace time
  const shiftGraceTime = attendance.shift?.shiftGrace || 0;

  const totalMinutes =
    shiftGraceTime +
    +attendance.roundOffMinutes +
    +shortLeavePolicy.minutesForShortLeave;

  // new fulldayhalf day

  const attendanceFullDayHalfDay = await calculateFullDayHalfDay({
    shiftID: attendance.Shift,
    dayName: day,
    totalWorkMin: totalMinutes,
  });
  // Check if adding short leave minutes does not change the attendance status
  if (+attendance.fulldayhalfday == attendanceFullDayHalfDay) {
    return {
      message: `Applying '${shortLeavePolicy.minutesForShortLeave}' minutes of short leave will not change your attendance status. Hence, short leave cannot be approved.`,
      attendanceStatus,
    };
  } else {
    return { message, attendanceStatus: attendanceFullDayHalfDay };
  }
}

exports.listShortLeaveAuthRequest = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      isExport = false,
    } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginateCondition =
      page && limit && !isExport ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
    };

    if (status !== null && status !== undefined) {
      condition.authstatus = status;
      if (+status === 2) {
        condition['$userShortLeave.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
    }
    if (user && user.length > 0) {
      condition['$userShortLeave.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$userShortLeave.date$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const { rows: authRequest, count } =
      await ShortLeaveAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: UserShortLeave,
            include: [
              {
                model: UserMaster,
                where: userCondition,
                attributes: [
                  'displayName',
                  'userNumber',
                  'userMasterID',
                  'photo',
                  'companyMasterId',
                ],
                include: [
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    separate: true,
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeDesignation,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                        },
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
                    separate: true,
                    required: false,
                    model: EmployeeDepartment,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                        },
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
                    required: false,
                    separate: true,

                    model: EmployeeBranch,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    separate: true,
                    model: EmployeeDivision,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
                        { endDate: { [Sequelize.Op.eq]: null } },
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
                    separate: true,
                    model: EmployeeWorkingArea,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
                        { endDate: { [Sequelize.Op.eq]: null } },
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
                    separate: true,
                    model: AuthorizationDetails,
                    where: {
                      status: 1,
                      AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
                    },
                    attributes: ['AuthorizationCriteriaID'],
                    include: [
                      {
                        model: AuthorizationCriteriaMaster,
                        attributes: ['AuthorizationCriteria'],
                      },
                    ],
                  },
                ],
              },
              {
                model: ShortLeaveAuthorization,
                attributes: ['authstatus'],
                include: [
                  {
                    model: UserMaster,
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'authorizer',
                attributes: ['displayName'],
              },
              {
                model: attendanceTransaction,
                attributes: [
                  'InDatetime',
                  'OutDateTime',
                  'Shift',
                  'Shifthrs',
                  'ShiftIntime',
                  'ShiftoutTime',
                  'fulldayhalfday',
                  'roundOffMinutes',
                ],
                include: [{ model: Shift, attributes: ['shiftName'] }],
              },
            ],
          },
        ],
      });

    if (isExport) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        'ShortLeaveAuthorizationRequests',
      );

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 18 }, // 1
        { header: 'Employee Code', key: 'employeeCode', width: 18 }, // 1
        { header: 'Employee Name', key: 'employeeName', width: 25 }, // 2
        { header: 'Branch', key: 'branchName', width: 20 }, // 3
        { header: 'Department', key: 'departmentName', width: 22 }, // 4
        { header: 'Designation', key: 'designationName', width: 22 }, // 5
        { header: 'Division', key: 'divisionName', width: 20 }, // 6
        { header: 'Working Area', key: 'workingAreaName', width: 20 }, // 7
        { header: 'Short Leave Date', key: 'shortLeaveDate', width: 15 }, // 8
        { header: 'Attendance Status', key: 'attendanceStatus', width: 15 }, // 8
        { header: 'In Date-Time', key: 'inDateTime', width: 22 }, // 9
        { header: 'Out Date-Time', key: 'outDateTime', width: 22 }, // 10
        { header: 'Shift', key: 'shiftName', width: 20 }, // 11
        { header: 'Shift In-Time', key: 'shiftInTime', width: 15 }, // 12
        { header: 'Shift Out-Time', key: 'shiftOutTime', width: 15 }, // 13
        { header: 'Shift Hours', key: 'shiftHours', width: 12 }, // 14
        { header: 'Remarks', key: 'remarks', width: 25 }, // 16
        { header: 'Status', key: 'authStatus', width: 15 }, // 15
        { header: 'Auth Criteria', key: 'authCriteria', width: 25 }, // 17
        { header: 'Authorizer', key: 'authorizer', width: 25 }, // 18 ← per-row
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // 19 ← per-row
        { header: 'Applied On', key: 'createdAt', width: 18 }, // 20
      ];

      worksheet.columns = columns;

      // ── Style header row ─────────────────────────────────────────────────
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 30;

      // ── Data rows ────────────────────────────────────────────────────────
      let currentRowIndex = 2;

      for (const request of authRequest) {
        const shortLeave = request.userShortLeave || {};
        const userData = shortLeave.userMaster || {};
        const attendance = shortLeave.attendanceTransaction || {};

        // ── Employee identifiers ─────────────────────────────────────────
        const companyName = userData?.companyMaster?.companyName;

        const empCode =
          (userData.employeeJoiningDetails || [])[0]?.employeeCode || '';

        const designationName =
          (userData.employeeDesignations || [])[0]?.designation
            ?.designationName || '';

        const departmentName =
          (userData.employeeDepartments || [])[0]?.department?.departmentName ||
          '';

        const branchName =
          (userData.employeeBranches || [])[0]?.branchMaster?.branchName || '';

        const divisionName =
          (userData.employeeDivisions || [])[0]?.division?.divisionName || '';

        const workingAreaName =
          (userData.employeeWorkingAreas || [])[0]?.workingArea
            ?.workingAreaName || '';

        // ── Short leave fields ───────────────────────────────────────────
        const shortLeaveDate = shortLeave.date
          ? moment(shortLeave.date).format('DD-MM-YYYY')
          : '';

        const remarks = shortLeave.remarks || '';

        // ── Attendance transaction fields ────────────────────────────────
        const inDateTime = attendance.InDatetime
          ? moment(attendance.InDatetime).format('DD-MM-YYYY HH:mm')
          : '';

        const outDateTime = attendance.OutDateTime
          ? moment(attendance.OutDateTime).format('DD-MM-YYYY HH:mm')
          : '';

        const shiftName = attendance.shift?.shiftName || '';
        const shiftInTime = attendance.ShiftIntime || '';
        const shiftOutTime = attendance.ShiftoutTime || '';
        const shiftHours = attendance.Shifthrs || '';

        const attendanceStatus =
          attendance.fulldayhalfday == 1
            ? 'Present'
            : attendance.fulldayhalfday == 0.5
              ? 'Half Day'
              : 'Absent';

        // ── Auth status ──────────────────────────────────────────────────
        // authstatus lives on ShortLeaveAuthorization (the parent row)
        const authStatusLabel =
          request.authstatus == 4
            ? 'Rejected'
            : request.authstatus == 3
              ? 'Approved'
              : 'Pending';

        // ── Auth criteria ────────────────────────────────────────────────
        // Sourced from nested AuthorizationDetails → AuthorizationCriteriaMaster
        const authCriteria =
          (userData.authorizationDetails || [])[0]?.AuthorizationCriteriaMaster
            ?.dataValues?.AuthorizationCriteria || '';

        // ── Authorizer rows ──────────────────────────────────────────────
        // shortLeaveAuthorizations is the nested ShortLeaveAuthorization array
        // included under UserShortLeave in the query
        const authorizers = (shortLeave.shortLeaveAuthorizations || []).map(
          (auth) => ({
            name: auth.userMaster?.displayName || '',
            status:
              auth.authstatus == 0
                ? 'Rejected'
                : auth.authstatus == 1
                  ? 'Approved'
                  : auth.authstatus == 2
                    ? 'Pending'
                    : '',
          }),
        );

        const rowCount = Math.max(authorizers.length, 1);

        // ── Common fields (shared across all merged rows) ────────────────
        const commonFields = {
          companyName,
          employeeCode: empCode,
          employeeName: userData.displayName || '',
          branchName,
          attendanceStatus,
          departmentName,
          designationName,
          divisionName,
          workingAreaName,
          shortLeaveDate,
          inDateTime,
          outDateTime,
          shiftName,
          shiftInTime,
          shiftOutTime,
          shiftHours,
          authStatus: authStatusLabel,
          remarks,
          authCriteria,
          createdAt: request.createdAt
            ? moment(request.createdAt).format('DD-MM-YYYY hh:mm')
            : '',
        };

        // ── Write one row per authorizer ─────────────────────────────────
        for (let i = 0; i < rowCount; i++) {
          const auth = authorizers[i] || { name: '', status: '' };
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: auth.name,
            authorizerStatus: auth.status,
          });
          excelRow.height = 20;
          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
        }

        // ── Merge common columns across authorizer rows ──────────────────
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          // All cols except 18 (authorizer) and 19 (authorizerStatus)
          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            22,
          ];

          for (const colNum of columnsToMerge) {
            worksheet.mergeCells(mergeStart, colNum, mergeEnd, colNum);
            const mergedCell = worksheet.getCell(mergeStart, colNum);
            mergedCell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true,
            };
          }
        }

        currentRowIndex += rowCount;
      }

      // ── Stream response ──────────────────────────────────────────────────
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ShortLeaveAuthorizationRequests.xlsx"',
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: authRequest,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuthorizationRequestByReferenceId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const authData = await ShortLeaveAuthorization.findAll({
      where: {
        referenceId: id,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: authData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuthorizationRequestByReferenceIdV2 = async (req, res, next) => {
  try {
    let { id, userMasterID } = req.body;
    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const authData = await ShortLeaveAuthorization.findAll({
      where: {
        referenceId: id,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],
        },
        {
          model: UserShortLeave,
          where: {
            userMasterID: userMasterID,
          },
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: authData,
    });
  } catch (error) {
    next(error);
  }
};

exports.shortLeaveAcceptReject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id, authstatus, remarks } = req.body;

    const shortLeaveAuthorizationIDList = Array.isArray(id) ? id : [id];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await ShortLeaveAuthorization.findAll({
      where: {
        id: shortLeaveAuthorizationIDList,
        authstatus: 2,
      },
      attributes: ['id', 'userMasterID', 'authstatus', 'referenceId'],
      include: [
        {
          model: UserShortLeave,
          where: {
            authorizationStatus: [
              AuthorizationStatusType.PENDING_ZERO,
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          attributes: [
            'userShortLeaveId',
            'userMasterID',
            'date',
            'authorizationStatus',
          ],
          include: [
            {
              model: UserMaster,
              attributes: ['displayName', 'userMasterID'],
              include: [
                {
                  separate: true,
                  model: AuthorizationDetails,
                  attributes: [
                    'AuthorizationDetailsId',
                    'AuthorizationCriteriaID',
                    'AuthorizationMasterID',
                    'AuthorizedByUserMasterId',
                  ],
                  where: {
                    AuthorizationMasterID: authorizationMasterTypes.leave,
                    status: 1,
                  },
                },
                {
                  model: EmployeeShortLeavePolicy,
                  attributes: ['id'],
                  include: [
                    {
                      model: ShortLeave,
                      attributes: ['minutesForShortLeave'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      ...options,
    });

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 500,
        message: 'Short Leave Authorization request not found',
      });
    }

    if (authstatus == 0) {
      const allShortLeaveIds = authRequests.map((e) => {
        return e?.userShortLeave?.userShortLeaveId;
      });

      const allAuthorizer = await getAllShortLeaves(allShortLeaveIds, options);

      const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
        e.shortLeaveAuthorizations.map((id) => id.id),
      );

      const getIdtoUpdateShortLeaveAuth = allIdToDestroyInbox.filter((item) =>
        shortLeaveAuthorizationIDList.includes(item),
      );
      await updateShortLeaveAuth(
        getIdtoUpdateShortLeaveAuth,
        options,
        remarks,
        authstatus,
      );
      await destroyAllInboxes(allIdToDestroyInbox, options);
      await updateUserShortLeave(
        allShortLeaveIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Short Leave Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateShortLeave = [];
      let allIDsToUpdateShortLeaveAuth = [];
      let bulkNotification = [];
      let fullDayUsers = [];
      let halfDayUsers = [];
      authRequests.map((data) => {
        if (
          data?.userShortLeave?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            shortLeaveAuthorizationID: data.id,
            referenceId: data.referenceId,
          });
        }
        if (
          data?.userShortLeave?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            shortLeaveAuthorizationID: data.id,
            referenceId: data.referenceId,
          });
        }
        if (
          data?.userShortLeave?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            shortLeaveAuthorizationID: data.id,
            referenceId: data.referenceId,
          });
        }
        if (
          data?.userShortLeave?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            shortLeaveAuthorizationID: data.id,
            referenceId: data.referenceId,
            authorizerIDs:
              data.userShortLeave.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification: data.userShortLeave.userMaster.displayName,
            assignedBy: data.userShortLeave.userMaster.userMasterID,
            date: data.userShortLeave.date,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllUserShortLeaveIds = anyOneData.map((e) => {
          return e.referenceId;
        });

        const getAllAuthorizers = await getAllShortLeaves(
          getAllUserShortLeaveIds,
          options,
        );

        const attendanceMap = await getAttendanceData(getAllAuthorizers);

        const userMasterIds = [
          ...new Set(getAllAuthorizers.map((item) => item.userMasterID)),
        ];

        const employeePolicies = await EmployeeShortLeavePolicy.findAll({
          where: {
            userMasterID: userMasterIds,
          },
          include: [{ model: ShortLeave }],
        });

        const policyMap = new Map();

        for (const policy of employeePolicies) {
          if (!policyMap.has(policy.userMasterID)) {
            policyMap.set(policy.userMasterID, []);
          }
          policyMap.get(policy.userMasterID).push(policy);
        }

        for (const item of getAllAuthorizers) {
          const userPolicies = policyMap.get(item.userMasterID) || [];
          const policy = getApplicablePolicy(userPolicies, new Date(item.date));
          if (!policy) continue;

          const attendance =
            attendanceMap.get(`${item.userMasterID}_${item.date}`) || null;

          // if attendance transaction is found
          if (attendance) {
            const shiftGrace = attendance?.shift?.shiftGrace || 0;
            const totalMinutes =
              shiftGrace +
              +attendance.roundOffMinutes +
              +policy.shortLeave.minutesForShortLeave;

            const day = new Date(item.date).toLocaleString('en-us', {
              weekday: 'long',
            });

            const fulldayhalfday = await calculateFullDayHalfDay({
              shiftID: attendance.Shift,
              dayName: day,
              totalWorkMin: totalMinutes,
            });

            if (fulldayhalfday === 1) {
              fullDayUsers.push(attendance.AttendanceTransID);
            } else if (fulldayhalfday === 0.5) {
              halfDayUsers.push(attendance.AttendanceTransID);
            }
          }
        }

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.shortLeaveAuthorizations.map((id) => id.id),
        );
        const getIdtoUpdateExtraDayAuth = getAllIdsToDestryInbox.filter(
          (item) => shortLeaveAuthorizationIDList.includes(item),
        );

        allIDsToUpdateShortLeaveAuth = [
          ...allIDsToUpdateShortLeaveAuth,
          ...getIdtoUpdateExtraDayAuth,
        ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateShortLeave = [
          ...allIDsToUpdateShortLeave,
          ...getAllUserShortLeaveIds,
        ];
      }
      if (anyTwoData.length > 0) {
        const getAllUserShortLeaveIds = anyTwoData.map((e) => e.referenceId);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.shortLeaveAuthorizationID,
        );

        const getAllShortLeave = await getAllShortLeaves(
          getAllUserShortLeaveIds,
          options,
        );

        const attendanceMap = await getAttendanceData(getAllShortLeave);

        const userMasterIds = [
          ...new Set(getAllShortLeave.map((item) => item.userMasterID)),
        ];

        const employeePolicies = await EmployeeShortLeavePolicy.findAll({
          where: {
            userMasterID: userMasterIds,
          },
          include: [{ model: ShortLeave }],
        });

        const policyMap = new Map();

        for (const policy of employeePolicies) {
          if (!policyMap.has(policy.userMasterID)) {
            policyMap.set(policy.userMasterID, []);
          }
          policyMap.get(policy.userMasterID).push(policy);
        }
        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];

        for (const item of getAllShortLeave) {
          const authorizers = item.shortLeaveAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.id);
            const userPolicies = policyMap.get(item.userMasterID) || [];
            const policy = getApplicablePolicy(
              userPolicies,
              new Date(item.date),
            );
            if (!policy) continue;

            const attendance =
              attendanceMap.get(`${item.userMasterID}_${item.date}`) || null;

            // if attendance transaction is found
            if (attendance) {
              const shiftGrace = attendance?.shift?.shiftGrace || 0;
              const totalMinutes =
                shiftGrace +
                +attendance.roundOffMinutes +
                +policy.shortLeave.minutesForShortLeave;

              const day = new Date(item.date).toLocaleString('en-us', {
                weekday: 'long',
              });

              const fulldayhalfday = await calculateFullDayHalfDay({
                shiftID: attendance.Shift,
                dayName: day,
                totalWorkMin: totalMinutes,
              });

              if (fulldayhalfday === 1) {
                fullDayUsers.push(attendance.AttendanceTransID);
              } else if (fulldayhalfday === 0.5) {
                halfDayUsers.push(attendance.AttendanceTransID);
              }
            }

            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.userShortLeaveId);
          }
        }

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => shortLeaveAuthorizationIDList.includes(item),
        );

        allIDsToUpdateShortLeaveAuth = [
          ...allIDsToUpdateShortLeaveAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateShortLeave = [
          ...allIDsToUpdateShortLeave,
          ...shortLeaveApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const getAllUserShortLeaveIds = anyThreeData.map((e) => e.referenceId);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.shortLeaveAuthorizationID,
        );

        const getAllShortLeave = await getAllShortLeaves(
          getAllUserShortLeaveIds,
          options,
        );

        const attendanceMap = await getAttendanceData(getAllShortLeave);
        const userMasterIds = [
          ...new Set(getAllShortLeave.map((item) => item.userMasterID)),
        ];

        const employeePolicies = await EmployeeShortLeavePolicy.findAll({
          where: {
            userMasterID: userMasterIds,
          },
          include: [{ model: ShortLeave }],
        });

        const policyMap = new Map();
        for (const policy of employeePolicies) {
          if (!policyMap.has(policy.userMasterID)) {
            policyMap.set(policy.userMasterID, []);
          }
          policyMap.get(policy.userMasterID).push(policy);
        }
        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];

        for (const item of getAllShortLeave) {
          const authorizers = item.shortLeaveAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.id);

            const userPolicies = policyMap.get(item.userMasterID) || [];
            const policy = getApplicablePolicy(
              userPolicies,
              new Date(item.date),
            );
            if (!policy) continue;

            const attendance =
              attendanceMap.get(`${item.userMasterID}_${item.date}`) || null;

            // if attendance transaction is found
            if (attendance) {
              const shiftGrace = attendance?.shift?.shiftGrace || 0;
              const totalMinutes =
                shiftGrace +
                +attendance.roundOffMinutes +
                +policy.shortLeave.minutesForShortLeave;

              const day = new Date(item.date).toLocaleString('en-us', {
                weekday: 'long',
              });

              const fulldayhalfday = await calculateFullDayHalfDay({
                shiftID: attendance.Shift,
                dayName: day,
                totalWorkMin: totalMinutes,
              });

              if (fulldayhalfday === 1) {
                fullDayUsers.push(attendance.AttendanceTransID);
              } else if (fulldayhalfday === 0.5) {
                halfDayUsers.push(attendance.AttendanceTransID);
              }
            }

            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.userShortLeaveId);
          }
        }

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => shortLeaveAuthorizationIDList.includes(item),
        );

        allIDsToUpdateShortLeaveAuth = [
          ...allIDsToUpdateShortLeaveAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateShortLeave = [
          ...allIDsToUpdateShortLeave,
          ...shortLeaveApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const getAllShortLeaveId = sequenceWise.map((e) => e.referenceId);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.shortLeaveAuthorizationID,
        );

        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];
        const createShortLeaveAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateExtraDayAuth = getAUthorizationReqId.filter((item) =>
          shortLeaveAuthorizationIDList.includes(item),
        );
        await updateShortLeaveAuth(
          getIdtoUpdateExtraDayAuth,
          options,
          remarks,
          authstatus,
        );
        const getAllShortLeave = await getAllShortLeaves(
          getAllShortLeaveId,
          options,
        );

        const attendanceMap = await getAttendanceData(getAllShortLeave);
        const userMasterIds = [
          ...new Set(getAllShortLeave.map((item) => item.userMasterID)),
        ];

        const employeePolicies = await EmployeeShortLeavePolicy.findAll({
          where: {
            userMasterID: userMasterIds,
          },
          include: [{ model: ShortLeave }],
        });

        const policyMap = new Map();
        for (const policy of employeePolicies) {
          if (!policyMap.has(policy.userMasterID)) {
            policyMap.set(policy.userMasterID, []);
          }
          policyMap.get(policy.userMasterID).push(policy);
        }
        for (const item of getAllShortLeave) {
          const authorizers = item.shortLeaveAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus === 1);

          const seq = sequenceWise.find(
            (x) => x.referenceId === item.userShortLeaveId,
          );

          if (!seq) continue;

          const sequenceUserIDs = seq.authorizerIDs.map((id) => id.toString());

          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString(),
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id),
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map((a) => a.id);

            const userPolicies = policyMap.get(item.userMasterID) || [];
            const policy = getApplicablePolicy(
              userPolicies,
              new Date(item.date),
            );
            if (!policy) continue;

            const attendance =
              attendanceMap.get(`${item.userMasterID}_${item.date}`) || null;
            // if attendance transaction is found
            if (attendance) {
              const shiftGrace = attendance?.shift?.shiftGrace || 0;
              const totalMinutes =
                shiftGrace +
                +attendance.roundOffMinutes +
                +policy.shortLeave.minutesForShortLeave;

              const day = new Date(item.date).toLocaleString('en-us', {
                weekday: 'long',
              });

              const fulldayhalfday = await calculateFullDayHalfDay({
                shiftID: attendance.Shift,
                dayName: day,
                totalWorkMin: totalMinutes,
              });

              if (fulldayhalfday === 1) {
                fullDayUsers.push(attendance.AttendanceTransID);
              } else if (fulldayhalfday === 0.5) {
                halfDayUsers.push(attendance.AttendanceTransID);
              }
            }

            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.userShortLeaveId);
            continue;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createShortLeaveAuth.push({
            referenceId: item.userShortLeaveId,
            userMasterID: +nextUser,
            authstatus: 2,
          });
        }

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateShortLeave = [
          ...allIDsToUpdateShortLeave,
          ...shortLeaveApprovedIds,
        ];

        const createNewExtraDaysAuth = await ShortLeaveAuthorization.bulkCreate(
          createShortLeaveAuth,
          { ...options },
        );

        sequenceWise.map((item) => {
          const data = createNewExtraDaysAuth.find(
            (e) => e.userShortLeaveId == item.userShortLeaveId,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              userShortLeaveId: item.userShortLeaveId,
              assignedBy: item.assignedBy,
              activityTable: ShortLeaveAuthorization.getTableName(),
              activityTablePK: data.id,
              message: `${item.userNameForNotification} has requested Short Leave for ${moment(
                item.date,
              ).format('DD/MM/YYYY')}`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }
      await updateShortLeaveAuth(
        allIDsToUpdateShortLeaveAuth,
        options,
        remarks,
        authstatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);

      if (allIDsToUpdateShortLeave.length > 0) {
        await updateUserShortLeave(
          allIDsToUpdateShortLeave,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          remarks,
        );
      }
      if (fullDayUsers.length > 0) {
        await updateAttendanceTrans(
          fullDayUsers,
          1,
          options,
          req.userDetails.userMasterId,
        );
      }
      if (halfDayUsers.length > 0) {
        await updateAttendanceTrans(
          halfDayUsers,
          0.5,
          options,
          req.userDetails.userMasterId,
        );
      }

      await transaction.commit();
      const data = {
        screen: 'shortLeaveAuth',
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: 'Short Leave',
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });

      return res.status(200).json({
        status: 200,
        message: 'Short Leave Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllShortLeaveAuthAdmin = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
    } = req.body;

    let { enddate } = req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'startdate',
      'enddate',
      'page',
      'limit',
      'authorizationstatus',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {
      status: 1,
    };

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition['$userShortLeave.date$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const getAllAuthRequest = await UserShortLeave.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          attributes: ['displayName', 'userNumber', 'userMasterID', 'photo'],
          include: [
            ...userAccessCondition.includeModels,
            {
              separate: true,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                  },
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
              separate: true,
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                  },
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
              required: false,
              separate: true,

              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
              separate: true,
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
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
              separate: true,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
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
              separate: true,
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllAuthRequest.rows,
      totalcount: getAllAuthRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectUserShortLeaveRequestAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userShortLeaveId, authstatus, rejectionRemarks } = await req.body;

    if (!userShortLeaveId) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Short Leave Authorization Request',
        ),
      });
    }

    const allowedKeys = ['userShortLeaveId', 'authstatus', 'rejectionRemarks'];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const shortLeaveAuthorizationIDList = Array.isArray(userShortLeaveId)
      ? userShortLeaveId
      : [userShortLeaveId];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const allAuthData = await UserShortLeave.findAll({
      where: {
        userShortLeaveId: shortLeaveAuthorizationIDList,
        authorizationStatus: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      attribute: [
        'userShortLeaveId',
        'userMasterID',
        'date',
        'authorizationStatus',
      ],
      include: [
        {
          required: false,
          model: ShortLeaveAuthorization,
          where: { authstatus: 2 },
          attributes: ['id', 'userMasterID', 'authstatus', 'referenceId'],
        },
        {
          model: UserMaster,
          where: { ...userAccessCondition.where },
          attributes: ['displayName', 'userMasterID'],
          include: [
            ...userAccessCondition.includeModels,
            {
              separate: true,
              model: AuthorizationDetails,
              attributes: [
                'AuthorizationDetailsId',
                'AuthorizationCriteriaID',
                'AuthorizationMasterID',
                'AuthorizedByUserMasterId',
              ],
              where: {
                AuthorizationMasterID: authorizationMasterTypes.leave,
                status: 1,
              },
            },
          ],
        },
      ],
    });

    if (allAuthData.length == 0) {
      await transaction.rollback();

      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Short Leave Authorization Request',
        ),
      });
    }

    const allShortLeaveIds = allAuthData.map((e) => {
      return e?.userShortLeaveId;
    });

    const allIdToDestroyInbox = allAuthData.flatMap((e) =>
      e.shortLeaveAuthorizations.map((id) => id.id),
    );

    await destroyAllInboxes(allIdToDestroyInbox, options);
    const fullDayUsers = [];
    const halfDayUsers = [];
    if (authstatus == 0) {
      await updateUserShortLeave(
        allShortLeaveIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        true,
        rejectionRemarks,
      );
    } else {
      const attendanceMap = await getAttendanceData(allAuthData);

      const userMasterIds = [
        ...new Set(allAuthData.map((item) => item.userMasterID)),
      ];

      const employeePolicies = await EmployeeShortLeavePolicy.findAll({
        where: {
          userMasterID: userMasterIds,
        },
        include: [{ model: ShortLeave }],
      });

      const policyMap = new Map();

      for (const policy of employeePolicies) {
        if (!policyMap.has(policy.userMasterID)) {
          policyMap.set(policy.userMasterID, []);
        }
        policyMap.get(policy.userMasterID).push(policy);
      }
      for (const item of allAuthData) {
        const userPolicies = policyMap.get(item.userMasterID) || [];
        const policy = getApplicablePolicy(userPolicies, new Date(item.date));
        if (!policy) continue;

        const attendance =
          attendanceMap.get(`${item.userMasterID}_${item.date}`) || null;

        // if attendance transaction is found
        if (attendance) {
          const shiftGrace = attendance?.shift?.shiftGrace || 0;
          const totalMinutes =
            shiftGrace +
            +attendance.roundOffMinutes +
            +policy.shortLeave.minutesForShortLeave;

          const day = new Date(item.date).toLocaleString('en-us', {
            weekday: 'long',
          });

          const fulldayhalfday = await calculateFullDayHalfDay({
            shiftID: attendance.Shift,
            dayName: day,
            totalWorkMin: totalMinutes,
          });

          if (fulldayhalfday === 1) {
            fullDayUsers.push(attendance.AttendanceTransID);
          } else if (fulldayhalfday === 0.5) {
            halfDayUsers.push(attendance.AttendanceTransID);
          }
        }
      }

      await updateUserShortLeave(
        allShortLeaveIds,
        options,
        AuthorizationStatusType.APPROVED,
        req.userDetails.userMasterId,
        true,
        rejectionRemarks,
      );

      if (fullDayUsers.length > 0) {
        updateAttendanceTrans(
          fullDayUsers,
          1,
          options,
          req.userDetails.userMasterId,
        );
      }

      if (halfDayUsers.length > 0) {
        updateAttendanceTrans(
          halfDayUsers,
          0.5,
          options,
          req.userDetails.userMasterId,
        );
      }
    }
    await transaction.commit();

    if (authstatus == 1) {
      const notification1 = {
        title: 'Short Leave',
        body: 'Short Leave accepted successfully',
      };

      const data = {
        screen: 'shortLeaveAuth',
      };

      const userMasterID = allAuthData.map((item) => item.userMasterID);

      userMasterID.forEach((item) =>
        sendNotification(item, notification1, data),
      );
    }

    return res.status(200).json({
      status: 200,
      message:
        authstatus === 1
          ? 'Short Leave Request Accepted Successfully.'
          : 'Short Leave Request Rejected Successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

async function updateShortLeaveAuth(
  allIdToUpdate,
  options,
  remarks,
  authStatus,
) {
  const updateAllAuthorizationById = await ShortLeaveAuthorization.update(
    {
      remarks: remarks,
      authstatus: authStatus,
    },
    {
      where: {
        id: allIdToUpdate,
      },
      ...options,
    },
  );
  return;
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: ShortLeaveAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateUserShortLeave(
  allShortLeaveIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  await UserShortLeave.update(
    {
      authorizationStatus: authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
    },
    {
      where: {
        userShortLeaveId: allShortLeaveIds,
      },
      ...options,
    },
  );
}

async function getAllShortLeaves(allShortLeaveIds, options) {
  const allAuthorizer = await UserShortLeave.findAll({
    where: {
      userShortLeaveId: allShortLeaveIds,
    },
    include: [
      {
        model: ShortLeaveAuthorization,
      },
    ],
    ...options,
  });
  return allAuthorizer;
}

async function getAttendanceData(allShortLeave = []) {
  const attendanceMap = new Map();

  if (!allShortLeave?.length) return attendanceMap;

  const conditions = allShortLeave.map((item) => ({
    userMasterID: item.userMasterID,
    AttendanceDate: item.date,
  }));

  const attendanceData = await attendanceTransaction.findAll({
    where: {
      [Sequelize.Op.or]: conditions,
    },
    attributes: [
      'AttendanceTransID',
      'userMasterID',
      'AttendanceDate',
      'roundOffMinutes',
      'Shift',
    ],
    include: [
      {
        model: Shift,
        attributes: ['shiftID', 'shiftGrace'],
      },
    ],
  });

  attendanceData.forEach((item) => {
    attendanceMap.set(`${item.userMasterID}_${item.AttendanceDate}`, item);
  });

  return attendanceMap;
}

function getApplicablePolicy(policies, date) {
  return policies.find(
    (p) =>
      new Date(p.applicableDate) <= date &&
      (!p.endDate || new Date(p.endDate) >= date),
  );
}
