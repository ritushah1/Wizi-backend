// bullboard.js
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const punchoutQueue = require('./queues/punchoutQueue');
 
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
 
createBullBoard({
  queues: [new BullMQAdapter(punchoutQueue)],
  serverAdapter,
});
 
module.exports = serverAdapter; 