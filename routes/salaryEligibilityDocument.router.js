const express = require('express');
const SalaryEligibilityDocumentController = require('../controllers/salaryEligibilityDocument.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addSalaryEligibilityDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYELIGIBILITYDOCUMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SalaryEligibilityDocumentController.addSalaryEligibilityDocument,
);
router.post(
  '/v1/getAllSalaryEligibilityDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYELIGIBILITYDOCUMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  SalaryEligibilityDocumentController.getAllSalaryEligibilityDocument,
);

router.post(
  '/v1/getSalaryEligibilityDocumentByID',
  SalaryEligibilityDocumentController.getSalaryEligibilityDocumentByID,
);
router.post(
  '/v1/deleteSalaryEligibilityDocumentByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYELIGIBILITYDOCUMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  SalaryEligibilityDocumentController.deleteSalaryEligibilityDocumentByID,
);
router.post(
  '/v1/getAllRemainingSalaryEligibilityDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYELIGIBILITYDOCUMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  SalaryEligibilityDocumentController.getAllRemainingSalaryEligibilityDocument,
);
module.exports = router;
