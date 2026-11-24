const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const BLOCKED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.xhtml',
  '.svg',
  '.xml',
  '.js',
  '.mjs',
  '.cjs',
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
]);

const generateStorageConfig = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.normalize(path.join(destination)));
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}_${Date.now()}_${crypto.randomUUID()}${ext}`);
    },
  });
};

const configureMulter = (destination, fileSize, allowedFileTypes) => {
  if (!fs.existsSync(path.join(destination))) {
    fs.mkdirSync(path.join(destination), { recursive: true }, (err) => {});
  }
  return multer({
    storage: generateStorageConfig(destination),
    limits: {
      fileSize,
    },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(extension)) {
        return cb(new Error(`The ${extension} file type is not allowed.`));
      }

      if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${allowedFileTypes} filetypes are allowed!`));
      }
    },
  });
};

const handleMulterErrors = (err, req, res, next) => {
  if (err) {
    return res
      .status(400)
      .json({ message: err.message || 'Internal server error!' });
  }
  // No errors, proceed to the next middleware/route handler
  next();
};

const configureMulterCompanyWiseDocs = ({
  destination,
  fileSize,
  allowedFileTypes,
}) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        try {
          const companyId = req.body.companyMasterID;
          const companyDir = path.join(destination, companyId.toString());

          // Ensure directory exists
          if (!fs.existsSync(companyDir)) {
            fs.mkdirSync(companyDir, { recursive: true });
          }

          cb(null, companyDir);
        } catch (err) {
          cb(err, destination);
        }
      },
      filename: (req, file, cb) => {
        const uniqueDigits = crypto.randomInt(1000, 10000); // 4-digit number (1000–9999)
        const extension = path.extname(file.originalname);
        const timestamp = Date.now();
        cb(null, `${file.fieldname}-${timestamp}-${uniqueDigits}${extension}`);
      },
    }),
    limits: {
      fileSize,
    },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(extension)) {
        return cb(new Error(`The ${extension} file type is not allowed.`));
      }

      if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Only ${allowedFileTypes.join(', ')} filetypes are allowed!`,
          ),
        );
      }
    },
  });
};

const configureMulterWithMultipleGenerateStorageConfig = ({
  destination,
  fileSize,
  allowedFileTypes,
  isCompanyDetails = false,
  isUserDocumentFiles = false,
}) => {
  if (!fs.existsSync(path.join(destination))) {
    fs.mkdirSync(path.join(destination), { recursive: true }, (err) => {});
  }
  let storageConfig = generateStorageConfig(destination);
  if (isCompanyDetails) {
    storageConfig = generateCompanyDetailsStorageConfig(destination);
  } else if (isUserDocumentFiles) {
    storageConfig = generateUserCreateDocumentStorageConfig(destination);
  }
  return multer({
    storage: storageConfig,
    limits: {
      fileSize,
    },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(extension)) {
        return cb(new Error(`The ${extension} file type is not allowed.`));
      }

      if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${allowedFileTypes} filetypes are allowed!`));
      }
    },
  });
};

const generateCompanyDetailsStorageConfig = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const folderMap = {
        companyLogo: 'logo',
        authorizedSignature: 'signature',
        letterHead: 'letterHead',
      };

      const folderName = folderMap[file.fieldname];

      if (!folderName) {
        return cb(new Error(`File field "${file.fieldname}" is not allowed.`));
      }

      const uploadPath = path.normalize(path.join(destination, folderName));

      // Create directory if it does not exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const random = crypto.randomInt(0, 1000000);

      cb(null, `${Date.now()}_${random}${ext}`);
    },
  });
};

const generateUserCreateDocumentStorageConfig = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let folderName;

      switch (file.fieldname) {
        case 'photo':
          folderName = 'photo';
          break;

        case 'attachment':
        case 'aadhaar[aadhaarFrontPhoto]':
        case 'aadhaar[aadhaarBackPhoto]':
        case 'panPhoto':
        case 'aadharCardPhoto':
        case 'aadharCardPhoto1':
        case 'panCardPhoto':
        case 'drivingLicensePhoto':
        case 'declarationFormPhoto':
        case 'bankPassbookPhoto':
          folderName = 'document';
          break;

        default:
          return cb(
            new Error(`File field "${file.fieldname}" is not allowed.`),
          );
      }

      const uploadPath = path.normalize(path.join(destination, folderName));

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const random = crypto.randomInt(0, 1000000);

      cb(null, `${file.fieldname}_${Date.now()}_${random}${ext}`);
    },
  });
};
module.exports = {
  configureMulter,
  handleMulterErrors,
  configureMulterCompanyWiseDocs,
  configureMulterWithMultipleGenerateStorageConfig,
};
