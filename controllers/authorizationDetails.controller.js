const Sequelize = require('sequelize');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const authMasters = require('../models/authorizationMaster');
const UserMaster = require('../models/userMaster');
const UserExpense = require('../models/userExpense');
const ExpenseAuthorizationRequest = require('../models/expenseAuthorization');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const { executeQuery } = require('./common.controller');
const EmployeeBranch = require('../models/employeeBranch');
const UserLeave = require('../models/userleave');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const OvertimeCalculation = require('../models/overTimeCalculation');
const OvertimeAuthorization = require('../models/overtimeAuthorization');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const overTimeCalculation = require('../models/overTimeCalculation');
const overtimeAuthorizationRequest = require('../models/overtimeAuthorization');
const UserResignation = require('../models/resignation');
const ResignationAuth = require('../models/resignationAuthorization');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const AttendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const {
  sendNotification,
  asiaKolkataDateTime,
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
  destroyLeaveAuthAndApprovedLeaveAuth,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
const UserInbox = require('../models/UserInbox');

const moment = require('moment');
const { generateExcel } = require('../utils/exportData');
const { userAttributes, companyAttributes } = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');

const GatePassAuthorizationRequest = require('../models/gatePassAuthorization');
const EmployeeGatepass = require('../models/employeeGatepass');
const coffMaster = require('../models/coffMaster');
const CompensatoryOffAuthorization = require('../models/compensatoryOffAuthorization');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UserShortLeave = require('../models/userShortLeave');
const ShortLeaveAuthorization = require('../models/shortLeaveAuthorization');
const ExtraDays = require('../models/extraDays');
const ExtraDaysAuthorization = require('../models/extraDaysAuthorization');
const {
  authorizationMasterTypes,
  authorizationCriteriaType,
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  notificationScreentTypes,
  notificationTitleTypes,
} = require('../utils/dbUtils');
const WorkFromHomeAuthorization = require('../models/workFromHomeAuthorizations');
const UserWorkFromHome = require('../models/userWorkFromHome');
const userWorkFromHomeService = require('../services/userWorkFromHomeService');
const {
  workFromHomeAuthorization,
  expenseAuthorization,
  overtimeAuthorization,
  coffAuthorization,
  extraDaysAuthorization,
  resignationAuthorization,
  getPassAuthorization,
  attendanceCorrectionAuthorization,
  leaveAuthorization,
  shortLeaveAuthorization,
  workFromHomeAuthorizationReplace,
  expenseAuthorizationReplace,
  overtimeAuthorizationReplace,
  resignationAuthorizationReplace,
  gatePassAuthorizationReplace,
  coffAuthorizationReplace,
  leaveAuthorizationReplace,
  shortLeaveAuthorizationReplace,
  attendanceCorrectionAuthorizationReplace,
  bankDetailRequestAuthorization,
  bankDetailRequestAuthorizationReplace,
  expenseAdvanceRequestAuthorization,
  expenseAdvanceRequestAuthorizationReplace,
  loanRequestAuthorization,
  manPowerRequisitionAuthorization,
  manPowerRequisitionRequestAuthorizationReplace,
  tourRequestAuthorization,
  tourRequestAuthorizationReplace,
  visitRequestAuthorization,
  SalaryIncrementAuthorization,
  salaryIncrementRequestAuthorizationReplace,
  courseAuthorization,
  courseAuthorizationReplace,
} = require('../utils/AuthorizationFunction');
const BankDetailRequest = require('../models/bankDetailRequest');
const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const ExpenseAdvanceReqAuth = require('../models/expenseAdvanceReqAuth');
const ExpenseAdvanceRequest = require('../models/expenseAdvanceRequest');
const AppraisalFeedbackReq = require('../models/appraisalFeedbacklRequest');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const LoanAuthorization = require('../models/loanAuthorizationRequest');
const LoanMaster = require('../models/loanMaster');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ManPowerRequisitionRequest = require('../models/manPowerRequisitionRequest');
const ManPowerRequisitionAuthorization = require('../models/manPowerRequisitionAuthorization');
const toursMaster = require('../models/toursMaster');
const tourAuthorization = require('../models/tourAuthorization');
const SalaryIncrementRequest = require('../models/salaryIncrementRequest');
const SalaryIncrementRequestAuthorization = require('../models/salaryIncrementRequestAuthorization');
const SalaryIncrementRequestDetails = require('../models/salaryIncrementRequestDetails');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const Course = require('../models/course');
const CourseAuthorizationRequest = require('../models/courseAuthorization');

exports.postAddAuthorizationDetails = async (req, res, next) => {
  try {
    let {
      AuthorizationMasterID,
      AuthorizedByUserMasterId,
      AuthorizationCriteriaID,
      SerialNo,
      FromAmount,
      ToAmount,
      SequenceNo,
      RequiredAuthorizationMessage,
      companyMasterID,
      userMasterID,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const iosTokens = [];
    const androidTokens = [];
    let bulkNotificationObject = [];

    const minRequiredMap = {
      [authorizationCriteriaType.ANYONE]: 1,
      [authorizationCriteriaType.SEQUENCENO]: 1,
      [authorizationCriteriaType.ANYTWO]: 2,
      [authorizationCriteriaType.ANYTHREE]: 3,
    };

    const minRequired = minRequiredMap[AuthorizationCriteriaID];

    if (minRequired && AuthorizedByUserMasterId.length < minRequired) {
      return res.status(200).json({
        status: 401,
        message: `At least ${minRequired} authorized person${
          minRequired > 1 ? 's are' : ' is'
        } required for the selected authorization criteria.`,
      });
    }

    const authUserMasterData = await UserMaster.findAll({
      distinct: true,
      where: {
        userMasterID: { [Sequelize.Op.in]: AuthorizedByUserMasterId },
      },
      attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
    });

    authUserMasterData.forEach((user) => {
      if (user.toJSON().deviceType === 'ios' && user.firebaseToken) {
        iosTokens.push(user.firebaseToken);
      } else if (user.toJSON().deviceType === 'android' && user.firebaseToken) {
        androidTokens.push(user.firebaseToken);
      }
    });

    await sequelize.transaction(async (t) => {
      const authorizedUserIds = (
        await AuthorizationDetails.findAll({
          distinct: true,
          attributes: ['AuthorizationDetailsId'],
          where: {
            userMasterID: { [Sequelize.Op.in]: userMasterID },
            AuthorizationMasterID: +AuthorizationMasterID,
            status: '1',
          },
          raw: true,
          transaction: t,
        })
      ).map((item) => item.AuthorizationDetailsId);

      //Authorizationdetails Removed
      await AuthorizationDetails.update(
        {
          status: 2,
          updateBy,
          updateByIp,
        },
        {
          where: { AuthorizationDetailsId: authorizedUserIds },
          transaction: t,
        },
      );

      if (userMasterID && userMasterID.length) {
        //Authorizationdetails Object create
        const authorizationDetailsObject = userMasterID.map((item) => {
          return {
            AuthorizationMasterID,
            AuthorizedByUserMasterId,
            AuthorizationCriteriaID,
            userMasterID: item,
            SerialNo,
            FromAmount,
            ToAmount,
            SequenceNo,
            RequiredAuthorizationMessage,
            companyMasterID,
            createBy,
            createByIp,
          };
        });

        // AuthorizationDetail Add
        await AuthorizationDetails.bulkCreate(authorizationDetailsObject, {
          transaction: t,
        });

        const authorizationStatus =
          AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
            ? AuthorizationStatusType.PEDING_TWO
            : AuthorizationStatusType.PEDING_ONE;

        //Expense code Start
        if (AuthorizationMasterID == authorizationMasterTypes.expense) {
          const expenseNotificationData = await expenseAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );
          const expenseAdvanceRequestNotificationData =
            await expenseAdvanceRequestAuthorization(
              req,
              userMasterID,
              authorizationStatus,
              AuthorizationCriteriaID,
              AuthorizedByUserMasterId,
              updateBy,
              createByIp,
              updateByIp,
              iosTokens,
              androidTokens,
              t,
            );
          //Expense Firebase Notification pushed
          bulkNotificationObject.push(...expenseNotificationData);
          bulkNotificationObject.push(...expenseAdvanceRequestNotificationData);
        }
        //Expense code End

        //Overtime calculation code start
        else if (AuthorizationMasterID == authorizationMasterTypes.overtime) {
          const overTimeNotificationData = await overtimeAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );
          //Expense Firebase Notification pushed
          bulkNotificationObject.push(...overTimeNotificationData);
        }
        //Over time Calculation end

        //Compensatory Off and extra days Code start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.compensatoryOff
        ) {
          //Compensatory Off start
          const coffNotificationData = await coffAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //coff Firebase Notification pushed
          bulkNotificationObject.push(...coffNotificationData);
          //Compensatory Off end

          //Extra Days start
          const extraDaysNotificationData = await extraDaysAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //extraDays Firebase Notification pushed
          bulkNotificationObject.push(...extraDaysNotificationData);
          //Extra Days Code end
        }
        //compensatory Off and Extra days Code end

        // Resignation Code Start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.resignation
        ) {
          const resignationNotificationData = await resignationAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //Resignation Firebase Notification pushed
          bulkNotificationObject.push(...resignationNotificationData);
        }
        // Resignation Code end

        //Employee gate Pass Code start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.employeeGatePass
        ) {
          const getPassNotificationData = await getPassAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //Employee Gaten Pass Firebase Notification pushed
          bulkNotificationObject.push(...getPassNotificationData);
        }
        //Employee gate pass code end

        //Attendance correction code start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.attendanceCorrection
        ) {
          const attendanceCorrectionNotificationData =
            await attendanceCorrectionAuthorization(
              req,
              userMasterID,
              authorizationStatus,
              AuthorizationCriteriaID,
              AuthorizedByUserMasterId,
              updateBy,
              createByIp,
              updateByIp,
              iosTokens,
              androidTokens,
              t,
            );

          //Attendance correction Firebase Notification pushed
          bulkNotificationObject.push(...attendanceCorrectionNotificationData);
        }
        //Attendance correction code end

        //Leave, Short Leave and Work from Home Code start
        else if (AuthorizationMasterID == authorizationMasterTypes.leave) {
          const leaveNotificationData = await leaveAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //Leave Firebase Notification pushed
          bulkNotificationObject.push(...leaveNotificationData);

          //Short Leave code start
          const shortLeaveNotificationData = await shortLeaveAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );
          //Short Leave Firebase Notification pushed
          bulkNotificationObject.push(...shortLeaveNotificationData);
          //Short Leave code End

          //Work From Home Code Start
          const workFromHomeNotificationData = await workFromHomeAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //Work From Home Firebase Notification pushed
          bulkNotificationObject.push(...workFromHomeNotificationData);
          //Work From Home code end
        }
        //Leave, Short Leave and work from home Code end

        //Bank Detail Request Start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.statutoryDetail
        ) {
          const bankDetailNotificationData =
            await bankDetailRequestAuthorization(
              req,
              userMasterID,
              authorizationStatus,
              AuthorizationCriteriaID,
              AuthorizedByUserMasterId,
              updateBy,
              createByIp,
              updateByIp,
              iosTokens,
              androidTokens,
              t,
            );

          //Bank Detail Firebase Notification pushed
          bulkNotificationObject.push(...bankDetailNotificationData);
        }
        //Bank Detail Request end

        // Loan Authorization Start
        else if (AuthorizationMasterID == authorizationMasterTypes.loan) {
          const loanNotificationData = await loanRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

          //Bank Detail Firebase Notification pushed
          bulkNotificationObject.push(...loanNotificationData);
        }
        // Loan Authorization End

        // Man Power Requisition Start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.manPowerRequisition
        ) {
          const manPowerRequisition = await manPowerRequisitionAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
          );

          bulkNotificationObject.push(...manPowerRequisition);
        }
        // Tour Authorization Start
        else if (AuthorizationMasterID == authorizationMasterTypes.tour) {
          const tourNotificationData = await tourRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
          );
          bulkNotificationObject.push(...tourNotificationData);
        }
        // Tour Authorization End

        // Visit Authorization Start
        else if (AuthorizationMasterID == authorizationMasterTypes.visit) {
          const visitNotificationData = await visitRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
          );
          bulkNotificationObject.push(...visitNotificationData);
        }
        // Visit Authorization End

        // Salary Increment Start
        else if (
          AuthorizationMasterID == authorizationMasterTypes.salaryIncrement
        ) {
          const salaryIncrementNotificationData =
            await SalaryIncrementAuthorization(
              req,
              userMasterID,
              authorizationStatus,
              AuthorizationCriteriaID,
              AuthorizedByUserMasterId,
              updateBy,
              createByIp,
              updateByIp,
              iosTokens,
              androidTokens,
            );
          bulkNotificationObject.push(...salaryIncrementNotificationData);
        }
        // Salary Increment End
        else if (
          AuthorizationMasterID == authorizationMasterTypes.lmsCourse
        ) {
          const courseNotificationData = await courseAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );
          bulkNotificationObject.push(...courseNotificationData);
        }
        // Course Authorization End
      }
    });

    //sent Bulk Notification
    if (bulkNotificationObject.length > 0) {
      for (const notificationItem of bulkNotificationObject) {
        if (notificationItem.iosTokens.length > 0) {
          sendBulkNotification(
            notificationItem.iosTokens,
            notificationItem.payload,
            'ios',
          );
        }

        if (notificationItem.androidTokens.length > 0) {
          sendBulkNotification(
            notificationItem.androidTokens,
            notificationItem.payload,
            'android',
          );
        }
      }
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Authorization'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationDetails = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      userMasterID,
      AuthorizationMasterID,
      exportData,
    } = await req.body;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {};
    condition.status = 1;
    if (companyMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;
      condition.companyMasterID = companyMasterID;
    }
    if (userMasterID) condition.userMasterID = userMasterID;
    if (AuthorizationMasterID)
      condition.AuthorizationMasterID = AuthorizationMasterID;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const Auth_master = await AuthorizationDetails.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['AuthorizationDetailsId', 'ASC']],
      include: [
        {
          model: UserMaster,
          where: { status: 1, ...userAccessCondition.where },
          attributes: userAttributes,
          required: true,
          include: [
            ...userAccessCondition.includeModels,
            { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
          ],
        },
        { model: AuthorizationCriteria },
        { model: companyMaster, attributes: companyAttributes },
        { model: authMasters },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
      ],
    });

    for (let j = 0; j < Auth_master.rows.length; j++) {
      let user1 = await UserMaster.findOne({
        where: {
          userMasterID: Auth_master.rows[j].createBy,
        },
      });
      let user2 = await UserMaster.findOne({
        where: {
          userMasterID: Auth_master.rows[j].updateBy,
        },
      });

      if (user1) {
        Auth_master.rows[j].createBy = user1.dataValues.displayName;
      }
      if (user2) {
        Auth_master.rows[j].updateBy = user2.dataValues.displayName;
      }
      let authPerson = [];

      for (
        let k = 0;
        k < Auth_master.rows[j].AuthorizedByUserMasterId.length;
        k++
      ) {
        let user3 = await UserMaster.findOne({
          where: {
            userMasterID: Auth_master.rows[j].AuthorizedByUserMasterId[k],
          },
        });
        authPerson.push(user3.displayName);
      }

      Auth_master.rows[j].dataValues.AuthorizedPersonName =
        authPerson.join(',');
    }

    if (exportData) {
      async function fetchEmployeeDetails(Auth_master) {
        const finalData = await Promise.all(
          Auth_master.map(async (auth) => {
            const userMasterID = auth.userMaster.userMasterID;
            const [branch, department, designation] = await Promise.all([
              employeeBranch(userMasterID, new Date()),
              employeeDepartment(userMasterID, new Date()),
              employeeDesignation(userMasterID, new Date()),
            ]);

            return {
              ['EmployeeCode']: auth.userMaster.employeeJoiningDetails[0]
                ? auth.userMaster.employeeJoiningDetails[0].dataValues
                    .employeeCode
                : '',
              UserName: auth.userMaster.displayName,
              AuthorizationCriteria: auth.AuthorizationCriteriaMaster
                ? auth.AuthorizationCriteriaMaster.AuthorizationCriteria
                : '',
              AuthorizationName:
                auth.authorizationMaster.authorizationMasterName || '',
              AuthorizedPersonName: auth.dataValues.AuthorizedPersonName
                ? auth.dataValues.AuthorizedPersonName
                : '',
              CompanyName: auth.companyMaster.companyName,
              BranchName: branch ? branch['branchMaster.branchName'] : '',
              Department: department
                ? department['department.departmentName']
                : '',
              Designation: designation
                ? designation['designation.designationName']
                : '',
              CreatedAt: auth.createdAt
                ? asiaKolkataDateTime(auth.createdAt)
                : '',
            };
          }),
        );

        return finalData;
      }

      const finalData = await fetchEmployeeDetails(Auth_master.rows);
      await generateExcel(finalData, 'Authorization', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: Auth_master.rows,
      totalcount: Auth_master.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with bankMaster id
 *
 * @param {id} AuthorizationCriteriaID  to fetch bank name
 */

exports.getAuthorizationDetailsById = async (req, res, next) => {
  try {
    let get_one_data = await AuthorizationDetails.findOne({
      where: {
        AuthorizationDetailsId: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        { model: authMasters },
        { model: AuthorizationCriteriaMaster },
        { model: companyMaster },
        { model: UserMaster },
      ],
    });

    if (!get_one_data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      get_one_data = get_one_data.toJSON();
      get_one_data.authorizedCompany = [];

      for (let item of get_one_data.AuthorizedByUserMasterId) {
        const getCompany = await UserMaster.findOne({
          where: { userMasterID: item },
          attributes: ['companyMasterId'],
        });
        get_one_data.authorizedCompany.push(+getCompany.companyMasterId);
      }

      return res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

exports.postUpdateAuthorizationDetails = async (req, res, next) => {
  try {
    let {
      AuthorizationDetailsId,
      AuthorizationMasterID,
      AuthorizedByUserMasterId,
      AuthorizationCriteriaID,
      SerialNo,
      FromAmount,
      ToAmount,
      SequenceNo,
      RequiredAuthorizationMessage,
      companyMasterID,
      userMasterID,
    } = await req.body;
    userMasterID = Array.isArray(userMasterID) ? userMasterID : [userMasterID];
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const iosTokens = [];
    const androidTokens = [];
    let bulkNotificationObject = [];

    const authUserMasterData = await UserMaster.findAll({
      distinct: true,
      where: {
        userMasterID: { [Sequelize.Op.in]: AuthorizedByUserMasterId },
      },
      attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
    });

    authUserMasterData.forEach((user) => {
      if (user.toJSON().deviceType === 'ios' && user.firebaseToken) {
        iosTokens.push(user.firebaseToken);
      } else if (user.toJSON().deviceType === 'android' && user.firebaseToken) {
        androidTokens.push(user.firebaseToken);
      }
    });

    let change_data_status;

    const authorizationStatus =
      AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ? AuthorizationStatusType.PEDING_TWO
        : AuthorizationStatusType.PEDING_ONE;

    await sequelize.transaction(async (t) => {
      change_data_status = await AuthorizationDetails.update(
        {
          AuthorizationMasterID,
          AuthorizedByUserMasterId,
          AuthorizationCriteriaID,
          SerialNo,
          FromAmount,
          ToAmount,
          SequenceNo,
          RequiredAuthorizationMessage,
          companyMasterID,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: { AuthorizationDetailsId: AuthorizationDetailsId },
          transaction: t,
        },
      );

      if (
        AuthorizationMasterID == authorizationMasterTypes.probationAssessment
      ) {
        const getEmployeeEmployement = await UserMaster.findAll({
          where: {
            userMasterID: userMasterID,
          },
          include: [
            {
              model: EmployeeEmployeement,
              attributes: ['employeeEmployeementId'],
              where: {
                employeement: 'Probation',
                status: 1,
              },
              include: [
                {
                  as: 'eA',
                  model: AppraisalFeedbackReq,
                  attributes: ['appraisalFeedbackReqID'],
                },
              ],
            },
          ],
        });

        if (
          getEmployeeEmployement &&
          getEmployeeEmployement?.[0]?.employeeEmployeements?.[0]?.eA &&
          getEmployeeEmployement?.[0]?.employeeEmployeements?.[0]?.eA.length > 0
        ) {
          const allIdsToDelete =
            getEmployeeEmployement?.[0]?.employeeEmployeements?.[0]?.eA?.map(
              (item) => item.appraisalFeedbackReqID,
            );

          await AppraisalFeedbackReq.destroy({
            where: {
              appraisalFeedbackReqID: {
                [Sequelize.Op.in]: allIdsToDelete,
              },
              filledByID: {
                [Sequelize.Op.notIn]: AuthorizedByUserMasterId,
              },
              isAuthCycleDone: false,
            },
          });
        }
      }

      //for leave

      if (AuthorizationMasterID == authorizationMasterTypes.leave) {
        const leaveNotificationData = await leaveAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //Leave Firebase Notification pushed
        bulkNotificationObject.push(...leaveNotificationData);

        // ----------------------- Short Leave ------------------------------------------
        const shortLeaveNotificationData = await shortLeaveAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //Short Leave Firebase Notification pushed
        bulkNotificationObject.push(...shortLeaveNotificationData);

        // ----------------------- Work From Home ------------------------------------------
        const workFromHomeNotificationData = await workFromHomeAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //Work From Home Firebase Notification pushed
        bulkNotificationObject.push(...workFromHomeNotificationData);
      }

      //for expense
      else if (AuthorizationMasterID == authorizationMasterTypes.expense) {
        const expenseNotificationData = await expenseAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        const expenseAdvanceRequestNotificationData =
          await expenseAdvanceRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

        //Expense Firebase Notification pushed
        bulkNotificationObject.push(...expenseNotificationData);
        bulkNotificationObject.push(...expenseAdvanceRequestNotificationData);
      }

      //for overtime
      else if (AuthorizationMasterID == authorizationMasterTypes.overtime) {
        const overTimeNotificationData = await overtimeAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        //Expense Firebase Notification pushed
        bulkNotificationObject.push(...overTimeNotificationData);
      }
      //for resignation
      else if (AuthorizationMasterID == authorizationMasterTypes.resignation) {
        const resignationNotificationData = await resignationAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //Resignation Firebase Notification pushed
        bulkNotificationObject.push(...resignationNotificationData);
      }

      // for GatePass
      else if (
        AuthorizationMasterID == authorizationMasterTypes.employeeGatePass
      ) {
        const getPassNotificationData = await getPassAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //getPass Firebase Notification pushed
        bulkNotificationObject.push(...getPassNotificationData);
      }

      // For COff and Extra Days
      else if (
        AuthorizationMasterID == authorizationMasterTypes.compensatoryOff
      ) {
        //Compensatory Off start
        const coffNotificationData = await coffAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //coff Firebase Notification pushed
        bulkNotificationObject.push(...coffNotificationData);
        //Compensatory Off end

        //Extra Days start
        const extraDaysNotificationData = await extraDaysAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );

        //extraDays Firebase Notification pushed
        bulkNotificationObject.push(...extraDaysNotificationData);
      }

      // for Attendance Correction
      else if (
        AuthorizationMasterID == authorizationMasterTypes.attendanceCorrection
      ) {
        const attendanceCorrectionNotificationData =
          await attendanceCorrectionAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

        //Resignation Firebase Notification pushed
        bulkNotificationObject.push(...attendanceCorrectionNotificationData);
      }

      //for statutory Detail (Bank)
      else if (
        AuthorizationMasterID == authorizationMasterTypes.statutoryDetail
      ) {
        const bankDetailRequestNotificationData =
          await bankDetailRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

        //Bank Detail Request Notification pushed
        bulkNotificationObject.push(...bankDetailRequestNotificationData);
      }
      // for loan
      else if (AuthorizationMasterID == authorizationMasterTypes.loan) {
        const bankDetailRequestNotificationData =
          await loanRequestAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

        //Bank Detail Request Notification pushed
        bulkNotificationObject.push(...bankDetailRequestNotificationData);
      }
      // for Man Power Requisition
      else if (
        AuthorizationMasterID == authorizationMasterTypes.manPowerRequisition
      ) {
        const manPowerRequestNotificationData =
          await manPowerRequisitionAuthorization(
            req,
            userMasterID,
            authorizationStatus,
            AuthorizationCriteriaID,
            AuthorizedByUserMasterId,
            updateBy,
            createByIp,
            updateByIp,
            iosTokens,
            androidTokens,
            t,
          );

        bulkNotificationObject.push(...manPowerRequestNotificationData);
      }
      // for Tour Authorization
      else if (AuthorizationMasterID == authorizationMasterTypes.tour) {
        const tourNotificationData = await tourRequestAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        bulkNotificationObject.push(...tourNotificationData);
      }
      // for Visit Authorization
      else if (AuthorizationMasterID == authorizationMasterTypes.visit) {
        const visitNotificationData = await visitRequestAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        bulkNotificationObject.push(...visitNotificationData);
      } else if (
        AuthorizationMasterID == authorizationMasterTypes.salaryIncrement
      ) {
        const visitNotificationData = await SalaryIncrementAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        bulkNotificationObject.push(...visitNotificationData);
      } else if (
        AuthorizationMasterID == authorizationMasterTypes.lmsCourse
      ) {
        const courseNotificationData = await courseAuthorization(
          req,
          userMasterID,
          authorizationStatus,
          AuthorizationCriteriaID,
          AuthorizedByUserMasterId,
          updateBy,
          createByIp,
          updateByIp,
          iosTokens,
          androidTokens,
          t,
        );
        bulkNotificationObject.push(...courseNotificationData);
      }
      //sent Bulk Notification
      if (bulkNotificationObject.length > 0) {
        for (const notificationItem of bulkNotificationObject) {
          if (notificationItem.iosTokens.length > 0) {
            sendBulkNotification(
              notificationItem.iosTokens,
              notificationItem.payload,
              'ios',
            );
          }

          if (notificationItem.androidTokens.length > 0) {
            sendBulkNotification(
              notificationItem.androidTokens,
              notificationItem.payload,
              'android',
            );
          }
        }
      }

      res.status(200).json({
        status: 200,
        message: message.usermessage.authorizationCriteriaMasterUpdate,
      });
    });

    // }
  } catch (err) {
    next(err);
  }
};

exports.postDeleteAuthorizationDetailsById = async (req, res, next) => {
  try {
    let { AuthorizationDetailsId, AuthMasterID } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    // let delete_db_status = await BankMaster.destroy({
    //     where: {
    //         bankMasterID: bankMasterID
    //     }
    // });
    let result = await sequelize.transaction(async (t) => {
      let auth_details = await AuthorizationDetails.findOne({
        where: {
          AuthorizationDetailsId: AuthorizationDetailsId,
          status: [0, 1],
        },
      });

      let userMasterID = auth_details.userMasterID;

      //-------------------------------- for Leave---------

      if (AuthMasterID == 1) {
        const userLeaves = await UserLeave.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: LeaveAuthorizationRequest,
              attributes: ['AuthorizationRequestId'],
            },
          ],
        });

        const ReferenceID = userLeaves.map((e) => +e.UserLeaveApplicationID);

        const authorizationIds = userLeaves
          .flatMap((item) => item.leaveAuthorizations)
          .map((e) => e.AuthorizationRequestId);

        // Delete All UserInbox
        await UserInbox.destroy({
          where: {
            activityTable: {
              [Sequelize.Op.in]: [
                'outdoorDutyAuthorizations',
                'leaveAuthorizations',
              ],
            },
            activityTablePK: {
              [Sequelize.Op.in]: authorizationIds,
            },
          },
          transaction: t,
        });

        await destroyLeaveAuthAndApprovedLeaveAuth(ReferenceID, t);
        await UserLeave.update(
          {
            authorizationStatus: 0,
            updateBy: updateBy,
            updateByIp: updateByIp,
            AuthorizationCriteriaID: null,
          },
          {
            where: {
              UserLeaveApplicationID: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            transaction: t,
          },
        );

        //  --------------------------Short leave -----------------------

        const shortLeaveData = await UserShortLeave.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
          include: [
            {
              required: false,
              model: ShortLeaveAuthorization,
              attributes: ['id'],
            },
          ],
        });

        const userShortLeaveIds = shortLeaveData.map((e) => e.userShortLeaveId);

        const authorizationIds_shortLeave = shortLeaveData
          .flatMap((item) => item.shortLeaveAuthorizations)
          .map((e) => e.id);

        // Delete All UserInbox
        await UserInbox.destroy({
          where: {
            activityTable: ShortLeaveAuthorization.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: authorizationIds_shortLeave,
            },
          },
          transaction: t,
        });

        // Delete Short leave authorization
        await ShortLeaveAuthorization.destroy({
          where: {
            referenceId: {
              [Sequelize.Op.in]: userShortLeaveIds,
            },
          },
          hooks: false,
          transaction: t,
        });

        // update short leave

        await UserShortLeave.update(
          {
            authorizationStatus: 0,
          },
          {
            where: {
              userShortLeaveId: {
                [Sequelize.Op.in]: userShortLeaveIds,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          },
        );

        //Work From Home Code Start
        const workFromHomeData = await UserWorkFromHome.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: WorkFromHomeAuthorization,
              attributes: ['whAuthoriztaionid'],
            },
          ],
        });

        //Collect user Work From Home IDS
        const userWorkFromHomeIDS = workFromHomeData.map((item) => item.id);

        const allWhAuthorizationIds = workFromHomeData.flatMap((item) =>
          item.workFromHomeAuthorizations.map((auth) => auth.whAuthoriztaionid),
        );

        // Delete All UserInbox
        await UserInbox.destroy(
          {
            where: {
              activityTable: WorkFromHomeAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allWhAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await WorkFromHomeAuthorization.destroy({
          where: {
            whAuthoriztaionid: {
              [Sequelize.Op.in]: allWhAuthorizationIds,
            },
          },
          hooks: false,
          transaction: t,
        });

        await UserWorkFromHome.update(
          {
            authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
            AuthorizationCriteriaID: null,
          },
          {
            where: {
              id: {
                [Sequelize.Op.in]: userWorkFromHomeIDS,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
            validate: false,
          },
        );
      }

      //  for Expense------------
      else if (AuthMasterID == 2) {
        let userExpense = await executeQuery(
          ` 

                      select ut.* from "userExpenses" as ue inner join "userExpenseTransactions" as ut on ue."userExpenseID"= ut."userExpenseID"
                      where ue."userMasterID"=` +
            ':userMasterID' +
            ` and ut."authorizationStatus" in(1,2) and ut.status=1
                      
                      `,
          {
            replacements: { userMasterID: userMasterID },
          },
        );

        let ReferenceID = [];

        for (let i = 0; i < userExpense.length; i++) {
          ReferenceID.push(userExpense[i].userExpenseTransactionID);
        }

        const AuthorizationRequestIds = (
          await ExpenseAuthorizationRequest.findAll({
            attributes: ['AuthorizationRequestId'],
            where: {
              ReferenceID: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            raw: true,
          })
        ).map((item) => item.AuthorizationRequestId);

        await UserInbox.destroy({
          where: {
            activityTable: UserExpense.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: AuthorizationRequestIds,
            },
          },
          transaction: t,
        });

        let delete_auth_data = await ExpenseAuthorizationRequest.destroy({
          where: {
            ReferenceID: {
              [Sequelize.Op.in]: ReferenceID,
            },
          },
          transaction: t,
        });

        let update_expenseTrans = await UserExpenseTransaction.update(
          {
            authorizationStatus: 0,
            updateBy: updateBy,
            updateByIp: updateByIp,
            AuthorizationCriteriaID: null,
          },
          {
            where: {
              userExpenseTransactionID: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            transaction: t,
          },
        );

        const findExpenseAdvanceReq = await ExpenseAdvanceRequest.findAll({
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PENDING_ZERO,
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
            userMasterID: userMasterID,
          },
          include: [
            {
              model: ExpenseAdvanceReqAuth,
              as: 'Auth',
              attributes: ['AuthReqId'],
              where: {
                status: 1,
              },
              required: false,
            },
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        });
        const expenseAdvanceRequestIDs = findExpenseAdvanceReq.map((item) => {
          return item.expenseAdvanceRequestID;
        });
        const authIds = findExpenseAdvanceReq.flatMap((item) =>
          item.Auth ? item.Auth.map((a) => a.AuthReqId) : [],
        );
        await UserInbox.destroy({
          where: {
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: authIds,
            },
          },
          transaction: t,
        });

        await ExpenseAdvanceReqAuth.destroy({
          where: {
            AuthReqId: {
              [Sequelize.Op.in]: authIds,
            },
          },
          transaction: t,
        });
        await ExpenseAdvanceRequest.update(
          {
            authorizationStatus: 0,
            updateBy,
            updateByIp,
            AuthorizationCriteriaID: null,
          },
          {
            where: {
              expenseAdvanceRequestID: {
                [Sequelize.Op.in]: expenseAdvanceRequestIDs,
              },
            },
            transaction: t,
          },
        );
      }

      // for OverTime-----------
      else if (AuthMasterID == 3) {
        let userOvertime = await overTimeCalculation.findAll({
          where: {
            UserMasterID: userMasterID,
            AuthorizationRequired: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
        });

        let ReferenceID = [];

        for (let i = 0; i < userOvertime.length; i++) {
          ReferenceID.push(userOvertime[i].OverTimeID);
        }

        let delete_auth_data = await overtimeAuthorizationRequest.destroy({
          where: {
            ReferenceID: {
              [Sequelize.Op.in]: ReferenceID,
            },
          },
          transaction: t,
        });

        let update_overtime = await overTimeCalculation.update(
          {
            AuthorizationRequired: 0,
            updateBy: updateBy,
            updateByIp: updateByIp,
          },
          {
            where: {
              OverTimeID: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            transaction: t,
          },
        );
      }

      //  for Resignation---------
      else if (AuthMasterID == 5) {
        let userResignation = await UserResignation.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationstatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
          include: [
            {
              model: ResignationAuth,
              attributes: [
                'AuthorizationRequestId',
                'ReferenceID',
                'userMasterID',
              ],
            },
          ],
        });

        let ReferenceID = [];
        let resignationAuthIds = [];

        for (const resignationData of userResignation) {
          ReferenceID.push(resignationData.resignationID);
          for (const resAuthData of resignationData.resignationAuthorizations) {
            resignationAuthIds.push(resAuthData.AuthorizationRequestId);
          }
        }

        let delete_auth_data = await ResignationAuth.destroy({
          where: {
            ReferenceID: {
              [Sequelize.Op.in]: ReferenceID,
            },
          },
          transaction: t,
        });

        await UserInbox.destroy(
          {
            where: {
              activityTable: ResignationAuth.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: resignationAuthIds,
              },
            },
          },
          { transaction: t },
        );

        let update_resignation = await UserResignation.update(
          {
            authorizationstatus: 0,
            updateBy: updateBy,
            updateByIp: updateByIp,
          },
          {
            where: {
              resignationID: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            transaction: t,
          },
        );
      }

      // for Gate Pass---------
      else if (AuthMasterID == 6) {
        let employee_gatepass = await EmployeeGatepass.findAll({
          where: {
            userMasterId: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
          include: [
            {
              model: GatePassAuthorizationRequest,
              attributes: ['AuthorizationRequestId'],
            },
          ],
        });

        let ReferenceID = employee_gatepass.map((item) => item.id);

        const gatePassAuthorizationIDs = employee_gatepass.flatMap((item) =>
          item.gatePassAuthorizations.map(
            (auth) => auth.AuthorizationRequestId,
          ),
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: GatePassAuthorizationRequest.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: gatePassAuthorizationIDs,
              },
            },
          },
          { transaction: t },
        );

        let delete_auth_data = await GatePassAuthorizationRequest.destroy({
          where: {
            ReferenceID: {
              [Sequelize.Op.in]: ReferenceID,
            },
          },
          transaction: t,
        });

        let update_leave = await EmployeeGatepass.update(
          {
            authorizationStatus: 0,
            updateBy: updateBy,
            updateByIp: updateByIp,
          },
          {
            where: {
              id: {
                [Sequelize.Op.in]: ReferenceID,
              },
            },
            transaction: t,
          },
        );
      }

      // for Delete COff Auth and extra days
      else if (AuthMasterID == 8) {
        const findcoff = await coffMaster.findAll({
          where: {
            userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: CompensatoryOffAuthorization,
              attributes: ['CompensatoryOffAuthorizationID'],
            },
          ],
        });

        const authorizationIds = findcoff
          .flatMap((item) => item.compensatoryOffAuthorizations)
          .map((e) => e.CompensatoryOffAuthorizationID);
        const AllCoffMasterIDs = findcoff.map((e) => e.coffMasterID);

        await coffMaster.update(
          {
            authorizationStatus: 0,
            updateBy,
            updateByIp,
          },
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
            },
            transaction: t,
          },
        );

        // Delete All UserInbox
        await UserInbox.destroy(
          {
            where: {
              activityTable: CompensatoryOffAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: authorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await CompensatoryOffAuthorization.destroy(
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
              status: 1,
            },
          },
          {
            Hooks: false,
            transaction: t,
          },
        );

        //Extra Days code start
        const extraDaysData = await ExtraDays.findAll({
          attributes: [
            'extraDaysID',
            'userMasterID',
            'authorizationStatus',
            'date',
          ],
          where: {
            userMasterID,
            authorizationStatus: { [Sequelize.Op.in]: [1, 2] },
          },
          include: [
            {
              model: ExtraDaysAuthorization,
              attributes: ['extraDaysAuthorizationID'],
              required: false,
            },
          ],
        });

        // Collect extraDaysIDs
        const extraDayIDS = extraDaysData.map((item) => item.extraDaysID);

        // Collect extraDaysAuthorizationIDs (flattened)
        const extraDaysAuthorizationIDs = extraDaysData.flatMap((item) =>
          item.extraDaysAuthorizations.map(
            (auth) => auth.extraDaysAuthorizationID,
          ),
        );

        await ExtraDays.update(
          {
            authorizationStatus: 0,
            updateBy,
            updateByIp,
          },
          {
            where: {
              extraDaysID: {
                [Sequelize.Op.in]: extraDayIDS,
              },
            },
            transaction: t,
          },
        );

        // Delete All UserInbox
        await UserInbox.destroy(
          {
            where: {
              activityTable: ExtraDaysAuthorization.getTableName(),
              activityTablePK: extraDaysAuthorizationIDs,
            },
          },
          { transaction: t },
        );

        await ExtraDaysAuthorization.destroy(
          {
            where: {
              extraDaysAuthorizationID: extraDaysAuthorizationIDs,
            },
          },
          { transaction: t },
        );
      }
      // for Attendance Correction---------
      else if (AuthMasterID == 7) {
        let attendanceCorrection = await AttendanceCorrectionRequest.findAll({
          where: {
            userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
          include: [
            {
              required: false,
              model: AttendanceCorrectionAuthorization,
              attributes: ['id'],
            },
          ],
        });

        let ReferenceID = [];

        const authorizationIds = attendanceCorrection
          .flatMap((item) => item.attendanceCorrectionAuthorizations)
          .map((e) => e.id);

        for (let i = 0; i < attendanceCorrection.length; i++) {
          ReferenceID.push(
            attendanceCorrection[i].attendanceCorrectionRequestId,
          );
        }

        let deletAuthData = await AttendanceCorrectionAuthorization.destroy({
          where: {
            attendanceCorrectionRequestId: {
              [Sequelize.Op.in]: ReferenceID,
            },
          },
          user: req.userDetails,
          individualHooks: true,
          transaction: t,
        });

        const deleteNotification = await UserInbox.destroy(
          {
            where: {
              activityTable: AttendanceCorrectionAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: authorizationIds,
              },
            },
          },
          { transaction: t },
        );

        let updateAttendanceCorrection =
          await AttendanceCorrectionRequest.update(
            {
              authorizationStatus: 0,
              updateBy: updateBy,
              updateByIp: updateByIp,
            },
            {
              where: {
                attendanceCorrectionRequestId: {
                  [Sequelize.Op.in]: ReferenceID,
                },
              },
              user: req.userDetails,
              individualHooks: true,
              transaction: t,
            },
          );
      } else if (AuthMasterID == authorizationMasterTypes.statutoryDetail) {
        //Work From Home Code Start
        const bankDetailRequestData = await BankDetailRequest.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: BankDetailAuthorization,
              attributes: ['bankDetailAuthorizationId'],
            },
          ],
        });

        //Collect user Work From Home IDS
        const bankDetailRequestIDS = bankDetailRequestData.map(
          (item) => item.bankDetailRequestId,
        );

        const allbankDetailAuthorizationIds = bankDetailRequestData.flatMap(
          (item) =>
            item.bankDetailAuthorizations.map(
              (auth) => auth.bankDetailAuthorizationId,
            ),
        );

        // Delete All UserInbox
        await UserInbox.destroy(
          {
            where: {
              activityTable: BankDetailAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allbankDetailAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await BankDetailAuthorization.destroy({
          where: {
            bankDetailAuthorizationId: {
              [Sequelize.Op.in]: allbankDetailAuthorizationIds,
            },
          },
          hooks: false,
          transaction: t,
        });

        await BankDetailRequest.update(
          {
            authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
          },
          {
            where: {
              bankDetailRequestId: {
                [Sequelize.Op.in]: bankDetailRequestIDS,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
            validate: false,
          },
        );
      } else if (AuthMasterID == authorizationMasterTypes.loan) {
        const loanRequestData = await LoanMaster.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: LoanAuthorization,
              attributes: ['loanAuthorizationID'],
            },
          ],
        });

        const loanRequestIDS = loanRequestData.map((item) => item.LoanID);

        const allloanAuthorizationIds = loanRequestData.flatMap((item) =>
          item.loanAuthorizationRequests.map(
            (auth) => auth.loanAuthorizationID,
          ),
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: LoanAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allloanAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await LoanAuthorization.destroy({
          where: {
            loanAuthorizationID: {
              [Sequelize.Op.in]: allloanAuthorizationIds,
            },
          },
          hooks: false,
          transaction: t,
        });

        await LoanMaster.update(
          {
            authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
          },
          {
            where: {
              LoanID: {
                [Sequelize.Op.in]: loanRequestIDS,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
            validate: false,
          },
        );
      } else if (AuthMasterID == authorizationMasterTypes.manPowerRequisition) {
        const manPowerRequestData = await ManPowerRequisitionRequest.findAll({
          where: {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: ManPowerRequisitionAuthorization,
              as: 'manPowerAuth',
              attributes: ['manPowerRequisitionAuthorizationID'],
            },
          ],
        });

        const manPowerRequisitionRequestIDS = manPowerRequestData.map(
          (item) => item.manPowerRequisitionID,
        );

        const allManPowerAuthorizationIds = manPowerRequestData.flatMap(
          (item) =>
            item.manPowerAuth.map(
              (auth) => auth.manPowerRequisitionAuthorizationID,
            ),
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: ManPowerRequisitionAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allManPowerAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await ManPowerRequisitionAuthorization.destroy({
          where: {
            manPowerRequisitionAuthorizationID: {
              [Sequelize.Op.in]: allManPowerAuthorizationIds,
            },
          },
          hooks: false,
          transaction: t,
        });

        await ManPowerRequisitionRequest.update(
          {
            authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
          },
          {
            where: {
              manPowerRequisitionID: {
                [Sequelize.Op.in]: manPowerRequisitionRequestIDS,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
            validate: false,
          },
        );
      } else if (AuthMasterID == authorizationMasterTypes.tour) {
        const tourRequestData = await toursMaster.findAll({
          where: {
            UserMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              as: 'tourAuth',
              model: tourAuthorization,
              attributes: ['tourAuthorizationID'],
            },
          ],
        });

        const tourRequestIDS = tourRequestData.map(
          (item) => item.ToursMasterID,
        );

        const allTourAuthorizationIds = tourRequestData.flatMap((item) =>
          item.tourAuth.map((auth) => auth.tourAuthorizationID),
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: tourAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allTourAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await tourAuthorization.destroy({
          where: {
            tourAuthorizationID: {
              [Sequelize.Op.in]: allTourAuthorizationIds,
            },
          },
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        });

        await toursMaster.update(
          {
            authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
          },
          {
            where: {
              ToursMasterID: {
                [Sequelize.Op.in]: tourRequestIDS,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
            validate: false,
          },
        );
      } else if (AuthMasterID == authorizationMasterTypes.salaryIncrement) {
        const salaryIncrementRequestData = await SalaryIncrementRequest.findAll(
          {
            where: {
              userMasterID: userMasterID,
              authorizationStatus: {
                [Sequelize.Op.in]: [
                  AuthorizationStatusType.PEDING_ONE,
                  AuthorizationStatusType.PEDING_TWO,
                ],
              },
              status: 1,
            },
            include: [
              {
                required: false,
                model: SalaryIncrementRequestAuthorization,
                as: 'salaryIncreReqAuth',
                attributes: ['salaryIncrementRequestAuthorizationID'],
              },
            ],
          },
        );

        const salaryIncrementRequestIDs = salaryIncrementRequestData.map(
          (item) => item.salaryIncrementRequestID,
        );

        const allSalaryIncrementAuthorizationIds =
          salaryIncrementRequestData.flatMap((item) =>
            item.salaryIncreReqAuth.map(
              (auth) => auth.salaryIncrementRequestAuthorizationID,
            ),
          );

        await UserInbox.destroy(
          {
            where: {
              activityTable: SalaryIncrementRequestAuthorization.getTableName(),
              activityTablePK: {
                [Sequelize.Op.in]: allSalaryIncrementAuthorizationIds,
              },
            },
          },
          { transaction: t },
        );

        await SalaryIncrementRequestAuthorization.destroy({
          where: {
            salaryIncrementRequestAuthorizationID: {
              [Sequelize.Op.in]: allSalaryIncrementAuthorizationIds,
            },
          },
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        });

        await updateSalaryIncrement(salaryIncrementRequestIDs, {
          transaction: t,
          individualHooks: true,
          user: req.userDetails,
        });
      } else if (AuthMasterID == authorizationMasterTypes.lmsCourse) {
        const courseData = await Course.findAll({
          where: {
            createdBy: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            status: 1,
          },
          include: [
            {
              required: false,
              model: CourseAuthorizationRequest,
              as: 'courseAuthorizations',
              attributes: ['AuthorizationRequestId'],
            },
          ],
        });

        const courseIDs = courseData.map((item) => item.id);
        const allCourseAuthorizationIds = courseData.flatMap((item) =>
          (item.courseAuthorizations || []).map((auth) => auth.AuthorizationRequestId),
        );

        if (allCourseAuthorizationIds.length > 0) {
          await UserInbox.destroy(
            {
              where: {
                activityTable: CourseAuthorizationRequest.getTableName(),
                activityTablePK: {
                  [Sequelize.Op.in]: allCourseAuthorizationIds,
                },
              },
            },
            { transaction: t },
          );

          await CourseAuthorizationRequest.destroy({
            where: {
              AuthorizationRequestId: {
                [Sequelize.Op.in]: allCourseAuthorizationIds,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          });
        }

        if (courseIDs.length > 0) {
          await Course.update(
            {
              authorizationStatus: 0,
              courseStatus: 'DRAFT',
              updateBy: updateBy,
              updateByIp: updateByIp,
            },
            {
              where: {
                id: {
                  [Sequelize.Op.in]: courseIDs,
                },
              },
              user: req.userDetails,
              individualHooks: true,
              transaction: t,
            },
          );
        }
      }

      // ------
      let delete_status = await AuthorizationDetails.update(
        {
          status: 2,
          updateBy: updateBy,
          updateByIp: updateByIp,
        },
        {
          where: { AuthorizationDetailsId: AuthorizationDetailsId },
          transaction: t,
        },
      );
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.authorizationCriteriaMasterDelete,
    });
  } catch (err) {
    next(err);
  }
};

async function updateSalaryIncrement(allSalaryIncrementIds, options) {
  const salaryIncrements = await SalaryIncrementRequest.findAll({
    where: {
      salaryIncrementRequestID: {
        [Sequelize.Op.in]: allSalaryIncrementIds,
      },
    },
    include: [
      {
        model: SalaryIncrementRequestDetails,
        as: 'SIRDetails', // use your actual alias
      },
    ],
    ...options,
  });

  const result = [];

  for (const salaryIncrement of salaryIncrements) {
    const details = salaryIncrement.SIRDetails || [];

    for (const detail of details) {
      result.push({
        userMasterID: salaryIncrement.userMasterID,
        salaryFromYYYYMM: salaryIncrement.salaryFromYYYYMM,
        stateid: salaryIncrement.stateid,
        AmountIn: salaryIncrement.AmountIn,
        skillCategory: salaryIncrement.skillCategory,
        corporationId: salaryIncrement.corporationId,
        minWagesMasterId: salaryIncrement.minWagesMasterId,
        payrollFrequency: salaryIncrement.payrollFrequency,
        startDate: salaryIncrement.startDate,
        endDate: salaryIncrement.endDate,
        createBy: salaryIncrement.createBy,
        gradeSalaryStructureID: detail.gradeSalaryStructureID,
        EmployeeSalaryAmount: detail.EmployeeSalaryAmount,
        ActualEmployeeSalaryAmount: detail.ActualEmployeeSalaryAmount,
      });
    }
  }

  if (result.length > 0) {
    await HRSalaryMasterFields.bulkCreate(result, {
      ...options,
      individualHooks: true,
    });
  }

  await SalaryIncrementRequest.destroy({
    where: {
      salaryIncrementRequestID: {
        [Sequelize.Op.in]: allSalaryIncrementIds,
      },
    },
    individualHooks: true,
    user: options.user,
    transaction: options.transaction,
  });
}

exports.nonauthorizeduser = async (req, res, next) => {
  try {
    let { companyMasterID, branchMasterID, authorizationMasterID } =
      await req.body;

    let nonAuthorized_User;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (!branchMasterID) {
      let auth_details = await AuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterID,
          companyMasterID: companyMasterID,
          status: 1,
        },
        include: [
          {
            required: true,
            model: UserMaster,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });

      let authorized_user = [];

      for (let i = 0; i < auth_details.length; i++) {
        authorized_user.push(auth_details[i].userMasterID);
      }

      nonAuthorized_User = await UserMaster.findAll({
        raw: true,
        where: {
          userMasterID: {
            [Sequelize.Op.notIn]: authorized_user,
          },
          companyMasterId: companyMasterID,
          status: 1,
          ...userAccessCondition.where,
        },
        include: [...userAccessCondition.includeModels],
        order: [['displayName', 'ASC']],
      });
    } else {
      let branch_contact = await EmployeeBranch.findAll({
        raw: true,
        where: {
          status: 1,
          branchID: branchMasterID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(),
          },

          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.eq]: null } },
            { endDate: { [Sequelize.Op.gte]: new Date() } },
          ],
        },
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
        ],
      });

      let userid = [];
      for (let i = 0; i < branch_contact.length; i++) {
        userid.push(branch_contact[i].userMasterID);
      }

      let auth_details = await AuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterID,
          userMasterID: {
            [Sequelize.Op.in]: userid,
          },
          status: 1,
        },
      });

      let authorized_user = [];

      for (let j = 0; j < auth_details.length; j++) {
        authorized_user.push(auth_details[j].userMasterID);
      }

      let final1 = userid.map(String);

      let result = final1.filter((e) => !authorized_user.includes(e));

      nonAuthorized_User = await UserMaster.findAll({
        raw: true,
        where: {
          status: 1,
          userMasterID: {
            [Sequelize.Op.in]: result,
          },
          ...userAccessCondition.where,
        },
        include: [...userAccessCondition.includeModels],
        order: [['displayName', 'ASC']],
      });
    }

    // for (let item of nonAuthorized_User) {
    //   if (item['employeeJoiningDetails.employeeCode'])
    //     item.displayName =
    //       item['employeeJoiningDetails.employeeCode'] +
    //       ' - ' +
    //       item.displayName;
    // }

    return res.status(200).json({ status: 200, data: nonAuthorized_User });
  } catch (err) {
    next(err);
  }
};

