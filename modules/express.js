const express = require('express');
const { EAppName, statusCodes } = require('../utils/commonVars');
const AppNameUtils = require('../utils/appName.utils');
const APP_NAME = AppNameUtils.getAppName();
const requestLogger = require('../middleware/requestLogger');
const path = require('path');
const { errorMessage } = require('../response_message/message');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const bullBoardAdapter = require('../bullboard');
const { bullBoardAuth } = require('../middleware/bullboardAuth');
module.exports = (app) => {
  const port = 3000;
  if (APP_NAME === EAppName.API) {
    // const commonApiLimiter = rateLimit({
    //   windowMs: 60 * 1000, // 1 minute
    //   max: 100,
    //   standardHeaders: true,
    //   legacyHeaders: false,
    //   keyGenerator: (req) => {
    //     return `${req.headers['x-forwarded-for']}:${req.baseUrl}${req.path}`;
    //   },
    //   message: {
    //     status: 401,
    //     message: 'Rate limit exceeded. Please try again after Some time.',
    //   },
    // });
    // app.use(commonApiLimiter);

    if (process.env.API_LOGS_ENABLE == 'true') {
      app.use(requestLogger);
    }
    app.use(cookieParser());
    app.use(
      '/bootstrap',
      express.static(`${__dirname}../node_modules/bootstrap/dist`),
    );
    app.use(
      '/uploads',
      (req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      },
      express.static('uploads'),
    );
    app.use('/css', express.static(path.join(__dirname, '../css')));

    require('../router')(app);

    app.use('/admin/queues', bullBoardAuth, bullBoardAdapter.getRouter());
    app.use((error, req, res, next) => {
      console.log('Error in middleware ==>', error);
      const status = error.statusCode || statusCodes.INTERNAL_SERVER;
      const message = error.message || errorMessage.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ status, message });
    });
    app.listen(port);
    console.log(
      'Database connection is established and app is now running on port:',
      port,
    );
  }
};
