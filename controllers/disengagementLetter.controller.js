const companyMaster = require('../models/companyMaster');
const DisengagementLetter = require('../models/disengagementLetter');
const UserLetters = require('../models/userLetters');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

exports.addDisengagementLetter = async (req, res, next) => {
  try {
    const {
      disengagementLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = await req.body;

    const find_SameData = await DisengagementLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('disengagementLetterName')),
          disengagementLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Letter with same name'),
      });
    }

    await DisengagementLetter.create(
      {
        disengagementLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        setReferenceNumber: setReferenceNum,
        startingSequence,
        prefix,
        refNoFormat,
        currentSequence: startingSequence,
        resetRefNumber,
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Disengagement Letter Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listDisengagementLetter = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery } = await req.body;
    const condition = {};
    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          disengagementLetterName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows, count } = await DisengagementLetter.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDisengagementLetterByID = async (req, res, next) => {
  try {
    const { disengagementLetterID } = await req.body;
    const getrelievingLetter = await DisengagementLetter.findOne({
      where: {
        disengagementLetterID: disengagementLetterID,
      },
      include: [
        {
          model: companyMaster,
        },
      ],
    });
    if (
      getrelievingLetter &&
      getrelievingLetter.setReferenceNumber &&
      getrelievingLetter.resetRefNumber &&
      getrelievingLetter.currentSequence !== 1
    ) {
      date = new Date();
      currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const getCurrentMonthGeneratedLetters = await UserLetters.findAll({
        where: {
          disengagementLetterID: disengagementLetterID,
          disengagementLetterGeneratedAt: { [Sequelize.Op.gt]: currentMonth },
        },
      });
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await DisengagementLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { disengagementLetterID } },
        );
        getrelievingLetter.startingSequence = 1;
        getrelievingLetter.currentSequence = 1;
      }
    }
    return res.status(200).json({
      status: 200,
      data: getrelievingLetter,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDisengagementLetter = async (req, res, next) => {
  try {
    const {
      disengagementLetterID,
      disengagementLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence,
      resetRefNumber,
    } = await req.body;

    const startSeq = parseInt(startingSequence);
    const currSeq = parseInt(currentSequence);

    if (setReferenceNum && startSeq < currSeq) {
      return res.status(200).send({
        status: 400,
        message: 'Starting sequence cannot be less than current sequence.',
      });
    }

    const find_SameData = await DisengagementLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        disengagementLetterID: {
          [Sequelize.Op.ne]: disengagementLetterID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('disengagementLetterName')),
          disengagementLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Disengagement Letter with same name',
        ),
      });
    }

    await DisengagementLetter.update(
      {
        disengagementLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        setReferenceNumber: setReferenceNum,
        startingSequence,
        prefix,
        refNoFormat,
        currentSequence:
          currentSequence == undefined ? startingSequence : currentSequence,
        resetRefNumber,
      },
      { where: { disengagementLetterID: disengagementLetterID } },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Disengagement Letter'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteDisengagementLetter = async (req, res, next) => {
  try {
    const { disengagementLetterID } = await req.body;

    if (!disengagementLetterID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Disengagement Letter'),
      });
    }

    const find_SameData = await DisengagementLetter.findOne({
      where: {
        disengagementLetterID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Disengagement Letter'),
      });
    }

    await DisengagementLetter.destroy({
      where: { disengagementLetterID: disengagementLetterID },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Disengagement Letter'),
    });
  } catch (err) {
    next(err);
  }
};
