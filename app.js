require('dotenv').config();

const { EAppName } = require('./utils/commonVars');
const AppNameUtils = require('./utils/appName.utils');
const APP_NAME = AppNameUtils.getAppName();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const sequelize = require('./config/database');

const { ProjectName } = require('./utils/labelUtils');
const { sanitizeMiddleware } = require('./utils/sanitizeMiddleware');
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // scriptSrc: ["'self'"],
        // styleSrc: ["'self'", "'unsafe-inline'"],
        // imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        // connectSrc: ["'self'", 'https:', 'wss:', 'ws:', ...allowedOrigins],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        // Only these domains can embed your application in an iframe
        frameAncestors: ["'self'", ...allowedOrigins],
        formAction: ["'self'"],
      },
    },

    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    noSniff: true,

    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    xXssProtection: false,
  }),
);

/**
 * Helmet does not add Permissions-Policy by default.
 */
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  );

  next();
});

const corsOptions = {
  origin(origin, callback) {
    // Allow Postman, curl, mobile apps and server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new Error('Origin not allowed by CORS');
    corsError.status = 403;
    corsError.code = 'CORS_NOT_ALLOWED';
    return callback(corsError);
  },

  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  express.json({
    limit: '500mb',
    strict: true,
  }),
);

app.use(
  express.urlencoded({
    limit: '500mb',
    extended: true,
    parameterLimit: 50000,
  }),
);

app.use(sanitizeMiddleware);
app.use(express.static('public'));
app.use(morgan('combined'));
app.use(
  '/.well-known/acme-challenge',
  express.static('.well-known/acme-challenge'),
);

app.get('/', (req, res) => {
  return res.json({
    message: `Welcome to ${ProjectName} - ${APP_NAME}`,
  });
});

/**
 * Register application routes only after database authentication.
 */
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connected successfully.....................');
    if (APP_NAME === EAppName.API) {
      require('./modules/express')(app);
    } else if (APP_NAME === EAppName.REPORT_SOCKET) {
      require('./modules/socket')(app);
      require('./socket-router')(app);
      require('./cron')();
      // require('./workers/punchoutWorker'); // ← starts the BullMQ worker
    }

    /**
     * 404 middleware.
     * Must be placed after all application routes.
     */
    app.use((req, res) => {
      return res.status(404).json({
        status: 404,
        message: 'API endpoint not found',
      });
    });

    /**
     * Centralized error-handling middleware.
     * Must be the last Express middleware.
     */
    app.use((err, req, res, next) => {
      // Log detailed information only on the server.
      console.error({
        message: err.message,
        stack: err.stack,
        code: err.code,
        type: err.type,
        status: err.status || err.statusCode,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        contentType: req.get('content-type'),
        timestamp: new Date().toISOString(),
      });

      /**
       * Invalid/malformed JSON request body.
       */
      const isMalformedJson =
        err.type === 'entity.parse.failed' ||
        (err instanceof SyntaxError &&
          err.status === 400 &&
          Object.prototype.hasOwnProperty.call(err, 'body'));

      if (isMalformedJson) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid JSON request body',
        });
      }

      /**
       * Request body exceeds configured limit.
       */
      if (err.type === 'entity.too.large') {
        return res.status(413).json({
          status: 413,
          message: 'Request payload is too large',
        });
      }

      /**
       * Unsupported content encoding.
       */
      if (err.type === 'encoding.unsupported') {
        return res.status(415).json({
          status: 415,
          message: 'Unsupported content encoding',
        });
      }

      /**
       * CORS validation failure.
       */
      if (err.code === 'CORS_NOT_ALLOWED') {
        return res.status(403).json({
          status: 403,
          message: 'Origin is not allowed',
        });
      }

      /**
       * Multer/file-upload errors can also reach this middleware.
       */
      if (err.name === 'MulterError') {
        return res.status(400).json({
          status: 400,
          message: 'Invalid file upload request',
        });
      }

      const requestedStatus = Number(err.status || err.statusCode);

      const statusCode =
        Number.isInteger(requestedStatus) &&
          requestedStatus >= 400 &&
          requestedStatus < 500
          ? requestedStatus
          : 500;

      return res.status(statusCode).json({
        status: statusCode,
        message:
          statusCode === 500
            ? 'Internal server error'
            : 'Unable to process the request',
      });
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  });

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString(),
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  // Exit because the Node.js process may now be in an unsafe state.
  process.exit(1);
});
