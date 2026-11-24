const express = require('express');
const router = express.Router();
const appraisalFeedbackRequestController = require('../controllers/appraisalFeedbacklRequest.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
router.post(
  '/v1/showAppraisalFeedbackToHR',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROBATIONASSESSMENTREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  appraisalFeedbackRequestController.showAppraisalFeedbackToHR,
);

router.post(
  '/v1/getAllRequestForFeedback',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROBATIONASSESSMENTREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  appraisalFeedbackRequestController.getAllRequestForFeedback,
);

router.post(
  '/v1/postAddAppraisalFeedbackReqValue',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROBATIONASSESSMENTREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  appraisalFeedbackRequestController.postAddAppraisalFeedbackReqValue,
);
router.post(
  '/v1/getFilledAppraisalFeedbackReqValue',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROBATIONASSESSMENTREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  appraisalFeedbackRequestController.getFilledFormValue,
);
router.post(
  '/v1/downloadAppraisalFeedbackPDF',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  appraisalFeedbackRequestController.downloadAppraisalFeedbackPDF,
);

module.exports = router;
