const Sequelize = require('sequelize');
const UserChats = require('../models/userChats');
const logger = require('../config/logger');
const sequelize = require('../config/database');
// const message = require('../response_message/message')
const { executeQuery } = require('./common.controller');
const UserMaster = require('../models/userMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const {
  sendNotification,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const message = require('../response_message/message');

const notification_options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};

//send message
exports.postSendMessage = async (req, res, next) => {
  try {
    let {
      senderID,
      receiverID,
      message,
      msgstatus,
      status,
      createBy,
      createByIp,
    } = await req.body;
    let insert_db_status;

    let path = '';
    if (req.file) {
      path = req.file.filename;
    }

    let result = await sequelize.transaction(async (t) => {
      insert_db_status = await UserChats.create(
        {
          senderID,
          receiverID,
          message,
          msgstatus,
          path,
          status,
          createBy,
          createByIp,
        },
        { transaction: t },
      );

      let get_user = await UserMaster.findOne({
        where: {
          userMasterID: senderID,
          status: 1,
        },
      });

      const notification = {
        title: get_user.displayName,
        body: message,
      };
      const data = {
        screen: 'chat',
        senderID: senderID.toString(),
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };
      await sendNotification(receiverID, notification, data);

      return res.status(200).json({
        status: 200,
        message: 'Message sent successfully',
        data: insert_db_status,
      });
    });
  } catch (err) {
    next(err);
  }
};


//get user with last msg list
exports.getuserList_V2 = async (req, res, next) => {
  try {
    const { limit, page, receiverID } = req.body;
    const currentDate = new Date();

    // Step 1: Get chat mapping with latest messages (database-level aggregation)
    const [senderResult, receiverResult] = await Promise.all([
      executeQuery(
        `SELECT DISTINCT "senderID" as userId, MAX("userChatsID") as userChatsID 
         FROM "public"."userChats" 
         WHERE status=1 AND "receiverID"= :receiverID
         GROUP BY "senderID"`,
        {
          replacements: {
            receiverID: receiverID,
          },
        },
      ),
      executeQuery(
        `SELECT DISTINCT "receiverID" as userId, MAX("userChatsID") as userChatsID 
         FROM "public"."userChats" 
         WHERE status=1 AND "senderID"= :receiverID
         GROUP BY "receiverID"`,
        {
          replacements: {
            receiverID: receiverID,
          },
        },
      ),
    ]);

    // Step 2: Build efficient chat map (O(n) complexity)
    const chatMap = new Map();

    [...senderResult, ...receiverResult].forEach((row) => {
      const existingChatID = chatMap.get(row.userid);
      if (!existingChatID || existingChatID < row.userchatsid) {
        chatMap.set(row.userid, row.userchatsid);
      }
    });

    // Step 3: Sort by chatID descending (latest chats first)
    const sortedEntries = Array.from(chatMap.entries()).sort(
      (a, b) => b[1] - a[1],
    ); // Sort by userChatsID descending

    const totalcount = sortedEntries.length;

    // Step 4: Apply pagination BEFORE fetching data (critical for performance)
    let paginatedEntries = sortedEntries;
    if (limit && page) {
      const offset = (Number(page) - 1) * Number(limit);
      paginatedEntries = sortedEntries.slice(offset, offset + Number(limit));
    }

    const paginatedUserIDs = paginatedEntries.map(([userId]) => userId);
    const paginatedChatIDs = paginatedEntries.map(([, chatId]) => chatId);

    // Step 5: Fetch only paginated data in parallel
    const [chats, users] = await Promise.all([
      UserChats.findAll({
        raw: true,
        where: { userChatsID: paginatedChatIDs },
      }),
      UserMaster.findAll({
        where: { userMasterID: paginatedUserIDs },
        attributes: [
          'userMasterID',
          'firstName',
          'lastName',
          'displayName',
          'email',
          'userNumber',
          'photo',
        ],
        include: [
          {
            model: EmployeeDesignation,
            required: false, // LEFT JOIN - don't exclude users without designation
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['designationID'],
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
          {
            model: EmployeeBranch,
            required: false, // LEFT JOIN
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['branchID'],
            include: [
              {
                model: BranchMaster,
                as: 'branchMaster',
                attributes: ['branchName'],
              },
            ],
          },
          {
            model: EmployeeDepartment,
            required: false, // LEFT JOIN
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['departmentID'],
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['departmentName'],
              },
            ],
          },
        ],
      }),
    ]);

    // Step 6: Create lookup maps
    const chatLookup = new Map(chats.map((chat) => [chat.userChatsID, chat]));
    const userLookup = new Map(users.map((user) => [user.userMasterID, user]));

    // Step 7: Build final data array maintaining sort order
    const finaldata = paginatedEntries
      .map(([userId, chatId]) => {
        const chat = chatLookup.get(chatId);
        const user = userLookup.get(userId);

        if (!chat || !user) return null;

        // Format user data
        const userData = user.toJSON ? user.toJSON() : user;
        const formattedUser = {
          ...userData,
          designation:
            userData.employeeDesignations?.[0]?.designation?.designationName ||
            '',
          department:
            userData.employeeDepartments?.[0]?.department?.departmentName || '',
          branch:
            userData.employeeBranches?.[0]?.branchMaster?.branchName || '',
        };

        // Remove nested objects to clean up response
        delete formattedUser.employeeDesignations;
        delete formattedUser.employeeDepartments;
        delete formattedUser.employeeBranches;

        return {
          ...chat,
          employee: formattedUser,
        };
      })
      .filter(Boolean);

    // Step 8: Fetch unread message counts in bulk using single query
    const messageCountQuery = finaldata
      .map((item) => {
        const id1 =
          item.senderID === receiverID ? item.senderID : item.receiverID;
        const id2 =
          item.senderID === receiverID ? item.receiverID : item.senderID;
        return `("receiverID" = ${id1} AND "senderID" = ${id2})`;
      })
      .join(' OR ');

    let messageCounts = [];
    if (messageCountQuery) {
      const countResults = await executeQuery(
        `SELECT 
          CASE 
            WHEN "receiverID" = ${receiverID} THEN "senderID"
            ELSE "receiverID"
          END as userId,
          COUNT(*) as count
         FROM "public"."userChats"
         WHERE msgstatus = 1 AND status = 1 AND (${messageCountQuery})
         GROUP BY userId`,
      );

      const countMap = new Map(
        countResults.map((r) => [r.userid, parseInt(r.count)]),
      );

      messageCounts = finaldata.map((item) => {
        const userId =
          item.senderID === receiverID ? item.receiverID : item.senderID;
        return countMap.get(userId) || 0;
      });
    }

    // Step 9: Add message counts to final data
    finaldata.forEach((item, index) => {
      item.messageCount = messageCounts[index] || 0;
    });

    return res.status(200).json({
      status: 200,
      data: finaldata,
      totalcount,
    });
  } catch (err) {
    console.error('Error in getuserList_V2:', err);
    next(err);
  }
};

