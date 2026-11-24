const WorkAgreement = require('../models/workAgreement');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const empWorkAgreement = require('../models/empWorkAgreement');

exports.addWorkAgreement = async (req, res, next) => {
  try {
    const {
      workAgreementName,
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

    const find_SameData = await WorkAgreement.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('workAgreementName')),
          ),
          workAgreementName.trim().toLowerCase(),
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
        message: `Work Agreement with name ${workAgreementName} already exist`,
      });
    }

    await WorkAgreement.create({
      workAgreementName,
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

    return res.status(200).json({
      status: 200,
      message: 'Work Agreement created Successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.updateWorkAgreement = async (req, res, next) => {
  try {
    const {
      workAgreementID,
      workAgreementName,
      letterTemplate,
      letterHead,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence,
      resetRefNumber,
    } = req.body;
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

    const find_SameData = await WorkAgreement.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('workAgreementName')),
          ),
          workAgreementName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('workAgreementID'), {
          [Sequelize.Op.ne]: workAgreementID,
        }),
      ),
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: `Work Agreement with name ${workAgreementName} already exist`,
      });
    }

    await WorkAgreement.update(
      {
        workAgreementName,
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
      {
        where: {
          workAgreementID: workAgreementID,
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message: 'Work Agreement updated Successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteWorkAgreement = async (req, res, next) => {
  try {
    const { workAgreementID } = req.body;

    await WorkAgreement.update(
      {
        status: 2,
      },
      {
        where: {
          workAgreementID: workAgreementID,
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message: 'Work Agreement deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.getWorkAgreement = async (req, res, next) => {
  try {
    const { workAgreementID, limit, page, companyMasterID, searchQuery } =
      req.body;

    // Get single Work Agreement
    if (workAgreementID) {
      const getWorkAgreement = await WorkAgreement.findOne({
        raw: true,
        where: {
          workAgreementID: workAgreementID,
        },
        include: [
          {
            model: companyMaster,
          },
        ],
      });

      // /*
      //  * Reset reference number at the beginning
      //  * of the month if required.
      //  */
      if (
        getWorkAgreement &&
        getWorkAgreement.setReferenceNumber &&
        getWorkAgreement.resetRefNumber &&
        getWorkAgreement.currentSequence !== 1
      ) {
        const date = new Date();

        const currentMonth = new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        );

        const getCurrentMonthGeneratedAgreements =
          await empWorkAgreement.findAll({
            where: {
              agreementID: workAgreementID,
              agreementGeneratedAt: {
                [Sequelize.Op.gt]: currentMonth,
              },
            },
          });

        if (getCurrentMonthGeneratedAgreements.length === 0) {
          await WorkAgreement.update(
            {
              startingSequence: 1,
              currentSequence: 1,
            },
            {
              where: {
                workAgreementID,
              },
            }
          );

          getWorkAgreement.startingSequence = 1;
          getWorkAgreement.currentSequence = 1;
        }
      }

      return res.status(200).json({
        status: 200,
        data: getWorkAgreement,
      });
    }

    // List
    const condition = {};
    condition.status = 1;
    if (companyMasterID) {
      condition.companyMasterID = companyMasterID;
    }

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          workAgreementName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    // Pagination
    const paginationQuery = {};

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const workAgreements = await WorkAgreement.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: workAgreements.rows,
      totalcount: workAgreements.count,
    });
  } catch (err) {
    next(err);
  }
};
