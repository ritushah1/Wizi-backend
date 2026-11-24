const express = require('express');
const mailtemplatetypeController = require('../controllers/mailTemplateType.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/add', mailtemplatetypeController.postAddMailType); // save data
router.post(
  '/v1/getalldata',
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
  mailtemplatetypeController.getAllMailType,
); //get all mailtype tax data
router.get('/v1/getbyid/:id', mailtemplatetypeController.getMailTypeId); //get by id
router.post('/v1/updatebyid', mailtemplatetypeController.postUpdatMailType); //update mailtype tax data
router.post(
  '/v1/deletebyid',
  mailtemplatetypeController.postDeleteMailTypeById,
); //delete by id
router.post('/v1/statuschanges', mailtemplatetypeController.poststatuschange); //status by id
router.post(
  '/v1/getactivemailtypedata',
  mailtemplatetypeController.getActiveMailTypeData,
); //get active data

module.exports = router;
