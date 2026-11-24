const express = require('express');
const CheckListQuestionController = require('../controllers/checkListQuestion.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/getAllCheckListQuestion',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTQUESTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CheckListQuestionController.getAllCheckListQuestion,
);
router.post(
  '/v1/postAddCheckListQuestion',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTQUESTION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CheckListQuestionController.postAddCheckListQuestion,
);
router.get(
  '/v1/getCheckListQuestionById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTQUESTION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListQuestionController.getCheckListQuestionById,
);
router.post(
  '/v1/postUpdateCheckListQuestion',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTQUESTION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListQuestionController.postUpdateCheckListQuestion,
);
router.post(
  '/v1/poststatuschangeCheckListQuestion',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTQUESTION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListQuestionController.poststatuschangeCheckListQuestion,
);
router.get(
  '/v1/getCheckListQuestionByuserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINCHECKLIST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CheckListQuestionController.getCheckListQuestionByuserId,
);
module.exports = router;
