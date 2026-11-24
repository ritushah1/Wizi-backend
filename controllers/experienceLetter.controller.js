const { Sequelize, Op } = require('sequelize');
const companyMaster = require('../models/companyMaster');
const experienceLetter = require('../models/experienceletter');
const sequelize = require('../config/database');
const { usermessage } = require('../response_message/message');
const { Status } = require('cucumber');
const UserLetters = require('../models/userLetters');

exports.addExperienceLetter = async (req, res, next) => {
  try {
    const {
      experienceLetterName,
      letterTemplate,
      letterHead,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = req.body;

    const find_SameData = await experienceLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('experienceLetterName')),
          ),
          experienceLetterName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${experienceLetterName} already exist`,
      });
    }
    await experienceLetter.create(
      {
        experienceLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
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
      message: usermessage.addMessage('ExperienceLetter'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getExperienceLetter = async (req, res, next) => {
  try {
    const { experienceLetterID, limit, page, companyMasterID, searchQuery } =
      await req.body;

    if (experienceLetterID) {
      const getPreboardingMasters = await experienceLetter.findOne({
        raw: true,
        where: {
          experienceLetterID: experienceLetterID,
        },
        include: [
          {
            model: companyMaster,
          },
        ],
      });
      if (
        getPreboardingMasters &&
        getPreboardingMasters.setReferenceNumber &&
        getPreboardingMasters.resetRefNumber &&
        getPreboardingMasters.currentSequence !== 1
      ) {
        date = new Date();
        currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const getCurrentMonthGeneratedLetters = await UserLetters.findAll({
          where: {
            experienceLetterID: experienceLetterID,
            experienceLetterGeneratedAt: { [Op.gt]: currentMonth },
          },
        });
        if (getCurrentMonthGeneratedLetters.length == 0) {
          await experienceLetter.update(
            {
              startingSequence: 1,
              currentSequence: 1,
            },
            { where: { experienceLetterID } },
          );
          getPreboardingMasters.startingSequence = 1;
          getPreboardingMasters.currentSequence = 1;
        }
      }
      return res.status(200).json({
        status: 200,
        data: getPreboardingMasters,
      });
    }

    const condition = {};

    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          experienceLetterName: {
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

    const { rows, count } = await experienceLetter.findAndCountAll({
      raw: true,
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

exports.updateExperienceLetter = async (req, res, next) => {
  try {
    const {
      experienceLetterID,
      experienceLetterName,
      letterTemplate,
      letterHead,
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

    const find_SameData = await experienceLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('experienceLetterName')),
          ),
          experienceLetterName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('experienceLetterID'), {
          [Sequelize.Op.ne]: experienceLetterID,
        }),
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${experienceLetterName} already exist`,
      });
    }

    await experienceLetter.update(
      {
        experienceLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
        setReferenceNumber: setReferenceNum,
        startingSequence,
        prefix,
        refNoFormat,
        currentSequence: currentSequence ? currentSequence : startingSequence,
        resetRefNumber,
      },
      { where: { experienceLetterID: experienceLetterID } },
    );

    return res.status(200).json({
      status: 200,
      message: usermessage.updateMessage('ExperienceLetter'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteExperienceLetter = async (req, res, next) => {
  try {
    const { experienceLetterID } = await req.body;

    const findData = await experienceLetter.findByPk(experienceLetterID);

    await findData.destroy({
      user: req.userDetails, // Assuming you have proper handling for this
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('ExperienceLetter'),
    });
  } catch (err) {
    next(err);
  }
};
