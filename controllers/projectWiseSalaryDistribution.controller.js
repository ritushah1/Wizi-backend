const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const ProjectWiseSalaryDistribution = require('../models/projectWiseSalaryDistribution');
const ProjectWiseSalaryDistributionDetails = require('../models/projectWiseSalaryDistributionDetails');
const {
  fixAmount,
  asiaKolkataDateTime,
  month_dict,
  getDateRangesByType,
} = require('../utils/commonUtilFunctions');
const Project = require('../models/project');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeProject = require('../models/employeeProject');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const { generateExcel, generateExcelProjectWiseSalaryDistribution } = require('../utils/exportData');
const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');

exports.add = async (req, res, next) => {
  try {
    const { userMasterID, detailsData = [] } = req.body;
    let { payrollFrequency, applicableYYYYMM, startDate, endDate } = req.body;

     // ------------------ DEFAULT PAYROLL FREQUENCY ------------------
      if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

      // ------------------ MONTHLY ------------------
      if (payrollFrequency === PayrollFrequencyType.MONTHLY) {
        startDate = null;
        endDate = null;
      }

      // ------------------ WEEKLY / FORTNIGHTLY ------------------
      if (payrollFrequency !== PayrollFrequencyType.MONTHLY && endDate) {
        // Auto-generate applicableYYYYMM from startDate
        applicableYYYYMM =
          String(endDate).slice(0, 4) + String(endDate).slice(5, 7);
      }

        // ------------------ CHILD DATA REQUIRED ------------------
      if (!Array.isArray(detailsData) || detailsData.length === 0) {
        throw new Error('Salary distribution details are required.');
      }

    await sequelize.transaction(async (transaction) => {
      // ------------------ CREATE PARENT ------------------
      const parent = await ProjectWiseSalaryDistribution.create(
        {
          userMasterID,
          applicableYYYYMM,
          payrollFrequency,
          startDate,
          endDate,
        },
        { user: req.userDetails, transaction }
      );

      // ------------------ ADD pwsdID IN EACH CHILD ------------------
      const childRecords = detailsData.map((d) => ({
        projectID: d.projectID,
        amount: fixAmount(d.amount),
        pwsdID: parent.id,
         absentDeduction: d.absentDeduction,
        penaltyDeduction: d.penaltyDeduction,
        advanceDeduction: d.advanceDeduction,
        loanDeduction: d.loanDeduction,
      }));

      // ------------------ INSERT CHILD RECORDS ------------------
      await ProjectWiseSalaryDistributionDetails.bulkCreate(childRecords, {
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Project Wise Salary Distribution'),
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

       const data = await ProjectWiseSalaryDistribution.findByPk(id);

      if (!data) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.NOT_FOUND,
          message: usermessage.notFoundMessage('data'),
        });
      }

    await sequelize.transaction(async (transaction) => {
      // delete parent
      await data.destroy({ user: req.userDetails, transaction });

      // delete all child rows
      await ProjectWiseSalaryDistributionDetails.destroy({
        where: { pwsdID: data.id },
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.deleteMessage('Project Wise Salary Distribution'),
    });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      companyMasterID,
      payrollFrequency,
      userMasterID,
      Export,
    } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Company is required.',
      });

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const userMasterIDs = userMasterID
      ? !Array.isArray(userMasterID)
        ? [userMasterID]
        : userMasterID
      : [];

    const condition = {};

    if (payrollFrequency) condition.payrollFrequency = payrollFrequency;

    if (userMasterIDs.length)
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterIDs,
      };


           const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const { rows: data, count } =
      await ProjectWiseSalaryDistribution.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        include: [
          {
            model: ProjectWiseSalaryDistributionDetails,
            as: 'PWSDD',
            attributes: ['projectID', 'amount','absentDeduction','penaltyDeduction','advanceDeduction','loanDeduction'],
            include: [
              {
                model: Project,
                attributes: ['projectName'],
              },
            ],
          },
          {
            model: UserMaster,
            where: {...where, companyMasterId: companyMasterID, status: 1 },
            attributes: ['displayName', 'userNumber'],
            include: [
              ...includeModels,
              { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
              {
                model: EmployeeDesignation,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: currentDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: currentDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                required: false,
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
                model: EmployeeDepartment,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: currentDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: currentDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                required: false,
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
                model: EmployeeBranch,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: currentDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: currentDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                required: false,
                attributes: ['branchID'],
                include: [
                  {
                    model: BranchMaster,
                    as: 'branchMaster',
                    attributes: ['branchName'],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          [Sequelize.literal(`"userMaster.displayName"`), 'ASC'],
          ['applicableYYYYMM', 'DESC'],
        ],
      });

    const finalData = data.map((e) => {
      let applicable =
        month_dict[String(e.applicableYYYYMM).slice(4, 6)] +
        '-' +
        String(e.applicableYYYYMM).slice(0, 4);

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(e.payrollFrequency)
      ) {
        const year = String(e.endDate).slice(0, 4);

        const dateRanges =
          getDateRangesByType(payrollFrequency, year)?.find(
            (f) => f.from == e.startDate && f.to == e.endDate
          ) || null;

        if (dateRanges)
          applicable = `${dateRanges.title}(${moment(e.startDate, 'YYYY-MM-DD').format('DD-MM-YYYY')} - ${moment(e.endDate, 'YYYY-MM-DD').format('DD-MM-YYYY')})`;
      }

      const details = (e.PWSDD || [])
        .map((m) => `${m.project?.projectName}` + '-' + `${m.amount}`)
        .join(',');

        const projectDetails = (e.PWSDD || []).map(p=>{
         return{
          'Project Name':p.project?.projectName || '',
          'Amount':p.amount,
          'Absent Deduction':p.absentDeduction ? 'Yes' : 'No',
           'Penalty Deduction':p.penaltyDeduction ? 'Yes' : 'No',
            'Advance Deduction':p.advanceDeduction ? 'Yes' : 'No',
             'Loan Deduction':p.loanDeduction ? 'Yes' : 'No'
         }
        })

      return {
        ...(!Export && { id: e.id}),
        'Employee Code':
          e.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
        'Employee Name': e.userMaster?.displayName || '',
        Number: e.userMaster?.userNumber || '',
        Branch:
          e.userMaster?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          e.userMaster?.employeeDepartments?.[0]?.department?.departmentName ||
          '',
        Designation:
          e.userMaster?.employeeDesignations?.[0]?.designation
            ?.designationName || '',
        PayrollFrequency: e.payrollFrequency,
        'Applicable From': applicable,
         ProjectDetails : projectDetails,
      };
    });

    if (Export)
      return await generateExcelProjectWiseSalaryDistribution(
        finalData,
        'Project Wise Salary Distribution',
        'xlsx',
        res
      );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentProjectByUserId = async (req, res, next) => {
  try {
    const { userMasterID, startDate, endDate } = req.body;

    if (Array.isArray(userMasterID) || !userMasterID || !startDate || !endDate)
      return res.status(statusCodes.OK).json({
        status: 401,
        message: usermessage.ValidParameters,
      });

    const uniqueProjects = await Project.findAll({
      attributes: [
        [
          Sequelize.fn('DISTINCT', Sequelize.col('project.projectID')),
          'projectID',
        ],
        'projectName',
      ],
      include: [
        {
          model: EmployeeProject,
          attributes: [],
          where: {
            userMasterID,
            status: 1,
            [Sequelize.Op.and]: [
              { startDate: { [Sequelize.Op.lte]: endDate } },
              {
                [Sequelize.Op.or]: [
                  { releaseDate: { [Sequelize.Op.gte]: startDate } },
                  { releaseDate: null },
                ],
              },
            ],
          },
        },
      ],
      raw: true,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: uniqueProjects,
    });
  } catch (error) {
    next(error);
  }
};
