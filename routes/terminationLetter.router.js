const express = require('express');
const TerminationLetter = require('../controllers/terminationLetter.controller');
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
        permissionName: fromPermissionName.TERMINATIONLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  TerminationLetter.addTerminationLetter,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TERMINATIONLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  TerminationLetter.updateTerminationLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TERMINATIONLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  TerminationLetter.deleteTerminationLetter,
);
router.post('/v1/get', TerminationLetter.getTerminationLetter);

module.exports = router;
