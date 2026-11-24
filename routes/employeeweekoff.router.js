const express = require('express');
const employeeWeekOffController = require('../controllers/employeeweekoff.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { verifySuperAdmin } = require('../middleware/verifySuperAdmin');
const router = express.Router();

router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWeekOffController.getEmployeeWeekOffByUserId,
); //get by user id

router.post(
  '/v1/getEmployeeWeekoff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKWEEKOFF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWeekOffController.getEmployeeWeekoff,
); //status changeget

// -------------------- Don't call or delete this API ------------------------

router.post(
  '/v1/addWeekForSpecificDates',
  verifySuperAdmin,
  employeeWeekOffController.addWeekForSpecificDates,
);

// --------------------------------------------------------------------------------

router.post(
  '/v1/deleteEmployeeWeekoffPolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeWeekOffController.deleteEmployeeWeekoffPolicy,
);
router.post(
  '/v1/assignEmployeeWeekOffFromAnyMonthBulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKWEEKOFF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWeekOffController.assignEmployeeWeekOffFromAnyMonthBulk,
);
module.exports = router;
