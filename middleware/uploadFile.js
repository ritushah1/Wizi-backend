const path = require('path');
const fs = require('fs');
const {
  handleMulterErrors,
  configureMulterCompanyWiseDocs,
  configureMulterWithMultipleGenerateStorageConfig,
} = require('../middleware/multer');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
// Images
const MIME_TYPE_JPEG = 'image/jpeg';
const MIME_TYPE_PNG = 'image/png';
const MIME_TYPE_HEIC = 'image/heic';
const MIME_TYPE_HEIF = 'image/heif';
// PDF
const MIME_TYPE_PDF = 'application/pdf';

// Word
const MIME_TYPE_DOC = 'application/msword';
const MIME_TYPE_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Excel
const MIME_TYPE_XLS = 'application/vnd.ms-excel';
const MIME_TYPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// CSV
const MIME_TYPE_CSV = 'text/csv';
const MIME_TYPE_CSV_ALT = 'application/csv';
const MIME_TYPE_TEXT = 'text/plain'; // Some browsers upload CSV as text/plain

// Zip
const MIME_TYPE_ZIP = 'application/zip';

const IMAGE_MIME_TYPES = [
  MIME_TYPE_JPEG,
  MIME_TYPE_PNG,
  MIME_TYPE_HEIC,
  MIME_TYPE_HEIF,
];
const PDF_MIME_TYPES = [MIME_TYPE_PDF];
const EXCEL_MIME_TYPES = [MIME_TYPE_XLS, MIME_TYPE_XLSX];
const DOCUMENT_MIME_TYPES = [MIME_TYPE_DOC, MIME_TYPE_DOCX];
const CSV_MIME_TYPES = [MIME_TYPE_CSV, MIME_TYPE_CSV_ALT, MIME_TYPE_TEXT];
const ZIP_MIME_TYPES = [MIME_TYPE_ZIP];

