const express = require('express');
const userDocumentController = require('../controllers/userdocument.controller');
const router = express.Router();
const { uploadUserDocument } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userDocumentController.getUserDocumentById,
); //get by id
router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userDocumentController.getUserDocumentByUserMasterId,
); //get by user id

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userDocumentController.postDeleteUserDocumentById,
); //delete by id

router.post(
  '/v1/verifyreq',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userDocumentController.postDocVerifyRequest,
); //status change

router.post(
  '/v1/UserExpiryDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userDocumentController.UserExpiryDocument,
);
router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserDocument,
  userDocumentController.postAddUserDocument_V2,
);
router.post(
  '/v2/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserDocument,
  userDocumentController.postUpdateUserDocument_V2,
);

router.post(
  '/v1/downloadAllDocuments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userDocumentController.downloadAllDocuments,
);
// Employee Documents Drawer APIs
router.post(
  '/v1/emp-docs/stats',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userDocumentController.getEmployeeDocumentStats,
);

router.post(
  '/v1/emp-docs/document-types',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userDocumentController.getDocumentTypesList,
);

router.post(
  '/v1/emp-docs/employees',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userDocumentController.getEmployeesListForDocs,
);

router.post(
  '/v1/emp-docs/submissions',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userDocumentController.getSubmissionsForDrawer,
);

module.exports = router;

