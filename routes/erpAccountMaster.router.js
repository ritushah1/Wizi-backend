const express = require('express');
const erpAccountMasterController = require('../controllers/erpAccountMaster.controller');
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
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.CREATE,
      },
    ],
  }),
  erpAccountMasterController.postAdderpAccountMaster,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpAccountMasterController.geterpAccountMasterId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  erpAccountMasterController.postUpdateerpAccountMaster,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.DELETE,
      },
    ],
  }),
  erpAccountMasterController.postDeleteerpAccountMasterById,
); //delete by id
router.post(
  '/v1/geterpAccountMasterByCompanyID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpAccountMasterController.geterpAccountMastercompanyid,
); // get by user
router.post(
  '/v1/geterpaccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.EDIT,
      },
    ],
  }),
  erpAccountMasterController.geterpaccount,
); // get by user

router.post(
  '/v1/getErpClosingBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEXPENSEADVANCESYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpAccountMasterController.getErpClosingBalance,
); // get by id

router.post(
  '/v1/linkTADAERPAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpAccountMasterController.linkTADAERPAccount,
);
router.post(
  '/v1/updateLinkedTADAERPAccount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPACCOUNTLINK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpAccountMasterController.updateLinkedTADAERPAccount,
);
module.exports = router;
