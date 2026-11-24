const UserMaster = require('../models/userMaster');
const { roleType, companyAccessType } = require('../utils/dbUtils');
const Sequelize = require('sequelize');
const { fetchChildCompanies } = require('../utils/commonQueries');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { getAllTeamMembers } = require('../utils/commonUtilFunctions');
const moment = require('moment');
const { adminUserTypesSet } = require('../utils/commonVars');
const { sendAuthorizationDenied } = require('./tokenverify');

/**
 * Verifies the token received in the header of each request
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns App to proceed with next step in lifecycle of application
 */
function checkHasAccess(id1, id2) {
  const idArray = Array.isArray(id2) ? id2 : [id2];
  const hasAccess = idArray.every((companyId) => id1.includes(+companyId));
  return hasAccess;
}

// ✅ Common validator
const getReqValue = (req, key) =>
  req.body[key] ?? req.query[key] ?? req.params[key];

async function permissionAccess(req, res, next) {
  try {
    const {
      userMasterId,
      companyMasterId,
      userData,
      role,
      accessibleWorkerTypes,
    } = req.userDetails;

    if (!userData) {
      return sendAuthorizationDenied({ res });
    }

    // ✅ Admin bypass

    if (adminUserTypesSet.has(+userData.admin)) return next();

    let accessibleCompanies = [];
    let accessibleBranches = [];
    // let accessibleUsers = [];
    const useBranchLogic = role.roleType === roleType.BRANCH_WISE;

    // ✅ Companies
    if (role.companyAccessType === companyAccessType.OWN_PLUS_CHILD_COMPANY) {
      accessibleCompanies = await fetchChildCompanies(companyMasterId);
    }

    accessibleCompanies = [
      ...new Set([...accessibleCompanies, +companyMasterId]),
    ];

    // ✅ Extract roleMaster once (avoid deep access repeatedly)
    const roleMaster = userData.userRoles?.[0]?.roleMaster;
    // 9️⃣ Fetch users
    const userIncludeModel = [];
    if (accessibleWorkerTypes?.length) {
      userIncludeModel.push({
        required: true,
        model: EmployeeJoiningDetails,
        where: {
          salarytype: [...accessibleWorkerTypes],
        },
      });
    }
    // ✅ Branch-wise role
    const currentDate = new Date();
    if (useBranchLogic) {
      accessibleBranches =
        roleMaster?.roleMasterBranchWises?.map((b) => b.branchMasterID) || [];
      userIncludeModel.push({
        required: true,
        model: EmployeeBranch,
        attributes: [],
        where: {
          status: 1,
          branchID: accessibleBranches,
          applicableDate: { [Sequelize.Op.lte]: currentDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentDate } },
            { endDate: null },
          ],
        },
      });
    } else {
      const allBranches = await BranchMaster.findAll({
        where: { companyMasterID: accessibleCompanies, status: [0, 1] },
        attributes: ['branchMasterID'],
      });
      accessibleBranches.push(
        ...allBranches.map((item) => item.branchMasterID),
      );
    }
    // const users = await UserMaster.findAll({
    //   where: {
    //     companyMasterId: {
    //       [Sequelize.Op.in]: accessibleCompanies,
    //     },
    //     status: {
    //       [Sequelize.Op.in]: [0, 1],
    //     },
    //   },
    //   attributes: ['userMasterID'],
    //   include: userIncludeModel,
    // });
    // accessibleUsers = users.map((u) => u.userMasterID);

    // ✅ Attach to request
    req.userDetails.accessibleCompanies = accessibleCompanies;
    req.userDetails.accessibleBranches = useBranchLogic
      ? accessibleBranches
      : [];
    // req.userDetails.accessibleUsers = accessibleUsers || [];

    // ✅ Company check
    const companyID = getReqValue(req, 'companyMasterID');
    if (companyID && !checkHasAccess(accessibleCompanies, companyID)) {
      return sendAuthorizationDenied({ res });
    }

    // ✅ Branch check
    const branchID = getReqValue(req, 'branchMasterID');
    if (branchID && !checkHasAccess(accessibleBranches, branchID)) {
      return sendAuthorizationDenied({ res });
    }

    // ✅ User check
    // const userID = getReqValue(req, 'userMasterID');
    // if (userID && !checkHasAccess(accessibleUsers, userID)) {
    //   const ids = Array.isArray(userID) ? userID : [userID];

    //   if (ids.length !== 1 || +ids[0] !== +userMasterId) {
    //     return sendAuthorizationDenied({ res });
    //   }
    // }

    next();
  } catch (err) {
    return sendAuthorizationDenied({ res });
  }
}

async function teamPermissionAccess(req, res, next) {
  try {
    const { userMasterId, userData } = req.userDetails;

    if (!userData) {
      return sendAuthorizationDenied({ res });
    }

    const CURRENT_DATE = moment().format('YYYY-MM-DD');
    const MAX_LEVEL = 6;

    const accessibleUserData = await getAllTeamMembers(
      userMasterId,
      null,
      null,
      CURRENT_DATE,
      MAX_LEVEL,
    );

    const accessibleUsers = accessibleUserData.map((e) => +e.userMasterID);

    // ✅ User check
    const userID = getReqValue(req, 'userMasterID');
    if (userID && !checkHasAccess(accessibleUsers, userID)) {
      const ids = Array.isArray(userID) ? userID : [userID];

      if (ids.length !== 1 || +ids[0] !== +userMasterId) {
        return sendAuthorizationDenied({ res });
      }
    }

    req.userDetails.isMyTeamDetails = true;

    next();
  } catch (error) {
    return sendAuthorizationDenied({ res });
  }
}

async function myDetailsAccess(req, res, next) {
  try {
    const { userData } = req.userDetails;

    if (!userData) {
      return sendAuthorizationDenied({ res });
    }
    req.userDetails.isMyUserDetails = true;

    next();
  } catch (error) {
    return sendAuthorizationDenied({ res });
  }
}
module.exports = { permissionAccess, teamPermissionAccess, myDetailsAccess };
