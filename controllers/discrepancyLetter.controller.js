const DiscrepancyLetter = require("../models/discrepancyLetter");
const {Sequelize,Op} = require("sequelize");
const companyMaster = require("../models/companyMaster");
const sequelize = require("../config/database");
const { usermessage } = require("../response_message/message");
const EmployeeDiscrepancyLetter = require("../models/employeeDiscrepancyLetter");

exports.addDiscrepancyLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      discrepancyLetterName,
      letterTemplate,
      letterHead,
      companyMasterID,
      createByIp,
      setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence,
      resetRefNumber
    } = req.body;

    const find_SameData = await DiscrepancyLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            "TRIM",
            sequelize.fn("LOWER", sequelize.col("discrepancyLetterName"))
          ),
          discrepancyLetterName.trim().toLowerCase()
        ),
        Sequelize.where(sequelize.col("companyMasterID"), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col("status"), 0),
          Sequelize.where(sequelize.col("status"), 1)
        )
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${discrepancyLetterName} already exist`,
      });
    }

    await DiscrepancyLetter.create(
      {
        discrepancyLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
      setReferenceNumber:setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence:startingSequence,
      resetRefNumber
      },
      { user: req.userDetails, transaction }
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage("Discrepancy Letter"),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getDiscrepancyLetter = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, searchQuery } = await req.body;

    const condition = {};

    condition.status = 1;

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          incrementLetterName: {
            [Sequelize.Op.iLike]: "%" + searchQuery + "%",
          },
        },
        {
          "$companyMaster.companyName$": {
            [Sequelize.Op.iLike]: "%" + searchQuery + "%",
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [["createdAt", "DESC"]];

    const { rows, count } = await DiscrepancyLetter.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [{ model: companyMaster, attributes: ["companyName"] }],
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

exports.getDiscrepancyLetterByID = async (req, res, next) => {
  try {
    const { discrepancyLetterID } = await req.body;

    const getDiscrepancyLetter = await DiscrepancyLetter.findOne({
      raw: true,
      where: {
        discrepancyLetterID: discrepancyLetterID,
      },
      include: [
        {
          model: companyMaster,
        },
      ],
    });
    if (getDiscrepancyLetter && getDiscrepancyLetter.setReferenceNumber && getDiscrepancyLetter.resetRefNumber && getDiscrepancyLetter.currentSequence!==1) {
      date = new Date()
      currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const getCurrentMonthGeneratedLetters = await EmployeeDiscrepancyLetter.findAll({
        where: {
          discrepancyLetterID: discrepancyLetterID,
          createdAt:
            { [Op.gt]: currentMonth }
        }
      });
      if (getCurrentMonthGeneratedLetters.length == 0) {
        await DiscrepancyLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1
          },
          { where: { discrepancyLetterID } }
        );
        getDiscrepancyLetter.startingSequence = 1
        getDiscrepancyLetter.currentSequence = 1
      }

    }

    if (!getDiscrepancyLetter) {
      return res.status(200).json({
        status: 404,
        message: usermessage.notFoundMessage("Discrepancy Letter"),
      });
    }
    return res.status(200).json({
      status: 200,
      data: getDiscrepancyLetter,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateDiscrepancyLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      discrepancyLetterID,
      discrepancyLetterName,
      letterTemplate,
      letterHead,
      companyMasterID,
      updateByIp,
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
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Starting sequence cannot be less than current sequence.',
      });
    }

    const find_SameData = await DiscrepancyLetter.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            "TRIM",
            sequelize.fn("LOWER", sequelize.col("discrepancyLetterName"))
          ),
          discrepancyLetterName.trim().toLowerCase()
        ),
        Sequelize.where(sequelize.col("companyMasterID"), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col("status"), 0),
          Sequelize.where(sequelize.col("status"), 1)
        ),
        Sequelize.where(sequelize.col("discrepancyLetterID"), {
          [Sequelize.Op.ne]: discrepancyLetterID,
        })
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: `Letter with name ${discrepancyLetterName} already exist`,
      });
    }

    await DiscrepancyLetter.update(
      {
        discrepancyLetterName,
        letterTemplate,
        letterHead,
        companyMasterID,
        updateBy: req.userDetails.userMasterId,
        updateByIp,
         setReferenceNumber:setReferenceNum,
      startingSequence,
      prefix,
      refNoFormat,
      currentSequence,
      resetRefNumber
      },
      { where: { discrepancyLetterID } },
      { transaction }
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.updateMessage("Discrepancy Letter"),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteDiscrepancyLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { discrepancyLetterID } = await req.body;

    const findData = await DiscrepancyLetter.findByPk(discrepancyLetterID);

    await findData.destroy({
      user: req.userDetails,
      transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage("Discrepancy Letter"),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
