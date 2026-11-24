const express = require('express');
const Ndareportcontroller = require('../controllers/Ndareport.controller');
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
        permissionName: fromPermissionName.NDAREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Ndareportcontroller.getNdaData,
);
router.post(
  '/v1/getdatadeposit',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Ndareportcontroller.getdepositData,
);

module.exports = router;
