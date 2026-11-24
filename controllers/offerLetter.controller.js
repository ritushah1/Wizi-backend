const { Sequelize, Op } = require('sequelize');
const companyMaster = require('../models/companyMaster');
const OfferLetter = require('../models/offerLetter');
const sequelize = require('../config/database');
const UserLetters = require('../models/userLetters');

exports.addOfferLetter = async (req, res, next) => {
  try {
    const {
      offerLetterName,
      letterTemplate,
      letterHead,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const find_SameData = await OfferLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('offerLetterName')),
          ),
          offerLetterName.trim().toLowerCase(),
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
        message: `Letter with name ${offerLetterName} already exist`,
      });
    }
    await OfferLetter.create({
      offerLetterName,
      letterTemplate,
      letterHead,
      companyMasterID,
      createBy,
      createByIp,
      setReferenceNumber: setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence: startingSequence,
      resetRefNumber,
    });

    return res
      .status(200)
      .json({ status: 200, message: 'Letter created Successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateOfferLetter = async (req, res, next) => {
  try {
    const {
      offerLetterID,
      offerLetterName,
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
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const startSeq = parseInt(startingSequence);
    const currSeq = parseInt(currentSequence);

    if (setReferenceNum && startSeq < currSeq) {
      return res.status(200).send({
        status: 400,
        message: 'Starting sequence cannot be less than current sequence.',
      });
    }

    const find_SameData = await OfferLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('offerLetterName')),
          ),
          offerLetterName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('offerLetterID'), {
          [Sequelize.Op.ne]: offerLetterID,
        }),
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${offerLetterName} already exist`,
      });
    }

    await OfferLetter.update(
      {
        offerLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        updateBy,
        updateByIp,
        setReferenceNumber: setReferenceNum,
        startingSequence,
        prefix,
        refNoFormat,
        currentSequence: currentSequence ? currentSequence : startingSequence,
        resetRefNumber,
      },
      { where: { offerLetterID: offerLetterID } },
    );

    return res
      .status(200)
      .json({ status: 200, message: 'Letter updated Successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteOfferLetter = async (req, res, next) => {
  try {
    const { offerLetterID } = await req.body;

    await OfferLetter.update(
      { status: 2 },
      { where: { offerLetterID: offerLetterID } },
    );

    return res
      .status(200)
      .json({ status: 200, message: 'Letter deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getOfferLetter = async (req, res, next) => {
  try {
    const { offerLetterID, limit, page, companyMasterID, searchQuery } =
      await req.body;

    if (offerLetterID) {
      const getPreboardingMasters = await OfferLetter.findOne({
        raw: true,
        where: {
          offerLetterID: offerLetterID,
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
            offerLetterID: offerLetterID,
            offerLetterGeneratedAt: { [Op.gt]: currentMonth },
          },
        });
        if (getCurrentMonthGeneratedLetters.length == 0) {
          await OfferLetter.update(
            {
              startingSequence: 1,
              currentSequence: 1,
            },
            { where: { offerLetterID } },
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
          offerLetterName: {
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

    const preBoardingMasters = await OfferLetter.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    return res.status(200).json({
      status: 200,
      data: preBoardingMasters.rows,
      totalcount: preBoardingMasters.count,
    });
  } catch (err) {
    next(err);
  }
};
