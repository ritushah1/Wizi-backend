const express = require('express');
const visitreportcustomizeController = require('../controllers/visitreportcustomize.controller');
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
        permissionName: fromPermissionName.VISITREPORTCUSTOMIZEFIELD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitreportcustomizeController.postAddVisitReportCustomize,
); // save data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTCUSTOMIZEFIELD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitreportcustomizeController.getVisitReportCustomizeById,
); //get by id

router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
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
  visitreportcustomizeController.getVisitReportCustomizeByCompanyId,
); //get by company id

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTCUSTOMIZEFIELD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitreportcustomizeController.postUpdateVisitReportCustomize,
); //update visitPurpose data

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTCUSTOMIZEFIELD,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitreportcustomizeController.postDeleteVisitReportCustomizeById,
); //delete by id

module.exports = router;
