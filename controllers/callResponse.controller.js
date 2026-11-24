const Sequelize = require('sequelize');
const { usermessage } = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const CallResponse = require('../models/callResponse');
const { generateExcel } = require('../utils/exportData');
const UserMaster = require('../models/userMaster');
const {
  asiaKolkataDateTime,
  stripHtml,
} = require('../utils/commonUtilFunctions');
const companyMaster = require('../models/companyMaster');
const CallResponseCategory = require('../models/callResponseCategories');

exports.add = async (req, res, next) => {
  try {
    const {
      callResponseCategoryID,
      companyMasterID,
      callDate,
      callTime,
      Remark,
    } = req.body;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    if (!callResponseCategoryID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Call Response Category'),
      });
    if (!callDate)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('Call Date'),
      });
    if (!callTime)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('Call Time'),
      });

    await CallResponse.create(
      {
        callResponseCategoryID,
        companyMasterID,
        callDate,
        callTime,
        Remark,
      },
      { user: req.userDetails }
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Call Response'),
    });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      searchQuery,
      Export,
      companyMasterID,
      callResponseCategoryID,
    } = req.body;

    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;
    if (callResponseCategoryID)
      condition.callResponseCategoryID = callResponseCategoryID;
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$callResponseCategory.callResponseCategory$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          Remark: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    const { rows: data, count } = await CallResponse.findAndCountAll({
      where: condition,
      ...paginateCondition,
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        {
          model: CallResponseCategory,
          attributes: ['callResponseCategory'],
        },
        { model: UserMaster, attributes: ['displayName'], as: 'createdBy' },
      ],
      order: [['callResponseID', 'DESC']],
    });

    if (Export) {
      const finalData = data.map((e) => {
        return {
          'Company Name': e?.companyMaster?.companyName,
          'Call Response Category':
            e?.callResponseCategory?.callResponseCategory || '',
          Status: e.status == 1 ? 'Active' : 'Deactive',
          Remark: stripHtml(e.Remark),
          Date: asiaKolkataDateTime(e?.callDate)
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-'),
          Time: e.callTime,
          'Created By': e?.createdBy?.displayName,
          'Created At': asiaKolkataDateTime(e?.createdAt)
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-'),
        };
      });

      return await generateExcel(finalData, 'CallResponse', 'xlsx', res);
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
    const { callResponseID } = req.body;

    const data = await CallResponse.findByPk(callResponseID, {});

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
    const {
      callResponseID,
      callResponseCategoryID,
      companyMasterID,
      date,
      time,
      Remark,
    } = req.body;

    if (!callResponseID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response'),
      });

    const data = await CallResponse.findByPk(callResponseID);

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response'),
      });

    data.callResponseCategoryID = callResponseCategoryID;
    data.companyMasterID = companyMasterID;
    data.date = date;
    data.time = time;
    data.Remark = Remark;

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
    const { callResponseID } = req.body;

    if (!callResponseID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response'),
      });

    const data = await CallResponse.findByPk(callResponseID, {});

    if (!data)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Call Response'),
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

exports.callResponseHistory = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;
    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: usermessage.notFoundMessage('Company'),
      });
    const callResponseHistory = await CallResponse.findAll({
      where: { companyMasterID },
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        { model: CallResponseCategory, attributes: ['callResponseCategory'] },
        { model: UserMaster, attributes: ['displayName'], as: 'createdBy' },
      ],
      order: [['callResponseID', 'DESC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: callResponseHistory,
    });
  } catch (error) {
    next(error);
  }
};
