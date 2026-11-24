const express = require('express');
const letterFieldsController = require('../controllers/letterFields.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/add', letterFieldsController.postAddLetterFields);

router.post('/v1/getalldata', letterFieldsController.getAllLetterFields);

router.post(
  '/v1/deletebyid',
  letterFieldsController.postDeleteLetterFieldsById,
);

router.post('/v1/statuschanges', letterFieldsController.poststatuschange);

router.post(
  '/v1/getLetterFieldsByLetterType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APPOINTMENTLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.APPOINTMENTLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.DISCREPANCYLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYMENTPROOFCERTIFICATE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TERMINATIONLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.TERMINATIONLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.TRANSFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  letterFieldsController.getLetterFieldsByLetterType,
);

module.exports = router;
