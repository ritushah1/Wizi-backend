const Sequelize = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const CustomerIndustry = require('../models/customerIndustry');
const companyMasterModel = require('../models/companyMaster');
const fs = require('fs');
const Customer = require('../models/customer');
const { generateExcel } = require('../utils/exportData');

exports.postAddCustomerIndustry = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, companyMasterID } = await req.body;

    if (!name) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Customer Industry name'),
      });
    }

    if (!companyMasterID) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const findCustomerIndustry = await CustomerIndustry.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    if (findCustomerIndustry) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Customer Industry With Same Name',
        ),
      });
    }

    let insert_db_status = await CustomerIndustry.create(
      {
        name,
        companyMasterID,
      },
      { transaction, user: req.userDetails },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Customer Industry'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCustomerIndustryById = async (req, res, next) => {
  try {
    let get_one_data = await CustomerIndustry.findOne({
      where: {
        customerIndustryID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerIndustryByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          name: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (!exportData) {
      if (page && limit) {
        paginationQuery.offset = (page - 1) * limit;
        paginationQuery.limit = limit;
      }
    }

    const order = [['createdAt', 'DESC']];

    const Customer_Industry = await CustomerIndustry.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMasterModel,
          attributes: ['companyName'],
        },
      ],
    });

    if (exportData) {
      const finalData = [];
      let data = Customer_Industry.rows;
      for (let i = 0; i < Customer_Industry.count; i++) {
        const data1 = {
          'Customer Industry': data[i].name,
          'Company Name': data[i].companyMaster.companyName,
          Status: data[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'Customer_Industry', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: Customer_Industry.rows,
      totalcount: Customer_Industry.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateCustomerIndustry = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerIndustryID, name, companyMasterID } = req.body;

    const findCustomerIndustry = await CustomerIndustry.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
        companyMasterID: companyMasterID,
        customerIndustryID: { [Sequelize.Op.notIn]: [customerIndustryID] },
        status: 1,
      },
    });

    if (findCustomerIndustry) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Customer Industry'),
        data: {},
      });
    }

    await CustomerIndustry.update(
      {
        name,
      },
      {
        where: { customerIndustryID: customerIndustryID },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Customer Industry'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerIndustryID, status } = await req.body;

    if (status != '1') {
      let data = await Customer.findOne({
        where: {
          customerIndustryID: customerIndustryID,
          status: ['1', '0'],
        },
      });

      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Customer Industry. Already used in Customers.',
        });
      }
    }
    await CustomerIndustry.update(
      {
        status,
      },
      {
        where: { customerIndustryID: customerIndustryID },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Customer Industry')
          : message.usermessage.deactiveMessage('Customer Industry'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteCustomerIndustryById = async (req, res, next) => {
  try {
    const { customerIndustryID } = await req.body;

    const data = await Customer.findOne({
      where: {
        customerIndustryID: customerIndustryID,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Customer Industry. Already used in Customer.',
      });
    }
    await CustomerIndustry.destroy({
      where: { customerIndustryID: customerIndustryID },
      user: req.userDetails,
      individualHooks:true
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Customer Industry'),
    });
  } catch (err) {
    next(err);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (req.file == undefined) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();
    const data = [];

    for (const row of rows) {
      if (row && row.length > 0) {
        const customerIndustry = row[0];
        let customerIndustryMaster = {
          name: customerIndustry,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        const duplicateInExcel = data.find(
          (s) =>
            s.name &&
            typeof s.name === 'string' &&
            s.name.toLowerCase() === customerIndustryMaster.name.toLowerCase(),
        );

        if (duplicateInExcel) {
          customerIndustryMaster.remarks =
            'Duplicate Customer Industry Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            name: {
              [Sequelize.Op.iLike]: customerIndustryMaster.name,
            },
          };

          const uniquedata = await CustomerIndustry.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            customerIndustryMaster.remarks = 'Customer Industry Already Exists';
          }
        }

        data.push(customerIndustryMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Customer Industry'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.reValidatecustomerIndustry = async (req, res, next) => {
  try {
    const { name, companyMasterID } = req.body;

    let data = [];
    for (const row of name) {
      if (row != null && row != '') {
        let customerIndustry = {
          name: row.trim(),
          remarks: '',
        };
        const duplicateInData = data.some(
          (s) =>
            s.name.trim().toLowerCase() ===
            customerIndustry.name.trim().toLowerCase(),
        );

        if (duplicateInData) {
          customerIndustry.remarks = 'Duplicate Customer Industry Name in Data';
        } else {
          const condition = {};
          condition.companyMasterID = companyMasterID;
          ((condition.status = [0, 1]),
            (condition.name = {
              [Sequelize.Op.iLike]: customerIndustry.name,
            }));
          let uniquedata = await CustomerIndustry.findAll({
            where: condition,
          });
          if (uniquedata && uniquedata.length > 0) {
            customerIndustry.remarks = 'Customer Industry Already Exists';
          }
        }

        data.push(customerIndustry);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Customer Industry'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidatecustomerIndustry = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, companyMasterID } = req.body;

    const data = name.map((item) => ({
      name: item.trim(),
      companyMasterID,
    }));

    await CustomerIndustry.bulkCreate(data, {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Customer Industry'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
