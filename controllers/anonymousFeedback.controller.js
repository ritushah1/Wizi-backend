const Sequelize = require('sequelize');
const anonymousFeedback = require('../models/anonymousFeedback');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const { generateExcel } = require('../utils/exportData');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const moment = require('moment');
exports.postadd = async (req, res, next) => {
  try {
    const { feedback, createByIp } = await req.body;

    await anonymousFeedback.create(
      {
        feedback,
        userMasterID: req.userDetails.userMasterId,
        createBy: req.userDetails.userMasterId,
        createByIp,
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Anonymous Feedback'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listdata = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      searchQuery,
      Export,
      startdate,
      enddate,
      companyMasterID,
    } = req.body;

    const condition = {};

    // if (startdate && enddate) {
    //   condition.createdAt = {
    //     [Sequelize.Op.between]: [startdate, enddate],
    //   };
    // }
    if (startdate && enddate) {
      let start = new Date(startdate);
      start.setHours(0, 0, 0, 0);

      let end = new Date(enddate);
      end.setHours(23, 59, 59, 999);

      condition.createdAt = {
        [Sequelize.Op.between]: [start, end],
      };
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { feedback: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
      ];

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    const { rows, count } = await anonymousFeedback.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: UserMaster,
          required: true,
          where: { companyMasterId: companyMasterID },
          attributes: [],
        },
      ],
      order: [['AnonymousFeedbackID', 'DESC']],
      attributes: ['AnonymousFeedbackID', 'feedback', 'createdAt'],
    });
    if (Export) {
      const finaldata = rows.map((e) => {
        return {
          Feedback: e.feedback,
          //   'Date': e.createdAt ||  'dd-MM-yyyy HH:mm',
          Date: e.createdAt
            ? moment(e.createdAt).format('DD-MM-YYYY HH:mm')
            : 'dd-MM-yyyy HH:mm',
          //   'Created By Name': e.ticketCreatedBy.displayName,
          //   'Assigned To Name': e.ticketAssignedTo.displayName
        };
      });
      await generateExcel(finaldata, 'Anonymous Feedback ', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};
