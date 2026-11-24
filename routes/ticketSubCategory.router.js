const express = require('express');
const ticketSubCategoryController = require('../controllers/ticketSubCategory.controller');
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
        permissionName: fromPermissionName.TICKETSUBCATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ticketSubCategoryController.listTicketSubCategory,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETSUBCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ticketSubCategoryController.getTicketSubCategoryDetails,
);
router.post(
  '/v1',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETSUBCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ticketSubCategoryController.createTicketSubCategory,
);
router.put(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETSUBCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ticketSubCategoryController.updateTicketSubCategory,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TICKETSUBCATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ticketSubCategoryController.deleteTicketSubCategory,
);
module.exports = router;
