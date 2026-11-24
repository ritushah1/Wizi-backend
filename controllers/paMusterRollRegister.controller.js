const Designation = require('../models/designation');
const Sequelize = require('sequelize');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const message = require('../response_message/message');
const moment = require('moment');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  getDatesFromDateRange,
  asiaKolkataDateTime,
  toGetFinalHolidayWeekoff,
  checkLeaveOnWH,
  findCompanySubscription,
  daysInMonth,
  getUniqueSheetName,
  formatMemoryToShow,
  get7DaysBefore_WeekoffHoliday_Attendance_Map,
  getAllWeekoffHolidayWithPriority,
  getWeekOffBasedOnWeekoffAbsent,
} = require('../utils/commonUtilFunctions');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const Shift = require('../models/shift');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const {
  roleType,
  weekoffTypeEnum,
  MonthDaysTypeEnum,
  salaryCalculationAct,
  offDayCategoryEnum,
} = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const EmployeeProject = require('../models/employeeProject');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const {
  userAttributes,
  statusCodes,
  paMUSTERROLLReportTypes,
  attendanceStatusForCalender,
} = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');
const path = require('path');
const fs = require('fs');
const Excel = require('exceljs');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const JSZip = require('jszip');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

// Api--------------------------------------

exports.musterRegisterWithSalaryCycle = async (req, res, next) => {
  try {
    let {
      YearMM,
      salaryPolicyID,
      page,
      limit,
      userMasterID,
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      projectID,
      skillCategory,
      salarytype,
      employmentType,
      exportData,
      exportDataFileType,
      reportType,
    } = req.body;
    const requestByUser = req.userDetails.userMasterId;

    if (
      // !userMasterID  ||
      !YearMM ||
      !companyMasterID
    )
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
        data: [],
      });

    const getCompanySubscription =
      await findCompanySubscription(companyMasterID);
    if (!getCompanySubscription) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company Subscription'),
        data: [],
      });
    }
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const formattedYearMonth = moment(YearMM, 'YYYY-MM').format('MMMM-YYYY');
    const [year, month] = YearMM.split('-');

    // Start date -> First day of the month
    const calendarstartdate = moment(YearMM, 'YYYY-MM')
      .startOf('month')
      .format('YYYY-MM-DD');
    let calendarenddate = moment(YearMM, 'YYYY-MM')
      .endOf('month')
      .format('YYYY-MM-DD');
    const subscriptionEndDate = moment(getCompanySubscription.endDate).format(
      'YYYY-MM-DD',
    );

    calendarenddate = moment
      .min(
        moment(calendarenddate, 'YYYY-MM-DD'),
        moment(subscriptionEndDate, 'YYYY-MM-DD'),
      )
      .format('YYYY-MM-DD');
    const yearMonth = String(year) + String(month);
    const companySalaryPolicyCondition = {
      companyMasterID: companyMasterID,
      status: 1,
    };
    if (salaryPolicyID) {
      companySalaryPolicyCondition.salaryPolicyID = salaryPolicyID;
    }
    const [companySalaryPolicy, companyLeaveTypes, companyData] =
      await Promise.all([
        SalaryPolicy.findAll({
          where: companySalaryPolicyCondition,
          order: [['salaryPolicyName', 'ASC']],
        }),
        HrLeaveTypes.findAll({
          where: {
            LeaveID: {
              [Sequelize.Op.notIn]: [5],
            },
            status: 1,
            companyMasterID,
            [Sequelize.Op.or]: [{ Leave_Allow: 'Y' }, { LeaveID: 25 }],
          },
          include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
        }),
        companyMaster.findOne({
          where: {
            companyMasterID,
            status: 1,
          },
          attributes: ['companyName', 'companyAddress'],
        }),
      ]);
    const salaryPolicyIDs = companySalaryPolicy.map((e) => +e.salaryPolicyID);
    const userCondtion = {
      status: [0, 1],
      companyMasterId: companyMasterID,
    };
    if (userMasterID && userMasterID.length) {
      userCondtion.userMasterID = userMasterID;
    }

    const empJoiningCondition = {
      joiningDate: {
        [Sequelize.Op.lte]: calendarenddate,
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: calendarstartdate },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
        },
      ],
    };
    if (salarytype) empJoiningCondition.salarytype = salarytype;
    if (employmentType) empJoiningCondition.employment = employmentType;
    const YYYYMM = calendarenddate.slice(0, 7).replace('-', '');

    const skillCategoryCondition = {};
    if (skillCategory) {
      skillCategoryCondition.skillCategory = skillCategory;
      (skillCategoryCondition.applicableYYYYMM = {
        [Sequelize.Op.lte]: +YYYYMM,
      }),
        (skillCategoryCondition[Sequelize.Op.or] = [
          { endYYYYMM: { [Sequelize.Op.gte]: +YYYYMM } },
          { endYYYYMM: { [Sequelize.Op.eq]: null } },
        ]);
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const [findEmployeeWithSalaryPolicys, findEmployeeWithoutSalaryPolicys] =
      await Promise.all([
        EmployeeSalaryPolicy.findAll({
          distinct: true,
          where: {
            status: 1,
            salaryPolicyID: salaryPolicyIDs,
            startDate: {
              [Sequelize.Op.lte]: new Date(calendarenddate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(calendarenddate),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          include: [
            {
              required: true,
              model: UserMaster,
              as: 'employee',
              where: { ...userCondtion, ...userAccessCondition.where },
              attributes: [],
              include: [
                ...userAccessCondition.includeModels,
                {
                  required: true,
                  model: EmployeeJoiningDetails,
                  where: empJoiningCondition,
                  attributes: [],
                },
                {
                  required:
                    branchMasterID && branchMasterID.length ? true : false,
                  model: EmployeeBranch,
                  as: 'emp_branch',
                  where: {
                    status: 1,
                    ...(branchMasterID &&
                      (!Array.isArray(branchMasterID) ||
                        branchMasterID.length) && {
                        branchID: branchMasterID,
                      }),
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required: departmentID && departmentID.length ? true : false,
                  model: EmployeeDepartment,
                  as: 'emp_dept',
                  where: {
                    status: 1,
                    ...(departmentID &&
                      (!Array.isArray(departmentID) || departmentID.length) && {
                        departmentID,
                      }),
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required:
                    designationID && designationID.length ? true : false,
                  model: EmployeeDesignation,
                  as: 'emp_desig',
                  where: {
                    status: 1,
                    ...(designationID &&
                      (!Array.isArray(designationID) ||
                        designationID.length) && {
                        designationID,
                      }),
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required: divisionId ? true : false,
                  model: EmployeeDivision,
                  as: 'emp_div',
                  where: {
                    status: 1,
                    ...(divisionId && { divisionId }),
                    startDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required: workingAreaId ? true : false,
                  model: EmployeeWorkingArea,
                  as: 'emp_area',
                  where: {
                    status: 1,
                    ...(workingAreaId && { workingAreaId }),
                    startDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required: projectID ? true : false,
                  model: EmployeeProject,
                  as: 'emp_pro',
                  where: {
                    status: 1,
                    ...(projectID && { projectID }),

                    startDate: {
                      [Sequelize.Op.lte]: new Date(calendarenddate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        releaseDate: {
                          [Sequelize.Op.gte]: new Date(calendarenddate),
                        },
                      },
                      { releaseDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: [],
                },
                {
                  required: skillCategory ? true : false,
                  model: EmployeeSkillCategory,
                  as: 'emp_skill',
                  where: skillCategoryCondition,
                  attributes: [],
                },
              ],
            },
          ],
          // attributes: [
          //   'salaryPolicyID',
          //   [Sequelize.fn('COUNT', Sequelize.col('salaryPolicyID')), 'count'],
          // ],
          // group: ['salaryPolicyID'],
          attributes: [
            'salaryPolicyID',
            [
              Sequelize.fn(
                'COUNT',
                Sequelize.fn(
                  'DISTINCT',
                  Sequelize.col('employee.userMasterID'),
                ),
              ),
              'count',
            ],
          ],
          group: ['salaryPolicyID'],
          raw: true,
        }),
        UserMaster.count({
          distinct: true,
          col: 'userMasterID',
          where: { ...userCondtion, ...userAccessCondition.where },
          order: [['displayName', 'ASC']],
          include: [
            {
              required: false,
              model: EmployeeSalaryPolicy,
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(calendarenddate) },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [], // Don't load policy data, just count them
            },
            {
              required: true,
              model: EmployeeJoiningDetails,
              where: empJoiningCondition,
              attributes: [],
            },
            {
              required: branchMasterID && branchMasterID.length ? true : false,
              model: EmployeeBranch,
              as: 'emp_branch',
              where: {
                status: 1,
                ...(branchMasterID &&
                  (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                    branchID: branchMasterID,
                  }),
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: departmentID && departmentID.length ? true : false,
              model: EmployeeDepartment,
              as: 'emp_dept',
              where: {
                status: 1,
                ...(departmentID &&
                  (!Array.isArray(departmentID) || departmentID.length) && {
                    departmentID,
                  }),
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: designationID && designationID.length ? true : false,

              model: EmployeeDesignation,
              as: 'emp_desig',
              where: {
                status: 1,
                ...(designationID &&
                  (!Array.isArray(designationID) || designationID.length) && {
                    designationID,
                  }),
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: divisionId ? true : false,
              model: EmployeeDivision,
              as: 'emp_div',
              where: {
                status: 1,
                ...(divisionId && { divisionId }),
                startDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: workingAreaId ? true : false,
              model: EmployeeWorkingArea,
              as: 'emp_area',
              where: {
                status: 1,
                ...(workingAreaId && { workingAreaId }),
                startDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: projectID ? true : false,
              model: EmployeeProject,
              as: 'emp_pro',
              where: {
                status: 1,
                ...(projectID && { projectID }),

                startDate: {
                  [Sequelize.Op.lte]: new Date(calendarenddate),
                },
                [Sequelize.Op.or]: [
                  {
                    releaseDate: {
                      [Sequelize.Op.gte]: new Date(calendarenddate),
                    },
                  },
                  { releaseDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: [],
            },
            {
              required: skillCategory ? true : false,
              model: EmployeeSkillCategory,
              as: 'emp_skill',
              where: skillCategoryCondition,
              attributes: [],
            },
          ],
          group: ['userMaster.userMasterID'],
          having: Sequelize.literal(
            `COUNT("employeeSalaryPolicies"."salaryPolicyID") = 0`,
          ),
        }),
      ]);

    let salaryCycleArray = [];

    const defaultSalaryPolicyObj = {
      start_date: calendarstartdate,
      formatted_start_date: moment(calendarstartdate, 'YYYY-MM-DD').format(
        'DD-MM-YYYY',
      ),
      end_date: calendarenddate,
      formatted_end_date: moment(calendarenddate, 'YYYY-MM-DD').format(
        'DD-MM-YYYY',
      ),
      salaryPolicyID: null,
      isDefaultPolicy: true,
      salaryPolicyName: 'No Salary Policy',
      dates: (
        await getDatesFromDateRange(
          new Date(calendarstartdate),
          new Date(calendarenddate),
        )
      ).map((d) => moment(d).format('DD')),
      totalCount: findEmployeeWithoutSalaryPolicys?.length || 0,
      overtimeAdded: 'daily',
    };
    if (+defaultSalaryPolicyObj.totalCount > 0 && !salaryPolicyID) {
      salaryCycleArray.push(defaultSalaryPolicyObj);
    }

    for (let policy of companySalaryPolicy) {
      const dataObj = {
        start_date: '',
        end_date: '',
        formatted_start_date: '',
        formatted_end_date: '',
        salaryPolicyID: policy.salaryPolicyID,
        salaryPolicyName: policy.salaryPolicyName,
        dates: [],
        isDefaultPolicy: false,
        totalCount: 0,
        overtimeAdded: policy.overtimeAdded,
      };
      const findSalaryPolicy = findEmployeeWithSalaryPolicys.find(
        (e) => e.salaryPolicyID == policy.salaryPolicyID,
      );

      if (findSalaryPolicy && +findSalaryPolicy.count > 0) {
        dataObj.totalCount = +findSalaryPolicy.count;
      } else {
        continue;
      }
      let monday = daysInMonth(month, year);
      let date = policy.salaryCycleDate;
      if (policy.MonthDaysType == MonthDaysTypeEnum.FIX && policy.fixDays)
        date = (date < 10 ? '0' : '') + date;

      dataObj.start_date = `${year}-${month}-${date}`;

      if (policy.salaryCycleConsider == 'E') {
        const tempDate = new Date(dataObj.start_date);
        tempDate.setMonth(tempDate.getMonth() - 1);

        dataObj.start_date = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
        monday = daysInMonth(
          dataObj.start_date.slice(5, 7),
          dataObj.start_date.slice(0, 4),
        );
      }

      const date1 = new Date(dataObj.start_date);
      date1.setDate(date1.getDate() + (monday - 1));

      dataObj.end_date = `${date1.getFullYear()}-${String(date1.getMonth() + 1).padStart(2, '0')}-${String(date1.getDate()).padStart(2, '0')}`;

      dataObj.end_date = moment
        .min(
          moment(dataObj.end_date, 'YYYY-MM-DD'),
          moment(subscriptionEndDate, 'YYYY-MM-DD'),
        )
        .format('YYYY-MM-DD');
      if (dataObj.start_date > dataObj.end_date) {
        continue;
      }
      dataObj.formatted_start_date = moment(
        dataObj.start_date,
        'YYYY-MM-DD',
      ).format('DD-MM-YYYY');
      dataObj.formatted_end_date = moment(
        dataObj.end_date,
        'YYYY-MM-DD',
      ).format('DD-MM-YYYY');

      const datesArray = await getDatesFromDateRange(
        new Date(dataObj.start_date),
        new Date(dataObj.end_date),
      );
      dataObj.dates = datesArray.map((e) => moment(e).format('DD'));

      salaryCycleArray.push(dataObj);
    }

    const sortedCompanyLeaveTypes = companyLeaveTypes.sort(
      (a, b) => a.LeaveTranId - b.LeaveTranId,
    );
    const leaveNamesArray = sortedCompanyLeaveTypes.map(
      (e) => e.LeaveMaster.LeaveName,
    );

    const attendaceDataArrayCycleWise = [];
    let cycleIndex = 0;
    let workBook = null;
    let tempFilePath = null;
    const fileUploadFolderPath = `uploads/musterRegisterWithSalaryCycle_${companyMasterID}_${requestByUser}_${Date.now()}`;
    if (
      exportData &&
      salaryCycleArray?.length &&
      exportDataFileType == 'xlsx'
    ) {
      const exportDir = path.join(__dirname, `../${fileUploadFolderPath}`);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `${companyMasterID}_attendanceReport1_${Date.now()}.xlsx`;
      tempFilePath = path.join(exportDir, fileName);
      workBook = new Excel.stream.xlsx.WorkbookWriter({
        filename: tempFilePath,
        useStyles: true,
        useSharedStrings: false,
      });
    }
    const fileNamessArrary = [];
    if (exportData && salaryCycleArray?.length && exportDataFileType == 'pdf') {
      tempFilePath = path.join(__dirname, `../${fileUploadFolderPath}`);
      if (!fs.existsSync(tempFilePath)) {
        fs.mkdirSync(tempFilePath, { recursive: true });
      }
    }
    let companyAddressRow = null;
    let companyNameRow = null;
    let headingFirstRow = null;
    let headingSecondRow = null;
    let headingThirdRow = null;
    if (companyData) {
      companyNameRow = companyData.companyName;
      companyAddressRow = companyData.companyAddress;
    }
    if (paMUSTERROLLReportTypes.FORM_XVI == reportType) {
      headingFirstRow = 'FORM XVI';
      headingSecondRow = '[See Rule 78 (2)(a)]';
      headingThirdRow = 'Muster Roll';
    } else if (paMUSTERROLLReportTypes.FORM_NO_28 == reportType) {
      headingFirstRow = `FORM NO. 28`;
      headingSecondRow = '(PRESCRIBED UNDER RULE 110)';
    }
    salaryCycleLoop: for (let cycle of salaryCycleArray) {
      let serialNumberIndex = 0;
      if (!exportData && cycleIndex != 0) {
        break;
      }
      cycleIndex++;
      const cycleWiseObj = {
        totalCount: cycle.totalCount,
        responseCount: 0,
        start_date: cycle.start_date,
        formatted_start_date: cycle.formatted_start_date,
        end_date: cycle.end_date,
        formatted_end_date: cycle.formatted_end_date,
        salaryPolicyID: cycle.salaryPolicyID,
        salaryPolicyName: cycle.salaryPolicyName,
        dates: cycle.dates,
        users: [],
      };
      let batchSize = 100;
      let exportPage = 1;
      let hasMore = true;
      if (!exportData) {
        batchSize = limit;
        exportPage = page;
      }
      let currentRowSheetWiseNumber = 1;
      let workSheet = null;
      let date_header = [];
      let mainHeader = [];
      let salaryPolicyNameRow = `${cycleWiseObj.salaryPolicyName || 'Default'} ( ${cycleWiseObj.formatted_start_date} To ${cycleWiseObj.formatted_end_date} )`;
      date_header = cycleWiseObj.dates || [];
      if (exportData && exportDataFileType == 'xlsx') {
        const sheetName = getUniqueSheetName(
          workBook,
          `${cycleWiseObj.salaryPolicyName}-${cycleWiseObj.totalCount}`,
        );

        workSheet = workBook.addWorksheet(sheetName, {
          views: [
            {
              state: 'frozen',
              xSplit: 4,
            },
          ],
        });
        mainHeader = [
          'Sr No.',
          'Employee Code',
          'Employee Name',
          'Designation',
          'Gender',
          'Date Of Birth',
          'Date Of Joining',
          ...date_header,
          'Actual Present',
          'Absent',
          'WH',
          'PH',
          'Total',
          '',
          ...leaveNamesArray,
        ];
        if (salaryPolicyNameRow) {
          const policyRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const policyCell = workSheet.getCell(currentRowSheetWiseNumber, 1);
          policyCell.value = `${cycleWiseObj.salaryPolicyName || 'Default'} ( ${cycleWiseObj.formatted_start_date} To ${cycleWiseObj.formatted_end_date} )`;
          policyCell.font = { bold: true, size: 14 };
          policyCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D3D3D3' },
          };
          policyCell.alignment = { vertical: 'left', horizontal: 'left' };
          policyRow.commit();
          currentRowSheetWiseNumber++;
        }

        if (headingFirstRow) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = headingFirstRow;
          headingDataCell.font = { bold: true, size: 14 };
          headingDataCell.alignment = {
            vertical: 'left',
            horizontal: 'center',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }
        if (headingSecondRow) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = headingSecondRow;
          headingDataCell.font = { bold: true, size: 14 };
          headingDataCell.alignment = {
            vertical: 'left',
            horizontal: 'center',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }
        if (headingThirdRow) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = headingThirdRow;
          headingDataCell.font = { bold: true, size: 14 };
          headingDataCell.alignment = {
            vertical: 'left',
            horizontal: 'center',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }

        if (formattedYearMonth) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = formattedYearMonth;
          headingDataCell.font = { size: 10 };
          headingDataCell.alignment = {
            vertical: 'right',
            horizontal: 'right',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }

        if (companyNameRow) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = {
    richText: [
      {
        text: 'Name: ',
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
        },
      },
      {
        text: companyNameRow,
        font: {
          name: 'Calibri',
          size: 10,
          bold: false,
        },
      },
    ],
  };
          headingDataCell.font = { size: 10 };
          headingDataCell.alignment = {
            vertical: 'left',
            horizontal: 'left',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }
        if (companyAddressRow) {
          const headingDataRow = workSheet.addRow([]);
          workSheet.mergeCells(
            currentRowSheetWiseNumber,
            1,
            currentRowSheetWiseNumber,
            mainHeader.length,
          );
          const headingDataCell = workSheet.getCell(
            currentRowSheetWiseNumber,
            1,
          );
          headingDataCell.value = {
    richText: [
      {
        text: 'Address: ',
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
        },
      },
      {
        text: companyAddressRow,
        font: {
          name: 'Calibri',
          size: 10,
          bold: false,
        },
      },
    ],
  };
          headingDataCell.font = { size: 10 };
          headingDataCell.alignment = {
            vertical: 'left',
            horizontal: 'left',
          };
          headingDataRow.commit();
          currentRowSheetWiseNumber++;
        }
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
        headerRow.commit();
        currentRowSheetWiseNumber++;
      }
      while (hasMore) {
        const paginationQueryLoopWise = {};
        const exportOffset = (exportPage - 1) * batchSize;
        if (exportData) {
          console.log(
            `${cycleWiseObj.salaryPolicyID}**************************Processing page 
            ${exportPage} 
            with offset 
            ${exportOffset} 
            and limit ${batchSize}
            **************************`,
          );
        }
        if (exportPage && batchSize) {
          paginationQueryLoopWise.offset = exportOffset;
          paginationQueryLoopWise.limit = batchSize;
        }
        const userMasterIncludeModels = [
          {
            required: true,
            model: EmployeeJoiningDetails,
            where: empJoiningCondition,
            attributes: [
              'employeeCode',
              'joiningDate',
              'leavingDate',
              'salaryCalculationAct',
              'fullMonthPresence',
              'dob',
            ],
          },
          {
            required: branchMasterID && branchMasterID.length ? true : false,
            model: EmployeeBranch,
            as: 'emp_branch',
            where: {
              status: 1,
              ...(branchMasterID &&
                (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                  branchID: branchMasterID,
                }),
              applicableDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },

            attributes: [],
          },
          {
            required: departmentID && departmentID.length ? true : false,
            model: EmployeeDepartment,
            as: 'emp_dept',
            where: {
              status: 1,
              ...(departmentID &&
                (!Array.isArray(departmentID) || departmentID.length) && {
                  departmentID,
                }),
              applicableDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },

            attributes: [],
          },
          {
            required: designationID && designationID.length ? true : false,

            model: EmployeeDesignation,
            as: 'emp_desig',
            where: {
              status: 1,
              ...(designationID &&
                (!Array.isArray(designationID) || designationID.length) && {
                  designationID,
                }),
              applicableDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
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
            required: divisionId ? true : false,
            model: EmployeeDivision,
            as: 'emp_div',
            where: {
              status: 1,
              ...(divisionId && { divisionId }),
              startDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: [],
          },
          {
            required: workingAreaId ? true : false,
            model: EmployeeWorkingArea,
            as: 'emp_area',
            where: {
              status: 1,
              ...(workingAreaId && { workingAreaId }),
              startDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: [],
          },
          {
            required: projectID ? true : false,
            model: EmployeeProject,
            as: 'emp_pro',
            where: {
              status: 1,
              ...(projectID && { projectID }),

              startDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  releaseDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                { releaseDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: [],
          },
          {
            required: skillCategory ? true : false,
            model: EmployeeSkillCategory,
            as: 'emp_skill',
            where: skillCategoryCondition,
            attributes: [],
          },
          {
            model: companyMaster,
            attributes: ['companyName'],
            required: true,
          },

          {
            required: false,
            model: EmployeeAttendancePolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['attendancePolicyID'],
            include: [
              {
                model: AttendancePolicy,
                as: 'attendancePolicy',
                attributes: [
                  'attendancePolicyID',
                  'sandwichLeave',
                  'BeforeAfterLeave',
                  ['weekoffsandwichLeave', 'wh_sandwich'],
                  ['holidaysandwichLeave', 'ph_sandwich'],
                  ['HFDBeforeAfterLeave', 'HFD_Be_Aft'],
                  'WHPHPriority',
                  'coff',
                  'isWHAbsentRule',
                ],
              },
            ],
          },
          {
            required: !!cycleWiseObj.salaryPolicyID,
            model: EmployeeSalaryPolicy,
            where: {
              status: 1,

              ...(cycleWiseObj.salaryPolicyID && {
                salaryPolicyID: cycleWiseObj.salaryPolicyID,
              }),

              startDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: [],
          },
          // weeoffPolicy
          {
            required: false,
            model: EmployeeWeekOff,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(calendarenddate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(calendarenddate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['weekOffPolicyID'],
            include: [
              {
                model: weekOffPolicy,
                as: 'weekoff',
                attributes: [
                  'weekoffType',
                  'isNoWeekoffPolicy',
                  'monthlyFix',
                  'paidDays',
                  'isMinDaysForFixWf',
                  'minPresentDaysForFixWF',
                ],
              },
            ],
          },
        ];
        const baseWhereCondition = cycleWiseObj.salaryPolicyID
          ? userCondtion
          : {
              [Sequelize.Op.and]: [
                Sequelize.literal(`
                    NOT EXISTS (
                      SELECT 1
                      FROM "employeeSalaryPolicies" AS "esp"
                      WHERE "esp"."userMasterID" = "userMaster"."userMasterID"
                        AND "esp"."status" = 1
                        AND "esp"."startDate" <= '${calendarenddate}'
                        AND (
                          "esp"."endDate" >= '${calendarenddate}'
                          OR "esp"."endDate" IS NULL
                        )
                    )`),
              ],
              ...userCondtion,
            };

        const paginatedUserData = await UserMaster.findAll({
          distinct: true,
          where: { ...baseWhereCondition, ...userAccessCondition.where },
          ...paginationQueryLoopWise,
          order: [['displayName', 'ASC']],
          include: [
            ...userAccessCondition.includeModels,
            ...userMasterIncludeModels,
          ],
          attributes: [...userAttributes, 'status', 'gender'],
        });

        cycleWiseObj.responseCount += paginatedUserData.length;
        const salaryCycleWiseUserIDs = paginatedUserData.map(
          (e) => +e.userMasterID,
        );
        const attendancedata1 = attendanceTransaction.findAll({
          where: {
            userMasterID: salaryCycleWiseUserIDs,
            AttendanceDate: {
              [Sequelize.Op.between]: [
                new Date(cycleWiseObj.start_date),
                new Date(cycleWiseObj.end_date),
              ],
            },
          },
          include: [
            {
              model: Shift,
              attributes: ['shiftName'],
            },
          ],
          order: [['AttendanceDate', 'ASC']],
        });
        const weekholidaydata1 = weekoffHolidayTran.findAll({
          where: {
            userMasterID: salaryCycleWiseUserIDs,
            date: {
              [Sequelize.Op.between]: [
                new Date(cycleWiseObj.start_date),
                new Date(cycleWiseObj.end_date),
              ],
            },
            [Sequelize.Op.or]: [
              { optionalHoliday: false },
              { optionalHoliday: null },
            ],
          },
          attributes: [
            'userMasterID',
            'date',
            'optionalHoliday',
            'tableName',
            'value',
          ],
          order: [['date', 'ASC']],
        });
        const userleaveData1 = UserLeave.findAll({
          where: {
            userMasterID: salaryCycleWiseUserIDs,
            authorizationStatus: 3,
            [Sequelize.Op.or]: [
              {
                FromDate: {
                  [Sequelize.Op.between]: [
                    new Date(cycleWiseObj.start_date),
                    new Date(cycleWiseObj.end_date),
                  ],
                },
              },
              {
                ToDate: {
                  [Sequelize.Op.between]: [
                    new Date(cycleWiseObj.start_date),
                    new Date(cycleWiseObj.end_date),
                  ],
                },
              },
            ],
            status: 1,
          },
          include: [
            {
              separate: true,
              model: UserLeaveTransaction,
              where: {
                status: 1,
              },
              include: [
                {
                  model: HrLeaveTypes,
                  attributes: ['LeaveID'],
                  include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
                },
              ],
              attributes: ['LeaveTranId', 'days', 'date', 'status'],
            },
            {
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
              include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
            },
          ],
          attributes: [
            'LeaveTranId',
            'userMasterID',
            'FromDate',
            'ToDate',
            'authorizationStatus',
            'LeaveDays',
            'DayType',
          ],
        });

        const [attendancedata, weekholidaydata, userleaveData] =
          await Promise.all([
            attendancedata1,
            weekholidaydata1,
            userleaveData1,
          ]);

        const beforeUserIds = [];

        for (const user of paginatedUserData) {
          const userWeekOffPolicy = user.employeeWeekOffs?.[0]?.weekoff || null;
          const fullMonthPresence =
            user?.employeeJoiningDetails?.[0]?.fullMonthPresence || 0;

          if (!userWeekOffPolicy?.minPresentDaysForFixWF || fullMonthPresence)
            continue;
          beforeUserIds.push(user.userMasterID);
        }

        const {
          before_attendanceMap,
          before_weekoffHolidayMap,
          before_outDutyMap,
        } = await get7DaysBefore_WeekoffHoliday_Attendance_Map(
          beforeUserIds,
          cycleWiseObj.start_date,
        );

        userDataLoop: for (let user of paginatedUserData) {
          const hrLeaveMasters = sortedCompanyLeaveTypes.map((e) => {
            return {
              LeaveID: e.LeaveID,
              LeaveTranId: e.LeaveTranId,
              LeaveTranId: e.LeaveTranId,
              LeaveName: e.LeaveMaster.LeaveName,
              usedCount: 0,
            };
          });
          const userObj = {
            fullMonthPresence:
              user?.employeeJoiningDetails?.[0]?.fullMonthPresence || 0,
            userMasterID: user.userMasterID,
            employeeCode: user?.employeeJoiningDetails?.[0]?.employeeCode || '',
            displayName: user.displayName || '',
            userNumber: user.userNumber || '',
            joiningDate: user?.employeeJoiningDetails?.[0]?.joiningDate || '',
            salaryCalculationAct:
              user?.employeeJoiningDetails?.[0]?.salaryCalculationAct || 'S',
            formattendJoiningDate: user.employeeJoiningDetails?.[0]?.joiningDate
              ? moment(
                  user.employeeJoiningDetails?.[0]?.joiningDate,
                  'YYYY-MM-DD',
                ).format('DD-MM-YYYY')
              : '',
            formattendDateOfBirth: user.employeeJoiningDetails?.[0]?.dob
              ? moment(
                  user.employeeJoiningDetails?.[0]?.dob,
                  'YYYY-MM-DD',
                ).format('DD-MM-YYYY')
              : '',
            gender: user.gender
              ? user.gender == 'male'
                ? 'M'
                : user.gender == 'female'
                  ? 'F'
                  : 'Other'
              : '',
            company: user.companyMaster.companyName || '',
            branch: user.emp_branch?.[0]?.branchMaster?.branchName || '',
            department: user.emp_dept?.[0]?.department?.departmentName || '',
            designation:
              user.emp_desig?.[0]?.designation?.designationName || '',
            division: user.emp_div?.[0]?.division?.divisionName || '',
            workingArea: user.emp_area?.[0]?.workingArea?.workingAreaName || '',
            leavingDate: user?.employeeJoiningDetails?.[0]?.leavingDate || '',
            formattedLeavingDate: user.employeeJoiningDetails?.[0]?.leavingDate
              ? moment(
                  user.employeeJoiningDetails?.[0]?.leavingDate,
                  'YYYY-MM-DD',
                ).format('DD-MM-YYYY')
              : '',
            attendanceData: [],
            allDayAttedanceStatus: [],
            totalMonthDays: cycleWiseObj.dates.length,
            expectedWorkDays: 0,
            presentCount: 0,
            presentOnWeekOffHolidayCount: 0,
            halfDayCount: 0,
            absentCount: 0,
            weekOffCount: 0,
            holidayCount: 0,
            unPaidLeaveCount: 0,
            paidDaysCount: 0,
            leaveCountsData: hrLeaveMasters,
            daysBeforeJoiningOrAfterLeft: 0,
            actualWorkingDays: 0,
          };

          //   // User Leave
          const userApprovedLeaves = userleaveData.filter((leave) => {
            return +leave.userMasterID == +user.userMasterID;
          });

          // User WeekOff
          // User Holiday
          const userWeekOffDataMap = new Map();
          const userHolidayDataMap = new Map();

          for (const wh of weekholidaydata) {
            if (+wh.userMasterID !== +user.userMasterID) continue;

            if (wh.tableName === 'weekoff') {
              userWeekOffDataMap.set(wh.date, wh);
            } else if (wh.tableName === 'holiday') {
              userHolidayDataMap.set(wh.date, wh);
            }
          }
          // User AttendanceData
          const userAttendnaceDataMap = new Map();
          for (const att of attendancedata) {
            if (+att.userMasterID === +user.userMasterID) {
              userAttendnaceDataMap.set(att.AttendanceDate, att);
            }
          }
          const userWeekOffDataArray = Array.from(userWeekOffDataMap.values());
          const userHolidayDataArray = Array.from(userHolidayDataMap.values());
          const userAttendnaceDatArray = Array.from(
            userAttendnaceDataMap.values(),
          );
          const weekoffholidayData = [
            ...userWeekOffDataArray,
            ...userHolidayDataArray,
          ];
          // User Attendance Policies
          const userAttendancePolicy =
            user.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

          // Get Week Off Holiday Priority
          const weekOffHolidayPriority =
            userAttendancePolicy?.WHPHPriority || 'WO';
          const userWeekOffPolicy = user.employeeWeekOffs?.[0]?.weekoff || null;
          const weekoffPolicyType = userWeekOffPolicy?.weekoffType || null;

          let attendanceMonthStartDate = new Date(cycleWiseObj.start_date);
          let attendanceMonthEndDate = new Date(cycleWiseObj.end_date);

          let checkWeekoff = true;
          // if monthly fix weekoff or on present days
          if (
            [
              weekoffTypeEnum.MONTHLYFIX,
              weekoffTypeEnum.ONPAIDDAYS,
              weekoffTypeEnum.ONPRESENTDAY,
            ].includes(weekoffPolicyType)
          ) {
            checkWeekoff = false;
          }
          const finalweekoffholidays = userObj.fullMonthPresence
            ? weekoffholidayData
            : await toGetFinalHolidayWeekoff(
                userAttendnaceDatArray,
                userAttendancePolicy,
                checkWeekoff ? weekoffholidayData : userHolidayDataArray,
                userApprovedLeaves || [],
                attendanceMonthStartDate,
                attendanceMonthEndDate,
                userObj.userMasterID,
              );

          // if check weekoff is true
          let finalWeekoffs = userObj.fullMonthPresence
            ? userWeekOffDataArray
            : checkLeaveOnWH(
                userApprovedLeaves || [],
                checkWeekoff
                  ? finalweekoffholidays.weekoffs
                  : userWeekOffDataArray,
                true,
              );

          const finalHolidays = userObj.fullMonthPresence
            ? userHolidayDataArray
            : checkLeaveOnWH(
                userApprovedLeaves || [],
                finalweekoffholidays.holidays,
                true,
              );

          // ------------------------ get fix weekoff based on present days and holiday -------------------

          let weekoffAbsentArray = [];

          if (
            weekoffPolicyType == weekoffTypeEnum.FIX &&
            userWeekOffPolicy?.isMinDaysForFixWf &&
            !userObj.fullMonthPresence
          ) {
            // for before weekoff/holiday ----------------------
            const userWiseBeforeWH = before_weekoffHolidayMap?.get(
              +user.userMasterID,
            );
            const beforeWeekoffHoliday = getAllWeekoffHolidayWithPriority(
              userWiseBeforeWH,
              weekOffHolidayPriority == 'PH'
                ? offDayCategoryEnum.HOLIDAY
                : offDayCategoryEnum.WEEKOFF,
            );

            // for before AttendanceData ----------------------

            const beforeAttendanceData = before_attendanceMap?.get(
              +user.userMasterID,
            );
            // for before out Duty Data ----------------------

            const beforeOutDutyData = before_outDutyMap?.get(
              +user.userMasterID,
            );
            const finalOutDutyData = userApprovedLeaves
              .flatMap((e) => e.userLeaveTransactions || [])
              .filter(
                (tran) => tran.status === 1 && tran.hrLeaveType?.LeaveID === 25,
              );
            const { WeekoffAbsent, earningWeekoff } =
              getWeekOffBasedOnWeekoffAbsent({
                beforeWH: beforeWeekoffHoliday,
                beforeAttendance: beforeAttendanceData,
                actualWeekoff: userWeekOffDataArray,
                weekOffData: finalWeekoffs,
                holidayData: finalHolidays,
                attendanceData: userAttendnaceDatArray,
                startDate: cycleWiseObj.start_date,
                weekoffPolicy: userWeekOffPolicy,
                joiningDate: userObj?.joiningDate,
                beforeOutDutyData: beforeOutDutyData,
                outDutyData: finalOutDutyData,
              });

            weekoffAbsentArray = WeekoffAbsent;
            finalWeekoffs = earningWeekoff;
          }

          const finalWeekoffsMap = new Map(
            finalWeekoffs.map((w) => [w.date, w]),
          );

          const finalHolidaysMap = new Map(
            finalHolidays.map((h) => [h.date, h]),
          );

          const finalWeekOffAbsentMap = new Map(
            weekoffAbsentArray.map((wa) => [wa.date, wa]),
          );

          attendanceLoop: while (
            attendanceMonthStartDate <= attendanceMonthEndDate
          ) {
            let attendanceDateObj = new Date(attendanceMonthStartDate);

            const attendanceObj = {
              attendanceDate: asiaKolkataDateTime(attendanceDateObj).slice(
                0,
                10,
              ),
              title: [],
              formattedAttendanceDate: '-',
            };

            // Format using moment
            attendanceObj.formattedAttendanceDate = moment(
              attendanceObj.attendanceDate,
              'YYYY-MM-DD',
            ).format('DD-MM-YYYY');

            attendanceDateObj.setDate(attendanceDateObj.getDate() + 1);

            // Set updated date back if needed
            attendanceMonthStartDate = attendanceDateObj;

            if (
              new Date(attendanceObj.attendanceDate) <
                new Date(userObj.joiningDate) ||
              (userObj.leavingDate &&
                new Date(attendanceObj.attendanceDate) >
                  new Date(userObj.leavingDate))
            ) {
              userObj.daysBeforeJoiningOrAfterLeft++;
              attendanceObj.title.push('-');
              attendanceObj.title = attendanceObj.title.join('+');
              userObj.allDayAttedanceStatus.push(attendanceObj.title);
              userObj.attendanceData.push(attendanceObj);
              continue attendanceLoop;
            }

            // weekoff data
            const actucalWeekOffData =
              userWeekOffDataMap.get(attendanceObj.attendanceDate) || null;

            // Holiday Data
            const actualHolidayData =
              userHolidayDataMap.get(attendanceObj.attendanceDate) || null;
            // weekoff data

            const weekOffData =
              finalWeekoffsMap.get(attendanceObj.attendanceDate) || null;
            // Holiday Data
            const holidayData =
              finalHolidaysMap.get(attendanceObj.attendanceDate) || null;

            // Weekoff Absent Data
            const weekOffAbsentData =
              finalWeekOffAbsentMap.get(attendanceObj.attendanceDate) || null;

            const userleaveDateWise = userApprovedLeaves.filter((leave) => {
              return (
                new Date(leave.FromDate) <=
                  new Date(attendanceObj.attendanceDate) &&
                new Date(leave.ToDate) >= new Date(attendanceObj.attendanceDate)
              );
            });
            // Approved Leave
            let totalApprovedLeaveDays = 0;
            let totalApprovedOutDutyDays = 0;

            const approveLeave = [];
            const allApprovedLeaveNames = [];
            if (userleaveDateWise && userleaveDateWise.length > 0) {
              for (const leave of userleaveDateWise) {
                for (const leavetrans of leave.userLeaveTransactions) {
                  if (
                    new Date(leavetrans.date).getTime() ==
                      new Date(attendanceObj.attendanceDate).getTime() &&
                    leavetrans.status == 1
                  ) {
                    leavetrans.dataValues.DayType = leave.DayType;
                    const leaveDate = new Date(leavetrans.date).getTime();
                    const attendanceDate = new Date(
                      attendanceObj.attendanceDate,
                    ).getTime();

                    if (
                      leaveDate == attendanceDate &&
                      +leavetrans.status == 1
                    ) {
                      let totalLeaveDays = 0;
                      const leaveID = leavetrans?.hrLeaveType?.LeaveID || null;
                      if (leaveID == 25) {
                        totalApprovedOutDutyDays += +leavetrans.days || 0;
                        totalLeaveDays = +leavetrans.days || 0;
                        if (weekOffData) {
                          userObj.approvedOutDutyOnWeekoffHoliday +=
                            +leavetrans.days || 0;
                          if (weekOffData.value < 1) {
                            if (+leavetrans.days >= 0.5) {
                              totalLeaveDays = 0.5;
                            }
                          } else {
                            totalLeaveDays = 0;
                          }
                        } else if (holidayData) {
                          totalApprovedOutDutyDays += +leavetrans.days || 0;
                          userObj.approvedOutDutyOnWeekoffHoliday +=
                            +leavetrans.days || 0;
                          totalLeaveDays = 0;
                        }
                      } else {
                        totalLeaveDays = +leavetrans.days || 0;
                      }
                      // Push approved leave transaction
                      approveLeave.push(leavetrans);
                      if (leaveID != 25) {
                        const leaveName =
                          leavetrans?.hrLeaveType?.LeaveMaster?.LeaveName || '';
                        const dayType = leave.DayType;
                        const suffix =
                          dayType === 'First Half'
                            ? ' (FH)'
                            : dayType === 'Second Half'
                              ? ' (SH)'
                              : '';
                        allApprovedLeaveNames.push(`${leaveName}${suffix}`);
                      }
                      // Update usedCount in hrLeaveMasters

                      const index = userObj.leaveCountsData.findIndex(
                        (item) => +item.LeaveTranId === +leavetrans.LeaveTranId,
                      );

                      const match =
                        index !== -1 ? userObj.leaveCountsData[index] : null;

                      if (match && +match.LeaveID == 18) {
                        userObj.leaveCountsData[index].usedCount +=
                          +leavetrans.days || 0;
                        userObj.unPaidLeaveCount += totalLeaveDays;
                        totalApprovedLeaveDays += totalLeaveDays;
                      } else if (match && +match.LeaveID == 25) {
                        //Out Duty
                        userObj.leaveCountsData[index].usedCount +=
                          totalLeaveDays;
                        userObj.actualWorkingDays += totalLeaveDays;
                      } else if (match) {
                        userObj.leaveCountsData[index].usedCount +=
                          totalLeaveDays;
                        userObj.actualWorkingDays += totalLeaveDays;
                        totalApprovedLeaveDays += totalLeaveDays;
                      }
                    }
                  }
                }
              }
            }
            if (totalApprovedOutDutyDays) {
              if (totalApprovedOutDutyDays == 1) {
                allApprovedLeaveNames.push('P');
              } else {
                allApprovedLeaveNames.push('HFD');
              }
            }
            const totalLeaveAndOutDutyDays =
              totalApprovedLeaveDays + totalApprovedOutDutyDays;

            const isSandwichleave =
              (actucalWeekOffData &&
                !weekOffData &&
                !weekOffAbsentData &&
                +totalApprovedLeaveDays != 1) ||
              (actualHolidayData &&
                !holidayData &&
                +totalApprovedLeaveDays != 1)
                ? true
                : false;
            // For Future Date
            if (
              new Date(attendanceObj.attendanceDate) > new Date(currentdate)
            ) {
              if (approveLeave.length > 0) {
                attendanceObj.title.push(...allApprovedLeaveNames);
              }
              if (totalLeaveAndOutDutyDays < 1) {
                let title = '';
                if (actucalWeekOffData && actualHolidayData) {
                  if (weekOffHolidayPriority == 'PH') {
                    userObj.holidayCount += actualHolidayData.value;
                    title = 'HD';
                  } else {
                    if (totalLeaveAndOutDutyDays == 0) {
                      userObj.weekOffCount += actucalWeekOffData.value;
                      if (actucalWeekOffData.value < 1) {
                        title = 'WO (SH)';
                        if (userObj.fullMonthPresence) {
                          attendanceObj.title.push('P');
                          userObj.presentCount += 1 - actucalWeekOffData.value;
                          userObj.actualWorkingDays +=
                            1 - actucalWeekOffData.value;
                        } else {
                          attendanceObj.title.push('A');
                          userObj.absentCount += 1 - actucalWeekOffData.value;
                        }
                      } else {
                        title = 'WO';
                      }
                    }
                  }
                } else if (actucalWeekOffData) {
                  if (totalLeaveAndOutDutyDays == 0) {
                    userObj.weekOffCount += actucalWeekOffData.value;
                    if (actucalWeekOffData.value < 1) {
                      title = 'WO (SH)';
                      if (totalApprovedOutDutyDays == 0) {
                        if (userObj.fullMonthPresence) {
                          attendanceObj.title.push('P');
                          userObj.presentCount += 1 - actucalWeekOffData.value;
                          userObj.actualWorkingDays +=
                            1 - actucalWeekOffData.value;
                        } else {
                          attendanceObj.title.push('A');
                          userObj.absentCount += 1 - actucalWeekOffData.value;
                        }
                      }
                    } else {
                      title = 'WO';
                    }
                  } else if (
                    totalLeaveAndOutDutyDays == 0.5 &&
                    weekOffData.value < 1
                  ) {
                    userObj.weekOffCount += weekOffData.value;
                    title = 'WO (SH)';
                  }
                } else if (actualHolidayData) {
                  userObj.holidayCount += actualHolidayData.value;
                  title = 'HD';
                } else if (totalApprovedLeaveDays == 0.5) {
                  if (userObj.fullMonthPresence) {
                    attendanceObj.title.push('P');
                    userObj.presentCount += 0.5;
                    userObj.actualWorkingDays += 0.5;
                  } else {
                    attendanceObj.title.push('A');
                    userObj.absentCount += 0.5;
                  }
                } else if (totalApprovedLeaveDays == 0) {
                  if (userObj.fullMonthPresence) {
                    attendanceObj.title.push('P');
                    userObj.presentCount += 1;
                    userObj.actualWorkingDays += 1;
                  } else {
                    attendanceObj.title.push('A');
                    userObj.absentCount += 1;
                  }
                }
                if (title) {
                  attendanceObj.title.push(title);
                }
              }
              attendanceObj.title = attendanceObj.title.join('+');
              userObj.allDayAttedanceStatus.push(attendanceObj.title);
              userObj.attendanceData.push(attendanceObj);
              continue attendanceLoop;
            }
            // DateWise Attendace
            const dateWiseAttendaceData =
              userAttendnaceDataMap.get(attendanceObj.attendanceDate) || null;

            if (dateWiseAttendaceData && totalLeaveAndOutDutyDays < 1) {
              if (userObj.fullMonthPresence) {
                if (weekOffData || holidayData) {
                  if (weekOffData && weekOffData.value < 1) {
                    userObj.presentCount += 0.5;
                    userObj.actualWorkingDays += 1 - weekOffData.value;
                    attendanceObj.title.push('P');
                  }
                } else {
                  // Check For Current Date
                  attendanceObj.title.push('P');
                  if (totalLeaveAndOutDutyDays == 0) {
                    userObj.presentCount += 1;
                    userObj.actualWorkingDays += 1;
                  } else {
                    userObj.presentCount += 0.5;
                    userObj.actualWorkingDays += 0.5;
                  }
                }
              } else {
                if (
                  dateWiseAttendaceData.OutDateTime == null &&
                  dateWiseAttendaceData.InDatetime &&
                  currentdate != dateWiseAttendaceData.AttendanceDate
                ) {
                  // Check For Miss Punch
                  if (!weekOffData && !holidayData) {
                    attendanceObj.title.push('A');
                    if (totalLeaveAndOutDutyDays == 0.5) {
                      userObj.absentCount += 0.5;
                    } else {
                      userObj.absentCount += 1;
                    }
                  }
                } else {
                  if (dateWiseAttendaceData.fulldayhalfday == 1) {
                    attendanceObj.title.push('P');
                    if (weekOffAbsentData) {
                      attendanceObj.title.push(
                        attendanceStatusForCalender.WEEKOFF_ABSENT,
                      );
                    }

                    if (weekOffData || holidayData) {
                      if (weekOffData) {
                        if (weekOffData.value < 1) {
                          userObj.presentOnWeekOffHolidayCount += 0.5;
                        } else {
                          userObj.presentOnWeekOffHolidayCount += 1;
                        }
                      } else {
                        userObj.presentOnWeekOffHolidayCount += 1;
                      }
                    } else {
                      if (totalLeaveAndOutDutyDays == 0) {
                        userObj.presentCount += 1;
                        userObj.actualWorkingDays += 1;
                      } else {
                        userObj.presentCount += 0.5;
                        userObj.actualWorkingDays += 0.5;
                      }
                    }
                  } else if (dateWiseAttendaceData.fulldayhalfday == 0.5) {
                    attendanceObj.title.push('HFD');

                    if (weekOffAbsentData) {
                      attendanceObj.title.push(
                        attendanceStatusForCalender.WEEKOFF_ABSENT,
                      );
                    }

                    if (weekOffData || holidayData) {
                      if (weekOffData) {
                        if (weekOffData.value < 1) {
                          userObj.presentOnWeekOffHolidayCount += 0.5;
                          userObj.halfDayCount += 1;
                          userObj.actualWorkingDays += 0.5;
                        } else {
                          userObj.presentOnWeekOffHolidayCount += 0.5;
                        }
                      } else {
                        userObj.presentOnWeekOffHolidayCount += 0.5;
                      }
                    } else {
                      if (totalLeaveAndOutDutyDays == 0) {
                        userObj.absentCount += 0.5;
                      }
                      userObj.halfDayCount += 1;
                      userObj.actualWorkingDays += 0.5;
                    }
                  } else if (dateWiseAttendaceData.fulldayhalfday == 0) {
                    if (weekOffAbsentData) {
                      attendanceObj.title.push(
                        attendanceStatusForCalender.WEEKOFF_ABSENT,
                      );
                      userObj.absentCount += +weekOffAbsentData.value;
                    } else {
                      if (!weekOffData && !holidayData) {
                        if (totalLeaveAndOutDutyDays == 0.5) {
                          userObj.absentCount += 0.5;
                          attendanceObj.title.push('A');
                        } else {
                          attendanceObj.title.push('A');
                          userObj.absentCount += 1;
                        }
                      }
                    }
                  } else if (
                    currentdate == dateWiseAttendaceData.AttendanceDate
                  ) {
                    // Check For Current Date
                    attendanceObj.title.push('P');
                    if (weekOffData || holidayData) {
                      userObj.presentOnWeekOffHolidayCount += 1;
                    } else {
                      if (totalLeaveAndOutDutyDays == 0) {
                        userObj.presentCount += 1;
                        userObj.actualWorkingDays += 1;
                      } else {
                        userObj.presentCount += 0.5;
                        userObj.actualWorkingDays += 0.5;
                      }
                    }
                  } else {
                    attendanceObj.title.push('A');
                    userObj.absentCount += 1;
                  }
                }
              }

              if (approveLeave.length > 0) {
                attendanceObj.title.push(...allApprovedLeaveNames);
              }

              if (weekOffData && holidayData) {
                if (weekOffHolidayPriority == 'PH') {
                  userObj.holidayCount += holidayData.value;
                  attendanceObj.title.push('HD');
                } else {
                  userObj.weekOffCount += weekOffData.value;
                  if (weekOffData.value < 1) {
                    attendanceObj.title.push('WO (SH)');
                  } else {
                    attendanceObj.title.push('WO');
                  }
                }
              } else if (weekOffData) {
                userObj.weekOffCount += weekOffData.value;
                if (weekOffData.value < 1) {
                  attendanceObj.title.push('WO (SH)');
                } else {
                  attendanceObj.title.push('WO');
                }
              } else if (holidayData) {
                userObj.holidayCount += holidayData.value;
                attendanceObj.title.push('HD');
              }
              attendanceObj.title = attendanceObj.title.join('+');
              userObj.allDayAttedanceStatus.push(attendanceObj.title);
              userObj.attendanceData.push(attendanceObj);
            } else {
              // No Attendance Or Total Full Day Leave

              if (approveLeave.length > 0) {
                attendanceObj.title.push(...allApprovedLeaveNames);
              }
              let title = null;
              if (weekOffData && holidayData) {
                if (weekOffHolidayPriority == 'PH') {
                  userObj.holidayCount += holidayData.value;
                  title = 'HD';
                } else {
                  userObj.weekOffCount += weekOffData.value;
                  if (weekOffData.value < 1) {
                    title = 'WO (SH)';
                  } else {
                    title = 'WO';
                  }
                  if (totalLeaveAndOutDutyDays == 0 && weekOffData.value < 1) {
                    if (userObj.fullMonthPresence) {
                      attendanceObj.title.push('P');
                      userObj.presentCount += 1 - weekOffData.value;
                      userObj.actualWorkingDays += 1 - weekOffData.value;
                    } else {
                      attendanceObj.title.push('A');
                      userObj.absentCount += 1 - weekOffData.value;
                    }
                  }
                }
              } else if (weekOffData) {
                if (totalApprovedLeaveDays == 0) {
                  userObj.weekOffCount += weekOffData.value;
                  if (weekOffData.value < 1) {
                    title = 'WO (SH)';
                    if (userObj.fullMonthPresence) {
                      attendanceObj.title.push('P');
                      userObj.presentCount += 1 - weekOffData.value;
                      userObj.actualWorkingDays += 1 - weekOffData.value;
                    } else {
                      if (totalLeaveAndOutDutyDays == 0) {
                        attendanceObj.title.push('A (HFD)');
                      }
                      userObj.absentCount += 1 - weekOffData.value;
                    }
                  } else {
                    title = 'WO';
                  }
                } else if (
                  totalApprovedLeaveDays == 0.5 &&
                  weekOffData.value < 1
                ) {
                  userObj.weekOffCount += weekOffData.value;
                  title = 'WO (SH)';
                }
              } else if (holidayData) {
                userObj.holidayCount += holidayData.value;
                title = 'HD';
              } else if (totalLeaveAndOutDutyDays == 0.5) {
                if (userObj.fullMonthPresence && !weekOffData && !holidayData) {
                  attendanceObj.title.push('P');
                  userObj.presentCount += 0.5;
                  userObj.actualWorkingDays += 0.5;
                } else {
                  if (!totalApprovedOutDutyDays) {
                    if (isSandwichleave) {
                      title = 'A(s)';
                    } else if (weekOffAbsentData) {
                      title = attendanceStatusForCalender.WEEKOFF_ABSENT;
                    } else {
                      attendanceObj.title.push('A');
                    }
                  }
                  userObj.absentCount += 0.5;
                }
              } else if (totalLeaveAndOutDutyDays == 0) {
                if (isSandwichleave) {
                  title = 'A(s)';
                  userObj.absentCount += 1;
                } else if (weekOffAbsentData) {
                  title = attendanceStatusForCalender.WEEKOFF_ABSENT;
                  userObj.absentCount += 1;
                } else {
                  if (
                    userObj.fullMonthPresence &&
                    !weekOffData &&
                    !holidayData
                  ) {
                    attendanceObj.title.push('P');
                    userObj.presentCount += 1;
                    userObj.actualWorkingDays += 1;
                  } else {
                    attendanceObj.title.push('A');
                    userObj.absentCount += 1;
                  }
                }
              }
              if (title) {
                attendanceObj.title.push(title);
              }
              attendanceObj.title = attendanceObj.title.join('+');
              userObj.allDayAttedanceStatus.push(attendanceObj.title);
              userObj.attendanceData.push(attendanceObj);
            }
          }
          // set weekoff Policy type
          if (
            userWeekOffPolicy &&
            weekoffPolicyType &&
            !userWeekOffPolicy.isNoWeekoffPolicy
          ) {
            if (weekoffPolicyType == weekoffTypeEnum.MONTHLYFIX) {
              userObj.weekOffCount = userWeekOffPolicy.monthlyFix;
            } else if (weekoffPolicyType == weekoffTypeEnum.ONPAIDDAYS) {
              userObj.weekOffCount = Math.floor(
                +userObj.actualWorkingDays / +userWeekOffPolicy.paidDays,
              );
            }
          }

          const groupedByDate = weekoffholidayData.reduce((acc, curr) => {
            const dateKey = curr.date; // e.g. '2024-08-15'

            if (!acc[dateKey]) {
              acc[dateKey] = curr;
            } else {
              const existing = acc[dateKey];

              if (weekOffHolidayPriority === 'PH') {
                // Prefer 'holiday' if both exist
                if (
                  curr.tableName === 'holiday' &&
                  existing.tableName !== 'holiday'
                ) {
                  acc[dateKey] = curr;
                }
              } else {
                // Prefer 'weekoff' if both exist
                if (
                  curr.tableName === 'weekoff' &&
                  existing.tableName !== 'weekoff'
                ) {
                  acc[dateKey] = curr;
                }
              }

              // If both are same (duplicate), keep existing
            }

            return acc;
          }, {});

          const totalWeekOffHolidayValue = Object.values(groupedByDate).reduce(
            (sum, e) => sum + (e.value || 0),
            0,
          );
          userObj.expectedWorkDays =
            userObj.totalMonthDays -
            userObj.daysBeforeJoiningOrAfterLeft -
            +totalWeekOffHolidayValue;

          userObj.paidDaysCount =
            userObj.totalMonthDays -
            userObj.absentCount -
            userObj.daysBeforeJoiningOrAfterLeft -
            userObj.unPaidLeaveCount;

          if (userObj.salaryCalculationAct == salaryCalculationAct.FACTORYACT) {
            userObj.paidDaysCount =
              userObj.paidDaysCount - userObj.weekOffCount;
          } else if (
            userObj.salaryCalculationAct == salaryCalculationAct.ONWORKINGDAYS
          ) {
            userObj.paidDaysCount =
              userObj.paidDaysCount -
              userObj.weekOffCount -
              userObj.holidayCount;
          }

          if (!exportData) {
            cycleWiseObj.users.push(userObj);
          } else if (exportData && exportDataFileType == 'xlsx') {
            processExcelRowForAttendanceReportWithSalaryCycle({
              e: userObj,
              currentRowSheetWiseNumber,
              serialNumberIndex,
              mainHeader,
              workSheet,
            });
            serialNumberIndex++;
          } else if (exportData && exportDataFileType == 'pdf') {
            cycleWiseObj.users.push(userObj);
          }
        }
        formatMemoryToShow(`After processing batch ${exportPage}`);
        hasMore = paginatedUserData.length === batchSize && exportData;
        exportPage += 1;
      }
      if (exportData && exportDataFileType == 'xlsx') {
        workSheet.commit();
      } else if (exportData && exportDataFileType == 'pdf') {
        if (cycleWiseObj.users.length) {
          mainHeader = [
            'Sr No.',
            'Employee Code',
            'Employee Name',
            'Designation',
            'Gender',
            'Date Of Birth',
            'Date Of Joining',
            ...date_header,
            'Actual Present',
            'Absent',
            'WH',
            'PH',
            'Total',
            ...leaveNamesArray,
          ];
          const lightweightUsers = cycleWiseObj.users.map((user, index) => ({
            srNo: index + 1,
            employeeCode: user.employeeCode || '',
            displayName: user.displayName || '',
            designation: user.designation || '',
            gender: user.gender || '',
            dateOfBirth: user.formattendDateOfBirth || '',
            dateOfJoining: user.formattendJoiningDate || '',
            allDayAttendanceStatus: user.allDayAttedanceStatus || [], // normalize name
            actualWorkingDays: user.actualWorkingDays || 0,
            absentCount: user.absentCount || 0,
            weekOffCount: user.weekOffCount || 0,
            holidayCount: user.holidayCount || 0,
            paidDaysCount: user.paidDaysCount || 0,
            leave: user.leaveCountsData?.map((l) => l.usedCount) || [],
          }));
          const pdfData = {
            title: headingFirstRow,
            companyName: companyNameRow,
            companyAddress: companyAddressRow,
            headingFirstRow,
            headingSecondRow,
            headingThirdRow,
            month: formattedYearMonth,
            tableData: lightweightUsers,
            tableHeaders: mainHeader,
          };

          const getTemplate1 = (type) => {
            const file = path.join(__dirname, `../html/${type}.html`);
            return file;
          };
          Handlebars.registerHelper({
            eq: (v1, v2) => v1 === v2,
            ne: (v1, v2) => v1 !== v2,
            lt: (v1, v2) => v1 < v2,
            gt: (v1, v2) => v1 > v2,
            lte: (v1, v2) => v1 <= v2,
            gte: (v1, v2) => v1 >= v2,
            and() {
              return Array.prototype.every.call(arguments, Boolean);
            },
            or() {
              return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
            },
          });
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
          const filePath = await getTemplate1('musterRollRegister');
          const file = await readFile(filePath);
          const template = Handlebars.compile(file);
          const html = template(pdfData);

          const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox'],
          });
          const page = await browser.newPage();
          await page.setContent(html);
          const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: true,
            timeout: 120000,
            // margin: {
            //   top: '10p0x',
            //   bottom: '10p0x',
            //   right: '10p0x',
            //   left: '10p0x',
            // },
          });
          await browser.close();

          // Save PDF to file instead of returning base64
          const fileName = `${salaryPolicyNameRow}.pdf`;
          const pdfFilePath = path.join(tempFilePath, fileName);

          // Write PDF buffer to file
          fs.writeFileSync(pdfFilePath, pdfBuffer);

          // Add to array for zipping
          fileNamessArrary.push({ filePath: pdfFilePath, fileName });

          console.log('🟢 After PDF Save Memory:', formatMemoryToShow());
        }
      }
      if (cycleWiseObj.users.length) {
        attendaceDataArrayCycleWise.push(cycleWiseObj);
      }
    }
    if (exportData && exportDataFileType == 'xlsx') {
      await workBook.commit();
      // Pipe file to client, delete after done
      const fileStream = fs.createReadStream(tempFilePath);
      res.attachment(`Attendace Register-1.xlsx`);
      res.set({ 'Access-Control-Expose-Headers': '*' });
      fileStream.pipe(res);
      fileStream.on('close', () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Failed to remove temp file:', err);
        });
      });
      return;
    } else if (exportData && exportDataFileType == 'pdf') {
      console.log('🟢 Before Zip Memory:', formatMemoryToShow());
      const zip = new JSZip();
      for (let fileData of fileNamessArrary) {
        const excelBuffer = fs.readFileSync(fileData.filePath);
        console.log('🟢 After Excel Buffer Memory:', formatMemoryToShow());
        // Add to zip
        zip.file(fileData.fileName, excelBuffer);
        console.log('🟢 After Add in Zip:', formatMemoryToShow());
        // Delete the individual file after adding to zip
        fs.unlinkSync(fileData.filePath);
        console.log('🟢 After Remove File Memory:', formatMemoryToShow());
      }
      // Generate zip file
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const zipPath = path.join(tempFilePath, `${headingFirstRow}.zip`);
      console.log('🟢 After Zip Buffer Memory:', formatMemoryToShow());
      // Write zip to file
      fs.writeFileSync(zipPath, zipBuffer);
      console.log('🟢 After Zip Write Memory:', formatMemoryToShow());
      // Send the zip file to user and cleanup after download
      res.download(zipPath, `${headingFirstRow}.zip`, (err) => {
        // Cleanup: Remove the temporary directory after download
        if (fs.existsSync(tempFilePath)) {
          fs.rmSync(tempFilePath, { recursive: true, force: true });
        }

        if (err) {
          console.error('Error downloading zip:', err);
        }
      });
      return;
    }

    return res.status(statusCodes.OK).json({
      leaveTypes: leaveNamesArray,
      salaryCycle: salaryCycleArray,
      data: attendaceDataArrayCycleWise,
    });
  } catch (err) {
    next(err);
  }
};

function processExcelRowForAttendanceReportWithSalaryCycle({
  e,
  currentRowSheetWiseNumber,
  serialNumberIndex,
  mainHeader,
  workSheet,
}) {
  try {
    // STEP 1: Build all user-related rows, NO commit yet
    const isGreyCell = (serialNumberIndex + 1) % 2 === 0;
    const userRows = [];
    const userDatavaluesRows = [
      serialNumberIndex + 1,
      e.employeeCode,
      e.displayName,
      e.designation,
      e.gender,
      e.formattendDateOfBirth,
      e.formattendJoiningDate,
    ];
    const summaryHeaders = [
      e.actualWorkingDays,
      e.absentCount,
      e.weekOffCount,
      e.holidayCount,
      e.paidDaysCount,
      '',
      ...(e.leaveCountsData?.map((item) => item.usedCount) ?? []),
    ];

    const attandanceStatus = e.allDayAttedanceStatus || [];
    userRows.push(
      workSheet.addRow([
        ...userDatavaluesRows,
        ...attandanceStatus,
        ...summaryHeaders,
      ]),
    );
    currentRowSheetWiseNumber++;

    for (const row of userRows) {
      const totalColumns = mainHeader.length;

      for (let colIndex = 1; colIndex <= totalColumns; colIndex++) {
        const cell = row.getCell(colIndex);

        if (cell.value === undefined || cell.value === null) {
          cell.value = '';
        }

        // Borders
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Alignment
        cell.alignment = { vertical: 'middle', horizontal: 'center' };

        // 🎯 Fill logic
        if (isGreyCell) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'D3D3D3' },
          };
        }
      }

      row.commit();
    }
  } catch (error) {
    throw error;
  }
}
