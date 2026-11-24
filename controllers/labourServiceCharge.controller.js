const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const LabourServiceCharge = require('../models/labourServiceCharge');
const LabourServiceChargeDetails = require('../models/labourServiceChargeDetails');
const CompanyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const { userAttributes } = require('../utils/commonVars');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');

/**
 * Add new Labour Service Charge
 */
exports.addLabourServiceCharge = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { companyMasterID, applicableYearMonth, details } = req.body;

    // Validate required fields
    if (!companyMasterID || !applicableYearMonth) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Company and Applicable Year Month are required!',
      });
    }

    if (!details || !Array.isArray(details) || details.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'At least one Labour Service Charge Detail is required!',
      });
    }

    // Validate company exists
    const company = await CompanyMaster.findOne({
      where: {
        companyMasterID,
        status: 1,
      },
      attributes: ['companyMasterID'],
      transaction,
    });

    if (!company) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    // Validation: one company should not have two labourServiceCharge bill in same month
    const existingCharge = await LabourServiceCharge.findOne({
      where: {
        companyMasterID,
        applicableYearMonth,
        status: [0, 1],
      },
      transaction,
    });

    if (existingCharge) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message:
          'Labour Service Charge already exists for this company in the selected month!',
      });
    }

    // Create labour service charge
    const newCharge = await LabourServiceCharge.create(
      {
        companyMasterID,
        applicableYearMonth,
      },
      {
        transaction,
        user: req.userDetails,
      },
    );

    // Prepare and bulk create details
    const detailsToCreate = details.map((item) => ({
      labourServiceChargeID: newCharge.labourServiceChargeID,
      skillCategory: item.skillCategory,
      percentage: item.percentage,
    }));

    await LabourServiceChargeDetails.bulkCreate(detailsToCreate, {
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Labour Service Charge'),
      data: newCharge,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get Labour Service Charge by ID
 */
exports.getLabourServiceChargeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const charge = await LabourServiceCharge.findOne({
      where: {
        labourServiceChargeID: id,
        status: [0, 1],
      },
      include: [
        {
          model: CompanyMaster,
          as: 'company',
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: LabourServiceChargeDetails,
          as: 'details',
          where: { status: [0, 1] },
          required: false,
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
          required: false,
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
          required: false,
        },
      ],
    });

    if (!charge) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Labour Service Charge'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: charge,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Labour Service Charges
 */
exports.getLabourServiceCharges = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      applicableYearMonth,
      limit,
      page,
      searchQuery,
      exportData,
    } = req.body;

    const condition = {
      status: [0, 1],
    };

    if (companyMasterID) {
      condition.companyMasterID = companyMasterID;
    }

    if (applicableYearMonth) {
      condition.applicableYearMonth = applicableYearMonth;
    }

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$company.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        Sequelize.where(
          Sequelize.cast(
            Sequelize.col('labourServiceCharge.applicableYearMonth'),
            'TEXT',
          ),
          {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        ),
      ];
    }

    const order = [['createdAt', 'DESC']];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await LabourServiceCharge.findAndCountAll({
      where: condition,
      distinct: true,
      col: 'labourServiceChargeID',
      ...paginationQuery,
      order,
      include: [
        {
          model: CompanyMaster,
          as: 'company',
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: LabourServiceChargeDetails,
          as: 'details',
          where: { status: [0, 1] },
          required: false,
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
          required: false,
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
          required: false,
        },
      ],
    });

    if (exportData) {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Labour Service Charge');

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'Applicable Year Month', key: 'applicableYearMonth', width: 22 },
        { header: 'Skill Category', key: 'skillCategory', width: 25 },
        { header: 'Percentage (%)', key: 'percentage', width: 18 },
        { header: 'Created By', key: 'createdBy', width: 22 },
        { header: 'Created At', key: 'createdAt', width: 22 },
        { header: 'Updated By', key: 'updatedBy', width: 22 },
        { header: 'Updated At', key: 'updatedAt', width: 22 },
      ];

      worksheet.columns = columns;

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
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

      for (const item of rows) {
        const formattedYM = item.applicableYearMonth
          ? moment(String(item.applicableYearMonth), 'YYYYMM').format(
              'MMM YYYY',
            )
          : '';

        const commonFields = {
          companyName: item.company?.companyName || '',
          applicableYearMonth: formattedYM,
          createdBy: item.createdBy?.displayName || '',
          createdAt: item.createdAt
            ? moment(item.createdAt).format('DD-MM-YYYY hh:mm A')
            : '',
          updatedBy: item.updatedBy?.displayName || '',
          updatedAt:
            item.updatedBy?.displayName && item.updatedAt
              ? moment(item.updatedAt).format('DD-MM-YYYY hh:mm A')
              : '',
        };

        const details = item.details?.length ? item.details : [null];
        const rowCount = details.length;

        for (let i = 0; i < rowCount; i++) {
          const d = details[i];
          const excelRow = worksheet.addRow({
            ...commonFields,
            skillCategory: d ? d.skillCategory || '' : '',
            percentage: d && d.percentage != null ? `${d.percentage}%` : '',
          });

          excelRow.height = 20;
          excelRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: colNum === 2 || colNum === 4 ? 'center' : 'left',
              wrapText: true,
            };
          });
        }

        // Merge common columns (all except 3: Skill Category and 4: Percentage)
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;
          const columnsToMerge = [1, 2, 5, 6, 7, 8];

          for (const colNum of columnsToMerge) {
            worksheet.mergeCells(mergeStart, colNum, mergeEnd, colNum);
            const mergedCell = worksheet.getCell(mergeStart, colNum);
            mergedCell.alignment = {
              vertical: 'middle',
              horizontal: colNum === 2 ? 'center' : 'left',
              wrapText: true,
            };
          }
        }

        currentRowIndex += rowCount;
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Labour_Service_Charge.xlsx"',
      );
      res.set({ 'Access-Control-Expose-Headers': '*' });

      await workbook.xlsx.write(res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Labour Service Charge
 */
exports.updateLabourServiceCharge = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { labourServiceChargeID, applicableYearMonth, details } = req.body;

    if (!labourServiceChargeID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Labour Service Charge ID is required!',
      });
    }

    // Check if record exists
    const existingCharge = await LabourServiceCharge.findOne({
      where: {
        labourServiceChargeID,
        status: [0, 1],
      },
      transaction,
    });

    if (!existingCharge) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Labour Service Charge'),
      });
    }

    const yearMonthToCheck =
      applicableYearMonth || existingCharge.applicableYearMonth;

    // Validation: one company should not have two labourServiceCharge bill in same month (company cannot be changed during edit)
    const duplicateCharge = await LabourServiceCharge.findOne({
      where: {
        companyMasterID: existingCharge.companyMasterID,
        applicableYearMonth: yearMonthToCheck,
        labourServiceChargeID: { [Sequelize.Op.ne]: labourServiceChargeID },
        status: [0, 1],
      },
      transaction,
    });

    if (duplicateCharge) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message:
          'Labour Service Charge already exists for this company in the selected month!',
      });
    }

    // Update parent LabourServiceCharge record (status & company cannot be changed during edit)
    await LabourServiceCharge.update(
      {
        applicableYearMonth: yearMonthToCheck,
      },
      {
        where: { labourServiceChargeID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );

    // If details provided: delete previous added details and bulk create new details
    if (details && Array.isArray(details)) {
      await LabourServiceChargeDetails.destroy({
        where: { labourServiceChargeID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      });

      if (details.length > 0) {
        const detailsToCreate = details.map((item) => ({
          labourServiceChargeID,
          skillCategory: item.skillCategory || item.skillCategoryID,
          percentage: item.percentage,
        }));

        await LabourServiceChargeDetails.bulkCreate(detailsToCreate, {
          transaction,
          user: req.userDetails,
        });
      }
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Labour Service Charge'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete Labour Service Charge
 */
exports.deleteLabourServiceCharge = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const labourServiceChargeID = req.body.labourServiceChargeID || req.body.id;

    if (!labourServiceChargeID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Labour Service Charge ID is required!',
      });
    }

    const charge = await LabourServiceCharge.findOne({
      where: {
        labourServiceChargeID,
        status: [0, 1],
      },
      transaction,
      user: req.userDetails,
    });

    if (!charge) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Labour Service Charge'),
      });
    }

    // Delete related details first
    await LabourServiceChargeDetails.destroy({
      where: { labourServiceChargeID },
      individualHooks: true,
      transaction,
      user: req.userDetails,
    });

    // Delete labour service charge
    await LabourServiceCharge.destroy({
      where: { labourServiceChargeID },
      individualHooks: true,
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Labour Service Charge'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Change Labour Service Charge Status
 */
exports.changeLabourServiceChargeStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { status } = req.body;
    const labourServiceChargeID = req.body.labourServiceChargeID || req.body.id;

    if (!labourServiceChargeID || status === undefined) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Labour Service Charge ID and Status are required!',
      });
    }

    const charge = await LabourServiceCharge.findOne({
      where: {
        labourServiceChargeID,
        status: [0, 1],
      },
      transaction,
      user: req.userDetails,
    });

    if (!charge) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Labour Service Charge'),
      });
    }

    await LabourServiceCharge.update(
      { status },
      {
        where: { labourServiceChargeID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );

    // Also update status of related details
    await LabourServiceChargeDetails.update(
      { status },
      {
        where: { labourServiceChargeID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Labour Service Charge')
          : message.usermessage.deactiveMessage('Labour Service Charge'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
