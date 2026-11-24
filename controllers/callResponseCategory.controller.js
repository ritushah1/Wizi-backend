const Sequelize = require('sequelize');
const { usermessage } = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const CallResponseCategory = require('../models/callResponseCategories');
const { generateExcel } = require('../utils/exportData');
const UserMaster = require('../models/userMaster');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

exports.add = async (req, res, next) => {
  try {
    const { callResponseCategory } = req.body;
    const callResponseCategoryName = await CallResponseCategory.findOne({
      where: {
        callResponseCategory: {
          [Sequelize.Op.iLike]: callResponseCategory.trim(),
        },
      },
    });

    if (callResponseCategoryName) {
      return res.status(200).json({
        status: 401,
        message: usermessage.alreadyExists(
          'Call Response Category With Same Name'
        ),
      });
    }

    await CallResponseCategory.create(req.body, { user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Call Response Category'),
    });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, Export, isActiveCategory } = req.body;

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = {};

    if (isActiveCategory) {
      condition.status = 1;
    }

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          callResponseCategory: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const { rows: data, count } = await CallResponseCategory.findAndCountAll({
      where: condition,
      ...paginateCondition,
      include: [
        { model: UserMaster, attributes: ['displayName'], as: 'createdBy' },
        { model: UserMaster, attributes: ['displayName'], as: 'updatedBy' },
      ],
      order: [['callResponseCategoryID', 'DESC']],
    });

    if (Export) {
      const finalData = data.map((e) => {
        return {
          'Call Response Category': e?.callResponseCategory || '',
          'Created By': e?.createdBy?.displayName,
          'Updated By': e?.updatedBy?.displayName,
          Status: e.status == 1 ? 'Active' : 'Deactive',
          'Created At': asiaKolkataDateTime(e?.createdAt)
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-'),
          'Updated At': asiaKolkataDateTime(e?.updatedAt)
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-'),
        };
      });

      return await generateExcel(
        finalData,
        'CallResponseCategory',
        'xlsx',
        res
      );
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { callResponseCategoryID } = req.body;

    const data = await CallResponseCategory.findByPk(
      callResponseCategoryID,
      {}
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { callResponseCategoryID, callResponseCategory } = req.body;

    const callResponseCategoryName = await CallResponseCategory.findOne({
      where: {
        callResponseCategory: {
          [Sequelize.Op.iLike]: callResponseCategory.trim(),
        },
        callResponseCategoryID: {
          [Sequelize.Op.notIn]: callResponseCategoryID,
        },
      },
    });

    if (callResponseCategoryName) {
      return res.status(200).json({
        status: 401,
        message: usermessage.alreadyExists(
          'Call Response Category With Same Name'
        ),
      });
    }

    const data = await CallResponseCategory.findByPk(callResponseCategoryID);

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response Category'),
      });

    data.callResponseCategory = callResponseCategory;

    await data.save({ user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.updateMessage('Call Response Category'),
    });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { callResponseCategoryID } = req.body;

    const data = await CallResponseCategory.findByPk(
      callResponseCategoryID,
      {}
    );

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response Category'),
      });

    await data.destroy({ user: req.userDetails });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.deleteMessage('Call Response Category'),
    });
  } catch (error) {
    next(error);
  }
};

exports.postStatusChange = async (req, res, next) => {
  try {
    const { callResponseCategoryID, status } = await req.body;

    if (!callResponseCategoryID) {
      return res.status(200).json({
        status: 401,
        message: usermessage.notFoundMessage('Call Response Category'),
      });
    }

    await CallResponseCategory.update(
      {
        status,
      },
      {
        where: {
          callResponseCategoryID,
        },
        individualHooks: true,
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? usermessage.activeMessage('Call Response Category')
          : usermessage.deactiveMessage('Call Response Category'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
