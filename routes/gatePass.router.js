const express = require('express');
const gatePassController = require('../controllers/gatePass.controller');
const router = express.Router();
const { verifyChildParent } = require('../middleware/verifyChildParent');
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
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  gatePassController.postAddgatePass,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gatePassController.getgatePassId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gatePassController.postUpdategatePass,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  gatePassController.postDeletegatePassById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gatePassController.poststatuschange,
); //status by id

router.post(
  '/v1/getgatePasscompanyid',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gatePassController.getgatePasscompanyid,
); //get by id

router.post(
  '/v1/getgatePassuser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gatePassController.getgatePassuser,
); //get by id
router.get(
  '/v1/getgatePassByCompanyId/:id',
  gatePassController.getgatePassByCompanyId,
); //get by id
router.get(
  '/v1/getactivegatePassbycompanyid/:id',
  gatePassController.getactivegatePassbycompanyid,
);
router.post('/v1/getbyusermasterid', gatePassController.getpassByuserId);
router.post(
  '/v1/updatebyid1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gatePassController.postUpdategatePass1,
); //update companytype tax data

router.post(
  '/v1/gatepassdashboard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gatePassController.gatePassDashboard,
);

module.exports = router;