exports.getUserNewMessageCount = async (req, res, next) => {
  try {
    const count = await UserChats.count({
      distinct: true,
      where: {
        msgstatus: 1,
        receiverID: req?.userDetails?.userMasterId,
        status: 1,
      },
      limit: 100,
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserLastChatBySenderID = async (req, res, next) => {
  try {
    const { messageSent, receiverID } = req.body;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!receiverID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: message.errorMessage.INVALID_REQUEST,
      });

    const condition = {
      senderID: receiverID,
      status: 1,
      msgstatus: 1,
    };

    if (!messageSent) condition.receiverID = req?.userDetails?.userMasterId;

    const limitQuery = messageSent ? { limit: 1 } : {};

    const userLastChat = await UserChats.findAll({
      where: condition,
      order: [['createdAt', 'DESC']],
      ...limitQuery,
    });

    if (userLastChat.length == 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: null,
      });
    }

    const userDetails = await UserMaster.findOne({
      where: {
        userMasterID: messageSent ? userLastChat[0]?.receiverID : receiverID,
        status: 1,
      },
      attributes: userAttributes,
      include: [
        {
          model: EmployeeDesignation,
          required: false, // LEFT JOIN - don't exclude users without designation
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
      ],
    });

    const finalData = {
      id: userDetails.userMasterID,
      title: userDetails.displayName,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      designation:
        userDetails.employeeDesignations[0]?.designation?.designationName,
      img: userDetails.photo ? 'uploads/user/photo/' + userDetails.photo : null,
      lastMessageTime: userLastChat[0]?.createdAt,
      msg: userLastChat[0]?.message,
      attachment: userLastChat[0]?.path,
      messageCount: messageSent ? 0 : userLastChat.length,
    };

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

//user wise chat history
exports.getuserWiseChat = async (req, res, next) => {
  try {
    const { limit, page, receiverID, senderID } = await req.body;

    const condition = {
      [Sequelize.Op.or]: [
        {
          senderID: senderID,
          receiverID: receiverID,
        },
        {
          senderID: receiverID,
          receiverID: senderID,
        },
      ],
    };

    const paginationQuery =
      page && limit
        ? {
            limit,
            offset: (page - 1) * limit,
          }
        : {};

    const userChats = await UserChats.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
    });

    await UserChats.update(
      {
        msgstatus: 2,
      },
      {
        where: {
          receiverID: senderID,
          senderID: receiverID,
          status: 1,
        },
      },
    );

    return res
      .status(200)
      .json({ status: 200, data: userChats.rows, totalcount: userChats.count });
  } catch (err) {
    next(err);
  }
};

//Delete particular msg [Array of IDs]
exports.postdeletechat = async (req, res, next) => {
  try {
    let { userChatsID, updateBy, status, updateByIp } = await req.body;

    let update_data = await sequelize.transaction(async (t) => {
      let change_data = await UserChats.update(
        {
          updateBy,
          updateByIp,
          status,
        },
        {
          where: {
            userChatsID: userChatsID,
          },
          transaction: t,
        },
      );

      return res.status(200).json({
        status: 200,
        message: 'Message deleted successfully',
      });
    });
  } catch (err) {
    next(err);
  }
};
