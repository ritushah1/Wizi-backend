const Sequelize = require('sequelize');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const coffMaster = require('../models/coffMaster');
const userMaster = require('../models/userMaster');
const hrLeaveBalance = require('../models/hrLeaveBalance');
const attendanceTransaction = require('../models/attendanceTransaction');
const companyMaster = require('../models/companyMaster');

const hrLeaveTypes = require('../models/hrLeaveTypes');

const {
  asiaKolkataDateTime,
  getDateByAddingDays,
} = require('../utils/commonUtilFunctions');

const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const UserInbox = require('../models/UserInbox');
const UserMaster = require('../models/userMaster');
const { sendNotification } = require('../utils/commonUtilFunctions');
const CompensatoryOffAuthorization = require('../models/compensatoryOffAuthorization');
const moment = require('moment');
const { userAttributes } = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');

const { generateExcel } = require('../utils/exportData');
const { formatDateTime } = require('../utils/commonUtilFunctions');
const { authorizationMasterTypes } = require('../utils/dbUtils');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getAllCoff = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      limit,
      page,
      searchQuery,
      userMasterID,
      fromdate,
      todate,
      authorizationStatus,
      exportData,
    } = await req.body;

    if(req.userDetails.isMyUserDetails){
      userMasterID=[req.userDetails.userMasterId]
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    const condition = { status: 1 };
    if (!exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [
      [Sequelize.literal(`"userMaster.displayName"`), 'ASC'],
      ['LeaveCreatedDate', 'DESC'],
    ];

    if (companyMasterID)
      condition['$userMaster.companyMasterId$'] = companyMasterID;
    if (userMasterID && userMasterID.length > 0)
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };

    if (authorizationStatus && authorizationStatus.length > 0)
      condition.authorizationStatus = authorizationStatus;

    if (fromdate && todate)
      condition.LeaveCreatedDate = {
        [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const coff_master = await coffMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: userMaster,
          required: true,
          where: { ...userAccessCondition.where },
          attributes: [
            'userMasterID',
            'userNumber',
            'displayName',
            'companyMasterId',
          ],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
            {
              required: false,
              model: attendanceTransaction,
              where: Sequelize.where(
                Sequelize.col(
                  'userMaster->attendanceTransactions.AttendanceDate',
                ),
                '=',
                Sequelize.col('coffMaster.LeaveCreatedDate'),
              ),
              attributes: ['InDatetime', 'OutDateTime'],
            },
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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

              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              separate: true,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                },
              ],
            },
          ],
        },
        {
          model: userMaster,
          as: 'createdByUser',
          attributes: ['displayName'],
        },
        {
          model: CompensatoryOffAuthorization,
          attributes: ['authstatus', 'userMasterID', 'remarks'],
          include: [
            {
              model: userMaster,
              as: 'authorizedPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    if (exportData) {
      const data = coff_master.rows.map((row) => {
        let authrizationNameStatus = '';

        if (row.compensatoryOffAuthorizations.length > 0) {
          authrizationNameStatus = row.compensatoryOffAuthorizations
            .map((auth) => {
              const authorizedPerson = auth.authorizedPerson
                ? auth.authorizedPerson.displayName
                : '';

              const authStatus =
                auth.authstatus === 2
                  ? 'Pending'
                  : auth.authstatus === 1
                    ? 'Accepted'
                    : 'Rejected';

              return authorizedPerson
                ? `${authorizedPerson} -- ${authStatus}`
                : '';
            })
            .join(', ');
        }

        const attendance = row.userMaster.attendanceTransactions[0];
        const inTime =
          attendance && attendance.InDatetime
            ? formatDateTime(attendance.InDatetime)
            : '';
        const outTime =
          attendance && attendance.OutDateTime
            ? formatDateTime(attendance.OutDateTime)
            : '';

        return {
          'Employee Code':
            row.userMaster.employeeJoiningDetails.length > 0 &&
            row.userMaster.employeeJoiningDetails[0].employeeCode
              ? row.userMaster.employeeJoiningDetails[0].employeeCode
              : '',

          'Employee Name': row.userMaster.displayName,

          'Employee Number': row.userMaster.userNumber,

          Company:
            row.userMaster.companyMaster &&
            row.userMaster.companyMaster.companyName
              ? row.userMaster.companyMaster.companyName
              : '',

          Branch:
            row.userMaster.employeeBranches.length > 0 &&
            row.userMaster.employeeBranches[0].branchMaster.branchName
              ? row.userMaster.employeeBranches[0].branchMaster.branchName
              : '',

          Department:
            row.userMaster.employeeDepartments.length > 0 &&
            row.userMaster.employeeDepartments[0].department.departmentName
              ? row.userMaster.employeeDepartments[0].department.departmentName
              : '',

          Designation:
            row.userMaster.employeeDesignations.length > 0 &&
            row.userMaster.employeeDesignations[0].designation.designationName
              ? row.userMaster.employeeDesignations[0].designation
                  .designationName
              : '',

          Balance: row.LeaveAddNew,

          Status:
            row.authorizationStatus === 3
              ? row.isAutoApproved
                ? 'Auto Approved'
                : 'Accepted'
              : row.authorizationStatus === 4
                ? 'Rejected'
                : 'Pending',

          'Compensatory Off Created Date': row.LeaveCreatedDate
            ? row.LeaveCreatedDate.slice(8, 10) +
              '-' +
              row.LeaveCreatedDate.slice(5, 7) +
              '-' +
              row.LeaveCreatedDate.slice(0, 4)
            : '',

          'Compensatory Off Expiry Date': row.expiryDate
            ? String(row.expiryDate).split('-').reverse().join('-')
            : '',

          'In Time': inTime,

          'Out Time': outTime,

          'Auth Criteria':
            row.userMaster.authorizationDetails.length > 0 &&
            row.userMaster.authorizationDetails[0].AuthorizationCriteriaMaster
              .AuthorizationCriteria
              ? row.userMaster.authorizationDetails[0]
                  .AuthorizationCriteriaMaster.AuthorizationCriteria
              : '',

          Authorization: authrizationNameStatus,

          'Created By': row.createdByUser ? row.createdByUser.displayName : '',
        };
      });

      await generateExcel(data, 'Compensatory Off', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: coff_master.rows,
      totalcount: coff_master.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteCoff = async (req, res, next) => {
  try {
    let { coffMasterID, updateby } = await req.body;

    await coffMaster.update(
      { status: 2, updateBy: updateby },
      { where: { coffMasterID: coffMasterID } },
    );

    return res.status(200).json({ status: 200, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

exports.postAddHrLeave = async (req, res, next) => {
  try {
    let {
      coffMasterID,
      LeaveTranId,
      userMasterID,
      LeaveCreatedDate,
      YearMM,
      LeaveAddNew,
      createBy,
      createByIp,
      updateBy,
    } = await req.body;
    let insert_db_status;
    await sequelize.transaction(async (t) => {
      insert_db_status = await hrLeaveBalance.create(
        {
          LeaveTranId,
          userMasterID,
          LeaveCreatedDate,
          YearMM,
          LeaveAddNew,
          createBy,
          createByIp,
          updateBy,
        },
        { transaction: t },
      );

      await coffMaster.update(
        {
          LeaveBalTranId: insert_db_status.LeaveBalTranId,
          status: 2,
          updateBy: updateBy,
        },
        {
          where: { coffMasterID: coffMasterID },
          transaction: t,
        },
      );
    });
    return res
      .status(200)
      .json({ status: 200, message: 'Added', data: insert_db_status });
  } catch (err) {
    next(err);
  }
};

exports.addCoffWithAuthorization = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      companyMasterID,
      userMasterID,
      LeaveCreatedDate,
      YearMM,
      LeaveAddNew,
    } = await req.body;

    const authorizationdetails = await FormAuthorizationDetails.findOne(
      {
        where: {
          AuthorizationMasterID: authorizationMasterTypes.compensatoryOff, // Compensatory Off
          userMasterID,
          status: 1,
        },
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      },
      { transaction },
    );

    const authorizationStatus =
      authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
        ? authorizationdetails.AuthorizationCriteriaMaster
            .AuthorizationCriteria == 'Sequeance No'
          ? 2
          : 1
        : 0;
    let trans = await hrLeaveTypes.findOne(
      {
        where: {
          LeaveID: 6,
          companyMasterID: companyMasterID,
        },
      },
      { transaction },
    );
    let LeaveTranId = trans.LeaveTranId;

    const emp_LeavePolicy = await empLeavePolicy.findOne({
      where: {
        userMasterID,
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: new Date(LeaveCreatedDate) },
        [Sequelize.Op.or]: [
          {
            endDate: { [Sequelize.Op.gte]: new Date(LeaveCreatedDate) },
          },
          {
            endDate: { [Sequelize.Op.eq]: null },
          },
        ],
      },
    });

    let expiryDate = null;

    if (emp_LeavePolicy) {
      const coffPolicy = await employeeLeavePolicy.findOne({
        where: {
          id: emp_LeavePolicy.employeeLeavePolicyID,
          leaveId: 6,
        },
        attributes: ['expiryDays'],
      });

      if (coffPolicy?.expiryDays)
        expiryDate = getDateByAddingDays(
          LeaveCreatedDate,
          coffPolicy?.expiryDays || 0,
        );
    }

    const requestData = await coffMaster.create(
      {
        LeaveTranId: LeaveTranId,
        userMasterID,
        LeaveCreatedDate,
        YearMM,
        LeaveAddNew,
        authorizationStatus,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        expiryDate,
      },
      { transaction },
    );

    // if authorization is set
    if (authorizationStatus != 0) {
      // user Details
      const userDetails = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID,
        },
      });

      if (!userDetails) throw new Error('User not found!');

      // For Sequence No
      if (authorizationStatus == 2) {
        const authorizationData = await CompensatoryOffAuthorization.create(
          {
            TableName: 'Compensatory Off',
            coffMasterID: requestData.coffMasterID,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            authstatus: 2,
          },
          { user: req.userDetails, transaction },
        );

        // Create UserInbox
        await UserInbox.create(
          {
            activityTable: CompensatoryOffAuthorization.getTableName(),
            activityTablePK:
              authorizationData.toJSON().CompensatoryOffAuthorizationID,
            message: `${
              userDetails.displayName
            } has requested a Compensatory Off for ${moment(
              LeaveCreatedDate,
            ).format('DD/MM/YYYY')}.`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          },
          { user: req.userDetails, transaction },
        );

        const notification = {
          title: 'Compensatory Off',
          body: userDetails.displayName + ' requested for a Compensatory Off.',
        };
        const data = {
          screen: 'coffauth',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };
        // send Notification
        await sendNotification(
          authorizationData.userMasterID,
          notification,
          data,
        );
      } else {
        // For Any
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const authorizationData = await CompensatoryOffAuthorization.create(
            {
              TableName: 'Compensatory Off',
              coffMasterID: requestData.coffMasterID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              authstatus: 2,
            },
            { user: req.userDetails, transaction },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: CompensatoryOffAuthorization.getTableName(),
              activityTablePK:
                authorizationData.toJSON().CompensatoryOffAuthorizationID,
              message: `${
                userDetails.displayName
              } has requested a Compensatory Off for ${moment(
                LeaveCreatedDate,
              ).format('DD/MM/YYYY')}.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            },
            { user: req.userDetails, transaction },
          );

          const notification = {
            title: 'Compensatory Off',
            body:
              userDetails.displayName + ' requested for a Compensatory Off.',
          };
          const data = {
            screen: 'coffauth',
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };
          // send Notification
          await sendNotification(
            authorizationData.userMasterID,
            notification,
            data,
          );
        }
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Compensatory Off Added Successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
