const { Sequelize } = require('sequelize');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { adminUserTypesSet } = require('../utils/commonVars');

function accessibleRoleWiseUsers({
  userDetails,
  includeCompany = true,
  includeBranch = true,
  includeWorkerType = true,
}) {
  try {
    const condition = { where: {}, includeModels: [] };
    if (!userDetails) return condition;
    if (userDetails?.isMyUserDetails || userDetails?.isMyTeamDetails)
      return condition;
    // ✅ Admin bypass
    if (adminUserTypesSet.has(+userDetails.admin)) return condition;
    const dateTimeNow = new Date();

    const accessibleBranches = Array.isArray(userDetails.accessibleBranches)
      ? userDetails.accessibleBranches
      : userDetails.accessibleBranches
        ? [+userDetails.accessibleBranches]
        : [];

    const accessibleCompanies = Array.isArray(userDetails.accessibleCompanies)
      ? userDetails.accessibleCompanies
      : userDetails.accessibleCompanies
        ? [+userDetails.accessibleCompanies]
        : [];

    const accessibleWorkerTypes = userDetails.accessibleWorkerTypes || [];

    const hasBranchAccess = includeBranch && accessibleBranches.length;
    const hasCompanyAccess = includeCompany && accessibleCompanies.length;
    const hasWorkerTypeAccess =
      includeWorkerType && accessibleWorkerTypes.length;

    if (hasBranchAccess) {
      condition.includeModels.push({
        required: true,
        model: EmployeeBranch,
        as: 'branch_access',
        attributes: [],
        where: {
          status: 1,
          branchID: accessibleBranches,
          applicableDate: { [Sequelize.Op.lte]: dateTimeNow },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: dateTimeNow } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
      });
    } else if (hasCompanyAccess) {
      condition.where.companyMasterId = accessibleCompanies;
    }

    if (hasWorkerTypeAccess) {
      condition.includeModels.push({
        required: true,
        model: EmployeeJoiningDetails,
        as: 'join_access',
        attributes: [],
        where: {
          salarytype: accessibleWorkerTypes,
        },
      });
    }

    return condition;
  } catch (error) {
    throw new Error('Error Accessible Users: ' + error.message);
  }
}

module.exports = { accessibleRoleWiseUsers };
