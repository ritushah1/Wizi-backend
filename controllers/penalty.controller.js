const Sequelize = require('sequelize');
const Penalty = require('../models/penalty');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const employeePenalty = require('../models/employeePenalty');
const { generateExcel } = require('../utils/exportData');
const { defaultPenaltyNames } = require('../utils/dbUtils');

exports.postAddPenalty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { penaltyName, penaltyAmount, deductionFromSalary, companyMasterID } =
      req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const find_SameData = await Penalty.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('penaltyName')),
          ),
          penaltyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });
    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Penalty With Same Name'),
      });
    }
    await Penalty.create(
      {
        penaltyName,
        penaltyAmount,
        deductionFromSalary,
        companyMasterID,
        createBy,
        createByIp,
      },
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Penalty'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getPenaltyById = async (req, res, next) => {
  try {
    const findPenalty = await Penalty.findOne({
      where: {
        penaltyID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [{ model: companyMaster }],
    });

    res.status(200).json({ status: 200, data: findPenalty });
  } catch (err) {
    next(err);
  }
};

exports.getPenaltyByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } = req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          penaltyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows: penalty, count } = await Penalty.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    if (exportData) {
      const finalData = penalty.map((p) => ({
        PenaltyName: p.penaltyName,
        PenaltyAmount: p.penaltyAmount,
        DeductionFromSalary: p.deductionFromSalary ? 'Yes' : 'No',
        CompanyName: p.companyMaster.companyName,
        Status: p.status === 1 ? 'Active' : 'Deactive',
      }));

      await generateExcel(finalData, 'Penalty', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: penalty,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdatePenalty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      penaltyID,
      penalty,
      penaltyName,
      penaltyAmount,
      deductionFromSalary,
      companyMasterID,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const find_SameData = await Penalty.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('penaltyName')),
          ),
          penaltyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('penaltyID'), {
          [Sequelize.Op.ne]: penaltyID,
        }),
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Penalty With Same Name'),
      });
    }

    await Penalty.update(
      {
        penalty,
        penaltyName,
        penaltyAmount,
        deductionFromSalary,
        companyMasterID,
        updateBy,
        updateByIp,
      },
      {
        where: { penaltyID: penaltyID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Penalty'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { penaltyID, status } = await req.body;
    if (status != '1') {
      const findEmployeePenalty = await employeePenalty.findOne({
        where: {
          penaltyID: penaltyID,
          status: ['0', '1'],
        },
      });
      if (findEmployeePenalty) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.alreadyAssign('Penalty', 'deactivate'),
        });
      }
    }
    await Penalty.update(
      {
        status,
      },
      {
        where: { penaltyID: penaltyID },
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
          ? message.usermessage.activeMessage('Penalty')
          : message.usermessage.deactiveMessage('Penalty'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeletePenaltyById = async (req, res, next) => {
  try {
    let { penaltyID } = req.body;
    const userMasterID = req.userDetails.userMasterId;
    const findEmployeePenalty = await employeePenalty.findOne({
      where: {
        penaltyID: penaltyID,
        status: ['0', '1'],
      },
    });
    if (findEmployeePenalty) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyAssign('Penalty', 'Delete'),
      });
    }
    // await Penalty.update(
    //   { deleteBy: userMasterID },
    //   { where: { penaltyID: penaltyID } },
    // );
    await Penalty.destroy({ where: { penaltyID: penaltyID },user:req.userDetails,individualHooks:true });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Penalty'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getactivepenaltybycompanyid = async (req, res, next) => {
  try {
    const findPenalty = await Penalty.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: findPenalty });
  } catch (err) {
    next(err);
  }
};

exports.addPenaltyToAllCompany = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const findAllCompany = await companyMaster.findAll({});
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    for (let company of findAllCompany) {
     
      await Penalty.create(
        {
          penaltyName: defaultPenaltyNames.CANTEEN,
          penaltyAmount: 0,
          deductionFromSalary: true,
          companyMasterID: company.companyMasterID,
          isDefault: true,
          createBy,
          createByIp,
        },
        { transaction, user: req.userDetails },
      );
    }
    await transaction.commit();
    return res.status(200).json({ status: 200, data: findAllCompany });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
