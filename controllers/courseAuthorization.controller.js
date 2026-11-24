const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Course = require('../models/course');
const CourseAuthorizationRequest = require('../models/courseAuthorization');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const UserMaster = require('../models/userMaster');
const CompanyMaster = require('../models/companyMaster');
const CategoryMaster = require('../models/categoryMaster');
const LmsModule = require('../models/lmsModule');
const LmsLesson = require('../models/lmsLesson');
const LmsCourseDepartment = require('../models/lmsCourseDepartment');
const LmsCourseDesignation = require('../models/lmsCourseDesignation');
const LmsCourseUser = require('../models/lmsCourseUser');
const UserInbox = require('../models/UserInbox');
const { authorizationMasterTypes, authorizationCriteriaType } = require('../utils/dbUtils');
const { asiaKolkataDateTime, sendNotification } = require('../utils/commonUtilFunctions');
const message = require('../response_message/message');
const moment = require('moment');
const ExcelJS = require('exceljs');
const { snapshotCourseAssessments } = require('../utils/lmsAssessmentSnapshot');
const CourseAssessment = require('../models/courseAssessment');
const Assessment = require('../models/assessment');

const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');

const APPROVAL_THRESHOLDS = {
  [authorizationCriteriaType.ANYONE]: 1,
  [authorizationCriteriaType.ANYTWO]: 2,
  [authorizationCriteriaType.ANYTHREE]: 3,
};

/**
 * List Course Authorization Requests assigned to the logged-in authorizer
 * Exactly follows extraDaysAuthorization.controller.js (viewExtraDayAuthorizationByUserId)
 */
