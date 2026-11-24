const companyMaster = require('../models/companyMaster');
const Course = require('../models/course');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const LmsCourseDepartment = require('../models/lmsCourseDepartment');
const { certificateExpiryTypeEnum } = require('../utils/commonVars');

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
      departmentIds,
      companyMasterID,
      coverImageUrl,
      deadline,
    } = await req.body;

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

    const certExpiryType = req.body.certificateExpiryType === certificateExpiryTypeEnum.DAYS ? certificateExpiryTypeEnum.DAYS : certificateExpiryTypeEnum.LIFETIME;
    const certExpiryDays = certExpiryType === certificateExpiryTypeEnum.DAYS && req.body.certificateExpiryDays ? parseInt(req.body.certificateExpiryDays) : null;
    const isAllowReenrollment = req.body.allowReenrollment !== undefined
      ? (req.body.allowReenrollment === true || req.body.allowReenrollment === 'true' || req.body.allowReenrollment === 1 || req.body.allowReenrollment === '1')
      : true;
    const isAllowReassignmentOnCertExpiry = req.body.allowReassignmentOnCertExpiry !== undefined
      ? (req.body.allowReassignmentOnCertExpiry === true || req.body.allowReassignmentOnCertExpiry === 'true' || req.body.allowReassignmentOnCertExpiry === 1 || req.body.allowReassignmentOnCertExpiry === '1')
      : true;

    // Create course with exact LMS backend column names
    const course = await Course.create(
      {
        title,
        description,
        category,
        level: level || 'BEGINNER',
        estimatedDuration: estimatedDuration || 0,
        passingPercentage: passingPercentage || 70,
        certificateEnabled: req.body.certificateEnabled !== undefined ? req.body.certificateEnabled : true,
        certificateExpiryType: certExpiryType,
        certificateExpiryDays: certExpiryDays,
        allowReenrollment: isAllowReenrollment,
        allowReassignmentOnCertExpiry: isAllowReassignmentOnCertExpiry,
        isMandatory: req.body.isMandatory !== undefined ? Boolean(req.body.isMandatory) : false,
        isSelfEnroll: req.body.isMandatory !== undefined ? !Boolean(req.body.isMandatory) : (req.body.isSelfEnroll !== undefined ? Boolean(req.body.isSelfEnroll) : true),
        status: 'DRAFT',
        coverImageUrl,
        deadline: deadline ? new Date(deadline) : null,
        createdBy: req.userDetails.userMasterId,
        companyMasterID,
      },
      { transaction }
    );

    // Assign departments if provided
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const LmsCourseDepartment = require('../models/lmsCourseDepartment');
      const courseDepartments = departmentIds.map((deptId) => ({
        courseId: course.id,
        departmentId: parseInt(deptId),
        createdBy: req.userDetails.userMasterId,
      }));

      await LmsCourseDepartment.bulkCreate(courseDepartments, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Course'),
      data: course,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listCourse = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery, courseStatus, departmentIds, category, level } = await req.body;
    
    const condition = {};
    condition.status = 1; // Only active courses

    if (companyMasterID) condition.companyMasterID = companyMasterID;
    if (courseStatus) condition.courseStatus = courseStatus;
    
    // Add category filter - convert to string to match database type
    if (category) {
      condition.category = String(category);
    }
    
    // Add level filter
    if (level) {
      condition.level = level.toUpperCase();
    }

    // If departmentIds are provided, filter courses by department
    let courseIds = null;
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      const courseDepartments = await LmsCourseDepartment.findAll({
        raw: true,
        where: {
          departmentId: { [Sequelize.Op.in]: departmentIds.map(id => parseInt(id)) },
          status: 1,
        },
        attributes: ['courseId'],
      });

      courseIds = [...new Set(courseDepartments.map(cd => cd.courseId))]; // Remove duplicates

      // If no courses found for these departments, return empty list
      if (courseIds.length === 0) {
        return res.status(200).json({
          status: 200,
          data: [],
          totalcount: 0,
          message: 'No courses available for selected department(s)',
        });
      }

      condition.id = { [Sequelize.Op.in]: courseIds };
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
        {
          '$companyMaster.companyName$': {
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
        { model: companyMaster, attributes: ['companyName'] },
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

      return courseData;
    });

    // Calculate status counts for all courses (not just paginated)
    const statusCondition = { ...condition };
    delete statusCondition.courseStatus; // Remove status filter to get all statuses
    
    const publishedCount = await Course.count({
      where: { ...statusCondition, courseStatus: 'PUBLISHED' },
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
    });

    const draftCount = await Course.count({
      where: { ...statusCondition, courseStatus: 'DRAFT' },
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
    });

    return res.status(200).json({
      status: 200,
      data: mappedRows,
      totalcount: count,
      publishedCount,
      draftCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCourseByID = async (req, res, next) => {
  try {
    const { courseID } = await req.body;
    const getCourse = await Course.findOne({
      where: {
        courseID: courseID,
      },
      include: [
        {
          model: companyMaster,
        },
      ],
    });

    if (!getCourse) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: getCourse,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const {
      courseID,
      courseName,
      courseDescription,
      courseCategory,
      courseLevel,
      courseDuration,
      isMandatory,
      coverImageUrl,
      coverImageKey,
      courseStatus,
      passingPercentage,
      certificateEnabled,
      preAssessmentRequired,
      postAssessmentRequired,
      deadline,
      companyMasterID,
    } = await req.body;

    const find_SameData = await Course.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        courseID: {
          [Sequelize.Op.ne]: courseID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('courseName')),
          courseName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists('Course with same name'),
      });
    }

    const updateData = {
      courseName,
      courseDescription,
      courseCategory,
      courseLevel,
      courseDuration,
      isMandatory,
      courseStatus,
      passingPercentage,
      certificateEnabled,
      preAssessmentRequired,
      postAssessmentRequired,
      deadline,
      companyMasterID,
    };
    if (req.body.certificateExpiryType !== undefined) {
      updateData.certificateExpiryType = req.body.certificateExpiryType === certificateExpiryTypeEnum.DAYS ? certificateExpiryTypeEnum.DAYS : certificateExpiryTypeEnum.LIFETIME;
    }
    if (req.body.certificateExpiryDays !== undefined || req.body.certificateExpiryType !== undefined) {
      const type = req.body.certificateExpiryType !== undefined ? req.body.certificateExpiryType : updateData.certificateExpiryType;
      updateData.certificateExpiryDays = (type === certificateExpiryTypeEnum.DAYS && req.body.certificateExpiryDays) ? parseInt(req.body.certificateExpiryDays) : null;
    }
    if (req.body.allowReenrollment !== undefined) {
      updateData.allowReenrollment = (req.body.allowReenrollment === true || req.body.allowReenrollment === 'true' || req.body.allowReenrollment === 1 || req.body.allowReenrollment === '1');
    }
    if (req.body.allowReassignmentOnCertExpiry !== undefined) {
      updateData.allowReassignmentOnCertExpiry = (req.body.allowReassignmentOnCertExpiry === true || req.body.allowReassignmentOnCertExpiry === 'true' || req.body.allowReassignmentOnCertExpiry === 1 || req.body.allowReassignmentOnCertExpiry === '1');
    }
    if (req.body.isMandatory !== undefined) {
      const isMand = (req.body.isMandatory === true || req.body.isMandatory === 'true' || req.body.isMandatory === 1 || req.body.isMandatory === '1');
      updateData.isMandatory = isMand;
      updateData.isSelfEnroll = !isMand;
    } else if (req.body.isSelfEnroll !== undefined) {
      updateData.isSelfEnroll = (req.body.isSelfEnroll === true || req.body.isSelfEnroll === 'true' || req.body.isSelfEnroll === 1 || req.body.isSelfEnroll === '1');
    }
    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = coverImageUrl || null;
      updateData.coverImageKey = (coverImageKey !== undefined ? coverImageKey : coverImageUrl) || null;
    } else if (coverImageKey !== undefined) {
      updateData.coverImageKey = coverImageKey || null;
      updateData.coverImageUrl = coverImageKey || null;
    }

    await Course.update(
      updateData,
      { where: { courseID: courseID } },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Course'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCourseStatus = async (req, res, next) => {
  try {
    const { courseID, status } = await req.body;

    if (!courseID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const find_SameData = await Course.findOne({
      where: {
        courseID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    await Course.update(
      {
        status,
      },
      { where: { courseID: courseID } },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == 1
          ? message.usermessage.activeMessage('Course')
          : message.usermessage.deactiveMessage('Course'),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { courseID } = await req.body;

    if (!courseID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const find_SameData = await Course.findOne({
      where: {
        courseID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    if (find_SameData.authorizationStatus === 3 || find_SameData.isAuthorizedBy === true) {
      return res.status(200).send({
        status: 400,
        message: 'Approved courses cannot be deleted.',
      });
    }

    await Course.destroy({
      where: { courseID: courseID },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Course'),
    });
  } catch (err) {
    next(err);
  }
};
