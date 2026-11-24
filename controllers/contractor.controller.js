const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Contractor = require('../models/contractor');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const CityMaster = require('../models/citymaster');
const logger = require('../config/logger');
const StateMaster = require('../models/statemaster');
const {
  generateExcel,
  genrateDemoExcelForContractor,
} = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');
const BankMaster = require('../models/bankMaster');
const CountryMaster = require('../models/countrymaster');
const { isValidDate } = require('../utils/commonUtilFunctions');
const fs = require('fs');
const path = require('path');
const { convertNameToLocalName } = require('../utils/labelUtils');
const { saveraCompanyIDs } = require('../utils/dbUtils');
const { transcode } = require('buffer');
const UserMaster = require('../models/userMaster');
const { Translate } = require('@google-cloud/translate').v2;

// add api
exports.postadddata = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      contractorName,
      shortName,
      contractorCode,
      website,
      contactPersonName,
      contactNo,
      dateofIncorporation,
      email,
      bankMasterID,
      bankIFSC,
      bankAccountNo,
      pancard,
      gstNumber,
      companyMasterID,
      cityMasterID,
      status,
      registrationNo,
      aboutContractor,
      createByIp,
      contractorAddress,
      contractorFullAddress,
    } = await req.body;

    const contractor = await Contractor.findOne({
      where: {
        companyMasterID,
        contactNo,
        status: [0, 1],
      },
    });

    if (contractor) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Contractor'),
      });
    }
    let localName = null;
    let localAddress = null;

    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(companyMasterID)) {
        try {
          const translate = new Translate({
            key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
          });

          const response = await translate.translate(
            [
              contractorName,
              contractorFullAddress ? contractorFullAddress : '',
            ],
            {
              from: 'en', // Explicitly specify English as the source
              to: 'mr',
              format: 'text',
              model: 'base',
            },
          );

          // Extract transliterated values
          localName = response[0]?.[0] || null;
          localAddress = response[0]?.[1] || null;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
    await Contractor.create(
      {
        contractorName,
        shortName,
        contractorCode,
        website,
        contactPersonName,
        contactNo,
        dateofIncorporation,
        email,
        companyMasterID,
        cityMasterID,
        status,
        registrationNo,
        aboutContractor,
        bankMasterID,
        bankIFSC,
        bankAccountNo,
        pancard,
        gstNumber,
        createBy: req.userDetails.userMasterId,
        createByIp,
        contractorAddress,
        localName,
        localAddress,
      },
      { transaction, user: req.userDetails },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Contractor'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// get all data api
exports.listdata = async (req, res, next) => {
  try {
    let { page, limit, searchQuery, companyMasterID, Export } = req.query;

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { contractorName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    const { rows, count } = await Contractor.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        { model: CityMaster, attributes: ['cityName'] },
        { model: BankMaster, attributes: ['bankName'] },
        { model: UserMaster, as: 'createByUserDetails', attributes: ['displayName']},
        { model: UserMaster, as: 'updateByUserDetails', attributes: ['displayName']},
      ],
      order: [['contractorId', 'DESC']],
    });

    if (Export == 'true') {
      const finaldata = rows.map((e) => {
        return {
          'Company Name': e['companyMaster.companyName'],
          'Contractor Name': e.contractorName,
          'Short Name': e.shortName,
          'Contractor Code': e.contractorCode,
          Website: e.website,
          'Contact PersonName': e.contactPersonName,
          'Contact No': e.contactNo,
          'Date of Incorporation': e.dateofIncorporation,
          Email: e.email,
          'Registration No': e.registrationNo,
          'About Contractor': e.aboutContractor,
          'contractor Address': e.contractorAddress,
          'City Name': e['cityMaster.cityName'],
          'Bank Name': e['bankMaster.bankName'],
          'IFSC Code': e.bankIFSC,
          'Account No': e.bankAccountNo,
          Pancard: e.pancard,
          'GST No': e.gstNumber,
          Status: e.status == 0 ? 'Deactive' : 'Active',
        };
      });

      await generateExcel(finaldata, 'Contractor', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};

// get api
exports.getdata = async (req, res, next) => {
  try {
    const contractorId = req.params.id;
    const Data = await Contractor.findOne({
      where: {
        contractorId: contractorId,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: CityMaster,
          attributes: ['cityMasterID', 'cityName'],
          include: [{ model: StateMaster }],
        },
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: BankMaster,
          attributes: ['bankMasterID', 'bankName'],
        },
      ],
      raw: true,
    });
    if (!Data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    }

    return res.status(200).json({ status: 200, data: Data });
  } catch (err) {
    next(err);
  }
};
// // edit api

exports.editdata = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      contractorName,
      shortName,
      contractorCode,
      website,
      contactPersonName,
      contactNo,
      dateofIncorporation,
      email,
      companyMasterID,
      cityMasterID,
      registrationNo,
      aboutContractor,
      bankMasterID,
      bankIFSC,
      bankAccountNo,
      pancard,
      gstNumber,
      contractorAddress,
    } = await req.body;

    const currentdata = await Contractor.findOne({
      where: {
        contractorId: req.params.id,
      },
    });

    if (!currentdata) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.deletedrecord,
      });
    }

    const contractor = await Contractor.findOne({
      where: {
        companyMasterID,
        contactNo,
        status: [0, 1],
        contractorId: {
          [Sequelize.Op.ne]: req.params.id,
        },
      },
    });

    if (contractor) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Contractor'),
      });
    }

    if (convertNameToLocalName) {
      if (saveraCompanyIDs.includes(companyMasterID)) {
        try {
          const cityWiseData = await CityMaster.findOne({
            where: { cityMasterID: cityMasterID },
            attributes: ['cityName'],
            include: [
              {
                required: true,
                model: StateMaster,
                attributes: ['stateName'],
                include: [
                  {
                    required: true,
                    model: CountryMaster,
                    attributes: ['countryName'],
                  },
                ],
              },
            ],
          });
          const fullContractorAddress = contractorAddress
            ? `${contractorAddress}, ${cityWiseData.cityName}, ${cityWiseData.stateMaster.stateName},  ${cityWiseData.stateMaster.countryMaster.countryName}`
            : `${cityWiseData.cityName}, ${cityWiseData.stateMaster.stateName},  ${cityWiseData.stateMaster.countryMaster.countryName}`;

          const translate = new Translate({
            key: process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY,
          });

          const response = await translate.translate(
            [contractorName, fullContractorAddress],
            {
              from: 'en', // Explicitly specify English as the source
              to: 'mr',
              format: 'text',
              model: 'base',
            },
          );

          // Extract transliterated values
          let localName = response[0]?.[0] || null;
          let localAddress = response[0]?.[1] || null;

          currentdata.localName = localName;
          currentdata.localAddress = localAddress;
        } catch (error) {
          console.error('Error in translation:', error);
        }
      }
    }
    currentdata.contractorName = contractorName;
    currentdata.shortName = shortName;
    currentdata.contractorCode = contractorCode;
    currentdata.website = website;
    currentdata.contactPersonName = contactPersonName;
    currentdata.contactNo = contactNo;
    currentdata.dateofIncorporation = dateofIncorporation;
    currentdata.email = email;
    currentdata.cityMasterID = cityMasterID;
    currentdata.registrationNo = registrationNo;
    currentdata.aboutContractor = aboutContractor;
    currentdata.cityMasterID = cityMasterID;
    currentdata.bankMasterID = bankMasterID;
    currentdata.bankIFSC = bankIFSC;
    currentdata.bankAccountNo = bankAccountNo;
    currentdata.pancard = pancard;
    currentdata.gstNumber = gstNumber;
    currentdata.contractorAddress = contractorAddress;

    await currentdata.save({
      user: req.userDetails,
      transaction,
    });
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Contractor'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// // delete api
// delete api
exports.deletedata = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findData = await Contractor.findByPk(id);

    if (!findData) {
      return res.status(404).json({
        status: 404,
        message: 'Contractor not found!',
      });
    }

    // Perform deletion
    await findData.destroy({
      individualHooks: true,
      user: req.userDetails, // Assuming you have proper handling for this
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Contractor'),
    });
  } catch (error) {
    next(error);
  }
};

