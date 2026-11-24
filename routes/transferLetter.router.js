const express = require('express');
const TransferLetter = require('../controllers/transferLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  TransferLetter.addTransferLetter,
);
router.post(
  '/v1/listTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TRANSFERLETTERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TransferLetter.listTransferLetter,
);
router.post(
  '/v1/getTransferLetterByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TransferLetter.getTransferLetterByID,
);
router.post(
  '/v1/updateTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TransferLetter.updateTransferLetter,
);

router.post(
  '/v1/deleteTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  TransferLetter.deleteTransferLetter,
);
module.exports = router;
