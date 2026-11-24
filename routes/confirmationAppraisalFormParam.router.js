const express = require('express');
const router = express.Router();
const confirmationAppraisalFormParamController = require('../controllers/ConfirmationAppraisalForm.controller');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addConfirmationAppraisalFormParam',
   checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.CREATE,
        },
      ],
    }),
  confirmationAppraisalFormParamController.postAddConfirmationAppraisalForm
);

router.post(
  '/v1/getAllConfirmationAppraisalFormParam',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.VIEW,
        },
      ],
    }),
  confirmationAppraisalFormParamController.getAllConfirmationAppraisalForm
);

router.post(
  '/v1/changeStatusConfirmationAppraisalForm',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.EDIT,
        },
      ],
    }),
  confirmationAppraisalFormParamController.poststatuschange
);

router.post(
  '/v1/postEditConfirmationAppraisalForm',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.EDIT,
        },
      ],
    }),
  confirmationAppraisalFormParamController.postEditConfirmationAppraisalForm
);

router.post(
  '/v1/getConfirmationAppraisalFormById',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.VIEW,
        },
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.EDIT,
        },
      ],
    }),
  confirmationAppraisalFormParamController.getConfirmationAppraisalFormByDesignationId
);

router.post(
  '/v1/getConfirmationAppraisalFormByIds',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.CREATE,
        },
          {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.EDIT,
        },
      ],
    }),
  confirmationAppraisalFormParamController.getConfirmationAppraisalFormById
);

router.post(
  '/v1/deleteConfirmationAppraisalFormById',
  checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.PROBATIONASSESSMENTFORM,
          operation: formOperation.DELETE,
        },
      ],
    }),
  confirmationAppraisalFormParamController.deleteConfirmationAppraisalForm
);

module.exports = router;
