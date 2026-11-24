const express = require('express');
const visitformcustomizeController = require('../controllers/visitformcustomize.controller');
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
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitformcustomizeController.postAddVisitFormCustomize,
); // save data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitformcustomizeController.getVisitFormCustomizeById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitformcustomizeController.getVisitFormCustomizeByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMVISIT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitformcustomizeController.postUpdateVisitFormCustomize,
); //update visitPurpose data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitformcustomizeController.postDeleteVisitFormCustomizeById,
); //delete by id

module.exports = router;
