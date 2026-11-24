const express = require('express');
const visitReportCustomizeValueController = require('../controllers/visitreportcustomizevalue.controller');
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
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitReportCustomizeValueController.postAddVisitReportCustomizeFieldValue,
); // save data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitReportCustomizeValueController.getVisitReportCustomizeFieldValueById,
); //get by id

router.post(
  '/v1/bulkadd',
  visitReportCustomizeValueController.postAddBulkVisitReportCustomizeFieldValue,
); //delete by id

module.exports = router;
