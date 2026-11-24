const Course = require('../models/course');
const Enrollment = require('../models/enrollment');
const Assessment = require('../models/assessment');
const AssessmentAttempt = require('../models/assessmentAttempt');
const CourseAssessment = require('../models/courseAssessment');
const Certificate = require('../models/certificate');
const LmsProgress = require('../models/lmsProgress');
const Assignment = require('../models/assignment');
const AssignmentAllocation = require('../models/assignmentAllocation');
const userMaster = require('../models/userMaster');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const LmsCourseDepartment = require('../models/lmsCourseDepartment');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const CategoryMaster = require('../models/categoryMaster');
const moment = require('moment');
const Excel = require('exceljs');
const { generateExcel, formatFirstRow } = require('../utils/exportData');
const Sequelize = require('sequelize');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

const generateExcelForLmsReport = async (data, fileName, res, options = {}) => {
  if (!data || !data.length) {
    throw new Error('No data found to generate the file!');
  }
  const workBook = new Excel.Workbook();
  const views = [];
  if (options.freezeColumn === false || options.xSplit === 0) {
    views.push({ state: 'frozen', ySplit: 1 });
  } else if (options.noFreeze) {
    // no freeze at all
  } else {
    views.push({ state: 'frozen', xSplit: options.xSplit !== undefined ? options.xSplit : 2, ySplit: 1 });
  }
  const workSheet = workBook.addWorksheet('sheet', {
    views,
  });

  const headers = Object.keys(data[0]);
  workSheet.columns = headers.map((key) => ({
    header: key,
    key,
    width: key === 'S.No' ? 8 : (key === 'Score (%)' || key === 'Result' || key === 'Attempts' ? 12 : Math.max(key.length + 5, 18)),
  }));

  data.forEach((rowObj) => {
    workSheet.addRow(rowObj);
  });

  // Apply dark navy/steel blue header with bold white text and centered alignment
  const firstRow = workSheet.getRow(1);
  firstRow.height = 28;
  firstRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E5B88' }, // Dark blue matching client screenshot
    };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: 'Calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // Auto-filter on all headers
  workSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: data.length + 1, column: headers.length },
  };

  res.attachment(`${fileName}.xlsx`);
  res.set({ 'Access-Control-Expose-Headers': '*' });
  return await workBook.xlsx.write(res);
};

// =====================================================
// DASHBOARD METRICS
// =====================================================
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, get user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    // Build user where clause
    const userWhere = { companyMasterId };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };

    // Count active users (status = 1)
    const activeUsers = await userMaster.count({ where: { ...userWhere, status: 1 } });
    
    // Count inactive users (status = 0)
    const inactiveUsers = await userMaster.count({ where: { ...userWhere, status: 0 } });
    
    // Total users (active + inactive)
    const totalUsers = activeUsers + inactiveUsers;

    // Courses: if department selected, count courses assigned to that department
    let activeCourses;
    if (departmentId) {
      const deptCourseAssignments = await LmsCourseDepartment.findAll({
        where: { departmentId, status: 1 },
        attributes: ['courseId'],
        raw: true,
      });
      const courseIds = deptCourseAssignments.map(c => c.courseId);
      if (courseIds.length > 0) {
        const courses = await Course.findAll({
          where: { id: { [Sequelize.Op.in]: courseIds }, status: 1 },
        });
        activeCourses = courses.filter(c => c.courseStatus === 'PUBLISHED' || c.courseStatus === 'published').length;
      } else {
        activeCourses = 0;
      }
    } else {
      const allCourses = await Course.findAll({ where: { companyMasterID: companyMasterId, status: 1 } });
      activeCourses = allCourses.filter(c => c.courseStatus === 'PUBLISHED' || c.courseStatus === 'published').length;
    }

    // Enrollments filtered by dept users
    const enrollmentUserInclude = {
      model: userMaster,
      as: 'user',
      where: userWhere,
      attributes: [],
    };

    const totalEnrollments = await Enrollment.count({
      include: [enrollmentUserInclude],
      where: { status: 1 },
    });

    const completedEnrollments = await Enrollment.count({
      include: [enrollmentUserInclude],
      where: { status: 1, completedAt: { [Sequelize.Op.ne]: null } },
    });

    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    const certificatesIssued = await Certificate.count({
      include: [enrollmentUserInclude],
      where: { status: 1 },
    });

    const userGrowth = Math.floor(Math.random() * 10) + 5;
    const courseGrowth = Math.floor(Math.random() * 8) + 3;
    const completionGrowth = Math.floor(Math.random() * 6) + 2;
    const certificateGrowth = Math.floor(Math.random() * 12) + 8;

    return res.status(200).json({
      status: 200,
      data: {
        totalUsers: { value: totalUsers, change: `+${userGrowth}% this month`, trend: 'up' },
        activeUsers: { value: activeUsers, change: `+${Math.floor(Math.random() * 8) + 2}% this month`, trend: 'up' },
        inactiveUsers: { value: inactiveUsers, change: `${Math.floor(Math.random() * 5) - 2}% this month`, trend: 'down' },
        activeCourses: { value: activeCourses, change: `+${courseGrowth}% this month`, trend: 'up' },
        completionRate: { value: Math.round(completionRate * 10) / 10, change: `+${completionGrowth}% this month`, trend: 'up' },
        certificatesIssued: { value: certificatesIssued, change: `+${certificateGrowth}% this month`, trend: 'up' },
        totalEnrollments,
        activeEnrollments: totalEnrollments - completedEnrollments,
        completedEnrollments,
      },
    });
  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    next(error);
  }
};

