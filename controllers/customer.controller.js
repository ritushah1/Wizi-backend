const Sequelize = require('sequelize');
const Customer = require('../models/customer');
const message = require('../response_message/message');
const CityMaster = require('../models/citymaster');
const readXlsxFile = require('read-excel-file/node');
const Visit = require('../models/visit');
const sequelize = require('../config/database');
const StateMaster = require('../models/statemaster');
const {
  generateExcel,
  genrateDemoExcelForCustomer,
} = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');
const CountryMaster = require('../models/countrymaster');
const fs = require('fs');
const path = require('path');
const { companyAttributes, statusCodes } = require('../utils/commonVars');
const CustomerIndustry = require('../models/customerIndustry');
const UserMaster = require('../models/userMaster');
const { customerListPreferenceTypes } = require('../utils/dbUtils');
const AssignCustomerToEmployee = require('../models/assignCustomerToEmployee');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');

exports.postAddCustomer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      customerName,
      companyName,
      currentLocation,
      mobileNumber1,
      mobileNumber2,
      email,
      website,
      latitude,
      longitude,
      address,
      zipcode,
      cityMasterID,
      companyMasterID,
      customerIndustryID = null,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let insert_db_status = await Customer.create(
      {
        customerName,
        companyName,
        currentLocation,
        mobileNumber1,
        mobileNumber2,
        email,
        website,
        latitude,
        longitude,
        address,
        zipcode,
        cityMasterID,
        companyMasterID,
        createBy,
        createByIp,
        customerIndustryID,
      },
      { transaction, user: req.userDetails },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Customer'),
      data: insert_db_status,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCustomerById = async (req, res, next) => {
  try {
    let get_one_data = await Customer.findOne({
      where: {
        customerID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
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
                  attributes: ['countryName', 'countryMasterID'],
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
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerByCompanyId = async (req, res, next) => {
  try {
    const { limit, page, companyMasterID, cityName, exportData, searchQuery } =
      await req.body;

    const condition = {};
    condition.companyMasterID = companyMasterID;
    if (cityName) condition.cityMasterID = cityName;
    condition.status = 1;

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { customerName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];

    const customer_data = await Customer.findAll({
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
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
    });

    const totalcount = await Customer.count({
      where: condition,
    });

    if (exportData) {
      const finalData = customer_data.map((item) => {
        const {
          companyMaster,
          customerName,
          companyName,
          ci,
          mobileNumber1,
          mobileNumber2,
          email,
          website,
          latitude,
          longitude,
          radius,
          address,
          zipcode,
          cityMaster,
          currentLocation,
          status,
        } = item || {};

        return {
          CompanyName: companyMaster?.companyName || '',
          CustomerName: customerName || '',
          'Customer CompanyName': companyName || '',
          'Customer Industry': ci?.name || '',
          mobileNumber1,
          mobileNumber2,
          email,
          website,
          Latitude: latitude || '',
          Longitude: longitude || '',
          Radius: radius || '',
          Address: address || '',
          Zipcode: zipcode || '',
          CityName: cityMaster?.cityName || '',
          StateName: cityMaster?.stateMaster?.stateName || '',
          CountryName:
            cityMaster?.stateMaster?.countryMaster?.countryName || '',
          CurrentLocation: currentLocation || '',
          Status: status == 1 ? 'Active' : 'Deactive',
        };
      });

      await generateExcel(finalData, 'filtered_customer', 'xlsx', res);
      return;
    }

    return res
      .status(200)
      .json({ status: 200, data: customer_data, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateCustomer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      customerID,
      customerName,
      companyName,
      currentLocation,
      mobileNumber1,
      mobileNumber2,
      email,
      website,
      latitude,
      longitude,
      address,
      zipcode,
      cityMasterID,
      companyMasterID,
      customerIndustryID = null,
      radius,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await Customer.update(
      {
        customerName,
        companyName,
        currentLocation,
        mobileNumber1,
        mobileNumber2,
        email,
        website,
        latitude,
        longitude,
        address,
        zipcode,
        cityMasterID,
        updateBy,
        updateByIp,
        customerIndustryID,
        radius,
      },
      {
        where: { customerID: customerID },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Customer'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { customerID, status } = await req.body;
    if (+status != 1) {
      let data = await Visit.findOne({
        where: {
          customerID: customerID,
          status: ['0', '1'],
        },
      });
      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Customer.Already used in visits.',
        });
      }
    }
    await Customer.update(
      {
        status,
      },
      {
        where: { customerID: customerID, status: ['1', '0'] },
        transaction,
        individualHooks: true,
        user: req.userDetails,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Customer')
          : message.usermessage.deactiveMessage('Customer'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteCustomerById = async (req, res, next) => {
  try {
    let { customerID } = await req.body;

    const data = await Visit.findOne({
      where: {
        customerID: customerID,
        status: ['0', '1'],
      },
    });
    if (data) {
      return res.status(200).json({
        status: 401,
        message: 'You can not delete this Customer.Already used in visits.',
      });
    }

    await Customer.destroy({
      where: { customerID: customerID },
      user: req.userDetails,
      individualHooks: true,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Customer'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllCustomerDataOptimized = async (req, res, next) => {
  try {
    let { limit, page } = await req.body;
    let offset = (page - 1) * limit;
    let customer_data = [];
    if (limit == '' && page == '') {
      customer_data = await Customer.findAll({
        order: [['customerName', 'ASC']],
        where: {
          companyMasterID: req.body.id,
          status: 1,
        },
        include: [
          {
            model: CityMaster,
          },
        ],
      });
    } else {
      customer_data = await Customer.findAll({
        where: {
          companyMasterID: req.body.id,
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        limit: limit,
        offset: offset,
        order: [['customerName', 'ASC']],
        include: [
          {
            model: CityMaster,
          },
        ],
      });
    }

    const totalcount = await Customer.count({
      raw: true,
      where: {
        companyMasterID: req.body.id,
        status: ['0', '1'],
      },
    });

    return res
      .status(200)
      .json({ status: 200, data: customer_data, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);
  try {
    // const path = './uploads/' + req.file.filename;
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();

    const data = [];
    for (const row of rows) {
      if (row[0] != null && row[0].trim() != '') {
        let customerMaster = {
          customerName: row[0].trim(),
          companyName: row[1],
          customerIndustry: row[2],
          // currentLocation: row[3],
          latitude: row[3] ? row[3] : null,
          longitude: row[4] ? row[4] : null,
          mobileNumber1: row[5],
          mobileNumber2: row[6],
          email: row[7],
          website: row[8],
          address: row[9],
          zipcode: row[10],
          cityMasterID: row[11] ? row[11] : null,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
          countryMasterID: '',
          stateMasterID: '',
        };
        let cityid = await CityMaster.findOne({
          where: {
            cityName: { [Sequelize.Op.iLike]: customerMaster.cityMasterID },
          },
          include: [
            {
              model: StateMaster,
              include: [
                {
                  model: CountryMaster,
                  required: true,
                },
              ],
              required: true,
            },
          ],
        });

        let customerIndustryID = await CustomerIndustry.findOne({
          where: {
            name: { [Sequelize.Op.iLike]: customerMaster.customerIndustry },
          },
          include: [
            {
              model: Customer,
              as: 'ci',
              required: true,
            },
          ],
        });

        if (cityid) {
          customerMaster.cityMasterID = cityid.cityMasterID;
          customerMaster.countryMasterID =
            cityid.stateMaster.countryMaster.countryMasterID;
          customerMaster.stateMasterID = cityid.stateMaster.stateMasterID;
        } else {
          customerMaster.remarks = 'Customer City Name Not Exist';
        }
        if (customerIndustryID) {
          customerMaster.customerIndustry =
            customerIndustryID.customerIndustryID;
        } else {
          customerMaster.customerIndustry = null;
        }

        data.push(customerMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Customer'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateCustomer = async (req, res, next) => {
  try {
    const {
      customerData,
      // companyMasterID
    } = req.body;

    let data = [];

    for (const row of customerData) {
      // Ensure the row is an object and has the required fields
      if (row.customerName && row.customerName.trim() !== '') {
        let customerMaster = {
          customerName: row.customerName.trim(),
          companyName: row.companyName,
          currentLocation: row.currentLocation,
          latitude: row.latitude ? row.latitude : null,
          longitude: row.longitude ? row.longitude : null,
          mobileNumber1: row.mobileNumber1 ? row.mobileNumber1 : null,
          mobileNumber2: row.mobileNumber2 ? row.mobileNumber2 : null,
          email: row.email ? row.email : '',
          website: row.website ? row.website : '',
          address: row.address,
          zipcode: row.zipcode,
          cityMasterID: row.cityMasterID,
          countryMasterID: row.countryMasterID,
          stateMasterID: row.stateMasterID,
          remarks: '',
          customerIndustry: row.customerIndustry || null,
        };

        data.push(customerMaster);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.reValidateMessage('Customer'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateCustomer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { customerData, companyMasterID } = req.body;

    await Customer.bulkCreate(
      customerData.map((item) => ({
        customerName: item.customerName.trim(),
        companyName: item.companyName,
        currentLocation: item.currentLocation,
        latitude: item.latitude ? item.latitude : null,
        longitude: item.longitude ? item.longitude : null,
        mobileNumber1: item.mobileNumber1,
        mobileNumber2: item.mobileNumber2 ? item.mobileNumber2 : null,
        email: item.email ? item.email : '',
        website: item.website ? item.website : '',
        address: item.address,
        zipcode: item.zipcode,
        cityMasterID: item.cityMasterID,
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        customerIndustryID: item.customerIndustry || null,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Customer'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.generateDemoExcel = async (req, res, next) => {
  try {
    const { limit, page } = await req.body;
    const condition = {};
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['cityName', 'ASC']];
    const { rows, count } = await CityMaster.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
    });
    const cityNames = rows.map((row) => row.cityName);
    await genrateDemoExcelForCustomer(cityNames, 'Demo Customer', 'xlsx', res);
  } catch (err) {
    next(err);
  }
};

exports.getAllCustomerDataNew = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, userMasterID, visitDate } = req.body;

    const condition = { status: 1 };
    if (!visitDate) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }
    if (userMasterID) {
      const findUser = await UserMaster.findOne({
        where: {
          userMasterID,
          status: 1,
        },
        include: [
          { model: companyMaster, attributes: ['customerListPreference'] },
        ],
      });
      if (!findUser) {
        return res.status(200).json({
          status: 401,
          message: message.usermessage.notFoundMessage('User'),
        });
      }
      condition.companyMasterID = findUser.companyMasterId;
      const company = findUser.companyMaster || null;
      if (company) {
        if (
          company.customerListPreference ==
          customerListPreferenceTypes.CUSTOMER_CREATED_BY_USER
        ) {
          condition.createBy = userMasterID;
        } else if (
          company.customerListPreference ==
          customerListPreferenceTypes.CUSTOMER_ASSIGNED_TO_USER
        ) {
          const findAssignedCustomer = await AssignCustomerToEmployee.findAll({
            where: {
              userMasterID,
              assignDate: {
                [Sequelize.Op.lte]: new Date(visitDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(visitDate) },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            include: [
              {
                model: Customer,
                where: {
                  status: 1,
                },
              },
            ],
          });
          const mapCustomerID = findAssignedCustomer.map((e) => +e.customerID);
          condition.customerID = {
            [Sequelize.Op.in]: mapCustomerID,
          };
        } else if (
          company.customerListPreference ==
          customerListPreferenceTypes.EMPLOYEE_BRANCH_CITY_WISE_CUSTOMER
        ) {
          const findEmployeeBranch = await EmployeeBranch.findOne({
            where: {
              userMasterID: userMasterID,
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(visitDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(visitDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['branchID'],
            include: [
              {
                model: BranchMaster,
                as: 'branchMaster',
                attributes: ['branchName', 'cityMasterID'],
              },
            ],
          });

          if (findEmployeeBranch) {
            condition.cityMasterID =
              findEmployeeBranch?.branchMaster?.cityMasterID;
          }
        }
      }
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { customerName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        { companyName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const { rows, count } = await Customer.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['customerName', 'ASC']],
      include: [{ model: CityMaster }],
      attributes: [
        'customerID',
        'customerName',
        'companyName',
        'mobileNumber1',
        'mobileNumber2',
        'currentLocation',
        'cityMasterID',
      ],
    });

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerByUpdatedAt = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID, updatedAt } = req.body;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userMasterID = req.userDetails.userMasterId;
    if (!companyMasterID) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }
    const findCompany = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });
    if (!findCompany) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const condition = {
      status: 1,
      companyMasterID,
    };
    if (findCompany) {
      if (
        findCompany.customerListPreference ==
        customerListPreferenceTypes.CUSTOMER_CREATED_BY_USER
      ) {
        condition.createBy = userMasterID;
      } else if (
        findCompany.customerListPreference ==
        customerListPreferenceTypes.CUSTOMER_ASSIGNED_TO_USER
      ) {
        const findAssignedCustomer = await AssignCustomerToEmployee.findAll({
          where: {
            userMasterID,
            assignDate: {
              [Sequelize.Op.lte]: new Date(currentdate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          include: [
            {
              model: Customer,
              where: {
                status: 1,
              },
            },
          ],
        });
        const mapCustomerID = findAssignedCustomer.map((e) => +e.customerID);
        condition.customerID = {
          [Sequelize.Op.in]: mapCustomerID,
        };
      } else if (
        findCompany.customerListPreference ==
        customerListPreferenceTypes.EMPLOYEE_BRANCH_CITY_WISE_CUSTOMER
      ) {
        const findEmployeeBranch = await EmployeeBranch.findOne({
          where: {
            userMasterID: userMasterID,
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName', 'cityMasterID'],
            },
          ],
        });

        if (findEmployeeBranch) {
          condition.cityMasterID =
            findEmployeeBranch?.branchMaster?.cityMasterID;
        }
      }
    }
    if (updatedAt) {
      condition.updatedAt = {
        [Sequelize.Op.gte]: new Date(updatedAt),
      };
    }

    const { rows: findCustomer, count } = await Customer.findAndCountAll({
      where: condition,
      distinct: true,
      ...paginationQuery,
      order: [['updatedAt', 'ASC']],
      include: [{ model: companyMaster }, { model: CityMaster }],
    });

    return res.status(200).json({
      status: 200,
      data: findCustomer,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
