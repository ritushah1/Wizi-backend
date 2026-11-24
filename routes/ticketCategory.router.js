const express = require('express');
const ticketCategoryController = require('../controllers/ticketCategory.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.get(
  '/v1',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETCATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ticketCategoryController.listTicketCategory,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ticketCategoryController.getTicketCategoryDetails,
);
router.post(
  '/v1',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ticketCategoryController.createTicketCategory,
);
router.put(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ticketCategoryController.updateTicketCategory,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETCATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ticketCategoryController.deleteTicketCategory,
);
module.exports = router;
