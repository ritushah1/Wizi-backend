const { employeementTypeEnumList, workerCategory } = require('./dbUtils');

const projectNamesList = {
  TANKHWA_PATRA: 'Tankhwa Patra',
  PIH: 'Pacific International Hospital',
  AKAR_AUTO: 'AKAR Auto',
  MARS: 'Mars Consultancy',
  REXTONE_INDUSTRIES: 'Rex-tone Industries Ltd.',
};
const faceApiUrl = process.env.API_FACE;
const mainApiUrl = process.env.APIURL;
const secretTokenForEnc = process.env.SECRETKEYFORENCODING;
const cryptokey = process.env.PASSWORD;
const appURL = process.env.HRMS_FRONTEND_URL;
const preboardingAppURL = `${appURL}#/user/preboarding/`;
const preboardingDocsAppURL = `${appURL}#/user/upload-preboard-docs/`;
const ProjectName = process.env.PROJECT_NAME;

const convertNameToLocalName =
  ProjectName == projectNamesList.TANKHWA_PATRA ? true : false; // Marathi For Savera
const pihMobileNo = ProjectName == projectNamesList.PIH ? true : false; // PIH MOBILE VALIDATION
const othernumberLabel =
  ProjectName == projectNamesList.PIH
    ? 'Emergency Contact Number'
    : 'Other Contact Number';
const showPayrollFrequency = ProjectName == projectNamesList.PIH ? true : false;
const showOvertimeGiveIn = ProjectName == projectNamesList.PIH ? true : false;
const validateAadharNumber = ProjectName == projectNamesList.PIH ? false : true;
const validatePanNumber = ProjectName == projectNamesList.PIH ? false : true;
const validatePFNumber = ProjectName == projectNamesList.PIH ? false : true;
const validateIfscCode = ProjectName == projectNamesList.PIH ? false : true;
const validateUAN = ProjectName == projectNamesList.PIH ? false : true;
const validateESICNumber = ProjectName == projectNamesList.PIH ? false : true;
const showEmployerLWF =
  ProjectName == projectNamesList.AKAR_AUTO ? false : true;
const showActualEDLI = ProjectName == projectNamesList.AKAR_AUTO ? true : false;
const TRACKING_MIGRATION_DATE =
  ProjectName == projectNamesList.TANKHWA_PATRA
    ? '2025-09-16'
    : ProjectName == projectNamesList.MARS
      ? '2025-09-25'
      : ProjectName == projectNamesList.AKAR_AUTO
        ? '2025-09-26'
        : ProjectName == projectNamesList.PIH
          ? '2025-09-16'
          : ProjectName == projectNamesList.REXTONE_INDUSTRIES
            ? '2025-09-16'
            : '';
const shopActLabel =
  ProjectName == projectNamesList.PIH ? 'Contract' : 'Shop Act';
const factoryActLabel =
  ProjectName == projectNamesList.PIH ? 'Employment Act PNG' : 'Factory Act';
