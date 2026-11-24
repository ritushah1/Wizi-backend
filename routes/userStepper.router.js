const express = require('express');
const UserStepperController = require('../controllers/userStepper.controller');
const { uploadUserCreateDocumentFiles } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/addStepwiseUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadUserCreateDocumentFiles,
  UserStepperController.addStepwiseUser,
);

module.exports = router;
