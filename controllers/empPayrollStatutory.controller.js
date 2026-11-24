const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { statusCodes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const EmpPayrollStatutory = require('../models/empPayrollStatutory');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmpPayrollStatutoryDetails = require('../models/empPayrollStatutoryDetails');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');
const { notIncludePyaheadIds, SalaryStructureTypeEnum, payheadMasterIdsMapping, salaryFieldSrNoFields, employeementTypeEnum, default_payheadMasterIds, PayrollFrequencyType, SkillCategoryType, FormulaPreferenceEnum, PTCalculationEnum, lwfDeductionMethodEnum } = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const GradeStructure = require('../models/gradeStructure');
const moment = require('moment');
const ExcelJS = require('exceljs');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const path = require('path');
const fs = require('fs');
const readXlsxFile = require('read-excel-file/node');
const StateMaster = require('../models/statemaster');
const Corporation = require('../models/corporation');
const MinWagesMaster = require('../models/minWagesMaster');
const ProfessionalTaxSlabMaster = require('../models/professionaltaxmaster');
const LwfMaster = require('../models/lwfMaster');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const crypto = require('crypto');
const { infixtopostfix, getRoundOffSalary } = require('../utils/commonUtilFunctions');
const { showEmployerLWF } = require('../utils/labelUtils');
const PayrollStatutorySalaryTrans = require('../models/payrollStatutorySalaryTrans');

exports.listData = async(req,res,next)=>{
    try {

        const {page,limit,companyMasterID,userMasterID,exportData} = req.body;

        if(!companyMasterID) return res.status(statusCodes.BAD_REQUEST).json({
            status:statusCodes.BAD_REQUEST,
            message:usermessage.requiredMessage('companyMasterID')
        });

        const paginateCondition = !exportData && page && limit ? {offset:(page-1) * limit,limit}:{};

        const condition = {};

        if(Array.isArray(userMasterID) && userMasterID?.length){
            condition.userMasterID = {
                [Sequelize.Op.in]:userMasterID
            }
        };

        const currentDate = moment().format('YYYY-MM-DD');

          const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

        const includeModels = [
            {
              required:true,
                model:UserMaster,
                where:{
                    ...userAccessCondition.where,
                   companyMasterId:companyMasterID,
                   status:1
                },
                include:[
                    ...userAccessCondition.includeModels,
                    {
                    model:EmployeeJoiningDetails,
                     as: 'emp_join',
                    attributes:['employeeCode']
                },
                  {
              model: EmployeeDesignation,
               as: 'emp_desig',
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
               as:'emp_dept',
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
               as: 'emp_branch',
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
                    required: false,
                    model: EmployeeDivision,
                    as: 'emp_div',
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: currentDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: currentDate } },
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
                    separate:true,
                    model: EmployeeWorkingArea,
                    as: 'emp_area',
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
                attributes:['displayName','userNumber','userMasterID']

            }
        ];

        // For export, don't load all data at once - we'll fetch in chunks
        if(!exportData){
            // For non-export (pagination), fetch data normally
            const {rows,count} = await EmpPayrollStatutory.findAndCountAll({
                distinct:true,
                subQuery: false,
                where:condition,
                ...paginateCondition,
                include:includeModels,
                order:[
                   [{ model: UserMaster, as: 'userMaster' }, 'displayName', 'ASC'],
                   ['salaryFromYYYYMM', 'DESC'],
                ]
            });

            return res.status(statusCodes.OK).json({
                status:statusCodes.OK,
                data:rows,
                totalcount:count
            });
        }

        if(exportData){

              includeModels.push(
                {
                    required:true,
                model:EmpPayrollStatutoryDetails,
                as:'EPSD',
                attributes:['EmployeeSalaryAmount','gradeSalaryStructureID'],
                include:[
                    {
                    required:true,
                        model:GradeSalaryStructure,
                        attributes:['salaryFieldID','formula'],
                        as:'GSS',
                        include:[
                            {
                             model:GradeStructure,
                             attributes:['gradeName','baseOnCalculation']
                            },
                            {
                                required:true,
                                model:HRSalaryFields,
                                 as:'HSF',
                                where:{
                                 payheadMasterId:{
                                    [Sequelize.Op.notIn]:notIncludePyaheadIds
                                 }
                                },
                                attributes:['payheadMasterId','payheadDisplayName','salaryFieldSrNo'],
                               
                                include:[
                                    {
                                        required:true,
                                        model:Payheadmaster,
                                        as:'PHM',
                                        attributes:['payheadName']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        )

      // Set response headers for Excel download
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition', 'attachment; filename=EmployeePayrollStatutory.xlsx');

// Use streaming workbook for memory efficiency
const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
   stream: res,
   useStyles: true,
   useSharedStrings: true
});

const worksheet = workbook.addWorksheet('EmployeePayrollStatutory', {
   views: [{ state: 'frozen', ySplit: 1 }] // keep row 1 static while scrolling
});

// Column layout: A-J = employee info, K-N = structure data (payhead breakup)
const EMP_COLS = [
   { key: 'employeeCode', header: 'Employee Code', width: 14 },
   { key: 'employeeName', header: 'Employee Name', width: 20 },
   { key: 'mobileNo', header: 'Mobile No.', width: 14 },
   { key: 'branch', header: 'Branch', width: 16 },
   { key: 'department', header: 'Department', width: 16 },
   { key: 'designation', header: 'Designation', width: 16 },
   { key: 'division', header: 'Division', width: 14 },
   { key: 'workingArea', header: 'WorkingArea', width: 16 },
   { key: 'applicableFrom', header: 'Applicable From', width: 16 },
   { key: 'gradeName', header: 'Grade Name', width: 22 }
];
const STRUCT_COLS = [
   { key: 'payheadName', header: 'PayheadName', width: 20 },
   { key: 'salaryFieldSrNo', header: 'SalaryFieldSrNo', width: 16 },
   { key: 'formula', header: 'Formula', width: 18 },
   { key: 'amount', header: 'Amount', width: 12 }
];

worksheet.columns = [...EMP_COLS, ...STRUCT_COLS];

const HEADER_FILL = {
   type: 'pattern',
   pattern: 'solid',
   fgColor: { argb: 'FF729FCF' }
};

const THIN = { style: 'thin' };
const TABLE_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// ----- Row 1: top header -----
const headerRow = worksheet.getRow(1);
EMP_COLS.forEach((col, idx) => {
   const cell = headerRow.getCell(idx + 1);
   cell.value = col.header;
   cell.font = { bold: true };
   cell.fill = HEADER_FILL;
   cell.alignment = { horizontal: 'center' };
});
// "Structure Data" merged over K1:N1
worksheet.mergeCells(1, EMP_COLS.length + 1, 1, EMP_COLS.length + STRUCT_COLS.length);
const structHeaderCell = headerRow.getCell(EMP_COLS.length + 1);
structHeaderCell.value = 'Structure Data';
structHeaderCell.font = { bold: true };
structHeaderCell.fill = HEADER_FILL;
structHeaderCell.alignment = { horizontal: 'center' };
structHeaderCell.border = TABLE_BORDER;
headerRow.commit();

const specialPayhead = [payheadMasterIdsMapping.GROSS, payheadMasterIdsMapping.NETSALARY, payheadMasterIdsMapping.CTC];

// Fetch and process data in chunks for memory efficiency
const chunkSize = 500; // Process 500 employees at a time
let offset = 0;
let hasMoreData = true;
let currentRow = 2; // next writable row (row 1 is the header)

while (hasMoreData) {
   // Fetch chunk from database
   const chunk = await EmpPayrollStatutory.findAll({
      subQuery: false,
      where: condition,
      include: includeModels,
      order: [
         [{ model: UserMaster, as: 'userMaster' }, 'displayName', 'ASC'],
         ['salaryFromYYYYMM', 'DESC'],
      ],
      limit: chunkSize,
      offset: offset
   });

   if (!chunk || chunk.length === 0) {
      hasMoreData = false;
      break;
   }

   // Process each employee in the chunk
   for (const employee of chunk) {
      const userMaster = employee.userMaster || null;
      const payrollStatutoryDetails = employee.EPSD || [];
      const gradeName = payrollStatutoryDetails?.[0]?.GSS?.gradeStructure?.gradeName || '';
      const structureType = payrollStatutoryDetails?.[0]?.GSS?.gradeStructure?.baseOnCalculation || '';

      const baseRowValues = {
         employeeCode: userMaster?.emp_join?.[0]?.employeeCode || '',
         employeeName: userMaster?.displayName || '',
         mobileNo: userMaster?.userNumber || '',
         branch: userMaster?.emp_branch?.[0]?.branchMaster?.branchName || '',
         department: userMaster?.emp_dept?.[0]?.department?.departmentName || '',
         designation: userMaster?.emp_desig?.[0]?.designation?.designationName || '',
         division: userMaster?.emp_div?.[0]?.division?.divisionName || '',
         workingArea: userMaster?.emp_area?.[0]?.workingArea?.workingAreaName || '',
         applicableFrom: moment(employee.salaryFromYYYYMM.toString(), "YYYYMM").format("MMMM-YYYY"),
         gradeName: `${gradeName}(${structureType == SalaryStructureTypeEnum.DAILY ? 'Daily' : structureType == SalaryStructureTypeEnum.HOURLY ? 'Hourly' : 'Monthly'})`
      };

      // Categorize salary fields (same ordering as before: A, Gross, B, NetPay, C, CTC)
      const salaryFieldA = [];
      const salaryFieldB = [];
      const salaryFieldC = [];
      let gross = null;
      let netPay = null;
      let ctc = null;

      payrollStatutoryDetails.forEach(detail => {
         const item = {
            payheadMasterId: detail.GSS?.HSF?.payheadMasterId || '',
            payheadName: detail.GSS?.HSF?.payheadDisplayName || detail.GSS?.HSF?.PHM?.payheadName || '',
            salaryFieldSrNo: detail.GSS?.HSF?.salaryFieldSrNo || '',
            formula: detail.GSS?.formula || '',
            amount: detail.EmployeeSalaryAmount || 0
         };

         if (item.payheadMasterId == payheadMasterIdsMapping.GROSS) {
            gross = item;
         } else if (item.payheadMasterId == payheadMasterIdsMapping.NETSALARY) {
            netPay = item;
         } else if (item.payheadMasterId == payheadMasterIdsMapping.CTC) {
            ctc = item;
         } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EARNING) {
            salaryFieldA.push(item);
         } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
            salaryFieldB.push(item);
         } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
            salaryFieldC.push(item);
         }
      });

      const structureItems = [
         ...salaryFieldA,
         ...(gross ? [gross] : []),
         ...salaryFieldB,
         ...(netPay ? [netPay] : []),
         ...salaryFieldC,
         ...(ctc ? [ctc] : [])
      ];

      // Block = 1 sub-header row ("PayheadName/SalaryFieldSrNo/Formula/Amount") + 1 row per structure item
      const blockStartRow = currentRow;
      const blockEndRow = blockStartRow + structureItems.length; // sub-header row + N item rows

      // --- sub-header row for this employee's structure table (K:N) + employee info (A:J) ---
      const subHeaderRow = worksheet.getRow(blockStartRow);
      EMP_COLS.forEach((col, idx) => {
         subHeaderRow.getCell(idx + 1).value = baseRowValues[col.key];
      });
      STRUCT_COLS.forEach((col, idx) => {
         const cell = subHeaderRow.getCell(EMP_COLS.length + idx + 1);
         cell.value = col.header;
         cell.font = { bold: true };
         cell.border = TABLE_BORDER;
      });

      // --- one row per payhead item ---
      structureItems.forEach((item, i) => {
         const row = worksheet.getRow(blockStartRow + i + 1);
         const isSpecial = specialPayhead.includes(+item.payheadMasterId);

         row.getCell(EMP_COLS.length + 1).value = item.payheadName;
         row.getCell(EMP_COLS.length + 2).value = isSpecial ? '' : item.salaryFieldSrNo;
         row.getCell(EMP_COLS.length + 3).value = isSpecial ? '' : item.formula;
         const amountCell = row.getCell(EMP_COLS.length + 4);
         amountCell.value = item.amount;

         // border + bold (for Gross/Net Pay/CTC) across the structure data columns
         for (let c = EMP_COLS.length + 1; c <= EMP_COLS.length + STRUCT_COLS.length; c++) {
            const cell = row.getCell(c);
            cell.border = TABLE_BORDER;
            if (isSpecial) {
               cell.font = { bold: true };
            }
         }
      });

      // --- merge A:J vertically across the whole block (must happen before commit) ---
      if (blockEndRow > blockStartRow) {
         for (let c = 1; c <= EMP_COLS.length; c++) {
            worksheet.mergeCells(blockStartRow, c, blockEndRow, c);
         }
      }

      // --- now commit every row in the block, in order ---
      for (let r = blockStartRow; r <= blockEndRow; r++) {
         worksheet.getRow(r).commit();
      }

      // leave row (blockEndRow + 1) blank as a separator before the next employee's block
      currentRow = blockEndRow + 2;
   }

   // Move to next chunk
   offset += chunkSize;

   // If chunk is smaller than chunkSize, we've reached the end
   if (chunk.length < chunkSize) {
      hasMoreData = false;
   }
}

// Finalize worksheet and workbook
await worksheet.commit();
await workbook.commit();

return;
        }

        //  // Set response headers for Excel download
        //  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        //  res.setHeader('Content-Disposition', 'attachment; filename=EmployeePayrollStatutory.xlsx');

        //  // Use streaming workbook for memory efficiency
        //  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        //     stream: res,
        //     useStyles: true,
        //     useSharedStrings: true
        //  });

        //  const worksheet = workbook.addWorksheet('EmployeePayrollStatutory');

        //  // Define columns
        //  worksheet.columns = [
        //     { header: 'Employee Code', key: 'Employee Code', width: 15 },
        //     { header: 'Employee Name', key: 'Employee Name', width: 25 },
        //     { header: 'Mobile No.', key: 'Mobile No.', width: 15 },
        //     { header: 'Branch', key: 'Branch', width: 20 },
        //     { header: 'Department', key: 'Department', width: 20 },
        //     { header: 'Designation', key: 'Designation', width: 20 },
        //     { header: 'Division', key: 'Division', width: 20 },
        //     { header: 'WorkingArea', key: 'WorkingArea', width: 20 },
        //     { header: 'Applicable From', key: 'Applicable From', width: 18 },
        //     { header: 'Grade Name', key: 'Grade Name', width: 25 },
        //     { header: 'PayheadName', key: 'PayheadName', width: 20 },
        //     { header: 'SalaryFieldSrNo', key: 'SalaryFieldSrNo', width: 18 },
        //     { header: 'Formula', key: 'Formula', width: 20 },
        //     { header: 'Amount', key: 'Amount', width: 15 }
        //  ];

        //  // Style header row
        //  worksheet.getRow(1).font = { bold: true };
        //  worksheet.getRow(1).fill = {
        //     type: 'pattern',
        //     pattern: 'solid',
        //     fgColor: { argb: 'FFD3D3D3' }
        //  };

        //  // Commit header row
        //  worksheet.getRow(1).commit();

        //  // Fetch and process data in chunks for memory efficiency
        //  const chunkSize = 500; // Process 500 employees at a time
        //  let offset = 0;
        //  let hasMoreData = true;

        //  const specialPayhead = [payheadMasterIdsMapping.GROSS,payheadMasterIdsMapping.NETSALARY,payheadMasterIdsMapping.CTC];

        //  while(hasMoreData) {
        //     // Fetch chunk from database
        //     const chunk = await EmpPayrollStatutory.findAll({
        //       subQuery: false,
        //         where:condition,
        //         include:includeModels,
        //         order:[
        //            [{ model: UserMaster, as: 'userMaster' }, 'displayName', 'ASC'],
        //            ['salaryFromYYYYMM', 'DESC'],
        //         ],
        //         limit: chunkSize,
        //         offset: offset
        //     });

        //     if(!chunk || chunk.length === 0) {
        //         hasMoreData = false;
        //         break;
        //     }

        //     // Process each employee in the chunk
        //     for (const employee of chunk) {
        //         const userMaster = employee.userMaster || null;
        //         const payrollStatutoryDetails = employee.EPSD || [];
        //         const gradeName = payrollStatutoryDetails?.[0]?.GSS?.gradeStructure?.gradeName || '';
        //         const structureType = payrollStatutoryDetails?.[0]?.GSS?.gradeStructure?.baseOnCalculation || '';

        //         // Create base employee info
        //         const baseRow = {
        //             'Employee Code': userMaster?.emp_join?.[0]?.employeeCode || '',
        //             'Employee Name': userMaster?.displayName || '',
        //             'Mobile No.': userMaster?.userNumber || '',
        //             'Branch': userMaster?.emp_branch?.[0]?.branchMaster?.branchName || '',
        //             'Department': userMaster?.emp_dept?.[0]?.department?.departmentName || '',
        //             'Designation': userMaster?.emp_desig?.[0]?.designation?.designationName || '',
        //             'Division': userMaster?.emp_div?.[0]?.division?.divisionName || '',
        //             'WorkingArea': userMaster?.emp_area?.[0]?.workingArea?.workingAreaName || '',
        //             'Applicable From': moment(employee.salaryFromYYYYMM.toString(), "YYYYMM").format("MMMM-YYYY"),
        //             'Grade Name': `${gradeName}(${structureType == SalaryStructureTypeEnum.DAILY ? 'Daily' : structureType == SalaryStructureTypeEnum.HOURLY ? 'Hourly' : 'Monthly'})`
        //         };

        //         // Categorize salary fields
        //         const salaryFieldA = [];
        //         const salaryFieldB = [];
        //         const salaryFieldC = [];
        //         let gross = null;
        //         let netPay = null;
        //         let ctc = null;

        //         payrollStatutoryDetails.forEach(detail => {
        //             const item = {
        //                 payheadMasterId: detail.GSS?.HSF?.payheadMasterId || '',
        //                 payheadName: detail.GSS?.HSF?.payheadDisplayName || detail.GSS?.HSF?.PHM?.payheadName || '',
        //                 salaryFieldSrNo: detail.GSS?.HSF?.salaryFieldSrNo || '',
        //                 formula: detail.GSS?.formula || '',
        //                 amount: detail.EmployeeSalaryAmount || 0
        //             };

        //             if (item.payheadMasterId == payheadMasterIdsMapping.GROSS) {
        //                 gross = item;
        //             } else if (item.payheadMasterId == payheadMasterIdsMapping.NETSALARY) {
        //                 netPay = item;
        //             } else if (item.payheadMasterId == payheadMasterIdsMapping.CTC) {
        //                 ctc = item;
        //             } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EARNING) {
        //                 salaryFieldA.push(item);
        //             } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
        //                 salaryFieldB.push(item);
        //             } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
        //                 salaryFieldC.push(item);
        //             }
        //         });

        //         // Helper function to add and commit rows
        //         const addRow = (item) => {
        //             const row = worksheet.addRow({
        //                 ...baseRow,
        //                 'PayheadName': item.payheadName,
        //                 'SalaryFieldSrNo':specialPayhead.includes(+item.payheadMasterId) ? item.salaryFieldSrNo :'',
        //                 'Formula':specialPayhead.includes(+item.payheadMasterId) ? item.formula : '',
        //                 'Amount': item.amount
        //             });
        //             row.commit();
        //         };

        //         // Add salary field A rows
        //         salaryFieldA.forEach(addRow);

        //         // Add Gross row
        //         if (gross) addRow(gross);

        //         // Add salary field B rows
        //         salaryFieldB.forEach(addRow);

        //         // Add Net Pay row
        //         if (netPay) addRow(netPay);

        //         // Add salary field C rows
        //         salaryFieldC.forEach(addRow);

        //         // Add CTC row
        //         if (ctc) addRow(ctc);
        //     }

        //     // Move to next chunk
        //     offset += chunkSize;

        //     // If chunk is smaller than chunkSize, we've reached the end
        //     if(chunk.length < chunkSize) {
        //         hasMoreData = false;
        //     }
        //  }

        //  // Finalize worksheet and workbook
        //  await worksheet.commit();
        //  await workbook.commit();

        //  return;

        // }

    } catch (error) {
        next(error);
    }
}

exports.getById = async(req,res,next)=>{
  try {

    const {id} = req.params;

    if(!id) {
        return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:usermessage.requiredMessage('id'),
               
            });
    }


    const data = await EmpPayrollStatutoryDetails.findAll({
      where:{
        empPayrollStatutoryId:id
      },
      include:[
                    {
                    required:true,
                        model:GradeSalaryStructure,
                        attributes:['salaryFieldID','formula'],
                        as:'GSS',
                        include:[
                            {
                             model:GradeStructure,
                             attributes:['gradeName','baseOnCalculation']
                            },
                            {
                                required:true,
                                model:HRSalaryFields,
                                 as:'HSF',
                                where:{
                                 payheadMasterId:{
                                    [Sequelize.Op.notIn]:notIncludePyaheadIds
                                 }
                                },
                                attributes:['payheadMasterId','payheadDisplayName','salaryFieldSrNo'],
                               
                                include:[
                                    {
                                        required:true,
                                        model:Payheadmaster,
                                        as:'PHM',
                                        attributes:['payheadName']
                                    }
                                ]
                            }
                        ]
                    }
                ]
    });


                const salaryFieldA = [];
                const salaryFieldB = [];
                const salaryFieldC = [];
                let gross = 0;
                let netPay = 0;
                let ctc = 0;
                const gradeName = data?.[0]?.GSS?.gradeStructure?.gradeName || '';
                const baseOnCalculation = data?.[0]?.GSS?.gradeStructure?.baseOnCalculation || '';


    data.forEach(detail => {
                    const item = {
                        payheadMasterId: detail.GSS?.HSF?.payheadMasterId || '',
                        payheadName: detail.GSS?.HSF?.payheadDisplayName || detail.GSS?.HSF?.PHM?.payheadName || '',
                        salaryFieldSrNo: detail.GSS?.HSF?.salaryFieldSrNo || '',
                        formula: detail.GSS?.formula || '',
                        amount: detail.EmployeeSalaryAmount || 0
                    };

                    if (item.payheadMasterId == payheadMasterIdsMapping.GROSS) {
                        gross = item.amount;
                    } else if (item.payheadMasterId == payheadMasterIdsMapping.NETSALARY) {
                        netPay = item.amount;
                    } else if (item.payheadMasterId == payheadMasterIdsMapping.CTC) {
                        ctc = item.amount;
                    } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EARNING) {
                        salaryFieldA.push(item);
                    } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
                        salaryFieldB.push(item);
                    } else if (item.salaryFieldSrNo == salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
                        salaryFieldC.push(item);
                    }
                });

  return res.status(statusCodes.OK).json({
                status:statusCodes.OK,
                data:{
salaryFieldA,
salaryFieldB,
salaryFieldC,
gross,
netPay,
ctc,
gradeName,
baseOnCalculation
                }
            });
  } catch (error) {
    next(error);
  }
}

