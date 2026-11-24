const express = require('express');
const courseAuthorizationController = require('../controllers/courseAuthorization.controller');
const router = express.Router();

router.post('/v1/listCourseAuthRequest', courseAuthorizationController.listCourseAuthRequest);
router.post('/v1/getCourseAuthCount', courseAuthorizationController.getCourseAuthCount);
router.post('/v1/authorizationacceptreject', courseAuthorizationController.authorizationacceptreject);
router.post('/v1/submitCourseForApproval', courseAuthorizationController.submitCourseForApproval);
router.post('/v1/cancelCourseAuthorizationRequest', courseAuthorizationController.cancelCourseAuthorizationRequest);
router.post('/v1/getAllCourseAuthorizationAdmin', courseAuthorizationController.getAllCourseAuthorizationAdmin);
router.post('/v1/acceptRejectCourseAuthAdmin', courseAuthorizationController.acceptRejectCourseAuthAdmin);
router.get('/v1/getCourseAuthAdminById/:id', courseAuthorizationController.getCourseAuthAdminById);
router.post('/v1/getCourseAuthAdminById', courseAuthorizationController.getCourseAuthAdminById);

module.exports = router;