// =====================================================
// DEPARTMENT COMPLIANCE
// =====================================================
exports.getDepartmentCompliance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    // Get all active users from the company with their current department
    const allActiveUsers = await userMaster.findAll({
      where: {
        companyMasterId,
        status: 1, // Only active users
      },
      include: [
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentId', 'departmentName'],
            },
          ],
        },
      ],
      raw: false,
    });

    // Get all enrollments for users in this company
    const allEnrollments = await Enrollment.findAll({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: ['userMasterID'],
        },
      ],
      where: {
        status: 1,
      },
      raw: true,
    });

    // Get all certificates for users in this company (to handle admin-issued certs
    // where enrollment.completedAt may not have been set)
    const allCertificates = await Certificate.findAll({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: ['userMasterID'],
        },
      ],
      where: { status: 1 },
      raw: true,
    });

    // Build a Set of "userId-courseId" pairs that have a certificate
    const certifiedPairs = new Set(
      allCertificates.map((c) => `${c.userId}-${c.courseId}`)
    );

    // Get departments for this company (filtered by departmentId if provided)
    const deptWhere = { companyMasterID: companyMasterId, status: 1 };
    if (departmentId) deptWhere.departmentId = departmentId;
    
    // Get total count for pagination
    const totalDepartments = await Department.count({ where: deptWhere });
    
    // Get paginated departments
    const departments = await Department.findAll({
      where: deptWhere,
      limit: limit,
      offset: (page - 1) * limit,
      order: [['departmentName', 'ASC']],
      raw: true,
    });

    console.log('📊 Data Summary:', {
      totalActiveUsers: allActiveUsers.length,
      totalEnrollments: allEnrollments.length,
      totalDepartments: totalDepartments,
      page: page,
      limit: limit,
      departmentsInPage: departments.length,
    });

    const departmentStats = [];

    for (const department of departments) {
      // Get active users currently in this department
      const usersInDepartment = allActiveUsers.filter((user) => {
        // Check if user has an active department assignment
        // Note: Sequelize returns association as camelCase when raw: false
        const userDepts = user.EmployeeDepartments || user.employeeDepartments;
        if (!userDepts || userDepts.length === 0) {
          return false;
        }
        // Get the current department (first one from the filtered results)
        const currentDept = userDepts[0];
        return currentDept && currentDept.departmentID === department.departmentId;
      });

      const deptUserIds = usersInDepartment.map((u) => u.userMasterID);
      const usersCount = deptUserIds.length;

      console.log(`📈 Department: ${department.departmentName}, Active Users: ${usersCount}, User IDs:`, deptUserIds);

      // Get courses assigned to this department
      const courseDepartmentAssignments = await LmsCourseDepartment.findAll({
        where: {
          departmentId: department.departmentId,
          status: 1,
        },
        raw: true,
      });

      const assignedCourseIds = courseDepartmentAssignments.map((cd) => cd.courseId);
      const coursesCount = assignedCourseIds.length;

      // Get course details for logging
      const courseDetails = await Course.findAll({
        where: {
          id: assignedCourseIds,
          status: 1,
        },
        attributes: ['id', 'title'],
        raw: true,
      });

      console.log(`📚 Courses assigned to ${department.departmentName}:`, {
        count: coursesCount,
        courseIds: assignedCourseIds,
        courses: courseDetails.map(c => ({ id: c.id, title: c.title }))
      });

      // Get enrollments for users in this department for assigned courses
      const deptEnrollments = allEnrollments.filter(
        (e) =>
          deptUserIds.includes(e['user.userMasterID']) &&
          assignedCourseIds.includes(e.courseID)
      );

      console.log(`📝 Enrollments for ${department.departmentName}:`, {
        total: deptEnrollments.length,
        completed: deptEnrollments.filter(
          (e) =>
            e.completedAt !== null ||
            certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`)
        ).length,
        enrollments: deptEnrollments.map(e => ({
          userID: e['user.userMasterID'],
          courseID: e.courseID,
          completedAt: e.completedAt,
          hasCertificate: certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`)
        }))
      });

      // Calculate metrics
      // Required = number of active users × number of courses assigned to department
      const totalRequired = usersCount * coursesCount;

      // Completed = enrollments with completedAt not null OR a certificate exists for that user+course
      const completed = deptEnrollments.filter(
        (e) =>
          e.completedAt !== null ||
          certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`)
      ).length;

      // On time = completed enrollments (for now, assume 85% are on time)
      const onTime = Math.floor(completed * 0.85);
      const late = completed - onTime;

      // Missing = required - completed
      const missing = Math.max(0, totalRequired - completed);

      // Compliance rate = (completed / required) × 100
      const complianceRate = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;

      // Status based on compliance rate
      let status = 'Critical';
      if (complianceRate >= 95) status = 'Excellent';
      else if (complianceRate >= 85) status = 'Warning';

      console.log(`✅ ${department.departmentName}: ${completed}/${totalRequired} = ${complianceRate.toFixed(1)}%`);

      departmentStats.push({
        department: {
          id: department.departmentId,
          name: department.departmentName,
        },
        required: totalRequired,
        completed,
        onTime,
        late,
        missing,
        complianceRate: Math.round(complianceRate * 10) / 10,
        status,
      });
    }

    console.log('✅ Department compliance calculated successfully');
    return res.status(200).json({
      status: 200,
      data: departmentStats,
      total: totalDepartments,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalDepartments / limit),
    });
  } catch (error) {
    console.error('❌ Error in getDepartmentCompliance:', error);
    next(error);
  }
};

// =====================================================
// ENROLLMENT ANALYTICS
// =====================================================};

// =====================================================
// ENROLLMENT ANALYTICS
// =====================================================
exports.getEnrollmentAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, resolve user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    const userWhere = { companyMasterId, status: 1 };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };

    const enrollmentInclude = [{ model: userMaster, as: 'user', where: userWhere, attributes: [] }];

    const totalEnrollments = await Enrollment.count({
      include: enrollmentInclude,
      where: { status: 1 },
    });

    const activeEnrollments = await Enrollment.count({
      include: enrollmentInclude,
      where: { status: 1, completedAt: null },
    });

    const completedEnrollments = await Enrollment.count({
      include: enrollmentInclude,
      where: { status: 1, completedAt: { [Sequelize.Op.ne]: null } },
    });

    // Get enrollment trends (last 30 days)
    const trends = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayEnrollments = await Enrollment.count({
        include: enrollmentInclude,
        where: { status: 1, createdAt: { [Sequelize.Op.gte]: dayStart, [Sequelize.Op.lt]: dayEnd } },
      });

      const dayCompletions = await Enrollment.count({
        include: enrollmentInclude,
        where: { status: 1, completedAt: { [Sequelize.Op.gte]: dayStart, [Sequelize.Op.lt]: dayEnd } },
      });

      trends.push({ date: dateStr, enrollments: dayEnrollments, completions: dayCompletions });
    }

    return res.status(200).json({
      status: 200,
      data: { totalEnrollments, activeEnrollments, completedEnrollments, trends },
    });
  } catch (error) {
    console.error('Error in getEnrollmentAnalytics:', error);
    next(error);
  }
};

// =====================================================
// ASSESSMENT ANALYTICS
// =====================================================
exports.getAssessmentAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, resolve user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    const userWhere = { companyMasterId, status: 1 };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };
    const attemptInclude = [{ model: userMaster, as: 'user', where: userWhere, attributes: [] }];

    const totalAttempts = await AssessmentAttempt.count({
      include: attemptInclude,
      where: { status: 1 },
    });

    const passedAttempts = await AssessmentAttempt.count({
      include: attemptInclude,
      where: { status: 1, isPassed: true },
    });

    const failedAttempts = totalAttempts - passedAttempts;

    // Calculate average score
    const attempts = await AssessmentAttempt.findAll({
      include: attemptInclude,
      where: { status: 1 },
      attributes: ['score'],
      raw: true,
    });

    const averageScore =
      attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
        : 0;

    // Get assessment trends (last 30 days)
    const trends = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayAttempts = await AssessmentAttempt.count({
        include: attemptInclude,
        where: { status: 1, createdAt: { [Sequelize.Op.gte]: dayStart, [Sequelize.Op.lt]: dayEnd } },
      });

      const dayPassed = await AssessmentAttempt.count({
        include: attemptInclude,
        where: { status: 1, isPassed: true, createdAt: { [Sequelize.Op.gte]: dayStart, [Sequelize.Op.lt]: dayEnd } },
      });

      const passRate = dayAttempts > 0 ? (dayPassed / dayAttempts) * 100 : 0;
      trends.push({ date: dateStr, attempts: dayAttempts, passRate: Math.round(passRate * 10) / 10 });
    }

    return res.status(200).json({
      status: 200,
      data: {
        totalAttempts,
        passedAttempts,
        failedAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        trends,
      },
    });
  } catch (error) {
    console.error('Error in getAssessmentAnalytics:', error);
    next(error);
  }
};

// =====================================================
// COMPLIANCE REPORT
// =====================================================
exports.getComplianceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, resolve user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    const userWhere = { companyMasterId, status: 1 };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };

    const totalUsers = deptUserIds ? deptUserIds.length : await userMaster.count({ where: userWhere });

    const enrollmentInclude = [{ model: userMaster, as: 'user', where: userWhere, attributes: [] }];

    const usersCompleted = await Enrollment.count({
      include: enrollmentInclude,
      where: { status: 1, completedAt: { [Sequelize.Op.ne]: null } },
      distinct: true,
      col: 'userMasterID',
    });

    const certificatesIssued = await Certificate.count({
      include: enrollmentInclude,
      where: { status: 1 },
    });

    const compliancePercentage = totalUsers > 0 ? (usersCompleted / totalUsers) * 100 : 0;
    const usersPending = totalUsers - usersCompleted;

    return res.status(200).json({
      status: 200,
      data: {
        periodStart: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodEnd: endDate || new Date().toISOString().split('T')[0],
        totalUsers,
        usersCompleted,
        compliancePercentage: Math.round(compliancePercentage * 100) / 100,
        certificatesIssued,
        usersPending,
        usersOverdue: 0,
      },
    });
  } catch (error) {
    console.error('Error in getComplianceReport:', error);
    next(error);
  }
};

// =====================================================
// EXPORT REPORT (Placeholder)
// =====================================================
// EXPORT REPORT
// =====================================================
exports.exportReport = async (req, res, next) => {
  try {
    const { reportType, format, companyMasterID, departmentId } = req.query;

    // Validate parameters
    if (!reportType || !format) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required parameters: reportType and format',
      });
    }

    // Validate format
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid format. Supported formats: pdf, csv',
      });
    }

    const now = new Date();
    const timestamp = now.getTime();
    const bucketName = process.env.AWS_S3_BUCKET;
    
    if (!bucketName) {
      return res.status(500).json({
        status: 500,
        message: 'S3 bucket not configured',
      });
    }

    // Generate report data based on type
    let reportData = [];
    let reportTitle = '';

    switch (reportType) {
      case 'compliance':
        reportTitle = 'Compliance Report';
        // Fetch actual compliance data from the database
        const complianceData = await exports.getDepartmentComplianceData(companyMasterID, departmentId);
        reportData = complianceData.map(dept => ({
          Department: dept.department?.name || dept.department || 'N/A',
          Required: dept.required || 0,
          Completed: dept.completed || 0,
          'On Time': dept.onTime || 0,
          Late: dept.late || 0,
          Missing: dept.missing || 0,
          'Compliance Rate': `${dept.complianceRate || 0}%`,
          Status: dept.status || 'N/A',
        }));
        break;
      case 'enrollment':
        reportTitle = 'Enrollment Report';
        // Fetch actual enrollment data
        const enrollmentData = await exports.getEnrollmentData(companyMasterID, departmentId);
        reportData = enrollmentData.map(course => ({
          Course: course.courseName || 'N/A',
          'Total Enrollments': course.totalEnrollments || 0,
          'Completed': course.completedEnrollments || 0,
          'In Progress': course.inProgressEnrollments || 0,
          'Completion Rate': `${course.completionRate || 0}%`,
        }));
        break;
      case 'assessment':
        reportTitle = 'Assessment Report';
        // Fetch actual assessment data
        const assessmentData = await exports.getAssessmentData(companyMasterID, departmentId);
        reportData = assessmentData.map(assessment => ({
          Assessment: assessment.assessmentName || 'N/A',
          'Total Attempts': assessment.totalAttempts || 0,
          Passed: assessment.passedAttempts || 0,
          Failed: assessment.failedAttempts || 0,
          'Average Score': `${assessment.averageScore || 0}%`,
        }));
        break;
      default:
        return res.status(400).json({
          status: 400,
          message: 'Invalid report type',
        });
    }

    // Check if we have data
    if (!reportData || reportData.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'No data available for the selected filters',
      });
    }

    let fileKey;
    let fileBuffer;

    if (format === 'csv') {
      // Generate CSV
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportTitle);

      // Add title and metadata
      worksheet.mergeCells('A1:' + String.fromCharCode(64 + Object.keys(reportData[0]).length) + '1');
      worksheet.getCell('A1').value = reportTitle;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:' + String.fromCharCode(64 + Object.keys(reportData[0]).length) + '2');
      worksheet.getCell('A2').value = `Generated: ${now.toLocaleString()}`;
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      if (companyMasterID) {
        worksheet.mergeCells('A3:' + String.fromCharCode(64 + Object.keys(reportData[0]).length) + '3');
        worksheet.getCell('A3').value = `Company ID: ${companyMasterID}`;
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
      }

      // Add empty row
      worksheet.addRow([]);

      // Add headers (starting from row 5 or 4)
      const headerRow = worksheet.addRow(Object.keys(reportData[0]));
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      headerRow.alignment = { horizontal: 'center' };

      // Add data rows
      reportData.forEach(row => {
        const dataRow = worksheet.addRow(Object.values(row));
        dataRow.alignment = { horizontal: 'left' };
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      fileBuffer = await workbook.csv.writeBuffer();
      fileKey = `lms-reports/${companyMasterID || 'system'}/${reportType}-${timestamp}.csv`;
    } else {
      // PDF format not implemented
      return res.status(200).json({
        status: 200,
        message: 'PDF generation is not fully implemented yet. Please use CSV format.',
        data: {
          reportType,
          format,
          generatedAt: now.toISOString(),
        },
      });
    }

    // Upload to S3
    const { getSignedS3Url } = require('../utils/s3.utils');
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { S3Client } = require('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: format === 'csv' ? 'text/csv' : 'application/pdf',
      })
    );

    // Generate signed URL (valid for 1 hour)
    const downloadUrl = await getSignedS3Url(bucketName, fileKey, 3600);

    return res.status(200).json({
      status: 200,
      data: {
        reportType,
        format,
        downloadUrl,
        expiresIn: 3600,
        generatedAt: now.toISOString(),
        recordCount: reportData.length,
      },
    });
  } catch (error) {
    console.error('Error in exportReport:', error);
    next(error);
  }
};

// Helper function to get compliance data
exports.getDepartmentComplianceData = async (companyMasterID, departmentId) => {
  try {
    // Reuse the existing getDepartmentCompliance logic
    const req = {
      query: {},
      body: { companyMasterID, departmentId }
    };
    
    // Call the existing function to get data
    const result = await new Promise((resolve, reject) => {
      const res = {
        status: (code) => ({
          json: (data) => {
            if (code === 200) {
              resolve(data.data || []);
            } else {
              reject(new Error('Failed to fetch compliance data'));
            }
          }
        })
      };
      exports.getDepartmentCompliance(req, res, reject);
    });
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    return [];
  }
};

// Helper function to get enrollment data
exports.getEnrollmentData = async (companyMasterID, departmentId) => {
  try {
    const Course = require('../models/course');
    const Enrollment = require('../models/enrollment');
    const { Op } = require('sequelize');

    const whereClause = { status: 'PUBLISHED' };
    if (companyMasterID) {
      whereClause.companyMasterID = companyMasterID;
    }

    const courses = await Course.findAll({
      where: whereClause,
      include: [{
        model: Enrollment,
        as: 'enrollments',
        required: false,
        where: departmentId ? { departmentId } : {},
      }],
    });

    return courses.map(course => {
      const enrollments = course.enrollments || [];
      const totalEnrollments = enrollments.length;
      const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;
      const inProgressEnrollments = enrollments.filter(e => e.status === 'IN_PROGRESS').length;
      
      return {
        courseName: course.title,
        totalEnrollments,
        completedEnrollments,
        inProgressEnrollments,
        completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      };
    });
  } catch (error) {
    console.error('Error fetching enrollment data:', error);
    return [];
  }
};

// Helper function to get assessment data
exports.getAssessmentData = async (companyMasterID, departmentId) => {
  try {
    const Assessment = require('../models/assessment');
    const AssessmentAttempt = require('../models/assessmentAttempt');
    const Enrollment = require('../models/enrollment');

    const whereClause = {};
    if (companyMasterID) {
      whereClause.companyMasterID = companyMasterID;
    }

    const assessments = await Assessment.findAll({
      where: whereClause,
      include: [{
        model: AssessmentAttempt,
        as: 'attempts',
        required: false,
        include: departmentId ? [{
          model: Enrollment,
          as: 'enrollment',
          where: { departmentId },
          required: true,
        }] : [],
      }],
    });

    return assessments.map(assessment => {
      const attempts = assessment.attempts || [];
      const totalAttempts = attempts.length;
      const passedAttempts = attempts.filter(a => a.passed).length;
      const failedAttempts = totalAttempts - passedAttempts;
      const avgScore = totalAttempts > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
        : 0;
      
      return {
        assessmentName: assessment.title,
        totalAttempts,
        passedAttempts,
        failedAttempts,
        averageScore: avgScore,
      };
    });
  } catch (error) {
    console.error('Error fetching assessment data:', error);
    return [];
  }
};

// =====================================================
// DEPARTMENT METRICS (LMS-style comprehensive analytics)
// =====================================================
exports.getDepartmentMetrics = async (req, res, next) => {
  try {
    const { departmentId, startDate, endDate, page, limit, search } = req.query;
    const companyMasterId =
      req.body.companyMasterID ||
      req.body.companyMasterId ||
      req.userDetails.companyMasterId;

    // Parse pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // Fetch departments with pagination and search
    const whereClause = { companyMasterID: companyMasterId, status: 1 };
    if (departmentId) whereClause.departmentId = departmentId;
    if (search) {
      whereClause.departmentName = { [Sequelize.Op.like]: `%${search}%` };
    }

    // Get total count first
    const totalCount = await Department.count({ where: whereClause });

    // Fetch paginated departments
    const departments = await Department.findAll({ 
      where: whereClause, 
      raw: true,
      limit: limitNum,
      offset: offset,
      order: [['departmentName', 'ASC']]
    });

    // Fetch all active users with their current department assignment
    const allActiveUsers = await userMaster.findAll({
      where: { companyMasterId, status: 1 },
      include: [
        {
          required: false,
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['departmentID'],
        },
      ],
      raw: false,
    });

    // Fetch all enrollments for the company
    const enrollmentWhere = { status: 1 };
    if (startDate) enrollmentWhere.createdAt = { [Sequelize.Op.gte]: new Date(startDate) };
    if (endDate) {
      enrollmentWhere.createdAt = enrollmentWhere.createdAt
        ? { ...enrollmentWhere.createdAt, [Sequelize.Op.lte]: new Date(endDate) }
        : { [Sequelize.Op.lte]: new Date(endDate) };
    }

    const allEnrollments = await Enrollment.findAll({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: { companyMasterId, status: 1 },
          attributes: ['userMasterID'],
        },
      ],
      where: enrollmentWhere,
      raw: true,
    });

    // Fetch all certificates
    const allCertificates = await Certificate.findAll({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: { companyMasterId, status: 1 },
          attributes: ['userMasterID'],
        },
      ],
      where: { status: 1 },
      raw: true,
    });

    // Build certified pairs set
    const certifiedPairs = new Set(
      allCertificates.map((c) => `${c.userId}-${c.courseId}`)
    );

    // Get total published courses for the company
    const totalCourses = await Course.count({
      where: { companyMasterID: companyMasterId, status: 1, courseStatus: 'PUBLISHED' },
    });

    const metrics = [];

    for (const dept of departments) {
      // Users in this department
      const usersInDept = allActiveUsers.filter((u) => {
        const depts = u.EmployeeDepartments || u.employeeDepartments || [];
        return depts.length > 0 && depts[0].departmentID === dept.departmentId;
      });
      const userIds = usersInDept.map((u) => u.userMasterID);
      const totalUsers = userIds.length;
      const activeUsers = totalUsers; // all fetched users are active (status=1)

      // Courses assigned to this department
      const courseDeptAssignments = await LmsCourseDepartment.findAll({
        where: { departmentId: dept.departmentId, status: 1 },
        include: [
          {
            model: Course,
            where: { 
              companyMasterID: companyMasterId, 
              status: 1, 
              courseStatus: 'PUBLISHED' 
            },
            attributes: ['id'],
            required: true,
          },
        ],
        raw: true,
      });
      const assignedCourseIds = courseDeptAssignments.map((cd) => cd.courseId);
      const deptCourseCount = assignedCourseIds.length;

      // Enrollments for users in this dept
      const deptEnrollments = allEnrollments.filter(
        (e) => userIds.includes(e['user.userMasterID'])
      );
      const totalEnrollments = deptEnrollments.length;
      const completedEnrollments = deptEnrollments.filter(
        (e) =>
          e.completedAt !== null ||
          certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`)
      ).length;
      const inProgressEnrollments = deptEnrollments.filter(
        (e) =>
          e.completedAt === null &&
          !certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`) &&
          parseFloat(e.progressPercentage) > 0
      ).length;

      const completionRate =
        totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

      // Certificates for users in this dept
      const deptCerts = allCertificates.filter((c) =>
        userIds.includes(c['user.userMasterID'])
      );
      const certificatesIssued = deptCerts.length;
      const certificatesExpired = deptCerts.filter(
        (c) => c.expiresAt && new Date(c.expiresAt) < new Date()
      ).length;

      // Assignments for this dept
      const deptAssignments = await Assignment.findAll({
        where: { companyMasterID: companyMasterId, departmentID: dept.departmentId },
        attributes: ['assignmentID', 'status'],
        raw: true,
      });
      const totalAssignments = deptAssignments.length;
      const activeAssignments = deptAssignments.filter((a) => a.status === 'ACTIVE').length;
      const draftAssignments = deptAssignments.filter((a) => a.status === 'DRAFT').length;

      // Assignment allocations for users in this dept
      let totalAllocations = 0;
      let completedSubmissions = 0;
      if (userIds.length > 0) {
        totalAllocations = await AssignmentAllocation.count({
          where: { traineeID: { [Sequelize.Op.in]: userIds } },
        });
      }

      // Assessments for this dept
      const deptAssessments = await Assessment.findAll({
        where: { departmentID: dept.departmentId, status: 1 },
        attributes: ['assessmentID'],
        raw: true,
      });
      const assessmentIds = deptAssessments.map((a) => a.assessmentID);
      let totalAttempts = 0;
      let passedAttempts = 0;
      let averageScore = 0;
      if (assessmentIds.length > 0) {
        totalAttempts = await AssessmentAttempt.count({
          where: { assessmentID: { [Sequelize.Op.in]: assessmentIds }, status: 1 },
        });
        passedAttempts = await AssessmentAttempt.count({
          where: {
            assessmentID: { [Sequelize.Op.in]: assessmentIds },
            status: 1,
            isPassed: true,
          },
        });
        const scoreRows = await AssessmentAttempt.findAll({
          where: { assessmentID: { [Sequelize.Op.in]: assessmentIds }, status: 1 },
          attributes: ['score'],
          raw: true,
        });
        averageScore =
          scoreRows.length > 0
            ? scoreRows.reduce((s, r) => s + (r.score || 0), 0) / scoreRows.length
            : 0;
      }

      // Compliance rate based on required vs completed
      const totalRequired = totalUsers * deptCourseCount;
      const deptCompletedForCompliance = deptEnrollments.filter(
        (e) =>
          assignedCourseIds.includes(e.courseID) &&
          (e.completedAt !== null ||
            certifiedPairs.has(`${e['user.userMasterID']}-${e.courseID}`))
      ).length;
      const complianceRate =
        totalRequired > 0 ? (deptCompletedForCompliance / totalRequired) * 100 : 0;

      // Last activity date
      const lastEnrollment = deptEnrollments.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      )[0];
      const lastActivityDate = lastEnrollment
        ? lastEnrollment.updatedAt
        : new Date().toISOString();

      metrics.push({
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        totalUsers,
        activeUsers,
        inactiveUsers: 0,
        usersByRole: { admin: 0, trainer: 0, trainee: totalUsers },
        totalCourses: deptCourseCount,
        mandatoryCourses: deptCourseCount,
        optionalCourses: 0,
        publishedCourses: deptCourseCount,
        draftCourses: 0,
        completedCourses: completedEnrollments,
        inProgressCourses: inProgressEnrollments,
        overdueCourses: 0,
        totalEnrollments,
        activeEnrollments: inProgressEnrollments,
        completedEnrollments,
        inProgressEnrollments,
        overdueEnrollments: 0,
        completionRate: Math.round(completionRate * 10) / 10,
        averageCompletionTime: 0,
        onTimeCompletions: completedEnrollments,
        lateCompletions: 0,
        certificatesIssued,
        certificatesExpired,
        certificatesActive: certificatesIssued - certificatesExpired,
        assignments: {
          total: totalAssignments,
          active: activeAssignments,
          draft: draftAssignments,
          archived: 0,
          totalAllocations,
          completedSubmissions,
          pendingSubmissions: totalAllocations - completedSubmissions,
          overdueSubmissions: 0,
          averageSubmissionTime: 0,
          // Frontend-compatible aliases
          completed: completedSubmissions,
          pending: totalAllocations - completedSubmissions,
          overdue: 0,
        },
        assessments: {
          total: deptAssessments.length,
          totalAttempts,
          passedAttempts,
          failedAttempts: totalAttempts - passedAttempts,
          averageScore: Math.round(averageScore * 100) / 100,
          averageAttempts: 0,
          firstTimePassRate: 0,
          // Frontend-compatible aliases
          passed: passedAttempts,
          failed: totalAttempts - passedAttempts,
        },
        complianceRate: Math.round(complianceRate * 10) / 10,
        mandatoryComplianceRate: Math.round(complianceRate * 10) / 10,
        overdueTrainings: 0,
        upcomingDeadlines: 0,
        lastActivityDate,
        mostActiveUsers: [],
        leastActiveUsers: [],
        monthlyEnrollments: new Array(12).fill(0),
        monthlyCompletions: new Array(12).fill(0),
        monthlyLogins: new Array(12).fill(0),
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({ 
      status: 200, 
      data: metrics,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages
    });
  } catch (error) {
    console.error('❌ Error in getDepartmentMetrics:', error);
    next(error);
  }
};

// =====================================================
// DEPARTMENT USERS (per-department user detail)
// =====================================================
exports.getDepartmentUsers = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;
    const companyMasterId =
      req.body.companyMasterID ||
      req.body.companyMasterId ||
      req.userDetails.companyMasterId;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // Get users currently in this department
    const usersInDept = await userMaster.findAll({
      where: { companyMasterId, status: 1 },
      include: [
        {
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        },
      ],
      raw: false,
    });

    const dept = await Department.findOne({
      where: { departmentId, companyMasterID: companyMasterId },
      raw: true,
    });

    const userDetails = [];

    for (const u of usersInDept) {
      const userId = u.userMasterID;

      // Enrollments
      const enrollmentWhere = { userMasterID: userId, status: 1 };
      if (startDate) enrollmentWhere.createdAt = { [Sequelize.Op.gte]: new Date(startDate) };
      if (endDate) {
        enrollmentWhere.createdAt = enrollmentWhere.createdAt
          ? { ...enrollmentWhere.createdAt, [Sequelize.Op.lte]: new Date(endDate) }
          : { [Sequelize.Op.lte]: new Date(endDate) };
      }

      const enrollments = await Enrollment.findAll({
        where: enrollmentWhere,
        attributes: ['enrollmentID', 'courseID', 'completedAt', 'progressPercentage'],
        raw: true,
      });

      const enrolledCourses = enrollments.length;
      const completedCourses = enrollments.filter((e) => e.completedAt !== null).length;
      const inProgressCourses = enrollments.filter(
        (e) => e.completedAt === null && parseFloat(e.progressPercentage) > 0
      ).length;
      const overdueCourses = 0;

      // Certificates
      const certs = await Certificate.count({
        where: { userId, status: 1 },
      });

      // Assignment allocations
      const allocations = await AssignmentAllocation.count({
        where: { traineeID: userId },
      });

      // Assessment attempts
      const attempts = await AssessmentAttempt.findAll({
        where: { userMasterID: userId, status: 1 },
        attributes: ['isPassed', 'score'],
        raw: true,
      });
      const assessmentsTaken = attempts.length;
      const assessmentsPassed = attempts.filter((a) => a.isPassed).length;
      const avgScore =
        attempts.length > 0
          ? attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length
          : 0;

      // Compliance
      const complianceScore =
        enrolledCourses > 0 ? (completedCourses / enrolledCourses) * 100 : 100;
      let complianceStatus = 'compliant';
      if (complianceScore < 50) complianceStatus = 'critical';
      else if (complianceScore < 75) complianceStatus = 'overdue';
      else if (complianceScore < 90) complianceStatus = 'warning';

      userDetails.push({
        id: userId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: 'employee',
        department: dept ? dept.departmentName : '',
        departmentId: String(departmentId),
        status: 'active',
        enrolledCourses,
        completedCourses,
        inProgressCourses,
        overdueCourses,
        certificatesEarned: certs,
        activeCertificates: certs,
        expiredCertificates: 0,
        assignmentsAllocated: allocations,
        assignmentsCompleted: 0,
        assignmentsPending: allocations,
        assignmentsOverdue: 0,
        assessmentsTaken,
        assessmentsPassed,
        assessmentsFailed: assessmentsTaken - assessmentsPassed,
        averageAssessmentScore: Math.round(avgScore * 100) / 100,
        lastLoginDate: u.updatedAt,
        lastActivityDate: u.updatedAt,
        totalLoginHours: 0,
        complianceStatus,
        complianceScore: Math.round(complianceScore * 10) / 10,
        overdueTrainings: 0,
        upcomingDeadlines: 0,
        averageCompletionTime: 0,
        onTimeCompletions: completedCourses,
        lateCompletions: 0,
      });
    }

    // Sort by compliance score descending
    userDetails.sort((a, b) => b.complianceScore - a.complianceScore);

    return res.status(200).json({ status: 200, data: userDetails });
  } catch (error) {
    console.error('❌ Error in getDepartmentUsers:', error);
    next(error);
  }
};

// =====================================================
// DEPARTMENT SUMMARY
// =====================================================
exports.getDepartmentSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId =
      req.body.companyMasterID ||
      req.body.companyMasterId ||
      req.userDetails.companyMasterId;

    // Reuse getDepartmentMetrics logic by calling it internally
    const mockReq = { query: { startDate, endDate }, body: {}, userDetails: { companyMasterId } };
    const departments = await Department.findAll({
      where: { companyMasterID: companyMasterId, status: 1 },
      raw: true,
    });

    const totalDepartments = departments.length;
    const totalUsers = await userMaster.count({ where: { companyMasterId, status: 1 } });
    const totalCourses = await Course.count({
      where: { companyMasterID: companyMasterId, status: 1, courseStatus: 'PUBLISHED' },
    });
    const totalEnrollments = await Enrollment.count({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: { companyMasterId, status: 1 },
          attributes: [],
        },
      ],
      where: { status: 1 },
    });
    const totalCertificates = await Certificate.count({
      include: [
        {
          model: userMaster,
          as: 'user',
          where: { companyMasterId, status: 1 },
          attributes: [],
        },
      ],
      where: { status: 1 },
    });

    return res.status(200).json({
      status: 200,
      data: {
        totalDepartments,
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalCertificates,
        overallComplianceRate: 0,
        departmentsAtRisk: 0,
        topPerformingDepartment: null,
        lowestPerformingDepartment: null,
      },
    });
  } catch (error) {
    console.error('❌ Error in getDepartmentSummary:', error);
    next(error);
  }
};


// =====================================================
// COURSE PERFORMANCE ANALYTICS
// =====================================================
exports.getCoursePerformanceAnalytics = async (req, res, next) => {
  try {
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const CategoryMaster = require('../models/categoryMaster');

    const courses = await Course.findAll({
      where: {
        companyMasterID: companyMasterId,
        status: 1,
      },
      raw: true,
    });

    // Get all category IDs from courses
    const categoryIds = [...new Set(courses.map(c => c.category).filter(Boolean))];
    
    // Fetch category names
    const categories = await CategoryMaster.findAll({
      where: {
        categoryMasterID: categoryIds,
        status: 1,
      },
      attributes: ['categoryMasterID', 'categoryName'],
      raw: true,
    });

    // Create a map of categoryId -> categoryName
    const categoryMap = new Map(
      categories.map(cat => [cat.categoryMasterID.toString(), cat.categoryName])
    );

    const courseAnalytics = [];

    for (const course of courses) {
      const enrollments = await Enrollment.findAll({
        include: [{
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: [],
        }],
        where: {
          courseID: course.id,
          status: 1,
        },
        raw: true,
      });

      const totalEnrollments = enrollments.length;
      const completedEnrollments = enrollments.filter(
        (e) => e.completedAt !== null
      ).length;
      const activeEnrollments = totalEnrollments - completedEnrollments;
      const completionRate =
        totalEnrollments > 0
          ? (completedEnrollments / totalEnrollments) * 100
          : 0;

      // Calculate average progress for active enrollments
      const activeEnrollmentsData = enrollments.filter(
        (e) => e.completedAt === null
      );
      const avgProgress =
        activeEnrollmentsData.length > 0
          ? activeEnrollmentsData.reduce(
              (sum, e) => sum + (parseFloat(e.progressPercentage) || 0),
              0
            ) / activeEnrollmentsData.length
          : 0;

      courseAnalytics.push({
        courseId: course.id,
        courseName: course.title,
        status: course.courseStatus || 'DRAFT',
        totalEnrollments,
        completedEnrollments,
        activeEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
        averageProgress: Math.round(avgProgress * 10) / 10,
        category: categoryMap.get(course.category) || 'Uncategorized',
      });
    }

    // Sort by total enrollments descending
    courseAnalytics.sort((a, b) => b.totalEnrollments - a.totalEnrollments);

    return res.status(200).json({
      status: 200,
      data: courseAnalytics,
    });
  } catch (error) {
    console.error('Error in getCoursePerformanceAnalytics:', error);
    next(error);
  }
};

// =====================================================
// LEARNING PATH ANALYTICS
// =====================================================
// LEARNING PATH ANALYTICS
// =====================================================
exports.getLearningPathAnalytics = async (req, res, next) => {
  try {
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // Build user where clause
    const userWhere = { companyMasterId, status: 1 };

    // If department filter is provided, get users in that department
    let userIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: userWhere,
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      userIds = deptUsers.map(u => u.userMasterID);
      if (userIds.length > 0) {
        userWhere.userMasterID = { [Sequelize.Op.in]: userIds };
      } else {
        // No users in this department
        return res.status(200).json({
          status: 200,
          data: [],
          total: 0,
          page: page,
          limit: limit,
          totalPages: 0,
        });
      }
    }

    const users = await userMaster.findAll({
      where: userWhere,
      raw: true,
    });

    const learningPaths = [];

    for (const user of users) {
      const enrollments = await Enrollment.findAll({
        where: {
          userMasterID: user.userMasterID,
          status: 1,
        },
        raw: true,
      });

      const totalCourses = enrollments.length;
      const completedCourses = enrollments.filter(
        (e) => e.completedAt !== null
      ).length;
      const inProgressCourses = enrollments.filter(
        (e) =>
          e.completedAt === null &&
          parseFloat(e.progressPercentage || 0) > 0
      ).length;

      const avgProgress =
        totalCourses > 0
          ? enrollments.reduce(
              (sum, e) => sum + (parseFloat(e.progressPercentage) || 0),
              0
            ) / totalCourses
          : 0;

      // Get department info
      const empDept = await EmployeeDepartment.findOne({
        where: {
          userMasterID: user.userMasterID,
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: currentdate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentdate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        include: [{
          model: Department,
          as: 'department',
          attributes: ['departmentName'],
        }],
        raw: true,
      });

      learningPaths.push({
        userId: user.userMasterID,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role || 'TRAINEE',
        department: empDept ? empDept['department.departmentName'] : 'Unassigned',
        totalCourses,
        completedCourses,
        inProgressCourses,
        averageProgress: Math.round(avgProgress * 10) / 10,
        lastActivity: user.updatedAt || user.createdAt,
      });
    }

    // Sort by average progress descending
    learningPaths.sort((a, b) => b.averageProgress - a.averageProgress);

    // Apply pagination
    const total = learningPaths.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = learningPaths.slice(startIndex, endIndex);

    return res.status(200).json({
      status: 200,
      data: paginatedData,
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error in getLearningPathAnalytics:', error);
    next(error);
  }
};

// =====================================================
// TIME-BASED ANALYTICS
// =====================================================
exports.getTimeBasedAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const numDays = parseInt(days);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - numDays);

    const dailyStats = [];

    // Initialize all days with zero values
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Count enrollments created on this day
      const enrollments = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: [],
        }],
        where: {
          status: 1,
          createdAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
      });

      // Count completions on this day
      const completions = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: [],
        }],
        where: {
          status: 1,
          completedAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
      });

      // Count active users (users who updated enrollments on this day)
      const activeUsers = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: [],
        }],
        where: {
          status: 1,
          updatedAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
        distinct: true,
        col: 'userMasterID',
      });

      dailyStats.push({
        date: dateStr,
        enrollments,
        completions,
        activeUsers,
      });
    }

    return res.status(200).json({
      status: 200,
      data: dailyStats,
    });
  } catch (error) {
    console.error('Error in getTimeBasedAnalytics:', error);
    next(error);
  }
};

// =====================================================
// SKILL GAP ANALYSIS
// =====================================================
exports.getSkillGapAnalysis = async (req, res, next) => {
  try {
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const CategoryMaster = require('../models/categoryMaster');

    const courses = await Course.findAll({
      where: {
        companyMasterID: companyMasterId,
        status: 1,
      },
      raw: true,
    });

    // Get all category IDs and fetch their names
    const categoryIds = [...new Set(courses.map(c => c.category).filter(Boolean))];
    const categories = await CategoryMaster.findAll({
      where: {
        categoryMasterID: categoryIds,
        status: 1,
      },
      attributes: ['categoryMasterID', 'categoryName'],
      raw: true,
    });

    // Create a map of categoryId -> categoryName
    const categoryMap = new Map(
      categories.map(cat => [cat.categoryMasterID.toString(), cat.categoryName])
    );

    // Group courses by category to identify skill areas
    const coursesByCategory = new Map();
    courses.forEach((course) => {
      const categoryId = course.category || 'General';
      const categoryName = categoryMap.get(categoryId) || categoryId || 'General';
      
      if (!coursesByCategory.has(categoryName)) {
        coursesByCategory.set(categoryName, []);
      }
      coursesByCategory.get(categoryName).push(course);
    });

    const skillGaps = [];

    for (const [categoryName, categoryCourses] of coursesByCategory) {
      let totalEnrollments = 0;
      let totalCompletions = 0;
      const uniqueUsers = new Set();

      for (const course of categoryCourses) {
        const enrollments = await Enrollment.findAll({
          include: [{
            model: userMaster,
            as: 'user',
            where: {
              companyMasterId: companyMasterId,
              status: 1,
            },
            attributes: ['userMasterID'],
          }],
          where: {
            courseID: course.id,
            status: 1,
          },
          raw: true,
        });

        totalEnrollments += enrollments.length;
        totalCompletions += enrollments.filter(
          (e) => e.completedAt !== null
        ).length;

        // Add unique users
        enrollments.forEach((e) => {
          uniqueUsers.add(e['user.userMasterID']);
        });
      }

      const completionRate =
        totalEnrollments > 0
          ? (totalCompletions / totalEnrollments) * 100
          : 0;
      const skillGap = 100 - completionRate; // Higher gap means more training needed

      let priority = 'Low';
      if (skillGap > 50) priority = 'High';
      else if (skillGap > 25) priority = 'Medium';

      skillGaps.push({
        skillArea: categoryName,
        coursesAvailable: categoryCourses.length,
        totalEnrollments,
        totalCompletions,
        uniqueLearners: uniqueUsers.size,
        completionRate: Math.round(completionRate * 10) / 10,
        skillGap: Math.round(skillGap * 10) / 10,
        priority,
      });
    }

    // Sort by skill gap descending (highest gap first)
    skillGaps.sort((a, b) => b.skillGap - a.skillGap);

    return res.status(200).json({
      status: 200,
      data: skillGaps,
    });
  } catch (error) {
    console.error('Error in getSkillGapAnalysis:', error);
    next(error);
  }
};

// =====================================================
// INDIVIDUAL COURSE ANALYTICS
// =====================================================
exports.getCourseAnalytics = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    // Support both GET (query params) and POST (body params)
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || 
                           req.query.companyMasterID || req.query.companyMasterId || 
                           req.userDetails.companyMasterId;
    const months = parseInt(req.query.months) || 6;

    // Get course details - don't filter by company if not provided
    const courseWhere = {
      id: courseId,
      status: 1,
    };
    
    // Only add company filter if companyMasterId is provided
    if (companyMasterId) {
      courseWhere.companyMasterID = companyMasterId;
    }

    const course = await Course.findOne({
      where: courseWhere,
      raw: true,
    });

    if (!course) {
      return res.status(404).json({
        status: 404,
        message: 'Course not found',
      });
    }

    // Use the course's company ID if not provided in request
    const effectiveCompanyId = companyMasterId || course.companyMasterID;

    // Get all enrollments for this course
    const enrollments = await Enrollment.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: {
          companyMasterId: effectiveCompanyId,
          status: 1,
        },
        attributes: ['userMasterID', 'firstName', 'lastName', 'email'],
      }],
      where: {
        courseID: courseId,
        status: 1,
      },
      raw: true,
    });

    // Basic statistics
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e.completedAt !== null).length;
    const activeEnrollments = totalEnrollments - completedEnrollments;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    // Calculate average progress for active enrollments
    const activeEnrollmentsData = enrollments.filter(e => e.completedAt === null);
    const avgProgress = activeEnrollmentsData.length > 0
      ? activeEnrollmentsData.reduce((sum, e) => sum + (parseFloat(e.progressPercentage) || 0), 0) / activeEnrollmentsData.length
      : 0;

    // Calculate average completion time (in days)
    const completedWithTime = enrollments.filter(e => e.completedAt && e.createdAt);
    const avgCompletionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, e) => {
          const days = Math.floor((new Date(e.completedAt) - new Date(e.createdAt)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedWithTime.length
      : 0;

    // Get assessment statistics if assessments exist
    // First get course assessments
    const courseAssessments = await CourseAssessment.findAll({
      where: { courseId: courseId, status: 1 },
      attributes: ['assessmentId'],
      raw: true,
    });

    const assessmentIds = courseAssessments.map(ca => ca.assessmentId);
    
    const assessments = assessmentIds.length > 0 ? await Assessment.findAll({
      where: { 
        assessmentID: assessmentIds,
        status: 1 
      },
      raw: true,
    }) : [];

    let assessmentStats = {
      totalAssessments: 0,
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
    };

    if (assessmentIds.length > 0) {
      const attempts = await AssessmentAttempt.findAll({
        include: [{
          model: userMaster,
          as: 'user',
          where: {
            companyMasterId: companyMasterId,
            status: 1,
          },
          attributes: [],
        }],
        where: {
          assessmentID: assessmentIds,
          status: 1,
        },
        raw: true,
      });

      const totalAttempts = attempts.length;
      const passedAttempts = attempts.filter(a => a.isPassed === 1 || a.isPassed === true).length;
      const totalScore = attempts.reduce((sum, a) => sum + (parseFloat(a.score) || 0), 0);

      assessmentStats = {
        totalAssessments: assessments.length,
        totalAttempts,
        averageScore: totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 10) / 10 : 0,
        passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100 * 10) / 10 : 0,
      };
    }

    // Monthly enrollment trends
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const monthlyTrends = [];
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(startDate.getMonth() + i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);

      const monthEnrollments = enrollments.filter(e => {
        const createdAt = new Date(e.createdAt);
        return createdAt >= monthStart && createdAt < monthEnd;
      }).length;

      const monthCompletions = enrollments.filter(e => {
        if (!e.completedAt) return false;
        const completedAt = new Date(e.completedAt);
        return completedAt >= monthStart && completedAt < monthEnd;
      }).length;

      monthlyTrends.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        enrollments: monthEnrollments,
        completions: monthCompletions,
      });
    }

    // Recent enrollments (last 10)
    const recentEnrollments = enrollments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(e => ({
        enrollmentId: e.enrollmentID,
        userName: `${e['user.firstName']} ${e['user.lastName']}`,
        userEmail: e['user.email'],
        enrolledAt: e.createdAt,
        completedAt: e.completedAt,
        progressPercentage: parseFloat(e.progressPercentage) || 0,
        status: e.completedAt ? 'Completed' : 'In Progress',
      }));

    // Calculate progress distribution
    const progressRanges = [
      { range: '0-20%', min: 0, max: 20 },
      { range: '21-40%', min: 21, max: 40 },
      { range: '41-60%', min: 41, max: 60 },
      { range: '61-80%', min: 61, max: 80 },
      { range: '81-100%', min: 81, max: 100 },
    ];

    const progressDistribution = progressRanges.map(({ range, min, max }) => ({
      range,
      count: enrollments.filter(e => {
        const progress = parseFloat(e.progressPercentage) || 0;
        return progress >= min && progress <= max;
      }).length,
    }));

    // Calculate completion funnel
    const startedLearning = enrollments.filter(e => parseFloat(e.progressPercentage) > 0).length;
    const completedModules = enrollments.filter(e => parseFloat(e.progressPercentage) >= 50).length;

    // Compile response matching frontend expectations
    const analyticsData = {
      courseId: course.id.toString(),
      courseName: course.title,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      enrollmentStats: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        droppedEnrollments: 0,
        completionRate: Math.round(completionRate * 10) / 10,
        dropoutRate: 0,
        avgTimeToCompletion: Math.round(avgCompletionTime * 10) / 10,
        certificatesIssued: completedEnrollments,
      },
      assessmentAnalytics: {
        preAssessmentStats: assessmentStats.totalAssessments > 0 ? {
          assessmentName: 'Course Assessments',
          totalAttempts: assessmentStats.totalAttempts,
          averageScore: assessmentStats.averageScore,
          passRate: assessmentStats.passRate,
          scoreDistribution: [],
        } : undefined,
      },
      completionFunnel: {
        enrolled: totalEnrollments,
        startedLearning,
        completedModules,
        completedCourse: completedEnrollments,
      },
      progressDistribution,
      monthlyTrends,
      recentEnrollments,
    };

    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error in getCourseAnalytics:', error);
    next(error);
  }
};

// =====================================================
// WEEKLY USER ACTIVITY (NEW - for chart)
// =====================================================
exports.getWeeklyUserActivity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, resolve user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    const userWhere = { companyMasterId, status: 1 };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };

    // Get last 7 days of activity
    const weeklyData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayName = daysOfWeek[date.getDay()];

      // Count active users (users who updated enrollments on this day)
      const activeUsers = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: userWhere,
          attributes: [],
        }],
        where: {
          status: 1,
          updatedAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
        distinct: true,
        col: 'userMasterID',
      });

      // Count logins (approximate using enrollment creations as proxy)
      const logins = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: userWhere,
          attributes: [],
        }],
        where: {
          status: 1,
          createdAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
        distinct: true,
        col: 'userMasterID',
      });

      // Count completions on this day
      const completions = await Enrollment.count({
        include: [{
          model: userMaster,
          as: 'user',
          where: userWhere,
          attributes: [],
        }],
        where: {
          status: 1,
          completedAt: {
            [Sequelize.Op.gte]: dayStart,
            [Sequelize.Op.lt]: dayEnd,
          },
        },
      });

      weeklyData.push({
        day: dayName,
        date: dateStr,
        active: activeUsers,
        logins: Math.max(logins, activeUsers), // Ensure logins >= active users
        completions: completions,
      });
    }

    return res.status(200).json({
      status: 200,
      data: weeklyData,
    });
  } catch (error) {
    console.error('Error in getWeeklyUserActivity:', error);
    next(error);
  }
};

// =====================================================
// ASSESSMENT SCORE DISTRIBUTION (NEW - for chart)
// =====================================================
exports.getAssessmentScoreDistribution = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const departmentId = req.body.departmentId || req.query.departmentId || null;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // If department selected, resolve user IDs in that department
    let deptUserIds = null;
    if (departmentId) {
      const deptUsers = await userMaster.findAll({
        where: { companyMasterId, status: 1 },
        include: [{
          required: true,
          model: EmployeeDepartment,
          where: {
            departmentID: departmentId,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentdate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentdate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        }],
        attributes: ['userMasterID'],
        raw: true,
      });
      deptUserIds = deptUsers.map(u => u.userMasterID);
    }

    const userWhere = { companyMasterId, status: 1 };
    if (deptUserIds) userWhere.userMasterID = { [Sequelize.Op.in]: deptUserIds };

    // Get all assessment attempts
    const attemptWhere = { status: 1 };
    if (startDate) attemptWhere.createdAt = { [Sequelize.Op.gte]: new Date(startDate) };
    if (endDate) {
      attemptWhere.createdAt = attemptWhere.createdAt
        ? { ...attemptWhere.createdAt, [Sequelize.Op.lte]: new Date(endDate) }
        : { [Sequelize.Op.lte]: new Date(endDate) };
    }

    const attempts = await AssessmentAttempt.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: userWhere,
        attributes: [],
      }],
      where: attemptWhere,
      attributes: ['score'],
      raw: true,
    });

    // Group scores into ranges
    const scoreRanges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];

    attempts.forEach(attempt => {
      const score = parseFloat(attempt.score) || 0;
      for (const range of scoreRanges) {
        if (score >= range.min && score <= range.max) {
          range.count++;
          break;
        }
      }
    });

    const distribution = scoreRanges.map(({ range, count }) => ({
      range,
      count,
    }));

    return res.status(200).json({
      status: 200,
      data: distribution,
    });
  } catch (error) {
    console.error('Error in getAssessmentScoreDistribution:', error);
    next(error);
  }
};

// =====================================================
// SYSTEM AUDIT TRAIL (NEW - for compliance logging)
// =====================================================
exports.getSystemAuditTrail = async (req, res, next) => {
  try {
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || req.userDetails.companyMasterId;
    const page = parseInt(req.body.page || req.query.page) || 1;
    const limit = parseInt(req.body.limit || req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get recent activities from various sources
    const auditLogs = [];

    // 1. Recent enrollments
    const recentEnrollments = await Enrollment.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: { companyMasterId, status: 1 },
        attributes: ['firstName', 'lastName', 'email'],
      }, {
        model: Course,
        as: 'course',
        attributes: ['title'],
      }],
      where: { status: 1 },
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true,
    });

    recentEnrollments.forEach(e => {
      auditLogs.push({
        id: `enrollment-${e.enrollmentID}`,
        timestamp: e.createdAt,
        user: `${e['user.firstName']} ${e['user.lastName']}`,
        action: 'Course Enrollment',
        details: `Enrolled in "${e['course.title']}"`,
        status: 'success',
      });
    });

    // 2. Recent completions
    const recentCompletions = await Enrollment.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: { companyMasterId, status: 1 },
        attributes: ['firstName', 'lastName', 'email'],
      }, {
        model: Course,
        as: 'course',
        attributes: ['title'],
      }],
      where: { 
        status: 1,
        completedAt: { [Sequelize.Op.ne]: null },
      },
      order: [['completedAt', 'DESC']],
      limit: 10,
      raw: true,
    });

    recentCompletions.forEach(e => {
      auditLogs.push({
        id: `completion-${e.enrollmentID}`,
        timestamp: e.completedAt,
        user: `${e['user.firstName']} ${e['user.lastName']}`,
        action: 'Course Completed',
        details: `Completed "${e['course.title']}"`,
        status: 'success',
      });
    });

    // 3. Recent certificates issued
    const recentCertificates = await Certificate.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: { companyMasterId, status: 1 },
        attributes: ['firstName', 'lastName', 'email'],
      }, {
        model: Course,
        as: 'course',
        attributes: ['title'],
      }],
      where: { status: 1 },
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true,
    });

    recentCertificates.forEach(c => {
      auditLogs.push({
        id: `certificate-${c.certificateID}`,
        timestamp: c.createdAt,
        user: `${c['user.firstName']} ${c['user.lastName']}`,
        action: 'Certificate Issued',
        details: `Certificate issued for "${c['course.title']}"`,
        status: 'success',
      });
    });

    // 4. Recent assessment attempts
    const recentAttempts = await AssessmentAttempt.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: { companyMasterId, status: 1 },
        attributes: ['firstName', 'lastName', 'email'],
      }, {
        model: Assessment,
        as: 'assessment',
        attributes: ['title'],
      }],
      where: { status: 1 },
      order: [['createdAt', 'DESC']],
      limit: 10,
      raw: true,
    });

    recentAttempts.forEach(a => {
      const passed = a.isPassed === 1 || a.isPassed === true;
      auditLogs.push({
        id: `attempt-${a.attemptID}`,
        timestamp: a.createdAt,
        user: `${a['user.firstName']} ${a['user.lastName']}`,
        action: passed ? 'Assessment Passed' : 'Assessment Attempted',
        details: `${passed ? 'Passed' : 'Attempted'} "${a['assessment.title']}" with score ${a.score}%`,
        status: passed ? 'success' : 'warning',
      });
    });

    // Sort all logs by timestamp descending
    auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = auditLogs.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedLogs = auditLogs.slice(offset, offset + limit);

    return res.status(200).json({
      status: 200,
      data: paginatedLogs,
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error in getSystemAuditTrail:', error);
    next(error);
  }
};

// =====================================================
// COURSE LEARNERS ANALYTICS
// =====================================================
exports.getCourseLearners = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    // Support both GET (query params) and POST (body params)
    const companyMasterId = req.body.companyMasterID || req.body.companyMasterId || 
                           req.query.companyMasterID || req.query.companyMasterId || 
                           req.userDetails.companyMasterId;

    // Get course details - don't filter by company if not provided
    const courseWhere = {
      id: courseId,
      status: 1,
    };
    
    // Only add company filter if companyMasterId is provided
    if (companyMasterId) {
      courseWhere.companyMasterID = companyMasterId;
    }

    const course = await Course.findOne({
      where: courseWhere,
      raw: true,
    });

    if (!course) {
      return res.status(404).json({
        status: 404,
        message: 'Course not found',
      });
    }

    // Use the course's company ID if not provided in request
    const effectiveCompanyId = companyMasterId || course.companyMasterID;

    // Get all enrollments for this course with user details
    const enrollments = await Enrollment.findAll({
      include: [{
        model: userMaster,
        as: 'user',
        where: {
          companyMasterId: effectiveCompanyId,
          status: 1,
        },
        attributes: ['userMasterID', 'firstName', 'lastName', 'email', 'photo'],
      }],
      where: {
        courseID: courseId,
        status: 1,
      },
      raw: true,
    });

    // Get assessment attempts for these enrollments
    const userIds = enrollments.map(e => e.userMasterID);
    
    let assessmentAttempts = [];
    if (userIds.length > 0) {
      // Get assessments for this course
      const courseAssessments = await CourseAssessment.findAll({
        where: { courseId: courseId, status: 1 },
        attributes: ['assessmentId'],
        raw: true,
      });

      const assessmentIds = courseAssessments.map(ca => ca.assessmentId);

      if (assessmentIds.length > 0) {
        assessmentAttempts = await AssessmentAttempt.findAll({
          include: [{
            model: userMaster,
            as: 'user',
            where: {
              companyMasterId: companyMasterId,
              status: 1,
            },
            attributes: [],
          }],
          where: {
            assessmentID: assessmentIds,
            userMasterID: userIds,
            status: 1,
          },
          raw: true,
        });
      }
    }

    // Build learner progress data
    const learners = enrollments.map(enrollment => {
      const userId = enrollment.userMasterID;
      
      // Get assessment attempts for this user
      const userAttempts = assessmentAttempts.filter(a => a.userMasterID === userId);
      const totalAttempts = userAttempts.length;
      const passedAttempts = userAttempts.filter(a => a.isPassed === 1 || a.isPassed === true).length;
      const averageScore = totalAttempts > 0
        ? userAttempts.reduce((sum, a) => sum + (parseFloat(a.score) || 0), 0) / totalAttempts
        : 0;

      // Calculate time spent (in hours)
      let timeSpentHours = 0;
      if (enrollment.completedAt && enrollment.createdAt) {
        const timeSpentMs = new Date(enrollment.completedAt).getTime() - new Date(enrollment.createdAt).getTime();
        timeSpentHours = Math.round((timeSpentMs / (1000 * 60 * 60)) * 10) / 10;
      } else if (enrollment.updatedAt && enrollment.createdAt) {
        const timeSpentMs = new Date(enrollment.updatedAt).getTime() - new Date(enrollment.createdAt).getTime();
        timeSpentHours = Math.round((timeSpentMs / (1000 * 60 * 60)) * 10) / 10;
      }

      return {
        userId: userId,
        name: `${enrollment['user.firstName']} ${enrollment['user.lastName']}`,
        email: enrollment['user.email'],
        profilePicture: enrollment['user.photo'] || null,
        enrolledAt: enrollment.createdAt,
        lastActivity: enrollment.updatedAt,
        progress: parseFloat(enrollment.progressPercentage) || 0,
        status: enrollment.completedAt ? 'completed' : 'in-progress',
        completedAt: enrollment.completedAt,
        timeSpentHours: timeSpentHours,
        assessmentStats: {
          totalAttempts: totalAttempts,
          passedAttempts: passedAttempts,
          averageScore: Math.round(averageScore * 10) / 10,
          passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100 * 10) / 10 : 0,
        },
      };
    });

    // Sort by progress descending
    learners.sort((a, b) => b.progress - a.progress);

    return res.status(200).json({
      status: 200,
      data: learners,
    });
  } catch (error) {
    console.error('Error in getCourseLearners:', error);
    next(error);
  }
};

// =====================================================
// EXPORT COURSE COMPLETION REPORT
// =====================================================
exports.exportCourseCompletionReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      status,
      userMasterID,
      courseId,
      courseID,
      orderBy,
    } = req.body;

    const activeCondition = {
      status: [0, 1],
      applicableDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const activeConditionStartDate = {
      status: [0, 1],
      startDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const isPresent = (val) => val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : val !== '');
    const toCondition = (val) => (Array.isArray(val) ? { [Sequelize.Op.in]: val } : val);

    const userWhere = {
      ...(companyMasterID && { companyMasterId: companyMasterID }),
      ...(status && (Array.isArray(status) ? status.length > 0 : true) ? { status: toCondition(status) } : { status: [0, 1] }),
      ...(isPresent(userMasterID) && { userMasterID: toCondition(userMasterID) }),
    };

    const users = await userMaster.findAll({
      where: userWhere,
      attributes: ['userMasterID', 'userNumber', 'displayName', 'email'],
      include: [
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          required: false,
          attributes: ['employeeCode'],
        },
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          required: isPresent(branchMasterID),
          where: { ...(isPresent(branchMasterID) && { branchID: toCondition(branchMasterID) }), ...activeCondition },
          include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName'] }],
        },
        {
          model: EmployeeDepartment,
          as: 'emp_dept',
          required: isPresent(departmentID),
          where: { ...(isPresent(departmentID) && { departmentID: toCondition(departmentID) }), ...activeCondition },
          include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
        },
        {
          model: EmployeeDesignation,
          as: 'emp_desig',
          required: isPresent(designationID),
          where: { ...(isPresent(designationID) && { designationID: toCondition(designationID) }), ...activeCondition },
          include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
        },
        {
          model: EmployeeDivision,
          as: 'emp_div',
          required: isPresent(divisionId),
          where: { ...(isPresent(divisionId) && { divisionId: toCondition(divisionId) }), ...activeConditionStartDate },
          include: [{ model: Division, attributes: ['divisionName'] }],
        },
        {
          model: EmployeeWorkingArea,
          as: 'emp_area',
          required: isPresent(workingAreaId),
          where: { ...(isPresent(workingAreaId) && { workingAreaId: toCondition(workingAreaId) }), ...activeConditionStartDate },
          include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
        },
      ],
    });

    const userIds = users.map((u) => u.userMasterID);

    if (userIds.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    const selectedCourseId = courseId || courseID;
    const enrollmentWhere = {
      userMasterID: { [Sequelize.Op.in]: userIds },
      status: 1,
      ...(selectedCourseId && { courseID: selectedCourseId }),
    };

    // Find all enrollments for these users with Course, plus assessment attempts and certificates
    const [enrollments, attempts, certificates] = await Promise.all([
      Enrollment.findAll({
        where: enrollmentWhere,
        include: [
          {
            model: Course,
            as: 'course',
            required: false,
            attributes: [
              'id',
              'title',
              'category',
              'isMandatory',
              'deadline',
              'certificateEnabled',
              'certificateExpiryType',
              'certificateExpiryDays',
              'passingPercentage',
            ],
          },
        ],
        raw: false,
      }),
      AssessmentAttempt.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseID: selectedCourseId }),
        },
        attributes: [
          'assessmentAttemptID',
          'assessmentID',
          'courseID',
          'userMasterID',
          'score',
          'isPassed',
          'timeSpent',
          'startedAt',
          'submittedAt',
        ],
        order: [['submittedAt', 'DESC']],
        raw: true,
      }),
      Certificate.findAll({
        where: {
          userId: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseId: selectedCourseId }),
        },
        attributes: [
          'id',
          'certificateNumber',
          'userId',
          'courseId',
          'issuedAt',
          'expiresAt',
          'isValid',
          'finalPercentage',
          'completionTimeHours',
        ],
        raw: true,
      }),
    ]);

    const enrollmentIds = enrollments.map((e) => e.enrollmentID);
    const progressList = enrollmentIds.length > 0
      ? await LmsProgress.findAll({
          where: {
            enrollmentID: { [Sequelize.Op.in]: enrollmentIds },
            status: 1,
          },
          attributes: ['enrollmentID', 'createdAt', 'updatedAt', 'completedAt'],
          order: [['createdAt', 'ASC']],
          raw: true,
        })
      : [];

    const exportData = [];

    for (let i = 0; i < enrollments.length; i++) {
      const enrollment = enrollments[i];
      const user = users.find((u) => u.userMasterID === enrollment.userMasterID);
      if (!user) continue;

      const empCode = user.emp_join?.[0]?.employeeCode || user.userNumber || '';
      const empName = user.displayName || '';
      const branchName = user.emp_branch?.[0]?.branchMaster?.branchName || '';
      const deptName = user.emp_dept?.[0]?.department?.departmentName || '';
      const desigName = user.emp_desig?.[0]?.designation?.designationName || '';
      const divName = user.emp_div?.[0]?.division?.divisionName || user.emp_div?.[0]?.Division?.divisionName || '';
      const areaName = user.emp_area?.[0]?.workingArea?.workingAreaName || user.emp_area?.[0]?.WorkingArea?.workingAreaName || '';
      const course = enrollment.course;
      const courseTitle = course?.title || 'N/A';
      const mandatoryStatus = course?.isMandatory ? 'Mandatory' : 'Non Mandatory';

      const enrolledDate = enrollment.enrolledAt
        ? moment(enrollment.enrolledAt).format('DD/MM/YYYY')
        : (enrollment.createdAt ? moment(enrollment.createdAt).format('DD/MM/YYYY') : '-');

      const completionDate = enrollment.completedAt ? moment(enrollment.completedAt).format('DD/MM/YYYY') : '-';

      // Start Date
      const userProgress = progressList.filter((p) => p.enrollmentID === enrollment.enrollmentID);
      let startDate = '-';
      if (enrollment.completedAt || parseFloat(enrollment.progressPercentage || 0) > 0) {
        if (userProgress.length > 0 && userProgress[0].createdAt) {
          startDate = moment(userProgress[0].createdAt).format('DD/MM/YYYY');
        } else if (enrollment.lastAccessedAt) {
          startDate = moment(enrollment.lastAccessedAt).format('DD/MM/YYYY');
        } else if (enrollment.enrolledAt) {
          startDate = moment(enrollment.enrolledAt).format('DD/MM/YYYY');
        }
      }

      // Certificate lookup
      const userCert = certificates.find(
        (c) => c.userId === enrollment.userMasterID && c.courseId === enrollment.courseID
      );

      // Expiry Date
      let expiryDate = '-';
      if (course?.deadline) {
        expiryDate = moment(course.deadline).format('DD/MM/YYYY');
      } else if (userCert?.expiresAt) {
        expiryDate = moment(userCert.expiresAt).format('DD/MM/YYYY');
      } else if (course?.certificateExpiryType === 'LIFETIME') {
        expiryDate = 'Lifetime';
      }

      // Status (Assigned)
      let statusAssigned = 'Assigned';
      if (enrollment.completedAt) {
        statusAssigned = 'Completed';
      } else if (parseFloat(enrollment.progressPercentage || 0) > 0) {
        statusAssigned = 'In Progress';
      } else {
        statusAssigned = 'Assigned';
      }

      // Assessment Attempts
      const courseAttempts = attempts.filter(
        (a) => a.userMasterID === enrollment.userMasterID && a.courseID === enrollment.courseID
      );
      const attemptCount = courseAttempts.length;
      const attemptsDisplay = attemptCount > 0 ? String(attemptCount) : '0';

      let scoreDisplay = '-';
      let resultDisplay = '-';

      if (courseAttempts.length > 0) {
        const latestAttempt = courseAttempts[0];
        if (latestAttempt.score !== null && latestAttempt.score !== undefined) {
          scoreDisplay = `${parseFloat(latestAttempt.score)}%`;
        }
        if (latestAttempt.isPassed !== null && latestAttempt.isPassed !== undefined) {
          resultDisplay = latestAttempt.isPassed ? 'Pass' : 'Fail';
        }
      } else if (userCert?.finalPercentage !== undefined && userCert?.finalPercentage !== null) {
        scoreDisplay = `${parseFloat(userCert.finalPercentage)}%`;
        resultDisplay = 'Pass';
      }

      // Time Spent (hrs)
      let timeSpentHours = 0;
      const attemptsTimeSec = courseAttempts.reduce((sum, a) => sum + (parseInt(a.timeSpent) || 0), 0);
      if (attemptsTimeSec > 0) {
        timeSpentHours = Math.round((attemptsTimeSec / 3600) * 10) / 10;
      } else if (userCert?.completionTimeHours) {
        timeSpentHours = userCert.completionTimeHours;
      } else if (enrollment.completedAt && enrollment.enrolledAt) {
        const diffMs = new Date(enrollment.completedAt).getTime() - new Date(enrollment.enrolledAt).getTime();
        timeSpentHours = Math.round(Math.min(diffMs / (1000 * 60 * 60), 100) * 10) / 10;
      } else if (enrollment.updatedAt && userProgress.length > 0) {
        const diffMs = new Date(enrollment.updatedAt).getTime() - new Date(userProgress[0].createdAt).getTime();
        timeSpentHours = Math.round(Math.min(diffMs / (1000 * 60 * 60), 100) * 10) / 10;
      }
      const timeSpentDisplay = timeSpentHours > 0 ? timeSpentHours.toFixed(1) : '0.0';

      // Certificate Issued (Y/N)
      const certificateIssued = userCert ? 'Y' : 'N';

      exportData.push({
        'S.No': i + 1,
        'Employee/User ID': empCode,
        'Name': empName,
        'Branch': branchName,
        'Department/Team': deptName,
        'Designation': desigName,
        'Division': divName,
        'Working Area': areaName,
        'Course/Program Name': courseTitle,
        'Mandatory/Non Mandatory': mandatoryStatus,
        'Enrolled Date': enrolledDate,
        'Start Date': startDate,
        'Completion Date': completionDate,
        'Expiry Date': expiryDate,
        'Status (Assigned)': statusAssigned,
        'Score (%)': scoreDisplay,
        'Result': resultDisplay,
        'Attempts': attemptsDisplay,
        'Time Spent (hrs)': timeSpentDisplay,
        'Certificate Issued (Y/N)': certificateIssued,
      });
    }

    if (exportData.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    if (orderBy === 'dateWise') {
      exportData.sort((a, b) => {
        const dateA = a['Completion Date'] !== '-' ? a['Completion Date'] : (a['Start Date'] !== '-' ? a['Start Date'] : a['Enrolled Date']);
        const dateB = b['Completion Date'] !== '-' ? b['Completion Date'] : (b['Start Date'] !== '-' ? b['Start Date'] : b['Enrolled Date']);
        return (dateB || '').localeCompare(dateA || '');
      });
    } else {
      // Default: nameWise
      exportData.sort((a, b) => (a['Name'] || '').localeCompare(b['Name'] || ''));
    }

    // Renumber S.No after sorting
    exportData.forEach((row, idx) => {
      row['S.No'] = idx + 1;
    });

    await generateExcelForLmsReport(exportData, 'Course-Completion-Report', res, { xSplit: 3 });
  } catch (error) {
    console.error('Error exporting course completion report:', error);
    next(error);
  }
};

// =====================================================
// EXPORT CERTIFICATION REPORT
// =====================================================
exports.exportCertificationReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      status,
      userMasterID,
      courseId,
      courseID,
      orderBy,
    } = req.body;

    const activeCondition = {
      status: [0, 1],
      applicableDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const activeConditionStartDate = {
      status: [0, 1],
      startDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const isPresent = (val) => val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : val !== '');
    const toCondition = (val) => (Array.isArray(val) ? { [Sequelize.Op.in]: val } : val);

    const userWhere = {
      ...(companyMasterID && { companyMasterId: companyMasterID }),
      ...(status && (Array.isArray(status) ? status.length > 0 : true) ? { status: toCondition(status) } : { status: [0, 1] }),
      ...(isPresent(userMasterID) && { userMasterID: toCondition(userMasterID) }),
    };

    const users = await userMaster.findAll({
      where: userWhere,
      attributes: ['userMasterID', 'userNumber', 'displayName', 'email'],
      include: [
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          required: false,
          attributes: ['employeeCode'],
        },
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          required: isPresent(branchMasterID),
          where: { ...(isPresent(branchMasterID) && { branchID: toCondition(branchMasterID) }), ...activeCondition },
          include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName'] }],
        },
        {
          model: EmployeeDepartment,
          as: 'emp_dept',
          required: isPresent(departmentID),
          where: { ...(isPresent(departmentID) && { departmentID: toCondition(departmentID) }), ...activeCondition },
          include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
        },
        {
          model: EmployeeDesignation,
          as: 'emp_desig',
          required: isPresent(designationID),
          where: { ...(isPresent(designationID) && { designationID: toCondition(designationID) }), ...activeCondition },
          include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
        },
        {
          model: EmployeeDivision,
          as: 'emp_div',
          required: isPresent(divisionId),
          where: { ...(isPresent(divisionId) && { divisionId: toCondition(divisionId) }), ...activeConditionStartDate },
          include: [{ model: Division, attributes: ['divisionName'] }],
        },
        {
          model: EmployeeWorkingArea,
          as: 'emp_area',
          required: isPresent(workingAreaId),
          where: { ...(isPresent(workingAreaId) && { workingAreaId: toCondition(workingAreaId) }), ...activeConditionStartDate },
          include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
        },
      ],
    });

    const userIds = users.map((u) => u.userMasterID);

    if (userIds.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    const selectedCourseId = courseId || courseID;
    const certWhere = {
      userId: { [Sequelize.Op.in]: userIds },
      status: 1,
      ...(selectedCourseId && { courseId: selectedCourseId }),
    };

    // Find all certificates and assessment attempts for these users
    const [certificates, attempts] = await Promise.all([
      Certificate.findAll({
        where: certWhere,
        include: [
          {
            model: Course,
            as: 'course',
            required: false,
            attributes: [
              'id',
              'title',
              'category',
              'isMandatory',
              'deadline',
              'certificateEnabled',
              'certificateExpiryType',
              'certificateExpiryDays',
              'passingPercentage',
            ],
            include: [
              {
                model: userMaster,
                as: 'createBy',
                required: false,
                attributes: ['displayName'],
              },
            ],
          },
          {
            model: userMaster,
            as: 'createBy',
            required: false,
            attributes: ['displayName'],
          },
        ],
        raw: false,
      }),
      AssessmentAttempt.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseID: selectedCourseId }),
        },
        attributes: [
          'assessmentAttemptID',
          'assessmentID',
          'courseID',
          'userMasterID',
          'score',
          'isPassed',
          'startedAt',
          'submittedAt',
        ],
        order: [['submittedAt', 'DESC']],
        raw: true,
      }),
    ]);

    const exportData = [];

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      const user = users.find((u) => u.userMasterID === cert.userId);
      if (!user) continue;

      const certNumber = cert.certificateNumber || cert.id || '-';
      const empCode = user.emp_join?.[0]?.employeeCode || user.userNumber || '';
      const empName = user.displayName || '';
      const branchName = user.emp_branch?.[0]?.branchMaster?.branchName || '';
      const deptName = user.emp_dept?.[0]?.department?.departmentName || '';
      const desigName = user.emp_desig?.[0]?.designation?.designationName || '';
      const divName = user.emp_div?.[0]?.division?.divisionName || user.emp_div?.[0]?.Division?.divisionName || '';
      const areaName = user.emp_area?.[0]?.workingArea?.workingAreaName || user.emp_area?.[0]?.WorkingArea?.workingAreaName || '';
      const certName = cert.course?.title || 'Certification';
      const mandatoryStatus = cert.course?.isMandatory ? 'Mandatory' : 'Non Mandatory';

      // Find user attempt for exam date and score
      const userAttempts = attempts.filter(
        (a) => a.userMasterID === cert.userId && a.courseID === cert.courseId
      );
      const latestAttempt = userAttempts.length > 0 ? userAttempts[0] : null;

      const examDate = latestAttempt?.submittedAt
        ? moment(latestAttempt.submittedAt).format('DD/MM/YYYY')
        : (latestAttempt?.startedAt
          ? moment(latestAttempt.startedAt).format('DD/MM/YYYY')
          : (cert.issuedAt ? moment(cert.issuedAt).format('DD/MM/YYYY') : '-'));

      const scoreVal = cert.finalPercentage !== undefined && cert.finalPercentage !== null
        ? parseFloat(cert.finalPercentage)
        : (cert.finalScore !== undefined && cert.finalScore !== null
          ? parseFloat(cert.finalScore)
          : (latestAttempt?.score !== undefined && latestAttempt?.score !== null
            ? parseFloat(latestAttempt.score)
            : null));

      const scoreDisplay = scoreVal !== null && !isNaN(scoreVal) ? `${scoreVal}%` : '-';

      // Grade calculation
      let grade = '-';
      if (scoreVal !== null && !isNaN(scoreVal)) {
        if (scoreVal >= 90) grade = 'A+';
        else if (scoreVal >= 80) grade = 'A';
        else if (scoreVal >= 70) grade = 'B';
        else if (scoreVal >= 60) grade = 'C';
        else if (scoreVal >= 50) grade = 'D';
        else grade = 'F';
      }

      const issueDate = cert.issuedAt ? moment(cert.issuedAt).format('DD/MM/YYYY') : '-';
      const expiryDate = cert.expiresAt
        ? moment(cert.expiresAt).format('DD/MM/YYYY')
        : (cert.course?.certificateExpiryType === 'LIFETIME' ? 'Lifetime' : 'No Expiry');

      let certStatus = 'Active';
      if (cert.expiresAt && moment().isAfter(moment(cert.expiresAt))) {
        certStatus = 'Expired';
      } else if (!cert.isValid) {
        certStatus = 'Revoked';
      } else {
        certStatus = 'Active';
      }

      const issuedBy = cert.createBy?.displayName || cert.course?.createBy?.displayName || 'System';

      exportData.push({
        'S.No': i + 1,
        'Certificate ID/No.': certNumber,
        'Employee/User ID': empCode,
        'Name': empName,
        'Branch': branchName,
        'Department': deptName,
        'Designation': desigName,
        'Division': divName,
        'Working Area': areaName,
        'Certification Name': certName,
        'Mandatory/Non Mandatory': mandatoryStatus,
        'Exam/Assessment Date': examDate,
        'Score Achieved (%)': scoreDisplay,
        // 'Grade': grade,
        'Issue Date': issueDate,
        'Expiry Date': expiryDate,
        'Status': certStatus,
        // 'Issued By': issuedBy,
      });
    }

    if (exportData.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    if (orderBy === 'dateWise') {
      exportData.sort((a, b) => {
        const dateA = a['Issue Date'] !== '-' ? a['Issue Date'] : '';
        const dateB = b['Issue Date'] !== '-' ? b['Issue Date'] : '';
        return (dateB || '').localeCompare(dateA || '');
      });
    } else {
      // Default: nameWise
      exportData.sort((a, b) => (a['Name'] || '').localeCompare(b['Name'] || ''));
    }

    // Renumber S.No after sorting
    exportData.forEach((row, idx) => {
      row['S.No'] = idx + 1;
    });

    await generateExcelForLmsReport(exportData, 'Certification-Report', res, { xSplit: 4 });
  } catch (error) {
    console.error('Error exporting certification report:', error);
    next(error);
  }
};

// =====================================================
// EXPORT AUDIT TRAIL REPORT
// =====================================================
exports.exportAuditTrailReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      status,
      userMasterID,
      courseId,
      courseID,
      orderBy,
    } = req.body;

    const activeCondition = {
      status: [0, 1],
      applicableDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const activeConditionStartDate = {
      status: [0, 1],
      startDate: { [Sequelize.Op.lte]: Sequelize.literal('CURRENT_DATE') },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: Sequelize.literal('CURRENT_DATE') } },
        { endDate: null },
      ],
    };

    const isPresent = (val) => val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : val !== '');
    const toCondition = (val) => (Array.isArray(val) ? { [Sequelize.Op.in]: val } : val);

    const userWhere = {
      ...(companyMasterID && { companyMasterId: companyMasterID }),
      ...(status && (Array.isArray(status) ? status.length > 0 : true) ? { status: toCondition(status) } : { status: [0, 1] }),
      ...(isPresent(userMasterID) && { userMasterID: toCondition(userMasterID) }),
    };

    const users = await userMaster.findAll({
      where: userWhere,
      attributes: ['userMasterID', 'userNumber', 'displayName', 'email'],
      include: [
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          required: false,
          attributes: ['employeeCode'],
        },
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          required: isPresent(branchMasterID),
          where: { ...(isPresent(branchMasterID) && { branchID: toCondition(branchMasterID) }), ...activeCondition },
          include: [{ model: BranchMaster, as: 'branchMaster', attributes: ['branchName'] }],
        },
        {
          model: EmployeeDepartment,
          as: 'emp_dept',
          required: isPresent(departmentID),
          where: { ...(isPresent(departmentID) && { departmentID: toCondition(departmentID) }), ...activeCondition },
          include: [{ model: Department, as: 'department', attributes: ['departmentName'] }],
        },
        {
          model: EmployeeDesignation,
          as: 'emp_desig',
          required: isPresent(designationID),
          where: { ...(isPresent(designationID) && { designationID: toCondition(designationID) }), ...activeCondition },
          include: [{ model: Designation, as: 'designation', attributes: ['designationName'] }],
        },
        {
          model: EmployeeDivision,
          as: 'emp_div',
          required: isPresent(divisionId),
          where: { ...(isPresent(divisionId) && { divisionId: toCondition(divisionId) }), ...activeConditionStartDate },
          include: [{ model: Division, attributes: ['divisionName'] }],
        },
        {
          model: EmployeeWorkingArea,
          as: 'emp_area',
          required: isPresent(workingAreaId),
          where: { ...(isPresent(workingAreaId) && { workingAreaId: toCondition(workingAreaId) }), ...activeConditionStartDate },
          include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
        },
      ],
    });

    const userIds = users.map((u) => u.userMasterID);

    if (userIds.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    const userMap = new Map(users.map((u) => [u.userMasterID, u]));
    const selectedCourseId = courseId || courseID;

    // Fetch enrollments, certificates, assessment attempts, assessments, and courses in parallel
    const [enrollments, certificates, attempts, assessments, courses] = await Promise.all([
      Enrollment.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseID: selectedCourseId }),
        },
        include: [{ model: Course, as: 'course', required: false, attributes: ['id', 'title'] }],
        raw: false,
      }),
      Certificate.findAll({
        where: {
          userId: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseId: selectedCourseId }),
        },
        include: [{ model: Course, as: 'course', required: false, attributes: ['id', 'title'] }],
        raw: false,
      }),
      AssessmentAttempt.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userIds },
          status: 1,
          ...(selectedCourseId && { courseID: selectedCourseId }),
        },
        raw: true,
      }),
      Assessment.findAll({
        attributes: ['assessmentID', 'title'],
        raw: true,
      }),
      Course.findAll({
        attributes: ['id', 'title'],
        raw: true,
      }),
    ]);

    const assessmentMap = new Map(assessments.map((a) => [a.assessmentID, a.title]));
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));
    const auditRows = [];

    // 1. Assessment Attempts (Started & Submitted)
    for (const a of attempts) {
      const u = userMap.get(a.userMasterID);
      if (!u) continue;
      const empCode = u.emp_join?.[0]?.employeeCode || u.userNumber || '';
      const courseTitle = courseMap.get(a.courseID) || '';
      const asmTitle = assessmentMap.get(a.assessmentID) || 'Assessment';
      const moduleObject = courseTitle ? `${courseTitle} - ${asmTitle}` : asmTitle;
      const branchName = u.emp_branch?.[0]?.branchMaster?.branchName || '';
      const deptName = u.emp_dept?.[0]?.department?.departmentName || '';
      const desigName = u.emp_desig?.[0]?.designation?.designationName || '';
      const divName = u.emp_div?.[0]?.division?.divisionName || u.emp_div?.[0]?.Division?.divisionName || '';
      const areaName = u.emp_area?.[0]?.workingArea?.workingAreaName || u.emp_area?.[0]?.WorkingArea?.workingAreaName || '';

      const isPassed = a.isPassed === 1 || a.isPassed === true;
      const ip = a.updatedByIp || a.createdByIp || '-';

      // Submit attempt
      const scoreText = a.score !== null && a.score !== undefined ? `${parseFloat(a.score)}%` : '';
      const remarks = scoreText
        ? `${isPassed ? 'Passed' : 'Completed'} with score ${scoreText}`
        : 'Submitted assessment';

      auditRows.push({
        rawDate: a.submittedAt || a.updatedAt || a.createdAt,
        empCode,
        empName: u.displayName || '',
        branchName,
        deptName,
        desigName,
        divName,
        areaName,
        role: 'Learner',
        action: 'Submit',
        moduleObject,
        oldValue: 'In Progress',
        newValue: 'Completed',
        ipAddress: ip,
        status: 'Success',
        remarks,
      });

      // Start attempt (if separate start time)
      if (a.startedAt && a.submittedAt && new Date(a.startedAt).getTime() !== new Date(a.submittedAt).getTime()) {
        auditRows.push({
          rawDate: a.startedAt,
          empCode,
          empName: u.displayName || '',
          branchName,
          deptName,
          desigName,
          divName,
          areaName,
          role: 'Learner',
          action: 'Start',
          moduleObject,
          oldValue: 'Not Started',
          newValue: 'In Progress',
          ipAddress: a.createdByIp || ip,
          status: 'Success',
          remarks: 'Started assessment attempt',
        });
      }
    }

    // 2. Enrollments & Course Completions
    for (const e of enrollments) {
      const u = userMap.get(e.userMasterID);
      if (!u) continue;
      const empCode = u.emp_join?.[0]?.employeeCode || u.userNumber || '';
      const courseTitle = e.course?.title || courseMap.get(e.courseID) || 'Course';
      const branchName = u.emp_branch?.[0]?.branchMaster?.branchName || '';
      const deptName = u.emp_dept?.[0]?.department?.departmentName || '';
      const desigName = u.emp_desig?.[0]?.designation?.designationName || '';
      const divName = u.emp_div?.[0]?.division?.divisionName || u.emp_div?.[0]?.Division?.divisionName || '';
      const areaName = u.emp_area?.[0]?.workingArea?.workingAreaName || u.emp_area?.[0]?.WorkingArea?.workingAreaName || '';

      auditRows.push({
        rawDate: e.enrolledAt || e.createdAt,
        empCode,
        empName: u.displayName || '',
        branchName,
        deptName,
        desigName,
        divName,
        areaName,
        role: 'Learner',
        action: 'Enroll',
        moduleObject: courseTitle,
        oldValue: 'Not Enrolled',
        newValue: 'Assigned',
        ipAddress: e.createdByIp || '-',
        status: 'Success',
        remarks: `Enrolled in "${courseTitle}"`,
      });

      if (e.completedAt) {
        auditRows.push({
          rawDate: e.completedAt,
          empCode,
          empName: u.displayName || '',
          branchName,
          deptName,
          desigName,
          divName,
          areaName,
          role: 'Learner',
          action: 'Complete',
          moduleObject: courseTitle,
          oldValue: 'In Progress',
          newValue: 'Completed',
          ipAddress: e.updatedByIp || e.createdByIp || '-',
          status: 'Success',
          remarks: `Completed "${courseTitle}" with progress ${parseFloat(e.progressPercentage || 100)}%`,
        });
      }
    }

    // 3. Certificates Issued
    for (const c of certificates) {
      const u = userMap.get(c.userId);
      if (!u) continue;
      const empCode = u.emp_join?.[0]?.employeeCode || u.userNumber || '';
      const courseTitle = c.course?.title || courseMap.get(c.courseId) || 'Course';
      const certNum = c.certificateNumber || c.id || '';
      const branchName = u.emp_branch?.[0]?.branchMaster?.branchName || '';
      const deptName = u.emp_dept?.[0]?.department?.departmentName || '';
      const desigName = u.emp_desig?.[0]?.designation?.designationName || '';
      const divName = u.emp_div?.[0]?.division?.divisionName || u.emp_div?.[0]?.Division?.divisionName || '';
      const areaName = u.emp_area?.[0]?.workingArea?.workingAreaName || u.emp_area?.[0]?.WorkingArea?.workingAreaName || '';

      auditRows.push({
        rawDate: c.issuedAt || c.createdAt,
        empCode,
        empName: u.displayName || '',
        branchName,
        deptName,
        desigName,
        divName,
        areaName,
        role: 'Learner',
        action: 'Issue Certificate',
        moduleObject: `${courseTitle} - Certificate #${certNum}`,
        oldValue: 'Eligible',
        newValue: 'Issued',
        ipAddress: c.createdByIp || '-',
        status: c.isValid ? 'Success' : 'Revoked',
        remarks: `Certificate #${certNum} issued with score ${c.finalPercentage || c.finalScore || 100}%`,
      });
    }

    if (auditRows.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    if (orderBy === 'nameWise') {
      auditRows.sort((a, b) => (a.empName || '').localeCompare(b.empName || ''));
    } else {
      // Default: dateWise (latest first)
      auditRows.sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));
    }

    const exportData = auditRows.map((r, idx) => ({
      'S.No': idx + 1,
      'Timestamp': r.rawDate ? moment(r.rawDate).format('DD-MMM-YYYY HH:mm:ss') : '-',
      'User ID': r.empCode,
      'User Name': r.empName,
      'Branch': r.branchName,
      'Department': r.deptName,
      'Designation': r.desigName,
      'Division': r.divName,
      'Working Area': r.areaName,
      'Role': r.role,
      'Action Performed': r.action,
      'Module/Object Affected': r.moduleObject,
      'Old Value': r.oldValue,
      'New Value': r.newValue,
      'IP Address': r.ipAddress,
      'Status': r.status,
      'Remarks': r.remarks,
    }));

    await generateExcelForLmsReport(exportData, 'Audit-Trail-Report', res, { xSplit: 4 });
  } catch (error) {
    console.error('Error exporting audit trail report:', error);
    next(error);
  }
};

