const express = require('express');
const meetingplaceController = require('../controllers/meetingPlace.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
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
      {
        permissionName: fromPermissionName.GATEPASSENTRY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  meetingplaceController.postAddmeetingPlace,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  meetingplaceController.getmeetingPlaceId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  meetingplaceController.postUpdatemeetingPlace,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  meetingplaceController.postDeletemeetingPlaceById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  meetingplaceController.poststatuschange,
); //status by id
router.post(
  '/v1/getmeetingPlacecompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  meetingplaceController.getmeetingPlacecompanyid,
); //get by id
router.get(
  '/v1/getmeetingPlaceByCompanyId/:id',
  meetingplaceController.getmeetingPlaceByCompanyId,
); //get by id

router.post(
  '/v1/uploadexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  meetingplaceController.uploadexcel,
); //upload excel

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  meetingplaceController.validateUploadExcel,
);

router.post(
  '/v1/reValidateMeetingPlace',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  meetingplaceController.reValidateMeetingPlace,
);

router.post(
  '/v1/addValidateMeetingPlace',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  meetingplaceController.addValidateMeetingPlace,
);

module.exports = router;
