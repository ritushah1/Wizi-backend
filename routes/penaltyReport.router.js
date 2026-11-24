const express = require('express');
const PenaltyReport = require('../controllers/penaltyreport.controller');
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
        permissionName: fromPermissionName.PENALTYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PenaltyReport.getPenaltyData,
); //get the data

module.exports = router;
