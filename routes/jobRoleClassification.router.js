const express = require('express');
const router = express.Router();
const jobRoleClassificationController = require('../controllers/jobRoleClassification.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

// const JobRoleClassification = require('../models/jobRoleClassification');

router.post(
  '/v1/addJobRoleClassification',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBROLETYPE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  jobRoleClassificationController.addJobRoleClassification,
);
router.post(
  '/v1/listJobRoleClassification',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBROLETYPE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  jobRoleClassificationController.listJobRoleClassification,
);
router.get(
  '/v1/getJobRoleClassificationByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBROLETYPE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  jobRoleClassificationController.getJobRoleClassificationByID,
);
router.post(
  '/v1/editJobRoleClassificationByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBROLETYPE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  jobRoleClassificationController.editJobRoleClassificationByID,
);
router.post(
  '/v1/deleteJobRoleClassificationByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOBROLETYPE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  jobRoleClassificationController.deleteJobRoleClassificationByID,
);

module.exports = router;
