const Sequelize = require('sequelize');
const VisitPurposeModel = require('../models/visitPurpose');
const message = require('../response_message/message');
const companyMasterModel = require('../models/companyMaster');
const sequelize = require('../config/database');
const FormAuthorization = require('../models/formAuthorizationDetails');
const FormMaster = require('../models/formMaster');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const AuthorizationRequest = require('../models/authorizationRequest');
const Visit = require('../models/visit');
const { generateExcel } = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');
const PurposeOfVisit = require('../models/purposeOfVisit');

exports.postAddVisitPurpose = async (req, res, next) => {
  try {
    let { visitPurpose, companyMasterID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let FormMasters = await FormMaster.findOne({
      where: { formName: 'VisitPurpose', status: 1 },
    });

    let FormAuthorizations = await FormAuthorization.findOne({
      where: {
        FormMasterId: FormMasters.formMasterID,
        companyMasterID: companyMasterID,
        status: 1,
      },
      raw: true,
    });

    if (FormAuthorizations) {
      let AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: FormAuthorizations.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });
      if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
        let result = await sequelize.transaction(async (t) => {
          let insert_db_status = await VisitPurposeModel.create(
            {
              visitPurpose,
              companyMasterID,
              authorizationStatus: 2,
              createBy,
              createByIp,
            },
            { transaction: t, user: req.userDetails },
          );

          let insert_db_status1 = await AuthorizationRequest.create(
            {
              formMasterID: FormMasters.formMasterID,
              TableName: 'VisitPurpose',
              ReferenceID: insert_db_status.visitPurposeID,
              userMasterID: FormAuthorizations.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy,
              createByIp,
            },
            { transaction: t },
          );

          return res.status(200).json({
            status: 200,
            message: message.usermessage.addMessage('Visit Purpose'),
            data: insert_db_status,
          });
        });
      } else {
        let result = await sequelize.transaction(async (t) => {
          let insert_db_status = await VisitPurposeModel.create(
            {
              visitPurpose,
              companyMasterID,
              authorizationStatus: 1,
              createBy,
              createByIp,
            },
            { transaction: t, user: req.userDetails },
          );
          for (
            var i = 0;
            i < FormAuthorizations.AuthorizedByUserMasterId.length;
            i++
          ) {
            let insert_db_status1 = await AuthorizationRequest.create(
              {
                formMasterID: FormMasters.formMasterID,
                TableName: 'VisitPurpose',
                ReferenceID: insert_db_status.visitPurposeID,
                userMasterID: FormAuthorizations.AuthorizedByUserMasterId[i],
                status: 1,
                authstatus: 2,
                createBy,
                createByIp,
              },
              { transaction: t },
            );
          }

          return res.status(200).json({
            status: 200,
            message: message.usermessage.addMessage('Visit Purpose'),
            data: insert_db_status,
          });
        });
      }
    } else {
      let result = await sequelize.transaction(async (t) => {
        let insert_db_status = await VisitPurposeModel.create(
          {
            visitPurpose,
            companyMasterID,
            authorizationStatus: 0,
            createBy,
            createByIp,
          },
          { transaction: t, user: req.userDetails },
        );

        return res.status(200).json({
          status: 200,
          message: message.usermessage.addMessage('Visit Purpose'),
          data: insert_db_status,
        });
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getAllVisitPurposeData = async (req, res, next) => {
  try {
    let { limit, page, exportData, companyMasterID } = await req.body;
    let offset = (page - 1) * limit;
    let visit_purpose_data = [];
    if (limit == '' && page == '') {
      visit_purpose_data = await VisitPurposeModel.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
          authorizationStatus: ['0', '3'],
        },
        include: [
          {
            model: companyMasterModel,
            attributes: ['companyName'],
          },
        ],
      });
    } else {
      visit_purpose_data = await VisitPurposeModel.findAll({
        where: {
          companyMasterID: companyMasterID,
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
          authorizationStatus: ['0', '3'],
        },
        limit: limit,
        offset: offset,
        include: [
          {
            model: companyMasterModel,
            attributes: ['companyName'],
          },
        ],
      });
    }

    const totalcount = await VisitPurposeModel.count({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: ['0', '1'],
        authorizationStatus: ['0', '3'],
      },
    });

    if (exportData) {
      const finalData = [];

      for (let i = 0; i < visit_purpose_data.length; i++) {
        const data1 = {
          VisitPurpose: visit_purpose_data[i].visitPurpose,
          CompanyName: visit_purpose_data[i].companyMaster.companyName,
          Status: visit_purpose_data[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'Visit_Purpose', 'xlsx', res);
      return;
    }

    return res
      .status(200)
      .json({ status: 200, data: visit_purpose_data, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.getVisitPurposeById = async (req, res, next) => {
  try {
    let get_one_data = await VisitPurposeModel.findOne({
      where: {
        visitPurposeID: req.params.id,
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

exports.getVisitPurposeByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery } = await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          visitPurpose: {
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
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const visitpurpose = await VisitPurposeModel.findAndCountAll({
      raw: true,
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

    return res.status(200).json({
      status: 200,
      data: visitpurpose.rows,
      totalcount: visitpurpose.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateVisitPurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { visitPurposeID, visitPurpose, companyMasterID } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    await VisitPurposeModel.update(
      {
        visitPurpose,
        updateBy,
        updateByIp,
      },
      {
        where: { visitPurposeID: visitPurposeID },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Purpose'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { visitPurposeID, status } = await req.body;

    if (status != '1') {
      let data = await Visit.findOne({
        where: {
          status: ['1', '0'],
        },
        include: [
          {
            model: PurposeOfVisit,
            as: 'pov',
            where: {
              visitPurposeID: visitPurposeID,
            },
          },
        ],
      });

      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Visit Purpose. Already used in Visit.',
        });
      }
    }
    await VisitPurposeModel.update(
      {
        status,
      },
      {
        where: { visitPurposeID: visitPurposeID },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Visit Purpose')
          : message.usermessage.deactiveMessage('Visit Purpose'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteVisitPurposeById = async (req, res, next) => {
  try {
    let { visitPurposeID } = await req.body;

    let data = await Visit.findOne({
      where: {
        status: ['1', '0'],
      },
      include: [
        {
          model: PurposeOfVisit,
          as: 'pov',
          where: {
            visitPurposeID: visitPurposeID,
          },
        },
      ],
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Visit Purpose. Already used in Visit.',
      });
    }

    await VisitPurposeModel.destroy({
      where: { visitPurposeID: visitPurposeID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Visit Purpose'),
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
        const visitPurpose = row[0]; // Assuming the Visit Purpose name is in the first column
        let visitPurposeMaster = {
          visitPurpose: visitPurpose,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        const duplicateInExcel = data.find(
          (s) =>
            s.visitPurpose &&
            typeof s.visitPurpose === 'string' &&
            s.visitPurpose.toLowerCase() ===
              visitPurposeMaster.visitPurpose.toLowerCase(),
        );

        if (duplicateInExcel) {
          visitPurposeMaster.remarks = 'Duplicate Visit Purpose Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            visitPurpose: {
              [Sequelize.Op.iLike]: visitPurposeMaster.visitPurpose,
            },
          };

          const uniquedata = await VisitPurposeModel.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            visitPurposeMaster.remarks = 'Visit Purpose Already Exists';
          }
        }

        data.push(visitPurposeMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.visitPurposeValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.reValidateVisitPurpose = async (req, res, next) => {
  try {
    const { visitPurpose, companyMasterID } = req.body;

    let data = [];
    for (const row of visitPurpose) {
      if (row != null && row != '') {
        let departmentmaster = {
          visitPurpose: row.trim(),
          remarks: '',
        };
        const duplicateInData = data.some(
          (s) =>
            s.visitPurpose.trim().toLowerCase() ===
            departmentmaster.visitPurpose.trim().toLowerCase(),
        );

        if (duplicateInData) {
          departmentmaster.remarks = 'Duplicate Visit Purpose Name in Data';
        } else {
          const condition = {};
          condition.companyMasterID = companyMasterID;
          (condition.status = [0, 1]),
            (condition.visitPurpose = {
              [Sequelize.Op.iLike]: departmentmaster.visitPurpose,
            });
          let uniquedata = await VisitPurposeModel.findAll({
            where: condition,
          });
          if (uniquedata && uniquedata.length > 0) {
            departmentmaster.remarks = 'Visit Purpose Already Exists';
          }
        }

        data.push(departmentmaster);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.visitPurposeValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateVisitPurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { visitPurpose, companyMasterID } = req.body;
    let authStatus = 0;
    let FormMasters = await FormMaster.findOne({
      where: { formName: 'VisitPurpose', status: 1 },
    });
    let FormAuthorizations = await FormAuthorization.findOne({
      where: {
        FormMasterId: FormMasters.formMasterID,
        companyMasterID: req.body.companyMasterID,
        status: 1,
      },
      raw: true,
    });
    if (FormAuthorizations) {
      let AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: FormAuthorizations.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });
      if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    } else {
      authStatus = 0;
    }
    await VisitPurposeModel.bulkCreate(
      visitPurpose.map((item) => ({
        visitPurpose: item.trim(),
        authorizationStatus: authStatus,
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.visitpurposeadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getVisitActivePurposeByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery } = await req.body;

    const condition = {};

    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          visitPurpose: {
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
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const visitpurpose = await VisitPurposeModel.findAndCountAll({
      raw: true,
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

    return res.status(200).json({
      status: 200,
      data: visitpurpose.rows,
      totalcount: visitpurpose.count,
    });
  } catch (err) {
    next(err);
  }
};
