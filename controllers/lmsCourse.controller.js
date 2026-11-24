const companyMaster = require('../models/companyMaster');
const Course = require('../models/course');
const LmsModule = require('../models/lmsModule');
const LmsLesson = require('../models/lmsLesson');
const LmsContent = require('../models/lmsContent');
const LmsCourseDepartment = require('../models/lmsCourseDepartment');
const LmsCourseDesignation = require('../models/lmsCourseDesignation');
const LmsCourseUser = require('../models/lmsCourseUser');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CourseAssessment = require('../models/courseAssessment');
const Assessment = require('../models/assessment');
const AssessmentQuestion = require('../models/assessmentQuestion');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const Department = require('../models/department');
const Designation = require('../models/designation');
const UserMaster = require('../models/userMaster');
const { asiaKolkataDateTime, sendNotification } = require('../utils/commonUtilFunctions');
const { certificateExpiryTypeEnum } = require('../utils/commonVars');
const UserInbox = require('../models/UserInbox');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const CourseAuthorizationRequest = require('../models/courseAuthorization');
const { authorizationMasterTypes, authorizationCriteriaType } = require('../utils/dbUtils');
const moment = require('moment');
const { snapshotCourseAssessments } = require('../utils/lmsAssessmentSnapshot');

/**
 * Resolves target userMasterIDs in a single query using required includes
 */
async function getAssignedUserMasterIDs({ companyMasterID, departmentIds, designationIds, userIds, transaction }) {
  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    return userIds.map((u) => parseInt(u)).filter(Boolean);
  }

  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const include = [];

  if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
    include.push({
      model: EmployeeDepartment,
      required: true,
      attributes: [],
      where: {
        departmentID: { [Sequelize.Op.in]: departmentIds.map((d) => parseInt(d)) },
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
      },
    });
  }

  if (designationIds && Array.isArray(designationIds) && designationIds.length > 0) {
    include.push({
      model: EmployeeDesignation,
      required: true,
      attributes: [],
      where: {
        designationID: { [Sequelize.Op.in]: designationIds.map((d) => parseInt(d)) },
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
      },
    });
  }

  const activeUsers = await UserMaster.findAll({
    raw: true,
    where: {
      companyMasterId: companyMasterID,
      status: 1,
    },
    include,
    attributes: ['userMasterID'],
    transaction,
  });

  return activeUsers.map((u) => u.userMasterID);
}

/**
 * Sends course assignment notifications to eligible employees
 * ONLY for published courses that are not self-enroll.
 */
async function sendCourseAssignmentNotifications({
  courseId,
  title,
  companyMasterID,
  deadline,
  isMandatory,
  isSelfEnroll,
  departmentIds,
  designationIds,
  userIds,
  senderUserMasterId,
  transaction,
}) {
  if (isMandatory === false) return; // Only mandatory courses are auto-assigned / notified

  // Resolve target users
  let deptIds = departmentIds;
  let desigIds = designationIds;
  let uIds = userIds;

  if (deptIds === undefined) {
    const depts = await LmsCourseDepartment.findAll({
      where: { courseId, status: 1 },
      attributes: ['departmentId'],
      raw: true,
      transaction,
    });
    deptIds = depts.map((d) => d.departmentId);
  }

  if (desigIds === undefined) {
    const desigs = await LmsCourseDesignation.findAll({
      where: { courseId, status: 1 },
      attributes: ['designationId'],
      raw: true,
      transaction,
    });
    desigIds = desigs.map((d) => d.designationId);
  }

  if (uIds === undefined) {
    const users = await LmsCourseUser.findAll({
      where: { courseId, status: 1 },
      attributes: ['userMasterID'],
      raw: true,
      transaction,
    });
    uIds = users.map((u) => u.userMasterID);
  }

  const targetUserIDs = await getAssignedUserMasterIDs({
    companyMasterID,
    departmentIds: deptIds,
    designationIds: desigIds,
    userIds: uIds,
    transaction,
  });

  if (!targetUserIDs || targetUserIDs.length === 0) return;

  const existingNotifications = await UserInbox.findAll({
    raw: true,
    where: {
      activityTable: Course.getTableName(),
      activityTablePK: courseId,
      assignedTo: { [Sequelize.Op.in]: targetUserIDs },
    },
    attributes: ['assignedTo'],
    transaction,
  });

  const alreadyNotified = new Set(existingNotifications.map((n) => parseInt(n.assignedTo)));
  const newTargetUserIDs = targetUserIDs.filter((uid) => !alreadyNotified.has(uid));

  if (newTargetUserIDs.length > 0) {
    const deadlineText = deadline ? ` Completion deadline: ${moment(deadline).format('DD/MM/YYYY')}.` : '.';
    const sendNotificationInbox = newTargetUserIDs.map((uid) => ({
      assignedTo: uid,
      assignedBy: senderUserMasterId || null,
      activityTable: Course.getTableName(),
      activityTablePK: courseId,
      companyMasterID,
      message: `You have been assigned to course "${title}"${deadlineText}`,
    }));

    await UserInbox.bulkCreate(sendNotificationInbox, { transaction });
  }
}

// =====================================================
// COURSE OPERATIONS & AUTHORIZATION HELPER
// =====================================================

/**
 * Processes course authorization workflow or direct publication.
 * If creator has authorization workflow configured:
 *   - Automatically deletes any previous CourseAuthorizationRequest records and associated UserInbox items
 *   - Sets course to DRAFT with authorizationStatus (1 for Any/Two/Three, 2 for Sequence)
 *   - Re-sends fresh pending requests to all authorizers (even those who previously approved it)
 *     For sequence-wise (Criteria 5), restarts sequence at index 0 (first authorizer)
 * If no authorizers configured:
 *   - If reqCourseStatus === 'PUBLISHED', sets courseStatus to PUBLISHED and authorizationStatus to 3 (Approved)
 *   - If reqCourseStatus !== 'PUBLISHED', keeps courseStatus as DRAFT and authorizationStatus to 0
 */
async function processCoursePublishAuthorization({
  courseId,
  courseTitle,
  creatorUserDetails,
  creatorUserMasterId,
  reqCourseStatus = 'PUBLISHED',
  transaction,
}) {
  // 1. Clear any prior requests for this course and their inboxes automatically
  const prevAuths = await CourseAuthorizationRequest.findAll({
    where: { ReferenceID: courseId },
    attributes: ['AuthorizationRequestId'],
    transaction,
  });
  const prevAuthIds = prevAuths.map((a) => a.AuthorizationRequestId);
  if (prevAuthIds.length > 0) {
    await UserInbox.destroy({
      where: {
        activityTable: {
          [Sequelize.Op.in]: [
            
            CourseAuthorizationRequest.getTableName(),
          ],
        },
        activityTablePK: { [Sequelize.Op.in]: prevAuthIds },
      },
      transaction,
    });
  }

  // Always delete any existing authorization requests for this course
  await CourseAuthorizationRequest.destroy({
    where: { ReferenceID: courseId },
    transaction,
  });

  // 2. Fetch AuthorizationDetails for the course creator
  const effectiveCreatorId = creatorUserMasterId || creatorUserDetails?.userMasterId;
  let authorizationDetails = await AuthorizationDetails.findOne({
    where: {
      AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
      userMasterID: effectiveCreatorId,
      status: 1,
    },
    transaction,
  });

  if (
    !authorizationDetails &&
    creatorUserDetails?.userMasterId &&
    creatorUserDetails.userMasterId !== effectiveCreatorId
  ) {
    authorizationDetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
        userMasterID: creatorUserDetails.userMasterId,
        status: 1,
      },
      transaction,
    });
  }

  // 3. Safely parse AuthorizedByUserMasterId into an array of integers
  let authorizerList = authorizationDetails?.AuthorizedByUserMasterId;
  if (typeof authorizerList === 'string') {
    try {
      authorizerList = JSON.parse(authorizerList);
    } catch (e) {
      authorizerList = authorizerList
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter(Boolean);
    }
  }
  if (!Array.isArray(authorizerList)) {
    authorizerList = [];
  }
  authorizerList = authorizerList
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id) && id > 0);

  // 4. If authorizers are configured, submit to authorizers
  if (authorizationDetails && authorizerList.length > 0) {
    const isSequence =
      +authorizationDetails.AuthorizationCriteriaID ===
        authorizationCriteriaType.SEQUENCENO ||
      authorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO;
    const initialAuthStatus = isSequence ? 2 : 1;

    // Update Course status to Draft / Pending Authorization and reset all authorizer remarks/flags
    await Course.update(
      {
        authorizationStatus: initialAuthStatus,
        status: 1,
        courseStatus: 'DRAFT',
        isAuthorizedBy: false,
        authorizedBy: null,
        authorizedAt: null,
        authorizerRemark: null,
        rejectionRemarks: null,
        AuthorizationCriteriaID: authorizationDetails.AuthorizationCriteriaID,
      },
      {
        where: { id: courseId },
        user: creatorUserDetails,
        transaction,
      }
    );

    // Resolve actual creator name from UserMaster to ensure it is never default 'User'
    let creatorDisplayName =
      creatorUserDetails?.displayName ||
      (
        (creatorUserDetails?.firstName || '') +
        ' ' +
        (creatorUserDetails?.lastName || '')
      ).trim();

    if (
      (!creatorDisplayName || creatorDisplayName === 'User') &&
      effectiveCreatorId
    ) {
      const creatorUser = await UserMaster.findOne({
        where: { userMasterID: effectiveCreatorId },
        attributes: ['displayName', 'firstName', 'lastName'],
        transaction,
      });
      if (creatorUser) {
        creatorDisplayName =
          creatorUser.displayName ||
          (
            (creatorUser.firstName || '') +
            ' ' +
            (creatorUser.lastName || '')
          ).trim();
      }
    }
    if (!creatorDisplayName) {
      creatorDisplayName = 'Course Creator';
    }

    // Sequence wise restarts from authorizer 0; Any / Two / Three sends to ALL authorizers
    const authorizerIds = isSequence ? [authorizerList[0]] : authorizerList;

    for (const authUserId of authorizerIds) {
      const authReq = await CourseAuthorizationRequest.create(
        {
          TableName: 'courses',
          ReferenceID: courseId,
          userMasterID: authUserId,
          status: 1,
          authstatus: 2, // Pending
          createBy: creatorUserDetails?.userMasterId || effectiveCreatorId,
          createByIp: creatorUserDetails?.userIpAddress || null,
        },
        { transaction }
      );

      await UserInbox.create(
        {
          activityTable: 'courseAuthorizations',
          activityTablePK: authReq.AuthorizationRequestId,
          message: `${creatorDisplayName} has submitted course '${courseTitle}' for authorization.`,
          assignedTo: authUserId,
          assignedBy: creatorUserDetails?.userMasterId || effectiveCreatorId,
        },
        { transaction }
      );

      try {
        if (typeof sendNotification === 'function') {
          await sendNotification(
            authUserId,
            {
              title: 'Course Authorization',
              body: `${creatorDisplayName} submitted course '${courseTitle}' for authorization.`,
            },
            { screen: 'courseauth' }
          );
        }
      } catch (notifErr) {
        console.error('Error sending course auth push notification:', notifErr);
      }
    }

    return {
      isSubmittedForAuth: true,
      authorizationStatus: initialAuthStatus,
      courseStatus: 'DRAFT',
      message: 'Course submitted for authorization successfully',
    };
  }

  // 5. No authorization workflow -> Publish directly if PUBLISHED requested, else keep as DRAFT
  if (reqCourseStatus === 'PUBLISHED') {
    await Course.update(
      {
        courseStatus: 'PUBLISHED',
        authorizationStatus: 3, // Approved
        status: 1,
        isAuthorizedBy: true,
        rejectionRemarks: null,
      },
      {
        where: { id: courseId },
        user: creatorUserDetails,
        transaction,
      }
    );

    // Snapshot assessments and questions so that subsequent changes to master assessments will not alter this approved course
    await snapshotCourseAssessments(courseId, {
      transaction,
      userDetails: creatorUserDetails,
    });

    return {
      isSubmittedForAuth: false,
      authorizationStatus: 3,
      courseStatus: 'PUBLISHED',
      message: 'Course published successfully',
    };
  }

  // If not PUBLISHED and no authorizers configured, leave as DRAFT
  await Course.update(
    {
      courseStatus: 'DRAFT',
      authorizationStatus: 0,
      isAuthorizedBy: false,
      authorizerRemark: null,
      rejectionRemarks: null,
    },
    {
      where: { id: courseId },
      user: creatorUserDetails,
      transaction,
    }
  );

  return {
    isSubmittedForAuth: false,
    authorizationStatus: 0,
    courseStatus: 'DRAFT',
    message: 'Course updated successfully',
  };
}