exports.getAuthList = async (req, res, next) => {
  try {
    let { userMasterID } = await req.body;

    let authCount = [];

    if (userMasterID) {
      let authMaster = await authMasters.findAll({
        raw: true,
        where: {
          status: 1,
        },
      });

      for (let i = 0; i < authMaster.length; i++) {
        let temp = {
          name: authMaster[i].authorizationMasterName,
          count: 0,
          authorizationMasterID: authMaster[i].authorizationMasterID,
        };
        const userAccessCondition = accessibleRoleWiseUsers({
          userDetails: req.userDetails,
        });
        let authDetails = await AuthorizationDetails.findAll({
          where: {
            AuthorizationMasterID: authMaster[i].authorizationMasterID,
            AuthorizedByUserMasterId: {
              [Sequelize.Op.contains]: [userMasterID],
            },
            status: 1,
          },
          include: [
            {
              model: UserMaster,
              where: { status: [0, 1] },
              required: true,
              where: { ...userAccessCondition.where },
              include: [...userAccessCondition.includeModels],
            },
          ],
        });

        temp.count = authDetails.length;
        authCount.push(temp);
      }
    }

    return res.status(200).json({ status: 200, data: authCount });
  } catch (err) {
    next(err);
  }
};

exports.replaceAuth = async (req, res, next) => {
  try {
    let { findID, replaceID, criteria } = await req.body;
    let authCount = [];

    if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
      return res.status(200).json({
        status: 400,
        message: 'invalide data type of find employee or replace employee',
      });
    }

    if (findID && replaceID && criteria.length > 0) {
      let result = await sequelize.transaction(async (t) => {
        let authMaster = await authMasters.findAll({
          raw: true,
          where: {
            authorizationMasterID: criteria,
            status: 1,
          },
          transaction: t,
        });

        for (let i = 0; i < authMaster.length; i++) {
          let temp = {
            name: authMaster[i].authorizationMasterName,
            count: 0,
          };
          let authDetailsCount = await AuthorizationDetails.count({
            where: {
              AuthorizationMasterID: authMaster[i].authorizationMasterID,
              AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [findID] },
              status: 1,
            },
            transaction: t,
          });
          temp.count = authDetailsCount;
          authCount.push(temp);

          await AuthorizationDetails.update(
            {
              AuthorizedByUserMasterId: sequelize.literal(
                `ARRAY_REMOVE("AuthorizedByUserMasterId", ${findID})`,
              ),
            },
            {
              where: {
                AuthorizationMasterID: authMaster[0].authorizationMasterID,
                AuthorizedByUserMasterId: {
                  [Sequelize.Op.contains]: [findID, replaceID],
                },
                status: 1,
              },
              transaction: t,
            },
          );

          await AuthorizationDetails.update(
            {
              AuthorizedByUserMasterId: sequelize.literal(
                `ARRAY_REPLACE("AuthorizedByUserMasterId", ${findID}, ${replaceID})`,
              ),
            },
            {
              where: {
                AuthorizationMasterID: authMaster[i].authorizationMasterID,
                AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [findID] },
                status: 1,
              },
              transaction: t,
            },
          );

          if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.leave
          ) {
            // ---------------------Leave ----------------------

            await leaveAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );

            // ------------ Short Leave ----------------
            await shortLeaveAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );

            //User Work From Home

            await workFromHomeAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.expense
          ) {
            //Expense
            await expenseAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
            await expenseAdvanceRequestAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.overtime
          ) {
            //Overtime
            await overtimeAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.resignation
          ) {
            //Resignation
            await resignationAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.employeeGatePass
          ) {
            //Employee Gate Pass
            await gatePassAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.attendanceCorrection
          ) {
            //Attendance Correction
            await attendanceCorrectionAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.compensatoryOff
          ) {
            //Compensatory Off
            await coffAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.statutoryDetail
          ) {
            //StatutoryDetail For Bank
            await bankDetailRequestAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.manPowerRequisition
          ) {
            //StatutoryDetail For Bank
            await manPowerRequisitionRequestAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID == authorizationMasterTypes.tour
          ) {
            await tourRequestAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.salaryIncrement
          ) {
            await salaryIncrementRequestAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          } else if (
            authMaster[i].authorizationMasterID ==
            authorizationMasterTypes.lmsCourse
          ) {
            await courseAuthorizationReplace(
              findID,
              replaceID,
              t,
              req.userDetails,
            );
          }
        }
      });
    }

    let message =
      authCount.length > 0
        ? 'Authorization replaced successfully'
        : 'No Authorization found';

    return res
      .status(200)
      .json({ status: 200, data: authCount, message: message });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationDetailsByAuthorizedByUserMasterId = async (
  req,
  res,
  next,
) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      userMasterID,
      AuthorizationMasterID,
      searchQuery,
    } = await req.body;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const datetime = asiaKolkataDateTime(new Date()).slice(0, 10);
    const condition = {};
    condition.status = 1;
    // if (companyMasterID) {
    //   req.userDetails.accessibleCompanies = companyMasterID;
    //   condition.companyMasterID = companyMasterID;
    // }
    if (userMasterID)
      condition.AuthorizedByUserMasterId = {
        [Sequelize.Op.contains]: [userMasterID],
      };
    if (AuthorizationMasterID)
      condition.AuthorizationMasterID = AuthorizationMasterID;
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$UserMaster.firstName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$UserMaster.middleName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$UserMaster.lastName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$EmployeeJoiningDetails.employeeCode$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const order = [['AuthorizationDetailsId', 'ASC']];
    const { count, rows } = await AuthorizationDetails.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: UserMaster,
          where: { status: 1, ...userAccessCondition.where },
          attributes: userAttributes,
          required: true,
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
              required: false,
            },
            {
              model: companyMaster,
              required: true,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['designationID', 'applicableDate'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                  required: false,
                },
              ],
            },
            {
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['departmentID', 'applicableDate'],
              include: [
                {
                  model: Department,
                  as: 'department',
                  attributes: ['departmentName'],
                },
              ],
            },
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(datetime) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID', 'applicableDate'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
          ],
        },
        { model: AuthorizationCriteria },
        { model: authMasters },
      ],
      subQuery: false,
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAuth = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { AuthorizedByUserMasterId, AuthorizationMasterID } = await req.body;
    const authDetails = await AuthorizationDetails.findAll({
      where: {
        AuthorizedByUserMasterId: {
          [Sequelize.Op.contains]: [AuthorizedByUserMasterId],
        },
        AuthorizationMasterID: AuthorizationMasterID,
        status: 1,
      },
    });

    for (const item of authDetails) {
      const userDetailsids = item.AuthorizedByUserMasterId.filter(
        (e) => e != AuthorizedByUserMasterId,
      );

      await AuthorizationDetails.update(
        {
          AuthorizedByUserMasterId: userDetailsids,
          status: userDetailsids.length === 0 ? 2 : 1,
        },
        {
          where: { AuthorizationDetailsId: item.AuthorizationDetailsId },
          transaction,
        },
      );

      //for leave
      if (item.AuthorizationMasterID == authorizationMasterTypes.leave) {
        const findLeave = await UserLeave.findAll({
          where: {
            userMasterID: item.userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 1,
          },
          include: [
            { required: true, model: HrLeaveTypes, attributes: ['LeaveID'] },
          ],
        });

        for (let j = 0; j < findLeave.length; j++) {
          const type =
            findLeave[j].hrLeaveType.LeaveID == 25 ? 'Outdoor Duty' : 'Leave';
          const tableName =
            findLeave[j].hrLeaveType.LeaveID == 25
              ? 'outdoorDutyAuthorizations'
              : 'leaveAuthorizations';

          let AuthorizationCriterias = item.AuthorizationCriteriaID || null;
          let authorizationStatus;

          if (AuthorizationCriterias == 5) {
            authorizationStatus = 2;
          } else {
            authorizationStatus = 1;
          }

          let updatedata = await UserLeave.update(
            {
              authorizationStatus:
                userDetailsids.length > 0 ? authorizationStatus : 0,
              AuthorizationCriteriaID: AuthorizationCriterias,
            },
            {
              where: {
                UserLeaveApplicationID: findLeave[j].UserLeaveApplicationID,
              },
              transaction,
            },
          );

          if (AuthorizationCriterias == 5) {
            let findAuthorization = await LeaveAuthorizationRequest.findAll({
              where: {
                ReferenceID: findLeave[j].UserLeaveApplicationID,
                status: 1,
              },
            });

            const authorizationIds = findAuthorization.map(
              (e) => e.AuthorizationRequestId,
            );

            await UserInbox.destroy(
              {
                where: {
                  activityTable: tableName,
                  activityTablePK: {
                    [Sequelize.Op.in]: authorizationIds,
                  },
                },
              },
              { transaction },
            );

            await destroyLeaveAuthAndApprovedLeaveAuth(
              +findLeave[j].UserLeaveApplicationID,
              transaction,
            );
            if (userDetailsids.length > 0) {
              let insert_db_status1 = await LeaveAuthorizationRequest.create(
                {
                  TableName: 'userLeaves',
                  ReferenceID: findLeave[j].UserLeaveApplicationID,
                  userMasterID: userDetailsids[0],
                  status: 1,
                  authstatus: 2,
                  createBy: findLeave[j].createBy,

                  createByIp: findLeave[j].createByIp,
                },
                {
                  transaction,
                },
              );

              let userinfo = await UserMaster.findOne({
                where: {
                  userMasterID: findLeave[j].userMasterID,
                },
              });

              await UserInbox.create(
                {
                  activityTable: tableName,
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${
                    userinfo.displayName
                  } has applied for ${type} request from ${moment(
                    findLeave[j].FromDate,
                  ).format('DD/MM/YYYY')} to ${moment(
                    findLeave[j].ToDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: userDetailsids[0],
                  assignedBy: findLeave[j].userMasterID,
                },
                { transaction },
              );

              const notification = {
                title: type,
                body: userinfo.displayName + ` requested for ${type} .`,
              };
              const data = {
                screen:
                  type == 'Outdoor Duty' ? 'outDoorDutyAuth' : 'leaveauth',
              };
              await sendNotification(userDetailsids[0], notification, data);
            }
          } else {
            let findAuthorization = await LeaveAuthorizationRequest.findAll({
              where: {
                ReferenceID: findLeave[j].UserLeaveApplicationID,
                status: 1,
              },
            });

            const authorizationIds = findAuthorization.map(
              (e) => e.AuthorizationRequestId,
            );

            await UserInbox.destroy(
              {
                where: {
                  activityTable: tableName,
                  activityTablePK: {
                    [Sequelize.Op.in]: authorizationIds,
                  },
                },
              },
              { transaction },
            );

            await destroyLeaveAuthAndApprovedLeaveAuth(
              +findLeave[j].UserLeaveApplicationID,
              transaction,
            );
          }

          for (let k = 0; k < userDetailsids.length; k++) {
            let insert_db_status1 = await LeaveAuthorizationRequest.create(
              {
                TableName: 'userLeaves',
                ReferenceID: findLeave[j].UserLeaveApplicationID,
                userMasterID: userDetailsids[k],
                status: 1,
                authstatus: 2,
                createBy: findLeave[j].createBy,
                createByIp: findLeave[j].createByIp,
              },
              {
                transaction,
              },
            );

            let userinfo = await UserMaster.findOne({
              where: {
                // userMasterID:response[i].createBy
                userMasterID: findLeave[j].userMasterID,
              },
            });

            await UserInbox.create(
              {
                activityTable: tableName,
                activityTablePK:
                  insert_db_status1.toJSON().AuthorizationRequestId,
                message: `${
                  userinfo.displayName
                } has applied for ${type} request from ${moment(
                  findLeave[j].FromDate,
                ).format('DD/MM/YYYY')} to ${moment(findLeave[j].ToDate).format(
                  'DD/MM/YYYY',
                )}`,
                assignedTo: userDetailsids[k],
                assignedBy: findLeave[j].userMasterID,
              },
              { transaction },
            );

            const notification = {
              title: type,
              body: userinfo.displayName + ` requested for ${type}.`,
            };
            const data = {
              screen: type == 'Outdoor Duty' ? 'outDoorDutyAuth' : 'leaveauth',
            };
            await sendNotification(userDetailsids[k], notification, data);
          }
        }

        //  --------------------------Short leave -----------------------

        const shortLeaveData = await UserShortLeave.findAll({
          where: {
            userMasterID: item.userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
          include: [
            {
              required: false,
              model: ShortLeaveAuthorization,
              attributes: ['id'],
            },
          ],
          transaction,
        });

        const userShortLeaveIds = shortLeaveData.map((e) => e.userShortLeaveId);

        const authorizationIds_shortLeave = shortLeaveData
          .flatMap((item) => item.shortLeaveAuthorizations)
          .map((e) => e.id);

        // Delete All UserInbox
        await UserInbox.destroy({
          where: {
            activityTable: ShortLeaveAuthorization.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: authorizationIds_shortLeave,
            },
          },
          transaction,
        });

        // Delete Short leave authorization

        await ShortLeaveAuthorization.destroy({
          where: {
            referenceId: {
              [Sequelize.Op.in]: userShortLeaveIds,
            },
          },
          hooks: false,
          transaction,
        });

        // update short leave

        await UserShortLeave.update(
          {
            authorizationStatus: 0,
          },
          {
            where: {
              userShortLeaveId: {
                [Sequelize.Op.in]: userShortLeaveIds,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction,
          },
        );
      }

      //for expense
      else if (item.AuthorizationMasterID == authorizationMasterTypes.expense) {
        let expensedata = await executeQuery(
          `select ut."userExpenseTransactionID",ut."expenseAmount",ut."userExpenseID",ut."authorizationStatus",ue."userMasterID" from "userExpenseTransactions" as ut join "userExpenses" as ue on ut."userExpenseID"=ue."userExpenseID" where ue."userMasterID"=` +
            ':userMasterID' +
            ` and ut."authorizationStatus" IN (1,2)`,
          {
            replacements: { userMasterID: item.userMasterID },
          },
        );
        for (let n = 0; n < expensedata.length; n++) {
          let findAuthorization = await ExpenseAuthorizationRequest.findAll({
            where: {
              ReferenceID: expensedata[n].userExpenseTransactionID,
              status: 1,
            },
          });

          const authorizationIds = findAuthorization.map(
            (e) => e.AuthorizationRequestId,
          );

          await UserInbox.destroy(
            {
              where: {
                activityTable: UserExpense.getTableName(),
                activityTablePK: {
                  [Sequelize.Op.in]: authorizationIds,
                },
              },
            },
            { transaction },
          );
          let deleteauthdata = await ExpenseAuthorizationRequest.destroy(
            {
              where: { ReferenceID: expensedata[n].userExpenseTransactionID },
            },
            {
              transaction,
            },
          );

          const userdata = await UserMaster.findOne({
            raw: true,
            where: {
              userMasterID: expensedata[n].userMasterID,
            },
          });

          let AuthorizationCriterias = item.AuthorizationCriteriaID;

          let authorizationStatus;
          if (AuthorizationCriterias == 5) {
            authorizationStatus = 2;
          } else {
            authorizationStatus = 1;
          }
          const findExpenseTransation = await UserExpenseTransaction.findOne({
            where: {
              userExpenseTransactionID: expensedata[n].userExpenseTransactionID,
            },
            transaction,
          });
          let update_expenseStatus = await UserExpenseTransaction.update(
            {
              authorizationStatus:
                userDetailsids.length > 0 ? authorizationStatus : 0,
              updateBy: req.body.createBy,
              AuthorizationCriteriaID:
                userDetailsids.length > 0
                  ? findExpenseTransation?.AuthorizationCriteriaID
                  : null,
            },
            {
              where: {
                userExpenseTransactionID:
                  expensedata[n].userExpenseTransactionID,
              },
              transaction,
            },
          );

          if (AuthorizationCriterias == 5) {
            if (userDetailsids.length > 0) {
              let insert_db_status1 = await ExpenseAuthorizationRequest.create(
                {
                  ReferenceID: expensedata[n].userExpenseTransactionID,
                  userMasterID: userDetailsids[0],
                  status: 1,
                  authstatus: 2,
                  createBy: req.body.userMasterID,
                },
                { transaction },
              );

              await UserInbox.create(
                {
                  activityTable: UserExpense.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${userdata.displayName} has applied for Expense of ${expensedata[n].expenseAmount}`,
                  assignedTo: userDetailsids[0],
                  assignedBy: userdata.userMasterID,
                },

                { transaction },
              );
            }
          } else {
            for (let i = 0; i < userDetailsids.length; i++) {
              let insert_db_status1 = await ExpenseAuthorizationRequest.create(
                {
                  ReferenceID: expensedata[n].userExpenseTransactionID,
                  userMasterID: userDetailsids[i],
                  status: 1,
                  authstatus: 2,
                  createBy: req.body.userMasterID,
                },
                { transaction },
              );

              await UserInbox.create(
                {
                  activityTable: UserExpense.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${userdata.displayName} has applied for Expense of ${expensedata[n].expenseAmount}`,
                  assignedTo: userDetailsids[i],
                  assignedBy: userdata.userMasterID,
                },
                { transaction },
              );
            }
          }
          // }
        }
      }

      // //for overtime
      else if (
        item.AuthorizationMasterID == authorizationMasterTypes.overtime
      ) {
        let find_Overtime = await OvertimeCalculation.findAll({
          where: {
            UserMasterID: item.userMasterID,
            AuthorizationRequired: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
        });

        for (let j = 0; j < find_Overtime.length; j++) {
          let AuthorizationCriterias = item.AuthorizationCriteriaID;

          let authorizationStatus;

          if (AuthorizationCriterias == 5) {
            authorizationStatus = 2;
          } else {
            authorizationStatus = 1;
          }

          let update_overtimeAuthorizationStatus =
            await OvertimeCalculation.update(
              {
                AuthorizationRequired: authorizationStatus,
                updateBy: req.body.createBy,
              },
              {
                where: { OverTimeID: find_Overtime[j].OverTimeID },
                transaction,
              },
            );

          if (AuthorizationCriterias == 5) {
            let findAuthorization = await OvertimeAuthorization.findAll({
              where: {
                ReferenceID: find_Overtime[j].OverTimeID,
                status: 1,
              },
            });

            let delete_record = await OvertimeAuthorization.destroy(
              {
                where: {
                  ReferenceID: find_Overtime[j].OverTimeID,
                  status: 1,
                },
              },
              { transaction },
            );
            if (userDetailsids.length > 0) {
              let insert_db_status1 = await OvertimeAuthorization.create(
                {
                  ReferenceID: find_Overtime[j].OverTimeID,
                  userMasterID: userDetailsids[0],
                  status: 1,
                  authstatus: 2,
                  createBy: req.body.createBy,
                  createByIp: req.body.createByIp,
                },
                { transaction },
              );
            }
          } else {
            let findAuthorization = await OvertimeAuthorization.findAll({
              where: {
                ReferenceID: find_Overtime[j].OverTimeID,
                status: 1,
              },
            });

            if (findAuthorization.length > 0) {
              let delete_record = await OvertimeAuthorization.destroy(
                {
                  where: {
                    ReferenceID: find_Overtime[j].OverTimeID,
                    status: 1,
                  },
                },
                {
                  transaction,
                },
              );
            }

            for (let k = 0; k < userDetailsids.length; k++) {
              let insert_db_status1 = await OvertimeAuthorization.create(
                {
                  ReferenceID: find_Overtime[j].OverTimeID,
                  userMasterID: userDetailsids[k],
                  status: 1,
                  authstatus: 2,
                  createBy: req.body.createBy,
                  createByIp: req.body.createByIp,
                },
                { transaction },
              );
            }
          }
          // }
        }
      }

      //Resignation
      else if (
        item.AuthorizationMasterID == authorizationMasterTypes.resignation
      ) {
        let find_Resignation = await UserResignation.findAll({
          where: {
            userMasterID: item.userMasterID,
            authorizationstatus: {
              [Sequelize.Op.in]: [1, 2],
            },
          },
        });

        if (find_Resignation.length > 0) {
          let AuthorizationCriterias = item.AuthorizationCriteriaID;

          let authorizationStatus;

          if (AuthorizationCriterias == 5) {
            authorizationStatus = 2;
          } else {
            authorizationStatus = 1;
          }

          for (let j = 0; j < find_Resignation.length; j++) {
            let update_resignationAuthorizationStatus =
              await UserResignation.update(
                {
                  authorizationstatus:
                    userDetailsids.length > 0 ? authorizationStatus : 0,
                  updateBy: req.body.createBy,
                },
                {
                  where: { resignationID: find_Resignation[j].resignationID },
                  transaction,
                },
              );

            if (AuthorizationCriterias == 5) {
              let findAuthorization = await ResignationAuth.findAll({
                where: {
                  ReferenceID: find_Resignation[j].resignationID,
                  status: 1,
                },
              });

              if (findAuthorization.length > 0) {
                let delete_record = await ResignationAuth.destroy({
                  where: {
                    ReferenceID: find_Resignation[j].resignationID,
                    status: 1,
                  },
                });
                if (userDetailsids.length > 0) {
                  await ResignationAuth.create(
                    {
                      ReferenceID: find_Resignation[j].resignationID,
                      userMasterID: userDetailsids[0],
                      status: 1,
                      authstatus: 2,
                      createBy: req.body.createBy,
                      createByIp: req.body.createByIp,
                    },
                    { transaction },
                  );
                }
              }
            } else {
              let findAuthorization = await ResignationAuth.findAll({
                where: {
                  ReferenceID: find_Resignation[j].resignationID,
                  status: 1,
                },
              });

              if (findAuthorization.length > 0) {
                let delete_record = await ResignationAuth.destroy({
                  where: {
                    ReferenceID: find_Resignation[j].resignationID,
                    status: 1,
                  },
                });
              }

              for (let k = 0; k < userDetailsids.length; k++) {
                let insert_db_status1 = await ResignationAuth.create(
                  {
                    ReferenceID: find_Resignation[j].resignationID,
                    userMasterID: userDetailsids[k],
                    status: 1,
                    authstatus: 2,
                    createBy: req.body.createBy,
                    createByIp: req.body.createByIp,
                  },
                  { transaction },
                );
              }
            }
          }
        }
      }
      //Employee Gate Pass
      else if (
        item.AuthorizationMasterID == authorizationMasterTypes.employeeGatePass
      ) {
        let findgatepass = await EmployeeGatepass.findAll({
          where: {
            userMasterId: item.userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 'Pending',
          },
        });

        for (let j = 0; j < findgatepass.length; j++) {
          let authorizationStatus;

          if (item.AuthorizationCriteriaID == 5) {
            authorizationStatus = 2;
          } else {
            authorizationStatus = 1;
          }

          await EmployeeGatepass.update(
            {
              authorizationStatus:
                userDetailsids.length > 0 ? authorizationStatus : 0,
              updateBy: req.body.createBy,
              updateByIp: req.body.createByIp,
            },
            {
              where: {
                id: findgatepass[j].id,
              },
              transaction,
            },
          );

          if (authorizationStatus == 2) {
            let findAuthorization = await GatePassAuthorizationRequest.findAll({
              where: {
                ReferenceID: findgatepass[j].id,
                status: 1,
              },
            });

            const authorizationIds = findAuthorization.map(
              (e) => e.AuthorizationRequestId,
            );

            await UserInbox.destroy(
              {
                where: {
                  activityTable: GatePassAuthorizationRequest.getTableName(),
                  activityTablePK: {
                    [Sequelize.Op.in]: authorizationIds,
                  },
                },
              },
              { transaction },
            );

            await GatePassAuthorizationRequest.destroy(
              {
                where: {
                  ReferenceID: findgatepass[j].id,
                  status: 1,
                },
              },
              {
                transaction,
              },
            );

            if (userDetailsids.length > 0) {
              let insert_db_status1 = await GatePassAuthorizationRequest.create(
                {
                  TableName: 'EmployeeGatePass',
                  ReferenceID: findgatepass[j].id,
                  userMasterID: userDetailsids[0],
                  status: 1,
                  authstatus: 2,
                  createBy: findgatepass[j].createBy,

                  createByIp: findgatepass[j].createByIp,
                },
                {
                  transaction,
                },
              );

              let userinfo = await UserMaster.findOne({
                where: {
                  userMasterID: findgatepass[j].userMasterId,
                },
              });

              await UserInbox.create(
                {
                  activityTable: GatePassAuthorizationRequest.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${
                    userinfo.displayName
                  } has applied for GatePass request ${moment(
                    findgatepass[j].date,
                  ).format('DD/MM/YYYY')} `,
                  assignedTo: userDetailsids[0],
                  assignedBy: findgatepass[j].userMasterId,
                },
                { transaction },
              );

              const notification = {
                title: 'GatePass',
                body: userinfo.displayName + ' requested for GatePass.',
              };
              const data = {
                screen: 'gatepassauth',
              };
              await sendNotification(userDetailsids[0], notification, data);
            }
          } else {
            let findAuthorization = await GatePassAuthorizationRequest.findAll({
              where: {
                ReferenceID: findgatepass[j].id,
                status: 1,
              },
            });

            const authorizationIds = findAuthorization.map(
              (e) => e.AuthorizationRequestId,
            );

            await UserInbox.destroy(
              {
                where: {
                  activityTable: GatePassAuthorizationRequest.getTableName(),
                  activityTablePK: {
                    [Sequelize.Op.in]: authorizationIds,
                  },
                },
              },
              { transaction },
            );

            await GatePassAuthorizationRequest.destroy(
              {
                where: {
                  ReferenceID: findgatepass[j].id,
                  status: 1,
                },
              },
              { transaction },
            );

            for (let k = 0; k < userDetailsids.length; k++) {
              let insert_db_status1 = await GatePassAuthorizationRequest.create(
                {
                  TableName: 'EmployeeGatePass',
                  ReferenceID: findgatepass[j].id,
                  userMasterID: userDetailsids[k],
                  status: 1,
                  authstatus: 2,
                  createBy: findgatepass[j].createBy,
                  createByIp: findgatepass[j].createByIp,
                },
                {
                  transaction,
                },
              );

              let userinfo = await UserMaster.findOne({
                where: {
                  userMasterID: findgatepass[j].userMasterId,
                },
              });

              await UserInbox.create(
                {
                  activityTable: GatePassAuthorizationRequest.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${
                    userinfo.displayName
                  } has applied for GatePass request ${moment(
                    findgatepass[j].date,
                  ).format('DD/MM/YYYY')} `,
                  assignedTo: userDetailsids[k],
                  assignedBy: findgatepass[j].userMasterID,
                },
                { transaction },
              );

              const notification = {
                title: 'GatePass',
                body: userinfo.displayName + ' requested for GatePass.',
              };
              const data = {
                screen: 'gatepassauth',
              };
              await sendNotification(userDetailsids[k], notification, data);
            }
          }
        }
      }
      //Coff
      else if (
        item.AuthorizationMasterID == authorizationMasterTypes.compensatoryOff
      ) {
        const findcoff = await coffMaster.findAll({
          where: {
            userMasterID: item.userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 1,
          },
        });

        const authorizationStatus = item.AuthorizationCriteriaID == 5 ? 2 : 1;

        const AllCoffMasterIDs = findcoff.map((e) => e.coffMasterID);

        await coffMaster.update(
          {
            authorizationStatus:
              userDetailsids.length > 0 ? authorizationStatus : 0,
            updateBy: req.body.createBy,
            updateByIp: req.body.createByIp,
          },
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
            },
            transaction,
          },
        );

        const userinfo = await UserMaster.findOne({
          where: {
            userMasterID: item.userMasterID,
          },
          transaction,
        });

        const findAllAuthorization = await CompensatoryOffAuthorization.findAll(
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
              status: 1,
            },
          },
        );

        const notification = {
          title: 'Compensatory Off',
          body: userinfo.displayName + ' requested for Compensatory Off.',
        };
        const data = {
          screen: 'coffauth',
        };

        for (let j = 0; j < findcoff.length; j++) {
          const authorizationIds = findAllAuthorization
            .filter((e) => e.coffMasterID == findcoff[j].coffMasterID)
            .map((a) => a.CompensatoryOffAuthorizationID);

          // Delete All UserInbox
          await UserInbox.destroy(
            {
              where: {
                activityTable: CompensatoryOffAuthorization.getTableName(),
                activityTablePK: {
                  [Sequelize.Op.in]: authorizationIds,
                },
              },
            },
            { transaction },
          );

          // Delete All Auth Data
          if (authorizationIds.length > 0) {
            await CompensatoryOffAuthorization.destroy(
              {
                where: {
                  coffMasterID: findcoff[j].coffMasterID,
                  status: 1,
                },
              },
              {
                Hooks: false,
                transaction,
              },
            );
          }

          if (authorizationStatus == 2) {
            if (userDetailsids.length > 0) {
              const insert_db_status1 =
                await CompensatoryOffAuthorization.create(
                  {
                    TableName: 'coffMaster',
                    coffMasterID: findcoff[j].coffMasterID,
                    userMasterID: userDetailsids[0],
                    status: 1,
                    authstatus: 2,
                  },
                  { user: req.userDetails, transaction },
                );

              await UserInbox.create(
                {
                  activityTable: CompensatoryOffAuthorization.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().CompensatoryOffAuthorizationID,
                  message: `${
                    userinfo.displayName
                  } has requested for Compensatory Off for ${moment(
                    findcoff[j].LeaveCreatedDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: userDetailsids[0],
                  assignedBy: findcoff[j].userMasterID,
                },
                { transaction },
              );

              await sendNotification(userDetailsids[0], notification, data);
            }
          } else {
            for (let k = 0; k < userDetailsids.length; k++) {
              let insert_db_status1 = await CompensatoryOffAuthorization.create(
                {
                  TableName: 'coffMaster',
                  coffMasterID: findcoff[j].coffMasterID,
                  userMasterID: userDetailsids[k],
                  status: 1,
                  authstatus: 2,
                },
                {
                  user: req.userDetails,
                  transaction,
                },
              );

              await UserInbox.create(
                {
                  activityTable: CompensatoryOffAuthorization.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().CompensatoryOffAuthorizationID,
                  message: `${
                    userinfo.displayName
                  } has requested for Compensatory Off for ${moment(
                    findcoff[j].LeaveCreatedDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: userDetailsids[k],
                  assignedBy: findcoff[j].userMasterID,
                },
                { transaction },
              );

              await sendNotification(userDetailsids[k], notification, data);
            }
          }
        }
      }
      // Course Authorization
      else if (
        item.AuthorizationMasterID == authorizationMasterTypes.lmsCourse
      ) {
        const findCourses = await Course.findAll({
          where: {
            createdBy: item.userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [1, 2],
            },
            status: 1,
          },
          transaction,
        });

        const authorizationStatus = item.AuthorizationCriteriaID == 5 ? 2 : 1;
        const allCourseIDs = findCourses.map((e) => e.id);

        await Course.update(
          {
            authorizationStatus:
              userDetailsids.length > 0 ? authorizationStatus : 0,
            updateBy: req.body.createBy || req.userDetails?.userMasterId,
            updateByIp: req.body.createByIp || req.userDetails?.userIpAddress,
          },
          {
            where: {
              id: {
                [Sequelize.Op.in]: allCourseIDs,
              },
            },
            transaction,
          },
        );

        const userinfo = await UserMaster.findOne({
          where: {
            userMasterID: item.userMasterID,
          },
          transaction,
        });

        const findAllAuthorization = await CourseAuthorizationRequest.findAll({
          where: {
            ReferenceID: {
              [Sequelize.Op.in]: allCourseIDs,
            },
            status: 1,
          },
          transaction,
        });

        const notification = {
          title: 'Course Authorization',
          body: (userinfo?.displayName || 'User') + ' requested for Course Authorization.',
        };
        const data = {
          screen: 'courseauth',
        };

        for (let j = 0; j < findCourses.length; j++) {
          const authorizationIds = findAllAuthorization
            .filter((e) => e.ReferenceID == findCourses[j].id)
            .map((a) => a.AuthorizationRequestId);

          // Delete All UserInbox
          await UserInbox.destroy(
            {
              where: {
                activityTable: CourseAuthorizationRequest.getTableName(),
                activityTablePK: {
                  [Sequelize.Op.in]: authorizationIds,
                },
              },
            },
            { transaction },
          );

          // Destroy All CourseAuthorizationRequest
          await CourseAuthorizationRequest.destroy({
            where: {
              AuthorizationRequestId: {
                [Sequelize.Op.in]: authorizationIds,
              },
            },
            user: req.userDetails,
            individualHooks: true,
            transaction,
          });

          if (item.AuthorizationCriteriaID == 5) {
            if (userDetailsids.length > 0) {
              let insert_db_status1 = await CourseAuthorizationRequest.create(
                {
                  TableName: 'courses',
                  ReferenceID: findCourses[j].id,
                  userMasterID: userDetailsids[0],
                  status: 1,
                  authstatus: 2,
                  createBy: findCourses[j].createdBy,
                },
                {
                  user: req.userDetails,
                  transaction,
                },
              );

              await UserInbox.create(
                {
                  activityTable: CourseAuthorizationRequest.getTableName(),
                  activityTablePK: insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${userinfo?.displayName || 'User'} has requested for Course Authorization for '${findCourses[j].title}'`,
                  assignedTo: userDetailsids[0],
                  assignedBy: findCourses[j].createdBy,
                },
                { transaction },
              );

              if (typeof sendNotification === 'function') {
                await sendNotification(userDetailsids[0], notification, data);
              }
            }
          } else {
            for (let k = 0; k < userDetailsids.length; k++) {
              let insert_db_status1 = await CourseAuthorizationRequest.create(
                {
                  TableName: 'courses',
                  ReferenceID: findCourses[j].id,
                  userMasterID: userDetailsids[k],
                  status: 1,
                  authstatus: 2,
                  createBy: findCourses[j].createdBy,
                },
                {
                  user: req.userDetails,
                  transaction,
                },
              );

              await UserInbox.create(
                {
                  activityTable: CourseAuthorizationRequest.getTableName(),
                  activityTablePK: insert_db_status1.toJSON().AuthorizationRequestId,
                  message: `${userinfo?.displayName || 'User'} has requested for Course Authorization for '${findCourses[j].title}'`,
                  assignedTo: userDetailsids[k],
                  assignedBy: findCourses[j].createdBy,
                },
                { transaction },
              );

              if (typeof sendNotification === 'function') {
                await sendNotification(userDetailsids[k], notification, data);
              }
            }
          }
        }
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Authorization Criteria'),
      // data: authDetails,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAuthorizationedUserForDropDown = async (req, res, next) => {
  try {
    const { companyMasterID, AuthorizationMasterID, branchMasterID } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const datetime = asiaKolkataDateTime(new Date()).slice(0, 10);
    const authorizationDetailsCondition = { status: 1 };

    authorizationDetailsCondition.AuthorizedByUserMasterId = {
      [Sequelize.Op.contains]: [authUserMasterID],
    };
    authorizationDetailsCondition.AuthorizationMasterID = AuthorizationMasterID;

    const userCondition = {
      status: 1,
      companyMasterId: companyMasterID,
    };
    const order = [['displayName', 'ASC']];
    const isBranchFilter = Array.isArray(branchMasterID)
      ? branchMasterID.length > 0
      : branchMasterID != null;

    const branchWhere = {
      status: 1,
      applicableDate: {
        [Sequelize.Op.lte]: new Date(datetime),
      },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: new Date(datetime) } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };

    if (isBranchFilter) {
      branchWhere.branchID = Array.isArray(branchMasterID)
        ? { [Sequelize.Op.in]: branchMasterID }
        : branchMasterID;
    }
    const findAuthorizedUser = await UserMaster.findAll({
      distinct: true,
      subQuery: false,
      where: userCondition,
      include: [
        {
          required: true,
          model: AuthorizationDetails,
          where: authorizationDetailsCondition,
          attributes: [],
        },
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: [],
        },
        {
          required: isBranchFilter,
          model: EmployeeBranch,
          as: 'emp_branch',
          where: branchWhere,
          attributes: [],
        },
      ],
      order,
      attributes: [
        // normal column
        'userMasterID',
        'displayName',
        'userNumber',
        [Sequelize.literal(`"emp_join"."employeeCode"`), 'employeeCode'],
        // displayName - userNumber
        [
          Sequelize.literal(
            `"userMaster"."displayName" || ' - ' || "userMaster"."userNumber"`,
          ),
          'displayNameWithNumber',
        ],

        // displayName ( employeeCode )
        [
          Sequelize.literal(`
              "userMaster"."displayName" ||
              CASE
                WHEN "emp_join"."employeeCode" IS NOT NULL
                AND "emp_join"."employeeCode" != ''
                THEN ' ( ' || "emp_join"."employeeCode" || ' )'
                ELSE ''
              END
            `),
          'displayNameWithEmployeeCode',
        ],

        // displayName ( employeeCode ) - userNumber
        [
          Sequelize.literal(`
              "userMaster"."displayName" ||
              CASE
                WHEN "emp_join"."employeeCode" IS NOT NULL
                AND "emp_join"."employeeCode" != ''
                THEN ' ( ' || "emp_join"."employeeCode" || ' )'
                ELSE ''
              END || ' - ' || "userMaster"."userNumber"
            `),
          'displayNameWithCodeAndNumber',
        ],
      ],
    });

    return res.status(200).json({
      status: 200,
      data: findAuthorizedUser,
    });
  } catch (err) {
    next(err);
  }
};
