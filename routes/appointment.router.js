const express = require('express');
const AppointmentLetter = require('../controllers/appointment.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APPOINTMENTLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  AppointmentLetter.addAppointmentLetter,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APPOINTMENTLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AppointmentLetter.updateAppointmentLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APPOINTMENTLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  AppointmentLetter.deleteAppointmentLetter,
);
router.post('/v1/get', AppointmentLetter.getAppointmentLetter);

module.exports = router;
