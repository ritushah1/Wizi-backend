const express = require('express');
const visitFormCustomizeValueController = require('../controllers/visitfieldcustomizevalue.controller');
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
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitFormCustomizeValueController.postAddVisitCustomizeFieldValue,
); // save data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
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
  visitFormCustomizeValueController.getVisitCustomizeFieldValueById,
); //get by id

router.post(
  '/v1/updatebyid',
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
    ],
  }),
  visitFormCustomizeValueController.postUpdateVisitCustomizeFieldValue,
); //update visitFormCustomizeValue data

router.post(
  '/v1/addbulk',
  visitFormCustomizeValueController.postAddBulkVisitCustomizeFieldValue,
);
router.post(
  '/v1/updatebulk',
  visitFormCustomizeValueController.postUpdateBulkVisitCustomizeFieldValue,
);
router.post(
  '/v1/webupdatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitFormCustomizeValueController.postUpdateVisitCustomizeFieldValueWeb,
);
module.exports = router;
