const express = require('express');
const router = express.Router();
const LmsCourse = require('../controllers/lmsCourse.controller');
const LmsModule = require('../controllers/lmsModule.controller');
const LmsLesson = require('../controllers/lmsLesson.controller');
const LmsContent = require('../controllers/lmsContent.controller');

// =====================================================
// COURSE ROUTES
// =====================================================
router.post('/v1/addCourse', LmsCourse.addCourse);
router.post('/v1/listCourse', LmsCourse.listCourse);
router.post('/v1/getCourseByID', LmsCourse.getCourseByID);
router.post('/v1/updateCourse', LmsCourse.updateCourse);
router.post('/v1/updateCourseStatus', LmsCourse.updateCourseStatus);
router.post('/v1/deleteCourse', LmsCourse.deleteCourse);

// =====================================================
// MODULE ROUTES
// =====================================================
router.post('/v1/addModule', LmsModule.addModule);
router.post('/v1/getModulesByCourseId', LmsModule.getModulesByCourseId);
router.post('/v1/getModuleById', LmsModule.getModuleById);
router.post('/v1/updateModule', LmsModule.updateModule);
router.post('/v1/reorderModules', LmsModule.reorderModules);
router.post('/v1/deleteModule', LmsModule.deleteModule);

// =====================================================
// LESSON ROUTES
// =====================================================
router.post('/v1/addLesson', LmsLesson.addLesson);
router.post('/v1/getLessonsByModuleId', LmsLesson.getLessonsByModuleId);
router.post('/v1/getLessonById', LmsLesson.getLessonById);
router.post('/v1/updateLesson', LmsLesson.updateLesson);
router.post('/v1/reorderLessons', LmsLesson.reorderLessons);
router.post('/v1/deleteLesson', LmsLesson.deleteLesson);

// =====================================================
// CONTENT ROUTES
// =====================================================
router.post('/v1/addContent', LmsContent.addContent);
router.post('/v1/getContentByLessonId', LmsContent.getContentByLessonId);
router.post('/v1/getContentById', LmsContent.getContentById);
router.post('/v1/updateContent', LmsContent.updateContent);
router.post('/v1/reorderContent', LmsContent.reorderContent);
router.post('/v1/deleteContent', LmsContent.deleteContent);
router.post('/v1/uploadContentFile', LmsContent.uploadContentFile);

module.exports = router;
