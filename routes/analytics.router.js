const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// =====================================================
// ANALYTICS ROUTES
// =====================================================

// Dashboard metrics
router.get('/v1/dashboard-metrics', analyticsController.getDashboardMetrics);
router.post('/v1/dashboard-metrics', analyticsController.getDashboardMetrics);

// Department compliance
router.get('/v1/department-compliance', analyticsController.getDepartmentCompliance);
router.post('/v1/department-compliance', analyticsController.getDepartmentCompliance);

// Department metrics (LMS-style comprehensive analytics)
// Note: /departments/summary must come before /departments/:departmentId/users to avoid route conflict
router.get('/v1/departments/summary', analyticsController.getDepartmentSummary);
router.post('/v1/departments/summary', analyticsController.getDepartmentSummary);
router.get('/departments/summary', analyticsController.getDepartmentSummary);
router.post('/departments/summary', analyticsController.getDepartmentSummary);

router.get('/v1/departments/metrics', analyticsController.getDepartmentMetrics);
router.post('/v1/departments/metrics', analyticsController.getDepartmentMetrics);
router.get('/departments/metrics', analyticsController.getDepartmentMetrics);
router.post('/departments/metrics', analyticsController.getDepartmentMetrics);

// Department users
router.get('/v1/departments/:departmentId/users', analyticsController.getDepartmentUsers);
router.post('/v1/departments/:departmentId/users', analyticsController.getDepartmentUsers);
router.get('/departments/:departmentId/users', analyticsController.getDepartmentUsers);
router.post('/departments/:departmentId/users', analyticsController.getDepartmentUsers);

// Enrollment analytics
router.get('/v1/enrollments', analyticsController.getEnrollmentAnalytics);
router.post('/v1/enrollments', analyticsController.getEnrollmentAnalytics);

// Assessment analytics
router.get('/v1/assessments', analyticsController.getAssessmentAnalytics);
router.post('/v1/assessments', analyticsController.getAssessmentAnalytics);

// Compliance report
router.get('/v1/compliance', analyticsController.getComplianceReport);
router.post('/v1/compliance', analyticsController.getComplianceReport);

// Export report
router.get('/v1/export', analyticsController.exportReport);
router.post('/v1/export', analyticsController.exportReport);
router.post('/v1/export-course-completion', analyticsController.exportCourseCompletionReport);
router.post('/v1/export-certification-report', analyticsController.exportCertificationReport);
router.post('/v1/export-audit-trail', analyticsController.exportAuditTrailReport);
router.post('/v1/export-category-questions', analyticsController.exportCategoryQuestionsReport);

// =====================================================
// COMPREHENSIVE ANALYTICS ENDPOINTS
// =====================================================

// Course performance analytics
router.get('/v1/course-performance', analyticsController.getCoursePerformanceAnalytics);
router.post('/v1/course-performance', analyticsController.getCoursePerformanceAnalytics);

// Learning path analytics
router.get('/v1/learning-paths', analyticsController.getLearningPathAnalytics);
router.post('/v1/learning-paths', analyticsController.getLearningPathAnalytics);

// Time-based analytics
router.get('/v1/time-based', analyticsController.getTimeBasedAnalytics);
router.post('/v1/time-based', analyticsController.getTimeBasedAnalytics);

// Skill gap analysis
router.get('/v1/skill-gaps', analyticsController.getSkillGapAnalysis);
router.post('/v1/skill-gaps', analyticsController.getSkillGapAnalysis);

// =====================================================
// NEW ENDPOINTS FOR CHARTS
// =====================================================

// Weekly user activity (for line chart)
router.get('/v1/weekly-activity', analyticsController.getWeeklyUserActivity);
router.post('/v1/weekly-activity', analyticsController.getWeeklyUserActivity);

// Assessment score distribution (for bar chart)
router.get('/v1/score-distribution', analyticsController.getAssessmentScoreDistribution);
router.post('/v1/score-distribution', analyticsController.getAssessmentScoreDistribution);

// System audit trail (for compliance logging)
router.get('/v1/audit-trail', analyticsController.getSystemAuditTrail);
router.post('/v1/audit-trail', analyticsController.getSystemAuditTrail);

// =====================================================
// INDIVIDUAL COURSE ANALYTICS
// =====================================================

// Individual course analytics (detailed analytics for a specific course)
router.get('/v1/courses/:courseId/analytics', analyticsController.getCourseAnalytics);
router.post('/v1/courses/:courseId/analytics', analyticsController.getCourseAnalytics);
router.get('/courses/:courseId', analyticsController.getCourseAnalytics);
router.post('/courses/:courseId', analyticsController.getCourseAnalytics);

// Course learners analytics
router.get('/v1/courses/:courseId/learners', analyticsController.getCourseLearners);
router.post('/v1/courses/:courseId/learners', analyticsController.getCourseLearners);
router.get('/courses/:courseId/learners', analyticsController.getCourseLearners);
router.post('/courses/:courseId/learners', analyticsController.getCourseLearners);

module.exports = router;
