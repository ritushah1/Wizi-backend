/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const EmpNCSLDeduction = require('../models/empNCSLDeduction');
const { usermessage } = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const {
  asiaKolkataDateTime,
  getNCSLEnumFromFullName,
} = require('../utils/commonUtilFunctions');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { generateExcel } = require('../utils/exportData');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const {
  NCSLDeductionsName,
  FileUploadType,
  PayrollFrequencyType,
  NCSLDeductionsEnum,
} = require('../utils/dbUtils');
const path = require('path');
const fs = require('fs');
const readXlsxFile = require('read-excel-file/node');
const companyMaster = require('../models/companyMaster');
const SkipEmpNCSLDeduction = require('../models/skipEmpNCSLDeduction');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

// Add Api
exports.add = async (req, res, next) => {
  try {
    const { userMasterID, category, amount } = req.body;

    if (!userMasterID || !category || !amount)
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });

    if (amount <= 0) throw new Error('Amount must be a positive number');

    // check NCSL number and NASFUND number

    const empJoin = await EmployeeJoiningDetails.findOne({
      where: {
        userMasterID,
      },
      attributes: ['pfNumber', 'esicNumber'],
    });

    if (
      category == NCSLDeductionsEnum.NASFUND_V_CONTRIBUTION &&
      !empJoin?.pfNumber
    ) {
      return res.status(200).json({
        status: 401,
        message: 'NASFUND number is missing. Please update it to continue.',
      });
    }

    if (
      [
        NCSLDeductionsEnum.EDU_SAVINGS,
        NCSLDeductionsEnum.GEN_SAVINGS,
        NCSLDeductionsEnum.LOAN,
        NCSLDeductionsEnum.PORO_CARD,
        NCSLDeductionsEnum.XMAS_SAVINGS,
      ].includes(category) &&
      !empJoin?.esicNumber
    ) {
      return res.status(200).json({
        status: 401,
        message: 'NCSL number is missing. Please update it to continue.',
      });
    }

    const data = await EmpNCSLDeduction.findOne({
      where: {
        userMasterID,
        category,
        status: 1,
      },
    });

    if (data)
      return res.status(200).json({
        status: 401,
        message: 'Data already exists for this category for this employee.',
      });

    await EmpNCSLDeduction.create(
      {
        userMasterID,
        category,
        amount,
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('NCSL Deduction'),
    });
  } catch (err) {
    next(err);
  }
};

// For Deactive
exports.statusChange = async (req, res, next) => {
  try {
    const { id, status } = req.body;

    if (status != 0) throw new Error('Pass valid status.');

    const data = await EmpNCSLDeduction.findByPk(id);

    if (!data) throw new Error(usermessage.notFoundMessage('NCSL Deduction'));

    data.status = status;

    await data.save({ user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: usermessage.deactiveMessage('NCSL Deduction'),
    });
  } catch (error) {
    next(error);
  }
};

