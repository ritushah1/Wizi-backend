const express = require('express');
const router = express.Router();
const JobPostingController = require('../controllers/jobPosting.controller');
const { verifyToken } = require('../middleware/tokenverify');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addJobPosting',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.CREATE,
      },
    ],
  }),
  JobPostingController.addJobPosting,
);

router.post(
  '/v1/listJobPostingData',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  JobPostingController.listJobPostingData,
);

router.get(
  '/v1/getJobPostingByID',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  JobPostingController.getJobPostingByID,
);

router.put(
  '/v1/editJobPosting',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  JobPostingController.editJobPosting,
);

router.post(
  '/v1/deleteJobPosting',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.JOBAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  JobPostingController.deleteJobPosting,
);

router.get(
  '/v1/getJobPostingBySecrectKey',
  JobPostingController.getJobPostingBySecrectKey,
);

module.exports = router;
