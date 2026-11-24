const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const incomeTaxSlabMaster = require('../models/incomeTaxSlabMaster');
const YTDIncomeTaxSlab = require('../models/YTDIncomeTaxSlab');
const { usermessage } = require('../response_message/message');
const {
  asiaKolkataDateTime,
  month_dict,
} = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const { PayrollFrequencyType, FileUploadType } = require('../utils/dbUtils');
const UserMaster = require('../models/userMaster');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const YTDTaxEntries = require('../models/YTDTaxEntries');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const fs = require('fs');
const companyMaster = require('../models/companyMaster');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.downloadDemoExcel = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      userMasterID,
      payrollFrequency,
      year,
    } = req.body;

    if (!companyMasterID || !payrollFrequency || !year) {
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
          attributes: ['employeeCode', 'employeeType'],
        },
        {
          required: false,
          model: YTDTaxEntries,
          where: {
            year,
            payrollFrequency,
          },
          attributes: ['taxableAmount', 'taxAmount'],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const finalData = await Promise.all(
      userData.map((u) => {
        return {
          'Employee Code': u.employeeJoiningDetails[0].employeeCode,
          'Employee Name': u.displayName,
          'Mobile No.': u.userNumber,
          Branch: u.employeeBranches?.[0]?.branchMaster?.branchName || '',
          Department:
            u.employeeDepartments?.[0]?.department?.departmentName || '',
          Division: u.employeeDivisions?.[0]?.division?.divisionName || '',
          Designation:
            u.employeeDesignations?.[0]?.designation?.designationName || '',
          'Employee Type': u.employeeJoiningDetails[0].employeeType || '',
          TaxableAmount: u.YTDTaxEntries?.[0]?.taxableAmount || '',
          TaxAmount: u.YTDTaxEntries?.[0]?.taxAmount || '',
        };
      }),
    );

    if (finalData.length === 0) {
      return res.status(200).json({
        message: 'No data found to export!',
      });
    }

    return await generateExcel(
      finalData,
      `YTD Tax DemoExcel - ${year}`,
      'xlsx',
      res,
    );
  } catch (error) {
    next(error);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      userMasterID,
      year,
      startDate,
      endDate,
      startMonth,
      endMonth,
    } = await req.body;

    let { payrollFrequency } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    if (
      !companyMasterID ||
      !payrollFrequency ||
      !year ||
      (payrollFrequency === PayrollFrequencyType.MONTHLY &&
        (!startMonth || !endMonth)) ||
      (payrollFrequency !== PayrollFrequencyType.MONTHLY &&
        (!startDate || !endDate))
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const rows = await readXlsxFile(filePath);

    // remove header
    rows.shift();
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    let fileUploadType = FileUploadType.MOBILE_NUMBER;
    const companyData = await companyMaster.findOne({
      where: { companyMasterID },
      attributes: ['fileUploadType'],
    });
    if (companyData.fileUploadType == FileUploadType.EMPLOYEE_CODE)
      fileUploadType = companyData.fileUploadType;

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
            ...(departmentID && { departmentID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: departmentID ? true : false,
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
            ...(branchMasterID && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: branchMasterID ? true : false,
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
            ...(fileUploadType === FileUploadType.EMPLOYEE_CODE
              ? { employeeCode: { [Sequelize.Op.ne]: null } }
              : {}),
          },
          attributes: ['employeeCode', 'employeeType'],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const finalData = [];
    for (const row of rows) {
      let userMasterData = null;
      const index = fileUploadType === FileUploadType.MOBILE_NUMBER ? 2 : 0;

      let remarks = '';
      let remarksFlag = false;

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

      if (
        ((row[8] && typeof row[8] != 'number') ||
          (row[9] && typeof row[9] != 'number')) &&
        !remarksFlag
      ) {
        remarksFlag = true;
        remarks = 'Taxable amount and tax amount must be numbers.';
      }

      if ((+row[8] < 0 || +row[9] < 0) && !remarksFlag) {
        remarks = 'Please enter only non-negative values.';
      }

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
        'Employee Type':
          userMasterData.employeeJoiningDetails?.[0]?.employeeType || '',
        remarks,
        payrollFrequency,
        year,
        startDate:
          payrollFrequency != PayrollFrequencyType.MONTHLY ? startDate : null,
        endDate:
          payrollFrequency != PayrollFrequencyType.MONTHLY ? endDate : null,
        startMonth:
          payrollFrequency == PayrollFrequencyType.MONTHLY ? startMonth : null,
        endMonth:
          payrollFrequency == PayrollFrequencyType.MONTHLY ? endMonth : null,
        taxableAmount: row[8],
        taxAmount: row[9],
      };

      finalData.push(employeData);
    }

    fs.unlink(filePath, function (err) {});

    return res.status(200).json({
      status: 200,
      message: usermessage.validateMessage('YTD Taxable Amount & Tax Entry'),
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateExcel = async (req, res, next) => {
  try {
    const { YTDTaxData = [], companyMasterID } = req.body;

    if (
      !Array.isArray(YTDTaxData) ||
      YTDTaxData.length === 0 ||
      !companyMasterID
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const allUserIds = YTDTaxData.map((e) => e.userMasterID);
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
          attributes: ['employeeCode', 'employeeType'],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    const finalData = [];

    for (const data of YTDTaxData) {
      let remarks = '',
        remarksFlag = false;

      const userMasterData = userData.find(
        (e) => e.userMasterID == data.userMasterID,
      );

      if (!userMasterData) {
        remarks = `User with ${data.userNumber} Mobile not found.`;
        remarksFlag = true;
      }

      if (
        ((data.taxableAmount && typeof data.taxableAmount != 'number') ||
          (data.taxAmount && typeof data.taxAmount != 'number')) &&
        !remarksFlag
      ) {
        remarksFlag = true;
        remarks = 'Taxable amount and tax amount must be numbers.';
      }

      if ((+data.taxableAmount < 0 || +data.taxAmount < 0) && !remarksFlag) {
        remarks = 'Please enter only non-negative values.';
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
        'Employee Type':
          userMasterData.employeeJoiningDetails?.[0]?.employeeType || '',
        remarks,
        payrollFrequency: data.payrollFrequency,
        year: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
        startMonth: data.startMonth,
        endMonth: data.endMonth,
        taxableAmount: data.taxableAmount,
        taxAmount: data.taxAmount,
      };

      finalData.push(employeData);
    }

    return res.status(200).json({
      status: 200,
      message: usermessage.reValidateMessage('YTD Taxable Amount & Tax Entry'),
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { YTDTaxData = [] } = req.body;

    const userIds = YTDTaxData.map((e) => e.userMasterID);
    const payrollFrequency = YTDTaxData?.[0]?.payrollFrequency || '';
    const year = YTDTaxData?.[0]?.year || '';
    let startDate = YTDTaxData?.[0]?.startDate || '';
    let endDate = YTDTaxData?.[0]?.endDate || '';
    let startMonth = YTDTaxData?.[0]?.startMonth || '';
    let endMonth = YTDTaxData?.[0]?.endMonth || '';

    if (!userIds.length || !payrollFrequency) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    if (
      [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      )
    ) {
      startMonth = null;
      endMonth = null;
      if (!startDate || !endDate) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: usermessage.ValidParameters,
        });
      }
    } else {
      startDate = null;
      endDate = null;

      if (!startMonth || !endMonth) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: usermessage.ValidParameters,
        });
      }
    }

    const finalData = [];

    for (const data of YTDTaxData) {
      if (!data.taxableAmount) continue;
      finalData.push({
        payrollFrequency: data.payrollFrequency,
        year,
        startMonth,
        endMonth,
        startDate,
        endDate,
        taxableAmount: data.taxableAmount,
        taxAmount: data.taxAmount,
        userMasterId: data.userMasterID,
      });
    }

    await YTDTaxEntries.destroy({
      where: {
        userMasterId: {
          [Sequelize.Op.in]: userIds,
        },
        year,
      },
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await YTDTaxEntries.bulkCreate(finalData, {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('YTD Taxable Amount & Tax Entry'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.listData = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      companyMasterId,
      userMasterID,
      payrollFrequency,
      year,
      Export,
    } = req.body;

    if (!companyMasterId)
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });

    const paginationQuery = {};

    if (page && limit && !Export) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const YTDcondition = {};

    if (payrollFrequency) YTDcondition.payrollFrequency = payrollFrequency;

    if (year) YTDcondition.year = year;

    if (userMasterID && userMasterID.length)
      YTDcondition.userMasterId = {
        [Sequelize.Op.in]: userMasterID,
      };

    let currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { rows: userData, count } = await YTDTaxEntries.findAndCountAll({
      where: YTDcondition,
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId,
          },
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
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
              attributes: ['employeeCode'],
            },
          ],
        },
      ],
      order: [
        [Sequelize.literal(`"userMaster.displayName"`), 'ASC'],
        ['year', 'DESC'],
      ],
    });

    const finalData = userData.map((e) => {
      return {
        EmployeeCode: e.userMaster.employeeJoiningDetails?.[0]?.employeeCode,
        EmployeeName: e.userMaster.displayName,
        Number: e.userMaster.userNumber,
        Branch:
          e.userMaster.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          e.userMaster.employeeDepartments?.[0]?.department?.departmentName ||
          '',
        Designation:
          e.userMaster.employeeDesignations?.[0]?.designation
            ?.designationName || '',
        PayrollFrequency: e.payrollFrequency,
        Year: e.year,
        StartMonth: e.startMonth
          ? month_dict[String(e.startMonth).slice(4, 6)] +
            '-' +
            String(e.startMonth).slice(0, 4)
          : '',
        EndMonth: e.endMonth
          ? month_dict[String(e.endMonth).slice(4, 6)] +
            '-' +
            String(e.endMonth).slice(0, 4)
          : '',
        StartDate: e.startDate
          ? String(e.startDate).split('-').reverse().join('-')
          : '',
        EndDate: e.endDate
          ? String(e.endDate).split('-').reverse().join('-')
          : '',
        TaxableAmount: e.taxableAmount,
        TaxAmount: e.taxAmount,
      };
    });

    if (Export)
      return await generateExcel(
        finalData,
        'YTD Taxable Amount & Tax Entry',
        'xlsx',
        res,
      );

    return res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};
