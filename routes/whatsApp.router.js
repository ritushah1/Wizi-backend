const express = require('express');
const router = express.Router();
const whatsAppController = require('../controllers/whatsApp.controller');

router.get('/v1/whatsappVerify', whatsAppController.whatsappVerify);
router.post('/v1/whatsappVerify', whatsAppController.whatsappMessageHandler);

module.exports = router;
