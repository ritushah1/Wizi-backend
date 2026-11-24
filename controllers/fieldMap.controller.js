const Sequelize = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const FieldMap = require('../models/fieldMap');

exports.getAllFieldMap = async (req, res, next) => {
  try {
    const { pageSize, page, searchQuery } = req.body;

    const condition = {
      status: [0, 1],
    };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          name: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (page && pageSize) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = pageSize;
    }

    const { rows: fieldMapData, count } = await FieldMap.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['fieldMapID', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: fieldMapData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddFieldMap = async (req, res, next) => {
  try {
    const { name, columnName, tableName } = await req.body;

    if (!name) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Field name'),
      });
    }

    const expensePurpose = await FieldMap.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
      },
    });

    if (expensePurpose) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Field With Same Name'),
      });
    }

    await FieldMap.create(
      {
        name,
        columnName,
        tableName,
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Field Map'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getFieldMapById = async (req, res, next) => {
  try {
    const { fieldMapID } = req.body;

    if (!fieldMapID) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: message.usermessage.notFoundMessage('Field ID'),
      });
    }

    let get_one_data = await FieldMap.findOne({
      where: {
        fieldMapID: fieldMapID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    if (!get_one_data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: message.usermessage.notFoundMessage('Field'),
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateFieldMap = async (req, res, next) => {
  try {
    const { fieldMapID, name, columnName, tableName } = req.body;

    const findFieldMap = await FieldMap.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
        fieldMapID: {
          [Sequelize.Op.ne]: fieldMapID,
        },
      },
    });

    if (findFieldMap) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Field'),
      });
    }

    await FieldMap.update(
      {
        name,
        columnName,
        tableName,
      },
      {
        where: { fieldMapID },
        individualHooks: true,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Field'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    const { fieldMapID, status } = await req.body;

    await FieldMap.update(
      {
        status,
      },
      {
        where: { fieldMapID: fieldMapID },
        individualHooks: true,
        user: req.userDetails,
      },
    );
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Field')
          : message.usermessage.deactiveMessage('Field'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteFieldMapById = async (req, res, next) => {
  try {
    const { fieldMapID } = await req.body;

    await FieldMap.destroy({
      where: { fieldMapID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Field Map'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getFieldMapDropdown = async (req, res, next) => {
  try {
    const condition = {
      status: [1],
    };

    const fieldMapData = await FieldMap.findAll({
      where: condition,
      order: [['name', 'ASC']],
      attributes: ['name', 'fieldMapID'],
    });

    return res.status(200).json({
      status: 200,
      data: fieldMapData,
    });
  } catch (err) {
    next(err);
  }
};