exports.deleteById = async(req,res,next)=>{
  const transaction = await sequelize.transaction();
  try {
    const {id}= req.params;

     if(!id) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:usermessage.requiredMessage('id'),
               
            });
    }

    const data = await EmpPayrollStatutory.findOne({
      where:{
        id
      },
      include:[{
        model:EmpPayrollStatutoryDetails,
        as:'EPSD',
      }],
      transaction
    });

    if(!data){
      await transaction.rollback();
       return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:usermessage.notFoundMessage('Employee Payroll Statutory'),
            });
    }

    const detailsId = (data.EPSD || []).map(e=>+e.id);

    const psSalaryTrans = await PayrollStatutorySalaryTrans.findOne({
      where:{
        psDetailsId:{
          [Sequelize.Op.in]:detailsId
        }
      }
    });

    if(psSalaryTrans){
        await transaction.rollback();
       return res.status(statusCodes.BAD_REQUEST).json({
                status:statusCodes.BAD_REQUEST,
                message:'Salary is already calculated for this payroll statutory.',
            });
    }

   await EmpPayrollStatutoryDetails.destroy({
  where: { empPayrollStatutoryId: data.id },
  individualHooks: true,
  user: req.userDetails,
  transaction
});

await data.destroy({ user: req.userDetails ,transaction});

      await transaction.commit();
     return res.status(statusCodes.OK).json({
                status:statusCodes.OK,
                message:usermessage.deleteMessage('Employee Payroll Statutory'),
            });
    
  } catch (error) {
      await transaction.rollback();
    next(error);
  }
}


function fixBaseHeaders() {
  const expectedBaseHeaders = [
        'Employee Code',
        'Employee Name',
        'Number',
        'Branch',
        'Department',
        'Designation',
        'Joining Date',
        'Skill Category',
        'Salary Grade',
        'Applicable YYYYMM',
      ];

  return expectedBaseHeaders;
}

