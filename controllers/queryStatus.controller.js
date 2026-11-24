const message = require('../response_message/message');
const CompanyQuery = require('../models/companyQuery');
const UserMaster = require('../models/userMaster');
const QueryStatus = require('../models/queryStatus');

exports.postAddQueryStatus = async (req, res, next) => {
  try {
    const { statusID, companyQueryID, solution, timeTaken } = req.body;

    await QueryStatus.create(
      {
        statusID,
        companyQueryID,
        solution,
        timeTaken
      },
      {
        user: req.userDetails,
      }
    );

    res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Status'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllQueryStatus = async (req, res, next) => {
  try {
    const { companyQueryID } = req.body;

    const { rows, count } = await QueryStatus.findAndCountAll({
      where: {
        companyQueryID: companyQueryID,
      },
      order:[['createdAt','DESC']],
      include: [
        {
          model: CompanyQuery,
          required: true,
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
      ],
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateQueryStatus = async (req, res, next) => {
  try {
    const { queryStatusID, statusID, solution, timeTaken } = req.body;

    const existData = await QueryStatus.findOne({
      where: {
        queryStatusID,
      },
    });

    if (!existData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Query'),
      });
    }

    await QueryStatus.update(
      {
        statusID,
        solution,
        timeTaken
      },
      {
        where: {
          queryStatusID,
        },
        individualHooks: true,
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Status'),
    });
  } catch (error) {
    next(error);
  }
};
