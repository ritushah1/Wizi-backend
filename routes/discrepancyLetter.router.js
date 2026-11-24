const express = require('express');
const DiscrepancyLetterController = require('../controllers/discrepancyLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  DiscrepancyLetterController.addDiscrepancyLetter,
);
router.put(
  '/v1/updateDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DiscrepancyLetterController.updateDiscrepancyLetter,
);
router.post(
  '/v1/deleteDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  DiscrepancyLetterController.deleteDiscrepancyLetter,
);
router.post(
  '/v1/getDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DiscrepancyLetterController.getDiscrepancyLetter,
);
router.post(
  '/v1/getDiscrepancyLetterByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DiscrepancyLetterController.getDiscrepancyLetterByID,
);

module.exports = router;