const on_Working_Days_Label = 'on Working Days';
const showPayWithSalary = ProjectName != projectNamesList.MARS ? true : false;
const MEHTA_SERVICE_API_URL = process.env.MEHTA_SERVICE_API_URL;
const MEHTA_SERVICE_API_KEY = process.env.MEHTA_SERVICE_API_KEY;
const showServiceLabel = ProjectName == projectNamesList.TANKHWA_PATRA;
const EmployementTypeList =
  ProjectName == projectNamesList.PIH
    ? [
        {
          key: employeementTypeEnumList.Probation,
          value: employeementTypeEnumList.Probation,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Permanent,
          value: employeementTypeEnumList.Permanent,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Apprenticeship,
          value: employeementTypeEnumList.Apprenticeship,
          category: workerCategory.APPRENTICE,
        },
        {
          key: employeementTypeEnumList.Trainee,
          value: employeementTypeEnumList.Trainee,
          category: workerCategory.APPRENTICE,
        },
        {
          key: employeementTypeEnumList.Contract,
          value: employeementTypeEnumList.Contract,
          category: workerCategory.CONTRACT,
        },
        {
          key: employeementTypeEnumList.Locum,
          value: employeementTypeEnumList.Locum,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Retainer,
          value: employeementTypeEnumList.Retainer,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Visiting_Consultant,
          value: employeementTypeEnumList.Visiting_Consultant,
          category: workerCategory.COMPANY,
        },
      ]
    : [
        {
          key: employeementTypeEnumList.Probation,
          value: employeementTypeEnumList.Probation,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Confirm,
          value: employeementTypeEnumList.Confirm,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.Apprenticeship,
          value: employeementTypeEnumList.Apprenticeship,
          category: workerCategory.APPRENTICE,
        },
        {
          key: employeementTypeEnumList.Trainee,
          value: employeementTypeEnumList.Trainee,
          category: workerCategory.APPRENTICE,
        },
        {
          key: employeementTypeEnumList.Contract,
          value: employeementTypeEnumList.Contract,
          category: workerCategory.CONTRACT,
        },
        {
          key: employeementTypeEnumList.Locum,
          value: employeementTypeEnumList.Locum,
          category: workerCategory.COMPANY,
        },
        {
          key: employeementTypeEnumList.On_Commission,
          value: employeementTypeEnumList.On_Commission,
          category: workerCategory.COMMISSION,
        },
      ];
const companyUniqueCodePrefix =
  ProjectName == projectNamesList.TANKHWA_PATRA
    ? 'TP'
    : ProjectName == projectNamesList.MARS
      ? 'MA'
      : ProjectName == projectNamesList.AKAR_AUTO
        ? 'AK'
        : ProjectName == projectNamesList.REXTONE_INDUSTRIES
          ? 'RI'
          : 'TP';
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const isStoreFileToS3Bucket = [
  projectNamesList.TANKHWA_PATRA,
  projectNamesList.MARS,
  projectNamesList.PIH,
].includes(ProjectName);

const TIMEZONE =
  ProjectName == projectNamesList.TANKHWA_PATRA
    ? 'Asia/Kolkata'
    : ProjectName == projectNamesList.MARS
      ? 'Asia/Kolkata'
      : ProjectName == projectNamesList.AKAR_AUTO
        ? 'Asia/Kolkata'
        : ProjectName == projectNamesList.PIH
          ? 'Pacific/Port_Moresby'
          : ProjectName == projectNamesList.REXTONE_INDUSTRIES
            ? 'Asia/Kolkata'
            : 'Asia/Kolkata';

const checkOperationPermission = [projectNamesList.TANKHWA_PATRA].includes(
  ProjectName,
);
const fileViewerAppURL = `${appURL}#/user/file-viewer/`;
module.exports = {
  ProjectName,
  faceApiUrl,
  mainApiUrl,
  appURL,
  preboardingAppURL,
  preboardingDocsAppURL,
  convertNameToLocalName,
  pihMobileNo,
  othernumberLabel,
  showPayrollFrequency,
  secretTokenForEnc,
  cryptokey,
  showOvertimeGiveIn,
  validateAadharNumber,
  validatePanNumber,
  validatePFNumber,
  validateIfscCode,
  validateUAN,
  validateESICNumber,
  showEmployerLWF,
  showActualEDLI,
  TRACKING_MIGRATION_DATE,
  shopActLabel,
  factoryActLabel,
  on_Working_Days_Label,
  showPayWithSalary,
  projectNamesList,
  MEHTA_SERVICE_API_URL,
  MEHTA_SERVICE_API_KEY,
  showServiceLabel,
  EmployementTypeList,
  companyUniqueCodePrefix,
  bucketName,
  isStoreFileToS3Bucket,
  TIMEZONE,
  checkOperationPermission,
  fileViewerAppURL,
};
