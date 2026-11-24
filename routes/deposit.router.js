const express = require('express');
const depositController = require('../controllers/deposit.controller');
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
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  depositController.postAddDeposit,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  depositController.getDepositId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  depositController.postUpdateDeposit,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  depositController.postDeleteDepositById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  depositController.poststatuschange,
); //status by id
router.post(
  '/v1/getDepositcompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  depositController.getDepositcompanyid,
); //get by id
router.get(
  '/v1/getDepositByCompanyId/:id',
  depositController.getDepositByCompanyId,
); //get by id
router.get(
  '/v1/getactivedepartmentbycompanyid/:id',
  depositController.getactivedepositbycompanyid,
);
router.post(
  '/v1/getDepositByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEDEPOSIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  depositController.getDepositByuserid,
); // get by user

module.exports = router;
