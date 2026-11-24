const path = require('path');
const { companyMasterIDENUM } = require('../utils/dbUtils');
const { connect } = require('http2');
const dotenv = require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const mehta_Hightech_ERP_config = {
  server: dotenv.parsed.ERP_SERVER,
  port: +dotenv.parsed.ERP_PORT,
  user: dotenv.parsed.ERP_USER,
  password: dotenv.parsed.ERP_PASSWORD,
  database: dotenv.parsed.ERP_DATABASE,
  options: {
    encrypt: true, // Use true if you're on Azure or have SSL enabled
    trustServerCertificate: true, // Use this option if the server has a self-signed certificate
  },
  requestTimeout: 120000,
};

const mehta_Softech_ERP_config = {
  server: dotenv.parsed.ERP_SERVER,
  port: +dotenv.parsed.ERP_PORT,
  user: dotenv.parsed.ERP_USER,
  password: dotenv.parsed.ERP_PASSWORD,
  database: dotenv.parsed.ERP_DATABASE_MEHTA_SOFTECH,
  options: {
    encrypt: true, // Use true if you're on Azure or have SSL enabled
    trustServerCertificate: true, // Use this option if the server has a self-signed certificate
  },
  requestTimeout: 120000,
};

// 🔹 Utility function to get config based on companyMasterID
function getErpDatabaseConfig(companyMasterID) {
  return companyMasterID == companyMasterIDENUM.MEHTA_HIGHTECH_INDUSTRIES
    ? mehta_Hightech_ERP_config
    : mehta_Softech_ERP_config;
}
module.exports = {
  mehta_Hightech_ERP_config,
  mehta_Softech_ERP_config,
  getErpDatabaseConfig,
};
