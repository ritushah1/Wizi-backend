const {Sequelize,Op} = require('sequelize');
const companyMaster = require('../models/companyMaster');
const RelievingLetter = require('../models/relievingLetter');
const sequelize = require('../config/database');
const UserLetters = require('../models/userLetters');

exports.addRelievingLetter = async (req, res, next) => {
  try {
    const {
      relievingLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber
    } = await req.body;

    const find_SameData = await RelievingLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('relievingLetterName'))
          ),
          relievingLetterName.trim().toLowerCase()
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1)
        )
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${relievingLetterName} already exist`,
      });
    }

    await RelievingLetter.create(
      {
        relievingLetterName,
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
        resetRefNumber
      },
      { user: req.userDetails }
    );

    return res.status(200).json({
      status: 200,
      message: 'RelievingLetter Letter Template Added successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.getRelievingLetter = async (req, res, next) => {
  try {
    const { relievingLetterID, limit, page, companyMasterID, searchQuery } =
      await req.body;

    if (relievingLetterID) {
      const getrelievingLetter = await RelievingLetter.findOne({
        raw: true,
        where: {
          relievingLetterID: relievingLetterID,
        },
        include: [
          {
            model: companyMaster,
          },
        ],
      });
      if (getrelievingLetter && getrelievingLetter.setReferenceNumber && getrelievingLetter.resetRefNumber && getrelievingLetter.currentSequence !== 1) {
        date = new Date()
        currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const getCurrentMonthGeneratedLetters = await UserLetters.findAll({
          where: {
            relievingLetterID:relievingLetterID,
            relievingLetterGeneratedAt:
              { [Op.gt]: currentMonth }
          }
        });
        if (getCurrentMonthGeneratedLetters.length == 0) {
          await RelievingLetter.update(
            {
              startingSequence: 1,
              currentSequence: 1
            },
            { where: { relievingLetterID } }
          );
          getrelievingLetter.startingSequence = 1
          getrelievingLetter.currentSequence = 1
        }

      }
      return res.status(200).json({
        status: 200,
        data: getrelievingLetter,
      });
    }

    const condition = {};

    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          relievingLetterName: {
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

    const { rows, count } = await RelievingLetter.findAndCountAll({
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

exports.updateRelievingLetter = async (req, res, next) => {
  try {
    const {
      relievingLetterID,
      relievingLetterName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence,
      resetRefNumber
    } = await req.body;

    const startSeq = parseInt(startingSequence);
    const currSeq = parseInt(currentSequence);

    if (
      setReferenceNum &&
      startSeq < currSeq
    ) {
      return res.status(200).send({
        status: 400,
        message: 'Starting sequence cannot be less than current sequence.',
      });
    }

    const find_SameData = await RelievingLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('relievingLetterName'))
          ),
          relievingLetterName.trim().toLowerCase()
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1)
        ),
        Sequelize.where(sequelize.col('relievingLetterID'), {
          [Sequelize.Op.ne]: relievingLetterID,
        })
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${relievingLetterName} already exist`,
      });
    }

    await RelievingLetter.update(
      {
        relievingLetterName,
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
        resetRefNumber
      },
      { where: { relievingLetterID: relievingLetterID } }
    );

    return res.status(200).json({
      status: 200,
      message: 'RelievingLetter Letter Updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteRelievingLetter = async (req, res, next) => {
  try {
    const { relievingLetterID } = await req.body;

    await RelievingLetter.update(
      { status: 2 },
      { where: { relievingLetterID: relievingLetterID } }
    );

    return res
      .status(200)
      .json({ status: 200, message: 'Letter deleted successfully' });
  } catch (err) {
    next(err);
  }
};