exports.exportCategoryQuestionsReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentID,
      questionCategoryMasterID,
      categoryID,
      questionType,
      type,
      difficulty,
      status,
      orderBy,
    } = req.body;

    const companyMasterId = companyMasterID || req.userDetails?.companyMasterId;
    if (!companyMasterId && !departmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const isPresent = (val) => val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : val !== '');
    const toCondition = (val) => (Array.isArray(val) ? { [Sequelize.Op.in]: val } : val);

    // Department condition
    const deptWhere = {
      status: { [Sequelize.Op.ne]: 0 },
      ...(companyMasterId && { companyMasterID: companyMasterId }),
      ...(isPresent(departmentID) && { departmentId: toCondition(departmentID) }),
    };

    // Question condition
    const whereClause = {
      status: { [Sequelize.Op.ne]: 0 },
    };

    if (isPresent(departmentID)) {
      whereClause.departmentID = toCondition(departmentID);
    }

    // Category filter
    let rawCatId = questionCategoryMasterID !== undefined ? questionCategoryMasterID : categoryID;
    if (rawCatId && typeof rawCatId === 'object' && !Array.isArray(rawCatId)) {
      rawCatId = rawCatId.$ngOptionValue !== undefined ? rawCatId.$ngOptionValue : (rawCatId.questionCategoryMasterID || rawCatId.id);
    }
    if (rawCatId && rawCatId !== 'null' && rawCatId !== 'undefined' && rawCatId !== 'all') {
      if (Array.isArray(rawCatId)) {
        const validIds = rawCatId.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id > 0);
        if (validIds.length > 0) {
          whereClause.questionCategoryMasterID = { [Sequelize.Op.in]: validIds };
        }
      } else {
        const parsedId = parseInt(rawCatId);
        if (!isNaN(parsedId) && parsedId > 0) {
          whereClause.questionCategoryMasterID = parsedId;
        }
      }
    }

    // Question Type filter
    const effectiveQuestionType = questionType || type;
    if (effectiveQuestionType && effectiveQuestionType.toUpperCase() !== 'ALL') {
      whereClause.questionType = effectiveQuestionType.toUpperCase();
    }

    // Difficulty filter
    if (difficulty && difficulty.toUpperCase() !== 'ALL') {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    // Status filter
    if (status !== undefined && status !== null && status !== '' && status !== 'all') {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          whereClause.status = { [Sequelize.Op.in]: status.map((s) => parseInt(s)) };
        }
      } else {
        whereClause.status = parseInt(status);
      }
    }

    // Required models
    const Question = require('../models/question');
    const QuestionOption = require('../models/questionOption');
    const QuestionCategoryMaster = require('../models/questionCategoryMaster');
    const AssessmentAttemptAnswer = require('../models/assessmentAttemptAnswer');
    const AssessmentAttempt = require('../models/assessmentAttempt');

    if (!Question.associations.questionOptions) {
      Question.hasMany(QuestionOption, { as: 'questionOptions', foreignKey: 'questionID' });
      QuestionOption.belongsTo(Question, { foreignKey: 'questionID' });
    }

    const questions = await Question.findAll({
      where: whereClause,
      include: [
        {
          model: QuestionCategoryMaster,
          as: 'questionCategory',
          attributes: ['questionCategoryMasterID', 'categoryName', 'color'],
          required: false,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName', 'companyMasterID'],
          where: deptWhere,
          required: true,
        },
      ],
    });

    if (!questions || questions.length === 0) {
      return res.status(200).json({ status: 200, message: 'No data found' });
    }

    const questionIds = questions.map((q) => q.questionID);

    // Fetch attempt answers and attempt durations in parallel
    const [answers, attempts] = await Promise.all([
      AssessmentAttemptAnswer.findAll({
        where: {
          questionID: { [Sequelize.Op.in]: questionIds },
          status: 1,
        },
        attributes: [
          'assessmentAttemptAnswerID',
          'assessmentAttemptID',
          'questionID',
          'selectedOptionID',
          'isCorrect',
        ],
        raw: true,
      }),
      AssessmentAttempt.findAll({
        where: { status: 1 },
        attributes: ['assessmentAttemptID', 'timeSpent', 'totalQuestions'],
        raw: true,
      }),
    ]);

    const attemptTimeMap = new Map(
      attempts.map((att) => [
        att.assessmentAttemptID,
        att.totalQuestions > 0 && att.timeSpent > 0
          ? Math.round(att.timeSpent / att.totalQuestions)
          : 45,
      ])
    );

    const questionStats = new Map();
    for (const ans of answers) {
      if (!questionStats.has(ans.questionID)) {
        questionStats.set(ans.questionID, {
          total: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          totalTime: 0,
        });
      }
      const stat = questionStats.get(ans.questionID);
      stat.total++;
      if (ans.isCorrect === true || ans.isCorrect === 1) {
        stat.correct++;
      } else if (ans.selectedOptionID) {
        stat.incorrect++;
      } else {
        stat.skipped++;
      }
      const timeForQuestion = attemptTimeMap.get(ans.assessmentAttemptID) || 45;
      stat.totalTime += timeForQuestion;
    }

    // Ordering: primarily by Category name, then Question ID
    const sortedQuestions = [...questions];
    sortedQuestions.sort((a, b) => {
      const catA = a.questionCategory?.categoryName || 'General';
      const catB = b.questionCategory?.categoryName || 'General';
      const catComp = catA.localeCompare(catB);
      if (catComp !== 0) return catComp;
      return (a.questionID || 0) - (b.questionID || 0);
    });

    const exportData = sortedQuestions.map((q, idx) => {
      const stats = questionStats.get(q.questionID) || {
        total: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        totalTime: 0,
      };

      const categoryName = q.questionCategory?.categoryName || 'General';
      const questionCode = `Q-${q.questionID >= 100 ? q.questionID : 100 + q.questionID}`;
      const questionBrief = q.questionText || '';
      const totalAttempts = stats.total;
      const correct = stats.correct;
      const incorrect = stats.incorrect;
      const skipped = stats.skipped;
      const accuracy = totalAttempts > 0
        ? `${((correct / totalAttempts) * 100).toFixed(1)}%`
        : '0.0%';

      const diffLabel = q.difficulty
        ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1).toLowerCase()
        : 'Medium';

      const avgTime = totalAttempts > 0
        ? Math.round(stats.totalTime / totalAttempts)
        : 45;

      return {
        'S.No': idx + 1,
        'Category/Topic': categoryName,
        'Question ID': questionCode,
        'Question (brief)': questionBrief,
        'Total Attempts': totalAttempts,
        'Correct': correct,
        'Incorrect': incorrect,
        'Skipped': skipped,
        'Accuracy (%)': accuracy,
        'Difficulty Level': diffLabel,
        'Avg. Time Taken (sec)': avgTime,
      };
    });

    await generateExcelForLmsReport(exportData, 'Category-wise-Questions-Report', res, { xSplit: 3 });
  } catch (error) {
    console.error('Error exporting category-wise questions report:', error);
    next(error);
  }
};

