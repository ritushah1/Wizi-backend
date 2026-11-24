const companyMaster = require('../models/companyMaster');
const EmploymentCertificate = require('../models/employmentCertificate');
const UserLetters = require('../models/userLetters');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

exports.addEmploymentCertificate = async (req, res, next) => {
  try {
    const {
      employmentCertificateName,
      letterHead,
      letterTemplate,
      companyMasterID,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      resetRefNumber,
    } = await req.body;

    const find_SameData = await EmploymentCertificate.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('employmentCertificateName')),
          employmentCertificateName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 401,
        message: message.usermessage.alreadyExists('Letter with same name'),
      });
    }

    await EmploymentCertificate.create(
      {
        employmentCertificateName,
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
      message: message.usermessage.addMessage('Employment Proof Certificate'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listEmploymentCertificate = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery } = await req.body;
    const condition = {};
    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          employmentCertificateName: {
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

    const { rows, count } = await EmploymentCertificate.findAndCountAll({
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

exports.getEmploymentCertificateByID = async (req, res, next) => {
  try {
    const { employmentCertificateID } = await req.body;
    const getrelievingLetter = await EmploymentCertificate.findOne({
      where: {
        employmentCertificateID: employmentCertificateID,
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
          employmentCertificateID: employmentCertificateID,
          EmploymentCertificateGeneratedAt: { [Sequelize.Op.gt]: currentMonth },
        },
      });
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await EmploymentCertificate.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { employmentCertificateID } },
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

exports.updateEmploymentCertificate = async (req, res, next) => {
  try {
    const {
      employmentCertificateID,
      employmentCertificateName,
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

    const find_SameData = await EmploymentCertificate.findOne({
      where: {
        companyMasterID,
        status: { [Sequelize.Op.in]: [0, 1] },
        employmentCertificateID: {
          [Sequelize.Op.ne]: employmentCertificateID,
        },
        [Sequelize.Op.and]: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('employmentCertificateName')),
          employmentCertificateName.trim().toLowerCase(),
        ),
      },
    });

    if (find_SameData) {
      return res.status(200).send({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Employment Proof Certificate with same name',
        ),
      });
    }

    await EmploymentCertificate.update(
      {
        employmentCertificateName: employmentCertificateName.trim(),
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
      { where: { employmentCertificateID: employmentCertificateID } },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage(
        'Employment Proof Certificate',
      ),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmploymentCertificate = async (req, res, next) => {
  try {
    const { employmentCertificateID } = await req.body;

    if (!employmentCertificateID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage(
          'Employment Proof Certificate',
        ),
      });
    }

    const find_SameData = await EmploymentCertificate.findOne({
      where: {
        employmentCertificateID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage(
          'Employment Proof Certificate',
        ),
      });
    }

    await EmploymentCertificate.destroy({
      where: { employmentCertificateID: employmentCertificateID },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage(
        'Employment Proof Certificate',
      ),
    });
  } catch (err) {
    next(err);
  }
};
