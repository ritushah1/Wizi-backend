const express = require('express');
const hrToolKitController = require('../controllers/hrToolKit.controller');
const router = express.Router();
const { uploadHRToolKit } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.HRTOOLKIT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadHRToolKit,
  hrToolKitController.postAddDocument,
); // save data
router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRTOOLKIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrToolKitController.getAllHRADocument,
); // save data
router.post(
  '/v1/deletebyID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRTOOLKIT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  hrToolKitController.postDeleteHRToolKitById,
); // save data
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRTOOLKIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrToolKitController.postCHANGESTATUSById,
); // save data

module.exports = router;
