const express = require('express');
const visitReportMasterController = require('../controllers/visitreportmaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitReportMasterController.postAddVisitReport,
); // save data
router.post(
  '/v1/getalldatabycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitReportMasterController.getAllVisitReportDataByCompanyID,
); //get all bank data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitReportMasterController.getVisitReportById,
); //get by id
router.get(
  '/v1/getbycompany/:id',
  visitReportMasterController.getVisitReportBycompany,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitReportMasterController.postUpdateVisitReport,
); //update bank data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITREPORTMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitReportMasterController.postDeleteVisitReportById,
); //delete by id
router.post('/v1/statuschanges', visitReportMasterController.poststatuschange); //status change
module.exports = router;
