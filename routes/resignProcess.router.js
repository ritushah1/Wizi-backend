const express = require('express');
const resignProcess = require('../controllers/resignProcess.controller');

const router = express.Router();
const { uploadResignProcess } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addresignProcess',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadResignProcess,
  resignProcess.postAddResignProcess,
);

router.post(
  '/v1/getAllresignProcess',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  resignProcess.getAllresignProcess,
);

router.post(
  '/v1/statusChanged',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  resignProcess.poststatus,
);
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  resignProcess.postUpdateResignProcess,
);

router.get(
  '/v1/resignProcessbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  resignProcess.getResignationProcessById,
);
router.put(
  '/v1/updateResignProcess/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONPROCESS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  resignProcess.updateResignProcess,
);
module.exports = router;