exports.payrollStatutoryDemoExcel = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentID,
      designationID,
      workingAreaId,
      divisionId,
      employeementType,
      contractorId,
      userMasterID,
      payrollFrequency,
    } = req.body;
    let { branchMasterID } = req.body;

    if (!companyMasterID || !payrollFrequency) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage(
          'company and payrollFrequency',
        ),
      });
    }

    if (employeementType == employeementTypeEnum.ON_CONTRACT && !contractorId) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: `Contractor is required for 'On Contract' employees.`,
      });
    }

    const currentDate = moment().format('YYYY-MM-DD')
    const currentMonth = currentDate.substring(0, 7).replace('-', '');

    const empEmployeementCondition =
      employeementType === employeementTypeEnum.ON_PAYROLL
        ? { contractorId: { [Sequelize.Op.is]: null } }
        : employeementType === employeementTypeEnum.ON_CONTRACT
          ? { contractorId: { [Sequelize.Op.ne]: null } }
          : {};

    const contractorCondition =
      contractorId && (!Array.isArray(contractorId) || contractorId.length)
        ? { contractorId }
        : {};

    const empJoiningCondition = {
      ...empEmployeementCondition,
      ...contractorCondition,
      payrollFrequency,
    };

    const dateRangeCondition = (
      dateField = 'applicableDate',
      endField = 'endDate',
    ) => ({
      status: 1,
      [dateField]: { [Sequelize.Op.lte]: currentDate },
      [Sequelize.Op.or]: [
        { [endField]: { [Sequelize.Op.gte]: currentDate } },
        { [endField]: { [Sequelize.Op.eq]: null } },
      ],
    });

    const monthRangeCondition = {
      status: 1,
      applicableYYYYMM: { [Sequelize.Op.lte]: currentMonth },
      [Sequelize.Op.or]: [
        { endYYYYMM: { [Sequelize.Op.gte]: currentMonth } },
        { endYYYYMM: { [Sequelize.Op.eq]: null } },
      ],
    };

    const includedModels = [
      {
        model: EmployeeJoiningDetails,
        where: empJoiningCondition,
        attributes: ['employeeCode', 'joiningDate'],
      },
      {
        model: EmployeeDesignation,
        where: {
          ...dateRangeCondition(),
          ...(designationID?.length && { designationID }),
        },
        required: !!designationID?.length,
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
          ...dateRangeCondition(),
          ...(departmentID?.length && { departmentID }),
        },
        required: !!departmentID?.length,
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
          ...dateRangeCondition(),
          ...(branchMasterID?.length && { branchID: branchMasterID }),
        },
        required: !!branchMasterID?.length,
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
        model: EmployeeSkillCategory,
        as: 'emp_skill',
        required: false,
        where: monthRangeCondition,
        attributes: ['skillCategory'],
      },
      // salary master
      {
        required:true,
        model:HRSalaryMasterFields,
        attributes:['salaryFromYYYYMM','gradeSalaryStructureID'],
        include:[{
          required:true,
          model:GradeSalaryStructure,
          as:'GSS',
          attributes:['gradeStructureID'],
          include:[{required:true,model:GradeStructure,
            where:{
              baseOnCalculation:{
            [Sequelize.Op.ne]:SalaryStructureTypeEnum.HOURLY
          }
        },
        attributes:['gradeName']},{required:true,model:HRSalaryFields,as:'HSF',where:{payheadMasterId:payheadMasterIdsMapping.GROSS,},attributes:[]}]
        }]
      }
    ];

    if (divisionId && (!userMasterID || !userMasterID?.length)) {
      includedModels.push({
        model: EmployeeDivision,
        where: { ...dateRangeCondition('startDate'), divisionId },
        required: true,
        attributes: ['divisionId'],
        include: [{ model: Division, attributes: ['divisionName'] }],
      });
    }

    if (workingAreaId && (!userMasterID || !userMasterID?.length)) {
      includedModels.push({
        model: EmployeeWorkingArea,
        where: { ...dateRangeCondition('startDate'), workingAreaId },
        required: true,
        attributes: ['workingAreaId'],
        include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
      });
    }

    const condition = { companyMasterId: companyMasterID, status: 1};
    if (Array.isArray(userMasterID) && userMasterID.length) {
      condition.userMasterID = { [Sequelize.Op.in]: userMasterID };
    }

    const gradeCondition = { companyMasterID, status: 1, payrollFrequency };

    if (contractorId) gradeCondition.contractorId = contractorId;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const [userData,salaryFields] = await Promise.all([
      UserMaster.findAll({
        where: { ...userAccessCondition.where, ...condition },
        include: [...userAccessCondition.includeModels, ...includedModels],
        order: [['displayName', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'userNumber'],
      }),
      HRSalaryFields.findAll({
        where: {
          companyMasterID,
          status: 1,
          payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
        },
        order: [['salaryFieldID', 'ASC']],
        include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
        attributes: ['payheadMasterId', 'salaryFieldSrNo'],
        raw: true,
      }),
    ]);

    // Process salary fields
    const fieldA = salaryFields
      .filter((f) => f.salaryFieldSrNo === salaryFieldSrNoFields.EARNING)
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);
    const fieldB = salaryFields
      .filter((f) => f.salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION)
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);
    const fieldC = salaryFields
      .filter((f) => f.salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYER_DEDUCTION)
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);

    const salaryHeaders = [
      ...fieldA,
      'Gross',
      ...fieldB,
      'Net Salary',
      ...fieldC,
      'CTC',
    ];

    const baseHeaders = fixBaseHeaders();

    const requiredFieldNames =
       new Set([
          'Salary Grade',
          'Applicable YYYYMM',
          'Gross',
          'Net Salary',
          'CTC',
        ]);
     

    const allHeaders = [...baseHeaders, ...salaryHeaders];
    const READONLY_COLUMNS = 8;

    // Process dropdown data - SANITIZE to remove commas and special chars
    const sanitize = (str) =>
      str ? str.toString().replace(/,/g, ' ').replace(/"/g, '').trim() : '';

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tankhwapatra';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Payroll Statutory');

    // Add header row
    const headerRow = worksheet.addRow(allHeaders);
    headerRow.height = 22;

    // Color scheme
    const COLORS = {
      REQUIRED: 'FFFF0000', // Red - Required fields
      BASIC: 'FF4472C4', // Blue - Basic employee info (first 8 columns)
      SALARY: 'FF7030A0', // Purple - Salary fields
    };

    const baseHeadersCount = baseHeaders.length; // 12

    headerRow.eachCell((cell, colNumber) => {
      const headerName = allHeaders[colNumber - 1];
      const isRequired = requiredFieldNames.has(headerName);

      let bgColor;

      if (isRequired) {
        // Required fields - Red
        bgColor = COLORS.REQUIRED;
      } else if (colNumber <= READONLY_COLUMNS) {
        // First 8 columns (readonly basic info) - Blue
        bgColor = COLORS.BASIC;
      } else if (colNumber <= baseHeadersCount) {
        // Editable basic fields (YYYYMM, Grade, State, Corp) - Blue
        bgColor = COLORS.BASIC;
      } else {
        // Salary fields - Purple
        bgColor = COLORS.SALARY;
      }

      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Column for grade
    const gradeColIndex = 9;
    const perEmployeeGradeNames = [];

    // Add data rows
    userData.forEach((user) => {
      const joining = user.employeeJoiningDetails?.[0];
      const gradeNames = (user.hrSalaryMasters || []).sort((a,b)=> b.salaryFromYYYYMM - a.salaryFromYYYYMM).map(e=>`${sanitize(e.GSS.gradeStructure.gradeName)}(${e.salaryFromYYYYMM})`);

      perEmployeeGradeNames.push(gradeNames);

      const rowData = [
            joining?.employeeCode || '',
            user.displayName || '',
            user.userNumber || '',
            user.employeeBranches?.[0]?.branchMaster?.branchName || '',
            user.employeeDepartments?.[0]?.department?.departmentName || '',
            user.employeeDesignations?.[0]?.designation?.designationName || '',
            joining?.joiningDate
              ? moment(joining.joiningDate).format('DD-MM-YYYY')
              : '',
            user.emp_skill?.[0]?.skillCategory || '',
            '', // Salary Grade
            '',// Applicable YYYYMM
            ...salaryHeaders.map(() => ''),
          ];

      const dataRow = worksheet.addRow(rowData);

      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        // Data cells inherit unlocked from column default - no need to set explicitly
      });
    });

    // AUTO-FIT COLUMN WIDTHS
    worksheet.columns.forEach((column, index) => {
      let maxWidth = allHeaders[index]?.length || 10;

      worksheet.eachRow((row) => {
        const cell = row.getCell(index + 1);
        const cellValue = cell.value ? cell.value.toString() : '';
        maxWidth =
          cellValue == 'Salary Grade'
            ? 25
              : Math.max(maxWidth, cellValue.length);
      });

      column.width = Math.min(Math.max(maxWidth + 2, 8), 45);
    });

    const dataRowCount = userData.length;

    // Add dropdowns only if there's data and dropdown values exist
    if (dataRowCount > 0) {
      // Create hidden sheet for dropdown values (more reliable than inline lists)
      const hiddenSheet = workbook.addWorksheet('Data');
      hiddenSheet.state = 'hidden';

      // Write each employee's grade list into its own column (col 1 = row1's employee, col 2 = row2's, ...)
  perEmployeeGradeNames.forEach((gradeNames, empIndex) => {
    const col = empIndex + 1; // 1-based column per employee
    gradeNames.forEach((grade, gIndex) => {
      hiddenSheet.getCell(gIndex + 1, col).value = grade;
    });
  });

  // Apply data validation per row, pointing at that employee's own column
  perEmployeeGradeNames.forEach((gradeNames, empIndex) => {
    if (gradeNames.length === 0) return; // skip employees with no grades

    const excelRow = empIndex + 2; // +2 because row 1 is header
    const colLetter = hiddenSheet.getColumn(empIndex + 1).letter;
    const gradeRange = `Data!$${colLetter}$1:$${colLetter}$${gradeNames.length}`;

    worksheet.getCell(excelRow, gradeColIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [gradeRange],
      showErrorMessage: true,
      errorTitle: 'Invalid',
      error: 'Select from list',
    };
  });


    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

    // Generate and send file
    const fileName = `Statutory_Template_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    await workbook.xlsx.writeFile(filePath);

    return res.download(filePath, fileName, (err) => {
      // Delete file after download
      fs.unlink(filePath, () => {});
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error in uploadSalaryStructureDemoExcel:', error);
    next(error);
  }
};

// Helper function to determine AmountIn based on formula
const getAmountInFromFormula = (grade_salary_structure) => {
  let hasGrossInFormula = false;
  let hasCTCInFormula = false;

  for (const item of grade_salary_structure) {
    const formula = (item.formula || '').toUpperCase();
    const formula1 = (item.formula1 || '').toUpperCase();

    if (formula.includes('GROSS') || formula1.includes('GROSS')) {
      hasGrossInFormula = true;
    }
    if (formula.includes('CTC') || formula1.includes('CTC')) {
      hasCTCInFormula = true;
    }
  }

  if (hasCTCInFormula && !hasGrossInFormula) {
    return { AmountIn: '0', basedOn: 'CTC' };
  }
  return { AmountIn: '1', basedOn: 'GROSS' };
};

// ============= LOCAL CALCULATION FUNCTIONS (NO DB QUERIES INSIDE) =============
// Formula calculation functions (precedence, isNumeric, resolveValue, formulaCalculation, infixtopostfix)
// are imported from commonUtilFunctions.js

// Local grade structure calculation (no DB queries)
function gradeStructureCalculationLocal(
  gradeStructureData = [],
  ctc,
  AmountIn,
  yearMonth,
  calculatedGross = 0,
  calculationOf,
  stateid,
  corporationId,
  gender,
  payheadMasterId,
  payheadAmount,
  ptSlabData = [],
  lwfData = null,
) {
  let aTotal = 0,
    extra_aTotal = 0,
    bTotal = 0,
    cTotal = 0;

  for (let n = 0; n < gradeStructureData.length; n++) {
    let value = 0;

    // if CTC
    if (
      AmountIn == '0' &&
      gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.CTC
    ) {
      gradeStructureData[n].finalvalue = Number(ctc);
      continue;
    }

    // Gross
    if (
      AmountIn == '1' &&
      gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.GROSS
    ) {
      gradeStructureData[n].finalvalue = +calculatedGross || Number(ctc);
      continue;
    }

    // set if payheadmasterid and amount is available
    if (
      payheadMasterId &&
      payheadMasterId == gradeStructureData[n].payheadMasterId
    ) {
      gradeStructureData[n].fieldFixAmount = Number(payheadAmount);
    }

    // continue if other calculation
    if (
      calculationOf == 'other' &&
      gradeStructureData[n].salaryFieldSrNo == 'A' &&
      gradeStructureData[n].considerIn != 'net'
    ) {
      continue;
    }

    // PT calculation
    if (gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.PTAX) {
      const month = String(yearMonth).slice(4, 6);
      const GrossAmountForPT = +calculatedGross || 0;
      let getPTData = [];

      if (ptSlabData.length) {
        const filtered = ptSlabData.filter(
          (e) =>
            e.corporationId == corporationId &&
            e.applicableFromYYYYMM <= yearMonth,
        );
        const maxApplicable = Math.max(
          ...filtered.map((e) => e.applicableFromYYYYMM),
        );
        getPTData = filtered.filter(
          (e) => +e.applicableFromYYYYMM == +maxApplicable,
        );
      }

      const PTCalculation = getPTData[0]?.ptCalculation || null;

      if (PTCalculation == PTCalculationEnum.HALFYEARLY) {
        const gross = GrossAmountForPT * 6;
        const ptData = getPTData.filter(
          (e) => +e.fromAmount <= +gross && +e.toAmount >= +gross,
        );
        let PTAmount = 0;
        if (ptData.length) {
          if (gender == 'female') {
            PTAmount = Math.max(ptData[0].femaleTax, ptData[1]?.femaleTax || 0);
          } else {
            PTAmount = Math.max(ptData[0].maleTax, ptData[1]?.maleTax || 0);
          }
        }
        value = Math.round(+PTAmount / 6);
      } else {
        const ptData = getPTData.find(
          (e) =>
            +e.fromAmount <= +GrossAmountForPT &&
            +e.toAmount >= +GrossAmountForPT &&
            e.month == month,
        );
        if (ptData) {
          value = gender == 'female' ? ptData.femaleTax : ptData.maleTax;
        }
      }
    } else if (
      gradeStructureData[n].payheadMasterId ==
        payheadMasterIdsMapping.EMPLOYEE_LWF ||
      gradeStructureData[n].payheadMasterId ==
        payheadMasterIdsMapping.EMPLOYER_LWF
    ) {
      value = 0;

      if (lwfData) {
        if (
          lwfData.deductionMethod == lwfDeductionMethodEnum.GROSS_PERCENTAGE
        ) {
          const percentage =
            +gradeStructureData[n].payheadMasterId ===
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData.employeePer
              : lwfData.employerPer;

          const capping =
            +gradeStructureData[n].payheadMasterId ===
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData.employeeCapping
              : lwfData.employerCapping;

          const gross = +calculatedGross || Number(ctc);

          value = (+percentage * +gross) / 100;

          if (capping != null) {
            value = Math.min(value, capping);
          }
        } else {
          value =
            +gradeStructureData[n].payheadMasterId ==
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData?.employeeAmt || 0
              : lwfData?.employerAmt || 0;
        }
      }
    }
    // Set extra fields to zero
    else if (
      notIncludePyaheadIds.includes(gradeStructureData[n].payheadMasterId)
    ) {
      value = 0;
    } else {
      let tempValue = 0,
        tempValue1 = 0;

      if (gradeStructureData[n].formula) {
        tempValue = Number(
          infixtopostfix(gradeStructureData[n].formula, gradeStructureData),
        );
      } else {
        tempValue = +gradeStructureData[n].fieldFixAmount || 0;
      }

      if (
        gradeStructureData[n].formula1 ||
        gradeStructureData[n].fieldFixAmount1
      ) {
        if (gradeStructureData[n].formula1) {
          tempValue1 = Number(
            infixtopostfix(gradeStructureData[n].formula1, gradeStructureData),
          );
        } else {
          tempValue1 = Number(gradeStructureData[n].fieldFixAmount1) || 0;
        }
      }

      value =
        gradeStructureData[n].formulaPreference == FormulaPreferenceEnum.HIGHER
          ? Math.max(tempValue, tempValue1)
          : gradeStructureData[n].formulaPreference ==
              FormulaPreferenceEnum.LOWER
            ? Math.min(tempValue, tempValue1)
            : tempValue;

      if (
        gradeStructureData[n].EmployeeSalaryAmount >= 0 &&
        +gradeStructureData[n].fieldFixAmount >= 0 &&
        !gradeStructureData[n].fieldFixAmount1 &&
        !gradeStructureData[n].formula1 &&
        !gradeStructureData[n].formula
      ) {
        value = gradeStructureData[n].EmployeeSalaryAmount;
      }
    }

    let salaryfieldroundno = 0;

    if (gradeStructureData[n].assignSalaryRound == 'Y') {
      gradeStructureData[n].actualvalue = Number(value.toFixed(3));
      gradeStructureData[n].finalvalue =
        gradeStructureData[n].assignSalaryRoundOffType == 0
          ? Math.ceil(value.toFixed(2))
          : Math.round(value);
    } else {
      salaryfieldroundno = !gradeStructureData[n].assignSalaryRoundNo
        ? 0
        : +gradeStructureData[n].assignSalaryRoundNo;
      gradeStructureData[n].actualvalue = Number(value.toFixed(3));
      gradeStructureData[n].finalvalue = Number(
        value.toFixed(salaryfieldroundno),
      );
    }

    if (gradeStructureData[n].salaryfieldmaxrange) {
      if (Number(value) > Number(gradeStructureData[n].salaryfieldmaxrange)) {
        gradeStructureData[n].finalvalue =
          gradeStructureData[n].salaryfieldmaxrange;
      }
    }

    if (gradeStructureData[n].payheadMasterId == 59 && !showEmployerLWF)
      continue;

    if (
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(gradeStructureData[n].payheadMasterId)
    ) {
      if (
        gradeStructureData[n].salaryFieldSrNo == 'A' &&
        gradeStructureData[n].considerIn != 'net'
      ) {
        aTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (
        gradeStructureData[n].salaryFieldSrNo == 'A' &&
        gradeStructureData[n].considerIn == 'net'
      ) {
        extra_aTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (gradeStructureData[n].salaryFieldSrNo == 'B') {
        bTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (gradeStructureData[n].salaryFieldSrNo == 'C') {
        cTotal += +(gradeStructureData[n].finalvalue || 0);
      }
    }
  }

  return { gradeStructureData, aTotal, extra_aTotal, bTotal, cTotal };
}

// Local assign salary structure (no DB queries - all data passed as params)
function assignSalaryStructureLocal(
  grade_salary_structure_data_temp = [],
  ctc,
  stateid,
  AmountIn,
  yearMonth,
  gender,
  corporationId,
  skillCategory,
  payheadMasterId = null,
  payheadAmount = 0,
  hasMinimumWages = false,
  ptSlabData = [],
  minWagesMasterData = null,
  payhead_B_C = [],
  lwfData = null,
) {
  let aTotal = 0,
    bTotal = 0,
    cTotal = 0,
    extra_aTotal = 0;
  let minWagesMasterId = null;

  const NET_CTC_GROSS = [...grade_salary_structure_data_temp].filter((e) =>
    [
      payheadMasterIdsMapping.GROSS,
      payheadMasterIdsMapping.CTC,
      payheadMasterIdsMapping.NETSALARY,
    ].includes(e.payheadMasterId),
  );
  const EPF_Data = [...grade_salary_structure_data_temp].find(
    (e) => e.payheadMasterId == 5,
  );
  const grade_salary_structure_data = [
    ...grade_salary_structure_data_temp,
  ].filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
        payheadMasterIdsMapping.EPF,
      ].includes(e.payheadMasterId),
  );

  const minWages = [];

  if (hasMinimumWages && minWagesMasterData) {
    const amount =
      skillCategory == SkillCategoryType.SKILLED
        ? minWagesMasterData?.skilled
        : skillCategory == SkillCategoryType.SEMISKILLED
          ? minWagesMasterData?.semiSkilled
          : skillCategory == SkillCategoryType.UNSKILLED
            ? minWagesMasterData?.unSkilled
            : 0;
    minWagesMasterId = minWagesMasterData?.id || null;

    minWages.push({
      payheadName: 'Minimum Wages',
      fieldFixAmount: amount || 0,
    });
  }

  const A_Data = grade_salary_structure_data.filter(
    (e) => e.salaryFieldSrNo == 'A' && e.considerIn != 'net',
  );

  const usedPayheads = payhead_B_C.filter((payhead) => {
    const name = payhead.Payheadmaster?.payheadName || '';
    return A_Data.some((item) => {
      const formula = item.formula || '';
      const formula1 = item.formula1 || '';
      const regex = new RegExp(
        `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      );
      return regex.test(formula) || regex.test(formula1);
    });
  });

  const usedPayheadIds = usedPayheads.map((e) => +e.payheadMasterId);
  const usedPayheadData = grade_salary_structure_data.filter((e) =>
    usedPayheadIds.includes(+e.payheadMasterId),
  );
  const finalAData = [...A_Data, ...usedPayheadData].sort(
    (a, b) => a.salaryfieldindex - b.salaryfieldindex,
  );
  const with_A_Data = [...NET_CTC_GROSS, ...minWages, ...finalAData];

  const calculatedData = gradeStructureCalculationLocal(
    with_A_Data,
    ctc,
    AmountIn,
    yearMonth,
    0,
    'A',
    stateid,
    corporationId,
    gender,
    payheadMasterId,
    payheadAmount,
    ptSlabData,
    lwfData,
  );

  const calculatedGross = calculatedData.aTotal;
  const calculated_A = calculatedData.gradeStructureData.filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(e.payheadMasterId),
  );
  const WithOut_A_Data = grade_salary_structure_data.filter(
    (e) =>
      (e.salaryFieldSrNo != 'A' || e.considerIn == 'net') &&
      !usedPayheadIds.includes(+e.payheadMasterId),
  );

  const calculate_Without_A = gradeStructureCalculationLocal(
    [...NET_CTC_GROSS, ...calculated_A, ...minWages, ...WithOut_A_Data],
    ctc,
    AmountIn,
    yearMonth,
    calculatedGross,
    'other',
    stateid,
    corporationId,
    gender,
    payheadMasterId,
    payheadAmount,
    ptSlabData,
    lwfData,
  );

  const finalStructureData = calculate_Without_A.gradeStructureData.filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(e.payheadMasterId) && e.payheadName != 'Minimum Wages',
  );

  aTotal = +calculatedGross;
  extra_aTotal = +calculate_Without_A.extra_aTotal;
  bTotal += +calculate_Without_A.bTotal;
  cTotal += +calculate_Without_A.cTotal;

  if (EPF_Data) {
    const PF_Amount =
      finalStructureData.find(
        (e) => e.payheadMasterId == payheadMasterIdsMapping.PF,
      )?.finalvalue || 0;
    const EPS_Amount =
      finalStructureData.find(
        (e) => e.payheadMasterId == payheadMasterIdsMapping.EPS,
      )?.finalvalue || 0;
    const finalvalue1 =
      +PF_Amount - +EPS_Amount > 0 ? +PF_Amount - +EPS_Amount : 0;
    const finalvalue = getRoundOffSalary(
      finalvalue1,
      EPF_Data.assignSalaryRound,
      EPF_Data.assignSalaryRoundOffType,
      EPF_Data.assignSalaryRoundNo,
    );
    const actualvalue = +finalvalue1.toFixed(3);

    cTotal += +finalvalue;

    const EPF_Data_temp = { ...EPF_Data, finalvalue, actualvalue };
    finalStructureData.splice(+EPF_Data.salaryfieldindex, 0, EPF_Data_temp);
  }

  [...NET_CTC_GROSS].forEach((e) => {
    if (e.payheadMasterId == payheadMasterIdsMapping.CTC) {
      const amount = getRoundOffSalary(
        +aTotal + +cTotal + +extra_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
    if (e.payheadMasterId == payheadMasterIdsMapping.GROSS) {
      const amount = getRoundOffSalary(
        +aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
    if (e.payheadMasterId == payheadMasterIdsMapping.NETSALARY) {
      const amount = getRoundOffSalary(
        +aTotal - +bTotal + +extra_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
  });

  return {
    salaryStructureData: [...finalStructureData, ...NET_CTC_GROSS],
    minWagesMasterId,
  };
}

// Map Excel values to grade structure for EmployeeSalaryAmount field
// This allows using Excel entered amount when fieldFixAmount exists but no formula/fieldFixAmount1
function mapExcelValuesToGradeStructure(
  gradeStructure,
  salaryHeaders,
  row,
  BASE_HEADERS_COUNT,
  payheadNameToId,
) {
  salaryHeaders.forEach((headerName, idx) => {
    const excelValue =
      parseFloat(row.getCell(BASE_HEADERS_COUNT + idx + 1).value) || 0;
    const payheadId = payheadNameToId.get(headerName?.toLowerCase()?.trim());

    if (payheadId) {
      const matchingItem = gradeStructure.find(
        (g) => g.payheadMasterId === payheadId,
      );
      if (matchingItem) {
        matchingItem.EmployeeSalaryAmount = excelValue;
      }
    }
  });
}

// ============= COMMON HELPER FUNCTIONS FOR SALARY VALIDATION =============

// Fetch last calculated salary for users (for salary already calculated check)
async function fetchLastCalculatedSalary(userMasterIDs, payrollFrequency) {
  if (!userMasterIDs || userMasterIDs.length === 0) return [];

  // Get the last calculated salary transaction for each user
  return PayrollStatutorySalaryTrans.findAll({
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterIDs },
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    },
    attributes: [
      'userMasterID',
      [Sequelize.fn('MAX', Sequelize.col('salaryYYYYMM')), 'lastSalaryYYYYMM'],
      [Sequelize.fn('MAX', Sequelize.col('startDate')), 'lastStartDate'],
      [Sequelize.fn('MAX', Sequelize.col('endDate')), 'lastEndDate'],
    ],
    group: ['userMasterID'],
    raw: true,
  });
}

// Create lookup map for last calculated salary
// Returns Map: userMasterID -> { lastSalaryYYYYMM, lastStartDate, lastEndDate }
function createLastCalculatedSalaryMap(lastCalculatedSalaries) {
  const map = new Map();
  lastCalculatedSalaries.forEach((item) => {
    map.set(item.userMasterID, {
      lastSalaryYYYYMM: item.lastSalaryYYYYMM,
      lastStartDate: item.lastStartDate,
      lastEndDate: item.lastEndDate,
    });
  });
  return map;
}

// Check if salary is already calculated for the given period
// Returns true if salary is already calculated (should show error)
function isSalaryAlreadyCalculated(
  lastCalcData,
  applicableYYYYMM,
  startDate,
  isFortnightly,
) {
  if (!lastCalcData) return false;

  if (isFortnightly) {
    // For fortnightly: check if lastStartDate >= startDate
    if (lastCalcData.lastStartDate && startDate) {
      return new Date(lastCalcData.lastStartDate) >= new Date(startDate);
    }
  } else {
    // For monthly: check if lastSalaryYYYYMM >= applicableYYYYMM
    if (lastCalcData.lastSalaryYYYYMM && applicableYYYYMM) {
      return +lastCalcData.lastSalaryYYYYMM >= +applicableYYYYMM;
    }
  }
  return false;
}

// Fetch existing salary structures for users (for duplicate check)
async function fetchExistingSalaryStructures(userMasterIDs, payrollFrequency) {
  if (!userMasterIDs || userMasterIDs.length === 0) return [];

  return EmpPayrollStatutory.findAll({
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterIDs },
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    },
    attributes: [
      'userMasterID',
      'salaryFromYYYYMM',
      'startDate',
      'endDate',
      'payrollFrequency',
    ],
    group: [
      'userMasterID',
      'salaryFromYYYYMM',
      'startDate',
      'endDate',
      'payrollFrequency',
    ],
    raw: true,
  });
}

// Create lookup map for existing salary structures
// Key format: For Monthly -> "userMasterID_YYYYMM", For Fortnightly -> "userMasterID_startDate_endDate"
function createExistingSalaryStructureMap(
  existingSalaryStructures,
  isFortnightly,
) {
  const map = new Map();
  existingSalaryStructures.forEach((item) => {
    let key;
    if (isFortnightly) {
      key = `${item.userMasterID}_${item.startDate}_${item.endDate}`;
    } else {
      key = `${item.userMasterID}_${item.salaryFromYYYYMM}`;
    }
    map.set(key, true);
  });
  return map;
}

// Fetch all master data for salary validation
async function fetchSalaryValidationMasterData(
  req,
  companyMasterID,
  mobileNumbers = [],
) {
  const userAccessCondition = accessibleRoleWiseUsers({
    userDetails: req.userDetails,
    includeCompany: !companyMasterID,
  });

  const userIncludeModels = [
    {
              model: EmployeeJoiningDetails,
              attributes: ['salaryCalculationAct'],
    },
     // salary master
      {
        required:true,
        model:HRSalaryMasterFields,
        attributes:['salaryFromYYYYMM','gradeSalaryStructureID','startDate','endDate','payrollFrequency','minWagesMasterId','corporationId','skillCategory','stateid'],
        include:[
          {
          required:true,
          model:GradeSalaryStructure,
          as:'GSS',
          attributes:['gradeStructureID'],
          include:[{required:true,model:GradeStructure,attributes:['gradeName']},{required:true,model:HRSalaryFields,as:'HSF',where:{payheadMasterId:payheadMasterIdsMapping.GROSS,},attributes:[]}]
        },
        {
          model:StateMaster,
          attributes:['stateName']
        },
        {
          model:Corporation,
          attributes:['corporationName']
        }
      ]
      }
  ]


  const [
    salaryFields,
    allUsers,
    allMinWages,
    allPTSlabs,
    allGradeSalaryStructures,
    allLWFData,
  ] = await Promise.all([
    HRSalaryFields.findAll({
      where: {
        companyMasterID,
        status: 1,
        payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
      },
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
      attributes: ['payheadMasterId', 'salaryFieldSrNo', 'salaryFieldID'],
    }),
    mobileNumbers.length > 0
      ? UserMaster.findAll({
          where: {
            companyMasterId: companyMasterID,
            userNumber: { [Sequelize.Op.in]: mobileNumbers },
            status: 1,
            ...userAccessCondition.where,
          },
          attributes: ['userMasterID', 'userNumber', 'gender', 'displayName'],
          include: [
            ...userAccessCondition.includeModels,
            ...userIncludeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['salaryCalculationAct'],
            },
          ],
        })
      : [],
    MinWagesMaster.findAll({
      where: { companyMasterId: companyMasterID },
      order: [['applicableYYYYMM', 'DESC']],
      raw: true,
    }),
    ProfessionalTaxSlabMaster.findAll({
      where: { status: 1 },
      raw: true,
    }),
    GradeSalaryStructure.findAll({
      raw: true,
      include: [
        {
          model: HRSalaryFields,
          attributes: [],
          include: [{ model: Payheadmaster, attributes: [] }],
        },
        {
          model: GradeStructure,
          attributes: [],
          where: { companyMasterID, status: 1 },
        },
      ],
      order: [
        [
          { model: HRSalaryFields, as: 'hrSalaryField' },
          'salaryFieldSrNo',
          'ASC',
        ],
        ['salaryfieldindex', 'ASC'],
      ],
      attributes: [
        'gradeSalaryStructureID',
        'gradeStructureID',
        'salaryFieldID',
        'fieldFixAmount',
        'formula',
        'salaryfieldindex',
        'salaryfieldmaxrange',
        'fieldFixAmount1',
        'formula1',
        'formulaPreference',
        [sequelize.col('hrSalaryField.payheadMasterId'), 'payheadMasterId'],
        [sequelize.col('hrSalaryField.salaryFieldSide'), 'salaryFieldSide'],
        [
          sequelize.col('hrSalaryField.salaryFieldAttanChk'),
          'salaryFieldAttanChk',
        ],
        [
          sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
          'salaryFieldWhenMonth',
        ],
        [sequelize.col('hrSalaryField.salaryFieldSrNo'), 'salaryFieldSrNo'],
        [sequelize.col('hrSalaryField.companyMasterID'), 'companyMasterID'],
        [
          sequelize.col('hrSalaryField.payheadDisplayName'),
          'payheadDisplayName',
        ],
        [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
        [
          sequelize.col('hrSalaryField.Payheadmaster.payheadName'),
          'payheadName',
        ],
        [
          sequelize.col('gradeStructure.baseOnCalculation'),
          'baseOnCalculation',
        ],
        [sequelize.col('hrSalaryField.assignSalaryRound'), 'assignSalaryRound'],
        [
          sequelize.col('hrSalaryField.assignSalaryRoundNo'),
          'assignSalaryRoundNo',
        ],
        [
          sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
          'assignSalaryRoundOffType',
        ],
      ],
    }),
    LwfMaster.findAll(),
  ]);

  // Filter B and C salary fields from already fetched salaryFields
  const payhead_B_C = salaryFields.filter((f) =>
    ['B', 'C'].includes(f.salaryFieldSrNo),
  );

  // Convert salaryFields to raw format for payheadNameToId map
  const salaryFieldsRaw = salaryFields.map((f) => ({
    payheadMasterId: f.payheadMasterId,
    salaryFieldSrNo: f.salaryFieldSrNo,
    salaryFieldID: f.salaryFieldID,
    'Payheadmaster.payheadName': f.Payheadmaster?.payheadName,
  }));

  return {
    salaryFields: salaryFieldsRaw,
    payhead_B_C,
    allUsers,
    allMinWages,
    allPTSlabs,
    allGradeSalaryStructures,
    allLWFData,
  };
}

// Create lookup maps from master data
function createLookupMaps(masterData) {
  const {
    salaryFields,
    allUsers,
    allGradeSalaryStructures,
  } = masterData;

  const userMap = new Map(
    allUsers.map((u) => [u.userNumber?.toString()?.trim(), u]),
  );

  const gradeSalaryStructureMap = new Map();
  allGradeSalaryStructures.forEach((item) => {
    const gradeId = item.gradeStructureID;
    if (!gradeSalaryStructureMap.has(gradeId)) {
      gradeSalaryStructureMap.set(gradeId, []);
    }
    gradeSalaryStructureMap.get(gradeId).push(item);
  });

  const payheadNameToId = new Map();
  salaryFields.forEach((f) => {
    const name = (
      f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName
    )
      ?.toLowerCase()
      ?.trim();
    if (name) payheadNameToId.set(name, f.payheadMasterId);
  });
  payheadNameToId.set('gross', payheadMasterIdsMapping.GROSS);
  payheadNameToId.set('net salary', payheadMasterIdsMapping.NETSALARY);
  payheadNameToId.set('ctc', payheadMasterIdsMapping.CTC);

  return {
    userMap,
    gradeSalaryStructureMap,
    payheadNameToId,
  };
}

// Set cell remarks with color (only if remarks exist)
function setCellRemarks(cell, remarks, hasError) {
  if (!hasError || !remarks || remarks.length === 0) {
    cell.value = '';
    return;
  }
  cell.value = Array.isArray(remarks) ? remarks.join('; ') : remarks;
  cell.font = { color: { argb: 'FFFF0000' } };
}

// ============= END COMMON HELPER FUNCTIONS =============

// Merged API: Validate on submit OR get paginated data from existing file
exports.validatePayrollStatutory = async (req, res, next) => {
  const { from, filename, page = 1, limit = 20 } = req.body;

  // If not submit, just return paginated data from existing file
  if (from !== 'submit') {
    try {
      if (!filename) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Filename is required',
        });
      }

      const existingFilepath = path.join(
        __dirname,
        `../uploads/employee-payroll-statutory/${filename}`,
      );
      if (!fs.existsSync(existingFilepath)) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: 'File not found',
        });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(existingFilepath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet || worksheet.rowCount < 2) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.OK,
          filename,
          data: [],
          totalCount: 0,
          totalPages: 0,
          summary: { invalidRows: 0, remarksRowNumbers: [] },
        });
      }

      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });

      const allData = [];
      const remarksRowNumbers = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const employeeRowNo = rowIndex - 1; // Employee row starts from 1
        const rowData = { rowIndex: employeeRowNo };

        headers.forEach((header, idx) => {
          rowData[header] = row.getCell(idx + 1).value;
        });

        const remarks = rowData['Remarks'] || '';

        // Track rows with remarks
        if (remarks && remarks !== '') {
          remarksRowNumbers.push(employeeRowNo);
        }

        allData.push(rowData);
      }

      const totalCount = allData.length;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const paginatedData = allData.slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum,
      );

      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        filename,
        data: paginatedData,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        remarksRowNumbers,
      });
    } catch (error) {
      console.error('Error in validateSalaryStructure (pagination):', error);
      next(error);
    }
    return;
  }

  // from === 'submit' - Validate Excel
  if (!req.file) {
    return res.status(statusCodes.OK).send({
      status: statusCodes.BAD_REQUEST,
      message: 'Please upload an excel file!',
    });
  }

  const filepath = path.join(
    __dirname,
    `../uploads/employee-payroll-statutory/${req.file.filename}`,
  );
  const outputFilename = `validated_${Date.now()}_${req.userDetails.userMasterId}_${req.file.originalname || req.file.filename}`;
  const outputFilepath = path.join(
    __dirname,
    `../uploads/employee-payroll-statutory/${outputFilename}`,
  );

  try {
    const { companyMasterID, payrollFrequency } = req.body;

    if (!companyMasterID) {
      fs.unlinkSync(filepath);
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Company is required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;

    // Read Excel using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    fs.unlinkSync(filepath);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Excel file is empty or has no data rows',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    // Validate Excel file format - check fixed fields structure
    const expectedBaseHeaders = fixBaseHeaders();

    // Check if we have minimum required headers
    if (headers.length < expectedBaseHeaders.length) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid file format - insufficient columns',
      });
    }

    // Validate base headers (first 12/13 columns) match exactly
    for (let i = 0; i < expectedBaseHeaders.length; i++) {
      if (headers[i]?.trim() !== expectedBaseHeaders[i]) {
        return res.status(statusCodes.OK).send({
          status: statusCodes.BAD_REQUEST,
          message: `Invalid file format - Expected "${expectedBaseHeaders[i]}" at column ${i + 1}, found "${headers[i] || 'empty'}"`,
        });
      }
    }

    const BASE_HEADERS_COUNT = 10;