// list
exports.listData = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID, category, userMasterID, Export } =
      req.body;

    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginateCondition =
      !Export && page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {};

    if (userMasterID) condition.userMasterID = userMasterID;
    if (category) condition.category = category;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: data, count } = await EmpNCSLDeduction.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginateCondition,
      include: [
        {
          model: UserMaster,
          attributes: userAttributes,
          where: {
            companyMasterId: companyMasterID,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
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
              separate: true,
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
              separate: true,
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
              separate: true,
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
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode', 'payrollFrequency'],
            },
          ],
        },
      ],
      order: [[Sequelize.literal(`"userMaster.displayName"`), 'ASC']],
    });

    if (Export) {
      const finalData = data.map((e) => {
        return {
          'Employee Code':
            e.userMaster.employeeJoiningDetails?.[0]?.employeeCode || '',
          'Employee Name': e.userMaster.displayName,
          Number: e.userMaster.userNumber,
          Branch:
            e.userMaster.employeeBranches?.[0]?.branchMaster?.branchName || '',
          Department:
            e.userMaster.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          Designation:
            e.userMaster.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          PayrollFrequency:
            e.userMaster.employeeJoiningDetails?.[0]?.payrollFrequency || '',
          'NCSL Deduction': NCSLDeductionsName[`${e.category}`],
          Amount: e.amount,
          status: e.status == 0 ? 'Deactive' : 'Active',
          'Deactive Date':
            e.status == 0
              ? asiaKolkataDateTime(e.updatedAt)
                  .slice(0, 10)
                  .split('-')
                  .reverse()
                  .join('-')
              : '',
        };
      });

      return await generateExcel(
        finalData,
        'Employee NCSL Deduction',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDemoExcel = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      userMasterID,
      payrollFrequency,
    } = req.body;

    if (!companyMasterID || !payrollFrequency) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {
      companyMasterId: companyMasterID,
      status: 1,
    };

    if (userMasterID && userMasterID.length)
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: { ...condition, ...userAccessCondition.where },
      order: [['displayName', 'ASC']],
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          attributes: ['divisionId'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
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
            ...(Array.isArray(departmentID) &&
              departmentID.length && { departmentID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required:
            Array.isArray(departmentID) && departmentID.length ? true : false,
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
            ...(Array.isArray(branchMasterID) &&
              branchMasterID.length && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required:
            Array.isArray(branchMasterID) && branchMasterID.length
              ? true
              : false,
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
          model: EmployeeJoiningDetails,
          where: {
            payrollFrequency,
          },
          attributes: ['employeeCode', 'payrollFrequency'],
        },
        {
          required: false,
          model: EmpNCSLDeduction,
          where: {
            status: 1,
          },
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const header =
      payrollFrequency == PayrollFrequencyType.MONTHLY
        ? [NCSLDeductionsName.salarysacrifice]
        : Object.values(NCSLDeductionsName);

    const final = await Promise.all(
      userData.map((u) => {
        const NCSLData = u.empNCSLDeductions || [];

        const object = {};
        // set key as a payhead name and value as a amount
        header.forEach((el) => {
          const categoryName = getNCSLEnumFromFullName(el);
          const data = NCSLData.find((e) => e.category == categoryName);
          object[el] = data?.amount || '';
        });

        return {
          ...{
            'Employee Code': u.employeeJoiningDetails[0].employeeCode,
            'Employee Name': u.displayName,
            'Mobile No.': u.userNumber,
            Branch: u.employeeBranches?.[0]?.branchMaster?.branchName || '',
            Department:
              u.employeeDepartments?.[0]?.department?.departmentName || '',
            Division: u.employeeDivisions?.[0]?.division?.divisionName || '',
            Designation:
              u.employeeDesignations?.[0]?.designation?.designationName || '',
            PayrollFrequency:
              u.employeeJoiningDetails[0].payrollFrequency || '',
          },
          ...object,
        };
      }),
    );

    if (+final.length === 0) {
      return res.status(200).json({
        message: 'No data found to export!',
      });
    }

    return await generateExcel(final, `NCSL Deductions Demo`, 'xlsx', res);
  } catch (error) {
    next(error);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(200)
        .send({ status: 400, message: 'Please upload an excel file!' });
    }

    const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      userMasterID,
      payrollFrequency,
    } = await req.body;

    if (!companyMasterID || !payrollFrequency) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const rows = await readXlsxFile(filePath);

    const headerPart = rows[0].slice(8);

    rows.shift();

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let fileUploadType = FileUploadType.MOBILE_NUMBER;

    const companyData = await companyMaster.findOne({
      where: { companyMasterID: companyMasterID },
      attributes: ['fileUploadType'],
    });

    if (companyData.fileUploadType == FileUploadType.EMPLOYEE_CODE)
      fileUploadType = companyData.fileUploadType;

    const condition = {};
    condition.companyMasterId = companyMasterID;
    condition.status = 1;

    if (userMasterID && userMasterID.length)
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: { ...condition, ...userAccessCondition.where },
      order: [['displayName', 'ASC']],
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          attributes: ['divisionId'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
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
            ...(Array.isArray(departmentID) &&
              departmentID.length && { departmentID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required:
            Array.isArray(departmentID) && departmentID.length ? true : false,
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
            ...(Array.isArray(branchMasterID) &&
              branchMasterID.length && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required:
            Array.isArray(branchMasterID) && branchMasterID.length
              ? true
              : false,
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
          model: EmployeeJoiningDetails,
          where: {
            payrollFrequency,
          },
          attributes: [
            'employeeCode',
            'payrollFrequency',
            'esicNumber',
            'pfNumber',
          ],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const finalData = [];

    for (const row of rows) {
      let userMasterData = null;

      const index = fileUploadType === FileUploadType.MOBILE_NUMBER ? 2 : 0;

      let remarks = '',
        remarksFlag = false;

      if (row[index] && row[index].trim()) {
        userMasterData =
          fileUploadType === FileUploadType.MOBILE_NUMBER
            ? userData.find((e) => +e.userNumber == +row[index])
            : userData.find(
                (e) =>
                  e.employeeJoiningDetails?.[0]?.employeeCode == row[index],
              );
      }

      if (!userMasterData) continue;

      const empJoing = userMasterData.employeeJoiningDetails?.[0] || null;

      const objectData = {};

      for (let [index, value] of headerPart.entries()) {
        if (row[8 + index] && typeof row[8 + index] === 'number') {
          if (row[8 + index] < 0 && !remarksFlag) {
            remarks = `Negative value is not allowed.`;
            remarksFlag = true;
            break;
          }

          objectData[value] = +row[8 + index];

          // NCSL number and NASFUND number

          if (
            value == NCSLDeductionsName.vnasfund &&
            !empJoing?.pfNumber &&
            !remarksFlag
          ) {
            remarksFlag = true;
            remarks =
              'NASFUND number is missing. Please update it to continue.';
            break;
          }

          if (
            [
              NCSLDeductionsName.edu,
              NCSLDeductionsName.gen,
              NCSLDeductionsName.loan,
              NCSLDeductionsName.poro,
              NCSLDeductionsName.xmas,
            ].includes(value) &&
            !empJoing?.esicNumber &&
            !remarksFlag
          ) {
            remarksFlag = true;
            remarks = 'NCSL number is missing. Please update it to continue.';
            break;
          }

          continue;
        }
      }

      if (!Object.keys(objectData).length) continue;

      const employeData = {
        userMasterID: userMasterData?.userMasterID || '',
        companyMasterID: userMasterData?.companyMasterId || companyMasterID,
        employeeCode:
          userMasterData?.employeeJoiningDetails?.[0]?.employeeCode || row[5],
        displayName: userMasterData?.displayName || '',
        userNumber: userMasterData?.userNumber || '',
        branch:
          userMasterData?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        department:
          userMasterData?.employeeDepartments?.[0]?.department
            ?.departmentName || '',
        Division:
          userMasterData.employeeDivisions?.[0]?.division?.divisionName || '',

        designation:
          userMasterData?.employeeDesignations?.[0]?.designation
            ?.designationName || '',
        PayrollFrequency:
          userMasterData.employeeJoiningDetails?.[0]?.payrollFrequency || '',
        remarks,
        ...objectData,
      };
      finalData.push(employeData);
    }

    fs.unlink(filePath, function (err) {});

    return res.status(200).json({
      status: 200,
      message: usermessage.validateMessage('Employee NCSL Deduction'),
      data: finalData,
      finalHeader: headerPart,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateExcel = async (req, res, next) => {
  try {
    const { EmpNCSLData = [], finalHeader = [], companyMasterID } = req.body;

    if (
      !Array.isArray(EmpNCSLData) ||
      EmpNCSLData.length === 0 ||
      !Array.isArray(finalHeader) ||
      finalHeader.length === 0 ||
      !companyMasterID
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const allUserIds = EmpNCSLData.map((e) => e.userMasterID);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userData = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: allUserIds,
        },
        ...userAccessCondition.where,
      },
      order: [['displayName', 'ASC']],
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeDivision,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },

          required: false,
          attributes: ['divisionId'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
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
        {
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'payrollFrequency',
            'esicNumber',
            'pfNumber',
          ],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const finalData = [];

    for (const data of EmpNCSLData) {
      let remarks = '',
        remarksFlag = false;

      const userMasterData = userData.find(
        (e) => e.userMasterID == data.userMasterID,
      );

      if (!userMasterData) {
        remarks = `User with ${data.userNumber} Mobile not found.`;
        remarksFlag = true;
      }

      const empJoing = userMasterData.employeeJoiningDetails?.[0] || null;

      const objectData = {};

      for (const header of finalHeader) {
        if (data[`${header}`] && typeof data[`${header}`] === 'number') {
          if (data[`${header}`] < 0 && !remarksFlag) {
            remarks = `Negative value is not allowed.`;
            remarksFlag = true;
            break;
          }

          objectData[`${header}`] = +data[`${header}`];

          // NCSL number and NASFUND number

          if (
            header == NCSLDeductionsName.vnasfund &&
            !empJoing?.pfNumber &&
            !remarksFlag
          ) {
            remarksFlag = true;
            remarks =
              'NASFUND number is missing. Please update it to continue.';
            break;
          }

          if (
            [
              NCSLDeductionsName.edu,
              NCSLDeductionsName.gen,
              NCSLDeductionsName.loan,
              NCSLDeductionsName.poro,
              NCSLDeductionsName.xmas,
            ].includes(header) &&
            !empJoing?.esicNumber &&
            !remarksFlag
          ) {
            remarksFlag = true;
            remarks = 'NCSL number is missing. Please update it to continue.';
            break;
          }

          continue;
        }
      }

      const employeData = {
        userMasterID: userMasterData?.userMasterID || '',
        companyMasterID: userMasterData?.companyMasterId || companyMasterID,
        employeeCode:
          userMasterData?.employeeJoiningDetails?.[0]?.employeeCode || '',
        displayName: userMasterData?.displayName || '',
        userNumber: userMasterData?.userNumber || '',
        branch:
          userMasterData?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        department:
          userMasterData?.employeeDepartments?.[0]?.department
            ?.departmentName || '',
        Division:
          userMasterData.employeeDivisions?.[0]?.division?.divisionName || '',

        designation:
          userMasterData?.employeeDesignations?.[0]?.designation
            ?.designationName || '',
        PayrollFrequency:
          userMasterData.employeeJoiningDetails?.[0]?.payrollFrequency || '',
        remarks,
        ...objectData,
      };
      finalData.push(employeData);
    }

    return res.status(200).json({
      status: 200,
      message: usermessage.reValidateMessage('Employee NCSL Deduction'),
      data: finalData,
      finalHeader,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveData = async (req, res, next) => {
  try {
    const { EmpNCSLData = [], finalHeader = [], companyMasterID } = req.body;

    if (
      !Array.isArray(EmpNCSLData) ||
      EmpNCSLData.length === 0 ||
      !Array.isArray(finalHeader) ||
      finalHeader.length === 0 ||
      !companyMasterID
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const allUserIds = EmpNCSLData.map((e) => e.userMasterID);

    const addedNCSLData = await EmpNCSLDeduction.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: allUserIds,
        },
        status: 1,
      },
    });

    const finalData = [];
    const toDeactivateIds = [];

    for (const data of EmpNCSLData) {
      const addedData = addedNCSLData.filter(
        (e) => e.userMasterID === data.userMasterID,
      );

      // Use a Map for quick lookup by category
      const categoryMap = new Map(
        addedData.map((entry) => [entry.category, entry]),
      );

      for (const header of finalHeader) {
        const categoryName = getNCSLEnumFromFullName(header);
        const amount = +data[header];

        if (!amount) continue;

        const existing = categoryMap.get(categoryName);

        if (existing) {
          if (+existing.amount !== amount) {
            toDeactivateIds.push(existing.id);
            finalData.push({
              userMasterID: data.userMasterID,
              category: categoryName,
              amount,
            });
          }
        } else {
          finalData.push({
            userMasterID: data.userMasterID,
            category: categoryName,
            amount,
          });
        }
      }
    }

    await sequelize.transaction(async (t) => {
      await EmpNCSLDeduction.update(
        {
          status: 0,
        },
        {
          where: {
            id: {
              [Sequelize.Op.in]: toDeactivateIds,
            },
          },
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        },
      );

      await EmpNCSLDeduction.bulkCreate(finalData, {
        individualHooks: true,
        user: req.userDetails,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('Employee NCSL Deduction'),
    });
  } catch (error) {
    next(error);
  }
};

// add skip data
exports.addSkipData = async (req, res, next) => {
  try {
    const { empNCSLDeductionId, YYYYMM, fortnight, remarks } = req.body;

    let { payrollFrequency } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const empNCSLData = await EmpNCSLDeduction.findOne({
      where: {
        id: empNCSLDeductionId,
        status: 1,
      },
    });

    if (!empNCSLData) {
      throw new Error('Record not found!');
    }

    const startDate = fortnight?.from || null;
    const endDate = fortnight?.to || null;

    const fortnightValue = fortnight
      ? `${fortnight.title}(${fortnight.from} - ${fortnight.to})`
      : '';

    // salary condition
    const salaryCondition = {
      payrollFrequency,
      userMasterID: empNCSLData.userMasterID,
    };

    const condition = {
      empNCSLDeductionId,
    };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      salaryCondition.salaryYYYYMM = YYYYMM;
      condition.YYYYMM = YYYYMM;
    } else {
      salaryCondition.startDate = startDate;
      salaryCondition.endDate = endDate;
      condition.fStartDate = startDate;
      condition.fEndDate = endDate;
    }

    const salary = await HRSalaryTrasaction.findOne({
      where: salaryCondition,
    });

    if (salary)
      return res.status(200).json({
        status: 401,
        message: 'Salary already calculated.',
      });

    const alreadyAddData = await SkipEmpNCSLDeduction.findOne({
      where: condition,
    });

    if (alreadyAddData) {
      throw new Error(
        `You have already skipped this ${fortnight ? 'fortnight' : 'month'}. `,
      );
    }

    await SkipEmpNCSLDeduction.create(
      {
        YYYYMM: fortnight ? null : YYYYMM,
        fortnight: fortnight ? fortnightValue : null,
        fStartDate: startDate,
        fEndDate: endDate,
        remarks,
        empNCSLDeductionId,
      },
      {
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('Skip NCSL Deduction'),
    });
  } catch (error) {
    next(error);
  }
};

// Delete SkipData

exports.deleteSkipData = async (req, res, next) => {
  try {
    const { empNCSLDeductionId } = req.body;

    const data = await SkipEmpNCSLDeduction.findByPk(empNCSLDeductionId);

    if (!data) {
      return res.status(200).json({
        status: 401,
        message: 'Record not found!',
      });
    }

    if (data.salaryStatus) {
      return res.status(200).json({
        status: 401,
        message: 'Salary has already been calculated.',
      });
    }

    await data.destroy({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Skip NCSL Deduction'),
    });
  } catch (error) {
    next(error);
  }
};

// List Delete status

exports.listSkipData = async (req, res, next) => {
  try {
    const { page, limit, empNCSLDeductionId } = req.body;

    if (!empNCSLDeductionId) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const { rows: data, count } = await SkipEmpNCSLDeduction.findAndCountAll({
      where: {
        empNCSLDeductionId,
      },
      ...paginateCondition,
    });

    return res.status(200).json({
      status: 200,
      data,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};
