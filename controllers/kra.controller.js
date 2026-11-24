const { Op } = require('sequelize');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const KRAMaster = require('../models/kramaster');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { generateExcel } = require('../utils/exportData');
const { usermessage } = require('../response_message/message');
const GoalMaster = require('../models/goalMaster');
const { CustomError } = require('../utils/customError');

exports.findKraById = async (id, userDetails) => {
  const kra = await KRAMaster.findByPk(id, {
    include: [
      {
        model: GoalMaster,
        include: [
          {
            model: UserMaster,
            as: 'createdByUser',
            attributes: userAttributes,
          },
          {
            model: companyMaster,
            where: {
              companyMasterID:
                userDetails.childCompanies.length > 0
                  ? [...userDetails.childCompanies, userDetails.companyMasterId]
                  : userDetails.companyMasterId,
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
  if (!kra)
    throw new CustomError(
      usermessage.notFoundMessage('KRA Master'),
      statusCodes.NOT_FOUND,
    );
  return kra;
};

exports.listKRA = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      goalMasterId,
      companyMasterID,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;
    const condition = {};
    if (goalMasterId) condition.goalMasterId = +goalMasterId;
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
    const kra = await KRAMaster.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          required: true,
          model: GoalMaster,
          include: [
            {
              model: UserMaster,
              as: 'createdByUser',
              attributes: userAttributes,
            },
            {
              model: companyMaster,
              where: companyFilter,
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
      const finalData = kra.rows.map((kraItem) => {
        return {
          'KRA Name': kraItem.title,
          'KRA Description': kraItem.description,
          'KRA Weightage': kraItem.weightage,
          'Goal Name': kraItem.goalMaster.title,
          'Company Name': kraItem.goalMaster.companyMaster.companyName,
        };
      });

      await generateExcel(finalData, 'goal', exportFileType, res);
      return;
    }
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('KRAs'),
      data: kra.rows,
      totalcount: kra.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};
