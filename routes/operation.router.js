const express = require('express');
const operationController = require('../controllers/operation.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/add', operationController.postAddOperation); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERPERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  operationController.getAllOperationData,
); //get all bank data
router.get('/v1/getbyid/:id', operationController.getOperationById); //get by id
router.post('/v1/updatebyid', operationController.postUpdateOperation); //update bank data
router.post('/v1/deletebyid', operationController.postDeleteOperationById); //delete by id
router.post('/v1/statuschanges', operationController.poststatuschange); //status change
router.post(
  '/v1/getActiveOperationData',
  operationController.getActiveOperationData,
); //status change

module.exports = router;
