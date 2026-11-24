const express = require('express');
const joiningDocumentMasterController = require('../controllers/joiningDocumentType.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/addJoinoingDocumentType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  joiningDocumentMasterController.addJoinoingDocument,
); // save data
router.post(
  '/v1/gettAlljoiningDocumentTypeData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  joiningDocumentMasterController.gettAllJoiningDocumentData,
); //get all document list data
router.get(
  '/v1/getjoiningDocumentTypeById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  joiningDocumentMasterController.getJoiningDocumentById,
); //get by id
router.post(
  '/v1/updatejoiningDocumentType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  joiningDocumentMasterController.updateJoiningDocument,
); //update document list data
router.post(
  '/v1/statusChangesjoiningDocumentType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  joiningDocumentMasterController.statusChangesJoiningDocument,
); //status

router.post(
  '/v1/deletejoiningDocumentType',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGDOCUMENTTYPE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  joiningDocumentMasterController.deleteJoiningDocument,
); //delete by id

module.exports = router;
