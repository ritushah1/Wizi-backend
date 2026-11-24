const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const TeamOvertimePlanning = require('../models/teamOvertimePlanning');
const TeamOvertimePlanningDetails = require('../models/teamOvertimePlanningDetails');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');

exports.addTeamOvertimePlanning = async (req, res, next) => {
    const transaction = await sequelize.transaction();
  try {
    const { userMasterID, date, description } = req.body;
  

    if (!date || !Array.isArray(userMasterID) || userMasterID.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }
    const findDuplicate = await TeamOvertimePlanning.findAll({
      where: { date },
      include: [
        {
          model: TeamOvertimePlanningDetails,
          as: 'details',
          where: {
            userMasterID,
          },
          include: [
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        },
      ],
      transaction,
    });

    if (findDuplicate.length) {
      const findDuplicateUser = [
        ...new Set(
          findDuplicate.flatMap(
            (planning) =>
              planning.details
                ?.map((item) => item.userMaster?.displayName)
                .filter(Boolean) || [],
          ),
        ),
      ];

      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          `Team Overtime Planning: ${findDuplicateUser.join(', ')}`,
        ),
      });
    }
    const teamOvertimePlanningData = await TeamOvertimePlanning.create(
      {
        date,
        description,
      },
      {
        transaction: transaction,
        user: req.userDetails,
      },
    );

    const data = userMasterID.map((item) => ({
      userMasterID: item,
      teamOvertimePlanningID: teamOvertimePlanningData.teamOvertimePlanningID,
    }));

    await TeamOvertimePlanningDetails.bulkCreate(data, {
      user: req.userDetails,
      transaction: transaction,
      individualHooks: true,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Team Overtime Planning'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listTeamOvertimePlanning = async (req, res, next) => {
  try {
    const { limit, page, startDate, endDate, userMasterID, exportData } =
      req.body;

    const loggedInUserID = req.userDetails.userMasterId;

    const condition = {};
    const paginationQuery = {};

    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    if (startDate && endDate) {
      condition.date = {
        [Sequelize.Op.between]: [startDate, endDate],
      };
    }
    const MAX_LEVEL = 6;

    const teamMembers = await sequelize.query(
      `
      WITH RECURSIVE org_tree AS (
        -- ROOT USER
        SELECT 
          um."userMasterID",
          0 AS level
        FROM "userMasters" um
        WHERE um."userMasterID" = :rootId
          AND um.status = 1

        UNION ALL

        -- CHILD USERS
        SELECT 
          rt."userMasterID",
          ot.level + 1
        FROM "employeeReportTos" rt
        JOIN org_tree ot 
          ON rt."reportToID" = ot."userMasterID"
        JOIN "userMasters" um 
          ON um."userMasterID" = rt."userMasterID"
        WHERE rt.status = 1
          AND um.status = 1
          AND ot.level < :MAX_LEVEL   
      )
      SELECT DISTINCT "userMasterID"
      FROM org_tree;
      `,
      {
        replacements: { rootId: loggedInUserID, MAX_LEVEL },
        type: Sequelize.QueryTypes.SELECT,
      },
    );

    const teamMemberIDs = teamMembers.map((item) => item.userMasterID);

    let allowedUserIDs = teamMemberIDs;

    if (userMasterID?.length) {
      allowedUserIDs = userMasterID;
    }

    const detailsFilterInclude = {
      model: TeamOvertimePlanningDetails,
      as: 'details',
      required: true,
      attributes: [],
      where: {
        userMasterID: {
          [Sequelize.Op.in]: allowedUserIDs,
        },
      },
      include: [
        {
          model: UserMaster,
          attributes: [],
          required: true,
          where: {
            status: 1,
          },
        },
      ],
    };

    const totalCount = await TeamOvertimePlanning.count({
      distinct: true,
      col: 'teamOvertimePlanningID',
      where: condition,
      include: [detailsFilterInclude],
    });

    const planningIDRows = await TeamOvertimePlanning.findAll({
      attributes: ['teamOvertimePlanningID', 'date'],
      where: condition,
      include: [detailsFilterInclude],
      group: [
        Sequelize.col('teamOvertimePlanning.teamOvertimePlanningID'),
        Sequelize.col('teamOvertimePlanning.date'),
      ],
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      subQuery: false,
      ...paginationQuery,
    });

    const planningIDs = planningIDRows.map(
      (item) => item.teamOvertimePlanningID,
    );

    let findOvertimePlanning = [];

    if (planningIDs.length) {
      findOvertimePlanning = await TeamOvertimePlanning.findAll({
        where: {
          teamOvertimePlanningID: {
            [Sequelize.Op.in]: planningIDs,
          },
        },
        include: [
          {
            model: TeamOvertimePlanningDetails,
            as: 'details',
            separate: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: allowedUserIDs,
              },
            },
            include: [
              {
                model: UserMaster,
                attributes: ['userMasterID', 'displayName'],
                required: true,
                where: {
                  status: 1,
                },
              },
            ],
          },
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
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
    }

    return res.status(200).json({
      status: 200,
      data: findOvertimePlanning,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTeamOvertimePlanningByID = async (req, res, next) => {
  try {
    const { teamOvertimePlanningID } = req.body;

    const data = await TeamOvertimePlanning.findOne({
      where: {
        teamOvertimePlanningID,
      },

      include: [
        {
          model: TeamOvertimePlanningDetails,
          as: 'details',
          include: [
            {
              model: UserMaster,
              attributes: ['userMasterID', 'displayName'],
            },
          ],
        },

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

    if (!data) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFound('Team Overtime Planning'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (err) {
    next(err);
  }
};

exports.editTeamOvertimePlanningByID = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, date, description, teamOvertimePlanningID } =
      req.body;

    if (!teamOvertimePlanningID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const existingData = await TeamOvertimePlanning.findOne({
      where: {
        teamOvertimePlanningID,
      },

      include: [
        {
          model: TeamOvertimePlanningDetails,
          as: 'details',
        },
      ],
    });

    if (!existingData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFound('Team Overtime Planning'),
      });
    }
    const findDuplicate = await TeamOvertimePlanning.findAll({
      where: {
        date,
        teamOvertimePlanningID: { [Sequelize.Op.ne]: teamOvertimePlanningID },
      },
      include: [
        {
          model: TeamOvertimePlanningDetails,
          as: 'details',
          where: {
            userMasterID,
          },
          include: [
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        },
      ],
      transaction,
    });

    if (findDuplicate.length) {
      const findDuplicateUser = [
        ...new Set(
          findDuplicate.flatMap(
            (planning) =>
              planning.details
                ?.map((item) => item.userMaster?.displayName)
                .filter(Boolean) || [],
          ),
        ),
      ];

      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          `Team Overtime Planning: ${findDuplicateUser.join(', ')}`,
        ),
      });
    }
    const existingUserID = new Set(
      existingData.details.map((item) => item.userMasterID),
    );

    // Users which are newly added
    const addUser = (userMasterID || []).filter(
      (id) => !existingUserID.has(id),
    );

    await TeamOvertimePlanning.update(
      {
        date,
        description,
      },

      {
        where: {
          teamOvertimePlanningID,
        },

        user: req.userDetails,
        transaction: transaction,
        individualHooks: true,
      },
    );

    if (addUser.length > 0) {
      const data = [];

      addUser.forEach((item) => {
        data.push({
          userMasterID: item,

          teamOvertimePlanningID,
        });
      });

      await TeamOvertimePlanningDetails.bulkCreate(
        data,

        {
          user: req.userDetails,
          transaction: transaction,
          individualHooks: true,
        },
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Team Overtime Planning'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteTeamOvertimePlanning = async (req, res, next) => {
  try {
    const { teamOvertimePlanningID } = req.body;
    const transaction = await sequelize.transaction();

    if (!teamOvertimePlanningID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,

        message: message.usermessage.ValidParameters,
      });
    }

    const existingData = await TeamOvertimePlanning.findOne({
      where: {
        teamOvertimePlanningID,
      },
    });

    if (!existingData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,

        message: message.usermessage.notFound('Team Overtime Planning'),
      });
    }

    await TeamOvertimePlanningDetails.destroy({
      where: {
        teamOvertimePlanningID,
      },
      user: req.userDetails,
      transaction: transaction,
      individualHooks: true,
    });

    await TeamOvertimePlanning.destroy({
      where: {
        teamOvertimePlanningID,
      },
      user: req.userDetails,
      transaction: transaction,
      individualHooks: true,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,

      message: message.usermessage.deleteMessage('Team Overtime Planning'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