// const applicableYYYYMM_INDEX = headers.length + 1;
const grade_INDEX = headers.length + 1;
const startDate_INDEX = headers.length + 2;
const endDate_INDEX = headers.length + 3;
const state_INDEX = headers.length + 4;
const corporation_INDEX = headers.length + 5;
const skillCategory_INDEX = headers.length + 6;
const UUID_COL_INDEX = headers.length + 7;
const REMARKS_COL_INDEX = headers.length + 8;

const extraHeaders = [
  // { index: applicableYYYYMM_INDEX, title: 'ApplicableYYYYMM' },
  { index: grade_INDEX, title: 'Grade' },
  { index: startDate_INDEX, title: 'StartDate' },
  { index: endDate_INDEX, title: 'EndDate' },
  { index: state_INDEX, title: 'State' },
  { index: corporation_INDEX, title: 'Corporation' },
  { index: skillCategory_INDEX, title: 'SkillCategory' },
   { index: UUID_COL_INDEX, title: 'UUID' },
  { index: REMARKS_COL_INDEX, title: 'Remarks' },
];

extraHeaders.forEach(({ index, title }) => {
  const cell = headerRow.getCell(index);

  cell.value = title;
  cell.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
});

    const salaryHeaders = headers.slice(BASE_HEADERS_COUNT);

    // Collect mobile numbers for bulk lookup
    const mobileNumbers = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const mobile = row.getCell(3).value?.toString()?.trim();
        if (mobile) mobileNumbers.push(mobile);
      }
    });

    if (mobileNumbers.length == 0) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'No mobile numbers found in the uploaded Excel file.',
      });
    }

    // Check for duplicate mobile numbers in Excel
    const mobileCountMap = {};
    mobileNumbers.forEach((mobile) => {
      mobileCountMap[mobile] = (mobileCountMap[mobile] || 0) + 1;
    });
    const duplicateMobiles = Object.keys(mobileCountMap).filter(
      (mobile) => mobileCountMap[mobile] > 1,
    );

    if (duplicateMobiles.length > 0) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: `Duplicate mobile numbers found: ${duplicateMobiles.join(', ')}`,
      });
    }

    // Fetch all master data using common function
    const masterData = await fetchSalaryValidationMasterData(
      req,
      companyMasterID,
      mobileNumbers,
    );
    const lookupMaps = createLookupMaps(masterData);
    const {
      userMap,
      gradeSalaryStructureMap,
      payheadNameToId,
    } = lookupMaps;
    const { allMinWages, allPTSlabs, payhead_B_C, allLWFData } = masterData;

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Fetch existing salary structures for duplicate check (optimized - single query)
    const userMasterIDs = Array.from(userMap.values()).map(
      (u) => u.userMasterID,
    );
    const [existingSalaryStructures, lastCalculatedSalaries] =
      await Promise.all([
        fetchExistingSalaryStructures(userMasterIDs, payrollFrequency),
        fetchLastCalculatedSalary(userMasterIDs, payrollFrequency),
      ]);
    const existingSalaryMap = createExistingSalaryStructureMap(
      existingSalaryStructures,
      isFortnightly,
    );
    const lastCalculatedSalaryMap = createLastCalculatedSalaryMap(
      lastCalculatedSalaries,
    );

    const remarksRowNumbers = [];

    // Process each row
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const remarks = [];
      const employeeRowNo = rowIndex - 1; // Employee row starts from 1

      // Generate UUID for this row
      const rowUUID = crypto.randomUUID();
      row.getCell(UUID_COL_INDEX).value = rowUUID;

      const mobileNumber = row.getCell(3).value?.toString()?.trim();

  // Check user exists
      const user = userMap.get(mobileNumber);
      if (!user) {
        remarks.push('User not found');
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      const excelGrade = row.getCell(9).value;

      if(!excelGrade){
         remarks.push('Salary Grade is required');
          row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
         continue;
      }

       const applicableYYYYMM = row.getCell(10).value;

if(!applicableYYYYMM){
  remarks.push('ApplicableYYYYMM is required');
  row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
  remarksRowNumbers.push(employeeRowNo);
  continue;
}

const yyyymmStr = String(applicableYYYYMM).trim();

let isValidYYYYMM = true;

// Must be exactly 6 characters, all digits
if (yyyymmStr.length !== 6) {
  isValidYYYYMM = false;
} else {
  for (let i = 0; i < yyyymmStr.length; i++) {
    if (yyyymmStr[i] < '0' || yyyymmStr[i] > '9') {
      isValidYYYYMM = false;
      break;
    }
  }
}

// If digits check passed, validate month range
if (isValidYYYYMM) {
  const monthPart = yyyymmStr.substring(4, 6);
  const monthNum = Number(monthPart);
  if (monthNum < 1 || monthNum > 12) {
    isValidYYYYMM = false;
  }
}

if(!isValidYYYYMM){
  remarks.push('ApplicableYYYYMM must be in valid YYYYMM format (e.g., 202501)');
  row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
  remarksRowNumbers.push(employeeRowNo);
  continue;
}

      const gradeName = excelGrade.substring(0, excelGrade.lastIndexOf("(")).trim();
const Grade_applicableYYYYMM = Number(excelGrade.substring(
  excelGrade.lastIndexOf("(") + 1,
  excelGrade.lastIndexOf(")"))
);

if(+Grade_applicableYYYYMM > +applicableYYYYMM){
  remarks.push(`ApplicableYYYYMM (${applicableYYYYMM}) cannot be before ${Grade_applicableYYYYMM}`);
  row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
  remarksRowNumbers.push(employeeRowNo);
  continue;
}

const employeeGrade = (user.hrSalaryMasters || []).find(e=>(e.GSS.gradeStructure.gradeName).toString().trim() == gradeName && e.salaryFromYYYYMM == Grade_applicableYYYYMM);

if(!employeeGrade) {
         remarks.push('Grade not assigned to employee');
          row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
         continue;

}

      const skillCategory = employeeGrade.skillCategory;
      const startDate = employeeGrade.startDate;
      const endDate = employeeGrade.endDate;
     const stateMasterID = employeeGrade.stateid;
     const corporationId = employeeGrade.corporationId;
     const gradeStructureID = employeeGrade.GSS?.gradeStructureID || null;

     const stateName = employeeGrade.stateMaster?.stateName || null;
     const corporationName = employeeGrade.corporation?.corporationName || null;

       const extraColumns = [

  { index: grade_INDEX, value: gradeName },
  { index: skillCategory_INDEX, value: skillCategory },
  { index: startDate_INDEX, value: startDate },
  { index: endDate_INDEX, value: endDate },
  { index: state_INDEX, value: stateName },
  { index: corporation_INDEX, value: corporationName },
];

extraColumns.forEach(({ index, value }) => {
  row.getCell(index).value = value;
});

      // Check if salary structure already exists for this user and period
      let existingKey;
      if (isFortnightly && startDate && endDate) {
        existingKey = `${user.userMasterID}_${startDate}_${endDate}`;
      } else if (applicableYYYYMM) {
        existingKey = `${user.userMasterID}_${applicableYYYYMM}`;
      }
      if (existingKey && existingSalaryMap.has(existingKey)) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary structure already assigned for this ${periodMsg}`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Check if salary is already calculated for this period or later
      const lastCalcData = lastCalculatedSalaryMap.get(
        String(user.userMasterID),
      );
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary already calculated for this ${periodMsg}`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      const gender = user.gender || null;

      row.getCell(grade_INDEX).value = gradeName;

      if (remarks.length > 0) {
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Get grade structure from pre-fetched map (deep copy to avoid mutation)
      const grade_salary_structure = JSON.parse(
        JSON.stringify(gradeSalaryStructureMap.get(gradeStructureID) || []),
      );

      // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

      let stateRequired = false;
      let hasMinimumWages = false;
      let hasLwf = false;

      for (const item of grade_salary_structure) {
        const isMinimumWages =
          item.formula?.includes('Minimum Wages') ||
          item.formula1?.includes('Minimum Wages');

        if (isMinimumWages) {
          hasMinimumWages = true;
        }

        const isLwf =
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

        if (isLwf) hasLwf = true;

        if (
          item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
          isLwf ||
          isMinimumWages
        ) {
          stateRequired = true;
        }

        if (stateRequired && hasMinimumWages && hasLwf) {
          break;
        }
      }

      if (stateRequired && !stateMasterID) {
        remarks.push('State is required');
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Determine AmountIn from formula
      const { AmountIn, basedOn } = getAmountInFromFormula(
        grade_salary_structure,
      );

      // Get input value based on formula
      let inputValue = 0;
      const grossColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'gross',
      );
      const ctcColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'ctc',
      );

      if (basedOn === 'GROSS' && grossColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
          0;
      } else if (basedOn === 'CTC' && ctcColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
          0;
      }

      if (!inputValue) {
        // Fallback: try to get Gross first, then CTC
        if (grossColIdx !== -1) {
          inputValue =
            parseFloat(
              row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value,
            ) || 0;
        }
        if (!inputValue && ctcColIdx !== -1) {
          inputValue =
            parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
            0;
        }
      }

      if (!inputValue) {
        remarks.push(`${basedOn} value required`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Get MinWagesMaster data for this state and yearMonth (pre-fetched)
      let minWagesMasterData = null;
      if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
        minWagesMasterData = allMinWages.find(
          (m) =>
            m.stateMasterId == stateMasterID &&
            m.applicableYYYYMM <= +applicableYYYYMM,
        );
      }

      // Filter PT slab data for this state
      const ptSlabData = allPTSlabs.filter(
        (pt) => pt.stateMasterID == stateMasterID,
      );

      // check Lwf data

      let lwfData = null;
      const targetMonth = +String(applicableYYYYMM).slice(4, 6);

      if (hasLwf) {
        const data = allLWFStateWiseMap?.get(+stateMasterID) || [];
        const salaryCalculationAct = ['W', 'F'].includes(
          user.employeeJoiningDetails?.[0]?.salaryCalculationAct,
        )
          ? 'F'
          : 'S';

        lwfData = data?.reduce((latest, item) => {
          if (
            +item.applicableYearMonth <= +applicableYYYYMM &&
            (!item.month || item.month?.includes(targetMonth)) &&
            (item.applicableAct || []).includes(salaryCalculationAct) &&
            (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
          ) {
            return item;
          }
          return latest;
        }, null);
      }

      // Check for invalid or negative values BEFORE calculation
      const invalidValueRemarks = [];
      for (let idx = 0; idx < salaryHeaders.length; idx++) {
        const headerName = salaryHeaders[idx];
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;

        // Check if value is a valid number (not string/character)
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          const numValue = Number(cellValue);
          if (isNaN(numValue)) {
            invalidValueRemarks.push(
              `${headerName}: Invalid value, must be a number`,
            );
            continue;
          }
          // Check for negative value
          if (numValue < 0) {
            invalidValueRemarks.push(
              `${headerName}: Negative value not allowed`,
            );
          }
        }
      }

      // If any invalid/negative values found, skip calculation and show remarks
      if (invalidValueRemarks.length > 0) {
        row.getCell(REMARKS_COL_INDEX).value = invalidValueRemarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Map Excel values to grade structure for EmployeeSalaryAmount
      mapExcelValuesToGradeStructure(
        grade_salary_structure,
        salaryHeaders,
        row,
        BASE_HEADERS_COUNT,
        payheadNameToId,
      );

      try {
        // Use local calculation function (no DB queries inside)
        const { salaryStructureData } = assignSalaryStructureLocal(
          grade_salary_structure,
          inputValue,
          stateMasterID,
          AmountIn,
          applicableYYYYMM,
          gender,
          corporationId,
          skillCategory,
          null,
          0,
          hasMinimumWages,
          ptSlabData,
          minWagesMasterData,
          payhead_B_C,
          lwfData,
        );

        // Compare values
        const discrepancies = [];
        salaryHeaders.forEach((headerName, idx) => {
          const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
          const excelValue = parseFloat(cellValue) || 0;
          const payheadId = payheadNameToId.get(
            headerName?.toLowerCase()?.trim(),
          );
          const calculatedField = salaryStructureData.find(
            (f) => f.payheadMasterId === payheadId,
          );
          const calculatedValue = calculatedField?.finalvalue || 0;

          // Check if payhead exists in grade structure but user entered amount
          const payheadExistsInGrade = grade_salary_structure.some(
            (g) => g.payheadMasterId === payheadId,
          );
          if (
            !payheadExistsInGrade &&
            excelValue > 0 &&
            ![
              payheadMasterIdsMapping.GROSS,
              payheadMasterIdsMapping.CTC,
              payheadMasterIdsMapping.NETSALARY,
            ].includes(payheadId)
          ) {
            discrepancies.push(
              `${headerName}: Payhead not exist in grade structure`,
            );
            return;
          }

          if (Math.abs(excelValue - calculatedValue) > 0) {
            discrepancies.push(
              `${headerName}:Excel value(${excelValue}) and Calculated value(${calculatedValue}) are not same`,
            );
          }
        });

        if (discrepancies.length > 0) {
          row.getCell(REMARKS_COL_INDEX).value = discrepancies.join('; ');
          remarksRowNumbers.push(employeeRowNo);
        }
        // Don't add remarks for valid rows
      } catch (calcError) {
        row.getCell(REMARKS_COL_INDEX).value = `Error: ${calcError.message}`;
        remarksRowNumbers.push(employeeRowNo);
      }
    }

    worksheet.getColumn(UUID_COL_INDEX).width = 40;
    worksheet.getColumn(REMARKS_COL_INDEX).width = 60;
    await workbook.xlsx.writeFile(outputFilepath);

    // Return first page data
    const allData = [];
    const headersWithUUIDRemarks = [...headers,'Grade','StartDate','EndDate','State','Corporation','SkillCategory', 'UUID', 'Remarks'];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const employeeRowNo = rowIndex - 1; // Employee row starts from 1
      const rowData = { rowIndex: employeeRowNo };
      headersWithUUIDRemarks.forEach((header, idx) => {
        rowData[header] = row.getCell(idx + 1).value;
      });
      allData.push(rowData);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const paginatedData = allData.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Validation completed Successfully!',
      filename: outputFilename,
      data: paginatedData,
      totalCount: allData.length,
      totalPages: Math.ceil(allData.length / limitNum),
      remarksRowNumbers,
    });
  } catch (error) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
    console.error('Error in validateSalaryStructureV2:', error);
    next(error);
  }
};

