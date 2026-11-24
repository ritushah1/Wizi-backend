const { Op } = require('sequelize');
const AssignCustomerToEmployee = require('../models/assignCustomerToEmployee');
const Customer = require('../models/customer');
const {
  statusCodes,
  userAttributes,
  companyAttributes,
} = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const {
  generateExcelForAssignCustomersToEmployee,
} = require('../utils/exportData');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const companyMaster = require('../models/companyMaster');
const CustomerIndustry = require('../models/customerIndustry');
const sequelize = require('../config/database');
const moment = require('moment');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getCustomersByUser = async (req, res, next) => {
  try {
    const {
      userMasterID,
      companyMasterID,
      exportData,
      customerIndustryID,
      cityMasterID,
      stateMasterID,
      countryMasterID,
    } = req.body;

    const assignCondition = {
      status: 1,
    };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const assignCustomerToEmployees = await AssignCustomerToEmployee.findAll({
      where: {
        userMasterID,
        endDate: null,
      },
      include: [
        {
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: userAttributes,
        },
        {
          required: true,
          model: Customer,
          where: assignCondition,
          include: [
            {
              model: CityMaster,
              attributes: ['cityName', 'stateMasterID'],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateName', 'countryMasterID'],
                  include: [
                    {
                      model: CountryMaster,
                      attributes: ['countryName'],
                    },
                  ],
                },
              ],
            },
            { model: companyMaster, attributes: companyAttributes },
            {
              model: CustomerIndustry,
              attributes: ['name'],
              as: 'ci',
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (exportData) {
      return await generateExcelForAssignCustomersToEmployee(
        assignCustomerToEmployees,
        'AssignedCustomersToEmployee',
        'xlsx',
        res,
      );
    }

    const assignedCustomerIDs = assignCustomerToEmployees?.map(
      (x) => x.customerID,
    );

    const unAssignCondition = {
      customerID: {
        [Op.notIn]: assignedCustomerIDs,
      },
      companyMasterID: companyMasterID,
      status: 1,
    };

    const industryCondition = customerIndustryID ? { customerIndustryID } : {};
    if (cityMasterID) {
      unAssignCondition.cityMasterID = cityMasterID;
    }
    const stateCondition = {};
    if (stateMasterID) {
      stateCondition.stateMasterID = stateMasterID;
    }
    const countryCondition = {};
    if (countryMasterID) {
      countryCondition.countryMasterID = countryMasterID;
    }
    const unAssignedCustomers = await Customer.findAll({
      where: unAssignCondition,
      include: [
        {
          required: customerIndustryID ? true : false,
          model: CustomerIndustry,
          where: industryCondition,
          attributes: ['name'],
          as: 'ci',
        },
        {
          model: CityMaster,
          where: stateCondition,
          attributes: ['cityName', 'stateMasterID'],
          include: [
            {
              model: StateMaster,
              where: countryCondition,
              attributes: ['stateName', 'countryMasterID'],
              include: [
                {
                  model: CountryMaster,
                  attributes: ['countryName'],
                },
              ],
            },
          ],
        },
      ],
    });

    return res.status(statusCodes.OK).json({
      assignedCustomers: assignCustomerToEmployees.map((x) => ({
        ...x?.dataValues?.customer?.dataValues,
        assignDate: moment(x?.assignDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
        userMasterID: x?.userMasterID,
      })),
      unAssignedCustomers,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};

exports.assignUnassignCustomerToEmployee = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, customerID, type } = req.body;
    if (!userMasterID || customerID?.length == 0 || !type) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.invalidField('Details'),
      });
    }

    if (type == 'assign') {
      const existCustomerDetails = await AssignCustomerToEmployee.findAll({
        where: {
          customerID,
          userMasterID,
        },
      });

      const existIDs = existCustomerDetails.map((c) => c.customerID);
      const notExistIDs = customerID?.filter((id) => !existIDs.includes(id));

      const sameDayUpdateData = existCustomerDetails
        .filter(
          (c) =>
            c.endDate &&
            new Date(c.endDate).toISOString().slice(0, 10) ==
              new Date().toISOString().slice(0, 10),
        )
        .map((c) => c.customerID);
      const newAssignData = existCustomerDetails
        .filter(
          (c) =>
            !sameDayUpdateData.includes(c.customerID) ||
            !existIDs.includes(c.customerID),
        )
        .map((c) => c.customerID);

      const data = [...notExistIDs, ...newAssignData].map((id) => ({
        customerID: id,
        userMasterID,
        assignDate: new Date().toISOString().slice(0, 10),
      }));

      if (data?.length > 0) {
        await AssignCustomerToEmployee.bulkCreate(data, {
          user: req.userDetails,
          individualHooks: true,
          transaction,
        });
      }

      if (sameDayUpdateData.length > 0) {
        await AssignCustomerToEmployee.update(
          {
            endDate: null,
          },
          {
            where: {
              customerID: sameDayUpdateData,
              userMasterID,
              endDate: new Date().toISOString().slice(0, 10),
            },
            user: req.userDetails,
            individualHooks: true,
            transaction,
          },
        );
      }
    } else {
      await AssignCustomerToEmployee.update(
        {
          endDate: new Date().toISOString().slice(0, 10),
        },
        {
          where: {
            customerID,
            userMasterID,
            endDate: null,
          },
          user: req.userDetails,
          individualHooks: true,
          transaction,
        },
      );
    }

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
