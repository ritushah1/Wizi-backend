const express = require('express');
const LmsCourse = require('../controllers/lmsCourse.controller');
const LmsContent = require('../controllers/lmsContent.controller');
const router = express.Router();

// Course routes
router.post('/v1/addCourse', LmsCourse.addCourse);
router.post('/v1/listCourse', LmsCourse.listCourse);
router.post('/v1/listCourseCatalog', LmsCourse.listCourseCatalog); // New endpoint for trainee catalog with department filtering
router.post('/v1/getCourseByID', LmsCourse.getCourseByID);
router.post('/v1/updateCourse', LmsCourse.updateCourse);
router.post('/v1/updateCourseStatus', LmsCourse.updateCourseStatus);
router.post('/v1/publishCourse', LmsCourse.publishCourse);
router.post('/v1/deleteCourse', LmsCourse.deleteCourse);

// Module routes
router.post('/v1/addModule', LmsCourse.addModule);
router.post('/v1/updateModule', LmsCourse.updateModule);
router.post('/v1/deleteModule', LmsCourse.deleteModule);

// Lesson routes
router.post('/v1/addLesson', LmsCourse.addLesson);
router.post('/v1/updateLesson', LmsCourse.updateLesson);
router.post('/v1/deleteLesson', LmsCourse.deleteLesson);

// Content routes
router.post('/v1/addContent', LmsCourse.addContent);
router.post('/v1/updateContent', LmsCourse.updateContent);
router.post('/v1/deleteContent', LmsCourse.deleteContent);

// Assessment routes
router.post('/v1/getCourseAssessments', LmsCourse.getCourseAssessments);
router.post('/v1/getCourseAssessments/:courseId', LmsCourse.getCourseAssessments); // Support URL param version
router.post('/v1/bindAssessment', LmsCourse.bindAssessment);
router.post('/v1/unbindAssessment', LmsCourse.unbindAssessment);
router.post('/v1/updateAssessmentRequired', LmsCourse.updateAssessmentRequired);

module.exports = router;
