const express = require('express');
const zohoController = require('../controllers/zoho.controller');
const { verifyToken } = require('../middleware/tokenverify');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

/* =====================================================
   ZOHO BOOKS INTEGRATION ROUTES
===================================================== */

/* ===========================
   1. Generate Auth URL
   GET /api/zoho/v1/connect?companyMasterID=1
   
   Returns authorization URL for OAuth flow
=========================== */
router.get(
  '/v1/connect',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  zohoController.getZohoAuthUrl,
);

/* ===========================
   2. OAuth Callback
   GET /api/zoho/v1/callback
   
   ⚠️ IMPORTANT: This route MUST match ZOHO_REDIRECT_URI in .env
   Zoho redirects here after user authorization
=========================== */
router.get('/v1/callback', zohoController.getAuthorizeUserData);

/* ===========================
   3. Fetch Customers/Contacts
   GET /api/zoho/v1/customers?companyMasterID=1
   
   Returns list of customers from Zoho Books
=========================== */
router.get('/v1/customers', zohoController.fetchZohoCustomers);

/* ===========================
   4. Check Integration Status
   GET /api/zoho/v1/status?companyMasterID=1
   
   Check if Zoho is connected for a company
=========================== */
router.get('/v1/status', zohoController.checkIntegrationStatus);

/* ===========================
   5. Disconnect Integration
   DELETE /api/zoho/v1/disconnect?companyMasterID=1
   
   Remove Zoho integration
=========================== */
router.delete(
  '/v1/disconnect',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  zohoController.disconnectZoho,
);

router.get(
  '/v1/organizations',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  zohoController.fetchZohoOrganizations,
);

router.put(
  '/v1/organization/update',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  zohoController.updateZohoOrganizations,
);

router.get(
  '/v1/getChartOfAccounts',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  zohoController.fetchZohoChartOfAccounts,
);

module.exports = router;