exports.addCourse = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      description,
      category,
      level,
      estimatedDuration,
      passingPercentage,
      certificateEnabled,
      certificateExpiryType,
      certificateExpiryDays,
      allowReenrollment,
      allowReassignmentOnCertExpiry,
      isMandatory,
      isSelfEnroll,
      departmentIds,
      designationIds,
      userIds,
      coverImageUrl,
      coverImageKey,
      deadline,
      courseStatus,
    } = req.body;

    // Get companyMasterID from request body or from user details
    const companyMasterID = req.body.companyMasterID || req.userDetails.companyMasterID;

    if (!companyMasterID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Company ID is required',
      });
    }

    if (!title || !description) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Title and description are required',
      });
    }

    // Check for duplicate course title
    const find_SameData = await Course.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('title')),
          title.trim().toLowerCase()
        ),
      },
      transaction,
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Course with same title'),
      });
    }

    // Parse boolean for certificateEnabled
    const isCertEnabled = certificateEnabled !== undefined
      ? (certificateEnabled === true || certificateEnabled === 'true' || certificateEnabled === 1 || certificateEnabled === '1')
      : true;

    const isMandatoryCourse = isMandatory !== undefined
      ? (isMandatory === true || isMandatory === 'true' || isMandatory === 1 || isMandatory === '1')
      : false;

    // Non-mandatory courses are catalog/self-enrollable; mandatory courses are auto-assigned to My Courses
    const isSelfEnrollCourse = !isMandatoryCourse;

    const certExpiryType = certificateExpiryType === certificateExpiryTypeEnum.DAYS ? certificateExpiryTypeEnum.DAYS : certificateExpiryTypeEnum.LIFETIME;
    const certExpiryDays = certExpiryType === certificateExpiryTypeEnum.DAYS && certificateExpiryDays ? parseInt(certificateExpiryDays) : null;
    const isAllowReenrollment = allowReenrollment !== undefined
      ? (allowReenrollment === true || allowReenrollment === 'true' || allowReenrollment === 1 || allowReenrollment === '1')
      : true;
    const isAllowReassignmentOnCertExpiry = allowReassignmentOnCertExpiry !== undefined
      ? (allowReassignmentOnCertExpiry === true || allowReassignmentOnCertExpiry === 'true' || allowReassignmentOnCertExpiry === 1 || allowReassignmentOnCertExpiry === '1')
      : true;

    // Create course with exact LMS backend column names
    const course = await Course.create(
      {
        title,
        description,
        category,
        level: level || 'BEGINNER',
        estimatedDuration: estimatedDuration || 0,
        passingPercentage: passingPercentage !== undefined ? passingPercentage : null,
        certificateEnabled: isCertEnabled,
        certificateExpiryType: certExpiryType,
        certificateExpiryDays: certExpiryDays,
        allowReenrollment: isAllowReenrollment,
        allowReassignmentOnCertExpiry: isAllowReassignmentOnCertExpiry,
        isMandatory: isMandatoryCourse,
        isSelfEnroll: isSelfEnrollCourse,
        courseStatus: 'DRAFT',
        coverImageUrl,
        coverImageKey: coverImageKey || coverImageUrl || null,
        deadline: deadline ? new Date(deadline) : null,
        companyMasterID,
      },
      { transaction, user: req.userDetails }
    );

    // Assign departments if provided
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const courseDepartments = departmentIds.map((deptId) => ({
        courseId: course.id,
        departmentId: parseInt(deptId),
      }));

      await LmsCourseDepartment.bulkCreate(courseDepartments, { 
        transaction, 
        user: req.userDetails 
      });
    }

    // Assign designations if provided
    if (designationIds && Array.isArray(designationIds) && designationIds.length > 0) {
      const courseDesignations = designationIds.map((desigId) => ({
        courseId: course.id,
        designationId: parseInt(desigId),
      }));

      await LmsCourseDesignation.bulkCreate(courseDesignations, { 
        transaction, 
        user: req.userDetails 
      });
    }

    // Assign users if provided
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const courseUsers = userIds.map((uid) => ({
        courseId: course.id,
        userMasterID: parseInt(uid),
      }));

      await LmsCourseUser.bulkCreate(courseUsers, { 
        transaction, 
        user: req.userDetails 
      });
    }

    let responseMessage = message.usermessage.addMessage('Course');

    // Handle publishing / authorization if requested
    if (courseStatus === 'PUBLISHED') {
      const authResult = await processCoursePublishAuthorization({
        courseId: course.id,
        courseTitle: course.title,
        creatorUserDetails: req.userDetails,
        creatorUserMasterId: req.userDetails?.userMasterId,
        reqCourseStatus: courseStatus,
        transaction,
      });

      responseMessage = authResult.message;

      // Send assignment notifications ONLY if published directly without authorization and mandatory
      if (!authResult.isSubmittedForAuth && isMandatoryCourse) {
        await sendCourseAssignmentNotifications({
          courseId: course.id,
          title: course.title,
          companyMasterID: course.companyMasterID,
          deadline: course.deadline,
          isMandatory: isMandatoryCourse,
          isSelfEnroll: isSelfEnrollCourse,
          departmentIds,
          designationIds,
          userIds,
          senderUserMasterId: req.userDetails?.userMasterId,
          transaction,
        });
      }
    }

    await transaction.commit();

    // Fetch created course to return
    const createdCourse = await Course.findOne({
      where: { id: course.id },
      paranoid: false,
    });

    const courseData = createdCourse ? (createdCourse.toJSON ? createdCourse.toJSON() : createdCourse) : course;

    return res.status(200).json({
      status: 200,
      message: responseMessage,
      data: courseData,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listCourse = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, courseStatus, departmentIds, designationIds, userIds, category, level, authorizationStatus } = req.body;
    
    // Get companyMasterID from request body or from user details
    const companyMasterID = req.body.companyMasterID || req.userDetails.companyMasterID;
    
    const condition = {};
    condition[Sequelize.Op.or] = [
      { status: 1 },
      { authorizationStatus: { [Sequelize.Op.in]: [1, 2, 4] } },
    ];

    if (companyMasterID) condition.companyMasterID = companyMasterID;
    
    if (courseStatus) {
      const upperStatus = String(courseStatus).toUpperCase();
      if (upperStatus === 'REJECTED') {
        condition.authorizationStatus = 4;
      } else if (upperStatus === 'PENDING') {
        condition.authorizationStatus = { [Sequelize.Op.in]: [1, 2] };
      } else if (upperStatus === 'PUBLISHED') {
        condition.courseStatus = 'PUBLISHED';
        condition.authorizationStatus = 3;
      } else if (upperStatus === 'DRAFT') {
        condition.courseStatus = 'DRAFT';
        condition.authorizationStatus = 0;
      } else {
        condition.courseStatus = upperStatus;
      }
    }

    if (authorizationStatus !== undefined && authorizationStatus !== null && authorizationStatus !== '') {
      condition.authorizationStatus = parseInt(authorizationStatus, 10);
    }
    
    // Add category filter - convert to string to match database VARCHAR type
    if (category) {
      condition.category = String(category);
    }
    
    // Add level/difficulty filter
    if (level) {
      condition.level = level.toUpperCase(); // Convert to uppercase to match ENUM
    }

    // If departmentIds are provided, filter courses by department
    let filterCourseIdSets = [];
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const courseDepartments = await LmsCourseDepartment.findAll({
        raw: true,
        where: {
          departmentId: { [Sequelize.Op.in]: departmentIds.map(id => parseInt(id)) },
          status: 1,
        },
        attributes: ['courseId'],
      });
      filterCourseIdSets.push(new Set(courseDepartments.map(cd => cd.courseId)));
    }

    // If designationIds are provided, filter courses by designation
    if (designationIds && Array.isArray(designationIds) && designationIds.length > 0) {
      const courseDesignations = await LmsCourseDesignation.findAll({
        raw: true,
        where: {
          designationId: { [Sequelize.Op.in]: designationIds.map(id => parseInt(id)) },
          status: 1,
        },
        attributes: ['courseId'],
      });
      filterCourseIdSets.push(new Set(courseDesignations.map(cd => cd.courseId)));
    }

    // If userIds are provided, filter courses by user
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const courseUsers = await LmsCourseUser.findAll({
        raw: true,
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds.map(id => parseInt(id)) },
          status: 1,
        },
        attributes: ['courseId'],
      });
      filterCourseIdSets.push(new Set(courseUsers.map(cu => cu.courseId)));
    }

    if (filterCourseIdSets.length > 0) {
      // Intersect all filtered sets
      let intersection = [...filterCourseIdSets[0]];
      for (let i = 1; i < filterCourseIdSets.length; i++) {
        intersection = intersection.filter(id => filterCourseIdSets[i].has(id));
      }

      if (intersection.length === 0) {
        return res.status(200).json({
          status: 200,
          data: [],
          totalcount: 0,
          total: 0,
          message: 'No courses available for selected criteria',
        });
      }
      condition.id = { [Sequelize.Op.in]: intersection };
    }

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          title: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          category: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];
    
    // Import userMaster for creator details
    const userMaster = require('../models/userMaster');

    const { rows, count } = await Course.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      distinct: true,
      col: 'id',
      include: [
        { 
          model: companyMaster, 
          attributes: ['companyName'] 
        },
        {
          model: userMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'firstName', 'lastName', 'email'],
        },
        {
          model: LmsCourseDepartment,
          as: 'courseDepartments',
          attributes: ['departmentId'],
          where: { status: 1 },
          required: false,
        },
        {
          model: LmsCourseDesignation,
          as: 'courseDesignations',
          attributes: ['designationId'],
          where: { status: 1 },
          required: false,
        },
        {
          model: LmsCourseUser,
          as: 'courseUsers',
          attributes: ['userMasterID'],
          where: { status: 1 },
          required: false,
        },
      ],
    });

    // Fetch post-assessment bindings for all courses in current page
    const courseIdList = rows.map(c => c.id);
    const postAssessmentMap = new Map();
    if (courseIdList.length > 0) {
      const bindings = await CourseAssessment.findAll({
        where: {
          courseId: { [Sequelize.Op.in]: courseIdList },
          type: 'POST_ASSESSMENT',
          status: 1,
        },
        raw: true,
      });

      const assessmentIds = bindings.map(b => b.assessmentId);
      if (assessmentIds.length > 0) {
        const assessments = await Assessment.findAll({
          where: {
            assessmentID: { [Sequelize.Op.in]: assessmentIds },
            status: 1,
          },
          raw: true,
        });
        const assessmentObjMap = new Map(assessments.map(a => [a.assessmentID, a]));

        bindings.forEach(b => {
          const ass = assessmentObjMap.get(b.assessmentId);
          if (ass) {
            postAssessmentMap.set(b.courseId, ass);
          }
        });
      }
    }

    // Map creator data and department IDs to match frontend expectations
    const mappedRows = rows.map(course => {
      const courseData = course.toJSON();
      
      // Map creator
      if (courseData.createBy) {
        courseData.creator = {
          id: courseData.createBy.userMasterID,
          firstName: courseData.createBy.firstName,
          lastName: courseData.createBy.lastName,
          email: courseData.createBy.email,
        };
        delete courseData.createBy;
      }

      // Map department IDs
      if (courseData.courseDepartments) {
        courseData.departmentIds = courseData.courseDepartments.map(cd => String(cd.departmentId));
      } else {
        courseData.departmentIds = [];
      }

      // Map designation IDs
      if (courseData.courseDesignations) {
        courseData.designationIds = courseData.courseDesignations.map(cd => String(cd.designationId));
      } else {
        courseData.designationIds = [];
      }

      // Map user IDs
      if (courseData.courseUsers) {
        courseData.userIds = courseData.courseUsers.map(cu => String(cu.userMasterID));
      } else {
        courseData.userIds = [];
      }

      // Post-assessment & Passing Percentage
      const postAssessment = postAssessmentMap.get(courseData.id);
      if (postAssessment) {
        courseData.hasPostAssessment = true;
        courseData.postAssessment = postAssessment;
        courseData.passingPercentage = postAssessment.passingPercentage !== undefined && postAssessment.passingPercentage !== null
          ? postAssessment.passingPercentage
          : courseData.passingPercentage;
      } else {
        courseData.hasPostAssessment = false;
        courseData.passingPercentage = null; // No post-assessment = no pass %
      }

      return courseData;
    });

    // Calculate status counts for all courses (not just paginated)
    const statusCondition = { ...condition };
    delete statusCondition.courseStatus; // Remove status filter to get all statuses
    delete statusCondition.authorizationStatus;
    
    const [publishedCount, draftCount, pendingCount, rejectedCount] = await Promise.all([
      Course.count({
        where: { ...statusCondition, courseStatus: 'PUBLISHED', authorizationStatus: 3 },
        distinct: true,
        col: 'id',
        include: departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? [
          {
            model: LmsCourseDepartment,
            as: 'courseDepartments',
            attributes: [],
            where: { status: 1 },
            required: false,
          }
        ] : undefined,
      }),
      Course.count({
        where: { ...statusCondition, courseStatus: 'DRAFT', authorizationStatus: 0 },
        distinct: true,
        col: 'id',
        include: departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? [
          {
            model: LmsCourseDepartment,
            as: 'courseDepartments',
            attributes: [],
            where: { status: 1 },
            required: false,
          }
        ] : undefined,
      }),
      Course.count({
        where: { ...statusCondition, authorizationStatus: { [Sequelize.Op.in]: [1, 2] } },
        distinct: true,
        col: 'id',
        include: departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? [
          {
            model: LmsCourseDepartment,
            as: 'courseDepartments',
            attributes: [],
            where: { status: 1 },
            required: false,
          }
        ] : undefined,
      }),
      Course.count({
        where: { ...statusCondition, authorizationStatus: 4 },
        distinct: true,
        col: 'id',
        include: departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? [
          {
            model: LmsCourseDepartment,
            as: 'courseDepartments',
            attributes: [],
            where: { status: 1 },
            required: false,
          }
        ] : undefined,
      }),
    ]);

    return res.status(200).json({
      status: 200,
      data: mappedRows,
      totalcount: count,
      total: count,
      publishedCount,
      draftCount,
      pendingCount,
      rejectedCount,
    });
  } catch (err) {
    next(err);
  }
};

