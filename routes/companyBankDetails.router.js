const express = require('express');
const CompanyBankDetailsController = require('../controllers/companyBankDetails.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addCompanyBankDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYBANKDETAILS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CompanyBankDetailsController.addCompanyBankDetails,
);

router.post(
  '/v1/editCompanyBankDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYBANKDETAILS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CompanyBankDetailsController.editCompanyBankDetails,
);

router.post(
  '/v1/getAllCompanyBankDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYBANKDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CompanyBankDetailsController.getAllCompanyBankDetails,
);

router.post(
  '/v1/getCompanyBankDetailsByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYBANKDETAILS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CompanyBankDetailsController.getCompanyBankDetailsByID,
);
router.post(
  '/v1/deleteCompanyBankDetailsByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYBANKDETAILS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  CompanyBankDetailsController.deleteCompanyBankDetailsByID,
);
module.exports = router;
