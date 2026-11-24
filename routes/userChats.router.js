const express = require('express');
const UserChats = require('../controllers/userChats.controller');
const router = express.Router();
const { uploadUserChat } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/postSendMessage',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadUserChat,
  UserChats.postSendMessage,
); // to send msg
router.post(
  '/v2/getuserList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChats.getuserList_V2,
); // to get all user list
router.post(
  '/v1/getuserWiseChat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChats.getuserWiseChat,
); // userwise chat history
router.post(
  '/v1/postdeletechat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChats.postdeletechat,
); // delete msg
router.get(
  '/v1/getUserNewMessageCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChats.getUserNewMessageCount,
); // delete msg
router.post(
  '/v1/getUserLastChatBySenderID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChats.getUserLastChatBySenderID,
); // delete msg

module.exports = router;
