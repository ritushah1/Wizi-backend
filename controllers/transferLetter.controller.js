const companyMaster = require('../models/companyMaster');
const TransferLetter = require('../models/transferLetter');
const UserLetters = require('../models/userLetters');
const UserTransferLetter = require('../models/userTransferLetter');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

exports.addTransferLetter = async (req, res, next) => {
  try {
    const {
      transferLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = await req.body;

    const find_SameData = await TransferLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('transferLetterName')),
          transferLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Letter with same name'),
      });
    }

    await TransferLetter.create(
      {
        transferLetterName,
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
      message: message.usermessage.addMessage('Transfer Letter Template'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listTransferLetter = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery } = await req.body;
    const condition = {};
    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          transferLetterName: {
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

    const { rows, count } = await TransferLetter.findAndCountAll({
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

exports.getTransferLetterByID = async (req, res, next) => {
  try {
    const { transferLetterID } = await req.body;
    const getTransferLetter = await TransferLetter.findOne({
      where: {
        transferLetterID: transferLetterID,
      },
      include: [
        {
          model: companyMaster,
        },
      ],
    });
    if (
      getTransferLetter &&
      getTransferLetter.setReferenceNumber &&
      getTransferLetter.resetRefNumber &&
      getTransferLetter.currentSequence !== 1
    ) {
      date = new Date();
      currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const getCurrentMonthGeneratedLetters = await UserTransferLetter.findAll({
        where: {
          transferLetterID: transferLetterID,
          createdAt: { [Sequelize.Op.gt]: currentMonth },
        },
      });
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await TransferLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { transferLetterID } },
        );
        getTransferLetter.startingSequence = 1;
        getTransferLetter.currentSequence = 1;
      }
    }
    return res.status(200).json({
      status: 200,
      data: getTransferLetter,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTransferLetter = async (req, res, next) => {
  try {
    const {
      transferLetterID,
      transferLetterName,
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

    const find_SameData = await TransferLetter.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        transferLetterID: {
          [Sequelize.Op.ne]: transferLetterID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('transferLetterName')),
          transferLetterName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Transfer Letter with same name',
        ),
      });
    }

    await TransferLetter.update(
      {
        transferLetterName,
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
      { where: { transferLetterID: transferLetterID } },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Transfer Letter'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteTransferLetter = async (req, res, next) => {
  try {
    const { transferLetterID } = await req.body;

    if (!transferLetterID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Transfer Letter'),
      });
    }

    const find_SameData = await TransferLetter.findOne({
      where: {
        transferLetterID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Transfer Letter'),
      });
    }

    await TransferLetter.destroy({
      where: { transferLetterID: transferLetterID },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Transfer Letter'),
    });
  } catch (err) {
    next(err);
  }
};
