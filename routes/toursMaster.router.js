const express = require('express');
const toursMastercontroller = require('../controllers/toursMaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/insert_data',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  toursMastercontroller.postAddtoursMaster,
);
router.post(
  '/v1/update_data',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.EDIT,
      },
    ],
  }),
  toursMastercontroller.postUpdatetoursMaster,
);
router.get(
  '/v1/getbyid_data/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  toursMastercontroller.posttoursMasterById,
);
router.get(
  '/v1/delete_data/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.ADMINTOUR,
        operation: formOperation.DELETE,
      },
    ],
  }),
  toursMastercontroller.getDeletetoursMasterById,
);
router.post(
  '/v1/status_change',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.EDIT,
      },
    ],
  }),
  toursMastercontroller.postchangestatus,
);
router.post(
  '/v1/getbyuserid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  toursMastercontroller.gettouruserid,
);
router.post(
  '/v1/gettourdatabycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINTOUR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  toursMastercontroller.gettourdatabycompanyid,
);
router.post('/v1/getApprovedUserID', toursMastercontroller.getApprovedUserID);

module.exports = router;
