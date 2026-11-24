const express = require('express');
const authcontroller = require('../controllers/auth.controller');
const {
  verifyToken,
  verifyMultiUserLoginToken,
  verifyTwoFactorUserLoginToken,
} = require('../middleware/tokenverify');
const router = express.Router();
const { ProjectName, projectNamesList } = require('../utils/labelUtils');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const { uploadUserProfilePhoto } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const login_With_MobileNumber = [
  projectNamesList.TANKHWA_PATRA,
  projectNamesList.AKAR_AUTO,
  projectNamesList.REXTONE_INDUSTRIES,
];
router.post(
  '/v1/login',
  login_With_MobileNumber.includes(ProjectName)
    ? authcontroller.webLoginWithMobileNumberOnly
    : authcontroller.webLoginWithMobileNumberOrEmployeeCode,
); //  Web Login

router.post(
  '/v1/mobilelogin',
  login_With_MobileNumber.includes(ProjectName)
    ? authcontroller.mobileLoginWithMobileNumberOnly
    : authcontroller.mobileLoginWithMobileNumberOrEmployeeCode,
); //  Mobile Login

router.post('/v1/Facelogin', authcontroller.faceLoginWithMobileNumberOnly); // Used In TpMirror Login

router.post('/v1/changepassword', verifyToken, authcontroller.changepassword); //  Change Password

router.get('/v1/profile/:id', verifyToken, authcontroller.getprofile); //  Profile

router.post(
  '/v1/editprofile',
  uploadUserProfilePhoto,
  authcontroller.editprofile,
); //Used In Mobile

router.post('/v1/forgot', authcontroller.forgot); //  Used In Mobile

router.post('/v1/reset', authcontroller.otpverifyandchangepassword); //  Reset Password

router.post('/v1/dashboardcheck', verifyToken, authcontroller.dashboardcheck); //  Dashboard

router.post(
  '/v1/visitCustomerExpenseDashBoard',
  verifyToken,
  checkRolePermission,
  permissionAccess,
  authcontroller.visitCustomerExpenseDashBoard,
);

router.post(
  '/v1/finalcheckpermission',
  verifyToken,
  authcontroller.finalcheckpermission,
);

router.post('/v1/resetpassword', authcontroller.resetpassword);
router.get(
  '/v1/birthday',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIRTHDAYLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authcontroller.birthday,
);
router.get(
  '/v1/anniversary',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKANNIVERSARYLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authcontroller.anniversary,
);
router.get('/v1/user-pages', verifyToken, authcontroller.pageSearch); //Used In Web Only
router.post('/v1/userLogout', verifyToken, authcontroller.userLogout); // Used In Mobile

router.post(
  '/v1/changepasswordMultipleEmp',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USER_PASSWORD_CHANGE_PERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authcontroller.changepasswordMultipleEmp,
);

router.post('/v1/forgotpasswordOtpMARS', authcontroller.forgotpasswordOtpMARS); //  Forgot Password
router.post(
  '/v1/checkPasswordTokenMARS',
  authcontroller.checkPasswordTokenMARS,
); //  Forgot Password
router.post('/v1/sendForgotPasswordOTP', authcontroller.sendForgotPasswordOTP);
router.post('/v1/checkPasswordToken', authcontroller.checkPasswordToken);

router.post('/v1/sendCreateCompanyOTP', authcontroller.sendCreateCompanyOTP);
router.post(
  '/v1/verifyCreateCompanyOTP',
  authcontroller.verifyCreateCompanyOTP,
);
router.post(
  '/v1/multiUserLogin',
  verifyMultiUserLoginToken,
  authcontroller.webMultiUserLoginWithMobileNumberOnly,
); //  Web Login
router.post(
  '/v1/mobileMultiUserLogin',
  verifyMultiUserLoginToken,
  authcontroller.mobileMultiUserLoginWithMobileNumberOnly,
); //  Web Login

router.post(
  '/v1/webLoginTwoFactorAuth',
  verifyTwoFactorUserLoginToken,
  authcontroller.webLoginTwoFactorAuth,
); //  Web Login
router.post(
  '/v1/mobileLoginTwoFactorAuth',
  verifyTwoFactorUserLoginToken,
  authcontroller.mobileLoginTwoFactorAuth,
); //  Web Login
router.post(
  '/v1/sendForgotTwoFactorAuthOtp',
  verifyTwoFactorUserLoginToken,
  authcontroller.sendForgotTwoFactorAuthOtp,
); //  Web Login

router.get('/v1/decryptDownloadToken', authcontroller.decryptDownloadToken);

router.get('/v1/me', verifyToken, authcontroller.getCurrentUser);
module.exports = router;