exports.listCourseAuthRequest = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      exportData,
    } = req.body;

    const authUserMasterID = req.userDetails.userMasterId;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit: parseInt(limit, 10) } : {};

    const condition = { userMasterID: authUserMasterID, status: 1 };

    if (status !== null && status !== undefined && status !== '') {
      condition.authstatus = parseInt(status, 10);
      if (+status === 2) {
        condition['$course.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
    } else {
      condition.authstatus = 2;
      condition['$course.authorizationStatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }

    if (user && user.length > 0) {
      condition['$course.createdBy$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }

    const courseAuthorizationRequests =
      await CourseAuthorizationRequest.findAndCountAll({
        distinct: true,
        col: 'AuthorizationRequestId',
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: Course,
            as: 'course',
            paranoid: false,
            include: [
              {
                model: AuthorizationCriteria,
                as: 'AuthorizationCriteriaMaster',
                attributes: ['AuthorizationCriteria', 'AuthorizationCriteriaID'],
                required: false,
              },
              {
                model: UserMaster,
                as: 'authorizedByUser',
                attributes: ['displayName', 'userMasterID'],
                required: false,
              },
              {
                model: CompanyMaster,
                as: 'companyMaster',
                attributes: ['companyMasterID', 'companyName'],
                required: false,
              },
              {
                separate: true,
                model: LmsCourseDepartment,
                as: 'courseDepartments',
                include: [
                  {
                    model: Department,
                    as: 'department',
                    attributes: ['departmentId', 'departmentName'],
                  },
                ],
              },
              {
                separate: true,
                model: LmsCourseDesignation,
                as: 'courseDesignations',
                include: [
                  {
                    model: Designation,
                    as: 'designation',
                    attributes: ['designationId', 'designationName'],
                  },
                ],
              },
              {
                separate: true,
                model: LmsCourseUser,
                as: 'courseUsers',
                include: [
                  {
                    model: UserMaster,
                    as: 'user',
                    attributes: ['userMasterID', 'displayName', 'userNumber'],
                  },
                ],
              },
              {
                separate: true,
                model: CourseAssessment,
                as: 'courseAssessments',
                where: { status: 1 },
                required: false,
                include: [
                  {
                    model: Assessment,
                    as: 'assessment',
                    required: false,
                  },
                ],
              },
              {
                separate: true,
                model: CourseAuthorizationRequest,
                as: 'courseAuthorizations',
                include: [
                  {
                    model: UserMaster,
                    as: 'authorizedPerson',
                    attributes: ['displayName', 'userMasterID'],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'createBy',
                where: userCondition,
                attributes: ['userMasterID', 'displayName', 'userNumber', 'photo', 'email'],
                include: [
                  {
                    separate: true,
                    required: false,
                    model: AuthorizationDetails,
                    as: 'authorizationDetails',
                    where: {
                      status: 1,
                      AuthorizationMasterID:
                        authorizationMasterTypes.lmsCourse,
                    },
                    attributes: ['AuthorizationCriteriaID'],
                    include: [
                      {
                        model: AuthorizationCriteria,
                        as: 'AuthorizationCriteriaMaster',
                        attributes: ['AuthorizationCriteria'],
                      },
                    ],
                  },
                  {
                    model: CompanyMaster,
                    attributes: ['companyName', 'companyLogo', 'companyMasterID'],
                  },
                  {
                    separate: true,
                    required: false,
                    model: EmployeeDesignation,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                        },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                    attributes: ['designationID'],
                    include: [
                      {
                        model: Designation,
                        as: 'designation',
                        attributes: ['designationName'],
                      },
                    ],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeDepartment,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                        },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                    attributes: ['departmentID'],
                    include: [
                      {
                        model: Department,
                        as: 'department',
                        attributes: ['departmentName'],
                      },
                    ],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeBranch,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                        },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                    attributes: ['branchID'],
                    include: [
                      {
                        model: BranchMaster,
                        as: 'branchMaster',
                        attributes: ['branchName'],
                      },
                    ],
                  },
                  {
                    separate: true,
                    required: false,
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeDivision,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                    attributes: ['divisionId', 'startDate'],
                    include: [
                      {
                        model: Division,
                        attributes: ['divisionName'],
                      },
                    ],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeWorkingArea,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                    attributes: ['workingAreaId', 'startDate'],
                    include: [
                      {
                        model: WorkingArea,
                        attributes: ['workingAreaName'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

    // Resolve Category info if category is ID
    const numericCategoryIds = [];
    courseAuthorizationRequests.rows.forEach((reqItem) => {
      const catVal = reqItem.course?.category;
      if (catVal && !isNaN(catVal)) {
        numericCategoryIds.push(parseInt(catVal, 10));
      }
    });

    if (numericCategoryIds.length > 0) {
      const categories = await CategoryMaster.findAll({
        where: {
          categoryMasterID: { [Sequelize.Op.in]: [...new Set(numericCategoryIds)] },
        },
        attributes: ['categoryMasterID', 'categoryName', 'color'],
      });

      const catMap = new Map();
      categories.forEach((cat) => catMap.set(String(cat.categoryMasterID), cat));

      courseAuthorizationRequests.rows.forEach((reqItem) => {
        if (reqItem.course) {
          const catVal = reqItem.course.category;
          if (catVal && catMap.has(String(catVal))) {
            const catObj = catMap.get(String(catVal));
            reqItem.course.dataValues.category = {
              categoryMasterID: catObj.categoryMasterID,
              categoryName: catObj.categoryName,
              color: catObj.color,
            };
          } else if (catVal) {
            reqItem.course.dataValues.category = {
              categoryName: String(catVal),
            };
          }
        }
      });
    }

    // Attach creator details aliases for frontend table compatibility
    courseAuthorizationRequests.rows.forEach((reqItem) => {
      const creator = reqItem.course?.createBy || null;
      if (!reqItem.dataValues.creator) {
        reqItem.dataValues.creator = creator;
      }
      if (!reqItem.dataValues.createdByUserDetails) {
        reqItem.dataValues.createdByUserDetails = creator;
      }
      const criteriaName =
        reqItem.course?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        creator?.authorizationDetails?.[0]?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        '';
      const depts = (reqItem.course?.courseDepartments || [])
        .map((d) => d.department?.departmentName)
        .filter(Boolean);
      const desigs = (reqItem.course?.courseDesignations || [])
        .map((d) => d.designation?.designationName)
        .filter(Boolean);
      const users = (reqItem.course?.courseUsers || [])
        .map((u) => {
          if (!u.user) return '';
          return u.user.userNumber
            ? `${u.user.displayName} (${u.user.userNumber})`
            : u.user.displayName;
        })
        .filter(Boolean);
      const cName =
        reqItem.course?.companyMaster?.companyName ||
        creator?.companyMaster?.companyName ||
        '';

      reqItem.dataValues.companyName = cName;
      reqItem.dataValues.selectedDepartments = depts;
      reqItem.dataValues.selectedDesignations = desigs;
      reqItem.dataValues.selectedUsers = users;

      if (reqItem.course) {
        reqItem.course.dataValues.companyName = cName;
        reqItem.course.dataValues.selectedDepartments = depts;
        reqItem.course.dataValues.selectedDesignations = desigs;
        reqItem.course.dataValues.selectedUsers = users;
        reqItem.course.dataValues.AuthorizationCriteria = criteriaName;
        reqItem.course.dataValues.authorizer = reqItem.course.isAuthorizedBy
          ? reqItem.course.authorizedByUser?.displayName || null
          : null;
        reqItem.course.dataValues.finalRemark = reqItem.course.isAuthorizedBy
          ? reqItem.course.authorizerRemark || reqItem.course.rejectionRemarks || null
          : null;
      }
      reqItem.dataValues.authorizer = reqItem.course?.dataValues?.authorizer || null;
      reqItem.dataValues.finalRemark = reqItem.course?.dataValues?.finalRemark || null;
    });

    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('CourseAuthorizations');

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 22 },
        { header: 'Employee Code', key: 'employeeCode', width: 18 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Mobile No', key: 'mobileNo', width: 15 },
        { header: 'Branch', key: 'branchName', width: 20 },
        { header: 'Department', key: 'departmentName', width: 22 },
        { header: 'Designation', key: 'designationName', width: 22 },
        { header: 'Working Area', key: 'workingAreaName', width: 20 },
        { header: 'Division', key: 'divisionName', width: 20 },
        { header: 'Course Title', key: 'courseTitle', width: 28 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Passing %', key: 'passingPercentage', width: 12 },
        { header: 'Mandatory', key: 'isMandatory', width: 12 },
        { header: 'Authorization Criteria', key: 'authCriteria', width: 20 },
        { header: 'Authorizers', key: 'authorizer', width: 25 },
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 },
        { header: 'Authorizer Remarks', key: 'authRemarks', width: 22 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remark', width: 20 },
        { header: 'Created By', key: 'createdBy', width: 22 },
        { header: 'Created Date', key: 'createdDate', width: 18 },
      ];

      worksheet.columns = columns;

      const headerRow = worksheet.getRow(1);

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      let currentRowIndex = 2;

      for (const record of courseAuthorizationRequests.rows) {
        const course = record.course || {};
        const user = course.createBy || {};
        const authorizations = course.courseAuthorizations || [];
        const rowCount = Math.max(authorizations.length, 1);

        const categoryText =
          typeof course.category === 'object' && course.category?.categoryName
            ? course.category.categoryName
            : typeof course.category === 'string'
            ? course.category
            : 'General';

        const commonFields = {
          authCriteria:
            user.authorizationDetails?.[0]?.AuthorizationCriteriaMaster
              ?.AuthorizationCriteria || '',

          companyName: user.companyMaster?.companyName || '',

          employeeCode:
            user.employeeJoiningDetails?.[0]?.employeeCode || '',

          name: user.displayName || '',

          mobileNo: user.userNumber || '',

          branchName:
            user.employeeBranches?.[0]?.branchMaster?.branchName || '',

          departmentName:
            user.employeeDepartments?.[0]?.department?.departmentName || '',

          designationName:
            user.employeeDesignations?.[0]?.designation?.designationName || '',

          workingAreaName:
            user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || '',

          divisionName:
            user.employeeDivisions?.[0]?.division?.divisionName || '',

          courseTitle: course.title || '',

          category: categoryText,

          passingPercentage:
            course.passingPercentage !== null && course.passingPercentage !== undefined
              ? `${course.passingPercentage}%`
              : '',

          isMandatory: course.isMandatory ? 'Yes' : 'No',

          createdBy: user.displayName || '',

          createdDate: record.createdAt
            ? moment(record.createdAt).format('DD-MM-YYYY')
            : '',

          remark: authorizations[0]?.rejectionRemarks || course.rejectionRemarks || '',

          status:
            [0, 1, 2].includes(course.authorizationStatus)
              ? 'Pending'
              : course.authorizationStatus === 3
              ? 'Approved'
              : 'Rejected',
        };

        if (authorizations.length === 0) {
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: '',
            authorizerStatus: '',
            authRemarks: '',
          });

          excelRow.height = 20;

          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };

            cell.alignment = {
              vertical: 'middle',
              wrapText: true,
            };
          });
        } else {
          for (const auth of authorizations) {
            const excelRow = worksheet.addRow({
              ...commonFields,

              authorizer:
                auth.authorizedPerson?.displayName || auth.userMaster?.displayName || '',

              authorizerStatus:
                auth.authstatus == 0
                  ? 'Rejected'
                  : auth.authstatus == 1
                  ? 'Approved'
                  : auth.authstatus == 2
                  ? 'Pending'
                  : '',

              authRemarks: auth.rejectionRemarks || auth.remarks || '',
            });

            excelRow.height = 20;

            excelRow.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };

              cell.alignment = {
                vertical: 'middle',
                wrapText: true,
              };
            });
          }
        }

        // merge common columns
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21,
          ];

          columnsToMerge.forEach((col) => {
            worksheet.mergeCells(mergeStart, col, mergeEnd, col);
          });
        }

        currentRowIndex += rowCount;
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="CourseAuthorizations.xlsx"'
      );

      await workbook.xlsx.write(res);

      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: courseAuthorizationRequests.rows,
      totalcount: courseAuthorizationRequests.count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Counts of Pending, Approved, Rejected Course Authorization Requests
 */
exports.getCourseAuthCount = async (req, res, next) => {
  try {
    const authUserMasterID = req.userDetails.userMasterId;

    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      CourseAuthorizationRequest.count({
        where: {
          userMasterID: authUserMasterID,
          authstatus: 2,
          status: 1,
          '$course.authorizationStatus$': { [Sequelize.Op.notIn]: [3, 4, 5] },
        },
        include: [{ model: Course, as: 'course', required: true, paranoid: false }],
      }),
      CourseAuthorizationRequest.count({
        where: { userMasterID: authUserMasterID, authstatus: 1, status: 1 },
      }),
      CourseAuthorizationRequest.count({
        where: { userMasterID: authUserMasterID, authstatus: 0, status: 1 },
      }),
    ]);

    return res.status(200).json({
      status: 200,
      data: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept or Reject Course Authorization Request(s)
 * Full authorization workflow following extraDaysAuthorization.controller.js pattern
 */
exports.authorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      AuthorizationRequestId,
      extraDaysAuthorizationID,
      id,
      remarks,
      rejectionRemarks,
      authstatus,
      authStatus,
    } = req.body;

    const courseAuthID =
      AuthorizationRequestId || extraDaysAuthorizationID || id;

    const courseAuthorizationIDList = (
      Array.isArray(courseAuthID) ? courseAuthID : [courseAuthID]
    ).filter(Boolean);

    const statusValue =
      authStatus !== undefined
        ? parseInt(authStatus, 10)
        : authstatus !== undefined
        ? parseInt(authstatus, 10)
        : undefined;

    const remarkValue =
      remarks !== undefined ? remarks : rejectionRemarks || null;

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await CourseAuthorizationRequest.findAll({
      where: {
        AuthorizationRequestId: courseAuthorizationIDList,
        authstatus: 2,
      },
      attributes: [
        'AuthorizationRequestId',
        'userMasterID',
        'authstatus',
        'ReferenceID',
        'createBy',
      ],
      include: [
        {
          model: Course,
          as: 'course',
          where: {
            authorizationStatus: [1, 2], // 1=>Pending Any, 2=>Pending Sequence
          },
          attributes: [
            'id',
            'title',
            'createdBy',
            'authorizationStatus',
            'companyMasterID',
            'deadline',
            'isMandatory',
            'isSelfEnroll',
            'AuthorizationCriteriaID',
          ],
          include: [
            {
              model: UserMaster,
              as: 'createBy',
              attributes: ['displayName', 'userMasterID', 'firstName', 'lastName'],
              include: [
                {
                  separate: true,
                  model: AuthorizationDetails,
                  attributes: [
                    'AuthorizationDetailsId',
                    'AuthorizationCriteriaID',
                    'AuthorizationMasterID',
                    'AuthorizedByUserMasterId',
                  ],
                  where: {
                    AuthorizationMasterID:
                      authorizationMasterTypes.lmsCourse,
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
      ...options,
    });

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 500,
        message: 'Course Authorization request not found',
      });
    }

    if (statusValue == 0) {
      // REJECT
      const allCourseIds = authRequests.map((e) => e?.course?.id).filter(Boolean);

      const allAuthorizer = await getAllCourses(allCourseIds, options);

      const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
        (e.courseAuthorizations || []).map((id) => id.AuthorizationRequestId)
      );

      const getIdtoUpdateCourseAuth = allIdToDestroyInbox.filter((item) =>
        courseAuthorizationIDList.includes(item)
      );

      await updateCourseAuth(
        getIdtoUpdateCourseAuth,
        options,
        remarkValue,
        statusValue
      );
      await destroyAllInboxes(allIdToDestroyInbox, options);
      await updateCourse(
        allCourseIds,
        options,
        4, // REJECTED
        req.userDetails.userMasterId,
        true,
        remarkValue
      );

      // Create UserInbox notifications for Course Creators
      for (const reqItem of authRequests) {
        const creatorId =
          reqItem.course?.createdBy || reqItem.course?.createBy?.userMasterID;
        const courseTitle = reqItem.course?.title || 'Course';
        if (creatorId) {
          await UserInbox.create(
            {
              activityTable: 'courses',
              activityTablePK: reqItem.course.id,
              message: `Your course '${courseTitle}' was rejected by ${
                req.userDetails.displayName || 'Authorizer'
              }. Reason: ${remarkValue || 'No remarks provided.'}`,
              assignedTo: creatorId,
              assignedBy: req.userDetails.userMasterId,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Course Authorization request rejected successfully',
      });
    } else {
      // APPROVE (statusValue == 1)
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateCourse = [];
      let allIDsToUpdateCourseAuth = [];
      let bulkNotification = [];

      // Fetch creator AuthorizationDetails reliably to ensure SequenceNo has exact authorizer IDs
      const creatorUserIds = [
        ...new Set(
          authRequests
            .map((e) => e.course?.createdBy || e.createBy || e.course?.createBy?.userMasterID)
            .filter(Boolean)
        ),
      ];

      const allCreatorAuthDetails = await AuthorizationDetails.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: creatorUserIds },
          AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
          status: 1,
        },
        transaction,
      });

      authRequests.map((data) => {
        const creatorId =
          data?.course?.createdBy || data?.createBy || data?.course?.createBy?.userMasterID;
        const matchedAuthDetail = allCreatorAuthDetails.find(
          (ad) => ad.userMasterID === creatorId
        );

        const authCriteria =
          data?.course?.AuthorizationCriteriaID ||
          matchedAuthDetail?.AuthorizationCriteriaID ||
          data?.course?.createBy?.authorizationDetails?.[0]?.AuthorizationCriteriaID;

        const authCriteriaNum =
          authCriteria !== undefined && authCriteria !== null
            ? +authCriteria
            : null;

        if (
          authCriteriaNum === authorizationCriteriaType.ANYONE ||
          !authCriteriaNum
        ) {
          anyOneData.push({
            AuthorizationRequestId: data.AuthorizationRequestId,
            courseId: data.ReferenceID,
          });
        } else if (authCriteriaNum === authorizationCriteriaType.ANYTWO) {
          anyTwoData.push({
            AuthorizationRequestId: data.AuthorizationRequestId,
            courseId: data.ReferenceID,
          });
        } else if (authCriteriaNum === authorizationCriteriaType.ANYTHREE) {
          anyThreeData.push({
            AuthorizationRequestId: data.AuthorizationRequestId,
            courseId: data.ReferenceID,
          });
        } else if (authCriteriaNum === authorizationCriteriaType.SEQUENCENO) {
          const authorizerIDs =
            matchedAuthDetail?.AuthorizedByUserMasterId ||
            data?.course?.createBy?.authorizationDetails?.[0]?.AuthorizedByUserMasterId ||
            [];
          sequenceWise.push({
            AuthorizationRequestId: data.AuthorizationRequestId,
            courseId: data.ReferenceID,
            authorizerIDs: authorizerIDs,
            userNameForNotification:
              data.course?.createBy?.displayName || 'Creator',
            assignedBy: creatorId,
            courseTitle: data.course?.title || 'Course',
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllCourseIds = anyOneData.map((e) => e.courseId);

        const getAllAuthorizers = await getAllCourses(
          getAllCourseIds,
          options
        );

        const getAllIdsToDestroyInbox = getAllAuthorizers.flatMap((e) =>
          (e.courseAuthorizations || []).map((id) => id.AuthorizationRequestId)
        );
        const getIdtoUpdateCourseAuth = getAllIdsToDestroyInbox.filter(
          (item) => courseAuthorizationIDList.includes(item)
        );

        allIDsToUpdateCourseAuth = [
          ...allIDsToUpdateCourseAuth,
          ...getIdtoUpdateCourseAuth,
        ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestroyInbox,
        ];
        allIDsToUpdateCourse = [
          ...allIDsToUpdateCourse,
          ...getAllCourseIds,
        ];
      }

      if (anyTwoData.length > 0) {
        const getAllCourseId = anyTwoData.map((e) => e.courseId);
        const getAuthorizationReqId = anyTwoData.map(
          (e) => e.AuthorizationRequestId
        );

        const getAllCourse = await getAllCourses(getAllCourseId, options);

        const otherAuthorizers = [];
        const courseApprovedIds = [];

        getAllCourse.forEach((item) => {
          const authorizers = item.courseAuthorizations || [];
          const approved = authorizers.filter((a) => a.authstatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.AuthorizationRequestId);
            otherAuthorizers.push(...allIds);
            courseApprovedIds.push(item.id);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAuthorizationReqId];
        const getIdtoUpdateCourseAuth = getAuthorizationReqId.filter((item) =>
          courseAuthorizationIDList.includes(item)
        );

        allIDsToUpdateCourseAuth = [
          ...allIDsToUpdateCourseAuth,
          ...getIdtoUpdateCourseAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCourse = [
          ...allIDsToUpdateCourse,
          ...courseApprovedIds,
        ];
      }

      if (anyThreeData.length > 0) {
        const getAllCourseId = anyThreeData.map((e) => e.courseId);
        const getAuthorizationReqId = anyThreeData.map(
          (e) => e.AuthorizationRequestId
        );

        const getAllCourse = await getAllCourses(getAllCourseId, options);

        const otherAuthorizers = [];
        const courseApprovedIds = [];

        getAllCourse.forEach((item) => {
          const authorizers = item.courseAuthorizations || [];
          const approved = authorizers.filter((a) => a.authstatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.AuthorizationRequestId);
            otherAuthorizers.push(...allIds);
            courseApprovedIds.push(item.id);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAuthorizationReqId];
        const getIdtoUpdateCourseAuth = getAuthorizationReqId.filter((item) =>
          courseAuthorizationIDList.includes(item)
        );

        allIDsToUpdateCourseAuth = [
          ...allIDsToUpdateCourseAuth,
          ...getIdtoUpdateCourseAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCourse = [
          ...allIDsToUpdateCourse,
          ...courseApprovedIds,
        ];
      }

      if (sequenceWise.length > 0) {
        const getAllCourseId = sequenceWise.map((e) => e.courseId);
        const getAuthorizationReqId = sequenceWise.map(
          (e) => e.AuthorizationRequestId
        );

        const otherAuthorizers = [];
        const courseApprovedIds = [];
        const createCourseAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateCourseAuth = getAuthorizationReqId.filter((item) =>
          courseAuthorizationIDList.includes(item)
        );
        await updateCourseAuth(
          getIdtoUpdateCourseAuth,
          options,
          remarkValue,
          statusValue
        );

        const getAllCourse = await getAllCourses(getAllCourseId, options);

        getAllCourse.forEach((item) => {
          const authorizers = item.courseAuthorizations || [];
          const approved = authorizers.filter(
            (a) =>
              a.authstatus === 1 ||
              getIdtoUpdateCourseAuth.includes(a.AuthorizationRequestId)
          );

          const seq = sequenceWise.find((x) => x.courseId === item.id);
          if (!seq) return;

          let sequenceUserIDs = seq.authorizerIDs || [];
          if (typeof sequenceUserIDs === 'string') {
            try {
              sequenceUserIDs = JSON.parse(sequenceUserIDs);
            } catch (e) {
              sequenceUserIDs = [];
            }
          }
          if (!Array.isArray(sequenceUserIDs)) {
            sequenceUserIDs = [];
          }
          sequenceUserIDs = sequenceUserIDs.map((id) => id.toString());

          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString()
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id)
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map((a) => a.AuthorizationRequestId);
            otherAuthorizers.push(...allIds);
            courseApprovedIds.push(item.id);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createCourseAuth.push({
            TableName: 'courses',
            ReferenceID: item.id,
            userMasterID: +nextUser,
            authstatus: 2,
            status: 1,
            createBy: seq.assignedBy,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAuthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCourse = [
          ...allIDsToUpdateCourse,
          ...courseApprovedIds,
        ];

        let createNewCourseAuth = [];
        if (createCourseAuth.length > 0) {
          createNewCourseAuth = await CourseAuthorizationRequest.bulkCreate(
            createCourseAuth,
            { ...options }
          );
        }

        sequenceWise.forEach((item) => {
          const data = createNewCourseAuth.find(
            (e) => e.ReferenceID == item.courseId
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              assignedBy: item.assignedBy,
              activityTable: CourseAuthorizationRequest.getTableName(),
              activityTablePK: data.AuthorizationRequestId,
              message: `${item.userNameForNotification} has submitted course '${item.courseTitle}' for authorization.`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(
            sendNotificationInbox,
            {
              ...options,
            }
          );
        }
      }

      await updateCourseAuth(
        allIDsToUpdateCourseAuth,
        options,
        remarkValue,
        statusValue
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);

      if (allIDsToUpdateCourse.length > 0) {
        await updateCourse(
          allIDsToUpdateCourse,
          options,
          3, // APPROVED
          req.userDetails.userMasterId,
          true,
          remarkValue
        );

        // Send notifications to Course Creators
        for (const reqItem of authRequests) {
          if (allIDsToUpdateCourse.includes(reqItem.ReferenceID)) {
            const creatorId =
              reqItem.course?.createdBy ||
              reqItem.course?.createBy?.userMasterID;
            const courseTitle = reqItem.course?.title || 'Course';
            if (creatorId) {
              await UserInbox.create(
                {
                  activityTable: 'courses',
                  activityTablePK: reqItem.ReferenceID,
                  message: `Your course '${courseTitle}' has been approved by ${
                    req.userDetails.displayName || 'Authorizer'
                  } and is now published!`,
                  assignedTo: creatorId,
                  assignedBy: req.userDetails.userMasterId,
                },
                { transaction }
              );
            }
          }
        }
      }

      await transaction.commit();

      const data = {
        screen: 'courseauth',
      };

      bulkNotification.forEach(async (item) => {
        const notif = {
          title: 'Course Authorization',
          body: item.message,
        };
        if (typeof sendNotification === 'function') {
          sendNotification(item.assignedTo, notif, data);
        }
      });

      return res.status(200).json({
        status: 200,
        message: 'Course Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function updateCourseAuth(allIdToUpdate, options, remarks, authStatus) {
  if (!allIdToUpdate || !allIdToUpdate.length) return;
  await CourseAuthorizationRequest.update(
    {
      rejectionRemarks: remarks || null,
      authstatus: authStatus,
      updateBy: options.user?.userMasterId || options.user?.userMasterID,
      updateByIp: options.user?.userIpAddress || null,
    },
    {
      where: {
        AuthorizationRequestId: allIdToUpdate,
      },
      ...options,
    }
  );
}

async function destroyAllInboxes(allIdToDestroyInbox, options) {
  if (!allIdToDestroyInbox || !allIdToDestroyInbox.length) return;
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
      activityTablePK: {
        [Sequelize.Op.in]: allIdToDestroyInbox,
      },
    },
    ...options,
  });
}

async function updateCourse(
  allCourseIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark = null
) {
  if (!allCourseIds || !allCourseIds.length) return;
  const isApproved = authorizationStatus === 3;
  await Course.update(
    {
      authorizationStatus: authorizationStatus,
      status: 1,
      courseStatus: isApproved ? 'PUBLISHED' : 'DRAFT',
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
      rejectionRemarks: remark,
      updatedBy: userMasterId,
      updatedByIp: options.user?.userIpAddress || null,
    },
    {
      where: {
        id: allCourseIds,
      },
      ...options,
    }
  );

  // When course is approved, snapshot its assessments and questions so that subsequent changes to master assessments will not alter this approved course
  if (isApproved) {
    for (const cId of allCourseIds) {
      await snapshotCourseAssessments(cId, {
        transaction: options?.transaction || null,
        userDetails: {
          userMasterId: userMasterId,
          userIpAddress: options?.user?.userIpAddress || null,
        },
      });
    }
  }
}

async function getAllCourses(allCourseIds, options) {
  if (!allCourseIds || !allCourseIds.length) return [];
  const allCourses = await Course.findAll({
    where: {
      id: { [Sequelize.Op.in]: allCourseIds },
    },
    attributes: ['id', 'title', 'createdBy'],
    include: [
      {
        model: UserMaster,
        as: 'createBy',
        attributes: ['userMasterID', 'displayName'],
      },
    ],
    ...options,
  });

  const allAuthorizers = await CourseAuthorizationRequest.findAll({
    where: {
      ReferenceID: { [Sequelize.Op.in]: allCourseIds },
      status: 1,
    },
    ...options,
  });

  return allCourseIds.map((courseId) => {
    const course = allCourses.find((c) => c.id == courseId);
    return {
      id: courseId,
      title: course?.title || 'Course',
      createdBy: course?.createdBy,
      createBy: course?.createBy,
      courseAuthorizations: allAuthorizers.filter(
        (a) => a.ReferenceID == courseId
      ),
    };
  });
}

/**
 * Submit a Course for Authorization
 */
exports.submitCourseForApproval = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId } = req.body;
    const userId = req.userDetails.userMasterId;
    const userIp = req.userDetails.userIpAddress || null;

    let userDisplayName = req.userDetails?.displayName ||
      ((req.userDetails?.firstName || '') + ' ' + (req.userDetails?.lastName || '')).trim();

    if (!userDisplayName && userId) {
      const creatorUser = await UserMaster.findOne({
        where: { userMasterID: userId },
        attributes: ['displayName', 'firstName', 'lastName'],
        transaction,
      });
      if (creatorUser) {
        userDisplayName = creatorUser.displayName ||
          ((creatorUser.firstName || '') + ' ' + (creatorUser.lastName || '')).trim();
      }
    }
    if (!userDisplayName) {
      userDisplayName = 'Course Creator';
    }

    if (!courseId) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Course ID is required',
      });
    }

    const course = await Course.findOne({
      where: { id: courseId },
      transaction,
    });

    if (!course) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: 'Course not found',
      });
    }

    // Check if authorization rules exist for LMS Course
    const authorizationDetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
        userMasterID: userId,
        status: 1,
      },
      transaction,
    });

    // Safely parse AuthorizedByUserMasterId into an array of integers
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

    if (authorizationDetails && authorizerList.length > 0) {
      const isSequence =
        +authorizationDetails.AuthorizationCriteriaID === authorizationCriteriaType.SEQUENCENO ||
        authorizationDetails.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO;
      const initialAuthStatus = isSequence ? 2 : 1; // 2: Sequence pending, 1: Any pending

      // Delete any previous authorization requests and inboxes for this course
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
                'courseAuthorizations',
                'CourseAuthorizationRequests',
                'course_authorization_requests',
                'courses',
                CourseAuthorizationRequest.getTableName(),
              ],
            },
            activityTablePK: { [Sequelize.Op.in]: prevAuthIds },
          },
          transaction,
        });
      }

      await CourseAuthorizationRequest.destroy({
        where: { ReferenceID: courseId },
        transaction,
      });

      // Update Course status to Draft / Pending Authorization
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
          updatedBy: userId,
          updatedByIp: userIp,
        },
        {
          where: { id: courseId },
          transaction,
        }
      );

      const authorizerIds = isSequence ? [authorizerList[0]] : authorizerList;

      for (const authUserId of authorizerIds) {
        const authReq = await CourseAuthorizationRequest.create(
          {
            TableName: 'courses',
            ReferenceID: courseId,
            userMasterID: authUserId,
            status: 1,
            authstatus: 2,
            createBy: userId,
            createByIp: userIp,
          },
          { transaction }
        );

        await UserInbox.create(
          {
            activityTable: 'courseAuthorizations',
            activityTablePK: authReq.AuthorizationRequestId,
            message: `${userDisplayName} has submitted course '${course.title}' for authorization.`,
            assignedTo: authUserId,
            assignedBy: userId,
          },
          { transaction }
        );

        try {
          if (typeof sendNotification === 'function') {
            await sendNotification(
              authUserId,
              {
                title: 'Course Authorization',
                body: `${userDisplayName} submitted course '${course.title}' for authorization.`,
              },
              { screen: 'courseauth' }
            );
          }
        } catch (notifErr) {
          console.error('Error sending course auth push notification:', notifErr);
        }
      }

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Course submitted for authorization successfully',
        data: {
          courseId,
          authorizationStatus: initialAuthStatus,
          isPendingAuthorization: true,
        },
      });
    } else {
      // No authorization workflow configured -> Auto-publish directly
      await Course.update(
        {
          authorizationStatus: 3, // Approved
          status: 1,              // Published & Active
          courseStatus: 'PUBLISHED',
          isAuthorizedBy: true,
          authorizerRemark: null,
          rejectionRemarks: null,
          authorizedBy: userId,
          authorizedAt: new Date(),
          updatedBy: userId,
          updatedByIp: userIp,
        },
        {
          where: { id: courseId },
          transaction,
        }
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Course published successfully',
        data: {
          courseId,
          authorizationStatus: 3,
          isPendingAuthorization: false,
        },
      });
    }
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Cancel Course Authorization Request
 */
exports.cancelCourseAuthorizationRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId, id, cancelRemarks } = req.body;
    const targetCourseId = courseId || id;

    const existCourse = await Course.findOne({
      where: {
        id: targetCourseId,
      },
      transaction,
    });

    if (existCourse) {
      // Find all authorization requests for this course
      const authRequests = await CourseAuthorizationRequest.findAll({
        where: { ReferenceID: targetCourseId },
        attributes: ['AuthorizationRequestId'],
        transaction,
      });
      const authRequestIds = authRequests.map((r) => r.AuthorizationRequestId);

      // Clean up all authorizers' inboxes
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

      // Destroy authorization requests
      await CourseAuthorizationRequest.destroy({
        where: { ReferenceID: targetCourseId },
        transaction,
      });

      // Reset course status to Draft
      existCourse.authorizationStatus = 0; // Draft
      existCourse.courseStatus = 'DRAFT';
      existCourse.isAuthorizedBy = false;
      if (cancelRemarks) {
        existCourse.authorizerRemark = cancelRemarks;
        existCourse.rejectionRemarks = cancelRemarks;
      }
      await existCourse.save({ user: req.userDetails, transaction });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Course Authorization Request Cancelled Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Admin Get All Course Authorization Requests
 * Exactly follows extraDaysAuthorization.controller.js (getAllExtraDaysAuthorizationAdmin)
 */
exports.getAllCourseAuthorizationAdmin = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
      companyMasterID,
    } = req.body;

    let { enddate } = req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { status: 1 };

    if (userMasterID && userMasterID.length > 0) {
      condition.createdBy = { [Sequelize.Op.in]: userMasterID };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [1, 2];
      } else {
        condition.authorizationStatus = parseInt(authorizationstatus, 10);
      }
    } else {
      condition.authorizationStatus = [1, 2];
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getAllCourseAuth = await Course.findAndCountAll({
      distinct: true,
      col: 'id',
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName', 'userNumber', 'photo', 'email'],
          where: {
            ...where,
            companyMasterId: companyMasterID,
            status: 1,
          },
          include: [
            ...includeModels,
            {
              separate: true,
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['designationID'],
              include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['departmentID'],
              include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['branchID'],
              include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName'] }],
            },
            {
              separate: true,
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['divisionId', 'startDate'],
              include: [{ model: Division, attributes: ['divisionName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['workingAreaId', 'startDate'],
              include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
            },
          ],
        },
        {
          model: CompanyMaster,
          as: 'companyMaster',
          attributes: ['companyMasterID', 'companyName'],
          required: false,
        },
        {
          separate: true,
          model: LmsCourseDepartment,
          as: 'courseDepartments',
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentId', 'departmentName'],
            },
          ],
        },
        {
          separate: true,
          model: LmsCourseDesignation,
          as: 'courseDesignations',
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationId', 'designationName'],
            },
          ],
        },
        {
          separate: true,
          model: LmsCourseUser,
          as: 'courseUsers',
          include: [
            {
              model: UserMaster,
              as: 'user',
              attributes: ['userMasterID', 'displayName', 'userNumber'],
            },
          ],
        },
        {
          separate: true,
          model: CourseAssessment,
          as: 'courseAssessments',
          where: { status: 1 },
          required: false,
          include: [
            {
              model: Assessment,
              as: 'assessment',
              required: false,
            },
          ],
        },
        {
          separate: true,
          model: CourseAuthorizationRequest,
          as: 'courseAuthorizations',
          include: [
            {
              model: UserMaster,
              as: 'authorizedPerson',
              attributes: ['displayName', 'userMasterID'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'authorizedByUser',
          attributes: ['displayName', 'userMasterID'],
          required: false,
        },
        {
          model: AuthorizationCriteria,
          as: 'AuthorizationCriteriaMaster',
          attributes: ['AuthorizationCriteria', 'AuthorizationCriteriaID'],
          required: false,
        },
      ],
    });

    getAllCourseAuth.rows.forEach((course) => {
      const criteriaName =
        course.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        course.createBy?.authorizationDetails?.[0]?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        '';
      const depts = (course.courseDepartments || [])
        .map((d) => d.department?.departmentName)
        .filter(Boolean);
      const desigs = (course.courseDesignations || [])
        .map((d) => d.designation?.designationName)
        .filter(Boolean);
      const users = (course.courseUsers || [])
        .map((u) => {
          if (!u.user) return '';
          return u.user.userNumber
            ? `${u.user.displayName} (${u.user.userNumber})`
            : u.user.displayName;
        })
        .filter(Boolean);
      const cName =
        course.companyMaster?.companyName ||
        course.createBy?.companyMaster?.companyName ||
        '';

      course.dataValues.companyName = cName;
      course.dataValues.selectedDepartments = depts;
      course.dataValues.selectedDesignations = desigs;
      course.dataValues.selectedUsers = users;
      course.dataValues.AuthorizationCriteria = criteriaName;
      course.dataValues.authorizer = course.isAuthorizedBy
        ? course.authorizedByUser?.displayName || null
        : null;
      course.dataValues.finalRemark = course.isAuthorizedBy
        ? course.authorizerRemark || course.rejectionRemarks || null
        : null;
    });

    return res.status(200).json({
      status: 200,
      data: userMasterID.length > 0 ? getAllCourseAuth.rows : [],
      totalcount: userMasterID.length > 0 ? getAllCourseAuth.count : 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Accept/Reject Course Authorization Request(s)
 * Exactly follows extraDaysAuthorization.controller.js (acceptRejectExtraDaysAuth)
 */
exports.acceptRejectCourseAuthAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId, id, authstatus, rejectionRemarks } = req.body;
    const targetCourseId = courseId || id;

    if (!targetCourseId) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Course Authorization Request'),
      });
    }

    const courseIdList = (
      Array.isArray(targetCourseId) ? targetCourseId : [targetCourseId]
    ).filter(Boolean);

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const allCourses = await getAllCourses(courseIdList, options);

    if (allCourses.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Course Authorization Request'),
      });
    }

    const idToUpdateCourse = allCourses.map((item) => item.id);
    const idToDestroyInbox = allCourses.flatMap((item) =>
      (item.courseAuthorizations || []).map((e) => e.AuthorizationRequestId)
    );

    // Destroy all authorizers' inboxes
    await destroyAllInboxes(idToDestroyInbox, options);

    // Update Course table
    await updateCourse(
      idToUpdateCourse,
      options,
      authstatus == 1 ? 3 : 4, // 3: APPROVED, 4: REJECTED
      req.userDetails.userMasterId,
      true, // isAuthorizedBy
      rejectionRemarks ||
        (authstatus == 1 ? 'Approved by Admin' : 'Rejected by Admin')
    );

    // Send notifications to Course Creators
    for (const courseItem of allCourses) {
      const creatorId =
        courseItem.createdBy || courseItem.createBy?.userMasterID;
      const courseTitle = courseItem.title || 'Course';
      if (creatorId) {
        await UserInbox.create(
          {
            activityTable: 'courses',
            activityTablePK: courseItem.id,
            message:
              authstatus == 1
                ? `Your course '${courseTitle}' has been approved by Administrator (${
                    req.userDetails.displayName || 'Admin'
                  }) and is now published!`
                : `Your course '${courseTitle}' was rejected by Administrator (${
                    req.userDetails.displayName || 'Admin'
                  }). Reason: ${rejectionRemarks || 'No remarks provided.'}`,
            assignedTo: creatorId,
            assignedBy: req.userDetails.userMasterId,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authstatus == 1
          ? 'Course Authorization Request Approved Successfully'
          : 'Course Authorization Request Rejected Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get Course Authorization Details by ID (for Admin Show Data Modal)
 * Exactly follows extraDaysAuthorization.controller.js (getExtradaysAuthorizationRequestById)
 */
exports.getCourseAuthAdminById = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id || req.body.courseId;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const course = await Course.findOne({
      where: { id },
      include: [
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName', 'userNumber', 'photo', 'email'],
          include: [
            {
              separate: true,
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
            {
              model: CompanyMaster,
              attributes: ['companyName', 'companyLogo', 'companyMasterID'],
            },
            {
              separate: true,
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['designationID'],
              include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['departmentID'],
              include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['branchID'],
              include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName'] }],
            },
            {
              separate: true,
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['divisionId', 'startDate'],
              include: [{ model: Division, attributes: ['divisionName'] }],
            },
            {
              required: false,
              separate: true,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['workingAreaId', 'startDate'],
              include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
            },
          ],
        },
        {
          model: CompanyMaster,
          as: 'companyMaster',
          attributes: ['companyMasterID', 'companyName'],
          required: false,
        },
        {
          separate: true,
          model: LmsCourseDepartment,
          as: 'courseDepartments',
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentId', 'departmentName'],
            },
          ],
        },
        {
          separate: true,
          model: LmsCourseDesignation,
          as: 'courseDesignations',
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationId', 'designationName'],
            },
          ],
        },
        {
          separate: true,
          model: LmsCourseUser,
          as: 'courseUsers',
          include: [
            {
              model: UserMaster,
              as: 'user',
              attributes: ['userMasterID', 'displayName', 'userNumber'],
            },
          ],
        },
        {
          separate: true,
          model: CourseAuthorizationRequest,
          as: 'courseAuthorizations',
          include: [
            {
              model: UserMaster,
              as: 'authorizedPerson',
              attributes: ['displayName', 'userMasterID'],
            },
          ],
        },
        {
          separate: true,
          model: CourseAssessment,
          as: 'courseAssessments',
          where: { status: 1 },
          required: false,
          include: [
            {
              model: Assessment,
              as: 'assessment',
              required: false,
            },
          ],
        },
        {
          model: UserMaster,
          as: 'authorizedByUser',
          attributes: ['displayName', 'userMasterID'],
          required: false,
        },
        {
          model: AuthorizationCriteria,
          as: 'AuthorizationCriteriaMaster',
          attributes: ['AuthorizationCriteria', 'AuthorizationCriteriaID'],
          required: false,
        },
      ],
    });

    if (!course) {
      return res.status(200).json({
        status: 404,
        message: 'Course not found',
      });
    }

    const activeAssessments = (course.courseAssessments || []).filter((ca) => ca.status === 1);
    const postAssessmentBinding = activeAssessments.find(
      (ca) => ca.type === 'POST_ASSESSMENT'
    );
    const hasPostAssessment = !!postAssessmentBinding;
    const hasAssessment = activeAssessments.length > 0;
    const resolvedPassingPercentage = hasPostAssessment
      ? postAssessmentBinding.assessment?.passingPercentage || course.passingPercentage || 70
      : null;

    const creator = course.createBy || {};
    const authorizations = course.courseAuthorizations || [];

    // Parse configured authorizers from creator's authorization details
    let configuredAuthorizerIds =
      creator.authorizationDetails?.[0]?.AuthorizedByUserMasterId || [];
    if (typeof configuredAuthorizerIds === 'string') {
      try {
        configuredAuthorizerIds = JSON.parse(configuredAuthorizerIds);
      } catch (e) {
        configuredAuthorizerIds = [];
      }
    }
    if (!Array.isArray(configuredAuthorizerIds)) {
      configuredAuthorizerIds = [];
    }

    let authUserStatusData = [];
    if (configuredAuthorizerIds.length > 0) {
      const missingIds = configuredAuthorizerIds.filter(
        (id) => !authorizations.some((a) => a.userMasterID == id)
      );
      let missingUsers = [];
      if (missingIds.length > 0) {
        missingUsers = await UserMaster.findAll({
          where: { userMasterID: { [Sequelize.Op.in]: missingIds } },
          attributes: ['userMasterID', 'displayName'],
        });
      }

      authUserStatusData = configuredAuthorizerIds.map((authId) => {
        const auth = authorizations.find((a) => a.userMasterID == authId);
        if (auth) {
          const isApprovedByThisAuthorizer =
            auth.authstatus == 1 &&
            auth.rejectionRemarks !== 'Approved by Admin';

          const authStatus = isApprovedByThisAuthorizer ? 1 : 2;
          return {
            userMasterID: auth.userMasterID,
            displayName:
              auth.authorizedPerson?.displayName ||
              missingUsers.find((u) => u.userMasterID == authId)?.displayName ||
              '',
            authStatus: authStatus,
            remarks: authStatus != 2 ? (auth.rejectionRemarks || auth.remarks || '') : '',
            updatedAt: authStatus != 2 ? auth.updatedAt : null,
          };
        } else {
          const u = missingUsers.find((user) => user.userMasterID == authId);
          return {
            userMasterID: authId,
            displayName: u?.displayName || '',
            authStatus: 2, // Pending
            remarks: '',
            updatedAt: null,
          };
        }
      });
    } else {
      authUserStatusData = authorizations.map((auth) => {
        const isApprovedByThisAuthorizer =
          auth.authstatus == 1 &&
          auth.rejectionRemarks !== 'Approved by Admin';
        const authStatus = isApprovedByThisAuthorizer ? 1 : (auth.authstatus == 0 ? 0 : 2);
        return {
          userMasterID: auth.userMasterID,
          displayName: auth.authorizedPerson?.displayName || '',
          authStatus: authStatus,
          remarks: authStatus != 2 ? (auth.rejectionRemarks || auth.remarks || '') : '',
          updatedAt: authStatus != 2 ? auth.updatedAt : null,
        };
      });
    }

    const depts = (course.courseDepartments || [])
      .map((d) => d.department?.departmentName)
      .filter(Boolean);
    const desigs = (course.courseDesignations || [])
      .map((d) => d.designation?.designationName)
      .filter(Boolean);
    const users = (course.courseUsers || [])
      .map((u) => {
        if (!u.user) return '';
        return u.user.userNumber
          ? `${u.user.displayName} (${u.user.userNumber})`
          : u.user.displayName;
      })
      .filter(Boolean);
    const cName =
      course.companyMaster?.companyName ||
      creator.companyMaster?.companyName ||
      '';

    const responseData = {
      courseId: course.id,
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      passingPercentage: resolvedPassingPercentage,
      hasAssessment,
      hasPostAssessment,
      courseAssessments: activeAssessments,
      estimatedDuration: course.estimatedDuration || 0,
      certificateEnabled: course.certificateEnabled !== false,
      certificateExpiryType: course.certificateExpiryType || 'LIFETIME',
      certificateExpiryDays: course.certificateExpiryDays || null,
      allowReassignmentOnCertExpiry: course.allowReassignmentOnCertExpiry !== false,
      deadline: course.deadline || null,
      isMandatory: course.isMandatory,
      authorizationStatus: course.authorizationStatus,
      userMasterID: creator.userMasterID,
      displayName: creator.displayName,
      userNumber: creator.userNumber,
      companyName: cName,
      selectedDepartments: depts,
      selectedDesignations: desigs,
      selectedUsers: users,
      courseDepartments: course.courseDepartments || [],
      courseDesignations: course.courseDesignations || [],
      courseUsers: course.courseUsers || [],
      employeeCode: creator.employeeJoiningDetails?.[0]?.employeeCode || '',
      branch: creator.employeeBranches?.[0]?.branchMaster?.branchName || '',
      department: creator.employeeDepartments?.[0]?.department?.departmentName || '',
      designation: creator.employeeDesignations?.[0]?.designation?.designationName || '',
      division: creator.employeeDivisions?.[0]?.division?.divisionName || null,
      workingArea: creator.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || null,
      createdAt: course.createdAt,
      AuthorizationCriteria:
        course.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        creator.authorizationDetails?.[0]?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
        '',
      AuthorizationCriteriaID: course.AuthorizationCriteriaID || null,
      authUserStatus: authUserStatusData,
      createdByUser: creator.displayName || '',
      authorizer: course.authorizedByUser?.displayName || null,
      finalRemark: course.authorizerRemark || course.rejectionRemarks || null,
      authorizerRemark: course.authorizerRemark || course.rejectionRemarks || null,
    };

    return res.status(200).json({
      status: 200,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};
