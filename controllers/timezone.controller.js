const sequelize = require('../config/database');
const Timezone = require('../models/timezone');
const TimezoneService = require('../services/timezoneService');
const message = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const { Op } = require('sequelize');


exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const timezone = await Timezone.findByPk(id);

    if (!timezone) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.notFoundMessage('Timezone'),
      });
    }

    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Timezone'),
      data: timezone,
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { timezone, timezoneOffset, timezoneName, status = 1 } = req.body;

    if (!timezone || !timezoneOffset || !timezoneName) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'Timezone, timezoneOffset, and timezoneName are required',
      });
    }

    const existingTimezone = await Timezone.findOne({
      where: { timezone },
      transaction,
    });

    if (existingTimezone) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'Timezone already exists.',
      });
    }

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const newTimezone = await Timezone.create(
      {
        timezone,
        timezoneOffset,
        timezoneName,
        status,
        createBy: req.userDetails?.userMasterId || 1,
      },
      options
    );

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.addMessage('Timezone'),
      data: newTimezone,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteTimezone = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const timezone = await Timezone.findByPk(id, { transaction });

    if (!timezone) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        message: message.usermessage.notFoundMessage('Timezone'),
      });
    }

    await Timezone.destroy({
      where: { timezoneID: id },
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      message: message.usermessage.deleteMessage('Timezone'),
      status: statusCodes.OK,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.addDefaultData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const timezones = [
      {
        timezone: 'Antarctica/Casey',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Australian Western Standard Time',
      },
      {
        timezone: 'America/Havana',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Cuba Daylight Time',
      },
      {
        timezone: 'Africa/Ndjamena',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'MIT',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'West Samoa Standard Time',
      },
      {
        timezone: 'America/Jujuy',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/Marigot',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Europe/Budapest',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'US/Michigan',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Asia/Hong_Kong',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Hong Kong Time',
      },
      {
        timezone: 'Asia/Ashkhabad',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Turkmenistan Time',
      },
      {
        timezone: 'Etc/GMT+7',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'GMT-07:00',
      },
      {
        timezone: 'Europe/Guernsey',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Atlantic/South_Georgia',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'South Georgia Standard Time',
      },
      {
        timezone: 'Australia/Eucla',
        timezoneOffset: 'GMT+08:45',
        timezoneName: 'Australian Central Western Standard Time',
      },
      {
        timezone: 'SystemV/CST6',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'EAT',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Etc/Universal',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'Europe/Stockholm',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Pacific/Kiritimati',
        timezoneOffset: 'GMT+14:00',
        timezoneName: 'Line Is. Time',
      },
      {
        timezone: 'America/Porto_Velho',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'America/North_Dakota/New_Salem',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Europe/Tirane',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Europe/Busingen',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Africa/Khartoum',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Antarctica/Vostok',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Vostok Time',
      },
      {
        timezone: 'Europe/Vilnius',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Pacific/Johnston',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Hawaii Standard Time',
      },
      {
        timezone: 'Pacific/Guadalcanal',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Solomon Is. Time',
      },
      {
        timezone: 'Atlantic/Madeira',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'America/Nome',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'Asia/Kashgar',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Xinjiang Standard Time',
      },
      {
        timezone: 'America/Cordoba',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Antarctica/Macquarie',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Etc/GMT+3',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'GMT-03:00',
      },
      {
        timezone: 'PLT',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Pakistan Time',
      },
      {
        timezone: 'Africa/Porto-Novo',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Asia/Famagusta',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Europe/Monaco',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'SystemV/YST9',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Alaska Standard Time',
      },
      {
        timezone: 'America/Argentina/San_Luis',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Etc/GMT+9',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'GMT-09:00',
      },
      {
        timezone: 'Etc/GMT+12',
        timezoneOffset: 'GMT-12:00',
        timezoneName: 'GMT-12:00',
      },
      {
        timezone: 'Europe/Brussels',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Pacific/Majuro',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Marshall Islands Time',
      },
      {
        timezone: 'Egypt',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Tegucigalpa',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Europe/Prague',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Asia/Saigon',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'Etc/GMT-10',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'GMT+10:00',
      },
      {
        timezone: 'SystemV/MST7',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'America/Tijuana',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'NST',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'New Zealand Daylight Time',
      },
      {
        timezone: 'Africa/Ceuta',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Guayaquil',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Ecuador Time',
      },
      {
        timezone: 'America/Matamoros',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Pacific/Kanton',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'Phoenix Is. Time',
      },
      {
        timezone: 'America/Rainy_River',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'America/Phoenix',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Asia/Chungking',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'America/Argentina/Cordoba',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Africa/Sao_Tome',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Asia/Ashgabat',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Turkmenistan Time',
      },
      {
        timezone: 'Africa/Asmara',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Africa/Kampala',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Etc/GMT-13',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'GMT+13:00',
      },
      {
        timezone: 'Asia/Kolkata',
        timezoneOffset: 'GMT+05:30',
        timezoneName: 'India Standard Time',
      },
      {
        timezone: 'Europe/London',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Antarctica/McMurdo',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'New Zealand Daylight Time',
      },
      {
        timezone: 'Canada/Newfoundland',
        timezoneOffset: 'GMT-02:30',
        timezoneName: 'Newfoundland Daylight Time',
      },
      {
        timezone: 'Asia/Kuching',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Malaysia Time',
      },
      {
        timezone: 'Pacific/Bougainville',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Bougainville Standard Time',
      },
      {
        timezone: 'Europe/Ulyanovsk',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Ulyanovsk Standard Time',
      },
      {
        timezone: 'Etc/GMT+0',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Africa/Windhoek',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Asia/Anadyr',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Anadyr Time',
      },
      {
        timezone: 'Pacific/Galapagos',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Galapagos Time',
      },
      {
        timezone: 'America/New_York',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Europe/Kyiv',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Ujung_Pandang',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Central Indonesia Time',
      },
      {
        timezone: 'Africa/Mogadishu',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Asia/Vladivostok',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Vladivostok Time',
      },
      {
        timezone: 'America/Argentina/Rio_Gallegos',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/Scoresbysund',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Eastern Greenland Time',
      },
      {
        timezone: 'Europe/Zaporozhye',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Europe/Berlin',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'GB',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Barbados',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'America/Guyana',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Guyana Time',
      },
      {
        timezone: 'Asia/Oral',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Oral Time',
      },
      {
        timezone: 'Pacific/Fakaofo',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'Tokelau Time',
      },
      {
        timezone: 'Asia/Dubai',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Gulf Standard Time',
      },
      {
        timezone: 'Etc/UCT',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'Asia/Qyzylorda',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Qyzylorda Time',
      },
      {
        timezone: 'America/Argentina/Mendoza',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Antarctica/Palmer',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Chile Time',
      },
      {
        timezone: 'America/Atka',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Hawaii Daylight Time',
      },
      {
        timezone: 'Asia/Aden',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'America/Costa_Rica',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Australia/North',
        timezoneOffset: 'GMT+09:30',
        timezoneName: 'Australian Central Standard Time',
      },
      {
        timezone: 'Asia/Tashkent',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Uzbekistan Time',
      },
      {
        timezone: 'Chile/Continental',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Chile Summer Time',
      },
      {
        timezone: 'Indian/Mauritius',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Mauritius Time',
      },
      {
        timezone: 'Etc/GMT+5',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'GMT-05:00',
      },
      {
        timezone: 'America/Argentina/La_Rioja',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Europe/Madrid',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Sao_Paulo',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'America/Martinique',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Pacific/Tahiti',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Tahiti Time',
      },
      {
        timezone: 'Asia/Kabul',
        timezoneOffset: 'GMT+04:30',
        timezoneName: 'Afghanistan Time',
      },
      {
        timezone: 'EET',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Dili',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Timor-Leste Time',
      },
      {
        timezone: 'Asia/Urumqi',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Xinjiang Standard Time',
      },
      {
        timezone: 'Asia/Yangon',
        timezoneOffset: 'GMT+06:30',
        timezoneName: 'Myanmar Time',
      },
      {
        timezone: 'Africa/Gaborone',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'BST',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Bangladesh Time',
      },
      {
        timezone: 'SystemV/AST4ADT',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Australia/Canberra',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'US/Mountain',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Asia/Sakhalin',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Sakhalin Time',
      },
      {
        timezone: 'Etc/GMT-6',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'GMT+06:00',
      },
      {
        timezone: 'Pacific/Truk',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Chuuk Time',
      },
      {
        timezone: 'Asia/Dushanbe',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Tajikistan Time',
      },
      {
        timezone: 'Pacific/Auckland',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'New Zealand Daylight Time',
      },
      {
        timezone: 'America/Vancouver',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'America/Halifax',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'Australia/Lindeman',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Australian Eastern Standard Time',
      },
      {
        timezone: 'Africa/Lome',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Atlantic/Azores',
        timezoneOffset: 'GMT-01:00',
        timezoneName: 'Azores Time',
      },
      {
        timezone: 'MET',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Middle Europe Time',
      },
      {
        timezone: 'Africa/Bamako',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Pacific/Noumea',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'New Caledonia Time',
      },
      {
        timezone: 'Asia/Bishkek',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Kirgizstan Time',
      },
      {
        timezone: 'Africa/Cairo',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Guadeloupe',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'AST',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'Indian/Kerguelen',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'French Southern &amp; Antarctic Lands Time',
      },
      {
        timezone: 'Europe/Copenhagen',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Louisville',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Palau',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Palau Time',
      },
      {
        timezone: 'America/Maceio',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'Etc/GMT-14',
        timezoneOffset: 'GMT+14:00',
        timezoneName: 'GMT+14:00',
      },
      {
        timezone: 'Asia/Makassar',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Central Indonesia Time',
      },
      {
        timezone: 'Australia/Melbourne',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Asia/Hebron',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Africa/Algiers',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Australia/Tasmania',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'America/Juneau',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'Iceland',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Aruba',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Asia/Nicosia',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Aqtau',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Aqtau Time',
      },
      {
        timezone: 'Antarctica/Troll',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'America/Rankin_Inlet',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'America/St_Lucia',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Africa/Nairobi',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Cuba',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Cuba Daylight Time',
      },
      {
        timezone: 'Antarctica/South_Pole',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'New Zealand Daylight Time',
      },
      {
        timezone: 'Europe/Athens',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'SystemV/AST4',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Antarctica/Mawson',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Mawson Time',
      },
      {
        timezone: 'Africa/Blantyre',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Africa/Addis_Ababa',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'America/Virgin',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'IST',
        timezoneOffset: 'GMT+05:30',
        timezoneName: 'India Standard Time',
      },
      {
        timezone: 'Africa/Casablanca',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Summer Time',
      },
      {
        timezone: 'Europe/Sofia',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Atlantic/Stanley',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Falkland Is. Time',
      },
      {
        timezone: 'Indian/Mahe',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Seychelles Time',
      },
      {
        timezone: 'PRC',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Europe/Tallinn',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Seoul',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Korea Standard Time',
      },
      {
        timezone: 'Pacific/Niue',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'Niue Time',
      },
      {
        timezone: 'America/Campo_Grande',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'Europe/Minsk',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'IET',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Efate',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Vanuatu Time',
      },
      {
        timezone: 'Indian/Chagos',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Indian Ocean Territory Time',
      },
      {
        timezone: 'Africa/Bangui',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Hongkong',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Hong Kong Time',
      },
      {
        timezone: 'Australia/Adelaide',
        timezoneOffset: 'GMT+10:30',
        timezoneName: 'Australian Central Daylight Time',
      },
      {
        timezone: 'Asia/Aqtobe',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Aqtobe Time',
      },
      {
        timezone: 'America/Kentucky/Louisville',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Etc/Zulu',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'America/Port_of_Spain',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Israel',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Israel Daylight Time',
      },
      {
        timezone: 'Africa/Kigali',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'America/Grand_Turk',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Africa/Banjul',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Indian/Christmas',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Christmas Island Time',
      },
      {
        timezone: 'Asia/Kuala_Lumpur',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Malaysia Time',
      },
      {
        timezone: 'Australia/NSW',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'America/Panama',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'America/Swift_Current',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Asia/Yakutsk',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Yakutsk Time',
      },
      {
        timezone: 'Europe/Zagreb',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Indian/Antananarivo',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Africa/Maseru',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'South Africa Standard Time',
      },
      {
        timezone: 'Asia/Ho_Chi_Minh',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'Asia/Hovd',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Hovd Time',
      },
      {
        timezone: 'Etc/Greenwich',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Etc/GMT-4',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'GMT+04:00',
      },
      {
        timezone: 'Etc/GMT-0',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Asia/Bahrain',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'Etc/GMT-7',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'GMT+07:00',
      },
      {
        timezone: 'Europe/Skopje',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Africa/Niamey',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'America/Punta_Arenas',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Punta Arenas Standard Time',
      },
      {
        timezone: 'Africa/Bujumbura',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Asia/Bangkok',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'Atlantic/Bermuda',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'UTC',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'Asia/Baku',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Azerbaijan Time',
      },
      {
        timezone: 'CST',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'VST',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'Africa/Conakry',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'US/Pacific',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'America/Paramaribo',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Suriname Time',
      },
      {
        timezone: 'Asia/Yekaterinburg',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Yekaterinburg Time',
      },
      {
        timezone: 'America/Regina',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'America/Boise',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'America/Ojinaga',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Etc/GMT-2',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'GMT+02:00',
      },
      {
        timezone: 'Africa/Libreville',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Etc/GMT-11',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'GMT+11:00',
      },
      {
        timezone: 'Pacific/Easter',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Easter Is. Summer Time',
      },
      {
        timezone: 'America/St_Thomas',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Australia/Queensland',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Australian Eastern Standard Time',
      },
      {
        timezone: 'Asia/Jayapura',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'East Indonesia Time',
      },
      {
        timezone: 'Asia/Pyongyang',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Korea Standard Time',
      },
      {
        timezone: 'America/Nuuk',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Western Greenland Time',
      },
      {
        timezone: 'Pacific/Saipan',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Chamorro Standard Time',
      },
      {
        timezone: 'Pacific/Apia',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'West Samoa Standard Time',
      },
      {
        timezone: 'Asia/Baghdad',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'Australia/Brisbane',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Australian Eastern Standard Time',
      },
      {
        timezone: 'Indian/Cocos',
        timezoneOffset: 'GMT+06:30',
        timezoneName: 'Cocos Islands Time',
      },
      {
        timezone: 'Canada/Atlantic',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'America/St_Kitts',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Pacific/Yap',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Chuuk Time',
      },
      {
        timezone: 'Pacific/Kosrae',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Kosrae Time',
      },
      {
        timezone: 'Asia/Qatar',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'UCT',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'America/Indiana/Tell_City',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Africa/Dakar',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Cambridge_Bay',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'America/Cuiaba',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'Australia/ACT',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Europe/Chisinau',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Europe/Lisbon',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'AGT',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'EST',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'America/Knox_IN',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Brazil/West',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'America/Indiana/Marengo',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Santo_Domingo',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Asia/Ust-Nera',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Ust-Nera Time',
      },
      {
        timezone: 'Asia/Dacca',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Bangladesh Time',
      },
      {
        timezone: 'America/Indiana/Petersburg',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Etc/GMT+4',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'GMT-04:00',
      },
      {
        timezone: 'America/Godthab',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Western Greenland Time',
      },
      {
        timezone: 'America/Ensenada',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'US/Central',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Africa/Abidjan',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Pacific/Chatham',
        timezoneOffset: 'GMT+13:45',
        timezoneName: 'Chatham Daylight Time',
      },
      {
        timezone: 'Etc/GMT-8',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'GMT+08:00',
      },
      {
        timezone: 'Asia/Calcutta',
        timezoneOffset: 'GMT+05:30',
        timezoneName: 'India Standard Time',
      },
      {
        timezone: 'Japan',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Japan Standard Time',
      },
      {
        timezone: 'Asia/Ulaanbaatar',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Ulaanbaatar Time',
      },
      {
        timezone: 'Australia/Perth',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Australian Western Standard Time',
      },
      {
        timezone: 'America/Monterrey',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'America/Yakutat',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'NZ',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'New Zealand Daylight Time',
      },
      {
        timezone: 'America/Indiana/Vincennes',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Africa/Lagos',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Singapore',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Singapore Time',
      },
      {
        timezone: 'Jamaica',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'CET',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Europe/Warsaw',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Asia/Chita',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Yakutsk Time',
      },
      {
        timezone: 'Etc/GMT-9',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'GMT+09:00',
      },
      {
        timezone: 'Asia/Istanbul',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Turkey Time',
      },
      {
        timezone: 'US/Aleutian',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Hawaii Daylight Time',
      },
      {
        timezone: 'Etc/GMT+10',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'GMT-10:00',
      },
      {
        timezone: 'CNT',
        timezoneOffset: 'GMT-02:30',
        timezoneName: 'Newfoundland Daylight Time',
      },
      {
        timezone: 'America/Argentina/Salta',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Poland',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Argentina/San_Juan',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Africa/Nouakchott',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Edmonton',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Asia/Manila',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Philippines Standard Time',
      },
      {
        timezone: 'Asia/Kuwait',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'Europe/Zurich',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Africa/Freetown',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'MST',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Europe/Dublin',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Europe/Gibraltar',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'NZ-CHAT',
        timezoneOffset: 'GMT+13:45',
        timezoneName: 'Chatham Daylight Time',
      },
      {
        timezone: 'Brazil/East',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'Asia/Jerusalem',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Israel Daylight Time',
      },
      {
        timezone: 'Indian/Reunion',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Reunion Time',
      },
      {
        timezone: 'Etc/GMT-5',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'GMT+05:00',
      },
      {
        timezone: 'Pacific/Gambier',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Gambier Time',
      },
      {
        timezone: 'Etc/GMT+1',
        timezoneOffset: 'GMT-01:00',
        timezoneName: 'GMT-01:00',
      },
      {
        timezone: 'Turkey',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Turkey Time',
      },
      {
        timezone: 'America/Argentina/Ushuaia',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Indian/Maldives',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Maldives Time',
      },
      {
        timezone: 'Asia/Harbin',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Pacific/Funafuti',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Tuvalu Time',
      },
      {
        timezone: 'Pacific/Ponape',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Pohnpei Time',
      },
      {
        timezone: 'Asia/Rangoon',
        timezoneOffset: 'GMT+06:30',
        timezoneName: 'Myanmar Time',
      },
      {
        timezone: 'America/Blanc-Sablon',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Etc/GMT+6',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'GMT-06:00',
      },
      {
        timezone: 'Pacific/Fiji',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Fiji Time',
      },
      {
        timezone: 'America/Chihuahua',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Pacific/Midway',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'Samoa Standard Time',
      },
      {
        timezone: 'Asia/Qostanay',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Kostanay Standard Time',
      },
      {
        timezone: 'Europe/Oslo',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Europe/Luxembourg',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Pacific/Samoa',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'Samoa Standard Time',
      },
      {
        timezone: 'Arctic/Longyearbyen',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'SystemV/HST10',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Hawaii Standard Time',
      },
      {
        timezone: 'Europe/Uzhgorod',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Shanghai',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'America/Santiago',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Chile Summer Time',
      },
      {
        timezone: 'Africa/Brazzaville',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'Asia/Almaty',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Alma-Ata Time',
      },
      {
        timezone: 'Canada/Yukon',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'America/Whitehorse',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'America/Detroit',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Guam',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Chamorro Standard Time',
      },
      {
        timezone: 'Australia/Yancowinna',
        timezoneOffset: 'GMT+10:30',
        timezoneName: 'Australian Central Daylight Time',
      },
      {
        timezone: 'Europe/Helsinki',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'US/Hawaii',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Hawaii Standard Time',
      },
      {
        timezone: 'Europe/Tiraspol',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Rio_Branco',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Acre Time',
      },
      {
        timezone: 'America/Antigua',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Eire',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'ECT',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Inuvik',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Canada/Central',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'SystemV/CST6CDT',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Asia/Samarkand',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Uzbekistan Time',
      },
      {
        timezone: 'America/Indiana/Knox',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'SystemV/EST5EDT',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'Europe/Vienna',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Asuncion',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Paraguay Time',
      },
      {
        timezone: 'America/Sitka',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'America/Coyhaique',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'GMT-03:00',
      },
      {
        timezone: 'America/Kentucky/Monticello',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Guatemala',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Asia/Chongqing',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'America/Miquelon',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Pierre &amp; Miquelon Daylight Time',
      },
      {
        timezone: 'America/Argentina/ComodRivadavia',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/Rosario',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'AET',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'America/Santarem',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'America/Dominica',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Etc/GMT+11',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'GMT-11:00',
      },
      {
        timezone: 'Greenwich',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'WET',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'Kwajalein',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Marshall Islands Time',
      },
      {
        timezone: 'SystemV/PST8PDT',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Pacific Standard Time',
      },
      {
        timezone: 'Africa/Lubumbashi',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'W-SU',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'America/Metlakatla',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'Atlantic/Reykjavik',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'SystemV/EST5',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'Atlantic/Faroe',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'Africa/Luanda',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'America/Mazatlan',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'America/Montevideo',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Uruguay Time',
      },
      {
        timezone: 'Asia/Tehran',
        timezoneOffset: 'GMT+03:30',
        timezoneName: 'Iran Standard Time',
      },
      {
        timezone: 'GB-Eire',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Etc/UTC',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'US/Alaska',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'Africa/Lusaka',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Africa/Bissau',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Pacific/Tarawa',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Gilbert Is. Time',
      },
      {
        timezone: 'Asia/Dhaka',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Bangladesh Time',
      },
      {
        timezone: 'America/Chicago',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Africa/Monrovia',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Europe/Bucharest',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Atlantic/Cape_Verde',
        timezoneOffset: 'GMT-01:00',
        timezoneName: 'Cape Verde Time',
      },
      {
        timezone: 'Asia/Magadan',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Magadan Time',
      },
      {
        timezone: 'Europe/Amsterdam',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Araguaina',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'Europe/Bratislava',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Canada/Pacific',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'America/Winnipeg',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Antarctica/Davis',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Davis Time',
      },
      {
        timezone: 'America/Catamarca',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Asia/Thimbu',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Bhutan Time',
      },
      {
        timezone: 'Europe/Mariehamn',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Creston',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'America/Indiana/Indianapolis',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/North_Dakota/Beulah',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Africa/Malabo',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'America/Adak',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Hawaii Daylight Time',
      },
      {
        timezone: 'US/Arizona',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Africa/Juba',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Atlantic/St_Helena',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Fort_Wayne',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Africa/Kinshasa',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'America/Nassau',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'SST',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Solomon Is. Time',
      },
      {
        timezone: 'America/Montserrat',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'America/Curacao',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Africa/El_Aaiun',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Summer Time',
      },
      {
        timezone: 'Africa/Douala',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Western African Time',
      },
      {
        timezone: 'America/Indiana/Winamac',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Resolute',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Europe/Samara',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Samara Time',
      },
      {
        timezone: 'Atlantic/Faeroe',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'Asia/Gaza',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Europe/Kaliningrad',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Pacific/Wallis',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Wallis &amp; Futuna Time',
      },
      {
        timezone: 'PST8PDT',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'Asia/Kathmandu',
        timezoneOffset: 'GMT+05:45',
        timezoneName: 'Nepal Time',
      },
      {
        timezone: 'Asia/Damascus',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Fort_Nelson',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Australia/Victoria',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'America/Buenos_Aires',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/St_Johns',
        timezoneOffset: 'GMT-02:30',
        timezoneName: 'Newfoundland Daylight Time',
      },
      {
        timezone: 'Africa/Timbuktu',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Indian/Comoro',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Asia/Taipei',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Canada/Saskatchewan',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Pacific/Pitcairn',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Pitcairn Standard Time',
      },
      {
        timezone: 'America/Manaus',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'Indian/Mayotte',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'HST',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Hawaii Standard Time',
      },
      {
        timezone: 'MST7MDT',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'CAT',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'America/Argentina/Catamarca',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/Lima',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Peru Time',
      },
      {
        timezone: 'Pacific/Kwajalein',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Marshall Islands Time',
      },
      {
        timezone: 'America/Argentina/Buenos_Aires',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Asia/Macao',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Europe/Volgograd',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'Europe/Simferopol',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'America/Toronto',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Atikokan',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'Europe/Paris',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Argentina/Jujuy',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Atlantic/Canary',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'America/Thule',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'Asia/Yerevan',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Armenia Time',
      },
      {
        timezone: 'Atlantic/Jan_Mayen',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Africa/Asmera',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Europe/Istanbul',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Turkey Time',
      },
      {
        timezone: 'Asia/Singapore',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Singapore Time',
      },
      {
        timezone: 'Asia/Tbilisi',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Georgia Time',
      },
      {
        timezone: 'America/Yellowknife',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'America/Denver',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Pacific/Port_Moresby',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Papua New Guinea Time',
      },
      {
        timezone: 'Australia/Lord_Howe',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Lord Howe Daylight Time',
      },
      {
        timezone: 'Asia/Tomsk',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Tomsk Standard Time',
      },
      {
        timezone: 'America/Argentina/Tucuman',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'America/Eirunepe',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Acre Time',
      },
      {
        timezone: 'PNT',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Pacific/Enderbury',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'Phoenix Is. Time',
      },
      {
        timezone: 'Europe/Vaduz',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Australia/West',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Australian Western Standard Time',
      },
      {
        timezone: 'America/Port-au-Prince',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Africa/Djibouti',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Asia/Macau',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Europe/Podgorica',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Europe/Jersey',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Asia/Novosibirsk',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Novosibirsk Time',
      },
      {
        timezone: 'Australia/LHI',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Lord Howe Daylight Time',
      },
      {
        timezone: 'GMT',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Noronha',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Fernando de Noronha Time',
      },
      {
        timezone: 'US/Indiana-Starke',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Europe/Kirov',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'America/Los_Angeles',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'Asia/Irkutsk',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Irkutsk Time',
      },
      {
        timezone: 'Asia/Pontianak',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'West Indonesia Time',
      },
      {
        timezone: 'Pacific/Pohnpei',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Pohnpei Time',
      },
      {
        timezone: 'US/Samoa',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'Samoa Standard Time',
      },
      {
        timezone: 'America/Lower_Princes',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Europe/Andorra',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Dawson',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Europe/Nicosia',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'US/Eastern',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Menominee',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Canada/Eastern',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Chile/EasterIsland',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Easter Is. Summer Time',
      },
      {
        timezone: 'Asia/Novokuznetsk',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Krasnoyarsk Time',
      },
      {
        timezone: 'America/Boa_Vista',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Amazon Time',
      },
      {
        timezone: 'America/Jamaica',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'America/Coral_Harbour',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'Europe/Riga',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Beirut',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Fortaleza',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'ACT',
        timezoneOffset: 'GMT+09:30',
        timezoneName: 'Australian Central Standard Time',
      },
      {
        timezone: 'Etc/GMT+2',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'GMT-02:00',
      },
      {
        timezone: 'America/El_Salvador',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Europe/San_Marino',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Moncton',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'Africa/Tripoli',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Africa/Ouagadougou',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'PRT',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Etc/GMT-3',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'GMT+03:00',
      },
      {
        timezone: 'America/Ciudad_Juarez',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Mexico/BajaSur',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Asia/Karachi',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'Pakistan Time',
      },
      {
        timezone: 'GMT0',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Anchorage',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Alaska Daylight Time',
      },
      {
        timezone: 'America/Bahia_Banderas',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Etc/GMT',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Africa/Dar_es_Salaam',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern African Time',
      },
      {
        timezone: 'Europe/Astrakhan',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Astrakhan Standard Time',
      },
      {
        timezone: 'Asia/Atyrau',
        timezoneOffset: 'GMT+05:00',
        timezoneName: 'GMT+05:00',
      },
      {
        timezone: 'America/Santa_Isabel',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'Pacific/Rarotonga',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Cook Is. Time',
      },
      {
        timezone: 'EST5EDT',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Australia/Sydney',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Zulu',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'Asia/Vientiane',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'Asia/Khandyga',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Yakutsk Time',
      },
      {
        timezone: 'America/Cayenne',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'French Guiana Time',
      },
      {
        timezone: 'Asia/Choibalsan',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Choibalsan Time',
      },
      {
        timezone: 'America/Shiprock',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Asia/Amman',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Iqaluit',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Norfolk',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Norfolk Summer Time',
      },
      {
        timezone: 'America/Danmarkshavn',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Thunder_Bay',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Anguilla',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Pacific/Wake',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Wake Time',
      },
      {
        timezone: 'Mexico/BajaNorte',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'Canada/Mountain',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'Asia/Colombo',
        timezoneOffset: 'GMT+05:30',
        timezoneName: 'India Standard Time',
      },
      {
        timezone: 'Africa/Accra',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Ghana Mean Time',
      },
      {
        timezone: 'Pacific/Honolulu',
        timezoneOffset: 'GMT-10:00',
        timezoneName: 'Hawaii Standard Time',
      },
      {
        timezone: 'Europe/Belfast',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'America/Bahia',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'America/St_Vincent',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Etc/GMT-12',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'GMT+12:00',
      },
      {
        timezone: 'BET',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'Asia/Thimphu',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Bhutan Time',
      },
      {
        timezone: 'JST',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Japan Standard Time',
      },
      {
        timezone: 'Asia/Barnaul',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Barnaul Standard Time',
      },
      {
        timezone: 'Africa/Tunis',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Asia/Katmandu',
        timezoneOffset: 'GMT+05:45',
        timezoneName: 'Nepal Time',
      },
      {
        timezone: 'CST6CDT',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'SystemV/MST7MDT',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'SystemV/PST8',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'Pacific Standard Time',
      },
      {
        timezone: 'PST',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Pacific Daylight Time',
      },
      {
        timezone: 'Navajo',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Mountain Daylight Time',
      },
      {
        timezone: 'NET',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Armenia Time',
      },
      {
        timezone: 'Europe/Saratov',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Saratov Standard Time',
      },
      {
        timezone: 'America/Mendoza',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Argentine Time',
      },
      {
        timezone: 'Libya',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Asia/Krasnoyarsk',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Krasnoyarsk Time',
      },
      {
        timezone: 'America/Nipigon',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Marquesas',
        timezoneOffset: 'GMT-09:30',
        timezoneName: 'Marquesas Time',
      },
      {
        timezone: 'ROK',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Korea Standard Time',
      },
      {
        timezone: 'Brazil/DeNoronha',
        timezoneOffset: 'GMT-02:00',
        timezoneName: 'Fernando de Noronha Time',
      },
      {
        timezone: 'America/La_Paz',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Bolivia Time',
      },
      {
        timezone: 'Australia/Currie',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Asia/Phnom_Penh',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'Indochina Time',
      },
      {
        timezone: 'America/Kralendijk',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Africa/Mbabane',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'South Africa Standard Time',
      },
      {
        timezone: 'America/Pangnirtung',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Universal',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Coordinated Universal Time',
      },
      {
        timezone: 'Australia/South',
        timezoneOffset: 'GMT+10:30',
        timezoneName: 'Australian Central Daylight Time',
      },
      {
        timezone: 'America/Bogota',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Colombia Time',
      },
      {
        timezone: 'Asia/Srednekolymsk',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Srednekolymsk Time',
      },
      {
        timezone: 'Asia/Jakarta',
        timezoneOffset: 'GMT+07:00',
        timezoneName: 'West Indonesia Time',
      },
      {
        timezone: 'Antarctica/Syowa',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Syowa Time',
      },
      {
        timezone: 'America/Mexico_City',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Portugal',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Western European Time',
      },
      {
        timezone: 'America/North_Dakota/Center',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Central Daylight Time',
      },
      {
        timezone: 'Etc/GMT+8',
        timezoneOffset: 'GMT-08:00',
        timezoneName: 'GMT-08:00',
      },
      {
        timezone: 'America/Belem',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'America/St_Barthelemy',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'America/Hermosillo',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Europe/Belgrade',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Pacific/Pago_Pago',
        timezoneOffset: 'GMT-11:00',
        timezoneName: 'Samoa Standard Time',
      },
      {
        timezone: 'Europe/Moscow',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Moscow Standard Time',
      },
      {
        timezone: 'Asia/Tokyo',
        timezoneOffset: 'GMT+09:00',
        timezoneName: 'Japan Standard Time',
      },
      {
        timezone: 'America/Managua',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'America/Merida',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'America/Glace_Bay',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'America/Tortola',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'SystemV/YST9YDT',
        timezoneOffset: 'GMT-09:00',
        timezoneName: 'Alaska Standard Time',
      },
      {
        timezone: 'Europe/Sarajevo',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Goose_Bay',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Atlantic Daylight Time',
      },
      {
        timezone: 'Europe/Malta',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Antarctica/Rothera',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Rothera Time',
      },
      {
        timezone: 'Etc/GMT0',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'CTT',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'China Standard Time',
      },
      {
        timezone: 'Africa/Maputo',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Iran',
        timezoneOffset: 'GMT+03:30',
        timezoneName: 'Iran Standard Time',
      },
      {
        timezone: 'Europe/Kiev',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'America/Puerto_Rico',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Africa/Harare',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Central African Time',
      },
      {
        timezone: 'Africa/Johannesburg',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'South Africa Standard Time',
      },
      {
        timezone: 'America/Dawson_Creek',
        timezoneOffset: 'GMT-07:00',
        timezoneName: 'Mountain Standard Time',
      },
      {
        timezone: 'Asia/Riyadh',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Arabia Standard Time',
      },
      {
        timezone: 'Etc/GMT-1',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'GMT+01:00',
      },
      {
        timezone: 'America/Recife',
        timezoneOffset: 'GMT-03:00',
        timezoneName: 'Brasilia Time',
      },
      {
        timezone: 'America/Indiana/Vevay',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'America/Cayman',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'America/Caracas',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Venezuela Time',
      },
      {
        timezone: 'America/Cancun',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Eastern Standard Time',
      },
      {
        timezone: 'America/Belize',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Asia/Brunei',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Brunei Time',
      },
      {
        timezone: 'Europe/Isle_of_Man',
        timezoneOffset: 'GMT+00:00',
        timezoneName: 'Greenwich Mean Time',
      },
      {
        timezone: 'Asia/Muscat',
        timezoneOffset: 'GMT+04:00',
        timezoneName: 'Gulf Standard Time',
      },
      {
        timezone: 'America/Porto_Acre',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Acre Time',
      },
      {
        timezone: 'Pacific/Nauru',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Nauru Time',
      },
      {
        timezone: 'Asia/Tel_Aviv',
        timezoneOffset: 'GMT+03:00',
        timezoneName: 'Israel Daylight Time',
      },
      {
        timezone: 'US/East-Indiana',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Pacific/Tongatapu',
        timezoneOffset: 'GMT+13:00',
        timezoneName: 'Tonga Time',
      },
      {
        timezone: 'America/Indianapolis',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'Asia/Ulan_Bator',
        timezoneOffset: 'GMT+08:00',
        timezoneName: 'Ulaanbaatar Time',
      },
      {
        timezone: 'Australia/Hobart',
        timezoneOffset: 'GMT+11:00',
        timezoneName: 'Australian Eastern Daylight Time',
      },
      {
        timezone: 'Europe/Rome',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Grenada',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Atlantic Standard Time',
      },
      {
        timezone: 'Asia/Omsk',
        timezoneOffset: 'GMT+06:00',
        timezoneName: 'Omsk Time',
      },
      {
        timezone: 'Europe/Vatican',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'Brazil/Acre',
        timezoneOffset: 'GMT-05:00',
        timezoneName: 'Acre Time',
      },
      {
        timezone: 'Europe/Ljubljana',
        timezoneOffset: 'GMT+01:00',
        timezoneName: 'Central European Time',
      },
      {
        timezone: 'America/Montreal',
        timezoneOffset: 'GMT-04:00',
        timezoneName: 'Eastern Daylight Time',
      },
      {
        timezone: 'ART',
        timezoneOffset: 'GMT+02:00',
        timezoneName: 'Eastern European Time',
      },
      {
        timezone: 'Mexico/General',
        timezoneOffset: 'GMT-06:00',
        timezoneName: 'Central Standard Time',
      },
      {
        timezone: 'Australia/Darwin',
        timezoneOffset: 'GMT+09:30',
        timezoneName: 'Australian Central Standard Time',
      },
      {
        timezone: 'Australia/Broken_Hill',
        timezoneOffset: 'GMT+10:30',
        timezoneName: 'Australian Central Daylight Time',
      },
      {
        timezone: 'Asia/Kamchatka',
        timezoneOffset: 'GMT+12:00',
        timezoneName: 'Petropavlovsk-Kamchatski Time',
      },
      {
        timezone: 'Pacific/Chuuk',
        timezoneOffset: 'GMT+10:00',
        timezoneName: 'Chuuk Time',
      },
    ];

    // 🔹 Truncate table (clear old data)
    await Timezone.truncate({ transaction });

    // 🔹 Bulk insert
    await Timezone.bulkCreate(timezones, {
      transaction,
      hooks: true,
      individualHooks: true,
      user: req.userDetails,
    });

    await transaction.commit();

    res.status(201).json({ message: 'Timezones created successfully' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    let {
      page,
      pageSize,
      sortByField,
      sortByValue,
      search,
      status,
    } = req.query;

    const allowedKeys = [
      'page',
      'pageSize',
      'sortByField',
      'sortByValue',
      'search',
      'status',
    ];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    let offset = 0;
    if(page && pageSize) {
      page = parseInt(page);
      pageSize = parseInt(pageSize);
      offset = (page - 1) * pageSize;
    }


    if (!sortByField) {
      sortByField = 'createdAt';
    }

    if (!sortByValue) {
      sortByValue = 'DESC';
    }

    const order = [[sortByField, sortByValue]];
    const where = {};

    if (search) {
      where[Op.or] = [
        { timezone: { [Op.iLike]: `%${search}%` } },
        { timezoneOffset: { [Op.iLike]: `%${search}%` } },
        { timezoneName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status !== undefined && status !== null && status !== '') {
      where.status = parseInt(status);
    }



    const attributes = [
      'timezoneID',
      'timezone',
      'timezoneOffset',
      'timezoneName',
      'status',
    ];

    const include = [
    ];

    const result = await TimezoneService.listTimezone(
      offset,
      pageSize,
      order,
      where,
      attributes,
      include,
      true
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.fetchMessage('Timezone'),
      data: result.rows,
      totalRecords: result.count,
      currentPage: page,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.edit = async (req, res, next) => {
  try {
    const allowedParams = ['id'];

    const invalidParams = invalidKeyParams(req.params, allowedParams);

    if (invalidParams.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Missing required parameter: id',
      });
    }

    const attributes = [
      'timezoneID',
      'timezone',
      'timezoneOffset',
      'timezoneName',
      'status',
      'createBy',
      'updateBy',
      'createdAt',
      'updatedAt',
    ];

    const result = await TimezoneService.editTimezone(
      { timezoneID: id },
      attributes
    );

    if (!result) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: 404,
        message: 'Timezone not found',
      });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Timezone'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = [
      'id',
      'timezone',
      'timezoneOffset',
      'timezoneName',
      'status'
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { id, timezone, timezoneOffset, timezoneName, status } = req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'ID is required',
      });
    }

    if (timezone && timezoneOffset) {
      const existingTimezone = await TimezoneService.editTimezone(
        {
          timezoneID: { [Op.not]: +id },
          [Op.or]: [
            { timezone: timezone },
            { timezoneOffset: timezoneOffset },
          ],
        },
        ['timezoneID', 'timezone', 'timezoneOffset']
      );

      if (existingTimezone) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'Timezone already exists',
        });
      }
    }

    const timezoneObject = {};

    if (timezone !== undefined)       timezoneObject.timezone = timezone;
    if (timezoneOffset !== undefined)  timezoneObject.timezoneOffset = timezoneOffset;
    if (timezoneName !== undefined)    timezoneObject.timezoneName = timezoneName;
    if (status !== undefined)          timezoneObject.status = status;

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    await TimezoneService.updateTimezone(
      timezoneObject,
      { timezoneID: +id },
      options
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Timezone'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};


function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}
