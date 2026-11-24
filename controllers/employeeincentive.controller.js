const Sequelize = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const Incentivetype = require('../models/incentivetype');
const employeeincentive = require('../models/employeeincentive');
const companyMaster = require('../models/companyMaster');
const { executeQuery } = require('./common.controller');
const Employeeincentive = require('../models/employeeincentive');
const { generateExcel } = require('../utils/exportData');
const { Op } = require('sequelize');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const { month_dict } = require('../utils/commonUtilFunctions');
const {
  nonEditableList_INC,
  PayrollFrequencyType,
} = require('../utils/dbUtils');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { ProjectName, projectNamesList } = require('../utils/labelUtils');

exports.postAddemployeeincentivetype = async (req, res, next) => {
  try {
    let {
      userMasterID,
      yearmonth,
      amount,
      IncentivetypeID,
      incentivetypename,
      incentiveDate,
      status,
      description,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (
      !userMasterID ||
      !yearmonth ||
      amount < 0 ||
      !IncentivetypeID ||
      !incentiveDate
    ) {
      return res.status(200).json({
        status: 401,
        message: 'Please send valid body request!',
      });
    }

    const findIncentiveType = await Incentivetype.findOne({
      raw: true,
      where: {
        IncentivetypeID,
      },
    });

    if (
      findIncentiveType &&
      nonEditableList_INC.includes(
        String(findIncentiveType.incentivetypename).trim().toLowerCase(),
      )
    ) {
      return res.status(200).send({
        status: 401,
        message: `Adding an incentive for '${findIncentiveType.incentivetypename}' is not allowed. Please choose a different incentive type.`,
      });
    }

    if (incentiveDate.slice(0, 4) + incentiveDate.slice(5, 7) != yearmonth)
      return res.status(200).send({
        status: 401,
        message: `Incentive Date is not range of this month`,
      });

    const [joiningData, salaryData, incentiveData] = await Promise.all([
      EmployeeJoiningDetails.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
        },
        attributes: ['userMasterID', 'payrollFrequency'],
      }),
      HRSalaryTrasaction.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
          [Sequelize.Op.or]: [
            {
              salaryYYYYMM: +yearmonth,
            },
            {
              startDate: {
                [Sequelize.Op.lte]: incentiveDate,
              },
              endDate: {
                [Sequelize.Op.gte]: incentiveDate,
              },
            },
          ],
        },
        include: [{ model: UserMaster, attributes: ['displayName'] }],
      }),
      Employeeincentive.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
          yearmonth: +yearmonth,
          IncentivetypeID: IncentivetypeID,
          incentiveDate: incentiveDate,
          status: 1,
        },
      }),
    ]);

    const finalData = [];
    let message = '';

    await sequelize.transaction(async (t) => {
      for (const userid of userMasterID) {
        const payrollFrequency =
          joiningData.find((e) => e.userMasterID == userid)?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;

        let salary = null;
        let label = 'month';

        if (ProjectName == projectNamesList.PIH) {
          if (payrollFrequency != PayrollFrequencyType.MONTHLY) {
            label = 'fortnight';
          }

          salary = salaryData.find(
            (e) =>
              e.payrollFrequency == payrollFrequency &&
              new Date(e.startDate) <= new Date(incentiveDate) &&
              new Date(e.endDate) >= new Date(incentiveDate),
          );
        } else {
          salary = salaryData.find(
            (e) =>
              e.payrollFrequency == payrollFrequency &&
              e.salaryYYYYMM == yearmonth,
          );
        }

        if (salary) {
          message = `Salary already calculated for this ${label} of ${salary.userMaster?.displayName}.`;
          break;
        }

        const incentive = incentiveData.find((e) => e.userMasterID == userid);

        if (!incentive) {
          finalData.push({
            userMasterID: userid,
            yearmonth,
            amount,
            IncentivetypeID,
            incentivetypename,
            incentiveDate,
            status,
            description,
            createBy,
            createByIp,
          });

          continue;
        }

        await Employeeincentive.update(
          {
            amount,
            updateBy: +createBy,
            updateByIp: createByIp,
          },
          {
            where: {
              employeeincentiveID: incentive.employeeincentiveID,
            },
            transaction: t,
          },
        );
      }

      if (!message)
        await Employeeincentive.bulkCreate(finalData, { transaction: t });
    });

    if (message)
      return res.status(200).json({
        status: 401,
        message,
      });

    return res.status(200).json({
      status: 200,
      message: 'Employee Incentive Added successfully.',
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateemployeeincentive = async (req, res, next) => {
  try {
    let {
      employeeincentiveID,
      yearmonth,
      amount,
      IncentivetypeID,
      incentivetypename,
      incentiveDate,
      description,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (
      !employeeincentiveID ||
      !yearmonth ||
      amount < 0 ||
      !IncentivetypeID ||
      !incentiveDate
    ) {
      return res.status(200).json({
        status: 401,
        message: 'Please send valid body request!',
      });
    }

    const data = await Employeeincentive.findByPk(employeeincentiveID, {
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID'],
          include: [
            {
              model: EmployeeJoiningDetails,
              attributes: ['userMasterID', 'payrollFrequency'],
            },
          ],
        },
      ],
    });

    if (!data) {
      return res.status(200).json({
        status: 401,
        message: `data not found!`,
      });
    }

    const findIncentiveType = await Incentivetype.findOne({
      raw: true,
      where: {
        IncentivetypeID,
      },
    });

    if (
      findIncentiveType &&
      nonEditableList_INC.includes(
        String(findIncentiveType.incentivetypename).trim().toLowerCase(),
      )
    ) {
      return res.status(200).send({
        status: 401,
        message: `Adding an incentive for '${findIncentiveType.incentivetypename}' is not allowed. Please choose a different incentive type.`,
      });
    }

    const userMasterID = data.userMasterID;

    if (incentiveDate.slice(0, 4) + incentiveDate.slice(5, 7) != yearmonth)
      return res.status(200).send({
        status: 401,
        message: `Incentive Date is not range of this month`,
      });

    const payrollFrequency =
      data.userMaster?.employeeJoiningDetails?.[0]?.payrollFrequency ||
      PayrollFrequencyType.MONTHLY;

    const condition = { userMasterID, payrollFrequency };

    let label = 'month';
    if (ProjectName == projectNamesList.PIH) {
      if (payrollFrequency != PayrollFrequencyType.MONTHLY) {
        label = 'fortnight';
      }
      condition.startDate = {
        [Sequelize.Op.lte]: incentiveDate,
      };

      condition.endDate = {
        [Sequelize.Op.gte]: incentiveDate,
      };
    } else {
      condition.salaryYYYYMM = yearmonth;
    }

    const salary = await HRSalaryTrasaction.findOne({
      raw: true,
      where: condition,
      include: [{ model: UserMaster, attributes: ['displayName'] }],
    });

    if (salary) {
      return res.status(200).json({
        status: 401,
        message: `Salary already calculated for this ${label} of ${salary['userMaster.displayName']}.`,
      });
    }

    await sequelize.transaction(async (t) => {
      const incentiveData = await Employeeincentive.findOne({
        raw: true,
        where: {
          userMasterID,
          yearmonth,
          IncentivetypeID,
          incentiveDate,
          status: 1,
          employeeincentiveID: {
            [Sequelize.Op.ne]: employeeincentiveID,
          },
        },
      });

      if (incentiveData) {
        return res.status(200).json({
          status: 401,
          message: `Incentive already assigned to employee on this date of this month.`,
        });
      }

      await employeeincentive.update(
        {
          userMasterID,
          yearmonth,
          amount,
          IncentivetypeID,
          incentivetypename,
          incentiveDate,
          description,
          updateBy,
          updateByIp,
        },
        {
          where: { employeeincentiveID },
          transaction: t,
        },
      );
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.employeeincentiveupdate,
    });
  } catch (err) {
    next(err);
  }
};

exports.getbyemployeeincentiveID = async (req, res, next) => {
  try {
    let get_one_data = await employeeincentive.findOne({
      where: {
        employeeincentiveID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          include: [
            {
              model: companyMaster,
            },
          ],
        },
        {
          model: Incentivetype,
        },
      ],
    });
    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

exports.getbyname = async (req, res, next) => {
  let { companyMasterID } = await req.body;
  const results = await executeQuery(
    `select "incentivetypename","IncentivetypeID"  from incentivetypes where "companyMasterID"=` +
      ':companyMasterID' +
      ``,
    {
      replacements: {
        companyMasterID: companyMasterID,
      },
    },
  );
  try {
    totalcount = results?.length;
    if (!results)
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    return res
      .status(200)
      .json({ status: 200, data: results, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.getIncentiveTypeWithOutAttnBonus = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const data = await Incentivetype.findAll({
      raw: true,
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('incentivetypename')),
          ),
          {
            [Sequelize.Op.notIn]: nonEditableList_INC,
          },
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });
    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteemployeeincentiveData = async (req, res, next) => {
  try {
    let { employeeincentiveID } = await req.body;

    const incentiveData = await Employeeincentive.findOne({
      where: {
        employeeincentiveID,
      },
      include: [
        {
          required: true,
          model: Incentivetype,
          where: Sequelize.where(
            Sequelize.fn(
              'TRIM',
              Sequelize.fn(
                'LOWER',
                Sequelize.col('incentivetype.incentivetypename'),
              ),
            ),
            { [Sequelize.Op.in]: nonEditableList_INC },
          ),
        },
      ],
    });
    if (incentiveData) {
      return res.status(200).json({
        status: 401,
        message: `You can not delete an incentive of ${incentiveData.incentivetype.incentivetypename} incentive type.`,
      });
    }

    await employeeincentive.update(
      {
        status: '2',
      },
      {
        where: { employeeincentiveID: employeeincentiveID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.employeeincentivedelete,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllincentiveData = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      userMasterID,
      month,
      companyMasterID,
      incentivetype,
      searchQuery,
      payrollFrequency,
    } = await req.body;

    const paginate =
      page && limit ? { offset: (page - 1) * limit, limit: limit } : {};

    const condition = {};

    condition.status = 1;

    if (companyMasterID) {
      condition['$userMaster.companyMasterId$'] = companyMasterID;
    }

    if (!userMasterID || +userMasterID.length === 0) {
    } else {
      condition.userMasterID = userMasterID;
    }

    if (month) condition.yearmonth = month;

    if (incentivetype) condition.IncentivetypeID = incentivetype;

    if (searchQuery) {
      condition[Op.or] = [
        { '$userMaster.displayName$': { [Op.iLike]: `%${searchQuery}%` } },
        { '$userMaster.userNumber$': { [Op.iLike]: `%${searchQuery}%` } },
        {
          '$incentivetype.incentivetypename$': {
            [Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$incentivetype.inc_type_displayName$': {
            [Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const joiningCondition = {};

    if (payrollFrequency) joiningCondition.payrollFrequency = payrollFrequency;

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const { rows: incentiveData, count: totalcount } =
      await employeeincentive.findAndCountAll({
        raw: true,
        where: condition,
        ...paginate,
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...where },
            attributes: ['userMasterID'],
            include: [
              ...includeModels,
              {
                required: Boolean(payrollFrequency),
                model: EmployeeJoiningDetails,
                where: joiningCondition,
                attributes: [],
              },
            ],
          },
          { model: Incentivetype, required: true, attributes: [] },
        ],
        order: [['employeeincentiveID', 'DESC']],
        attributes: [
          'employeeincentiveID',
          'ReferenceId',
          'IncentivetypeID',
          'description',
          'payInFNF',
          [Sequelize.col('userMaster.displayName'), 'Employee Name'],
          [Sequelize.col('userMaster.userNumber'), 'Employee Number'],
          [Sequelize.col('incentivetype.incentivetypename'), 'Incentive'],
          [
            Sequelize.col('incentivetype.inc_type_displayName'),
            'inc_type_displayName',
          ],
          [Sequelize.col('yearmonth'), 'YearMonth'],
          [Sequelize.col('incentiveDate'), 'Incentive Date'],
          [Sequelize.col('amount'), 'Amount'],
        ],
      });

    if (req.body.export) {
      const finalData = incentiveData.map((obj) => {
        return {
          'Employee Name': obj['Employee Name'],
          'Employee Number': obj['Employee Number'],
          Incentive: obj['inc_type_displayName']
            ? obj['inc_type_displayName']
            : obj['Incentive'],
          YearMonth: obj['YearMonth'],
          'Incentive Date': obj['Incentive Date'],
          Amount: obj['Amount'],
          Remark: obj['description'],
        };

        // Create a new object without the "age" field
        // const { IncentivetypeID, employeeincentiveID, ReferenceId, ...newObj } =
        //   obj;
        // return newObj;
      });

      if (+finalData.length === 0) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      return generateExcel(finalData, 'Employee Incentive', 'xlsx', res);
    }

    res
      .status(200)
      .json({ status: 200, data: incentiveData, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.getMyIncentive = async (req, res, next) => {
  try {
    const { userMasterID, fromMonth, toMonth, page, limit, search } = req.query;
    if (!userMasterID)
      return res.status(200).json({
        status: 401,
        message: 'userMasterID is required field!',
      });

    if (+fromMonth > +toMonth)
      return res.status(200).json({
        status: 401,
        message: 'To Month must be greater than or equal to from Month!',
      });

    const condition = {};
    condition.userMasterID = userMasterID;
    condition.status = 1;

    if (fromMonth && toMonth)
      condition.yearmonth = {
        [Sequelize.Op.between]: [fromMonth, toMonth],
      };

    if (search)
      condition[Sequelize.Op.or] = [
        {
          '$incentivetype.incentivetypename$': {
            [Sequelize.Op.iLike]: '%' + search + '%',
          },
        },
        {
          '$incentivetype.inc_type_displayName$': {
            [Op.iLike]: `%${search}%`,
          },
        },
      ];

    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: incentiveData, count: totalcount } =
      await Employeeincentive.findAndCountAll({
        raw: true,
        where: condition,
        ...paginateCondition,
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          { model: Incentivetype, attributes: [], required: true },
        ],
        order: [
          ['yearmonth', 'DESC'],
          ['incentiveDate', 'DESC'],
          ['employeeincentiveID', 'ASC'],
        ],
        attributes: [
          'yearmonth',
          'amount',
          [
            sequelize.col('incentivetype.incentivetypename'),
            'incentivetypename',
          ],
          [
            sequelize.col('incentivetype.inc_type_displayName'),
            'inc_type_displayName',
          ],
          'incentiveDate',
          'description',
        ],
      });

    incentiveData.map((e) => {
      e.yearmonth =
        month_dict[String(e.yearmonth).slice(4, 6)] +
        ' - ' +
        String(e.yearmonth).slice(0, 4);
    });

    return res.status(200).json({
      status: 200,
      data: incentiveData,
      totalcount: totalcount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyIncentiveV2 = async (req, res, next) => {
  try {
    let { userMasterID, fromMonth, toMonth, page, limit, search } = req.query;

    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId
    }
    if (!userMasterID)
      return res.status(200).json({
        status: 401,
        message: 'userMasterID is required field!',
      });

    if (+fromMonth > +toMonth)
      return res.status(200).json({
        status: 401,
        message: 'To Month must be greater than or equal to from Month!',
      });

    const condition = {};
    condition.userMasterID = userMasterID;
    condition.status = 1;

    if (fromMonth && toMonth)
      condition.yearmonth = {
        [Sequelize.Op.between]: [fromMonth, toMonth],
      };

    if (search)
      condition[Sequelize.Op.or] = [
        {
          '$incentivetype.incentivetypename$': {
            [Sequelize.Op.iLike]: '%' + search + '%',
          },
        },
        {
          '$incentivetype.inc_type_displayName$': {
            [Op.iLike]: `%${search}%`,
          },
        },
      ];

    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: incentiveData, count: totalcount } =
      await Employeeincentive.findAndCountAll({
        raw: true,
        where: condition,
        ...paginateCondition,
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          { model: Incentivetype, attributes: [], required: true },
        ],
        order: [
          ['yearmonth', 'DESC'],
          ['incentiveDate', 'DESC'],
          ['employeeincentiveID', 'ASC'],
        ],
        attributes: [
          'yearmonth',
          'amount',
          [
            sequelize.col('incentivetype.incentivetypename'),
            'incentivetypename',
          ],
          [
            sequelize.col('incentivetype.inc_type_displayName'),
            'inc_type_displayName',
          ],
          'incentiveDate',
          'description',
        ],
      });

    incentiveData.map((e) => {
      e.yearmonth =
        month_dict[String(e.yearmonth).slice(4, 6)] +
        ' - ' +
        String(e.yearmonth).slice(0, 4);
    });

    return res.status(200).json({
      status: 200,
      data: incentiveData,
      totalcount: totalcount,
    });
  } catch (error) {
    next(error);
  }
};
