const { Op } = require('sequelize');
const { usermessage } = require('../response_message/message');
const KPIMaster = require('../models/kpimaster');
const KRAMaster = require('../models/kramaster');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { generateExcel } = require('../utils/exportData');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const GoalMaster = require('../models/goalMaster');
const { CustomError } = require('../utils/customError');

exports.findKPIById = async (id, userDetails) => {
  const kpi = await KPIMaster.findByPk(id, {
    include: [
      {
        model: KRAMaster,
        include: [
          {
            model: UserMaster,
            as: 'createdByUser',
            attributes: userAttributes,
          },
          {
            model: GoalMaster,
            include: {
              model: companyMaster,
              where: {
                companyMasterID:
                  userDetails.childCompanies.length > 0
                    ? [
                        ...userDetails.childCompanies,
                        userDetails.companyMasterId,
                      ]
                    : userDetails.companyMasterId,
              },
            },
          },
        ],
      },
      {
        model: UserMaster,
        as: 'createdByUser',
        attributes: userAttributes,
      },
    ],
    nest: true,
  });
  if (!kpi)
    throw new CustomError(
      usermessage.notFoundMessage('KPI'),
      statusCodes.NOT_FOUND,
    );
  return kpi;
};

exports.listKPI = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      kraMasterId,
      companyMasterID,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;
    const condition = {};
    if (kraMasterId) condition.kraMasterId = +kraMasterId;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    if (companyMasterID) companyFilter.companyMasterID = companyMasterID;
    if (search)
      condition[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];
    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }
    const kpis = await KPIMaster.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          required: true,
          model: KRAMaster,
          include: [
            {
              model: UserMaster,
              as: 'createdByUser',
              attributes: userAttributes,
            },
            {
              required: true,
              model: GoalMaster,
              include: {
                model: companyMaster,
                where: companyFilter,
              },
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
      ],
      nest: true,
      distinct: true,
    });

    if (exportData) {
      const finalData = kpis.rows.map((kpiItem) => {
        return {
          'KPI Name': kpiItem.title,
          'KPI Description': kpiItem.description,
          'KPI Weightage': kpiItem.weightage,
          'KRA Name': kpiItem.kraMaster.title,
          'Goal Name': kpiItem.kraMaster.goalMaster.title,
          'Company Name':
            kpiItem.kraMaster.goalMaster.companyMaster.companyName,
        };
      });

      await generateExcel(finalData, 'goal', exportFileType, res);
      return;
    }
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('KPIs'),
      data: kpis.rows,
      totalcount: kpis.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};
