const express = require('express');
const commonController = require('../controllers/common.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getview',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SALARYFIELDS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  commonController.getView,
); // get view data
router.post('/v1/query', commonController.getQueryResult); // get query resuslts
module.exports = router;