// active,deactive user
exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { contractorId, status } = await req.body;

    await Contractor.update(
      {
        status,
      },
      {
        where: { contractorId },
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
          ? message.usermessage.activeMessage('Contractor')
          : message.usermessage.deactiveMessage('Contractor'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

const norm = (v) =>
  v == null
    ? ''
    : String(v)
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const key = (v) => norm(v).toLowerCase();

const toStr = (v) => {
  const s = norm(v);
  return s === '' ? null : s;
};

const excelDateToISO = (n) =>
  new Date(Math.round(n - 25569) * 86400 * 1000).toISOString().slice(0, 10);

const stringDateToISO = (s) => new Date(s).toISOString().slice(0, 10);

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    const rows = await readXlsxFile(filePath);
    rows.shift(); // skip header

    // Only rows that have a contractor name
    const validRows = rows.filter((row) => norm(row[0]) !== '');

    // Collect the distinct city/bank names used in the file
    const cityKeys = [
      ...new Set(validRows.map((r) => key(r[7])).filter(Boolean)),
    ];
    const bankKeys = [
      ...new Set(validRows.map((r) => key(r[9])).filter(Boolean)),
    ];

    const [cities, banks] = await Promise.all([
      cityKeys.length
        ? CityMaster.findAll({
            where: Sequelize.where(
              Sequelize.fn(
                'lower',
                Sequelize.fn('trim', Sequelize.col('cityName')),
              ),
              { [Sequelize.Op.in]: cityKeys },
            ),
            include: [
              {
                model: StateMaster,
                required: true,
                include: [{ model: CountryMaster, required: true }],
              },
            ],
          })
        : [],
      bankKeys.length
        ? BankMaster.findAll({
            where: Sequelize.where(
              Sequelize.fn(
                'lower',
                Sequelize.fn('trim', Sequelize.col('bankName')),
              ),
              { [Sequelize.Op.in]: bankKeys },
            ),
          })
        : [],
    ]);

    const cityMap = new Map(cities.map((c) => [key(c.cityName), c]));
    const bankMap = new Map(banks.map((b) => [key(b.bankName), b]));

    const data = validRows.map((row) => {
      const remarks = [];

      const city = cityMap.get(key(row[7]));
      const bank = bankMap.get(key(row[9]));

      // Date of incorporation
      let dateofIncorporation = null;
      if (typeof row[8] === 'number') {
        dateofIncorporation = excelDateToISO(row[8]);
      } else if (row[8] instanceof Date && !isNaN(row[8])) {
        dateofIncorporation = row[8].toISOString().slice(0, 10);
      } else if (row[8] && isValidDate(row[8])) {
        dateofIncorporation = stringDateToISO(row[8]);
      } else {
        remarks.push("Incorporation Date Should be in 'yyyy-mm-dd'");
      }

      if (!city) remarks.push('Contractor City Name Not Exist');
      if (norm(row[9]) && !bank) remarks.push('Contractor Bank Name Not Exist');

      return {
        contractorName: norm(row[0]),
        website: toStr(row[1]),
        shortName: toStr(row[2]),
        contactPersonName: toStr(row[3]),
        contractorCode: toStr(row[4]),
        contactNo: toStr(row[5]),
        email: toStr(row[6]),
        cityMasterID: city ? city.cityMasterID : null,
        stateMasterID: city ? city.stateMaster.stateMasterID : '',
        countryMasterID: city
          ? city.stateMaster.countryMaster.countryMasterID
          : '',
        dateofIncorporation,
        bankMasterID: bank ? bank.bankMasterID : null,
        bankIFSC: toStr(row[10]),
        bankAccountNo: toStr(row[11]),
        pancard: toStr(row[12]),
        gstNumber: toStr(row[13]),
        registrationNo: toStr(row[14]),
        aboutContractor: toStr(row[15]),
        contractorAddress: toStr(row[16]),
        companyMasterID: req.body.companyMasterID,
        remarks: remarks.join('. '),
      };
    });

    return res.status(200).json({
      status: 200,
      message: 'Contractor Validate successfully.',
      data,
    });
  } catch (error) {
    next(error);
  } finally {
    // Always delete the temp file, even when an error is thrown
    fs.unlink(filePath, () => {});
  }
};

exports.revalidateContractor = async (req, res, next) => {
  try {
    const { contractorData } = req.body;

    let data = [];

    for (const row of contractorData) {
      // Ensure the row is an object and has the required fields
      if (row.contractorName && row.contractorName.trim() !== '') {
        let contractorMaster = {
          contractorName: row.contractorName.trim(),
          website: row.website,
          shortName: row.shortName.trim(),
          contactPersonName: row.contactPersonName.trim(),
          contractorCode: row.contractorCode.trim(),
          contactNo: row.contactNo,
          email: row.email,
          cityMasterID: row.cityMasterID,
          dateofIncorporation: row.dateofIncorporation,
          bankMasterID: row.bankMasterID,
          bankAccountNo: row.bankAccountNo,
          pancard: row.pancard,
          gstNumber: row.gstNumber,
          bankIFSC: row.bankIFSC,
          registrationNo: row.registrationNo,
          aboutContractor: row.aboutContractor,
          remarks: '',
          countryMasterID: row.countryMasterID,
          stateMasterID: row.stateMasterID,
          contractorAddress: row.contractorAddress,
        };

        data.push(contractorMaster);
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Contractor Re-Validate successfully.',
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
exports.addValidateContractor = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { contractorData, companyMasterID } = req.body;

    await Contractor.bulkCreate(
      contractorData.map((item) => ({
        contractorName: item.contractorName.trim(),
        website: item.website,
        shortName: item.shortName.trim(),
        contactPersonName: item.contactPersonName.trim(),
        contractorCode: item.contractorCode.trim(),
        contactNo: item.contactNo,
        email: item.email,
        cityMasterID: item.cityMasterID,
        dateofIncorporation: item.dateofIncorporation,
        bankMasterID: item.bankMasterID,
        bankAccountNo: item.bankAccountNo,
        pancard: item.pancard,
        gstNumber: item.gstNumber,
        registrationNo: item.registrationNo,
        aboutContractor: item.aboutContractor,
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        contractorAddress: item.contractorAddress,
        bankIFSC: item.bankIFSC,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Contractor'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.generateDemoExcel = async (req, res, next) => {
  try {
    const order = [['cityName', 'ASC']];

    const cityData = await CityMaster.findAll({
      raw: true,
      attributes: ['cityName', 'cityMasterID'],
      order,
    });
    const cityNames = cityData.map((row) => row.cityName);

    const bankData = await BankMaster.findAll({
      attributes: ['bankName', 'bankMasterID'],
      raw: true,
    });
    const bankNames = bankData.map((row) => row.bankName);

    await genrateDemoExcelForContractor(
      cityNames,
      bankNames,
      'Demo Contractor',
      'xlsx',
      res,
    );
  } catch (err) {
    next(err);
  }
};
