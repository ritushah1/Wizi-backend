const express = require('express');
const advancePaymentController = require('../controllers/advancePayment.controller');
const router = express.Router();

const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
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
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.postAddAdvancePaymentdata,
); // save data
router.post(
  '/v1/getcompanydata',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.getadvanceByCompanyid,
); //get  data by companyid
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.getAdvancePaymentById,
); //get by id
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.postUpdateAdvancepayment,
); //update  data
router.get(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  advancePaymentController.postDeleteAdavancePaymentById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  advancePaymentController.poststatuschange,
); //status change
router.post(
  '/v1/getuserdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.getadvanceByUserid,
); //get data by user id

router.post(
  '/v1/addd',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEADVANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.postAddRequestAdvancePaymentdata,
); // save data
router.post(
  '/v1/statusreq',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.postStatusrequest,
); //get data by user id

router.post(
  '/v1/advancedatashow',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.advancedatashow,
);

router.get(
  '/v1/exportDemoexcel',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.exportDemoexcel,
);

router.post(
  '/v1/validateExcel',
  checkRolePermission,
  permissionAccess,
  uploadImportExcelFile,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.validateUploadExcel,
);

router.post(
  '/v1/revalidateAdvancePayment',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.revalidateAdvancePayment,
);

router.post(
  '/v1/addValidateAdvancePayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.addValidateAdvancePayment,
);

router.post(
  '/v1/updateByReportee',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  advancePaymentController.updateByReportee,
); //update  data

router.post(
  '/v1/getuserAdavancedataForReporteeUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  advancePaymentController.getuserAdavancedataForReporteeUser,
); //get data by user id

router.post(
  '/v2/getcompanydata',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  advancePaymentController.getadvanceByCompanyid_V2,
); //get  data by companyid

router.post(
  '/v2/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEPAYMENT,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  advancePaymentController.postDeleteAdavancePaymentByIdV2,
); //delete by id

router.post(
  '/v2/updateByReportee',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMADVANCEREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  advancePaymentController.updateByReporteeV2,
); //update  data

module.exports = router;
