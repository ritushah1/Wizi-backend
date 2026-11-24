const express = require('express');
const monthwiseCalender = require('../controllers/monthwiseCalender.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getCalenderMonthwiseUserCalender',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  monthwiseCalender.getCalenderMonthwiseUserCalender,
);
router.post('/v1/getUserAttendance', monthwiseCalender.getUserAttendance);

module.exports = router;