// Revalidate single row - update row data in Excel, recalculate, add remarks
exports.revalidateSingleRow = async (req, res, next) => {
  try {
    const { filename, uuid, companyMasterID, rowData, payrollFrequency } =
      req.body;

    if (!filename || !uuid || !companyMasterID || !rowData) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename, uuid, companyMasterID and rowData are required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;

    const filepath = path.join(
      __dirname,
      `../uploads/employee-payroll-statutory/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid worksheet',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const UUID_COL_INDEX = headers.indexOf('UUID') + 1;
    if (UUID_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'UUID column not found in file',
      });
    }

    // Find row by UUID
    let targetRowIndex = null;
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const rowUUID = worksheet
        .getRow(rowIndex)
        .getCell(UUID_COL_INDEX)
        .value?.toString();
      if (rowUUID === uuid) {
        targetRowIndex = rowIndex;
        break;
      }
    }

    if (!targetRowIndex) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Row not found with given UUID',
      });
    }

    const extraHeaders = ['Grade','StartDate','EndDate','State','Corporation','SkillCategory', 'UUID', 'Remarks'];

    const BASE_HEADERS_COUNT = 10;
    const REMARKS_COL_INDEX = headers.indexOf('Remarks') + 1;
    const salaryHeaders = headers
      .slice(BASE_HEADERS_COUNT)
      .filter((h) => !extraHeaders.includes(h));

    // Update row data from frontend
    const row = worksheet.getRow(targetRowIndex);
    Object.keys(rowData).forEach((key) => {
      const colIdx = headers.indexOf(key);
      if (colIdx !== -1 && !extraHeaders.includes(key)) {
        row.getCell(colIdx + 1).value = rowData[key];
      }
    });

    // Get values for validation
    const mobileNumber = row.getCell(3).value?.toString()?.trim();


    // const skillCategory = row.getCell(8).value?.toString()?.trim() || null;
    const remarks = [];

     const excelGrade = row.getCell(9).value;

      if(!excelGrade){
         remarks.push('Salary Grade required');
         
           setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);
      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
         
      }


        const applicableYYYYMM = row.getCell(10).value;

if(!applicableYYYYMM){
  remarks.push('ApplicableYYYYMM is required');
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
}

const yyyymmStr = String(applicableYYYYMM).trim();

let isValidYYYYMM = true;

// Must be exactly 6 characters, all digits
if (yyyymmStr.length !== 6) {
  isValidYYYYMM = false;
} else {
  for (let i = 0; i < yyyymmStr.length; i++) {
    if (yyyymmStr[i] < '0' || yyyymmStr[i] > '9') {
      isValidYYYYMM = false;
      break;
    }
  }
}

// If digits check passed, validate month range
if (isValidYYYYMM) {
  const monthPart = yyyymmStr.substring(4, 6);
  const monthNum = Number(monthPart);
  if (monthNum < 1 || monthNum > 12) {
    isValidYYYYMM = false;
  }
}

if(!isValidYYYYMM){
  remarks.push('ApplicableYYYYMM must be in valid YYYYMM format (e.g., 202501)');
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
}

            const gradeName = excelGrade.substring(0, excelGrade.lastIndexOf("(")).trim();
const grade_applicableYYYYMM = Number(excelGrade.substring(
  excelGrade.lastIndexOf("(") + 1,
  excelGrade.lastIndexOf(")"))
);

if(+grade_applicableYYYYMM > +applicableYYYYMM){
   remarks.push(`ApplicableYYYYMM (${applicableYYYYMM}) cannot be before ${grade_applicableYYYYMM}`);
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
}

    // Fetch only required data based on row values
    const [
      user,
      salaryFields,
      allMinWages,
      allPTSlabs,
      gradeSalaryStructure,
      allLWFData,
    ] = await Promise.all([
      UserMaster.findOne({
        where: {
          companyMasterId: companyMasterID,
          userNumber: mobileNumber,
          status: 1,
        },
        attributes: ['userMasterID', 'userNumber', 'gender', 'displayName'],
        subQuery: false,
        include: [
    {
              model: EmployeeJoiningDetails,
              attributes: ['salaryCalculationAct'],
    },
     // salary master
      {
        required:true,
        model:HRSalaryMasterFields,
        where:{
          salaryFromYYYYMM:grade_applicableYYYYMM
        },
        attributes:['salaryFromYYYYMM','gradeSalaryStructureID','startDate','endDate','payrollFrequency','minWagesMasterId','corporationId','skillCategory','stateid'],
        include:[{
          required:true,
          model:GradeSalaryStructure,
          as:'GSS',
          attributes:['gradeStructureID'],
          include:[{required:true,model:GradeStructure,where:{baseOnCalculation:{[Sequelize.Op.ne]:SalaryStructureTypeEnum.HOURLY}},attributes:['gradeName']},{required:true,model:HRSalaryFields,as:'HSF',where:{payheadMasterId:payheadMasterIdsMapping.GROSS,},attributes:[]}]
        }]
      }
  ],
      }),
      HRSalaryFields.findAll({
        where: {
          companyMasterID,
          status: 1,
          payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
        },
        include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
        attributes: ['payheadMasterId', 'salaryFieldSrNo', 'salaryFieldID'],
      }),
      MinWagesMaster.findAll({
        where: { companyMasterId: companyMasterID },
        order: [['applicableYYYYMM', 'DESC']],
        raw: true,
      }),
      ProfessionalTaxSlabMaster.findAll({
        where: { status: 1 },
        raw: true,
      }),
      gradeName
        ? GradeSalaryStructure.findAll({
            raw: true,
            include: [
              {
                model: HRSalaryFields,
                attributes: [],
                include: [{ model: Payheadmaster, attributes: [] }],
              },
              {
                model: GradeStructure,
                attributes: [],
                where: { companyMasterID, status: 1, gradeName: gradeName },
              },
            ],
            order: [
              [
                { model: HRSalaryFields, as: 'hrSalaryField' },
                'salaryFieldSrNo',
                'ASC',
              ],
              ['salaryfieldindex', 'ASC'],
            ],
            attributes: [
              'gradeSalaryStructureID',
              'gradeStructureID',
              'salaryFieldID',
              'fieldFixAmount',
              'formula',
              'salaryfieldindex',
              'salaryfieldmaxrange',
              'fieldFixAmount1',
              'formula1',
              'formulaPreference',
              [
                sequelize.col('hrSalaryField.payheadMasterId'),
                'payheadMasterId',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldSide'),
                'salaryFieldSide',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldAttanChk'),
                'salaryFieldAttanChk',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
                'salaryFieldWhenMonth',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldSrNo'),
                'salaryFieldSrNo',
              ],
              [
                sequelize.col('hrSalaryField.companyMasterID'),
                'companyMasterID',
              ],
              [
                sequelize.col('hrSalaryField.payheadDisplayName'),
                'payheadDisplayName',
              ],
              [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
              [
                sequelize.col('hrSalaryField.Payheadmaster.payheadName'),
                'payheadName',
              ],
              [
                sequelize.col('gradeStructure.baseOnCalculation'),
                'baseOnCalculation',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRound'),
                'assignSalaryRound',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRoundNo'),
                'assignSalaryRoundNo',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
                'assignSalaryRoundOffType',
              ],
            ],
          })
        : [],
      LwfMaster.findAll(),
    ]);

    // Validate user
    if (!user) {
      remarks.push('User not found');
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
    }

    const employeeGrade = (user.hrSalaryMasters || []).find(e=>(e.GSS.gradeStructure.gradeName).toString().trim() == gradeName && e.salaryFromYYYYMM == grade_applicableYYYYMM);

   
if(!employeeGrade) {
         remarks.push('Grade not assigned to employee');

           setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);
      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });

}


      const skillCategory = employeeGrade.skillCategory;
      const startDate = employeeGrade.startDate;
      const endDate = employeeGrade.endDate;
     const stateMasterID = employeeGrade.stateid;
     const corporationId = employeeGrade.corporationId;

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Check if salary structure already exists for this user and period
    const existingCondition = {
      userMasterID: user.userMasterID,
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    };
    if (isFortnightly && startDate && endDate) {
      existingCondition.startDate = startDate;
      existingCondition.endDate = endDate;
    } else if (applicableYYYYMM) {
      existingCondition.salaryFromYYYYMM = +applicableYYYYMM;
    }
    const existingSalary = await EmpPayrollStatutory.findOne({
      where: existingCondition,
      attributes: ['id'],
      raw: true,
    });
    if (existingSalary) {
      const periodMsg = isFortnightly ? 'fortnight' : 'month';
      remarks.push(`Payroll Statutory already assigned for this ${periodMsg}`);
    }

    // Check if salary is already calculated for this period or later
    const lastCalcSalary = await PayrollStatutorySalaryTrans.findOne({
      where: {
        userMasterID: user.userMasterID,
        payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
      },
      attributes: ['salaryYYYYMM', 'startDate', 'endDate'],
      order: [['salaryYYYYMM', 'DESC']],
      raw: true,
    });
    if (lastCalcSalary) {
      const lastCalcData = {
        lastSalaryYYYYMM: lastCalcSalary.salaryYYYYMM,
        lastStartDate: lastCalcSalary.startDate,
        lastEndDate: lastCalcSalary.endDate,
      };
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary already calculated for ${lastCalcSalary.salaryYYYYMM} ${periodMsg}`);
      }
    }

    const gender = user.gender || null;
   
    // Get grade salary structure
    const grade_salary_structure = JSON.parse(
      JSON.stringify(gradeSalaryStructure || []),
    );

    // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

    let stateRequired = false;
    let hasMinimumWages = false;
    let hasLwf = false;

    for (const item of grade_salary_structure) {
      const isMinimumWages =
        item.formula?.includes('Minimum Wages') ||
        item.formula1?.includes('Minimum Wages');

      if (isMinimumWages) {
        hasMinimumWages = true;
      }

      const isLwf =
        item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
        item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

      if (isLwf) hasLwf = true;

      if (
        item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
        isLwf ||
        isMinimumWages
      ) {
        stateRequired = true;
      }

      if (stateRequired && hasMinimumWages && hasLwf) {
        break;
      }
    }

    // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)
    // const hasMinimumWages = grade_salary_structure.some(
    //   (item) =>
    //     item.formula?.includes('Minimum Wages') ||
    //     item.formula1?.includes('Minimum Wages'),
    // );
    // const hasPT = grade_salary_structure.some(
    //   (item) => item.payheadMasterId == payheadMasterIdsMapping.PTAX,
    // );

    if (stateRequired && !stateMasterID) {
      remarks.push(`State is required`);
    }

    if (remarks.length > 0) {
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);
      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
    }

    const { AmountIn, basedOn } = getAmountInFromFormula(
      grade_salary_structure,
    );

    // Get input value
    let inputValue = 0;
    const grossColIdx = salaryHeaders.findIndex(
      (h) => h?.toLowerCase()?.trim() === 'gross',
    );
    const ctcColIdx = salaryHeaders.findIndex(
      (h) => h?.toLowerCase()?.trim() === 'ctc',
    );

    if (basedOn === 'GROSS' && grossColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
        0;
    } else if (basedOn === 'CTC' && ctcColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) || 0;
    }
    if (!inputValue && grossColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
        0;
    }
    if (!inputValue && ctcColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) || 0;
    }

    if (!inputValue) {
      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        [`${basedOn} value required`],
        true,
      );
      await workbook.xlsx.writeFile(filepath);
      return res
        .status(statusCodes.OK)
        .json({ status: statusCodes.OK, message: 'Row updated successfully' });
    }

    let minWagesMasterData = null;
    if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
      minWagesMasterData = allMinWages.find(
        (m) =>
          m.stateMasterId == stateMasterID &&
          m.applicableYYYYMM <= +applicableYYYYMM,
      );
    }

    const ptSlabData = allPTSlabs.filter(
      (pt) => pt.stateMasterID == stateMasterID,
    );

    // check Lwf data

    let lwfData = null;
    const targetMonth = +String(applicableYYYYMM).slice(4, 6);

    if (hasLwf) {
      const data = allLWFStateWiseMap?.get(+stateMasterID) || [];
      const salaryCalculationAct = ['W', 'F'].includes(
        user.employeeJoiningDetails?.[0]?.salaryCalculationAct,
      )
        ? 'F'
        : 'S';

      lwfData = data?.reduce((latest, item) => {
        if (
          +item.applicableYearMonth <= +applicableYYYYMM &&
          (!item.month || item.month?.includes(targetMonth)) &&
          (item.applicableAct || []).includes(salaryCalculationAct) &&
          (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
        ) {
          return item;
        }
        return latest;
      }, null);
    }

    const payhead_B_C = salaryFields.filter((f) =>
      ['B', 'C'].includes(f.salaryFieldSrNo),
    );

    // Payhead name to ID map
    const payheadNameToId = new Map();
    salaryFields.forEach((f) => {
      const name = f.Payheadmaster?.payheadName?.toLowerCase()?.trim();
      if (name) payheadNameToId.set(name, f.payheadMasterId);
    });
    payheadNameToId.set('gross', payheadMasterIdsMapping.GROSS);
    payheadNameToId.set('net salary', payheadMasterIdsMapping.NETSALARY);
    payheadNameToId.set('ctc', payheadMasterIdsMapping.CTC);

    // Check for invalid or negative values BEFORE calculation
    const invalidValueRemarks = [];
    for (let idx = 0; idx < salaryHeaders.length; idx++) {
      const headerName = salaryHeaders[idx];
      const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;

      // Check if value is a valid number (not string/character)
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        const numValue = Number(cellValue);
        if (isNaN(numValue)) {
          invalidValueRemarks.push(
            `${headerName}: Invalid value, must be a number`,
          );
          continue;
        }
        // Check for negative value
        if (numValue < 0) {
          invalidValueRemarks.push(`${headerName}: Negative value not allowed`);
        }
      }
    }

    // If any invalid/negative values found, skip calculation and show remarks
    if (invalidValueRemarks.length > 0) {
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), invalidValueRemarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });

      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: 'Row updated successfully',
        data: updatedRowData,
      });
    }

    // Map Excel values to grade structure for EmployeeSalaryAmount
    mapExcelValuesToGradeStructure(
      grade_salary_structure,
      salaryHeaders,
      row,
      BASE_HEADERS_COUNT,
      payheadNameToId,
    );

    try {
      const { salaryStructureData } = assignSalaryStructureLocal(
        grade_salary_structure,
        inputValue,
        stateMasterID,
        AmountIn,
        applicableYYYYMM,
        gender,
        corporationId,
        skillCategory,
        null,
        0,
        hasMinimumWages,
        ptSlabData,
        minWagesMasterData,
        payhead_B_C,
        lwfData,
      );

      const discrepancies = [];
      salaryHeaders.forEach((headerName, idx) => {
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
        const excelValue = parseFloat(cellValue) || 0;
        const payheadId = payheadNameToId.get(
          headerName?.toLowerCase()?.trim(),
        );
        const calculatedField = salaryStructureData.find(
          (f) => f.payheadMasterId === payheadId,
        );
        const calculatedValue = calculatedField?.finalvalue || 0;

        // Check if payhead exists in grade structure but user entered amount
        const payheadExistsInGrade = grade_salary_structure.some(
          (g) => g.payheadMasterId === payheadId,
        );
        if (
          !payheadExistsInGrade &&
          excelValue > 0 &&
          ![
            payheadMasterIdsMapping.GROSS,
            payheadMasterIdsMapping.CTC,
            payheadMasterIdsMapping.NETSALARY,
          ].includes(payheadId)
        ) {
          discrepancies.push(
            `${headerName}: Payhead not exist in grade structure`,
          );
          return;
        }

        if (Math.abs(excelValue - calculatedValue) > 0) {
          discrepancies.push(
            `${headerName}:Excel value(${excelValue}) and Calculated value(${calculatedValue}) are not same`,
          );
        }
      });

      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        discrepancies,
        discrepancies.length > 0,
      );
    } catch (calcError) {
      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        [`Error: ${calcError.message}`],
        true,
      );
    }

    await workbook.xlsx.writeFile(filepath);

    // Build updated row data for response
    const updatedRowData = { rowIndex: targetRowIndex - 1 };
    headers.forEach((header, idx) => {
      updatedRowData[header] = row.getCell(idx + 1).value;
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Row updated successfully',
      data: updatedRowData,
    });
  } catch (error) {
    console.error('Error in revalidateSingleRow:', error);
    next(error);
  }
};

