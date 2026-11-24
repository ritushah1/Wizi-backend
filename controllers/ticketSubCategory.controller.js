const { Op } = require('sequelize');
const { usermessage } = require('../response_message/message');
const TicketSubCategory = require('../models/ticketSubCategory');
const TicketCategory = require('../models/ticketCategory');
const UserMaster = require('../models/userMaster');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const Ticket = require('../models/ticket');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.createTicketSubCategory = async (req, res, next) => {
  try {
    const { name, description, ticketCategoryId, defaultAssignee } = req.body;
    const ticketCategory = await TicketCategory.findByPk(ticketCategoryId, {
      include: {
        model: companyMaster,
        where: {
          companyMasterID:
            req.userDetails.childCompanies.length > 0
              ? [
                  ...req.userDetails.childCompanies,
                  req.userDetails.companyMasterId,
                ]
              : req.userDetails.companyMasterId,
        },
      },
    });
    if (!ticketCategory)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Ticket category'),
      });

    const userExists = await UserMaster.findByPk(defaultAssignee);
    if (!userExists)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Default Assignee'),
      });
    const existingSubCategory = await TicketSubCategory.findOne({
      where: {
        name,
        ticketCategoryId: ticketCategoryId,
      },
    });
    if (existingSubCategory) {
      return res.status(200).json({
        status: 401,
        message: usermessage.alreadyExists('Subcategory With Same Name.'),
      });
    }
    const ticketSubCategory = await TicketSubCategory.create(
      { name, description, ticketCategoryId, defaultAssignee },
      { user: req.userDetails },
    );
    res.status(statusCodes.OK).json({
      data: ticketSubCategory,
      message: usermessage.addMessage('Ticket subcategory'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTicketSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, ticketCategoryId, defaultAssignee } = req.body;
    const ticketSubCategory = await TicketSubCategory.findByPk(id, {
      include: {
        model: TicketCategory,
        include: {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
      },
    });
    if (!ticketSubCategory)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Ticket subcategory'),
      });

    if (name) ticketSubCategory.name = name;
    if (description) ticketSubCategory.description = description;
    if (ticketCategoryId) {
      const ticketCategory = await TicketCategory.findByPk(ticketCategoryId);
      if (!ticketCategory)
        return res.status(statusCodes.NOT_FOUND).json({
          message: usermessage.notFoundMessage('Ticket Subcategory'),
        });
      ticketSubCategory.ticketCategoryId = ticketCategoryId;
    }
    if (defaultAssignee) {
      const userExists = await UserMaster.findByPk(defaultAssignee);
      if (!userExists)
        return res.status(statusCodes.NOT_FOUND).json({
          message: usermessage.notFoundMessage('Default Assignee'),
        });
      ticketSubCategory.defaultAssignee = defaultAssignee;
    }
    const uniquedata = await TicketSubCategory.findOne({
      where: {
        name: {
          [Op.iLike]: name,
        },
        ticketCategoryId: ticketCategoryId,
        id: { [Op.notIn]: [id] },
      },
    });

    if (uniquedata) {
      return res.status(200).json({
        status: 401,
        message: usermessage.alreadyExists('Subcategory With Same Category'),
        data: {},
      });
    }

    await ticketSubCategory.save({
      user: req.userDetails,
    });

    return res.status(statusCodes.OK).json({
      data: ticketSubCategory,
      message: usermessage.updateMessage('Ticket subcategory'),
    });
  } catch (err) {
    next(err);
  }
};
exports.getTicketSubCategoryDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticketSubCategory = await TicketSubCategory.findByPk(id, {
      include: [
        {
          model: TicketCategory,
          include: [
            {
              model: UserMaster,
              attributes: userAttributes,
            },
            {
              model: companyMaster,
              where: {
                companyMasterID:
                  req.userDetails.childCompanies.length > 0
                    ? [
                        ...req.userDetails.childCompanies,
                        req.userDetails.companyMasterId,
                      ]
                    : req.userDetails.companyMasterId,
              },
            },
          ],
        },
        {
          model: UserMaster,
          attributes: userAttributes,
        },
      ],
    });
    if (!ticketSubCategory)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Ticket subcategory'),
      });
    res.status(statusCodes.OK).json({
      data: ticketSubCategory,
      message: usermessage.fetchMessage('Ticket subcategory'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listTicketSubCategory = async (req, res, next) => {
  try {
    const {
      page,
      pageSize,
      withDeleted,
      ticketCategoryId,
      defaultAssignee,
      companyMasterID,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;

    const condition = {};
    if (ticketCategoryId) condition.ticketCategoryId = +ticketCategoryId;
    if (defaultAssignee) condition.defaultAssignee = +defaultAssignee;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    if (companyMasterID) {
      companyFilter.companyMasterID = companyMasterID;
      req.userDetails.accessibleCompanies = companyMasterID;
    }
    if (search)
      condition[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];

    const paginationQuery = {};
    if (!exportData && page && pageSize) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const subCategories = await TicketSubCategory.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          model: TicketCategory,
          required: true,
          include: [
            {
              model: UserMaster,
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
          attributes: userAttributes,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
      distinct: true,
      nest: true,
    });
    if (exportData) {
      await generateExcel(
        subCategories.rows.map((e) => e.toJSON()),
        'Ticket-Subcategory',
        exportFileType,
        res,
      );
      return;
    }
    res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Ticket subcategory'),
      data: subCategories.rows,
      totalcount: subCategories.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTicketSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticketSubcategory = await TicketSubCategory.findByPk(id, {
      include: [
        {
          model: TicketCategory,
          include: [
            {
              model: companyMaster,
              where: {
                companyMasterID:
                  req.userDetails.childCompanies.length > 0
                    ? [
                        ...req.userDetails.childCompanies,
                        req.userDetails.companyMasterId,
                      ]
                    : req.userDetails.companyMasterId,
              },
            },
          ],
        },
        { model: Ticket },
      ],
      nest: true,
    });
    if (!ticketSubcategory)
      return res
        .status(statusCodes.NOT_FOUND)
        .json({ message: usermessage.notFoundMessage('Ticket subcategory') });

    if (ticketSubcategory.toJSON().tickets.length > 0)
      return res.status(statusCodes.BAD_REQUEST).json({
        message: usermessage.canNotDelete('tickets'),
      });

    await ticketSubcategory.destroy({
      user: req.userDetails,
    });

    res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('Ticket subcategory'),
    });
  } catch (err) {
    next(err);
  }
};
