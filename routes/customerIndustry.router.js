const express = require('express');
const CustomerIndustry = require('../controllers/customerIndustry.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CustomerIndustry.postAddCustomerIndustry,
);
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CustomerIndustry.getCustomerIndustryById,
);
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CustomerIndustry.getCustomerIndustryByCompanyId,
);
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CustomerIndustry.postUpdateCustomerIndustry,
);
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  CustomerIndustry.postDeleteCustomerIndustryById,
);
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CustomerIndustry.poststatuschange,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  CustomerIndustry.validateUploadExcel,
);

router.post(
  '/v1/reValidatecustomerIndustry',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CustomerIndustry.reValidatecustomerIndustry,
);

router.post(
  '/v1/addValidatecustomerIndustry',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMERINDUSTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CustomerIndustry.addValidatecustomerIndustry,
);
module.exports = router;