// Delete row from Excel file
exports.deleteExcelRow = async (req, res, next) => {
  try {
    const { filename, uuid } = req.body;

    if (!filename || !uuid) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename and uuid are required',
      });
    }

    const filepath = path.join(
      __dirname,
      `../uploads/employee-payroll-statutory/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid worksheet',
      });
    }

    // Get UUID column index
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const UUID_COL_INDEX = headers.indexOf('UUID') + 1;
    if (UUID_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'UUID column not found in file',
      });
    }

    // Find row by UUID
    let targetRowIndex = null;
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const rowUUID = worksheet
        .getRow(rowIndex)
        .getCell(UUID_COL_INDEX)
        .value?.toString();
      if (rowUUID === uuid) {
        targetRowIndex = rowIndex;
        break;
      }
    }

    if (!targetRowIndex) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Row not found with given UUID',
      });
    }

    // Delete the row
    worksheet.spliceRows(targetRowIndex, 1);

    await workbook.xlsx.writeFile(filepath);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Row deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteExcelRow:', error);
    next(error);
  }
};

// Save salary structure - Final save API
exports.savePayrollStatutory = async (req, res, next) => {
  let transaction = null;

  try {
    const { filename, companyMasterID, payrollFrequency } = req.body;

    if (!filename || !companyMasterID) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename and companyMasterID are required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;
    const defaultPayheadMasterIdsForSave = notIncludePyaheadIds;

    const filepath = path.join(
      __dirname,
      `../uploads/employee-payroll-statutory/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    // Read Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Excel file is empty or has no data rows',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const REMARKS_COL_INDEX = headers.indexOf('Remarks') + 1;
    if (REMARKS_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid file format - Remarks column not found',
      });
    }

    // Check if any row has remarks
    const remarksRowNumbers = [];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const remarks = worksheet
        .getRow(rowIndex)
        .getCell(REMARKS_COL_INDEX)
        .value?.toString()
        ?.trim();
      if (remarks && remarks !== '') {
        remarksRowNumbers.push(rowIndex - 1);
      }
    }

    if (remarksRowNumbers.length > 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message:
          'Cannot save. Rows with remarks exist. Please fix all errors first.',
        remarksRowNumbers,
      });
    }

    // Collect mobile numbers
    const mobileNumbers = [];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const mobile = worksheet
        .getRow(rowIndex)
        .getCell(3)
        .value?.toString()
        ?.trim();
      if (mobile) mobileNumbers.push(mobile);
    }

    // Fetch master data
    const masterData = await fetchSalaryValidationMasterData(
      req,
      companyMasterID,
      mobileNumbers,
    );
    const lookupMaps = createLookupMaps(masterData);
    const {
      userMap,
      gradeSalaryStructureMap,
      payheadNameToId,
    } = lookupMaps;
    const {
      allMinWages,
      allPTSlabs,
      payhead_B_C,
      allGradeSalaryStructures,
      allLWFData,
    } = masterData;

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Fetch existing salary structures for duplicate check (optimized - single query)
    const userMasterIDs = Array.from(userMap.values()).map(
      (u) => u.userMasterID,
    );
    const [existingSalaryStructures, lastCalculatedSalaries] =
      await Promise.all([
        fetchExistingSalaryStructures(userMasterIDs, payrollFrequency),
        fetchLastCalculatedSalary(userMasterIDs, payrollFrequency),
      ]);
    const existingSalaryMap = createExistingSalaryStructureMap(
      existingSalaryStructures,
      isFortnightly,
    );
    const lastCalculatedSalaryMap = createLastCalculatedSalaryMap(
      lastCalculatedSalaries,
    );

    // Build gradeSalaryStructureID map: gradeStructureID_payheadMasterId -> gradeSalaryStructureID
    const gradeSalaryStructureIdMap = new Map();
    allGradeSalaryStructures.forEach((item) => {
      const key = `${item.gradeStructureID}_${item.payheadMasterId}`;
      gradeSalaryStructureIdMap.set(key, item.gradeSalaryStructureID);
    });

    const BASE_HEADERS_COUNT = 10;
