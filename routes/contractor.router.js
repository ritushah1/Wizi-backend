const express = require('express');
const router = express.Router();
const contractorcontroller = require('../controllers/contractor.controller');
const contractor = require('../models/contractor');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  contractorcontroller.postadddata,
);

router.get(
  '/v1/listdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  contractorcontroller.listdata,
);

router.put(
  '/v1/editdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.EDIT,
      },
    ],
  }),
  contractorcontroller.editdata,
);

router.delete(
  '/v1/deletedata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.DELETE,
      },
    ],
  }),
  contractorcontroller.deletedata,
);

router.get(
  '/v1/getdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.EDIT,
      },
    ],
  }),
  contractorcontroller.getdata,
);

router.post(
  '/v1/poststatuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.EDIT,
      },
    ],
  }),
  contractorcontroller.poststatuschange,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  contractorcontroller.validateUploadExcel,
);

router.post(
  '/v1/revalidateContractor',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  contractorcontroller.revalidateContractor,
);

router.post(
  '/v1/addValidateContractor',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  contractorcontroller.addValidateContractor,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONTRACTOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  contractorcontroller.generateDemoExcel,
);
module.exports = router;
