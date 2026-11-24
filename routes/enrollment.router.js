const express = require('express');
const EnrollmentController = require('../controllers/enrollment.controller');

const router = express.Router();

// Get available courses for enrollment
router.get(
  '/available-courses',
  EnrollmentController.getAvailableCourses,
);

// Enroll in a course (body-based - for Angular/React compatibility)
router.post(
  '/',
  EnrollmentController.enrollCourse,
);

// Re-enroll in a course (body-based)
router.post(
  '/reenroll',
  EnrollmentController.reenrollCourse,
);

// Enroll in a course (URL param-based - legacy)
router.post(
  '/courses/:courseId',
  EnrollmentController.enrollCourse,
);

// Re-enroll in a course (URL param-based)
router.post(
  '/courses/:courseId/reenroll',
  EnrollmentController.reenrollCourse,
);

// Get my enrolled courses (with hyphen - standard RESTful)
router.get(
  '/my-courses',
  EnrollmentController.getMyCourses,
);

// Get my enrolled courses (with slash - for Angular compatibility)
router.post(
  '/my/courses',
  EnrollmentController.getMyCourses,
);

// Get enrollment progress (GET - RESTful)
router.get(
  '/:enrollmentId/progress',
  EnrollmentController.getProgress,
);

// Get enrollment progress (POST - Angular compatibility)
router.post(
  '/:enrollmentId/progress',
  EnrollmentController.getProgress,
);

// Get next content to study
router.get(
  '/:enrollmentId/next-content',
  EnrollmentController.getNextContent,
);

// Mark lesson as complete
router.post(
  '/:enrollmentId/lessons/:lessonId/complete',
  EnrollmentController.markLessonComplete,
);

// Save video progress (maxWatched & currentTime)
router.post(
  '/:enrollmentId/video-progress',
  EnrollmentController.saveVideoProgress,
);

// Mark content as complete
router.post(
  '/:enrollmentId/content/:contentId/complete',
  EnrollmentController.markContentComplete,
);

// Mark course as completed
router.post(
  '/:enrollmentId/complete',
  EnrollmentController.markCourseCompleted,
);

// Attempt course completion (Angular - checks requirements before completing)
router.post(
  '/:courseId/attempt-completion',
  EnrollmentController.attemptCourseCompletion,
);

// Check if user can get certificate for a course
router.get(
  '/courses/:courseId/can-get-certificate',
  EnrollmentController.canGetCertificate,
);

// Unenroll from course
router.delete(
  '/courses/:courseId',
  EnrollmentController.unenrollCourse,
);

module.exports = router;
