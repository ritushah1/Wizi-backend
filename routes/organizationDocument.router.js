const express = require('express');
const organizationDocumentController = require('../controllers/organizationDocument.controller');
const router = express.Router();
const { uploadOrgnizationDocument } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addOrganizationDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadOrgnizationDocument,
  organizationDocumentController.addOrganizationDocument,
);

router.post(
  '/v1/getAllOrganizationDocuments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  organizationDocumentController.getAllOrganizationDocuments,
);

router.get(
  '/v1/getOrganizationDocumentByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  organizationDocumentController.getOrganizationDocumentByID,
);

router.put(
  '/v1/updateOrganizationDocuments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadOrgnizationDocument,
  organizationDocumentController.updateOrganizationDocuments,
);

router.post(
  '/v1/renewOrganizationDocument',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadOrgnizationDocument,
  organizationDocumentController.renewOrganizationDocument,
);

router.get(
  '/v1/getOrganizationDocumentHistory/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONDOCUMENTS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  organizationDocumentController.getOrganizationDocumentHistory,
);

module.exports = router;
