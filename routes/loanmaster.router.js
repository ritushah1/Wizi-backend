const express = require('express');
const router = express.Router();
const loanMasterController = require('../controllers/loanMaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  loanMasterController.postAddLoanMaster,
);

router.post(
  '/v1/advanceLoan/create',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.postAddAdvanceLoan,
);

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.postGetLoanMasterbyLoanID,
);

router.post(
  '/v2/getbyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.postGetLoanMasterbyLoanIDV2,
);

router.post(
  '/v1/getLoanByCompanyId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.getLoanByCompanyid,
);

router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  loanMasterController.postDeleteByLoanID,
);

router.get(
  '/v1/loanAdvance/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.getLoanAdvanceByLoanID,
);

router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  loanMasterController.postUpdateLoanMaster,
);

router.post(
  '/v1/getLoanByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.getLoanByUserId,
);

router.post(
  '/v1/addrequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.CREATE,
      },
    ],
  }),
  loanMasterController.postloanmasteradd,
);

router.post(
  '/v1/changestatusrequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.postStatusrequest,
);

router.post(
  '/v1/loandatashow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.loandatashow,
);

router.post(
  '/v1/duePayment/create',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loanMasterController.createDuePayment,
);

router.post(
  '/v1/updateLoanById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.EDIT,
      },
    ],
  }),
  loanMasterController.updateLoanById,
);
module.exports = router;
