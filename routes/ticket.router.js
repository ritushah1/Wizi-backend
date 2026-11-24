const express = require('express');
const ticketController = require('../controllers/ticket.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadTicketFiles } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const router = express.Router();

router.get(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNEDTICKETS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  ticketController.listTicket,
);
router.get(
  '/v1/report',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  ticketController.getTicketReport,
);
router.get(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNEDTICKETS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.EDIT,
      },
    ],
  }),
  verifyChildParent,
  ticketController.getTicketDetails,
);
router.post(
  '/v1',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadTicketFiles,
  ticketController.createTicket,
);
router.put(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNEDTICKETS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadTicketFiles,
  ticketController.updateTicket,
);
// Removed delete functionality for ticket
// router.delete(
//   '/v1/:id',
//   verifyChildParent,
//   ticketController.deleteTicket
// );
router.post(
  '/v1/:id/updates',
  verifyChildParent,
  uploadTicketFiles,
  ticketController.createTicketUpdate,
);
router.post(
  '/v1/alldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLTICKET,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  ticketController.Allticketdata,
);
router.post(
  '/v1/deleteTicketImagesById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYTICKET,
        operation: formOperation.ASSIGNEDTICKETS,
      },
    ],
  }),
  ticketController.deleteTicketImagesById,
);
//router

module.exports = router;
