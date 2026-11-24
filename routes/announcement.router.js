const express = require('express');
const announcementController = require('../controllers/announcement.controller');
const { uploadAnnouncement } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  uploadAnnouncement,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  announcementController.postAddAnnouncement,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  announcementController.getAnnouncementById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  announcementController.getAnnouncementByCompanyId,
); //get by company id
router.post('/v1/getbyuserId', announcementController.getAnnouncementByUserId); //get by user id
router.post(
  '/v1/countUnreadAnnouncement',
  announcementController.countUnreadAnnouncement,
); //get by user id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  announcementController.postUpdateAnnouncement,
); //update announcement data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  announcementController.postDeleteAnnouncementById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANNOUNCEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  announcementController.poststatuschange,
); //status change

module.exports = router;
