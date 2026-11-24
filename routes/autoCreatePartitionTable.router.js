const express = require('express');
const AutoCreatePartitionTableController = require('../controllers/autoCreatePartitionTable.controller');
const router = express.Router();

router.post(
  '/v1/createMonthlyPartitionsForTables',
  AutoCreatePartitionTableController.createMonthlyPartitionsForTables
);

module.exports = router;
