const { onReceivedMessage } = require('../utils/whatsappWebhook');

const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
exports.whatsappVerify = async (req, res, next) => {
  try {
    const {
      'hub.mode': mode,
      'hub.challenge': challenge,
      'hub.verify_token': token,
    } = req.query;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log(
        ' ---------------------------- WEBHOOK VERIFIED ---------------------------- ',
      );
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
  } catch (error) {
    console.error('Verification error:', error);

    next(error);
  }
};

exports.whatsappMessageHandler = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(
      `---------------------------------------------------- Webhook received -------------------------------------------------- ${timestamp}\n`,
    );

    if (req.body?.entry?.[0]?.changes?.length) {
      await onReceivedMessage(req.body.entry[0].changes[0]);
    }
    return res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
};