function getFilePath(fileStorePath) {
  const filePath = path.join(__dirname, fileStorePath);
  return filePath;
}
function deleteFileFromServer(filePath) {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${filePath}`, err);
      return;
    }

    console.log(`File deleted successfully: ${path.basename(filePath)}`);
  });
}
function uploadUserProfilePhoto(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/photo'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('photo');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadUserSignature(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/signature'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('signature');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadProductImage(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/product/photo'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('productPhoto');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

// Upload S3 Done
function uploadCompanyNDA(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/company/Nda'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...PDF_MIME_TYPES],
  }).single('pdf');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadHRToolKit(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/hrtoolkit/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...ZIP_MIME_TYPES],
  }).single('DocumentZip');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadResignation(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/resignation/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).single('attachment');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadTankhwaFace(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/tankhwaFace/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('facePhoto');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadUserChat(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/chatfile/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).single('path');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadEmployeeDeclaration(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-declaration-attachments'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
    ],
  }).array('attachments', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
const uploadImportExcelFilePath = '../uploads';
function uploadImportExcelFile(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath(uploadImportExcelFilePath),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...EXCEL_MIME_TYPES],
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadEmployeeRentedResidenceFiles(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/hra-proof/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
    ],
  }).fields([{ name: 'attachment' }, { name: 'ownerAttachment' }]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadCompanyDetailsFiles(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/company/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
    isCompanyDetails: true,
  }).fields([
    { name: 'companyLogo', maxCount: 1 },
    { name: 'authorizedSignature', maxCount: 1 },
    { name: 'letterHead', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadUserCreateDocumentFiles(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
    isUserDocumentFiles: true,
  }).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'attachment', maxCount: 100 },
    { name: 'aadhaar[aadhaarFrontPhoto]', maxCount: 10 },
    { name: 'aadhaar[aadhaarBackPhoto]', maxCount: 10 },
    { name: 'panPhoto', maxCount: 10 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadEmployeeJoiningRequestDocumentFiles(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
    isUserDocumentFiles: true,
  }).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'aadharCardPhoto', maxCount: 1 },
    { name: 'panCardPhoto', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 },
    { name: 'declarationFormPhoto', maxCount: 1 },
    { name: 'bankPassbookPhoto', maxCount: 1 },
    { name: 'aadharCardPhoto1', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadAnnouncement(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/announcement'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
      ...CSV_MIME_TYPES,
    ],
  }).array('file', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadAssetMaster(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/assets/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...PDF_MIME_TYPES],
  }).single('assetDocument');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadAssginAsset(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/assets/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).array('assetImages', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadBiometricUser(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/biometricUser'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('face');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadCompanyDocument(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/company/document'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).single('document');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadDailyTask(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/dailyTask/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
    ],
  }).array('attachment', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadOrgnizationDocument(req, res, next) {
  const upload = configureMulterCompanyWiseDocs({
    destination: getFilePath('../uploads/organizationDocument/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).single('attachment');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadEmployeeGatePass(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-gatepass'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).array('attachment', 1);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadEmployeeJoiningDocuments(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/document'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
    ],
  }).fields([
    { name: 'adharPhoto', maxCount: 1 },
    { name: 'panPhoto', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadEmployeeJoiningUserface(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user-faces'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).array('userFaces', 5);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadEmployeePenalty(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-penalty-attachments'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('attachment');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadEmpPayrollStatutory(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-payroll-statutory'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...EXCEL_MIME_TYPES],
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadHrSalary(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/upload-salary-structure'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...EXCEL_MIME_TYPES],
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadJobApplication(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/job'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).single('resumeAttachment');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadJobDocument(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/document/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).array('attachment', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadFamilyDetails(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/family/document/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'relationAttachment', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadEducationDetails(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/degree'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).single('degree');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserDocumentDetails(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/document'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).array('document', 2);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadDailyTaskDetails(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/dailyTask/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).array('attachment', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadOfficeExpense(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/office-expense'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).array('attachFile', 40);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadPolicyDocument(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/policy-documents'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).single('document');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadResignProcess(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/resignation'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).array('attachment', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadTeamPermissionApi(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/validated'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...EXCEL_MIME_TYPES],
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

// Upload S3 Done
function uploadUserTask(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/task/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).array('attachment', 10);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

// Upload S3 Done
function uploadUserTaskRemark(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/taskRemarks/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).single('attachment');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserDocument(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/document'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).array('document', 2);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserEducation(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user/degree'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).single('degree');
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

// Upload S3 Done
function uploadUserExpense(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/user-Expense'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).array('attachFile', 40);
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserFamily(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/family/document/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'relationAttachment', maxCount: 1 },
  ]);
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserLeave(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-leave-attachment'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).array('attachment', 10);
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserLeaves(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/employee-leave-attachment'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).single('attachment');
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadUserLeavexlsx(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/validated'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...EXCEL_MIME_TYPES],
  }).single('file');
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadVisit(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/visitAttachment'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).fields([
    { name: 'checkInAttachment', maxCount: 1 },
    { name: 'checkOutAttachment', maxCount: 1 },
  ]);
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadVisitor(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/visitors/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES],
  }).single('visitorPhoto');
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadPreboardingFromDocument(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/preboarding'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...CSV_MIME_TYPES,
      ...EXCEL_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).any();
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadSalarySlipFormat(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/salarySlipFormat'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).fields([
    { name: 'attachFile', maxCount: 1 },
    { name: 'attachImage', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadTicketFiles(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/ticket-attachments'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      ...IMAGE_MIME_TYPES,
      ...PDF_MIME_TYPES,
      ...DOCUMENT_MIME_TYPES,
    ],
  }).array('attachments', 5);
  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadIDCardFormat(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/salarySlipFormat'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [...IMAGE_MIME_TYPES, ...PDF_MIME_TYPES],
  }).fields([
    { name: 'portraitAttachFile', maxCount: 1 },
    { name: 'portraitAttachImage', maxCount: 1 },
    { name: 'landscapeAttachFile', maxCount: 1 },
    { name: 'landscapeAttachImage', maxCount: 1 },
    { name: 'pdfPortraitAttachFile', maxCount: 1 },
    { name: 'pdfPortraitAttachImage', maxCount: 1 },
    { name: 'pdfLandscapeAttachFile', maxCount: 1 },
    { name: 'pdfLandscapeAttachImage', maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
function uploadLMSCoverImage(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/lmsCourseCoverImage/'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [MIME_TYPE_JPEG, MIME_TYPE_PNG],
  }).single('coverImage');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}

function uploadResumePreboarding(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/preboarding/resume'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      MIME_TYPE_JPEG,
      MIME_TYPE_PNG,
      MIME_TYPE_DOC,
      MIME_TYPE_DOCX,
      MIME_TYPE_PDF,
    ],
  }).single('resume');

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }
    next();
  });
}
function uploadWebMobileAttendanceAttachment(req, res, next) {
  const upload = configureMulterWithMultipleGenerateStorageConfig({
    destination: getFilePath('../uploads/webMobileAttendanceAttachment'),
    fileSize: MAX_FILE_SIZE,
    allowedFileTypes: [
      MIME_TYPE_JPEG,
      MIME_TYPE_PNG,
      MIME_TYPE_DOC,
      MIME_TYPE_DOCX,
      MIME_TYPE_PDF,
      MIME_TYPE_XLS,
      MIME_TYPE_XLSX,
    ],
  }).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
    { name: 'attendanceCustomizeFieldAttachment', maxCount: 100 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      return handleMulterErrors(err, req, res, next);
    }

    next();
  });
}
module.exports = {
  getFilePath,
  deleteFileFromServer,
  uploadUserProfilePhoto,
  uploadUserSignature,
  uploadProductImage,
  uploadCompanyNDA,
  uploadHRToolKit,
  uploadResignation,
  uploadTankhwaFace,
  uploadUserChat,
  uploadEmployeeDeclaration,
  uploadImportExcelFile,
  uploadImportExcelFilePath,
  uploadEmployeeRentedResidenceFiles,
  uploadCompanyDetailsFiles,
  uploadUserCreateDocumentFiles,
  uploadEmployeeJoiningRequestDocumentFiles,
  uploadAnnouncement,
  uploadAssetMaster,
  uploadAssginAsset,
  uploadBiometricUser,
  uploadCompanyDocument,
  uploadDailyTask,
  uploadOrgnizationDocument,
  uploadEmployeeGatePass,
  uploadEmployeeJoiningDocuments,
  uploadEmployeeJoiningUserface,
  uploadEmployeePenalty,
  uploadEmpPayrollStatutory,
  uploadHrSalary,
  uploadJobApplication,
  uploadJobDocument,
  uploadFamilyDetails,
  uploadEducationDetails,
  uploadUserDocumentDetails,
  uploadDailyTaskDetails,
  uploadOfficeExpense,
  uploadPolicyDocument,
  uploadResignProcess,
  uploadTeamPermissionApi,
  uploadUserTask,
  uploadUserTaskRemark,
  uploadUserDocument,
  uploadUserEducation,
  uploadUserExpense,
  uploadUserFamily,
  uploadUserLeave,
  uploadUserLeaves,
  uploadUserLeavexlsx,
  uploadVisit,
  uploadVisitor,
  uploadPreboardingFromDocument,
  uploadSalarySlipFormat,
  uploadTicketFiles,
  uploadIDCardFormat,
  uploadLMSCoverImage,
  uploadResumePreboarding,
  uploadWebMobileAttendanceAttachment,
};
