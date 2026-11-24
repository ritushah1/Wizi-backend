const express = require('express');
const FNFProcessController = require('../controllers/fnfProcess.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getFNFCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.getFNFCount,
);
router.post(
  '/v1/listFNF',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.listFNF,
); // list FNF Employees
router.get(
  '/v1/resignationByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.resignationByUserId,
); // Approved Resignation Details
router.get(
  '/v1/assetByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.assetByUserId,
); // Pending Asset By userId
router.get(
  '/v1/advanceByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.advanceByUserId,
); // Pending Advance By userId
router.get(
  '/v1/loanByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.loanByUserId,
); // Pending Loan By userId
router.get(
  '/v1/penaltyByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.penaltyByUserId,
); // Pending current month Penalty By userId

router.post(
  '/v1/addEmp_repayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.addEmp_repayment,
); // add advance and Penalty Repayment

router.post(
  '/v1/loanTransInFNF',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.loanTransInFNF,
); // set  same month for all loantransactions

router.post(
  '/v1/bonusPaymentFNFStatusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.bonusPaymentFNFStatusChange,
); // set fnf payment status

router.get(
  '/v1/getBonusInFNFByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.getBonusInFNFByUserId,
); // get employee bonus for fnf

router.post(
  '/v1/proccessedLeaveInFNFByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.proccessedLeaveInFNFByUserId,
);
router.post(
  '/v1/revertLeaveAtFNF',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.revertLeaveAtFNF,
); // revert leaves which are lapse and encash at the thime of FNF

router.post(
  '/v1/fnfUsersList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.fnfUsersList,
);
router.post(
  '/v1/fnfRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.fnfRegister,
); // full and final register
router.post(
  '/v1/incentiveList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.incentiveList,
); // get incentive list which are not paid in salary
router.post(
  '/v1/payIncentive',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.payIncentive,
); // pay incentive in salary
router.post(
  '/v1/depositList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.depositList,
); // get deposit list which are not paid in salary
router.post(
  '/v1/payDeposit',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  FNFProcessController.payDeposit,
); // pay deposit in salary

module.exports = router;
