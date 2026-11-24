const express = require('express');
const UserIncrementLetter = require('../controllers/userIncrement.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserIncrementLetter.postAddIncrementLetters,
); //save the data
router.post(
  '/v1/getAllLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIncrementLetter.getAllIncrementLetter,
); //save the data
router.post(
  '/v1/updateLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserIncrementLetter.postUpdateUserIncrementLetters,
); //save the data
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  UserIncrementLetter.postDeleteIncrementLetters,
);
router.post(
  '/v1/getDataForBulkIncrement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIncrementLetter.getDataForBulkIncrement,
);
router.post(
  '/v1/bulkIncrementLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIncrementLetter.bulkIncrementLetter,
);
router.post(
  '/v1/incrementeemail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIncrementLetter.sendEmailIncrementLetter,
);

module.exports = router;
