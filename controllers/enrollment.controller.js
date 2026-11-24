const message = require('../response_message/message');
const { statusCodes, certificateExpiryTypeEnum } = require('../utils/commonVars');
const Enrollment = require('../models/enrollment');
const { Op, Sequelize } = require('sequelize');

/**
 * Get available courses for enrollment
 */
exports.getAvailableCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, level, search } = req.query;
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // TODO: Implement actual database query to fetch courses
    // For now, return mock data
    const courses = [];

    return res.status(200).json({
      status: 200,
      message: 'Available courses retrieved successfully',
      data: courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enroll in a course
 * Supports both:
 * - POST /enrollments with { courseId } in body (Angular/React)
 * - POST /enrollments/courses/:courseId with courseId in URL (legacy)
 */
exports.enrollCourse = async (req, res, next) => {
  try {
    // Support both URL param and body param for courseId
    const courseId = req.params.courseId || req.body.courseId;
    const reenroll = req.body.reenroll === true || req.body.reenroll === 'true';
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    if (!courseId) {
      return res.status(200).json({
        status: 400,
        message: 'Course ID is required',
      });
    }

    const Course = require('../models/course');
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(200).json({
        status: 404,
        message: 'Course not found',
      });
    }

    // Check if course deadline is set and passed
    if (course.deadline) {
      const deadlineDate = new Date(course.deadline);
      const rawDeadline = typeof course.deadline === 'string' ? course.deadline : '';
      if (rawDeadline.length === 10 || rawDeadline.includes('T00:00:00')) {
        deadlineDate.setHours(23, 59, 59, 999);
      }
      if (deadlineDate.getTime() < Date.now()) {
        return res.status(200).json({
          status: 400,
          message: 'Course deadline is gone. You cannot enroll in this course.',
        });
      }
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userMasterID,
        courseID: courseId,
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.isActive && !existingEnrollment.completedAt && !reenroll) {
        return res.status(200).json({
          status: 200,
          message: 'Already enrolled in this course',
          data: {
            id: existingEnrollment.enrollmentID,
            userId: existingEnrollment.userMasterID,
            courseId: existingEnrollment.courseID,
            enrollmentDate: existingEnrollment.enrolledAt,
            isCompleted: !!existingEnrollment.completedAt,
            progressPercentage: parseFloat(existingEnrollment.progressPercentage),
            durationInDays: existingEnrollment.enrolledAt 
              ? Math.ceil((new Date() - new Date(existingEnrollment.enrolledAt)) / (1000 * 60 * 60 * 24))
              : 0,
            lastAccessedAt: existingEnrollment.lastAccessedAt,
          },
        });
      } else {
        // Re-enroll / Reactivate - users can re-enroll anytime
        await existingEnrollment.update({
          isActive: true,
          completedAt: null,
          progressPercentage: 0,
          enrolledAt: new Date(),
          lastAccessedAt: new Date(),
          status: 1,
        });

        console.log(`✅ User ${userMasterID} re-enrolled in course ${courseId}`);

        return res.status(200).json({
          status: 200,
          message: 'Successfully re-enrolled in course',
          data: {
            id: existingEnrollment.enrollmentID,
            userId: existingEnrollment.userMasterID,
            courseId: existingEnrollment.courseID,
            enrollmentDate: existingEnrollment.enrolledAt,
            isCompleted: false,
            progressPercentage: 0,
            durationInDays: 0,
            lastAccessedAt: existingEnrollment.lastAccessedAt,
          },
        });
      }
    }

    // Create new enrollment
    const enrollment = await Enrollment.create({
      userMasterID,
      courseID: courseId,
      enrolledAt: new Date(),
      isActive: true,
      progressPercentage: 0,
      lastAccessedAt: new Date(),
      status: 1,
    });

    console.log(`✅ User ${userMasterID} enrolled in course ${courseId}`);

    // Delete course assignment notification for this user now that they've enrolled/started
    try {
      const UserInbox = require('../models/UserInbox');
      await UserInbox.destroy({
        where: {
          assignedTo: userMasterID,
          activityTable: Course.getTableName(),
          activityTablePK: courseId,
        },
      });
    } catch (inboxDelErr) {
      console.warn('⚠️ Error clearing course assignment notification on enrollment:', inboxDelErr.message);
    }

    return res.status(200).json({
      status: 200,
      message: 'Successfully enrolled in course',
      data: {
        id: enrollment.enrollmentID,
        userId: enrollment.userMasterID,
        courseId: enrollment.courseID,
        enrollmentDate: enrollment.enrolledAt,
        isCompleted: false,
        progressPercentage: 0,
        durationInDays: 0,
        lastAccessedAt: enrollment.lastAccessedAt,
      },
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    next(error);
  }
};

/**
 * Re-enroll in a completed or existing course
 */
exports.reenrollCourse = async (req, res, next) => {
  try {
    req.body.reenroll = true;
    return exports.enrollCourse(req, res, next);
  } catch (error) {
    console.error('Error in reenrollCourse:', error);
    next(error);
  }
};

/**
 * Get my enrolled courses
 * Supports both:
 * - GET /enrollments/my-courses with query params (RESTful)
 * - POST /enrollments/my/courses with body params (Angular compatibility)
 */
exports.getMyCourses = async (req, res, next) => {
  try {
    // Support both query params (GET) and body params (POST)
    const { page = 1, limit = 10, status } = { ...req.query, ...req.body };
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Auto-enroll user into eligible published non-self-enroll courses (auto-assigned to My Courses)
    try {
      const Course = require('../models/course');
      const LmsCourseDepartment = require('../models/lmsCourseDepartment');
      const LmsCourseDesignation = require('../models/lmsCourseDesignation');
      const LmsCourseUser = require('../models/lmsCourseUser');
      const EmployeeDepartment = require('../models/employeeDepartment');
      const EmployeeDesignation = require('../models/employeeDesignation');
      const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

      // Mandatory courses are automatically enrolled into My Courses for eligible users
      const autoAssignCourses = await Course.findAll({
        raw: true,
        where: {
          companyMasterID,
          isMandatory: true,
          courseStatus: 'PUBLISHED',
          status: 1,
        },
        attributes: ['id', 'title'],
      });

      if (autoAssignCourses && autoAssignCourses.length > 0) {
        const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
        const [userDeptRecord, userDesigRecord] = await Promise.all([
          EmployeeDepartment.findOne({
            raw: true,
            where: {
              userMasterID,
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['departmentID'],
          }),
          EmployeeDesignation.findOne({
            raw: true,
            where: {
              userMasterID,
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['designationID'],
          }),
        ]);

        const userDeptId = userDeptRecord?.departmentID;
        const userDesigId = userDesigRecord?.designationID;
        const autoAssignCourseIds = autoAssignCourses.map(c => c.id);

        const [courseDepts, courseDesigs, courseUsers, existingUserEnrollments] = await Promise.all([
          LmsCourseDepartment.findAll({
            raw: true,
            where: { courseId: { [Sequelize.Op.in]: autoAssignCourseIds }, status: 1 },
            attributes: ['courseId', 'departmentId'],
          }),
          LmsCourseDesignation.findAll({
            raw: true,
            where: { courseId: { [Sequelize.Op.in]: autoAssignCourseIds }, status: 1 },
            attributes: ['courseId', 'designationId'],
          }),
          LmsCourseUser.findAll({
            raw: true,
            where: { courseId: { [Sequelize.Op.in]: autoAssignCourseIds }, status: 1 },
            attributes: ['courseId', 'userMasterID'],
          }),
          Enrollment.findAll({
            raw: true,
            where: {
              userMasterID,
              courseID: { [Sequelize.Op.in]: autoAssignCourseIds },
              status: 1,
            },
            attributes: ['courseID'],
          }),
        ]);

        const existingEnrolledSet = new Set(existingUserEnrollments.map(e => e.courseID));

        const deptMap = new Map();
        courseDepts.forEach(d => {
          if (!deptMap.has(d.courseId)) deptMap.set(d.courseId, []);
          deptMap.get(d.courseId).push(d.departmentId);
        });

        const desigMap = new Map();
        courseDesigs.forEach(d => {
          if (!desigMap.has(d.courseId)) desigMap.set(d.courseId, []);
          desigMap.get(d.courseId).push(d.designationId);
        });

        const userMap = new Map();
        courseUsers.forEach(u => {
          if (!userMap.has(u.courseId)) userMap.set(u.courseId, []);
          userMap.get(u.courseId).push(u.userMasterID);
        });

        const autoEnrollRecords = [];

        for (const course of autoAssignCourses) {
          if (existingEnrolledSet.has(course.id)) continue;

          const depts = deptMap.get(course.id);
          const desigs = desigMap.get(course.id);
          const users = userMap.get(course.id);

          const hasUserRestriction = users && users.length > 0;
          const hasDeptRestriction = depts && depts.length > 0;
          const hasDesigRestriction = desigs && desigs.length > 0;

          let isEligible = false;

          if (hasUserRestriction) {
            isEligible = users.includes(userMasterID);
          } else if (hasDeptRestriction && hasDesigRestriction) {
            const matchesDept = Boolean(userDeptId && depts.includes(userDeptId));
            const matchesDesig = Boolean(userDesigId && desigs.includes(userDesigId));
            isEligible = matchesDept && matchesDesig;
          } else if (hasDeptRestriction) {
            isEligible = Boolean(userDeptId && depts.includes(userDeptId));
          } else if (hasDesigRestriction) {
            isEligible = Boolean(userDesigId && desigs.includes(userDesigId));
          } else {
            isEligible = true;
          }

          if (isEligible) {
            autoEnrollRecords.push({
              userMasterID,
              courseID: course.id,
              enrolledAt: new Date(),
              isActive: true,
              progressPercentage: 0,
              lastAccessedAt: new Date(),
              status: 1,
            });
          }
        }

        if (autoEnrollRecords.length > 0) {
          await Enrollment.bulkCreate(autoEnrollRecords);
          console.log(`✅ Auto-enrolled user ${userMasterID} in ${autoEnrollRecords.length} non-self-enroll course(s)`);

          const UserInbox = require('../models/UserInbox');
          const moment = require('moment');
          const sendNotificationInbox = autoEnrollRecords.map((r) => {
            const crs = autoAssignCourses.find(c => c.id === r.courseID);
            const deadlineText = crs?.deadline ? ` Completion deadline: ${moment(crs.deadline).format('DD/MM/YYYY')}.` : '.';
            return {
              assignedTo: userMasterID,
              assignedBy: null,
              activityTable: Course.getTableName(),
              activityTablePK: r.courseID,
              companyMasterID,
              message: `You have been assigned to course "${crs?.title || 'Course'}"${deadlineText}`,
            };
          });

          if (sendNotificationInbox.length > 0) {
            await UserInbox.bulkCreate(sendNotificationInbox);
          }
        }
      }
    } catch (autoEnrollErr) {
      console.error('Error during auto-enrollment of non-self-enroll courses:', autoEnrollErr);
    }

    // Build where clause
    const whereClause = {
      userMasterID,
      status: 1,
    };

    // Filter by completion status if provided
    if (status === 'IN_PROGRESS') {
      whereClause.completedAt = null;
      whereClause.isActive = true;
    } else if (status === 'COMPLETED') {
      whereClause.completedAt = { [Op.ne]: null };
    }

    // Get enrollments from database
    const enrollments = await Enrollment.findAll({
      where: whereClause,
      order: [['enrolledAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    const total = await Enrollment.count({ where: whereClause });

    console.log(`📚 Fetching enrollments for user ${userMasterID}: ${enrollments.length} found`);

    // Fetch course details and certificates for all enrollments
    const courseIds = enrollments.map(e => e.courseID);
    let coursesMap = {};
    let certificatesMap = {};
    if (courseIds.length > 0) {
      const Course = require('../models/course');
      const Certificate = require('../models/certificate');
      const CategoryMaster = require('../models/categoryMaster');
      const [courses, certificates] = await Promise.all([
        Course.findAll({
          where: { id: courseIds, status: 1 },
          attributes: ['id', 'title', 'description', 'coverImageUrl', 'certificateEnabled', 'isMandatory', 'isSelfEnroll', 'level', 'category', 'companyMasterID', 'deadline', 'allowReassignmentOnCertExpiry', 'certificateExpiryType', 'certificateExpiryDays'],
        }),
        Certificate.findAll({
          where: {
            userId: userMasterID,
            courseId: courseIds,
            status: 1,
          },
          order: [['createdAt', 'DESC']],
        }),
      ]);
      courses.forEach(c => { coursesMap[c.id] = c; });
      certificates.forEach(c => {
        if (!certificatesMap[c.courseId]) {
          certificatesMap[c.courseId] = c;
        }
      });

      const catIds = [...new Set(courses.map(c => c.category).filter(Boolean))];
      var categoriesMap = {};
      if (catIds.length > 0) {
        const cats = await CategoryMaster.findAll({
          where: { categoryMasterID: catIds, status: 1 },
          attributes: ['categoryMasterID', 'categoryName'],
          raw: true,
        });
        cats.forEach(cat => { categoriesMap[String(cat.categoryMasterID)] = cat.categoryName; });
      }
    }

    // Map to response format
    const mappedEnrollments = enrollments.map((enrollment) => {
      const course = coursesMap[enrollment.courseID] || {};
      const cert = certificatesMap[enrollment.courseID];
      const isCertExpired = Boolean(
        enrollment.isCertificateExpired ||
        (cert && cert.expiresAt && new Date() > new Date(cert.expiresAt))
      );

      return {
        id: enrollment.enrollmentID,
        courseId: enrollment.courseID,
        courseName: course.title || 'Unknown Course',
        title: course.title || 'Unknown Course',
        description: course.description || '',
        courseDescription: course.description || '',
        coverImageUrl: course.coverImageUrl || '',
        certificateEnabled: course.certificateEnabled !== false,
        isMandatory: Boolean(course.isMandatory),
        isSelfEnroll: Boolean(course.isSelfEnroll),
        difficulty: course.level ? course.level.toLowerCase() : 'beginner',
        level: course.level || 'BEGINNER',
        category: course.category,
        categoryName: categoriesMap[String(course.category)] || course.category,
        companyMasterID: course.companyMasterID,
        deadline: course.deadline || null,
        enrollmentDate: enrollment.enrolledAt,
        isCompleted: !!enrollment.completedAt,
        isCertificateExpired: isCertExpired,
        certificateExpiresAt: cert?.expiresAt || null,
        certificateNumber: cert?.certificateNumber || null,
        certificateId: cert?.id || null,
        progressPercentage: parseFloat(enrollment.progressPercentage),
        durationInDays: enrollment.enrolledAt 
          ? Math.ceil((new Date() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60 * 24))
          : 0,
        lastAccessedAt: enrollment.lastAccessedAt,
      };
    });

    return res.status(200).json({
      status: 200,
      message: 'My courses retrieved successfully',
      data: mappedEnrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching my courses:', error);
    next(error);
  }
};

/**
 * Get enrollment progress
 */
exports.getProgress = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Verify enrollment exists and belongs to user
    const enrollment = await Enrollment.findOne({
      where: {
        enrollmentID: enrollmentId,
        userMasterID,
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    const LmsProgress = require('../models/lmsProgress');
    const LmsModule = require('../models/lmsModule');
    const LmsLesson = require('../models/lmsLesson');
    const Course = require('../models/course');

    // Get course with modules and lessons
    const course = await Course.findOne({
      where: { id: enrollment.courseID, status: 1 },
      include: [{
        model: LmsModule,
        as: 'modules',
        where: { status: 1 },
        required: false,
        include: [{
          model: LmsLesson,
          as: 'lessons',
          where: { status: 1 },
          required: false,
        }],
      }],
    });

    if (!course) {
      return res.status(200).json({
        status: 404,
        message: 'Course not found',
      });
    }

    // Build module progress array
    const moduleProgress = [];
    
    if (course.modules && course.modules.length > 0) {
      for (const module of course.modules) {
        const lessonProgress = [];
        
        if (module.lessons && module.lessons.length > 0) {
          for (const lesson of module.lessons) {
            const progress = await LmsProgress.findOne({
              where: {
                enrollmentID: parseInt(enrollmentId),
                itemType: 'LESSON',
                itemID: parseInt(lesson.id),
                status: 1,
              },
            });

            const isLessonDone = progress ? (progress.isCompleted === true || progress.isCompleted === 1 || progress.isCompleted === 't' || progress.isCompleted === 'true') : false;

            lessonProgress.push({
              lessonId: lesson.id,
              lessonName: lesson.title,
              isCompleted: isLessonDone,
              completedAt: progress ? progress.completedAt : null,
            });
          }
        }

        // Get module progress
        const moduleProgressData = await LmsProgress.findOne({
          where: {
            enrollmentID: parseInt(enrollmentId),
            itemType: 'MODULE',
            itemID: parseInt(module.id),
            status: 1,
          },
        });

        moduleProgress.push({
          moduleId: module.id,
          moduleName: module.title,
          progressPercentage: moduleProgressData ? parseFloat(moduleProgressData.progressPercentage) : 0,
          isCompleted: moduleProgressData ? moduleProgressData.isCompleted : false,
          lessonProgress,
        });
      }
    }

    // Fetch all content progress items (e.g. video watched times and completions)
    const contentProgressList = await LmsProgress.findAll({
      where: {
        enrollmentID: parseInt(enrollmentId),
        itemType: 'CONTENT',
        status: 1,
      },
    });

    const contentProgress = contentProgressList.map(cp => ({
      contentId: cp.itemID,
      videoMaxWatched: cp.videoMaxWatched || 0,
      videoCurrentTime: cp.videoCurrentTime || 0,
      isCompleted: cp.isCompleted || false,
    }));

    const progress = {
      enrollmentId,
      courseId: course.id,
      courseName: course.title,
      progressPercentage: parseFloat(enrollment.progressPercentage),
      isCompleted: !!enrollment.completedAt,
      completedAt: enrollment.completedAt,
      moduleProgress,
      contentProgress,
      assessmentResults: [], // TODO: Implement assessment results
    };

    return res.status(200).json({
      status: 200,
      message: 'Progress retrieved successfully',
      ...progress,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    next(error);
  }
};

/**
 * Get next content to study
 */
exports.getNextContent = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // TODO: Implement logic to find next incomplete content
    const nextContent = {
      type: 'LESSON',
      id: '',
      title: '',
      moduleId: '',
      moduleName: '',
      sequenceOrder: 1,
    };

    return res.status(200).json({
      status: 200,
      message: 'Next content retrieved successfully',
      data: nextContent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark lesson as complete
 */
exports.markLessonComplete = async (req, res, next) => {
  try {
    const { enrollmentId, lessonId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Verify enrollment exists and belongs to user
    const enrollment = await Enrollment.findOne({
      where: {
        enrollmentID: enrollmentId,
        userMasterID,
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    const LmsProgress = require('../models/lmsProgress');
    const LmsLesson = require('../models/lmsLesson');
    const LmsContent = require('../models/lmsContent');
    const LmsModule = require('../models/lmsModule');
    const Course = require('../models/course');

    // Get lesson with its contents
    const lesson = await LmsLesson.findOne({
      where: { id: lessonId, status: 1 },
      include: [{
        model: LmsContent,
        as: 'contents',
        where: { status: 1 },
        required: false,
      }],
    });

    if (!lesson) {
      return res.status(200).json({
        status: 404,
        message: 'Lesson not found',
      });
    }

    // Mark lesson as completed
    const existingLessonProgress = await LmsProgress.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        itemType: 'LESSON',
        itemID: parseInt(lessonId),
        status: 1,
      },
    });

    if (existingLessonProgress) {
      await existingLessonProgress.update({
        progressPercentage: 100,
        isCompleted: true,
        completedAt: new Date(),
        updatedBy: userMasterID,
        updatedByIp: req.ip,
      });
    } else {
      await LmsProgress.create({
        enrollmentID: parseInt(enrollmentId),
        itemType: 'LESSON',
        itemID: parseInt(lessonId),
        progressPercentage: 100,
        isCompleted: true,
        completedAt: new Date(),
        status: 1,
        createdBy: userMasterID,
        createdByIp: req.ip,
      });
    }

    // Mark all content items in this lesson as completed
    if (lesson.contents && lesson.contents.length > 0) {
      for (const content of lesson.contents) {
        const existingContentProgress = await LmsProgress.findOne({
          where: {
            enrollmentID: parseInt(enrollmentId),
            itemType: 'CONTENT',
            itemID: parseInt(content.id),
            status: 1,
          },
        });

        if (existingContentProgress) {
          await existingContentProgress.update({
            progressPercentage: 100,
            isCompleted: true,
            completedAt: new Date(),
            updatedBy: userMasterID,
            updatedByIp: req.ip,
          });
        } else {
          await LmsProgress.create({
            enrollmentID: parseInt(enrollmentId),
            itemType: 'CONTENT',
            itemID: parseInt(content.id),
            progressPercentage: 100,
            isCompleted: true,
            completedAt: new Date(),
            status: 1,
            createdBy: userMasterID,
            createdByIp: req.ip,
          });
        }
      }
      console.log(`✅ Marked ${lesson.contents.length} content items as complete for lesson ${lessonId}`);
    }

    // Get course with all modules and lessons to calculate progress
    const course = await Course.findOne({
      where: { id: parseInt(enrollment.courseID), status: 1 },
      include: [{
        model: LmsModule,
        as: 'modules',
        where: { status: 1 },
        required: false,
        include: [{
          model: LmsLesson,
          as: 'lessons',
          where: { status: 1 },
          required: false,
        }],
      }],
    });

    if (course && course.modules) {
      let totalLessons = 0;
      let completedLessons = 0;

      // Calculate module and course progress
      for (const module of course.modules) {
        if (module.lessons && module.lessons.length > 0) {
          let moduleLessons = 0;
          let moduleCompletedLessons = 0;

          for (const lessonItem of module.lessons) {
            totalLessons++;
            moduleLessons++;

            const lessonProgress = await LmsProgress.findOne({
              where: {
                enrollmentID: parseInt(enrollmentId),
                itemType: 'LESSON',
                itemID: parseInt(lessonItem.id),
                status: 1,
              },
            });

            if (lessonProgress && (lessonProgress.isCompleted === true || lessonProgress.isCompleted === 1)) {
              completedLessons++;
              moduleCompletedLessons++;
            }
          }

          // Update module progress
          const moduleProgressPercentage = moduleLessons > 0
            ? (moduleCompletedLessons / moduleLessons) * 100
            : 0;

          const existingModProgress = await LmsProgress.findOne({
            where: {
              enrollmentID: parseInt(enrollmentId),
              itemType: 'MODULE',
              itemID: parseInt(module.id),
              status: 1,
            },
          });

          if (existingModProgress) {
            await existingModProgress.update({
              progressPercentage: moduleProgressPercentage,
              isCompleted: moduleProgressPercentage >= 100,
              completedAt: moduleProgressPercentage >= 100 ? new Date() : null,
              updatedBy: userMasterID,
              updatedByIp: req.ip,
            });
          } else {
            await LmsProgress.create({
              enrollmentID: parseInt(enrollmentId),
              itemType: 'MODULE',
              itemID: parseInt(module.id),
              progressPercentage: moduleProgressPercentage,
              isCompleted: moduleProgressPercentage >= 100,
              completedAt: moduleProgressPercentage >= 100 ? new Date() : null,
              status: 1,
              createdBy: userMasterID,
              createdByIp: req.ip,
            });
          }
        }
      }

      // Calculate overall course progress
      const courseProgressPercentage = totalLessons > 0
        ? (completedLessons / totalLessons) * 100
        : 0;
      const roundedProgress = Math.round(courseProgressPercentage * 100) / 100;

      // Update enrollment progress
      await enrollment.update({
        progressPercentage: roundedProgress,
        lastAccessedAt: new Date(),
      });

      // Update course progress
      const existingCourseProgress = await LmsProgress.findOne({
        where: {
          enrollmentID: parseInt(enrollmentId),
          itemType: 'COURSE',
          itemID: parseInt(enrollment.courseID),
          status: 1,
        },
      });

      if (existingCourseProgress) {
        await existingCourseProgress.update({
          progressPercentage: roundedProgress,
          isCompleted: roundedProgress >= 100,
          completedAt: roundedProgress >= 100 ? new Date() : null,
          updatedBy: userMasterID,
          updatedByIp: req.ip,
        });
      } else {
        await LmsProgress.create({
          enrollmentID: parseInt(enrollmentId),
          itemType: 'COURSE',
          itemID: parseInt(enrollment.courseID),
          progressPercentage: roundedProgress,
          isCompleted: roundedProgress >= 100,
          completedAt: roundedProgress >= 100 ? new Date() : null,
          status: 1,
          createdBy: userMasterID,
          createdByIp: req.ip,
        });
      }

      console.log(`📊 Course progress updated: ${roundedProgress}% (${completedLessons}/${totalLessons} lessons)`);

      return res.status(200).json({
        status: 200,
        message: 'Lesson marked as complete',
        data: {
          lessonId,
          isCompleted: true,
          completedAt: new Date().toISOString(),
          progressPercentage: roundedProgress,
        },
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Lesson marked as complete',
      data: {
        lessonId,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error marking lesson complete:', error);
    next(error);
  }
};

/**
 * Mark content as complete
 */
exports.markContentComplete = async (req, res, next) => {
  try {
    const { enrollmentId, contentId } = req.params;
    const userMasterID = req.userDetails?.userMasterId || req.user?.userMasterID || req.user?.id;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    const LmsProgress = require('../models/lmsProgress');
    let progress = await LmsProgress.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        itemType: 'CONTENT',
        itemID: parseInt(contentId),
        status: 1,
      },
    });

    if (progress) {
      await progress.update({
        isCompleted: true,
        progressPercentage: 100,
        completedAt: progress.completedAt || new Date(),
        updatedBy: userMasterID,
        updatedByIp: req.ip,
      });
    } else {
      progress = await LmsProgress.create({
        enrollmentID: parseInt(enrollmentId),
        itemType: 'CONTENT',
        itemID: parseInt(contentId),
        progressPercentage: 100,
        isCompleted: true,
        completedAt: new Date(),
        status: 1,
        createdBy: userMasterID,
        createdByIp: req.ip,
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Content marked as complete',
      data: {
        contentId: parseInt(contentId),
        isCompleted: true,
        completedAt: progress.completedAt,
      },
    });
  } catch (error) {
    console.error('Error marking content complete:', error);
    next(error);
  }
};

/**
 * Mark course as completed
 */
exports.markCourseCompleted = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Verify enrollment exists and belongs to user
    const enrollment = await Enrollment.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        userMasterID,
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    // Check if course content is 100% complete
    if (parseFloat(enrollment.progressPercentage || '0') < 100) {
      return res.status(200).json({
        status: 400,
        message: 'Course content must be 100% complete before marking as completed',
        data: {
          enrollmentId,
          progressPercentage: parseFloat(enrollment.progressPercentage || '0'),
        },
      });
    }

    // Check for required assessments (both PRE and POST)
    const CourseAssessment = require('../models/courseAssessment');
    const AssessmentAttempt = require('../models/assessmentAttempt');
    const Assessment = require('../models/assessment');
    
    const allCourseAssessments = await CourseAssessment.findAll({
      where: {
        courseId: parseInt(enrollment.courseID),
        [Sequelize.Op.or]: [{ status: 1 }, { status: null }],
      },
      raw: true,
    });

    const requiredAssessments = allCourseAssessments.filter((a) => {
      return (
        a.isRequired === true ||
        a.isRequired === 't' ||
        a.isRequired === 1 ||
        a.isRequired === '1' ||
        a.isRequired === 'true' ||
        a.isRequired === 'TRUE'
      );
    });

    console.log(`🔍 Found ${allCourseAssessments.length} total assessments (${requiredAssessments.length} required) for course ${enrollment.courseID}`);

    // Validate each required assessment has been passed
    for (const reqAssessment of requiredAssessments) {
      const assessmentId = parseInt(reqAssessment.assessmentId);
      const assessmentType = reqAssessment.type || 'ASSESSMENT';

      // Fetch assessment configuration for passingPercentage
      const assessmentObj = await Assessment.findOne({
        where: { assessmentID: assessmentId },
        raw: true,
      });
      const passingPercentage = assessmentObj?.passingPercentage || 70;

      // Find all completed attempts for this assessment by this user
      const attempts = await AssessmentAttempt.findAll({
        where: {
          assessmentID: assessmentId,
          userMasterID,
        },
        raw: true,
      });

      const completedAttempts = (attempts || []).filter(att => att.status === 1 || !!att.submittedAt);

      if (!completedAttempts || completedAttempts.length === 0) {
        console.log(`❌ User has not attempted required ${assessmentType} (ID: ${assessmentId})`);
        return res.status(200).json({
          status: 400,
          message: `You must complete the required ${assessmentType.replace('_', ' ').toLowerCase()} before completing this course`,
          data: {
            enrollmentId,
            missingAssessment: assessmentType,
            assessmentId,
          },
        });
      }

      const hasPassed = completedAttempts.some((att) => {
        const isPassedBool = att.isPassed === true || att.isPassed === 1 || att.isPassed === 'true' || att.isPassed === 't';
        const scoreNum = typeof att.score === 'number' ? att.score : parseFloat(att.score || '0');
        const hasValidScore = att.score !== null && att.score !== undefined && !isNaN(scoreNum);
        return isPassedBool || (hasValidScore && scoreNum >= passingPercentage);
      });

      if (!hasPassed) {
        console.log(`❌ User has not passed required ${assessmentType} (ID: ${assessmentId})`);
        return res.status(200).json({
          status: 400,
          message: `You must pass the required ${assessmentType.replace('_', ' ').toLowerCase()} before completing this course`,
          data: {
            enrollmentId,
            failedAssessment: assessmentType,
            assessmentId,
          },
        });
      }

      console.log(`✅ User passed required ${assessmentType}`);
    }

    // Mark enrollment as complete if not already
    if (!enrollment.completedAt) {
      await enrollment.update({
        completedAt: new Date(),
        progressPercentage: 100,
        lastAccessedAt: new Date(),
      });

      // Send course completion notification
      try {
        const UserInbox = require('../models/UserInbox');
        const Course = require('../models/course');
        const courseRecord = await Course.findOne({
          where: { id: parseInt(enrollment.courseID) },
          attributes: ['id', 'title', 'companyMasterID'],
          raw: true,
        });
        await UserInbox.create({
          assignedTo: userMasterID,
          assignedBy: null,
          activityTable: Course.getTableName(),
          activityTablePK: parseInt(enrollment.courseID),
          companyMasterID: courseRecord?.companyMasterID || companyMasterID,
          message: `Congratulations! You have successfully completed the course "${courseRecord?.title || 'Course'}".`,
        });
      } catch (inboxErr) {
        console.error('Error creating course completion inbox notification:', inboxErr);
      }
    }

    const LmsProgress = require('../models/lmsProgress');

    // Mark course progress as complete
    const existingCourseProgress = await LmsProgress.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        itemType: 'COURSE',
        itemID: parseInt(enrollment.courseID),
        status: 1,
      },
    });

    if (existingCourseProgress) {
      await existingCourseProgress.update({
        progressPercentage: 100,
        isCompleted: true,
        completedAt: new Date(),
      });
    } else {
      await LmsProgress.create({
        enrollmentID: parseInt(enrollmentId),
        itemType: 'COURSE',
        itemID: parseInt(enrollment.courseID),
        progressPercentage: 100,
        isCompleted: true,
        completedAt: new Date(),
        status: 1,
        createdBy: userMasterID,
        createdByIp: req.ip,
      });
    }

    console.log(`🎉 User ${userMasterID} completed course ${enrollment.courseID}`);

    // Check if course has certificates enabled
    const Course = require('../models/course');
    const course = await Course.findOne({
      where: { id: parseInt(enrollment.courseID), status: 1 },
      attributes: ['id', 'title', 'certificateEnabled', 'certificateExpiryType', 'certificateExpiryDays', 'allowReenrollment'],
    });

    const isCertificateEnabled = course ? (course.certificateEnabled !== false) : true;

    // Auto-issue certificate if eligible and enabled
    let issuedCertificate = null;
    if (isCertificateEnabled) {
      try {
        const Certificate = require('../models/certificate');
        const crypto = require('crypto');
        
        const existingCertificate = await Certificate.findOne({
          where: {
            userId: userMasterID,
            courseId: parseInt(enrollment.courseID),
            status: 1,
          },
        });

        // Calculate expiresAt based on course rule
        let expiresAt = null;
        if (course && course.certificateExpiryType === certificateExpiryTypeEnum.DAYS && course.certificateExpiryDays > 0) {
          const days = parseInt(course.certificateExpiryDays);
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        if (!existingCertificate) {
          const prefix = 'CERT';
          const timestamp = Date.now().toString().slice(-8);
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          const certificateNumber = `${prefix}-${timestamp}-${random}`;

          const verificationHash = crypto
            .createHash('sha256')
            .update(`${userMasterID}-${enrollment.courseID}-${certificateNumber}-${Date.now()}`)
            .digest('hex');

          const completionTimeHours = enrollment.enrolledAt 
            ? Math.round((new Date() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60))
            : null;

          issuedCertificate = await Certificate.create({
            id: crypto.randomUUID ? crypto.randomUUID() : undefined,
            certificateNumber,
            issuedAt: new Date(),
            expiresAt: expiresAt,
            isValid: true,
            finalScore: enrollment.progressPercentage || 100,
            finalPercentage: enrollment.progressPercentage || 100,
            completionTimeHours,
            verificationHash,
            userId: userMasterID,
            courseId: parseInt(enrollment.courseID),
            status: 1,
            createdBy: userMasterID,
            createdByIp: req.ip || req.connection.remoteAddress,
          });

          console.log(`🎓 Certificate ${certificateNumber} issued to user ${userMasterID} for course ${enrollment.courseID} (Expires: ${expiresAt})`);
        } else {
          // Re-issued / renewed upon course re-completion
          await existingCertificate.update({
            issuedAt: new Date(),
            expiresAt: expiresAt,
            isValid: true,
            finalScore: enrollment.progressPercentage || 100,
            finalPercentage: enrollment.progressPercentage || 100,
          });
          issuedCertificate = existingCertificate;
          console.log(`ℹ️ Certificate updated for user ${userMasterID} and course ${enrollment.courseID}`);
        }
      } catch (certError) {
        console.error('Error auto-issuing certificate:', certError);
      }
    } else {
      console.log(`ℹ️ Certificates are disabled for course ${enrollment.courseID}, skipping certificate issuance.`);
    }

    return res.status(200).json({
      status: 200,
      message: 'Course marked as completed',
      data: {
        enrollmentId,
        isCompleted: true,
        completedAt: enrollment.completedAt || new Date(),
        certificate: issuedCertificate,
      },
    });
  } catch (error) {
    console.error('Error marking course complete:', error);
    next(error);
  }
};

/**
 * Attempt course completion (Angular compatibility)
 * Similar to markCourseCompleted but accepts courseId and finds enrollment
 * POST /enrollments/:courseId/attempt-completion
 */
exports.attemptCourseCompletion = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Find enrollment for this course
    const enrollment = await Enrollment.findOne({
      where: {
        courseID: courseId,
        userMasterID,
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    // Forward to markCourseCompleted logic
    req.params.enrollmentId = enrollment.enrollmentID;
    return exports.markCourseCompleted(req, res, next);
  } catch (error) {
    console.error('Error attempting course completion:', error);
    next(error);
  }
};

/**
 * Unenroll from course
 */
exports.unenrollCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      where: {
        userMasterID,
        courseID: courseId,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    if (!enrollment.isActive) {
      return res.status(200).json({
        status: 400,
        message: 'User is not actively enrolled in this course',
      });
    }

    // Deactivate enrollment (soft delete)
    await enrollment.update({
      isActive: false,
      status: 0,
    });

    console.log(`❌ User ${userMasterID} unenrolled from course ${courseId}`);

    return res.status(200).json({
      status: 200,
      message: 'Successfully unenrolled from course',
    });
  } catch (error) {
    console.error('Error unenrolling from course:', error);
    next(error);
  }
};

/**
 * Check if user can get certificate for a course
 */
exports.canGetCertificate = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userMasterID = req.userDetails?.userMasterId;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: {
        courseID: courseId,
        userMasterID,
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
        data: {
          canGet: false,
          reason: 'You are not enrolled in this course',
        },
      });
    }

    // Check if course has certificates enabled
    const Course = require('../models/course');
    const course = await Course.findOne({
      where: { id: parseInt(courseId), status: 1 },
      attributes: ['id', 'title', 'certificateEnabled'],
    });

    if (!course || course.certificateEnabled === false) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate eligibility check completed',
        data: {
          canGet: false,
          reason: 'Certificates are not enabled for this course',
        },
      });
    }

    // Check if course is completed
    if (!enrollment.completedAt) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate eligibility check completed',
        data: {
          canGet: false,
          reason: 'You must complete the course before getting your certificate',
        },
      });
    }

    // Check if certificate already exists
    const Certificate = require('../models/certificate');
    const existingCertificate = await Certificate.findOne({
      where: {
        userId: userMasterID,
        courseId: courseId,
        status: 1,
      },
    });

    if (existingCertificate) {
      return res.status(200).json({
        status: 200,
        message: 'Certificate eligibility check completed',
        data: {
          canGet: true,
          certificateId: existingCertificate.id,
          reason: 'Certificate already issued',
        },
      });
    }

    // User can get certificate
    return res.status(200).json({
      status: 200,
      message: 'Certificate eligibility check completed',
      data: {
        canGet: true,
        reason: 'You are eligible to receive your certificate',
      },
    });
  } catch (error) {
    console.error('Error checking certificate eligibility:', error);
    next(error);
  }
};

/**
 * Save video progress (maxWatched and currentTime) for a content item in an enrollment
 */
exports.saveVideoProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { contentId, maxWatched, currentTime, isCompleted } = req.body;
    const userMasterID = req.userDetails?.userMasterId || req.user?.userMasterID || req.user?.id;

    if (!enrollmentId || !contentId) {
      return res.status(200).json({
        status: 400,
        message: 'Enrollment ID and Content ID are required',
      });
    }

    const LmsProgress = require('../models/lmsProgress');
    const Enrollment = require('../models/enrollment');

    const enrollment = await Enrollment.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        status: 1,
      },
    });

    if (!enrollment) {
      return res.status(200).json({
        status: 404,
        message: 'Enrollment not found',
      });
    }

    let progress = await LmsProgress.findOne({
      where: {
        enrollmentID: parseInt(enrollmentId),
        itemType: 'CONTENT',
        itemID: parseInt(contentId),
        status: 1,
      },
    });

    const parsedMaxWatched = parseFloat(maxWatched) || 0;
    const parsedCurrentTime = parseFloat(currentTime) || 0;

    if (progress) {
      const updatedMaxWatched = Math.max(progress.videoMaxWatched || 0, parsedMaxWatched);
      await progress.update({
        videoMaxWatched: updatedMaxWatched,
        videoCurrentTime: parsedCurrentTime,
        isCompleted: isCompleted ? true : progress.isCompleted,
        completedAt: isCompleted ? (progress.completedAt || new Date()) : progress.completedAt,
        updatedBy: userMasterID,
        updatedByIp: req.ip,
      });
    } else {
      progress = await LmsProgress.create({
        enrollmentID: parseInt(enrollmentId),
        itemType: 'CONTENT',
        itemID: parseInt(contentId),
        videoMaxWatched: parsedMaxWatched,
        videoCurrentTime: parsedCurrentTime,
        progressPercentage: isCompleted ? 100 : 0,
        isCompleted: isCompleted ? true : false,
        completedAt: isCompleted ? new Date() : null,
        status: 1,
        createdBy: userMasterID,
        createdByIp: req.ip,
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Video progress saved successfully',
      data: {
        enrollmentId: parseInt(enrollmentId),
        contentId: parseInt(contentId),
        videoMaxWatched: progress.videoMaxWatched,
        videoCurrentTime: progress.videoCurrentTime,
        isCompleted: progress.isCompleted,
      },
    });
  } catch (error) {
    console.error('Error saving video progress:', error);
    return res.status(500).json({
      status: 500,
      message: error.message || 'Failed to save video progress',
    });
  }
};

