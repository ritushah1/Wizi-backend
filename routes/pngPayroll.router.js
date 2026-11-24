/** @format */

const express = require('express');
const PNGPayrollController = require('../controllers/pngPayroll.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/attendanceCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.attendanceCalculation,
); // attendance Calculation
router.post(
  '/v1/updateData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.updateData,
); // if manually change
router.post(
  '/v1/verifyAttendanceCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.verifyAttendanceCalculation,
); // verify attendance
router.post(
  '/v1/unverifyAttendanceCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.unverifyAttendanceCalculation,
); // verify attendance
router.post(
  '/v1/salaryCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.salaryCalculation,
); // salary calculation
router.post(
  '/v1/deleteSalary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.deleteSalary,
); //delete salary
router.post(
  '/v1/generateSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SALARYSLIP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.generateSalarySlip,
); //generate salary slip
router.post(
  '/v1/salarySlipStatusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.salarySlipStatusChange,
); // Release Unrelease salary slip
router.post(
  '/v1/generateBankSalaryFile',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGPayrollController.generateBankSalaryFile,
); // generate Bank salary file
module.exports = router;
