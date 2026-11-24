const companyMaster = require('../models/companyMaster');
const ConfirmationLetter = require('../models/confirmationLetter');
const UserLetters = require('../models/userLetters');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

exports.addConfirmationLetter = async (req, res, next) => {
  try {
    const {
      confirmationLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = await req.body;

    const find_SameData = await ConfirmationLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('confirmationLetterName')),
          confirmationLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Letter with same name'),
      });
    }

    await ConfirmationLetter.create(
      {
        confirmationLetterName,
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
      message: message.usermessage.addMessage('Confirmation Letter Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listConfirmationLetter = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery } = await req.body;
    const condition = {};
    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          confirmationLetterName: {
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

    const { rows, count } = await ConfirmationLetter.findAndCountAll({
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

exports.getConfirmationLetterByID = async (req, res, next) => {
  try {
    const { confirmationLetterID } = await req.body;
    const getconfirmationLetter = await ConfirmationLetter.findOne({
      where: {
        confirmationLetterID: confirmationLetterID,
      },
      include: [
        {
          model: companyMaster,
        },
      ],
    });
    if (
      getconfirmationLetter &&
      getconfirmationLetter.setReferenceNumber &&
      getconfirmationLetter.resetRefNumber &&
      getconfirmationLetter.currentSequence !== 1
    ) {
      date = new Date();
      currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const getCurrentMonthGeneratedLetters = await UserLetters.findAll({
        where: {
          confirmationLetterID: confirmationLetterID,
          confirmationLetterGeneratedAt: { [Sequelize.Op.gt]: currentMonth },
        },
      });
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await ConfirmationLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { confirmationLetterID } },
        );
        getconfirmationLetter.startingSequence = 1;
        getconfirmationLetter.currentSequence = 1;
      }
    }
    return res.status(200).json({
      status: 200,
      data: getconfirmationLetter,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConfirmationLetter = async (req, res, next) => {
  try {
    const {
      confirmationLetterID,
      confirmationLetterName,
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

    const find_SameData = await ConfirmationLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        confirmationLetterID: {
          [Sequelize.Op.ne]: confirmationLetterID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('confirmationLetterName')),
          confirmationLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Confirmation Letter with same name',
        ),
      });
    }

    await ConfirmationLetter.update(
      {
        confirmationLetterName,
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
      { where: { confirmationLetterID: confirmationLetterID } },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Confirmation Letter'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteConfirmationLetter = async (req, res, next) => {
  try {
    const { confirmationLetterID } = await req.body;

    if (!confirmationLetterID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Confirmation Letter'),
      });
    }

    const find_SameData = await ConfirmationLetter.findOne({
      where: {
        confirmationLetterID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Confirmation Letter'),
      });
    }

    await ConfirmationLetter.destroy({
      where: { confirmationLetterID: confirmationLetterID },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Confirmation Letter'),
    });
  } catch (err) {
    next(err);
  }
};
