const express = require('express');
const router = express.Router();
const jobApplicationController = require('../controllers/jobApplication.controller');
const { verifyToken } = require('../middleware/tokenverify');
const { uploadJobApplication } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addJobApplication',
  uploadJobApplication,
  jobApplicationController.addJobApplication,
); // save data
router.post(
  '/v1/listJobApplication',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  jobApplicationController.listJobApplication,
); // List data

router.get(
  '/v1/getApplicationByID',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  jobApplicationController.getApplicationByID,
);
router.post(
  '/v1/jobApplicationAcceptreject',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  jobApplicationController.jobApplicationAcceptreject,
);

router.get(
  '/v1/getApplicationByIDOpen',
  jobApplicationController.getApplicationByIDOpen,
);
module.exports = router;
