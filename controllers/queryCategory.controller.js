const { Sequelize } = require('sequelize');
const message = require('../response_message/message');
const { generateExcel } = require('../utils/exportData');
const QueryCategory = require('../models/queryCategory');

exports.postAddQueryCategory = async (req, res, next) => {
  try {
    const { categoryName } = req.body;

    const existData = await QueryCategory.findOne({
      where: {
        categoryName,
      },
    });

    if (existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Query Category'),
      });
    }

    await QueryCategory.create(
      {
        categoryName,
      },
      {
        user: req.userDetails,
      }
    );

    res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Query Category'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllQueryCategory = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, exportData } = req.body;

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await QueryCategory.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: {
        [Sequelize.Op.or]: [
          { categoryName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
        ],
        status: ['0', '1'],
      },
    });

    if (exportData) {
      const finalData = rows.map((x) => {
        return {
          'Category Name': x.categoryName,
          status: x.status == '1' ? 'Active' : 'Deactive',
        };
      });

      return await generateExcel(finalData, `Query_Category`, 'xlsx', res);
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

exports.getQueryCategoryByID = async (req, res, next) => {
  try {
    const queryCategoryID = req.body.queryCategoryID;

    if (!queryCategoryID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });

    const data = await QueryCategory.findOne({
      where: {
        queryCategoryID,
      },
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateQueryCategory = async (req, res, next) => {
  try {
    const { queryCategoryID, categoryName } = req.body;

    const existData = await QueryCategory.findOne({
      where: {
        queryCategoryID,
      },
    });

    if (!existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Query category'),
      });
    }

    await QueryCategory.update(
      {
        categoryName,
      },
      {
        where: {
          queryCategoryID,
        },
        user: req.userDetails,
        individualHooks: true,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Query Category'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveQueryCategory = async (req, res, next) => {
  try {
    const data = await QueryCategory.findAll({
      where: {
        status: 1,
      },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteQueryCategory = async (req, res, next) => {
  try {
    const queryCategoryID = req.body.queryCategoryID;

    if (!queryCategoryID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Query Category'),
      });
    }

    // const data = await QueryCategory.findOne({
    //   where: {
    //     queryCategoryID,
    //     status: ['1', '0'],
    //   },
    // });

    // if (data) {
    //   return res.status(200).json({
    //     status: 401,
    //     message:
    //       'You can not delete this Query Category. Already used in Company Query.',
    //   });
    // }

    await QueryCategory.destroy({
      where: {
        queryCategoryID,
      },
      individualHooks: true,
      user: req.userDetails,
    });

    res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Query Category'),
    });
  } catch (error) {
    next(error);
  }
};

exports.postStatusChange = async (req, res, next) => {
  try {
    const { queryCategoryID, status } = await req.body;

    if (!queryCategoryID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Query Category'),
      });
    }

    await QueryCategory.update(
      {
        status,
      },
      {
        where: {
          queryCategoryID,
        },
        individualHooks: true,
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Query Category')
          : message.usermessage.deactiveMessage('Query Category'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
