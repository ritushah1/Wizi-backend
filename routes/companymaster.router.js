const express = require('express');
const companyMasterController = require('../controllers/companymaster.controller');
const router = express.Router();
const { verifyToken, verifyOtpToken } = require('../middleware/tokenverify');
const { uploadCompanyDetailsFiles } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v2/add',
  verifyOtpToken,
  companyMasterController.postAddCompanyV2,
);

router.post(
  '/v1/add',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadCompanyDetailsFiles,
  companyMasterController.postAddCompany,
);

router.get(
  '/v1/getbyid/:id',
  verifyToken,
  companyMasterController.getByCompanyMasterID,
);

router.post(
  '/v1/updatebyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadCompanyDetailsFiles,
  companyMasterController.postUpdatecompanyMaster,
);
router.post(
  '/v1/deletebyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  companyMasterController.postDeleteCompanyById,
); //Not used in Mobile

router.post(
  '/v1/statuschange',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyMasterController.poststatuschange,
); //Not used in Mobile

router.post(
  '/v1/getCompanyByParentCompany',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.getCompanyByParentCompany,
);

router.post(
  '/v1/getCompanyById',
  verifyToken,
  companyMasterController.getCompanyListByCompanyAccessType,
);

router.post(
  '/v1/postUpdateCustomerPreference',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.postUpdateCustomerPreference,
);

router.get(
  '/v1/getCompanySubscriptionPlanAnalyticsData',
  verifyToken,
  companyMasterController.getCompanySubscriptionPlanAnalyticsData,
); //Not used in Mobile

router.post(
  '/v1/getCompanyTree',
  verifyToken,
  companyMasterController.getCompanyTree,
);

router.post(
  '/v1/getUser',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.getUser,
);

router.post(
  '/v1/removeCompanyLogoAndAuthSign',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyMasterController.removeCompanyLogoAndAuthSign,
);

router.post(
  '/v1/allChildParentCompanyList',
  verifyToken,
  companyMasterController.allChildParentCompanyList,
); //Not used in Mobile

router.get(
  '/v1/getallCompanyWiseCompanyAndBranchData',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.getallCompanyWiseCompanyAndBranchData,
); //Not used in Mobile

router.get(
  '/v1/getCompanyActiveSubscriptionPlanWiseForms',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyMasterController.getCompanyActiveSubscriptionPlanWiseForms,
); //Not used in Mobile
router.post(
  '/v1/postUpdate_visit_geo_check',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.postUpdate_visit_geo_check,
);
router.post(
  '/v1/postUpdate_visit_image',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.postUpdate_visit_image,
);
router.post(
  '/v1/getCompanyMarketingPersonsCountWise',
  verifyToken,
  companyMasterController.getCompanyMarketingPersonsCountWise,
);
router.post(
  '/v1/getCompanyDealersCountWise',
  verifyToken,
  companyMasterController.getCompanyDealersCountWise,
);
router.post(
  '/v1/getCompanyHMCountWise',
  verifyToken,
  companyMasterController.getCompanyHMorRMCountWise,
);
router.post(
  '/v1/getAllSubscriptionCountWise',
  verifyToken,
  companyMasterController.getAllSubscriptionCountWise,
);
router.post(
  '/v1/getAllComopanyStageAnalytics',
  verifyToken,
  companyMasterController.getAllComopanyStageAnalytics,
);

router.post(
  '/v1/getAllSalaryCalculatedMonthWiseCount',
  verifyToken,
  companyMasterController.getAllSalaryCalculatedMonthWiseCount,
);

router.post(
  '/v1/getAllActiveParentChildCompanies',
  verifyToken,
  companyMasterController.getAllActivePlanParentChildCompanies,
);

router.post(
  '/v1/getAllRmHRMandHeadandSubAdmin',
  verifyToken,
  companyMasterController.getAllRmHRMandHeadandSubAdmin,
);

router.post(
  '/v1/getAllParentCompany',
  verifyToken,
  companyMasterController.getAllParentCompany,
);

router.post(
  '/v1/getAllActiveParentChildCompaniesWithZoho',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.getAllActiveParentChildCompaniesWithZoho,
);

router.post(
  '/v1/postUpdate_visit_Auto_Check',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITCUSTOMIZEFIELD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.postUpdate_visit_Auto_Check,
);
router.post(
  '/v1/getAllActiveParentChildCompaniesWithGoogleSheetIntegration',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETCONNECTION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.GOOGLESHEETEXPORTSETTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyMasterController.getAllActiveParentChildCompaniesWithGoogleSheetIntegration,
);
module.exports = router;
