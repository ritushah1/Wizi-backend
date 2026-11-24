const Sequelize = require('sequelize');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const sequelize = require('../config/database');
const message = require('../response_message/message');

exports.postAddAuthorizationCriteriaMaster = async (req, res, next) => {
  try {
    let { AuthorizationCriteria, createBy, createByIp } = await req.body;

    await AuthorizationCriteriaMaster.create({
      AuthorizationCriteria,
      createBy,
      createByIp,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Authorization Criteria'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationCriteriaMaster = async (req, res, next) => {
  try {
    let { limit, page, searchQuery } = await req.body;
    let offset = (page - 1) * limit;
    let Auth_master = [],
      totalcount;
    if (searchQuery) {
      Auth_master = await AuthorizationCriteriaMaster.findAll({
        raw: true,
        where: {
          [Sequelize.Op.or]: [
            {
              AuthorizationCriteriaMaster: {
                [Sequelize.Op.iLike]: '%' + searchQuery + '%',
              },
            },
            sequelize.where(
              sequelize.cast(
                sequelize.col(
                  'AuthorizationCriteriaMaster.AuthorizationCriteriaID',
                ),
                'varchar',
              ),
              { [Sequelize.Op.iLike]: `%${searchQuery}%` },
            ),
          ],
          status: ['0', '1'],
        },
      });
      totalcount = Auth_master.length;
    } else if (limit == '' && page == '') {
      Auth_master = await AuthorizationCriteriaMaster.findAll({
        raw: true,
        order: [['AuthorizationCriteria', 'ASC']],
        where: {
          status: 1,
        },
      });
      totalcount = await AuthorizationCriteriaMaster.count({
        raw: true,
        where: { status: ['0', '1'] },
      });
    } else {
      Auth_master = await AuthorizationCriteriaMaster.findAll({
        raw: true,
        where: {
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        limit: limit,
        offset: offset,
        order: [['AuthorizationCriteria', 'ASC']],
      });
      totalcount = await AuthorizationCriteriaMaster.count({
        raw: true,
        where: { status: ['0', '1'] },
      });
    }

    res
      .status(200)
      .json({ status: 200, data: Auth_master, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationCriteriaMasterById = async (req, res, next) => {
  try {
    let get_one_data = await AuthorizationCriteriaMaster.findOne({
      where: {
        AuthorizationCriteriaID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateAuthorizationCriteriaMaster = async (req, res, next) => {
  try {
    let {
      AuthorizationCriteriaID,
      AuthorizationCriteria,
      updateBy,
      updateByIp,
    } = await req.body;
    await AuthorizationCriteriaMaster.update(
      {
        AuthorizationCriteria,
        updateBy,
        updateByIp,
      },
      {
        where: { AuthorizationCriteriaID: AuthorizationCriteriaID },
      },
    );
    res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Authorization Criteria'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { AuthorizationCriteriaID, status } = req.body;
    await AuthorizationCriteriaMaster.update(
      {
        status,
      },
      {
        where: {
          AuthorizationCriteriaID: AuthorizationCriteriaID,
        },
      },
    );
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Authorization Criteria')
          : message.usermessage.deactiveMessage('Authorization Criteria'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteBankById = async (req, res, next) => {
  try {
    let { AuthorizationCriteriaID } = req.body;
    await AuthorizationCriteriaMaster.update(
      {
        status: 2,
      },
      {
        where: { AuthorizationCriteriaID: AuthorizationCriteriaID },
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Authorization Criteria'),
    });
  } catch (err) {
    next(err);
  }
};
