const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const { generateExcel } = require('../utils/exportData');
const EmployeePenalty = require('../models/employeePenalty');
const Penalty = require('../models/penalty');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const moment = require('moment');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  asiaKolkataDateTime,
  parseEmployeeInfo,
  month_dict,
} = require('../utils/commonUtilFunctions');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const Excel = require('exceljs');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getPenaltyData = async (req, res, next) => {
  try {
    let { page, limit, startdate, enddate, userMasterID, exportData, orderBy } =
      await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {};

    if (userMasterID) condition.userMasterID = userMasterID;

    if (startdate && enddate) {
      condition.penaltyDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    condition.status = 1;

    const paginationQuery = !exportData
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    let order = [
      [{ model: UserMaster, as: 'employee' }, 'displayName', 'ASC'],
      ['penaltyDate', 'DESC'],
    ];

    if (orderBy == 'date') {
      order = [
        ['penaltyDate', 'DESC'],
        [{ model: UserMaster, as: 'employee' }, 'displayName', 'ASC'],
      ];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows, count } = await EmployeePenalty.findAndCountAll({
      subQuery:false,
      order,
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: Penalty,
          as: 'penalty',
          attributes: ['penaltyName', 'deductionFromSalary'],
        },
        {
          model: UserMaster,
          as: 'employee',
          where: { ...userAccessCondition.where },
          attributes: ['displayName', 'userNumber', 'companyMasterId'],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: companyMaster,
              attributes: ['companyName'],
            },
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(currentDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(currentDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['divisionId'],
              include: [
                {
                  model: Division,
                  attributes: ['divisionName'],
                },
              ],
            },
            {
              required: false,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['workingAreaId'],
              include: [
                {
                  model: WorkingArea,
                  attributes: ['workingAreaName'],
                },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: ['displayName'],
        },
        {
          model: HRSalaryTrasaction,
          attributes: ['salaryYYYYMM'],
        },
      ],
    });

    if (exportData) {
      if (orderBy == 'date') {
        const finaldata = rows.map((e) => {
          return {
            EmployeeCode: parseEmployeeInfo(e.employee)?.employeeCode,
            EmplyoeeName: e.employee?.displayName,
            Number: e.employee?.userNumber,
            Company: parseEmployeeInfo(e.employee)?.companyName,
            Branch: parseEmployeeInfo(e.employee)?.branch,
            Department: parseEmployeeInfo(e.employee)?.department,
            Designation: parseEmployeeInfo(e.employee)?.designation,
            Division: parseEmployeeInfo(e.employee)?.division,
            WorkingArea: parseEmployeeInfo(e.employee)?.workingArea,
            PenaltyName: e.penalty?.penaltyName || '',
            'Deduction From Salary': e.penalty?.deductionFromSalary || '',
            penaltyDate: e.penaltyDate
              ? moment(e.penaltyDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
              : '',
            penaltyAmount: e.penaltyAmount,
            'Penalty Deduction Month': e.hrSalaryTrasaction?.salaryYYYYMM
              ? month_dict[
                  String(e.hrSalaryTrasaction?.salaryYYYYMM).slice(4, 6)
                ] +
                '-' +
                String(e.hrSalaryTrasaction?.salaryYYYYMM).slice(0, 4)
              : '',
            description: e.description,
            'Created By': `${e.createdByUser?.displayName} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`,
          };
        });

        const totalAmount = finaldata.reduce(
          (acc, obj) => acc + +obj.penaltyAmount,
          0,
        );

        finaldata.push({
          EmployeeCode: '',
          EmplyoeeName: '',
          Number: '',
          Company: '',
          Branch: '',
          Department: '',
          Designation: '',
          Division: '',
          WorkingArea: '',
          PenaltyName: '',
          'Deduction From Salary': '',
          penaltyDate: 'Total',
          penaltyAmount:
            totalAmount % 1 == 0 ? totalAmount : totalAmount.toFixed(2),
          'Penalty Deduction Month': '',
          description: '',
          'Created By': '',
        });

        return await generateExcel(finaldata, 'Penalty Report', 'xlsx', res);
      } else {
        // Employee-wise Excel report (grouped by employee) with proper borders
        const workBook = new Excel.Workbook();
        const workSheet = workBook.addWorksheet('Penalty Report');

        // Define columns
        const columns = [
          { header: 'EmployeeCode', key: 'EmployeeCode', width: 15 },
          { header: 'EmployeeName', key: 'EmployeeName', width: 20 },
          { header: 'Number', key: 'Number', width: 15 },
          { header: 'Company', key: 'Company', width: 20 },
          { header: 'Branch', key: 'Branch', width: 15 },
          { header: 'Department', key: 'Department', width: 15 },
          { header: 'Designation', key: 'Designation', width: 15 },
          { header: 'Division', key: 'Division', width: 15 },
          { header: 'WorkingArea', key: 'WorkingArea', width: 15 },
          { header: 'PenaltyName', key: 'PenaltyName', width: 18 },
          {
            header: 'Deduction From Salary',
            key: 'DeductionFromSalary',
            width: 18,
          },
          { header: 'PenaltyDate', key: 'PenaltyDate', width: 12 },
          { header: 'PenaltyAmount', key: 'PenaltyAmount', width: 15 },
          {
            header: 'Penalty Deduction Month',
            key: 'PenaltyDeductionMonth',
            width: 20,
          },
          { header: 'Description', key: 'Description', width: 25 },
          { header: 'Created By', key: 'CreatedBy', width: 30 },
        ];
        workSheet.columns = columns;

        // Style header row
        const headerRow = workSheet.getRow(1);
        headerRow.height = 20;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '729fcf' },
          };
          cell.font = { bold: true, name: 'calibri' };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        // Group data by userMasterID while maintaining employee name order
        const employeeGroups = {};
        const employeeOrder = []; // Track order of employees
        rows.forEach((e) => {
          const empId = e.userMasterID || 'unknown';
          if (!employeeGroups[empId]) {
            employeeGroups[empId] = [];
            employeeOrder.push(empId); // Maintain insertion order (already sorted by displayName ASC)
          }
          employeeGroups[empId].push(e);
        });

        let currentRow = 2;
        let grandTotal = 0;
        const thinBorder = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Process each employee group in order
        employeeOrder.forEach((empId) => {
          const employeeRows = employeeGroups[empId];
          let employeeTotal = 0;

          // Add penalty rows for this employee
          employeeRows.forEach((e) => {
            const penaltyAmount = +e.penaltyAmount || 0;
            employeeTotal += penaltyAmount;

            const row = workSheet.getRow(currentRow);
            row.values = {
              EmployeeCode: parseEmployeeInfo(e.employee)?.employeeCode || '',
              EmployeeName: e.employee?.displayName || '',
              Number: e.employee?.userNumber || '',
              Company: parseEmployeeInfo(e.employee)?.companyName || '',
              Branch: parseEmployeeInfo(e.employee)?.branch || '',
              Department: parseEmployeeInfo(e.employee)?.department || '',
              Designation: parseEmployeeInfo(e.employee)?.designation || '',
              Division: parseEmployeeInfo(e.employee)?.division || '',
              WorkingArea: parseEmployeeInfo(e.employee)?.workingArea || '',
              PenaltyName: e.penalty?.penaltyName || '',
              DeductionFromSalary: e.penalty?.deductionFromSalary || '',
              PenaltyDate: e.penaltyDate
                ? moment(e.penaltyDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
                : '',
              PenaltyAmount: penaltyAmount,
              PenaltyDeductionMonth: e.hrSalaryTrasaction?.salaryYYYYMM
                ? month_dict[
                    String(e.hrSalaryTrasaction?.salaryYYYYMM).slice(4, 6)
                  ] +
                  '-' +
                  String(e.hrSalaryTrasaction?.salaryYYYYMM).slice(0, 4)
                : '',
              Description: e.description || '',
              CreatedBy: `${e.createdByUser?.displayName || ''} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`,
            };
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = thinBorder;
            });
            currentRow++;
          });

          // Add employee total row
          const totalRow = workSheet.getRow(currentRow);
          totalRow.getCell(1).value = 'Total';
          totalRow.getCell(13).value =
            employeeTotal % 1 == 0 ? employeeTotal : +employeeTotal.toFixed(2);

          // Merge cells from EmployeeCode (A) to PenaltyName (L) - columns 1 to 12
          workSheet.mergeCells(currentRow, 1, currentRow, 12);

          totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'E0E0E0' },
            };
            if (colNumber === 1) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });
          // Apply border to all 16 columns
          for (let col = 1; col <= 16; col++) {
            const cell = totalRow.getCell(col);
            cell.border = thinBorder;
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'E0E0E0' },
            };
          }
          currentRow++;

          // Add empty separator row (no borders)
          currentRow++;

          grandTotal += employeeTotal;
        });

        // Add grand total row at the end
        const grandTotalRow = workSheet.getRow(currentRow);
        grandTotalRow.getCell(1).value = 'Grand Total';
        grandTotalRow.getCell(13).value =
          grandTotal % 1 == 0 ? grandTotal : +grandTotal.toFixed(2);

        // Merge cells from EmployeeCode (A) to PenaltyDate (L) - columns 1 to 12
        workSheet.mergeCells(currentRow, 1, currentRow, 12);

        // Apply border and style to all 16 columns
        for (let col = 1; col <= 16; col++) {
          const cell = grandTotalRow.getCell(col);
          cell.border = thinBorder;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD700' },
          };
          if (col === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }

        res.attachment('Penalty Report.xlsx');
        res.set({ 'Access-Control-Expose-Headers': '*' });
        return workBook.xlsx.write(res);
      }
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};
