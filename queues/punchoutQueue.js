// queues/punchoutQueue.js
const { Queue } = require('bullmq');
const connection = require('../config/redis');

const punchoutQueue = new Queue('auto-punchout', { connection });

module.exports = punchoutQueue;