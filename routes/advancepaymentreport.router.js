const express = require('express');
const AdvanceReport = require('../controllers/AdvancePaymentReport.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  AdvanceReport.getAdvanceData,
); //get the data

module.exports = router;
