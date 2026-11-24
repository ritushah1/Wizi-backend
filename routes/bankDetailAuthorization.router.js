const express = require('express');
const BankDetailAuthorizationController = require('../controllers/bankDetailAuthorization.controller');
const {
  createBankDetailRequestSchema,
} = require('../validators/bankDetailrequest');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const router = express.Router();

router.post(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  BankDetailAuthorizationController.list,
);
router.get('/v1/view/:id', BankDetailAuthorizationController.view);
router.post(
  '/v1/statusUpdate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  BankDetailAuthorizationController.statusUpdate,
);
router.post(
  '/v1/bankDetailAuthorizeduser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINBANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  BankDetailAuthorizationController.bankDetailAuthorizeduser,
);
router.post(
  '/v1/getAllBankDetailAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINBANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  BankDetailAuthorizationController.getAllBankDetailAdmin,
);
router.post(
  '/v1/acceptRejectBankDetailsAuthReqAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINBANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BANKDETAILSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  BankDetailAuthorizationController.acceptRejectBankDetailsAuthReqAdmin,
);

module.exports = router;
