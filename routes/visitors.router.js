const express = require('express');
const visitorscontroller = require('../controllers/visitors.controller');
const router = express.Router();
const {
  uploadImportExcelFile,
  uploadVisitor,
} = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.CREATE,
      },
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
  uploadVisitor,
  visitorscontroller.postAddvisitors,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitorscontroller.getvisitorsId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadVisitor,
  visitorscontroller.postUpdatevisitors,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitorscontroller.postDeletevisitorsById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitorscontroller.poststatuschange,
); //status by id
router.post(
  '/v1/getvisitorscompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitorscontroller.getvisitorscompanyid,
); //get by id
router.get(
  '/v1/getvisitorsByCompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYGATEPASS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitorscontroller.getvisitorsByCompanyId,
); //get by id
router.post(
  '/v1/uploadexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  visitorscontroller.uploadexcel,
); //upload excel

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  visitorscontroller.validateUploadExcel,
);

router.post(
  '/v1/revalidateVisitors',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitorscontroller.revalidateVisitors,
);

router.post(
  '/v1/addValidateVisitors',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITORS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitorscontroller.addValidateVisitors,
);

module.exports = router;
