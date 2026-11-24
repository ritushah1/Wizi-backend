/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const fs = require('fs');
const PngNationalTaxSlab = require('../models/pngNationalTaxSlab');
const PNGNationalTaxRebate = require('../models/pngNationalTaxRebate');

exports.uploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);
  try {
    const { applicableYYYYMM } = req.body;

    if (!applicableYYYYMM)
      return res
        .status(200)
        .send({ status: 401, message: 'applicableYYYYMM is required!' });

    const rows = await readXlsxFile(filePath);

    rows.shift();

    const finalData = [];

    for (const data of rows) {
      finalData.push({
        applicableYYYYMM,
        exceeding: data[0],
        notExceeding: data[1],
        type: data[2],
        taxDependant0: data[3],
        taxDependant1: data[4],
        taxDependant2: data[5],
        taxDependant3: data[6],
      });
    }

    await PngNationalTaxSlab.bulkCreate(finalData, { user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: 'Data upload successfully.',
    });
  } catch (error) {
    next(error);
  }
};


exports.uploadExcelTaxRebate = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);
  try {
    const { applicableYYYYMM } = req.body;

    if (!applicableYYYYMM)
      return res
        .status(200)
        .send({ status: 401, message: 'applicableYYYYMM is required!' });

    const rows = await readXlsxFile(filePath);

    rows.shift();

    const finalData = [];

    for (const data of rows) {
      finalData.push({
        applicableYYYYMM,
        type: data[0],
        taxDependant0: data[1],
        taxDependant1: data[2],
        taxDependant2: data[3],
        taxDependant3: data[4],
      });
    }

    await PNGNationalTaxRebate.bulkCreate(finalData, { user: req.userDetails });

    return res.status(200).json({
      status: 200,
      message: 'Data upload successfully.',
    });
  } catch (error) {
    next(error);
  }
};

