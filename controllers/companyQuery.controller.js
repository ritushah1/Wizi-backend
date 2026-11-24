const { Sequelize } = require('sequelize');
const message = require('../response_message/message');
const { generateExcel } = require('../utils/exportData');
const CompanyQuery = require('../models/companyQuery');
const QueryCategory = require('../models/queryCategory');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const QueryStatus = require('../models/queryStatus');
const sequelize = require('../config/database');
const { QueryStatusEnum } = require('../utils/dbUtils');
const { stripHtml, asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

exports.postAddCompanyQuery = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { description, companyMasterID, date, queryCategoryID } = req.body;
    const query = await CompanyQuery.create(
      {
        query: description,
        companyMasterID,
        date,
        queryCategoryID,
      },
      {
        user: req.userDetails,
        transaction,
      }
    );
    await QueryStatus.create(
      {
        companyQueryID: query.companyQueryID,
      },
      {
        user: req.userDetails,
        transaction,
      }
    );
    await transaction.commit();
    res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Company Query'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllCompanyQuery = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      searchQuery,
      exportData,
      companyMasterID,
      fromDate,
      toDate,
      userMasterID = [],
      queryStatus,
    } = req.body;

    const condition = {};
    condition.status = ['0', '1'];
    if (companyMasterID) condition.companyMasterID = companyMasterID;
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$companyQuery.query$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    if (userMasterID.length > 0) {
      condition.createBy = userMasterID;
    }

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);

      end.setHours(23, 59, 59, 999);

      condition.createdAt = {
        [Sequelize.Op.gte]: start,
        [Sequelize.Op.lte]: end,
      };
    }

    if (queryStatus) {
      if (queryStatus == 0) {
        condition[Sequelize.Op.and] = Sequelize.literal(`
      (
        SELECT qs2."statusID"
        FROM "queryStatuses" qs2
        WHERE qs2."companyQueryID" = "companyQuery"."companyQueryID"
        ORDER BY qs2."createdAt" DESC
        LIMIT 1
      ) IS NULL 
      OR 
      (
        SELECT qs2."statusID"
        FROM "queryStatuses" qs2
        WHERE qs2."companyQueryID" = "companyQuery"."companyQueryID"
        ORDER BY qs2."createdAt" DESC
        LIMIT 1
      ) = 0
  `);
      }
      if (queryStatus != 0) {
        condition[Sequelize.Op.and] = Sequelize.literal(`
    (
      SELECT qs2."statusID" 
      FROM "queryStatuses" qs2
      WHERE qs2."companyQueryID" = "companyQuery"."companyQueryID"
      ORDER BY qs2."createdAt" DESC
      LIMIT 1
    ) = ${queryStatus}
  `);
      }
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows, count } = await CompanyQuery.findAndCountAll({
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: condition,
      include: [
        {
          required: true,
          model: companyMaster,
          where: {
            status: [0, 1],
          },
          attributes: ['companyName'],
        },
        {
          required: true,
          model: QueryCategory,
          attributes: ['categoryName'],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
        {
          model: QueryStatus,
          attributes: ['statusID', 'queryStatusID', 'solution'],
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (exportData) {
      const finalData = rows.map((x) => {
        return {
          Company: x.companyMaster.companyName,
          Query: stripHtml(x.query),
          'Query Category': x.queryCategory.categoryName,
          'Query Status': QueryStatusEnum[x.queryStatuses?.[0]?.statusID],
          Status: x.status == '1' ? 'Active' : 'Deactive',
          'Created At': asiaKolkataDateTime(x.createdAt)
            .slice(0, 10)
            .split('-')
            .reverse()
            .join('-'),
          'Created By': x.createdBy.displayName,
          'Updated By': x.updatedBy?.displayName || '',
          'Updated At':
            asiaKolkataDateTime(x.updatedAt)
              .slice(0, 10)
              .split('-')
              .reverse()
              .join('-') || ',',
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

exports.getCompanyQueryByID = async (req, res, next) => {
  try {
    const companyQueryID = req.body.companyQueryID;

    if (!companyQueryID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });

    const data = await CompanyQuery.findOne({
      where: {
        companyQueryID,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCompanyQuery = async (req, res, next) => {
  try {
    const { companyQueryID, query, date, queryCategoryID } = req.body;

    const existData = await CompanyQuery.findOne({
      where: {
        companyQueryID,
      },
    });

    if (!existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Query'),
      });
    }

    await CompanyQuery.update(
      {
        query,
        date,
        queryCategoryID,
      },
      {
        where: {
          companyQueryID,
        },
        individualHooks: true,
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Query'),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCompanyQuery = async (req, res, next) => {
  try {
    const companyQueryID = req.body.companyQueryID;

    if (!companyQueryID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company Query'),
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

    await CompanyQuery.destroy({
      where: {
        companyQueryID,
      },
      individualHooks: true,
      user: req.userDetails,
    });

    res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Company Query'),
    });
  } catch (error) {
    next(error);
  }
};

exports.postStatusChange = async (req, res, next) => {
  try {
    const { companyQueryID, status } = await req.body;

    if (!companyQueryID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company Query'),
      });
    }

    await CompanyQuery.update(
      {
        status,
      },
      {
        where: {
          companyQueryID,
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
