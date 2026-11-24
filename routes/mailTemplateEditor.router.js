const express = require('express');
const mailtemplateEditorController = require('../controllers/mailTemplateEditor.controller');
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
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  mailtemplateEditorController.postAddMailEditor,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  mailtemplateEditorController.getAllMailEditor,
); //get all maileditor tax data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  mailtemplateEditorController.getMailTemplateEditorId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  mailtemplateEditorController.postUpdatMailEditor,
); //update maileditor tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  mailtemplateEditorController.postDeleteMailEditorById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  mailtemplateEditorController.poststatuschange,
); //status by id

module.exports = router;
