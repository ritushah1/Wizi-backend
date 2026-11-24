const express = require('express');
const hrSalaryFieldsController = require('../controllers/hrsalaryfields.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrSalaryFieldsController.postAddHRSalaryFields,
);

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrSalaryFieldsController.getHRSalaryFieldsById,
);

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrSalaryFieldsController.postUpdateHRSalaryFields,
);

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  hrSalaryFieldsController.postDeleteHRSalaryFieldsById,
);

router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrSalaryFieldsController.poststatuschange,
);

router.get(
  '/v1/getbyidactive/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrSalaryFieldsController.getActiveHRSalaryFieldsById,
);
router.post('/v1/getbycompanyid', hrSalaryFieldsController.getallbycompany);

router.post(
  '/v1/getbycompanyidfordropdown',
  hrSalaryFieldsController.getbycompanyidforgradedropdown,
);

router.post(
  '/v1/getcompanypayhead',
  hrSalaryFieldsController.getpayheadbycompany,
);

router.post(
  '/v1/getindex',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrSalaryFieldsController.postcheckindex,
);
module.exports = router;
