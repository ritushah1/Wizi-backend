const express = require('express');
const { EAppName } = require('../utils/commonVars');
const AppNameUtils = require('../utils/appName.utils');
const APP_NAME = AppNameUtils.getAppName();
const requestLogger = require('../middleware/requestLogger');
const path = require('path');

module.exports = (app) => {
  const port = 3000;
  if (APP_NAME === EAppName.API) {
    // app.use(requestLogger);
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      next();
    });
    app.use(
      '/bootstrap',
      express.static(`${__dirname}../node_modules/bootstrap/dist`),
    );
    app.use('/css', express.static(path.join(__dirname, '../css')));

    require('../router')(app);

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
