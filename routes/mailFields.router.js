const express = require('express');
const MailFiledController = require('../controllers/mailFields.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/add', MailFiledController.postAddMailFields); //save the data
router.post('/v1/getalldata', MailFiledController.getAllMailFieldsData); //get the data
router.post(
  '/v1/getMailFieldsByMailType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MAILTEMPLATE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  MailFiledController.getMailFieldsByMailType,
); //get mailfields by mailtype id
router.post('/v1/deletebyid', MailFiledController.postDeleteMailFieldsById); //delete by id
router.post('/v1/statuschanges', MailFiledController.poststatuschange); //status by id
router.post(
  '/v1/getActiveMailTypeData',
  MailFiledController.getActiveMailTypeData,
);
module.exports = router;
