const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

async function createMonthlyPartitions(
  parentTable,
  partitionPrefix,
  monthsToCreate = 6,
) {
  const partitions = [];

  for (let i = 0; i < monthsToCreate; i++) {
    const start = moment()
      .add(i, 'months')
      .startOf('month')
      .format('YYYY-MM-DD');
    const end = moment(start).add(1, 'month').format('YYYY-MM-DD');
    const tableName = `${partitionPrefix}${moment(start).format('YYYY_MM')}`;

    const exists = await sequelize.query(
      `SELECT to_regclass(:tableName) as exists;`,
      {
        replacements: { tableName: `"${tableName}"` },
        type: QueryTypes.SELECT,
      },
    );

    if (!exists[0].exists) {
      await sequelize.query(
        `CREATE TABLE "${tableName}" PARTITION OF "${parentTable}" FOR VALUES FROM ('${start}') TO ('${end}');`,
      );
      logToFile(`Created partition: ${tableName}`);
      partitions.push({ tableName, status: 'created' });
    } else {
      logToFile(`Partition already exists: ${tableName}`);
      partitions.push({ tableName, status: 'exists' });
    }
  }

  return partitions;
}
// Set log directory and file
const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'tablecreation.log');

// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Helper function to log
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
};
exports.createMonthlyPartitionsForTables = async (req, res) => {
  try {
    const parentTable = req.parentTable;
    const monthsToCreate = req.monthsToCreate || 6;
    const partitionPrefix = `${parentTable}_`;

    if (!parentTable) {
      const msg =
        'Parent Table Name Not Passed. Please provide a valid parameter.';
      console.error(msg);
      logToFile(`Error: ${msg}`);
      return res?.status(400).json({ status: 400, message: msg });
    }

    logToFile(`${parentTable}: Partition creation started...`);

    const processedTableResults = await createMonthlyPartitions(
      parentTable,
      partitionPrefix,
      monthsToCreate,
    );

    logToFile(
      `${parentTable}: Table Creation completed. Results: ${JSON.stringify(processedTableResults)}`,
    );

    return res?.status(200).json({
      status: 200,
      message: 'Processing completed..........',
      results: processedTableResults,
    });
  } catch (err) {
    console.error('❌ Error creating partitions:', err);
    logToFile(`Error creating partitions: ${err.message}`);
    return res?.status(500).json({
      status: 500,
      message: 'Internal Server Error while creating partitions.',
      error: err.message,
    });
  }
};