const extraHeaders = ['Grade','StartDate','EndDate','State','Corporation','SkillCategory', 'UUID', 'Remarks'];

    const salaryHeaders = headers
      .slice(BASE_HEADERS_COUNT)
      .filter((h) => !extraHeaders.includes(h));

    const allRecordsToInsert = [];

    // Process each row
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const mobileNumber = row.getCell(3).value?.toString()?.trim();

      const user = userMap.get(mobileNumber);

      // Skip if user not found (shouldn't happen as validation passed)
      if (!user) continue;

        const excelGrade = row.getCell(9).value;

      if(!excelGrade){
        continue;
      }

     const applicableYYYYMM = row.getCell(10).value;

      const gradeName = excelGrade.substring(0, excelGrade.lastIndexOf("(")).trim();
const grade_applicableYYYYMM = Number(excelGrade.substring(
  excelGrade.lastIndexOf("(") + 1,
  excelGrade.lastIndexOf(")"))
);

const employeeGrade = (user.hrSalaryMasters || []).find(e=>(e.GSS.gradeStructure.gradeName).toString().trim() == gradeName && e.salaryFromYYYYMM == grade_applicableYYYYMM);

if(!employeeGrade) {
       continue;

}

      const skillCategory = employeeGrade.skillCategory;
      const startDate = employeeGrade.startDate;
      const endDate = employeeGrade.endDate;
     const stateMasterID = employeeGrade.stateid;
     const corporationId = employeeGrade.corporationId;
     const gradeStructureID = employeeGrade.GSS?.gradeStructureID || null;

      // Check if salary structure already exists for this user and period (final check before save)
      let existingKey;
      if (isFortnightly && startDate && endDate) {
        existingKey = `${user.userMasterID}_${startDate}_${endDate}`;
      } else if (applicableYYYYMM) {
        existingKey = `${user.userMasterID}_${applicableYYYYMM}`;
      }
      if (existingKey && existingSalaryMap.has(existingKey)) {
        // Skip this row - salary structure already exists
        continue;
      }

      // Check if salary is already calculated for this period or later
      const lastCalcData = lastCalculatedSalaryMap.get(
        String(user.userMasterID),
      );
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        // Skip this row - salary already calculated for this period
        continue;
      }


      // Get grade salary structure
      const grade_salary_structure = JSON.parse(
        JSON.stringify(gradeSalaryStructureMap.get(gradeStructureID) || []),
      );

      // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

      let stateRequired = false;
      let hasMinimumWages = false;
      let hasLwf = false;

      for (const item of grade_salary_structure) {
        const isMinimumWages =
          item.formula?.includes('Minimum Wages') ||
          item.formula1?.includes('Minimum Wages');

        if (isMinimumWages) {
          hasMinimumWages = true;
        }

        const isLwf =
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

        if (isLwf) hasLwf = true;

        if (
          item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
          isLwf ||
          isMinimumWages
        ) {
          stateRequired = true;
        }

        if (stateRequired && hasMinimumWages && hasLwf) {
          break;
        }
      }

      const { AmountIn } = getAmountInFromFormula(grade_salary_structure);

      // Get input value
      let inputValue = 0;
      const grossColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'gross',
      );
      const ctcColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'ctc',
      );

      if (grossColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
          0;
      }
      if (!inputValue && ctcColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
          0;
      }

      // Check for invalid or negative values in salary fields - skip row if any found
      let hasInvalidValue = false;
      for (let idx = 0; idx < salaryHeaders.length; idx++) {
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
        // Check for non-numeric value
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          const numValue = Number(cellValue);
          if (isNaN(numValue)) {
            hasInvalidValue = true;
            break;
          }
        }
        // Check for negative value
        const excelValue = parseFloat(cellValue) || 0;
        if (excelValue < 0) {
          hasInvalidValue = true;
          break;
        }
      }
      if (hasInvalidValue) continue;

      // Get MinWages data
      let minWagesMasterData = null;
      let minWagesMasterId = null;
      if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
        minWagesMasterData = allMinWages.find(
          (m) =>
            m.stateMasterId == stateMasterID &&
            m.applicableYYYYMM <= +applicableYYYYMM,
        );
        minWagesMasterId = minWagesMasterData?.minWagesMasterId || null;
      }

      const ptSlabData = allPTSlabs.filter(
        (pt) => pt.stateMasterID == stateMasterID,
      );

      // check Lwf data

      let lwfData = null;
      const targetMonth = +String(applicableYYYYMM).slice(4, 6);

      if (hasLwf) {
        const data = allLWFStateWiseMap?.get(+stateMasterID) || [];

        const salaryCalculationAct = ['W', 'F'].includes(
          user['employeeJoiningDetails.salaryCalculationAct'],
        )
          ? 'F'
          : 'S';

        lwfData = data?.reduce((latest, item) => {
          if (
            +item.applicableYearMonth <= +applicableYYYYMM &&
            (!item.month || item.month?.includes(targetMonth)) &&
            (item.applicableAct || []).includes(salaryCalculationAct) &&
            (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
          ) {
            return item;
          }
          return latest;
        }, null);
      }

      // Map Excel values to grade structure for EmployeeSalaryAmount
      mapExcelValuesToGradeStructure(
        grade_salary_structure,
        salaryHeaders,
        row,
        BASE_HEADERS_COUNT,
        payheadNameToId,
      );

      // Calculate salary structure
      const { salaryStructureData } = assignSalaryStructureLocal(
        grade_salary_structure,
        inputValue,
        stateMasterID,
        AmountIn,
        applicableYYYYMM,
        user.gender,
        corporationId,
        skillCategory,
        null,
        0,
        hasMinimumWages,
        ptSlabData,
        minWagesMasterData,
        payhead_B_C,
        lwfData,
      );

      const masterData = {
         userMasterID: user.userMasterID,
         salaryFromYYYYMM: +applicableYYYYMM,
            stateid: stateRequired ? stateMasterID : null,
            AmountIn,
            corporationId: stateRequired ? corporationId : null,
            skillCategory: hasMinimumWages ? skillCategory : null,
            minWagesMasterId: hasMinimumWages ? minWagesMasterId : null,
            payrollFrequency: isFortnightly
              ? PayrollFrequencyType.FORTNIGHTLY
              : PayrollFrequencyType.MONTHLY,
            status: 1,

      }

        // Add startDate and endDate for Fortnightly
          if (isFortnightly && startDate && endDate) {
            masterData.startDate = startDate;
            masterData.endDate = endDate;
          }

const detailsData = [];         

      // Build records for calculated payheads
      salaryStructureData.forEach((item) => {
        const gradeSalaryStructureID = gradeSalaryStructureIdMap.get(
          `${gradeStructureID}_${item.payheadMasterId}`,
        );

        if (gradeSalaryStructureID) {
          const record = {
            gradeSalaryStructureID,
            EmployeeSalaryAmount: item.finalvalue || 0,
            ActualEmployeeSalaryAmount:
              item.actualvalue || item.finalvalue || 0,
            status: 1,
          };

          detailsData.push(record);
        }
      });

      // Add default payheads with amount = 0
      defaultPayheadMasterIdsForSave.forEach((payheadMasterId) => {
        const gradeSalaryStructureID = gradeSalaryStructureIdMap.get(
          `${gradeStructureID}_${payheadMasterId}`,
        );

        if (gradeSalaryStructureID) {
          // Check if not already added from calculated data
          const alreadyExists = salaryStructureData.some(
            (s) => s.payheadMasterId === payheadMasterId,
          );
          if (!alreadyExists) {
             const record = {
            gradeSalaryStructureID,
            EmployeeSalaryAmount: 0,
            ActualEmployeeSalaryAmount: 0,
            status: 1,
          };

          detailsData.push(record);

          }
        }
      });

       allRecordsToInsert.push({masterData,detailsData});
    }

    // Check if there are records to insert
    if (allRecordsToInsert.length === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'No valid records to save',
      });
    }

    // Start transaction only when ready to insert (after all validations passed)
    transaction = await sequelize.transaction();

    const insertedParents = await EmpPayrollStatutory.bulkCreate(
  allRecordsToInsert.map(x => x.masterData),
  {
    transaction,
    returning: true, 
    individualHooks: true,
    user: req.userDetails
  }
);

const allChildRecords = [];

insertedParents.forEach((parent, index) => {
  allRecordsToInsert[index].detailsData.forEach(child => {
    allChildRecords.push({
      ...child,
      empPayrollStatutoryId: parent.id
    });
  });
});

    // Bulk insert in chunks
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < allChildRecords.length; i += CHUNK_SIZE) {
      const chunk = allChildRecords.slice(i, i + CHUNK_SIZE);
      await EmpPayrollStatutoryDetails.bulkCreate(chunk, { transaction ,individualHooks:true,user:req.userDetails });
    }

    await transaction.commit();

    // Delete the file after successful save
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Salary structure saved successfully',
      savedUsers: worksheet.rowCount - 1,
      masterDataCount: allRecordsToInsert.length,
      detailsDataCount:allChildRecords.length
    });
  } catch (error) {
    // Only rollback if transaction was started
    if (transaction) {
      await transaction.rollback();
    }
    console.error('Error in saveSalaryStructure:', error);
    next(error);
  }
};