// New endpoint for trainee course catalog - filters by user's department
exports.listCourseCatalog = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, courseStatus, category, level } = req.body;
    const userMasterID = req.userDetails.userMasterId;
    
    console.log('🔍 listCourseCatalog called');
    console.log('👤 User ID:', userMasterID);
    console.log('📦 Request body:', req.body);
    
    // Get companyMasterID from request body or from user details
    const companyMasterID = req.body.companyMasterID || req.userDetails.companyMasterId;
    
    console.log('🏢 Company ID:', companyMasterID);
    
    // Get user's current department and designation
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const [userDepartment, userDesignation] = await Promise.all([
      EmployeeDepartment.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: currentDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: currentDate,
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['departmentID'],
      }),
      EmployeeDesignation.findOne({
        raw: true,
        where: {
          userMasterID: userMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: currentDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: currentDate,
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['designationID'],
      }),
    ]);

    const userDepartmentID = userDepartment?.departmentID;
    const userDesignationID = userDesignation?.designationID;

    // Fetch all active restrictions
    const [allCourseDepts, allCourseDesigs, allCourseUsers] = await Promise.all([
      LmsCourseDepartment.findAll({
        raw: true,
        where: { status: 1 },
        attributes: ['courseId', 'departmentId'],
      }),
      LmsCourseDesignation.findAll({
        raw: true,
        where: { status: 1 },
        attributes: ['courseId', 'designationId'],
      }),
      LmsCourseUser.findAll({
        raw: true,
        where: { status: 1 },
        attributes: ['courseId', 'userMasterID'],
      }),
    ]);

    const courseDeptMap = new Map();
    allCourseDepts.forEach(cd => {
      if (!courseDeptMap.has(cd.courseId)) courseDeptMap.set(cd.courseId, []);
      courseDeptMap.get(cd.courseId).push(cd.departmentId);
    });

    const courseDesigMap = new Map();
    allCourseDesigs.forEach(cd => {
      if (!courseDesigMap.has(cd.courseId)) courseDesigMap.set(cd.courseId, []);
      courseDesigMap.get(cd.courseId).push(cd.designationId);
    });

    const courseUserMap = new Map();
    allCourseUsers.forEach(cu => {
      if (!courseUserMap.has(cu.courseId)) courseUserMap.set(cu.courseId, []);
      courseUserMap.get(cu.courseId).push(cu.userMasterID);
    });

    const allRestrictedCourseIds = new Set([
      ...courseDeptMap.keys(),
      ...courseDesigMap.keys(),
      ...courseUserMap.keys(),
    ]);

    const ineligibleRestrictedCourseIds = [];

    for (const courseId of allRestrictedCourseIds) {
      const depts = courseDeptMap.get(courseId);
      const desigs = courseDesigMap.get(courseId);
      const users = courseUserMap.get(courseId);

      const hasUserRestriction = users && users.length > 0;
      const hasDeptRestriction = depts && depts.length > 0;
      const hasDesigRestriction = desigs && desigs.length > 0;

      let isEligible = false;

      if (hasUserRestriction) {
        // Direct user assignment takes precedence: only specific assigned users can view
        isEligible = users.includes(userMasterID);
      } else if (hasDeptRestriction && hasDesigRestriction) {
        // Both Dept & Desig selected: user must have BOTH active department and active designation
        const matchesDept = Boolean(userDepartmentID && depts.includes(userDepartmentID));
        const matchesDesig = Boolean(userDesignationID && desigs.includes(userDesignationID));
        isEligible = matchesDept && matchesDesig;
      } else if (hasDeptRestriction) {
        // Department only
        isEligible = Boolean(userDepartmentID && depts.includes(userDepartmentID));
      } else if (hasDesigRestriction) {
        // Designation only
        isEligible = Boolean(userDesignationID && desigs.includes(userDesignationID));
      }

      if (!isEligible) {
        ineligibleRestrictedCourseIds.push(courseId);
      }
    }

    const andConditions = [];

    if (!req.body.onlyEnrolled && ineligibleRestrictedCourseIds.length > 0) {
      andConditions.push({
        id: { [Sequelize.Op.notIn]: ineligibleRestrictedCourseIds },
      });
    }

    // Filter enrolled / unenrolled courses if requested
    if (req.body.excludeEnrolled || req.body.onlyUnenrolled || req.body.onlyEnrolled) {
      const Enrollment = require('../models/enrollment');
      const userEnrollments = await Enrollment.findAll({
        raw: true,
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
        attributes: ['courseID'],
      });
      const enrolledCourseIds = [...new Set(userEnrollments.map(e => e.courseID).filter(Boolean))];

      if (req.body.excludeEnrolled || req.body.onlyUnenrolled) {
        if (enrolledCourseIds.length > 0) {
          andConditions.push({
            id: { [Sequelize.Op.notIn]: enrolledCourseIds },
          });
        }
      } else if (req.body.onlyEnrolled) {
        if (enrolledCourseIds.length > 0) {
          andConditions.push({
            id: { [Sequelize.Op.in]: enrolledCourseIds },
          });
        } else {
          // User has no enrollments
          andConditions.push({
            id: { [Sequelize.Op.in]: [-1] },
          });
        }
      }
    }

    const condition = {};
    condition.status = 1; // Only active courses
    if (!req.body.onlyEnrolled) {
      // Non-mandatory courses are displayed in the course catalog for self-enrollment
      condition[Sequelize.Op.or] = [
        { isMandatory: false },
        { isMandatory: { [Sequelize.Op.eq]: null } },
      ];
    }

    if (companyMasterID) condition.companyMasterID = companyMasterID;
    if (courseStatus) condition.courseStatus = courseStatus;
    
    // Add category filter - convert to string to match database VARCHAR type
    if (category) {
      condition.category = String(category);
    }
    
    // Add level/difficulty filter
    if (level) {
      condition.level = level.toUpperCase(); // Convert to uppercase to match ENUM
    }

    if (searchQuery) {
      andConditions.push({
        [Sequelize.Op.or]: [
          {
            title: {
              [Sequelize.Op.iLike]: '%' + searchQuery + '%',
            },
          },
          {
            description: {
              [Sequelize.Op.iLike]: '%' + searchQuery + '%',
            },
          },
          {
            category: {
              [Sequelize.Op.iLike]: '%' + searchQuery + '%',
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      condition[Sequelize.Op.and] = andConditions;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];
    
    // Import userMaster for creator details
    const userMaster = require('../models/userMaster');

    const { rows, count } = await Course.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      distinct: true,
      col: 'id',
      include: [
        { 
          model: companyMaster, 
          attributes: ['companyName'] 
        },
        {
          model: userMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'firstName', 'lastName', 'email'],
        },
        {
          model: LmsCourseDepartment,
          as: 'courseDepartments',
          attributes: ['departmentId'],
          where: { status: 1 },
          required: false,
        },
      ],
    });

    console.log('✅ Courses found:', rows.length);
    console.log('📊 Total count:', count);

    // Fetch post-assessment bindings for all catalog courses in current page
    const courseIdList = rows.map(c => c.id);
    const postAssessmentMap = new Map();
    if (courseIdList.length > 0) {
      const bindings = await CourseAssessment.findAll({
        where: {
          courseId: { [Sequelize.Op.in]: courseIdList },
          type: 'POST_ASSESSMENT',
          status: 1,
        },
        raw: true,
      });

      const assessmentIds = bindings.map(b => b.assessmentId);
      if (assessmentIds.length > 0) {
        const assessments = await Assessment.findAll({
          where: {
            assessmentID: { [Sequelize.Op.in]: assessmentIds },
            status: 1,
          },
          raw: true,
        });
        const assessmentObjMap = new Map(assessments.map(a => [a.assessmentID, a]));

        bindings.forEach(b => {
          const ass = assessmentObjMap.get(b.assessmentId);
          if (ass) {
            postAssessmentMap.set(b.courseId, ass);
          }
        });
      }
    }

    // Fetch certificates for current user to detect expired certificates
    const Certificate = require('../models/certificate');
    let userCertificatesMap = {};
    if (courseIdList.length > 0 && userMasterID) {
      const userCerts = await Certificate.findAll({
        where: {
          userId: userMasterID,
          courseId: { [Sequelize.Op.in]: courseIdList },
          status: 1,
        },
        order: [['createdAt', 'DESC']],
      });
      userCerts.forEach(c => {
        if (!userCertificatesMap[c.courseId]) {
          userCertificatesMap[c.courseId] = c;
        }
      });
    }

    // Map creator data to match frontend expectations
    const mappedRows = rows.map(course => {
      const courseData = course.toJSON();
      if (courseData.createBy) {
        courseData.creator = {
          id: courseData.createBy.userMasterID,
          firstName: courseData.createBy.firstName,
          lastName: courseData.createBy.lastName,
          email: courseData.createBy.email,
        };
        delete courseData.createBy;
      }
      if (courseData.courseDepartments) {
        courseData.departmentIds = courseData.courseDepartments.map(cd => String(cd.departmentId));
      } else {
        courseData.departmentIds = [];
      }

      // Post-assessment & Passing Percentage
      const postAssessment = postAssessmentMap.get(courseData.id);
      if (postAssessment) {
        courseData.hasPostAssessment = true;
        courseData.postAssessment = postAssessment;
        courseData.passingPercentage = postAssessment.passingPercentage !== undefined && postAssessment.passingPercentage !== null
          ? postAssessment.passingPercentage
          : courseData.passingPercentage;
      } else {
        courseData.hasPostAssessment = false;
        courseData.passingPercentage = null; // No post-assessment = no pass %
      }

      // Certificate expiration status for this user
      const userCert = userCertificatesMap[courseData.id];
      const isCertExp = Boolean(
        userCert && userCert.expiresAt && new Date() > new Date(userCert.expiresAt)
      );
      courseData.isCertificateExpired = isCertExp;
      courseData.certificateExpiresAt = userCert?.expiresAt || null;
      courseData.certificateNumber = userCert?.certificateNumber || null;

      return courseData;
    });

    return res.status(200).json({
      status: 200,
      data: mappedRows,
      totalcount: count,
      total: count,
    });
  } catch (err) {
    console.error('❌ Error in listCourseCatalog:', err);
    next(err);
  }
};

exports.getCourseByID = async (req, res, next) => {
  try {
    const id = req.body.id || req.body.courseId;
    
    // Import required models
    const userMaster = require('../models/userMaster');
    const department = require('../models/department');
    const { getSignedS3Url } = require('../utils/s3.utils');
    
    const getCourse = await Course.findOne({
      where: { 
        id,
        status: 1,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyName', 'companyMasterID'],
        },
        {
          model: userMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'firstName', 'lastName', 'email'],
        },
        {
          model: LmsModule,
          as: 'modules',
          attributes: ['id', 'title', 'description', 'orderIndex', 'estimatedDuration'],
          separate: true, // Prevents duplicate rows
          order: [['orderIndex', 'ASC']],
          include: [
            {
              model: LmsLesson,
              as: 'lessons',
              attributes: ['id', 'title', 'description', 'orderIndex', 'estimatedDuration', 'isRequired'],
              separate: true,
              order: [['orderIndex', 'ASC']],
              include: [
                {
                  model: LmsContent,
                  as: 'contents',
                  attributes: ['id', 'title', 'description', 'type', 'textContent', 'fileKey', 'externalUrl', 'orderIndex', 'estimatedDuration', 'isRequired'],
                  separate: true,
                  order: [['orderIndex', 'ASC']],
                },
              ],
            },
          ],
        },
        {
          model: LmsCourseDepartment,
          as: 'courseDepartments',
          where: { status: 1 },
          required: false,
          attributes: ['id', 'departmentId', 'courseId', 'createdAt', 'createdBy', 'status'],
          include: [
            {
              model: department,
              as: 'department',
              attributes: ['departmentId', 'departmentName', 'status'],
            },
          ],
        },
        {
          model: LmsCourseDesignation,
          as: 'courseDesignations',
          where: { status: 1 },
          required: false,
          attributes: ['id', 'designationId', 'courseId', 'createdAt', 'createdBy', 'status'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationId', 'designationName', 'status'],
            },
          ],
        },
        {
          model: LmsCourseUser,
          as: 'courseUsers',
          where: { status: 1 },
          required: false,
          attributes: ['id', 'userMasterID', 'courseId', 'createdAt', 'createdBy', 'status'],
          include: [
            {
              model: UserMaster,
              as: 'user',
              attributes: ['userMasterID', 'firstName', 'lastName', 'displayName', 'userNumber'],
            },
          ],
        },
      ],
    });

    if (!getCourse) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    // Convert to plain object
    const courseData = getCourse.toJSON();

    console.log('📦 Course data before signed URL generation:', {
      courseId: courseData.id,
      modulesCount: courseData.modules?.length || 0,
      hasModules: !!courseData.modules
    });

    // Generate signed URLs for content with fileKey
    if (courseData.modules) {
      for (const module of courseData.modules) {
        if (module.lessons) {
          for (const lesson of module.lessons) {
            if (lesson.contents) {
              for (const content of lesson.contents) {
                // Check if content has fileKey
                if (content.fileKey) {
                  try {
                    const bucketName = process.env.AWS_S3_BUCKET;
                    console.log(`🔑 Generating signed URL for content: ${content.id}, fileKey: ${content.fileKey}, bucket: ${bucketName}`);
                    content.fileUrl = await getSignedS3Url(bucketName, content.fileKey, 3600);
                    console.log(`✅ Generated signed URL: ${content.fileUrl.substring(0, 100)}...`);
                  } catch (error) {
                    console.error(`❌ Failed to generate signed URL for content ${content.id}:`, error);
                    content.fileUrl = null;
                  }
                }
                // Check if externalUrl is actually an S3 key (doesn't start with http)
                else if (content.externalUrl && !content.externalUrl.startsWith('http')) {
                  try {
                    const bucketName = process.env.AWS_S3_BUCKET;
                    console.log(`🔑 Generating signed URL for content: ${content.id}, externalUrl as S3 key: ${content.externalUrl}, bucket: ${bucketName}`);
                    content.fileUrl = await getSignedS3Url(bucketName, content.externalUrl, 3600);
                    console.log(`✅ Generated signed URL: ${content.fileUrl.substring(0, 100)}...`);
                    // Clear externalUrl since it was actually an S3 key
                    content.externalUrl = null;
                  } catch (error) {
                    console.error(`❌ Failed to generate signed URL for content ${content.id}:`, error);
                    content.fileUrl = null;
                  }
                } else {
                  console.log(`ℹ️ Content ${content.id} has no fileKey, using externalUrl: ${content.externalUrl}`);
                }
              }
            }
          }
        }
      }
    }

    // Map creator data to match LMS backend format
    if (courseData.createBy) {
      courseData.creator = {
        id: courseData.createBy.userMasterID,
        firstName: courseData.createBy.firstName,
        lastName: courseData.createBy.lastName,
        email: courseData.createBy.email,
      };
      delete courseData.createBy; // Remove the original field
    }

    // Map department data
    if (courseData.courseDepartments) {
      courseData.departmentIds = courseData.courseDepartments.map(cd => String(cd.departmentId));
      courseData.courseDepartments = courseData.courseDepartments.map(cd => ({
        id: cd.id,
        courseId: cd.courseId,
        departmentId: cd.departmentId,
        createdAt: cd.createdAt,
        createdBy: cd.createdBy || '',
        department: cd.department ? {
          id: cd.department.departmentId,
          name: cd.department.departmentName,
          description: '',
          departmentCode: '',
          isActive: cd.department.status === 1,
        } : null,
      }));
    } else {
      courseData.departmentIds = [];
    }

    // Map designation data
    if (courseData.courseDesignations) {
      courseData.designationIds = courseData.courseDesignations.map(cd => String(cd.designationId));
      courseData.courseDesignations = courseData.courseDesignations.map(cd => ({
        id: cd.id,
        courseId: cd.courseId,
        designationId: cd.designationId,
        createdAt: cd.createdAt,
        createdBy: cd.createdBy || '',
        designation: cd.designation ? {
          id: cd.designation.designationId,
          name: cd.designation.designationName,
          isActive: cd.designation.status === 1,
        } : null,
      }));
    } else {
      courseData.designationIds = [];
    }

    // Map user data
    if (courseData.courseUsers) {
      courseData.userIds = courseData.courseUsers.map(cu => String(cu.userMasterID));
      courseData.courseUsers = courseData.courseUsers.map(cu => ({
        id: cu.id,
        courseId: cu.courseId,
        userMasterID: cu.userMasterID,
        createdAt: cu.createdAt,
        createdBy: cu.createdBy || '',
        user: cu.user ? {
          id: cu.user.userMasterID,
          firstName: cu.user.firstName,
          lastName: cu.user.lastName,
          displayName: cu.user.displayName,
          empCode: cu.user.userNumber,
          userNumber: cu.user.userNumber,
        } : null,
      }));
    } else {
      courseData.userIds = [];
    }

    // Fetch assessment details if assessment IDs exist
    const Assessment = require('../models/assessment');
    
    if (courseData.preAssessmentId) {
      const preAssessment = await Assessment.findOne({
        where: { assessmentID: courseData.preAssessmentId, status: 1 },
      });
      if (preAssessment) {
        const assessmentData = preAssessment.toJSON();
        courseData.preAssessment = {
          ...assessmentData,
          id: assessmentData.assessmentID, // Add id alias
        };
      }
    }

    const CourseAssessment = require('../models/courseAssessment');
    let postAssessmentRecord = null;
    if (courseData.postAssessmentId) {
      postAssessmentRecord = await Assessment.findOne({
        where: { assessmentID: courseData.postAssessmentId, status: 1 },
      });
    }
    if (!postAssessmentRecord) {
      const coursePost = await CourseAssessment.findOne({
        where: { courseId: id, type: 'POST_ASSESSMENT', status: 1 },
      });
      if (coursePost) {
        postAssessmentRecord = await Assessment.findOne({
          where: { assessmentID: coursePost.assessmentId, status: 1 },
        });
      }
    }

    if (postAssessmentRecord) {
      const assessmentData = postAssessmentRecord.toJSON();
      courseData.postAssessment = {
        ...assessmentData,
        id: assessmentData.assessmentID, // Add id alias
      };
      courseData.hasPostAssessment = true;
      courseData.passingPercentage = postAssessmentRecord.passingPercentage !== undefined && postAssessmentRecord.passingPercentage !== null
        ? postAssessmentRecord.passingPercentage
        : courseData.passingPercentage;
    } else {
      courseData.hasPostAssessment = false;
      courseData.passingPercentage = null;
    }

    // Fetch Category details if category ID exists
    const CategoryMaster = require('../models/categoryMaster');
    if (courseData.category) {
      const cat = await CategoryMaster.findOne({
        where: {
          categoryMasterID: courseData.category,
          status: 1,
        },
        attributes: ['categoryMasterID', 'categoryName'],
        raw: true,
      });
      if (cat) {
        courseData.categoryName = cat.categoryName;
      }
    }

    courseData.difficulty = courseData.level ? courseData.level.toLowerCase() : 'beginner';

    // Delete course assignment notification for this user when viewing/starting the course
    if (req.userDetails && req.userDetails.userMasterId && id) {
      try {
        const UserInbox = require('../models/UserInbox');
        await UserInbox.destroy({
          where: {
            assignedTo: req.userDetails.userMasterId,
            activityTable: Course.getTableName(),
            activityTablePK: id,
          },
        });
      } catch (inboxDelErr) {
        console.warn('⚠️ Error clearing course assignment notification on course start:', inboxDelErr.message);
      }
    }

    return res.status(200).json({
      status: 200,
      data: courseData,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      id,
      title,
      description,
      category,
      level,
      estimatedDuration,
      passingPercentage,
      certificateEnabled,
      certificateExpiryType,
      certificateExpiryDays,
      allowReenrollment,
      allowReassignmentOnCertExpiry,
      isMandatory,
      isSelfEnroll,
      departmentIds,
      designationIds,
      userIds,
      coverImageUrl,
      coverImageKey,
      deadline,
    } = req.body;

    // Get companyMasterID from request body or from user details
    const companyMasterID = req.body.companyMasterID || req.userDetails.companyMasterID;

    if (!id) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const existingCourse = await Course.findOne({
      where: {
        id,
        status: { [Sequelize.Op.in]: [0, 1] },
      },
      transaction,
    });

    if (!existingCourse) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    if (existingCourse.authorizationStatus === 3 || existingCourse.isAuthorizedBy === true) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be edited.',
      });
    }

    // Check for duplicate course title (excluding current course)
    if (title && companyMasterID) {
      const find_SameData = await Course.findOne({
        where: {
          companyMasterID,
          status: { [Sequelize.Op.in]: [0, 1] },
          id: {
            [Sequelize.Op.ne]: id,
          },
          [Sequelize.Op.and]: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('title')),
            title.trim().toLowerCase()
          ),
        },
        transaction,
      });

      if (find_SameData) {
        await transaction.rollback();
        return res.status(200).send({
          status: 400,
          message: message.usermessage.alreadyExists('Course with same title'),
        });
      }
    }

    // Update course
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (level) updateData.level = level;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
    if (passingPercentage !== undefined) updateData.passingPercentage = passingPercentage;
    if (certificateEnabled !== undefined) {
      updateData.certificateEnabled = (certificateEnabled === true || certificateEnabled === 'true' || certificateEnabled === 1 || certificateEnabled === '1');
    }
    if (certificateExpiryType !== undefined) {
      updateData.certificateExpiryType = certificateExpiryType === certificateExpiryTypeEnum.DAYS ? certificateExpiryTypeEnum.DAYS : certificateExpiryTypeEnum.LIFETIME;
    }
    if (certificateExpiryDays !== undefined || certificateExpiryType !== undefined) {
      const type = certificateExpiryType !== undefined ? certificateExpiryType : updateData.certificateExpiryType;
      updateData.certificateExpiryDays = (type === certificateExpiryTypeEnum.DAYS && certificateExpiryDays) ? parseInt(certificateExpiryDays) : null;
    }
    if (allowReenrollment !== undefined) {
      updateData.allowReenrollment = (allowReenrollment === true || allowReenrollment === 'true' || allowReenrollment === 1 || allowReenrollment === '1');
    }
    if (allowReassignmentOnCertExpiry !== undefined) {
      updateData.allowReassignmentOnCertExpiry = (allowReassignmentOnCertExpiry === true || allowReassignmentOnCertExpiry === 'true' || allowReassignmentOnCertExpiry === 1 || allowReassignmentOnCertExpiry === '1');
    }
    if (isMandatory !== undefined) {
      const isMand = (isMandatory === true || isMandatory === 'true' || isMandatory === 1 || isMandatory === '1');
      updateData.isMandatory = isMand;
      updateData.isSelfEnroll = !isMand;
    } else if (isSelfEnroll !== undefined) {
      updateData.isSelfEnroll = (isSelfEnroll === true || isSelfEnroll === 'true' || isSelfEnroll === 1 || isSelfEnroll === '1');
    }
    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = coverImageUrl || null;
      updateData.coverImageKey = (coverImageKey !== undefined ? coverImageKey : coverImageUrl) || null;
    } else if (coverImageKey !== undefined) {
      updateData.coverImageKey = coverImageKey || null;
      updateData.coverImageUrl = coverImageKey || null;
    }
    if (deadline) updateData.deadline = new Date(deadline);
    // Allow courseStatus to be updated (for draft/archived), PUBLISHED handled via auth flow below
    if (req.body.courseStatus && req.body.courseStatus !== 'PUBLISHED') {
      updateData.courseStatus = req.body.courseStatus;
    }
    // Note: companyMasterID should not be updated after course creation

    await Course.update(updateData, { 
      where: { id },
      transaction,
      user: req.userDetails,
    });

    // Update departments if provided
    if (departmentIds && Array.isArray(departmentIds)) {
      // Remove existing departments (soft delete)
      await LmsCourseDepartment.update(
        { status: 0 },
        {
          where: { courseId: id },
          transaction,
          user: req.userDetails,
        }
      );

      // Add new departments
      if (departmentIds.length > 0) {
        // Check if any departments already exist (were soft deleted)
        const existingDepts = await LmsCourseDepartment.findAll({
          where: {
            courseId: id,
            departmentId: { [Sequelize.Op.in]: departmentIds.map(d => parseInt(d)) },
          },
          paranoid: false, // Include soft-deleted records
          transaction,
        });

        const existingDeptIds = existingDepts.map(d => d.departmentId);
        const newDeptIds = departmentIds.map(d => parseInt(d)).filter(d => !existingDeptIds.includes(d));

        // Restore soft-deleted departments
        if (existingDepts.length > 0) {
          await LmsCourseDepartment.update(
            { status: 1 },
            {
              where: {
                courseId: id,
                departmentId: { [Sequelize.Op.in]: existingDeptIds },
              },
              paranoid: false,
              transaction,
              user: req.userDetails,
            }
          );
        }

        // Create new departments
        if (newDeptIds.length > 0) {
          const courseDepartments = newDeptIds.map((deptId) => ({
            courseId: id,
            departmentId: deptId,
          }));

          await LmsCourseDepartment.bulkCreate(courseDepartments, { 
            transaction,
            user: req.userDetails,
          });
        }
      }
    }

    // Update designations if provided
    if (designationIds && Array.isArray(designationIds)) {
      // Remove existing designations (soft delete)
      await LmsCourseDesignation.update(
        { status: 0 },
        {
          where: { courseId: id },
          transaction,
          user: req.userDetails,
        }
      );

      if (designationIds.length > 0) {
        const existingDesigs = await LmsCourseDesignation.findAll({
          where: {
            courseId: id,
            designationId: { [Sequelize.Op.in]: designationIds.map(d => parseInt(d)) },
          },
          paranoid: false,
          transaction,
        });

        const existingDesigIds = existingDesigs.map(d => d.designationId);
        const newDesigIds = designationIds.map(d => parseInt(d)).filter(d => !existingDesigIds.includes(d));

        if (existingDesigs.length > 0) {
          await LmsCourseDesignation.update(
            { status: 1 },
            {
              where: {
                courseId: id,
                designationId: { [Sequelize.Op.in]: existingDesigIds },
              },
              paranoid: false,
              transaction,
              user: req.userDetails,
            }
          );
        }

        if (newDesigIds.length > 0) {
          const courseDesignations = newDesigIds.map((desigId) => ({
            courseId: id,
            designationId: desigId,
          }));

          await LmsCourseDesignation.bulkCreate(courseDesignations, { 
            transaction,
            user: req.userDetails,
          });
        }
      }
    }

    // Update users if provided
    if (userIds && Array.isArray(userIds)) {
      // Remove existing users (soft delete)
      await LmsCourseUser.update(
        { status: 0 },
        {
          where: { courseId: id },
          transaction,
          user: req.userDetails,
        }
      );

      if (userIds.length > 0) {
        const existingUsers = await LmsCourseUser.findAll({
          where: {
            courseId: id,
            userMasterID: { [Sequelize.Op.in]: userIds.map(u => parseInt(u)) },
          },
          paranoid: false,
          transaction,
        });

        const existingUserIds = existingUsers.map(u => u.userMasterID);
        const newUserIds = userIds.map(u => parseInt(u)).filter(u => !existingUserIds.includes(u));

        if (existingUsers.length > 0) {
          await LmsCourseUser.update(
            { status: 1 },
            {
              where: {
                courseId: id,
                userMasterID: { [Sequelize.Op.in]: existingUserIds },
              },
              paranoid: false,
              transaction,
              user: req.userDetails,
            }
          );
        }

        if (newUserIds.length > 0) {
          const courseUsers = newUserIds.map((uid) => ({
            courseId: id,
            userMasterID: uid,
          }));

          await LmsCourseUser.bulkCreate(courseUsers, { 
            transaction,
            user: req.userDetails,
          });
        }
      }
    }

    // Send notifications to eligible assigned employees ONLY if course is published and mandatory
    const currentCourse = await Course.findOne({
      where: { id },
      attributes: ['id', 'courseStatus', 'isMandatory', 'isSelfEnroll', 'title', 'companyMasterID', 'deadline'],
      raw: true,
      transaction,
    });

    const isMandatoryCourse = updateData.isMandatory !== undefined 
      ? updateData.isMandatory 
      : currentCourse?.isMandatory;

    let responseMessage = message.usermessage.updateMessage('Course');

    // Check if course has active/prior authorization requests or is in authorization workflow
    const prevAuthCount = await CourseAuthorizationRequest.count({
      where: { ReferenceID: id },
      transaction,
    });

    const isCurrentlyInAuth =
      prevAuthCount > 0 ||
      [1, 2, 4].includes(existingCourse.authorizationStatus);

    const isPublishing = req.body.courseStatus === 'PUBLISHED';

    if (isPublishing || isCurrentlyInAuth) {
      const authResult = await processCoursePublishAuthorization({
        courseId: id,
        courseTitle: updateData.title || currentCourse?.title || existingCourse?.title || 'Course',
        creatorUserDetails: req.userDetails,
        creatorUserMasterId: existingCourse.createdBy,
        reqCourseStatus: req.body.courseStatus,
        transaction,
      });

      responseMessage = authResult.message;

      // Send assignment notifications ONLY if published directly without authorization and mandatory
      if (!authResult.isSubmittedForAuth && authResult.courseStatus === 'PUBLISHED' && isMandatoryCourse) {
        await sendCourseAssignmentNotifications({
          courseId: id,
          title: updateData.title || currentCourse?.title || existingCourse?.title || 'Course',
          companyMasterID: companyMasterID || currentCourse?.companyMasterID || existingCourse?.companyMasterID,
          deadline: updateData.deadline !== undefined ? updateData.deadline : (currentCourse?.deadline || existingCourse?.deadline),
          isMandatory: isMandatoryCourse,
          isSelfEnroll: false,
          departmentIds,
          designationIds,
          userIds,
          senderUserMasterId: req.userDetails?.userMasterId,
          transaction,
        });
      }
    } else {
      const isPublished = (updateData.courseStatus || currentCourse?.courseStatus) === 'PUBLISHED';
      if (isPublished && isMandatoryCourse) {
        await sendCourseAssignmentNotifications({
          courseId: id,
          title: updateData.title || currentCourse?.title || 'Course',
          companyMasterID: companyMasterID || currentCourse?.companyMasterID,
          deadline: updateData.deadline !== undefined ? updateData.deadline : currentCourse?.deadline,
          isMandatory: isMandatoryCourse,
          isSelfEnroll: false,
          departmentIds,
          designationIds,
          userIds,
          senderUserMasterId: req.userDetails?.userMasterId,
          transaction,
        });
      }
    }

    await transaction.commit();

    // Fetch and return the updated course
    const updatedCourse = await Course.findOne({
      where: { id },
      paranoid: false,
    });

    // Convert to plain object to ensure all fields including id are returned
    const courseData = updatedCourse ? (updatedCourse.toJSON ? updatedCourse.toJSON() : updatedCourse) : null;

    return res.status(200).json({
      status: 200,
      message: responseMessage,
      data: courseData,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateCourseStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id, courseStatus } = req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const course = await Course.findOne({
      where: { 
        id,
        status: { [Sequelize.Op.in]: [0, 1] },
      },
      transaction,
    });

    if (!course) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const wasPublished = course.courseStatus === 'PUBLISHED';
    let responseMessage = `Course ${courseStatus?.toLowerCase()} successfully`;

    if (courseStatus === 'PUBLISHED') {
      const authResult = await processCoursePublishAuthorization({
        courseId: id,
        courseTitle: course.title,
        creatorUserDetails: req.userDetails,
        creatorUserMasterId: course.createdBy,
        reqCourseStatus: courseStatus,
        transaction,
      });

      responseMessage = authResult.message;

      // Send assignment notifications if transitioning to PUBLISHED without authorization
      if (!authResult.isSubmittedForAuth && !wasPublished) {
        await sendCourseAssignmentNotifications({
          courseId: course.id,
          title: course.title,
          companyMasterID: course.companyMasterID,
          deadline: course.deadline,
          isMandatory: course.isMandatory,
          isSelfEnroll: course.isSelfEnroll,
          senderUserMasterId: req.userDetails?.userMasterId,
          transaction,
        });
      }
    } else {
      await Course.update(
        { courseStatus },
        { 
          where: { id },
          user: req.userDetails,
          transaction,
        }
      );
    }

    await transaction.commit();

    // Fetch the updated course to return
    const updatedCourse = await Course.findOne({
      where: { id },
      paranoid: false,
    });

    // Convert to plain object to ensure all fields including id are returned
    const courseData = updatedCourse ? (updatedCourse.toJSON ? updatedCourse.toJSON() : updatedCourse) : null;

    return res.status(200).json({
      status: 200,
      message: responseMessage,
      data: courseData,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.publishCourse = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id, courseId } = req.body;
    const courseIdToUse = id || courseId; // Support both id and courseId parameters

    if (!courseIdToUse) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Course ID is required',
      });
    }

    const course = await Course.findOne({
      where: { 
        id: courseIdToUse,
        status: { [Sequelize.Op.in]: [0, 1] },
      },
      transaction,
    });

    if (!course) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    // Check if any bound assessment has 0 questions

    const boundAssessments = await CourseAssessment.findAll({
      where: { courseId: courseIdToUse, status: 1 },
      transaction,
    });
    for (const ba of boundAssessments) {
      const qCount = await AssessmentQuestion.count({
        where: { assessmentID: ba.assessmentId, status: 1 },
        transaction,
      });
      if (qCount === 0) {
        await transaction.rollback();
        return res.status(200).send({
          status: 400,
          message: 'Cannot publish course: bound assessment has no questions. Please add questions to the assessment or remove it.',
        });
      }
    }

    const wasPublished = course.courseStatus === 'PUBLISHED';

    const authResult = await processCoursePublishAuthorization({
      courseId: courseIdToUse,
      courseTitle: course.title,
      creatorUserDetails: req.userDetails,
      transaction,
    });

    // Send assignment notifications upon direct publishing without authorization
    if (!authResult.isSubmittedForAuth && !wasPublished) {
      await sendCourseAssignmentNotifications({
        courseId: course.id,
        title: course.title,
        companyMasterID: course.companyMasterID,
        deadline: course.deadline,
        isMandatory: course.isMandatory,
        isSelfEnroll: course.isSelfEnroll,
        senderUserMasterId: req.userDetails?.userMasterId,
        transaction,
      });
    }

    await transaction.commit();

    // Fetch the updated course to return
    const updatedCourse = await Course.findOne({
      where: { id: courseIdToUse },
      paranoid: false,
    });

    // Convert to plain object to ensure all fields including id are returned
    const courseData = updatedCourse ? (updatedCourse.toJSON ? updatedCourse.toJSON() : updatedCourse) : null;

    return res.status(200).json({
      status: 200,
      message: authResult.message,
      data: courseData,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const course = await Course.findOne({
      where: { 
        id,
      },
      transaction,
    });

    if (!course) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    if (course.authorizationStatus === 3 || course.isAuthorizedBy === true) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be deleted.',
      });
    }

    // Find all authorization requests associated with this course
    const authRequests = await CourseAuthorizationRequest.findAll({
      where: { ReferenceID: id },
      attributes: ['AuthorizationRequestId'],
      transaction,
    });
    const authRequestIds = authRequests.map((r) => r.AuthorizationRequestId);

    // Delete inbox notifications for all authorizers
    if (authRequestIds.length > 0) {
      await UserInbox.destroy({
        where: {
          activityTable: {
            [Sequelize.Op.in]: [
              'courseAuthorizations',
              'CourseAuthorizationRequests',
              'course_authorization_requests',
              'courses',
              CourseAuthorizationRequest.getTableName(),
            ],
          },
          activityTablePK: { [Sequelize.Op.in]: authRequestIds },
        },
        transaction,
      });
    }

    // Delete any course-level inbox notifications (assignments/creator notices)
    await UserInbox.destroy({
      where: {
        activityTable: Course.getTableName(),
        activityTablePK: id,
      },
      transaction,
    });

    // Delete authorization request records
    await CourseAuthorizationRequest.destroy({
      where: { ReferenceID: id },
      transaction,
    });

    // Soft delete course (paranoid mode)
    await Course.destroy({
      where: { id },
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Course'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// =====================================================
// MODULE OPERATIONS
// =====================================================

async function isCourseApprovedOrPublished(courseId) {
  if (!courseId) return false;
  const course = await Course.findOne({
    where: { id: courseId, status: 1 },
    attributes: ['id', 'courseStatus', 'authorizationStatus', 'isAuthorizedBy'],
  });
  if (!course) return false;
  return (
    course.authorizationStatus === 3 ||
    course.isAuthorizedBy === true ||
    course.courseStatus === 'PUBLISHED'
  );
}

exports.addModule = async (req, res, next) => {
  try {
    const { courseId, title, description, estimatedDuration } = req.body;

    if (!courseId || !title) {
      return res.status(200).send({
        status: 400,
        message: 'Course ID and title are required',
      });
    }

    if (await isCourseApprovedOrPublished(courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    // Get the next order index
    const maxOrder = await LmsModule.max('orderIndex', {
      where: { courseId },
    });

    const module = await LmsModule.create({
      courseId,
      title,
      description,
      estimatedDuration: estimatedDuration || 0,
      orderIndex: (maxOrder || 0) + 1,
    }, { user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Module'),
      data: module,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateModule = async (req, res, next) => {
  try {
    const { moduleId, title, description, orderIndex, estimatedDuration } = req.body;

    if (!moduleId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    const existingModule = await LmsModule.findByPk(moduleId);
    if (!existingModule) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    if (await isCourseApprovedOrPublished(existingModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;

    await LmsModule.update(updateData, {
      where: { id: moduleId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Module'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteModule = async (req, res, next) => {
  try {
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    const existingModule = await LmsModule.findByPk(moduleId);
    if (!existingModule) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    if (await isCourseApprovedOrPublished(existingModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    await LmsModule.destroy({
      where: { id: moduleId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Module'),
    });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// LESSON OPERATIONS
// =====================================================

exports.addLesson = async (req, res, next) => {
  try {
    const { moduleId, title, description, estimatedDuration, isRequired } = req.body;

    if (!moduleId || !title) {
      return res.status(200).send({
        status: 400,
        message: 'Module ID and title are required',
      });
    }

    const existingModule = await LmsModule.findByPk(moduleId);
    if (!existingModule) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    if (await isCourseApprovedOrPublished(existingModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    // Get the next order index
    const maxOrder = await LmsLesson.max('orderIndex', {
      where: { moduleId },
    });

    const lesson = await LmsLesson.create({
      moduleId,
      title,
      description,
      estimatedDuration: estimatedDuration || 0,
      isRequired: isRequired || false,
      orderIndex: (maxOrder || 0) + 1,
    }, { user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Lesson'),
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateLesson = async (req, res, next) => {
  try {
    const { lessonId, title, description, orderIndex, estimatedDuration, isRequired } = req.body;

    if (!lessonId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    const existingLesson = await LmsLesson.findByPk(lessonId);
    if (!existingLesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    const parentModule = await LmsModule.findByPk(existingLesson.moduleId);
    if (parentModule && await isCourseApprovedOrPublished(parentModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
    if (isRequired !== undefined) updateData.isRequired = isRequired;

    await LmsLesson.update(updateData, {
      where: { id: lessonId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Lesson'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteLesson = async (req, res, next) => {
  try {
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    const existingLesson = await LmsLesson.findByPk(lessonId);
    if (!existingLesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    const parentModule = await LmsModule.findByPk(existingLesson.moduleId);
    if (parentModule && await isCourseApprovedOrPublished(parentModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    await LmsLesson.destroy({
      where: { id: lessonId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Lesson'),
    });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// CONTENT OPERATIONS
// =====================================================

exports.addContent = async (req, res, next) => {
  try {
    const {
      lessonId,
      title,
      description,
      type,
      textContent,
      fileKey,
      externalUrl,
      estimatedDuration,
      isRequired,
    } = req.body;

    if (!lessonId || !title || !type) {
      return res.status(200).send({
        status: 400,
        message: 'Lesson ID, title, and type are required',
      });
    }

    const existingLesson = await LmsLesson.findByPk(lessonId);
    if (!existingLesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    const parentModule = await LmsModule.findByPk(existingLesson.moduleId);
    if (parentModule && await isCourseApprovedOrPublished(parentModule.courseId)) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    // Get the next order index
    const maxOrder = await LmsContent.max('orderIndex', {
      where: { lessonId },
    });

    const content = await LmsContent.create({
      lessonId,
      title,
      description,
      type,
      textContent,
      fileKey,
      externalUrl,
      estimatedDuration: estimatedDuration || 0,
      isRequired: isRequired || false,
      orderIndex: (maxOrder || 0) + 1,
    }, { user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Content'),
      data: content,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateContent = async (req, res, next) => {
  try {
    const { 
      contentId, 
      title, 
      description, 
      type, 
      textContent, 
      fileKey, 
      externalUrl, 
      orderIndex, 
      estimatedDuration, 
      isRequired 
    } = req.body;

    if (!contentId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Content'),
      });
    }

    const existingContent = await LmsContent.findByPk(contentId);
    if (!existingContent) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Content'),
      });
    }

    const parentLesson = await LmsLesson.findByPk(existingContent.lessonId);
    if (parentLesson) {
      const parentModule = await LmsModule.findByPk(parentLesson.moduleId);
      if (parentModule && await isCourseApprovedOrPublished(parentModule.courseId)) {
        return res.status(200).send({
          status: 400,
          message: 'Approved courses cannot be modified.',
        });
      }
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (textContent !== undefined) updateData.textContent = textContent;
    if (fileKey !== undefined) updateData.fileKey = fileKey;
    if (externalUrl !== undefined) updateData.externalUrl = externalUrl;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
    if (isRequired !== undefined) updateData.isRequired = isRequired;

    await LmsContent.update(updateData, {
      where: { id: contentId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Content'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteContent = async (req, res, next) => {
  try {
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Content'),
      });
    }

    const existingContent = await LmsContent.findByPk(contentId);
    if (!existingContent) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Content'),
      });
    }

    const parentLesson = await LmsLesson.findByPk(existingContent.lessonId);
    if (parentLesson) {
      const parentModule = await LmsModule.findByPk(parentLesson.moduleId);
      if (parentModule && await isCourseApprovedOrPublished(parentModule.courseId)) {
        return res.status(200).send({
          status: 400,
          message: 'Approved courses cannot be modified.',
        });
      }
    }

    await LmsContent.destroy({
      where: { id: contentId },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Content'),
    });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// ASSESSMENT OPERATIONS (STUB)
// =====================================================

exports.getCourseAssessments = async (req, res, next) => {
  try {
    // Support both URL param and body param
    const courseId = req.params.courseId || req.body.courseId;
    

    if (!courseId) {
      return res.status(200).send({
        status: 400,
        message: 'Course ID is required',
      });
    }

    // Get course assessment bindings
    const bindings = await CourseAssessment.findAll({
      where: {
        courseId,
        status: 1,
      },
      raw: true,  // Get plain objects, no Sequelize casting
    });

    console.log(`🔍 getCourseAssessments for courseId=${courseId}: found ${bindings.length} bindings`);
    bindings.forEach(b => {
      console.log(`  Binding id=${b.id} type=${b.type} assessmentId=${b.assessmentId} isRequired=${b.isRequired} (type: ${typeof b.isRequired})`);
    });

    const assessments = [];

    // Fetch full assessment details for each binding
    for (const binding of bindings) {
      const bindingData = binding;
      const assessment = await Assessment.findOne({
        where: { assessmentID: bindingData.assessmentId, status: 1 },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName', 'companyMasterID'],
            required: false,
          },
          {
            model: AssessmentQuestion,
            as: 'assessmentQuestions',
            where: { status: 1 },
            required: false,
          },
        ],
      });

      if (assessment) {
        const assessmentJson = assessment.toJSON ? assessment.toJSON() : assessment;
        const isReq = Boolean(
          bindingData.isRequired === true ||
          bindingData.isRequired === 1 ||
          bindingData.isRequired === '1' ||
          bindingData.isRequired === 't' ||
          bindingData.isRequired === 'true' ||
          bindingData.isRequired === 'TRUE'
        );
        console.log(`  → isRequired raw value: ${JSON.stringify(bindingData.isRequired)}, resolved: ${isReq}`);
        assessments.push({
          id: bindingData.id,
          assessmentId: bindingData.assessmentId,
          assessment: {
            ...assessmentJson,
            id: assessmentJson.assessmentID,
            totalQuestions: assessmentJson.assessmentQuestions ? assessmentJson.assessmentQuestions.length : 0,
          },
          type: bindingData.type,
          isRequired: isReq,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      data: assessments,
    });
  } catch (err) {
    console.error('❌ Error in getCourseAssessments:', err);
    next(err);
  }
};


// =====================================================
// COURSE-ASSESSMENT BINDING
// =====================================================

exports.bindAssessment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId, assessmentId, type, isRequired } = req.body;
    const CourseAssessment = require('../models/courseAssessment');

    if (!courseId || !assessmentId || !type) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Course ID, Assessment ID, and type are required',
      });
    }

    // Validate type
    const validTypes = ['PRE_ASSESSMENT', 'POST_ASSESSMENT'];
    if (!validTypes.includes(type)) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Type must be either PRE_ASSESSMENT or POST_ASSESSMENT',
      });
    }

    // Check if course exists
    const course = await Course.findOne({
      where: { id: courseId, status: 1 },
      transaction,
    });

    if (!course) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    if (course.authorizationStatus === 3 || course.isAuthorizedBy === true) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    // Check if assessment has questions
    const AssessmentQuestion = require('../models/assessmentQuestion');
    const questionCount = await AssessmentQuestion.count({
      where: { assessmentID: assessmentId, status: 1 },
      transaction,
    });

    if (questionCount === 0) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Cannot select an assessment with no questions. Please add questions to the assessment first.',
      });
    }

    // Check if this type of assessment is already bound
    const existing = await CourseAssessment.findOne({
      where: {
        courseId,
        type,
        status: 1,
      },
      transaction,
    });

    if (existing) {
      // Update existing binding
      await CourseAssessment.update(
        {
          assessmentId,
          isRequired: isRequired || false,
        },
        {
          where: { id: existing.id },
          transaction,
        }
      );
    } else {
      // Create new binding
      await CourseAssessment.create(
        {
          courseId,
          assessmentId,
          type,
          isRequired: isRequired || false,
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Assessment bound to course successfully',
      data: {
        courseId,
        assessmentId,
        type,
        isRequired,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error in bindAssessment:', err);
    next(err);
  }
};

exports.unbindAssessment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId, type } = req.body;
    const CourseAssessment = require('../models/courseAssessment');

    if (!courseId || !type) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Course ID and type are required',
      });
    }

    // Check if course is approved
    const course = await Course.findOne({
      where: { id: courseId, status: 1 },
      transaction,
    });

    if (course && (course.authorizationStatus === 3 || course.isAuthorizedBy === true)) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be modified.',
      });
    }

    // Soft delete the binding
    await CourseAssessment.update(
      { status: 0 },
      {
        where: {
          courseId,
          type,
        },
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Assessment unbound from course successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateAssessmentRequired = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId, type, isRequired } = req.body;
    const CourseAssessment = require('../models/courseAssessment');

    if (!courseId || !type || isRequired === undefined) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Course ID, type, and isRequired are required',
      });
    }

    // Validate type
    const validTypes = ['PRE_ASSESSMENT', 'POST_ASSESSMENT'];
    if (!validTypes.includes(type)) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Type must be either PRE_ASSESSMENT or POST_ASSESSMENT',
      });
    }

    // Find the course assessment binding
    const binding = await CourseAssessment.findOne({
      where: {
        courseId,
        type,
        status: 1,
      },
      transaction,
    });

    if (!binding) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: 'Assessment binding not found for this course',
      });
    }

    // Update the isRequired field
    await CourseAssessment.update(
      { isRequired },
      {
        where: {
          id: binding.id,
        },
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Assessment required status updated successfully',
      data: {
        courseId,
        type,
        isRequired,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error in updateAssessmentRequired:', err);
    next(err);
  }
};

exports.sendCourseAssignmentNotifications = sendCourseAssignmentNotifications;

exports.getCourseDropdown = async (req, res, next) => {
  try {
    const { companyMasterID, status, courseStatus, searchQuery } = {
      ...req.query,
      ...req.body,
    };
    const userCompanyMasterID = req.userDetails?.companyMasterId;

    const where = {};

    // Filter by active status by default (status = 1)
    if (status !== undefined && status !== null && status !== '') {
      where.status = status;
    } else {
      where.status = 1;
    }

    // Filter by courseStatus if provided
    if (courseStatus) {
      where.courseStatus = courseStatus;
    }

    // Filter by companyMasterID
    const targetCompanyId = companyMasterID || userCompanyMasterID;
    if (targetCompanyId) {
      if (Array.isArray(targetCompanyId)) {
        where.companyMasterID = { [Sequelize.Op.in]: targetCompanyId };
      } else {
        where.companyMasterID = targetCompanyId;
      }
    }

    // Optional search query
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      where.title = { [Sequelize.Op.iLike]: `%${searchQuery.trim()}%` };
    }

    const courses = await Course.findAll({
      where,
      attributes: ['id', 'title', 'companyMasterID', 'courseStatus'],
      order: [['title', 'ASC']],
      raw: true,
    });

    return res.status(200).json({
      status: 200,
      message: 'Course dropdown retrieved successfully',
      data: courses,
    });
  } catch (err) {
    console.error('❌ Error in getCourseDropdown:', err);
    next(err);
  }
};


