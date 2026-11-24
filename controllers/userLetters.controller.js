const UserLetters = require('../models/userLetters');
const letterTamplateEditor = require('../models/letterTemplateEditor');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const path = require('path');
const Handlebars = require('handlebars');
const { sendOfferLetter } = require('../middleware/sendemail');
const { generateOfferLetterPdf } = require('../utils/pdfGenerate');
const sequelize = require('../config/database');
const fs = require('fs');
const base64Img = require('base64-img');
const OfferLetter = require('../models/offerLetter');
const {
  getEmployeeAddress,
  asiaKolkataDateTime,
  addPageBreak,
  addSalaryStructureKeyword,
  onTableHtmlAddSalaryStructureKeyword,
  findCompanyNotificationPolicy,
  getRoundOffSalary,
  toWords,
} = require('../utils/commonUtilFunctions');
const UserReportTO = require('../models/employeeReportTo');
const { Op } = require('sequelize');
const RelievingLetter = require('../models/relievingLetter');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const Sequelize = require('sequelize');
const JoiningLetter = require('../models/joiningLetter');
const EmployeeShift = require('../models/employeeShift');
const Shift = require('../models/shift');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const ExperienceLetter = require('../models/experienceletter');
const TerminationLetter = require('../models/terminationLetter');
const AppointmentLetter = require('../models/appointment');
const Contractor = require('../models/contractor');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const BankMaster = require('../models/bankMaster');
const { showEmployerLWF, showActualEDLI } = require('../utils/labelUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const { mailTemplateTypes, saveraCompanyIDs } = require('../utils/dbUtils');
const EmploymentCertificate = require('../models/employmentCertificate');
const DisengagementLetter = require('../models/disengagementLetter');
const ConfirmationLetter = require('../models/confirmationLetter');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const UserTransferLetter = require('../models/userTransferLetter');
const UserIncrementLetter = require('../models/userIncrementLetter');
const EmployeeDiscrepancyLetter = require('../models/employeeDiscrepancyLetter');
const { join } = require('path');
const { readFileSync } = require('fs');
const { launch } = require('puppeteer');
const { month_dict } = require('../utils/commonUtilFunctions');
exports.getAllUserLetter = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;

    const userLetter = await UserLetters.findOne({
      where: {
        userMasterID: userMasterID,
      },
    });

    if (!userLetter) {
      return res.status(200).json({
        status: 200,
        data: [
          {
            label: 'Offer Letter',
            path: '',
          },
          {
            label: 'Joining Letter',
            path: '',
          },
          {
            label: 'Appointment Letter',
            path: '',
          },
          {
            label: 'Confirmation Letter',
            path: '',
          },
          {
            label: 'Experience Letter',
            path: '',
          },
          {
            label: 'Termination Letter',
            path: '',
          },
          {
            label: 'Relieving Letter',
            path: '',
          },
          {
            label: 'Disengagement Letter',
            path: '',
          },
          {
            label: 'Employment Proof Certificate',
            path: '',
          },
        ],
      });
    }

    userLetter.offerletterHTML = addPageBreak(userLetter.offerletterHTML);

    userLetter.offerletterHTML = addSalaryStructureKeyword(
      userLetter.offerletterHTML,
    );
    userLetter.offerletterHTML = onTableHtmlAddSalaryStructureKeyword(
      userLetter.offerletterHTML,
    );

    userLetter.joiningletterHTML = addPageBreak(userLetter.joiningletterHTML);

    userLetter.joiningletterHTML = addSalaryStructureKeyword(
      userLetter.joiningletterHTML,
    );
    userLetter.joiningletterHTML = onTableHtmlAddSalaryStructureKeyword(
      userLetter.joiningletterHTML,
    );

    userLetter.experienceletterHTML = addPageBreak(
      userLetter.experienceletterHTML,
    );
    userLetter.experienceletterHTML = addSalaryStructureKeyword(
      userLetter.experienceletterHTML,
    );
    userLetter.experienceletterHTML = onTableHtmlAddSalaryStructureKeyword(
      userLetter.experienceletterHTML,
    );

    userLetter.terminationletterHTML = addPageBreak(
      userLetter.terminationletterHTML,
    );
    userLetter.terminationletterHTML = addSalaryStructureKeyword(
      userLetter.terminationletterHTML,
    );
    userLetter.terminationletterHTML = onTableHtmlAddSalaryStructureKeyword(
      userLetter.terminationletterHTML,
    );

    userLetter.appointmentletterHTML = addPageBreak(
      userLetter.appointmentletterHTML,
    );
    userLetter.appointmentletterHTML = addSalaryStructureKeyword(
      userLetter.appointmentletterHTML,
    );
    userLetter.appointmentletterHTML = onTableHtmlAddSalaryStructureKeyword(
      userLetter.appointmentletterHTML,
    );

    userLetter.employmentCertificateHTML = addPageBreak(
      userLetter.employmentCertificateHTML,
    );
    userLetter.disengagementLetterHTML = addPageBreak(
      userLetter.disengagementLetterHTML,
    );
    userLetter.relievingLetterHTML = addPageBreak(
      userLetter.relievingLetterHTML,
    );
    userLetter.confirmationLetterHTML = addPageBreak(
      userLetter.confirmationLetterHTML,
    );

    return res.status(200).json({
      status: 200,
      data: [
        {
          label: 'Offer Letter',
          path: userLetter.offerLetter,
          htmlContent: userLetter.offerletterHTML,
          offerLetterID: userLetter.offerLetterID,
          showOfferLetterToEmp: userLetter.showOfferLetterToEmp,
        },
        {
          label: 'Joining Letter',
          path: userLetter.joiningLetter,
          htmlContent: userLetter.joiningletterHTML,
          joiningLetterID: userLetter.joiningLetterID,
          showJoiningLetterToEmp: userLetter.showJoiningLetterToEmp,
        },
        {
          label: 'Appointment Letter',
          path: userLetter.appointmentLetter,
          htmlContent: userLetter.appointmentletterHTML,
          appointmentLetterID: userLetter.appointmentLetterID,
          showAppointmentLetterToEmp: userLetter.showAppointmentLetterToEmp,
        },
        {
          label: 'Confirmation Letter',
          path: userLetter.confirmationLetter,
          htmlContent: userLetter.confirmationLetterHTML,
          confirmationLetterID: userLetter.confirmationLetterID,
          showConfirmationLetterToEmp: userLetter.showConfirmationLetterToEmp,
        },
        {
          label: 'Experience Letter',
          path: userLetter.experienceLetter,
          htmlContent: userLetter.experienceletterHTML,
          experienceLetterID: userLetter.experienceLetterID,
          showExperienceLetterToEmp: userLetter.showExperienceLetterToEmp,
        },
        {
          label: 'Termination Letter',
          path: userLetter.terminationLetter,
          htmlContent: userLetter.terminationletterHTML,
          terminationLetterID: userLetter.terminationLetterID,
          showTerminationLetterToEmp: userLetter.showTerminationLetterToEmp,
        },
        {
          label: 'Relieving Letter',
          path: userLetter.relievingLetter,
          htmlContent: userLetter.relievingLetterHTML,
          relievingLetterID: userLetter.relievingLetterID,
          showRelievingLetterToEmp: userLetter.showRelievingLetterToEmp,
        },
        {
          label: 'Employment Proof Certificate',
          path: userLetter.employmentCertificate,
          htmlContent: userLetter.employmentCertificateHTML,
          employmentCertificateID: userLetter.employmentCertificateID,
          showEmploymentCertificateLetterToEmp:
            userLetter.showEmploymentCertificateLetterToEmp,
        },
        {
          label: 'Disengagement Letter',
          path: userLetter.disengagementLetter,
          htmlContent: userLetter.disengagementLetterHTML,
          disengagementLetterID: userLetter.disengagementLetterID,
          showDisengagementLetterToEmp: userLetter.showDisengagementLetterToEmp,
        },
      ],
    });
  } catch (err) {
    next(err);
  }
};

async function getEmployeeDetails(userMasterID) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  let yearmonth = currentDate.slice(0, 4) + currentDate.slice(5, 7);

  const data = await UserMaster.findOne({
    where: {
      userMasterID,
    },

    include: [
      {
        model: companyMaster,
        required: true,
        attributes: [
          'companyName',
          'companyLogo',
          'companyMasterID',
          'authorizedSignature',
        ],
      },
      {
        separate: true,
        required: false,
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'joiningDate',
          'dob',
          'adharCard',
          'employment',
          'adharName',
          'leavingDate',
          'applicableDate',
          'endDate',
          'employment',
          'petrolAllowance',
        ],
        include: [
          {
            required: false,
            model: Contractor,
            include: [
              {
                model: CityMaster,
                attributes: ['cityName'],
                include: [
                  {
                    model: StateMaster,
                    attributes: ['stateName'],
                    include: [
                      { model: CountryMaster, attributes: ['countryName'] },
                    ],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: BankMaster,
          },
        ],
      },
      {
        required: false,
        model: EmployeeBranch,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['branchID'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchAddress'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDepartment,
        attributes: ['departmentID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDivision,
        attributes: ['id'],
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeProject,
        attributes: ['employeeProjectID'],
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              releaseDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              releaseDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Project,
            attributes: ['projectName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: currentDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: currentDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['workingAreaId', 'startDate'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDesignation,
        attributes: ['designationID'],
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName', 'localDesignName'],
          },
        ],
      },
      {
        required: false,
        model: UserReportTO,
        include: [
          {
            model: UserMaster,
            as: 'reportTo',
            attributes: ['displayName'],
            include: [
              {
                required: false,
                model: EmployeeDesignation,
                attributes: ['designationID'],
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(currentDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                    },
                    {
                      endDate: { [Sequelize.Op.eq]: null },
                    },
                  ],
                },
                include: [
                  {
                    model: Designation,
                    as: 'designation',
                    attributes: [['designationName', 'd']],
                  },
                ],
              },
            ],
          },
        ],
        attributes: ['reportToID'],
      },
      {
        required: false,
        model: EmployeeSkillCategory,
        where: {
          applicableYYYYMM: {
            [Sequelize.Op.lte]: +yearmonth,
          },
          [Sequelize.Op.or]: [
            {
              endYYYYMM: {
                [Sequelize.Op.gte]: +yearmonth,
              },
            },
            {
              endYYYYMM: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
      },
    ],

    attributes: [
      'email',
      'displayName',
      'userNumber',
      'userMasterID',
      'companyMasterId',
      'localDisplayName',
      'officalEmail',
    ],
  });

  return data;
}

//postAddUserLetters
async function generateLetter(
  userMasterID,
  letterDetails,
  lettertype,
  createBy,
  createByIp,
) {
  let cont;
  let t;
  try {
    const date = new Date().toISOString().slice(0, 10);
    const EmployeeData = await getEmployeeDetails(userMasterID);
    let referenceNumber = null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const letterConfig = {
      offerletter: {
        model: OfferLetter,
        idKey: 'offerLetterID',
        dateField: 'offerLetterGeneratedAt',
      },
      joiningletter: {
        model: JoiningLetter,
        idKey: 'joiningLetterID',
        dateField: 'joiningLetterGeneratedAt',
      },
      experienceletter: {
        model: ExperienceLetter,
        idKey: 'experienceLetterID',
        dateField: 'experienceLetterGeneratedAt',
      },
      terminationletter: {
        model: TerminationLetter,
        idKey: 'terminationLetterID',
        dateField: 'terminationLetterGeneratedAt',
      },
      appointmentletter: {
        model: AppointmentLetter,
        idKey: 'appointmentLetterID',
        dateField: 'appointmentLetterGeneratedAt',
      },
      relievingletter: {
        model: RelievingLetter,
        idKey: 'relievingLetterID',
        dateField: 'relievingLetterGeneratedAt',
      },
      employmentCertificate: {
        model: EmploymentCertificate,
        idKey: 'employmentCertificateID',
        dateField: 'employmentCertificateGeneratedAt',
      },
      disengagementLetter: {
        model: DisengagementLetter,
        idKey: 'disengagementLetterID',
        dateField: 'disengagementLetterGeneratedAt',
      },
      confirmationLetter: {
        model: ConfirmationLetter,
        idKey: 'confirmationLetterID',
        dateField: 'confirmationLetterGeneratedAt',
      },
    };

    if (letterConfig[lettertype]) {
      const { model, idKey, dateField } = letterConfig[lettertype];
      const letterID = letterDetails[idKey];

      const getLetter = await model.findOne({
        raw: true,
        where: {
          [idKey]: letterID,
        },
      });

      if (
        getLetter?.setReferenceNumber &&
        getLetter?.resetRefNumber &&
        getLetter?.currentSequence !== 1
      ) {
        const currentMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );

        const getCurrentMonthGeneratedLetters = await UserLetters.findAll({
          where: {
            [idKey]: letterID,
            [dateField]: {
              [Op.gt]: currentMonth,
            },
          },
        });

        if (getCurrentMonthGeneratedLetters.length === 0) {
          await model.update(
            {
              startingSequence: 1,
              currentSequence: 1,
            },
            { where: { [idKey]: letterID } },
          );

          letterDetails.currentSequence = 1;
        }
      }
    }

    if (letterDetails.setReferenceNumber) {
      referenceNumber =
        letterDetails.refNoFormat === 'prefixFormat'
          ? letterDetails.prefix +
            '/' +
            year +
            '/' +
            month +
            '/' +
            letterDetails.currentSequence
          : letterDetails.prefix + '/' + letterDetails.currentSequence;
    } else {
      referenceNumber = null;
    }

    const Employeejoining =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0
        ? EmployeeData.employeeJoiningDetails[0]
        : null;

    const Branch =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchName
        : '';

    const Department =
      EmployeeData.employeeDepartments &&
      EmployeeData.employeeDepartments.length > 0 &&
      EmployeeData.employeeDepartments[0].department
        ? EmployeeData.employeeDepartments[0].department.departmentName
        : '';

    let Designation =
      EmployeeData.employeeDesignations &&
      EmployeeData.employeeDesignations.length > 0 &&
      EmployeeData.employeeDesignations[0].designation
        ? EmployeeData.employeeDesignations[0].designation.designationName
        : '';
    let EmployeeSkillCategory =
      EmployeeData.employeeSkillCategories?.[0]?.skillCategory || '';
    if (saveraCompanyIDs.includes(+EmployeeData.companyMasterId)) {
      if (Designation) {
        Designation = `${EmployeeData.employeeDesignations?.[0]?.designation?.localDesignName}`;
      }
      if (EmployeeSkillCategory) {
        if (EmployeeSkillCategory == 'skilled') {
          EmployeeSkillCategory = 'कुशल';
        } else if (EmployeeSkillCategory == 'unskilled') {
          EmployeeSkillCategory = 'अकुशल';
        } else if (EmployeeSkillCategory == 'semiskilled') {
          EmployeeSkillCategory = 'अर्धकुशल';
        } else {
          EmployeeSkillCategory = '';
        }
      }
    }
    const ReportingPersonWithDesignation = EmployeeData.employeeReportTos
      .map((emp) => {
        const ReportTOPersonName =
          emp && emp.reportTo ? emp.reportTo.displayName : '';

        const ReportToPersonDesignation =
          emp && emp.reportTo
            ? emp.reportTo.employeeDesignations?.[0]?.designation?.dataValues.d
            : '';

        return ReportToPersonDesignation
          ? `${ReportTOPersonName} (${ReportToPersonDesignation})`
          : ReportTOPersonName;
      })
      .join(',');

    const ReportTOPerson = EmployeeData.employeeReportTos
      .map((emp) => {
        return emp && emp.reportTo ? emp.reportTo.displayName : '';
      })
      .join(',');

    const BranchAddress =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchAddress
        : '';

    const CompanyName = EmployeeData.companyMaster.companyName;
    const UserName = EmployeeData.localDisplayName
      ? `${EmployeeData.displayName} ( ${EmployeeData.localDisplayName} )`
      : EmployeeData.displayName;

    const UserNumber = EmployeeData.userNumber;

    const DateOfBirth =
      Employeejoining && Employeejoining.dob
        ? Employeejoining.dob.split('-').reverse().join('-')
        : '';

    const employeement =
      Employeejoining && Employeejoining.employment
        ? Employeejoining.employment
        : '';

    const currentDateTime = now.toLocaleString('en-IN');

    const employeecode =
      Employeejoining && Employeejoining.employeeCode
        ? Employeejoining.employeeCode
        : '';
    // Contractor
    const contractorData =
      Employeejoining && Employeejoining.contractor
        ? Employeejoining.contractor
        : null;

    let contractorAddressData = contractorData
      ? `${contractorData.contractorAddress ? contractorData.contractorAddress + ',' : ''} ${contractorData.cityMaster.cityName}, ${contractorData.cityMaster.stateMaster.stateName}, ${contractorData.cityMaster.stateMaster.countryMaster.countryName}`
      : '';

    contractorAddressData =
      contractorData && contractorData.localAddress
        ? `${contractorAddressData} <br>( ${contractorData.localAddress} )`
        : contractorAddressData;

    let contractorName = contractorData ? contractorData.contractorName : '';
    contractorName =
      contractorData && contractorData.localName
        ? `${contractorName} ( ${contractorData.localName} )`
        : contractorName;

    const divisionName =
      EmployeeData?.employeeDivisions?.[0]?.division?.divisionName;

    const officialEmail = EmployeeData?.officalEmail || '';
    const workingArea =
      EmployeeData?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
      '';

    const petrolAllowance = Employeejoining?.petrolAllowance || '';

    const previousEmployment = await EmployeeEmployeement.findAll({
      where: {
        userMasterID: userMasterID,
      },
      limit: 2,
      order: [['employeeEmployeementId', 'ASC']],
    });

    const employeeProjects = EmployeeData?.employeeProjects;
    let allProjectsName = null;
    if (employeeProjects.length > 0) {
      allProjectsName = employeeProjects
        .map((pro) => pro?.project?.projectName)
        .join(', ');
    }

    if (referenceNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ReferenceNumber]')
        .join(referenceNumber);
    }
    if (employeecode) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeCode]')
        .join(employeecode);
    }
    if (contractorName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[contractorName]')
        .join(contractorName);
    }

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[contractorAddress]')
      .join(contractorAddressData);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[EmployeeSkillCategory]')
      .join(EmployeeSkillCategory);
    if (officialEmail) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OfficialEmail]')
        .join(officialEmail);
    }
    if (workingArea) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[WorkingArea]')
        .join(workingArea);
    }
    if (petrolAllowance) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[PetrolAllowance]')
        .join(petrolAllowance);
    }

    if (previousEmployment?.[0]?.employeement) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[PreviousEmploymentType]')
        .join(previousEmployment?.[0]?.employeement);
    }
    if (previousEmployment?.[0]?.applicableDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[PreviousEmploymentApplicableDate]')
        .join(previousEmployment?.[0]?.applicableDate);
    }
    if (previousEmployment?.[0]?.endDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[PreviousEmploymentEndDate]')
        .join(previousEmployment?.[0]?.endDate);
    }
    const Email = EmployeeData.email;

    const JoiningDate =
      Employeejoining && Employeejoining.joiningDate
        ? Employeejoining.joiningDate.split('-').reverse().join('-')
        : '';

    const AdharcardNo =
      Employeejoining && Employeejoining.adharCard
        ? Employeejoining.adharCard
        : null;

    const NameAsOnAadhaar =
      Employeejoining && Employeejoining.adharName
        ? Employeejoining.adharName
        : null;

    const shiftName = await getEmployeeShift(userMasterID, date);

    const relievingDate =
      Employeejoining && Employeejoining.leavingDate
        ? Employeejoining.leavingDate.split('-').reverse().join('-')
        : null;

    const applicableDate =
      Employeejoining && Employeejoining.applicableDate
        ? Employeejoining.applicableDate.split('-').reverse().join('-')
        : null;

    const endDate =
      Employeejoining && Employeejoining.endDate
        ? Employeejoining.endDate.split('-').reverse().join('-')
        : null;

    const employementType =
      Employeejoining && Employeejoining.employment
        ? Employeejoining.employment
        : null;

    if (relievingDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[RelievingDate]')
        .join(relievingDate);
    }

    const systemDate = new Date()
      .toISOString()
      .slice(0, 10)
      .split('-')
      .reverse()
      .join('-');

    const PageBreak = `<div class="pageBreak"> </div>`;
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[PageBreak]')
      .join(PageBreak);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-right"')
      .join('style="text-align:right"');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-center"')
      .join('style="text-align:center"');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('class="ql-align-justify"')
      .join('style="text-align:justify;text-justify: inter-word;"');

    const DATA = await getSalaryStructureHTML(userMasterID);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CTC]')
      .join(DATA.CTC ? `${DATA.CTC}/- (Rupees ${DATA.CTCInWords} Only)` : '');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Net]')
      .join(DATA.Net ? `${DATA.Net}/- (Rupees ${DATA.NetInWords} Only) ` : '');
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Gross]')
      .join(
        DATA.Gross ? `${DATA.Gross}/- (Rupees ${DATA.GrossInWords} Only) ` : '',
      );
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[MonthlyCTC]')
      .join(
        DATA.MonthlyCTC
          ? `${DATA.MonthlyCTC}/- (Rupees ${DATA.MonthlyCTCInWords} Only)`
          : '',
      );
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[MonthlyNet]')
      .join(
        DATA.MonthlyNet
          ? `${DATA.MonthlyNet}/- (Rupees ${DATA.MonthlyNetInWords} Only) `
          : '',
      );
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[MonthlyGross]')
      .join(
        DATA.MonthlyGross
          ? `${DATA.MonthlyGross}/- (Rupees ${DATA.MonthlyGrossInWords} Only) `
          : '',
      );
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[SalaryStructure]')
      .join(DATA.SalaryStructure);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Address]')
      .join(await getAddress(userMasterID));
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CompanyName]')
      .join(CompanyName);
    if (UserName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[UserName]')
        .join(UserName);
    }
    if (UserNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[UserNumber]')
        .join(UserNumber);
    }
    if (DateOfBirth) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[DateOfBirth]')
        .join(DateOfBirth);
    }
    if (employeement) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeementType]')
        .join(employeement);
    }
    if (Email) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Email]')
        .join(Email);
    }

    if (allProjectsName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Project]')
        .join(allProjectsName);
    }

    if (divisionName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Division]')
        .join(divisionName);
    }

    if (shiftName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ShiftName]')
        .join(shiftName);
    }
    if (applicableDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmploymentApplicableDate]')
        .join(applicableDate);
    }
    if (endDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmploymentEndDate]')
        .join(endDate);
    }
    if (employementType) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmploymentType]')
        .join(employementType);
    }
    if (Branch) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Branch]')
        .join(Branch);
    }
    if (BranchAddress) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[BranchAddress]')
        .join(BranchAddress);
    }
    if (Designation) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Designation]')
        .join(Designation);
    }
    if (Department) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Department]')
        .join(Department);
    }
    if (JoiningDate) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[JoiningDate]')
        .join(JoiningDate);
    }
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[SystemDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDateTime]')
      .join(currentDateTime);
    if (UserName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeName]')
        .join(UserName);
    }
    if (UserNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeNumber]')
        .join(UserNumber);
    }
    if (Email) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeEmailid]')
        .join(Email);
    }

    let digitalSignature = null;

    if (EmployeeData.companyMaster.authorizedSignature) {
      const signaturePath = path.join(
        __dirname,
        '../uploads/company/signature',
        EmployeeData.companyMaster.authorizedSignature,
      );

      if (!fs.existsSync(signaturePath)) {
        throw new Error(
          'Digital signature not found. Please upload digital signature.',
        );
      }

      // Read file and convert to base64
      const imageBuffer = fs.readFileSync(signaturePath);
      const base64Image = imageBuffer.toString('base64');

      // Detect extension
      const ext = path.extname(signaturePath).substring(1);
      const mimeType = ext === 'jpg' ? 'jpeg' : ext;

      digitalSignature = `<img src="data:image/${mimeType};base64,${base64Image}" style="width:100px; height:40px;" />`;
    }

    if (digitalSignature) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[DigitalSignature]')
        .join(digitalSignature);
    }

    if (AdharcardNo) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[AadhaarCardNumber]')
        .join(AdharcardNo);
    }

    if (NameAsOnAadhaar) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NameAsOnAadhaar]')
        .join(NameAsOnAadhaar);
    }
    if (ReportTOPerson) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ReportingPerson]')
        .join(ReportTOPerson);
    }
    if (ReportingPersonWithDesignation) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ReportingPersonWithDesignation]')
        .join(ReportingPersonWithDesignation);
    }

    const companyId = EmployeeData.companyMasterId;
    let letterName;

    if (lettertype == 'terminationletter') {
      letterName = 'Termination Letter';
    } else if (lettertype == 'offerletter') {
      letterName = 'Offer Letter';
    } else if (lettertype == 'experienceletter') {
      letterName = 'Experience Letter';
    } else if (lettertype == 'joiningletter') {
      letterName = 'Joining Letter';
    } else if (lettertype == 'appointmentletter') {
      letterName = 'Appointment Letter';
    } else if (lettertype == 'relievingletter') {
      letterName = 'Relieving Letter';
    } else if (lettertype == 'disengagementletter') {
      letterName = 'Disengagement Letter';
    } else if (lettertype == 'employmentproofcertificate') {
      letterName = 'Employment Proof Certificate';
    } else if (lettertype == 'confirmationletter') {
      letterName = 'Confirmation Letter';
    }

    if (letterDetails.letterHead == 'yes') {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: companyId },
      });

      let base64 = '';

      if (companyDetails.companyLogo) {
        const imagePath = path.join(
          __dirname,
          `../uploads/company/logo/${companyDetails.companyLogo}`,
        );

        try {
          base64 = await new Promise((resolve, reject) => {
            base64Img.base64(imagePath, (err, data) => {
              if (err) {
                reject('Company logo not found, Please upload company logo');
              } else {
                resolve(data);
              }
            });
          });
        } catch (err) {
          if (t) await t.rollback();
          return 'Company logo not found, Please upload company logo';
        }
      }

      const getTemplate = (type) =>
        path.join(__dirname, `../html/${type}.html`);
      const readFile = (name) => fs.promises.readFile(name, 'utf-8');

      const filePath = getTemplate('preboardingLetterHead');
      companyDetails.base64 = base64;
      const file = await readFile(filePath);
      const template = Handlebars.compile(file);
      const headerTemplate = template(companyDetails);

      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: letterName };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        headerTemplate,
      );

      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}.pdf`,
      );
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else if (letterDetails.letterHead == 'no') {
      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: letterName };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}.pdf`,
      );
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: companyId },
        attributes: ['letterHead'],
      });

      if (companyDetails.letterHead && companyDetails.letterHead != '') {
        imagePath =
          process.env.APIURL +
          `uploads/company/letterHead/${companyDetails.letterHead}`;
      } else {
        return 'Company letter head not found! Please upload company letter head.';
      }

      cont = `<div class="main1">
        ${letterDetails.letterTemplate}
      </div>`;

      const data1 = {
        content: cont,
        letterName: letterName,
        letterHead: companyDetails.letterHead,
      };
      const pdfBuffer = await generateOfferLetterPdf(
        'preboardingOfferLetter',
        data1,
      );
      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${lettertype}_${userMasterID}.pdf`,
      );
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }
    const users = await UserLetters.findOne({
      where: {
        userMasterID: userMasterID,
      },
    });

    if (users) {
      if (lettertype === 'offerletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            offerLetter: `${lettertype}_${userMasterID}.pdf`,
            offerletterHTML: cont,
            offerLetterID: letterDetails.offerLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            offerLetterReferenceNumber: referenceNumber,
            offerLetterGeneratedAt: new Date(),
          },
          {
            where: { userLettersID: users.userLettersID },
            transaction: t,
          },
        );

        if (letterDetails.setReferenceNumber) {
          await OfferLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { offerLetterID: letterDetails.offerLetterID },
              transaction: t,
            },
          );
        }

        await t.commit();
      } else if (lettertype === 'joiningletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            joiningLetter: `${lettertype}_${userMasterID}.pdf`,
            joiningletterHTML: cont,
            joiningLetterID: letterDetails.joiningLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            joiningLetterReferenceNumber: referenceNumber,
            joiningLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await JoiningLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { joiningLetterID: letterDetails.joiningLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'experienceletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            experienceLetter: `${lettertype}_${userMasterID}.pdf`,
            experienceletterHTML: cont,
            experienceLetterID: letterDetails.experienceLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            experienceLetterReferenceNumber: referenceNumber,
            experienceLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await ExperienceLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { experienceLetterID: letterDetails.experienceLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'terminationletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            terminationLetter: `${lettertype}_${userMasterID}.pdf`,
            terminationletterHTML: cont,
            terminationLetterID: letterDetails.terminationLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            terminationLetterReferenceNumber: referenceNumber,
            terminationLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await TerminationLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { terminationLetterID: letterDetails.terminationLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'appointmentletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            userMasterID,
            appointmentLetter: `${lettertype}_${userMasterID}.pdf`,
            appointmentletterHTML: cont,
            appointmentLetterID: letterDetails.appointmentLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            appointmentLetterReferenceNumber: referenceNumber,
            appointmentLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await AppointmentLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { appointmentLetterID: letterDetails.appointmentLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'relievingletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            userMasterID,
            relievingLetter: `${lettertype}_${userMasterID}.pdf`,
            relievingLetterHTML: cont,
            relievingLetterID: letterDetails.relievingLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            relievingLetterReferenceNumber: referenceNumber,
            relievingLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await RelievingLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { relievingLetterID: letterDetails.relievingLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'disengagementletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            userMasterID,
            disengagementLetter: `${lettertype}_${userMasterID}.pdf`,
            disengagementLetterHTML: cont,
            disengagementLetterID: letterDetails.disengagementLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            disengagementLetterReferenceNumber: referenceNumber,
            disengagementLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await DisengagementLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                disengagementLetterID: letterDetails.disengagementLetterID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'employmentproofcertificate') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            userMasterID,
            employmentCertificate: `${lettertype}_${userMasterID}.pdf`,
            employmentCertificateHTML: cont,
            employmentCertificateID: letterDetails.employmentCertificateID,
            updateBy: createBy,
            updateByIp: createByIp,
            employmentCertificateReferenceNumber: referenceNumber,
            employmentCertificateGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await EmploymentCertificate.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                employmentCertificateID: letterDetails.employmentCertificateID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'confirmationletter') {
        t = await sequelize.transaction();
        await UserLetters.update(
          {
            userMasterID,
            confirmationLetter: `${lettertype}_${userMasterID}.pdf`,
            confirmationLetterHTML: cont,
            confirmationLetterID: letterDetails.confirmationLetterID,
            updateBy: createBy,
            updateByIp: createByIp,
            confirmationLetterReferenceNumber: referenceNumber,
            confirmationLetterGeneratedAt: new Date(),
          },
          { where: { userLettersID: users.userLettersID }, transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await ConfirmationLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                confirmationLetterID: letterDetails.confirmationLetterID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      }
    } else {
      if (lettertype === 'offerletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            offerLetter: `${lettertype}_${userMasterID}.pdf`,
            offerletterHTML: cont,
            offerLetterID: letterDetails.offerLetterID,
            createBy,
            createByIp,
            offerLetterReferenceNumber: referenceNumber,
            offerLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await OfferLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { offerLetterID: letterDetails.offerLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'joiningletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            joiningLetter: `${lettertype}_${userMasterID}.pdf`,
            joiningletterHTML: cont,
            joiningLetterID: letterDetails.joiningLetterID,
            createBy,
            createByIp,
            joiningLetterReferenceNumber: referenceNumber,
            joiningLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await JoiningLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { joiningLetterID: letterDetails.joiningLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'experienceletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            experienceLetter: `${lettertype}_${userMasterID}.pdf`,
            experienceletterHTML: cont,
            experienceLetterID: letterDetails.experienceLetterID,
            createBy,
            createByIp,
            experienceLetterReferenceNumber: referenceNumber,
            experienceLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await ExperienceLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { experienceLetterID: letterDetails.experienceLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'terminationletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            terminationLetter: `${lettertype}_${userMasterID}.pdf`,
            terminationletterHTML: cont,
            terminationLetterID: letterDetails.terminationLetterID,
            createBy,
            createByIp,
            terminationLetterReferenceNumber: referenceNumber,
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await TerminationLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { terminationLetterID: letterDetails.terminationLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'appointmentletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            appointmentLetter: `${lettertype}_${userMasterID}.pdf`,
            appointmentletterHTML: cont,
            appointmentLetterID: letterDetails.appointmentLetterID,
            createBy,
            createByIp,
            appointmentLetterReferenceNumber: referenceNumber,
            appointmentLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await AppointmentLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { appointmentLetterID: letterDetails.appointmentLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'relievingletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            relievingLetter: `${lettertype}_${userMasterID}.pdf`,
            relievingLetterHTML: cont,
            relievingLetterID: letterDetails.relievingLetterID,
            createBy: createBy,
            createByIp,
            relievingLetterReferenceNumber: referenceNumber,
            relievingLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await RelievingLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: { relievingLetterID: letterDetails.relievingLetterID },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'disengagementletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            disengagementLetter: `${lettertype}_${userMasterID}.pdf`,
            disengagementLetterHTML: cont,
            disengagementLetterID: letterDetails.disengagementLetterID,
            createBy: createBy,
            createByIp,
            disengagementLetterReferenceNumber: referenceNumber,
            disengagementLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await DisengagementLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                disengagementLetterID: letterDetails.disengagementLetterID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'employmentproofcertificate') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            employmentCertificate: `${lettertype}_${userMasterID}.pdf`,
            employmentCertificateHTML: cont,
            employmentCertificateID: letterDetails.employmentCertificateID,
            createBy: createBy,
            createByIp,
            employmentCertificateReferenceNumber: referenceNumber,
            employmentCertificateGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await EmploymentCertificate.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                employmentCertificateID: letterDetails.employmentCertificateID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      } else if (lettertype === 'confirmationletter') {
        t = await sequelize.transaction();
        await UserLetters.create(
          {
            userMasterID,
            confirmationLetter: `${lettertype}_${userMasterID}.pdf`,
            confirmationLetterHTML: cont,
            confirmationLetterID: letterDetails.confirmationLetterID,
            createBy: createBy,
            createByIp,
            confirmationLetterReferenceNumber: referenceNumber,
            confirmationLetterGeneratedAt: new Date(),
          },
          { transaction: t },
        );
        if (letterDetails.setReferenceNumber) {
          await ConfirmationLetter.update(
            {
              currentSequence: parseInt(letterDetails.currentSequence) + 1,
            },
            {
              where: {
                confirmationLetterID: letterDetails.confirmationLetterID,
              },
              transaction: t,
            },
          );
        }
        await t.commit();
      }
    }
  } catch (err) {
    if (t) await t.rollback();
    throw err;
  }
}
exports.generateLetter = generateLetter;
exports.postAddUserLetters = async (req, res, next) => {
  try {
    const {
      userMasterID,
      lettertype,
      offerLetterID,
      joiningLetterID,
      experienceLetterID,
      terminationLetterID,
      appointmentLetterID,
      relievingLetterID,
      disengagementLetterID,
      employmentCertificateID,
      confirmationLetterID,
    } = req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let letterDetails;
    if (lettertype === 'offerletter') {
      letterDetails = await OfferLetter.findOne({
        raw: true,
        where: { offerLetterID: offerLetterID },
      });
    } else if (lettertype === 'joiningletter') {
      letterDetails = await JoiningLetter.findOne({
        raw: true,
        where: { joiningLetterID: joiningLetterID },
      });
    } else if (lettertype === 'experienceletter') {
      letterDetails = await ExperienceLetter.findOne({
        raw: true,
        where: { experienceLetterID: experienceLetterID },
      });
    } else if (lettertype === 'terminationletter') {
      letterDetails = await TerminationLetter.findOne({
        raw: true,
        where: { terminationLetterID: terminationLetterID },
      });
    } else if (lettertype === 'appointmentletter') {
      letterDetails = await AppointmentLetter.findOne({
        raw: true,
        where: { appointmentLetterID: appointmentLetterID },
      });
    } else if (lettertype === 'relievingletter') {
      letterDetails = await RelievingLetter.findOne({
        raw: true,
        where: { relievingLetterID: relievingLetterID },
      });
    } else if (lettertype === 'disengagementletter') {
      letterDetails = await DisengagementLetter.findOne({
        raw: true,
        where: { disengagementLetterID: disengagementLetterID },
      });
    } else if (lettertype === 'employmentproofcertificate') {
      letterDetails = await EmploymentCertificate.findOne({
        raw: true,
        where: { employmentCertificateID: employmentCertificateID },
      });
    } else if (lettertype === 'confirmationletter') {
      letterDetails = await ConfirmationLetter.findOne({
        raw: true,
        where: { confirmationLetterID: confirmationLetterID },
      });
    } else {
      return res
        .status(200)
        .json({ status: 401, message: 'Letter type not found' });
    }

    // const user = await UserMaster.findOne({
    //   raw: true,
    //   where: { userMasterID: userMasterID },
    //   include: [{ model: companyMaster, attributes: ['companyName'] }],
    // });

    if (!letterDetails) {
      return res.status(200).json({ status: 401, message: 'letter not found' });
    }

    // const empjoining = await EmployeeJoiningDetails.findOne({
    //   raw: true,
    //   where: { userMasterID: userMasterID },
    // });

    const message = await generateLetter(
      userMasterID,
      letterDetails,
      // user,
      // empjoining,
      lettertype,
      createBy,
      createByIp,
    );

    if (message && message != '') {
      return res.status(200).json({
        message: message,
        status: 401,
      });
    }

    return res
      .status(200)
      .json({ status: 200, message: 'Letter generated successfully' });
  } catch (err) {
    next(err);
  }
};

async function getAddress(userMasterID) {
  let Address = '';
  const EmpAddress = await getEmployeeAddress(userMasterID);
  if (EmpAddress) {
    if (EmpAddress.houseNumber) Address += `${EmpAddress.houseNumber}, `;
    if (EmpAddress.houseName) Address += `${EmpAddress.houseName}, `;
    if (EmpAddress.landmark) Address += `${EmpAddress.landmark},<br/> `;
    if (EmpAddress.area) Address += `${EmpAddress.area}, `;
    if (EmpAddress['cityMaster.cityName'])
      Address += `${EmpAddress['cityMaster.cityName']}, `;
    if (EmpAddress['cityMaster.stateMaster.stateName'])
      Address += `${EmpAddress['cityMaster.stateMaster.stateName']}, `;
    if (EmpAddress['cityMaster.stateMaster.countryMaster.countryName'])
      Address += `${EmpAddress['cityMaster.stateMaster.countryMaster.countryName']} `;
    if (EmpAddress.zipcode) Address += `${EmpAddress.zipcode}`;
    if (EmpAddress.localLangAddress)
      Address += `( ${EmpAddress.localLangAddress} )`;
  }
  return Address;
}

const editgenerateLetter = async (
  letterType,
  userMasterID,
  letterHTML,
  letterID,
  createBy,
  createByIp,
  letterDetails,
) => {
  const EmployeeData = await getEmployeeDetails(userMasterID);
  const companyId = EmployeeData.companyMasterId;
  const date = new Date().toISOString().slice(0, 10);
  const PageBreak = `<div class="pageBreak"> </div>`;
  letterHTML = letterHTML.split('[PageBreak]').join(PageBreak);
  letterHTML = letterHTML
    .split('class="ql-align-right"')
    .join('style="text-align:right"');
  letterHTML = letterHTML
    .split('class="ql-align-center"')
    .join('style="text-align:center"');
  letterHTML = letterHTML
    .split('class="ql-align-justify"')
    .join('style="text-align:justify;text-justify: inter-word;"');

  const DATA = await getSalaryStructureHTML(userMasterID);
  letterHTML = letterHTML.split('[SalaryStructure]').join(DATA.SalaryStructure);

  const user = await UserMaster.findOne({
    raw: true,
    where: { userMasterID },
    include: [{ model: companyMaster, attributes: ['companyName'] }],
  });

  if (!user) {
    return { status: 401, message: `User not found` };
  }

  let letterName;

  if (letterType == 'terminationletter') {
    letterName = 'Termination Letter';
  } else if (letterType == 'offerletter') {
    letterName = 'Offer Letter';
  } else if (letterType == 'experienceletter') {
    letterName = 'Experience Letter';
  } else if (letterType == 'joiningletter') {
    letterName = 'Joining Letter';
  } else if (letterType == 'appointmentletter') {
    letterName = 'Appointment Letter';
  } else if (letterType == 'relievingletter') {
    letterName = 'Relieving Letter';
  } else if (letterType == 'disengagementletter') {
    letterName = 'Disengagement Letter';
  } else if (letterType == 'employmentproofcertificate') {
    letterName = 'Employment Proof Certificate';
  } else if (letterType == 'confirmationletter') {
    letterName = 'Confirmation Letter';
  }

  if (letterDetails.letterHead == 'yes') {
    const companyDetails = await companyMaster.findOne({
      raw: true,
      where: { companyMasterID: user.companyMasterId },
    });

    let base64 = '';

    if (companyDetails.companyLogo) {
      const imagePath = path.join(
        __dirname,
        `../uploads/company/logo/${companyDetails.companyLogo}`,
      );

      if (!fs.existsSync(imagePath)) {
        throw new Error('Company logo not found. Please upload company logo.');
      }

      base64 = await new Promise((resolve, reject) => {
        base64Img.base64(imagePath, (err, data) => {
          if (err) {
            return reject(
              new Error(
                'Unable to read company logo. Please upload company logo again.',
              ),
            );
          }
          resolve(data);
        });
      });
    }

    companyDetails.companyName = companyDetails.companyName || '';
    companyDetails.companyAddress = companyDetails.companyAddress || '';
    companyDetails.companyEmail = companyDetails.companyEmail || '';
    companyDetails.companyLogo = companyDetails.companyLogo || '';
    companyDetails.cpMobileNo = companyDetails.cpMobileNo || '';
    companyDetails.companyWebsite = companyDetails.companyWebsite || '';

    const imagePath = path.join(
      __dirname,
      `../uploads/company/logo/${companyDetails.companyLogo}`,
    );
    if (!fs.existsSync(imagePath)) {
      throw new Error('Company logo not found. Please upload company logo.');
    }
    base64Img.base64(imagePath, async (err, data) => {
      if (err) {
        console.error('Error:', err);
      } else {
        base64 = data;
      }

      const getTemplate = (type) =>
        path.join(__dirname, `../html/${type}.html`);
      const readFile = (name) => {
        return new Promise((resolve, reject) => {
          fs.readFile(name, 'utf-8', (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      };

      const filePath = await getTemplate('preboardingLetterHead');
      companyDetails.base64 = base64;
      const file = await readFile(filePath);
      const template = Handlebars.compile(file);
      const headerTemplate = template(companyDetails);

      const content =
        `<div class="main1" style="font-size: 12px !important">` +
        letterHTML +
        `</div>`;
      const data1 = { content, letterName };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        headerTemplate,
      );
      const pdfFilePath = path.join(
        __dirname,
        `../uploads/letter/${letterType}_${userMasterID}.pdf`,
      );
      require('fs').writeFileSync(pdfFilePath, pdfBuffer);
    });
  } else if (letterDetails.letterHead == 'uploaded') {
    const companyDetails = await companyMaster.findOne({
      raw: true,
      where: { companyMasterID: companyId },
      attributes: ['letterHead'],
    });

    if (companyDetails.letterHead && companyDetails.letterHead != '') {
      imagePath =
        process.env.APIURL +
        `uploads/company/letterHead/${companyDetails.letterHead}`;
    } else {
      return 'Company letter head not found! Please upload company letter head.';
    }

    cont = `<div class="main1">
        ${letterDetails.letterTemplate}
      </div>`;

    const data1 = {
      content: letterHTML,
      letterName: letterName,
      letterHead: companyDetails.letterHead,
    };
    const pdfBuffer = await generateOfferLetterPdf(
      'preboardingOfferLetter',
      data1,
    );
    const pdfFilePath = path.join(
      __dirname,
      `../uploads/letter/${letterType}_${userMasterID}.pdf`,
    );
    fs.writeFileSync(pdfFilePath, pdfBuffer);
  } else {
    const content =
      `<div class="main1" style="font-size: 12px !important">` +
      letterHTML +
      `</div>`;
    const data1 = { content, letterName };
    const pdfBuffer = await generatePDF('preboardingOfferLetter', data1, null);

    const pdfFilePath = path.join(
      __dirname,
      `../uploads/letter/${letterType}_${userMasterID}.pdf`,
    );
    require('fs').writeFileSync(pdfFilePath, pdfBuffer);
  }

  const users = await UserLetters.findOne({
    where: { userMasterID },
  });

  if (users) {
    switch (letterType.toLowerCase()) {
      case 'offerletter':
        await UserLetters.update(
          {
            offerLetter: `${letterType}_${userMasterID}.pdf`,
            offerletterHTML: letterHTML,
            offerLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'joiningletter':
        await UserLetters.update(
          {
            joiningLetter: `${letterType}_${userMasterID}.pdf`,
            joiningletterHTML: letterHTML,
            joiningLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'experienceletter':
        await UserLetters.update(
          {
            experienceLetter: `${letterType}_${userMasterID}.pdf`,
            experienceletterHTML: letterHTML,
            experienceLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'terminationletter':
        await UserLetters.update(
          {
            terminationLetter: `${letterType}_${userMasterID}.pdf`,
            terminationletterHTML: letterHTML,
            terminationLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'appointmentletter':
        await UserLetters.update(
          {
            appointmentLetter: `${letterType}_${userMasterID}.pdf`,
            appointmentletterHTML: letterHTML,
            appointmentLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'relievingletter':
        await UserLetters.update(
          {
            relievingLetter: `${letterType}_${userMasterID}.pdf`,
            relievingLetterHTML: letterHTML,
            relievingLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'employmentproofcertificate':
        await UserLetters.update(
          {
            employmentCertificate: `${letterType}_${userMasterID}.pdf`,
            employmentCertificateHTML: letterHTML,
            employmentCertificateID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'disengagementletter':
        await UserLetters.update(
          {
            disengagementLetter: `${letterType}_${userMasterID}.pdf`,
            disengagementLetterHTML: letterHTML,
            disengagementLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      case 'confirmationletter':
        await UserLetters.update(
          {
            confirmationLetter: `${letterType}_${userMasterID}.pdf`,
            confirmationLetterHTML: letterHTML,
            confirmationLetterID: letterID,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: { userLettersID: users.userLettersID },
          },
        );
        break;
      default:
        break;
    }
  } else {
    switch (letterType.toLowerCase()) {
      case 'offerletter':
        await UserLetters.create({
          userMasterID,
          offerLetter: `${letterType}_${userMasterID}.pdf`,
          offerletterHTML: letterHTML,
          offerLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'joiningletter':
        await UserLetters.create({
          userMasterID,
          joiningLetter: `${letterType}_${userMasterID}.pdf`,
          joiningletterHTML: letterHTML,
          joiningLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'experienceletter':
        await UserLetters.create({
          userMasterID,
          experienceLetter: `${letterType}_${userMasterID}.pdf`,
          experienceletterHTML: letterHTML,
          experienceLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'terminationletter':
        await UserLetters.create({
          userMasterID,
          terminationLetter: `${letterType}_${userMasterID}.pdf`,
          terminationletterHTML: letterHTML,
          terminationLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'appointmentletter':
        await UserLetters.create({
          userMasterID,
          appointmentLetter: `${letterType}_${userMasterID}.pdf`,
          appointmentletterHTML: letterHTML,
          appointmentLetterID: letterID,
          createBy,
          createByIp,
        });
      case 'relievingletter':
        await UserLetters.create({
          userMasterID,
          relievingLetter: `${letterType}_${userMasterID}.pdf`,
          relievingLetterHTML: letterHTML,
          relievingLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'disengagementletter':
        await UserLetters.create({
          userMasterID,
          disengagementLetter: `${letterType}_${userMasterID}.pdf`,
          disengagementLetterHTML: letterHTML,
          disengagementLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'employmentproofcertificate':
        await UserLetters.create({
          userMasterID,
          employmentCertificate: `${letterType}_${userMasterID}.pdf`,
          employmentCertificateHTML: letterHTML,
          employmentCertificateID: letterID,
          createBy,
          createByIp,
        });
        break;
      case 'confirmationletter':
        await UserLetters.create({
          userMasterID,
          confirmationLetter: `${letterType}_${userMasterID}.pdf`,
          confirmationLetterHTML: letterHTML,
          confirmationLetterID: letterID,
          createBy,
          createByIp,
        });
        break;
      default:
        break;
    }
  }
  return { status: 200, message: `${letterType} Updated Successfully` };
};

exports.postUpdateUserLetters = async (req, res, next) => {
  try {
    const {
      userMasterID,
      lettertype,
      offerLetterID,
      joiningLetterID,
      experienceLetterID,
      terminationLetterID,
      appointmentLetterID,
      relievingLetterID,
      disengagementLetterID,
      employmentCertificateID,
      confirmationLetterID,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let {
      offerletterHTML,
      joiningletterHTML,
      experienceletterHTML,
      terminationletterHTML,
      appointmentletterHTML,
      relievingLetterHTML,
      disengagementLetterHTML,
      employmentCertificateHTML,
      confirmationLetterHTML,
    } = req.body;
    let letterDetails;
    switch (lettertype) {
      case 'offerletter':
        letterDetails = await OfferLetter.findOne({
          raw: true,
          where: { offerLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'OfferLetter',
              userMasterID,
              offerletterHTML,
              offerLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'joiningletter':
        letterDetails = await JoiningLetter.findOne({
          raw: true,
          where: { joiningLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'JoiningLetter',
              userMasterID,
              joiningletterHTML,
              joiningLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'experienceletter':
        letterDetails = await ExperienceLetter.findOne({
          raw: true,
          where: { experienceLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'ExperienceLetter',
              userMasterID,
              experienceletterHTML,
              experienceLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'terminationletter':
        letterDetails = await TerminationLetter.findOne({
          raw: true,
          where: { terminationLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'TerminationLetter',
              userMasterID,
              terminationletterHTML,
              terminationLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );
      case 'appointmentletter':
        letterDetails = await AppointmentLetter.findOne({
          raw: true,
          where: { appointmentLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'AppointmentLetter',
              userMasterID,
              appointmentletterHTML,
              appointmentLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );
      case 'relievingletter':
        letterDetails = await RelievingLetter.findOne({
          raw: true,
          where: { relievingLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'RelievingLetter',
              userMasterID,
              relievingLetterHTML,
              relievingLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'disengagementletter':
        letterDetails = await DisengagementLetter.findOne({
          raw: true,
          where: { disengagementLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'DisengagementLetter',
              userMasterID,
              disengagementLetterHTML,
              disengagementLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'employmentproofcertificate':
        letterDetails = await EmploymentCertificate.findOne({
          raw: true,
          where: { employmentCertificateID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'employmentproofcertificate',
              userMasterID,
              employmentCertificateHTML,
              relievingLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      case 'confirmationletter':
        letterDetails = await ConfirmationLetter.findOne({
          raw: true,
          where: { confirmationLetterID },
        });
        return res
          .status(200)
          .json(
            await editgenerateLetter(
              'ConfirmationLetter',
              userMasterID,
              confirmationLetterHTML,
              confirmationLetterID,
              createBy,
              createByIp,
              letterDetails,
            ),
          );

      default:
        return res
          .status(200)
          .json({ status: 401, message: 'letter type not found' });
    }
  } catch (err) {
    next(err);
  }
};

exports.postDeleteUserLetters = async (req, res, next) => {
  try {
    const { userMasterID, label } = await req.body;

    const userLetter = await UserLetters.findOne({
      where: { userMasterID: userMasterID },
    });

    if (userLetter) {
      if (label == 'Offer Letter') {
        await UserLetters.update(
          {
            offerLetter: '',
            offerletterHTML: '',
            offerLetterID: null,
            offerLetterReferenceNumber: null,
            offerLetterGeneratedAt: null,
            showOfferLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Joining Letter') {
        await UserLetters.update(
          {
            joiningLetter: '',
            joiningletterHTML: '',
            joiningLetterID: null,
            joiningLetterReferenceNumber: null,
            joiningLetterGeneratedAt: null,
            showJoiningLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Experience Letter') {
        await UserLetters.update(
          {
            experienceLetter: '',
            experienceletterHTML: '',
            experienceLetterID: null,
            experienceLetterReferenceNumber: null,
            experienceLetterGeneratedAt: null,
            showExperienceLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Termination Letter') {
        await UserLetters.update(
          {
            terminationLetter: '',
            terminationletterHTML: '',
            terminationLetterID: null,
            terminationLetterReferenceNumber: null,
            terminationLetterGeneratedAt: null,
            showTerminationLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Appointment Letter') {
        await UserLetters.update(
          {
            appointmentLetter: '',
            appointmentletterHTML: '',
            appointmentLetterID: null,
            appointmentLetterReferenceNumber: null,
            appointmentLetterGeneratedAt: null,
            showAppointmentLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Relieving Letter') {
        await UserLetters.update(
          {
            relievingLetter: '',
            relievingLetterHTML: '',
            relievingLetterID: null,
            relievingLetterReferenceNumber: null,
            relievingLetterGeneratedAt: null,
            showRelievingLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Disengagement Letter') {
        await UserLetters.update(
          {
            disengagementLetter: '',
            disengagementLetterHTML: '',
            disengagementLetterID: null,
            disengagementLetterReferenceNumber: null,
            disengagementLetterGeneratedAt: null,
            showDisengagementLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Employment Proof Certificate') {
        await UserLetters.update(
          {
            employmentCertificate: '',
            employmentCertificateHTML: '',
            employmentCertificateID: null,
            employmentCertificateReferenceNumber: null,
            employmentCertificateGeneratedAt: null,
            showEmploymentCertificateLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      } else if (label == 'Confirmation Letter') {
        await UserLetters.update(
          {
            confirmationLetter: '',
            confirmationLetterHTML: '',
            confirmationLetterID: null,
            confirmationLetterReferenceNumber: null,
            confirmationLetterGeneratedAt: null,
            showConfirmationLetterToEmp: false,
          },
          {
            where: { userLettersID: userLetter.userLettersID },
          },
        );
      }

      return res
        .status(200)
        .json({ status: 200, message: 'Letter Deleted Successfully' });
    }

    return res.status(200).json({ status: 401, message: 'Not valid data' });
  } catch (err) {
    next(err);
  }
};

async function generatePDF(htmlFileName, obj, headerTemplate) {
  try {
    const templatePath = join(__dirname, '../html/', `${htmlFileName}.html`);

    let content = readFileSync(templatePath, 'utf-8');
    content = renderHtmlTemplate(content, obj);

    const browser = await launch({
      // headless: true,
      headless: 'new',
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(content, {
      waitUntil: 'domcontentloaded',
    });
    await page.emulateMediaType('screen');

    if (headerTemplate) {
      const pdfBuffer = await page.pdf({
        format: 'A4',
        displayHeaderFooter: true,
        headerTemplate: headerTemplate,
        footerTemplate: `
          <div style="width: 100%; font-size: 10px; color: #000; padding: 0 75px;">
            <div style="border-top: 1px solid black; width: 100%; margin-bottom: 60px;"></div>
          </div>
        `,
        margin: {
          top: '240px',
          bottom: '140px',
          right: '60px',
          left: '60px',
        },
        preferCSSPageSize: true,
      });
      await browser.close();
      return Buffer.from(pdfBuffer);
    } else {
      const pdfBuffer = await page.pdf({
        format: 'A4',
        displayHeaderFooter: false,
        margin: {
          top: '240px',
          bottom: '140px',
          right: '60px',
          left: '60px',
        },
        preferCSSPageSize: true,
      });
      await browser.close();
      return Buffer.from(pdfBuffer);
    }
  } catch (error) {
    console.log('Error in Generate PDF Function', error);
  }
}

function renderHtmlTemplate(content, values) {
  return Object.entries(values).reduce((html, [key, value]) => {
    return html.split(`{{${key}}}`).join(value == null ? '' : String(value));
  }, content);
}
async function getSalaryStructureHTML(userMasterID) {
  let finalOBJ = {
    CTC: '',
    Net: '',
    Gross: '',
    MonthlyCTC: '',
    MonthlyNet: '',
    MonthlyGross: '',
    SalaryStructure: '',
    CTCInWords: '',
    MonthlyCTCInWords: '',
    GrossInWords: '',
    MonthlyGrossInWords: '',
    NetInWords: '',
    MonthlyNetInWords: '',
  };

  const notIncludeIds = [
    16, 17, 9, 24, 34, 43, 78, 83, 96, 97, 99, 67, 101, 102, 103, 104, 107, 112,
    116, 135, 123, 125, 126, 127, 133, 130, 122, 147, 148, 151, 152,
  ];

  if (!showEmployerLWF) notIncludeIds.push(59);

  const salaryMasterdata = await HRSalaryMaster.findAll({
    raw: true,
    where: {
      userMasterID: userMasterID,
      '$gradeSalaryStructure.hrSalaryField.payheadMasterId$': {
        [Sequelize.Op.notIn]: notIncludeIds,
      },
      salaryFromYYYYMM: {
        [Sequelize.Op.eq]: Sequelize.literal(`
           (SELECT MAX("salaryFromYYYYMM")
         FROM "hrSalaryMasters"
         WHERE "userMasterID" = ${+userMasterID})
          `),
      },
    },
    include: [
      {
        model: GradeSalaryStructure,
        include: [
          { model: GradeStructure, attributes: [] },
          {
            model: HRSalaryFields,
            include: [
              {
                model: Payheadmaster,
                attributes: [],
              },
            ],
            attributes: [],
          },
        ],
        attributes: [],
        order: [
          ['salaryfieldindex', 'ASC'],
          [
            { model: HRSalaryFields, model: Payheadmaster },
            'payheadName',
            'ASC',
          ],
        ],
      },
    ],
    attributes: [
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.Payheadmaster.payheadName',
        ),
        'payheadName',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadDisplayName'),
        'payheadDisplayName',
      ],
      'EmployeeSalaryAmount',
      'salaryFromYYYYMM',
      'ActualEmployeeSalaryAmount',
      [
        Sequelize.col('gradeSalaryStructure.gradeStructure.baseOnCalculation'),
        'baseOnCalculation',
      ],
      [Sequelize.col('gradeSalaryStructure.formula'), 'formula'],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldSrNo'),
        'salaryFieldSrNo',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadMasterId'),
        'payheadMasterId',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.considerIn'),
        'considerIn',
      ],
      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.assignSalaryRound'),
        'assignSalaryRound',
      ],

      [
        Sequelize.col('gradeSalaryStructure.hrSalaryField.assignSalaryRoundNo'),
        'assignSalaryRoundNo',
      ],
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.assignSalaryRoundOffType',
        ),
        'assignSalaryRoundOffType',
      ],
      [
        Sequelize.col(
          'gradeSalaryStructure.hrSalaryField.salaryFieldWhenMonth',
        ),
        'salaryFieldWhenMonth',
      ],
    ],
  });

  const groupedData = {
    A: [],
    gross: [], // Gross
    B: [], // Employee Deduction
    AB: [],
    netPay: [], // add In Net Pay
    C: [],
    ctc: [], // Employer Deduction
  };

  const finalDataTemp = salaryMasterdata.filter(
    (f) => ![1, 50, 92].includes(+f.payheadMasterId),
  );
  const Net_Ctc_Gross = salaryMasterdata.filter((f) =>
    [1, 50, 92].includes(+f.payheadMasterId),
  );

  let yearly_aTotal = 0;
  let yearly_bTotal = 0;
  let yearly_extra_aTotal = 0;
  let yearly_cTotal = 0;

  finalDataTemp.forEach((item) => {
    let length = 12;
    if (
      Array.isArray(item.salaryFieldWhenMonth) &&
      item.salaryFieldWhenMonth[0] != 0
    ) {
      length = item.salaryFieldWhenMonth.length;
    }

    let amount = +item.EmployeeSalaryAmount;
    // for EDLI
    if (item.payheadMasterId == 66 && showActualEDLI) {
      amount = getRoundOffSalary(
        +item.ActualEmployeeSalaryAmount,
        item.assignSalaryRound,
        item.assignSalaryRoundOffType,
        item.assignSalaryRoundNo,
      );
    }

    const yearlyAmount = amount * length;

    item.EmployeeSalaryAmount = amount;
    item.yearlyAmount = yearlyAmount;
    item.payheadName = item.payheadDisplayName?.trim() || item.payheadName;

    if (item.salaryFieldSrNo == 'A' && item.considerIn !== 'net') {
      groupedData.A.push(item);
      yearly_aTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'A' && item.considerIn === 'net') {
      groupedData.AB.push(item);
      yearly_extra_aTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'B') {
      groupedData.B.push(item);
      yearly_bTotal += yearlyAmount;
    }
    if (item.salaryFieldSrNo == 'C') {
      groupedData.C.push(item);
      yearly_cTotal += yearlyAmount;
    }
  });

  Net_Ctc_Gross.forEach((el) => {
    if (el.payheadMasterId == 1) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal + yearly_extra_aTotal + yearly_cTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );

      groupedData.ctc.push(el);

      finalOBJ.MonthlyCTC = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyCTCInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.CTC = el.yearlyAmount;
      finalOBJ.CTCInWords = toWords.convert(el.yearlyAmount);
    }
    if (el.payheadMasterId == 50) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );
      groupedData.gross.push(el);

      finalOBJ.MonthlyGross = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyGrossInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.Gross = el.yearlyAmount;
      finalOBJ.GrossInWords = toWords.convert(el.yearlyAmount);
    }
    if (el.payheadMasterId == 92) {
      el.yearlyAmount = getRoundOffSalary(
        yearly_aTotal + yearly_extra_aTotal - yearly_bTotal,
        el.assignSalaryRound,
        el.assignSalaryRoundOffType,
        el.assignSalaryRoundNo,
      );

      groupedData.netPay.push(el);

      finalOBJ.MonthlyNet = +el.EmployeeSalaryAmount;
      finalOBJ.MonthlyNetInWords = toWords.convert(+el.EmployeeSalaryAmount);
      finalOBJ.Net = el.yearlyAmount;
      finalOBJ.NetInWords = toWords.convert(el.yearlyAmount);
    }
  });

  const finalData = [
    ...groupedData.A,
    ...groupedData.gross,
    ...groupedData.B,
    ...groupedData.AB,
    ...groupedData.netPay,
    ...groupedData.C,
    ...groupedData.ctc,
  ];
  let salaryType = finalData[0]?.baseOnCalculation || '';

  let html = `<table  border='1' id='SalaryStructureOfUser'
  style='border:1px solid black;border-collapse: collapse;'><tr><th colspan="5" style="text-align: center; background-color: lightgray">Salary Structure</th></tr>
  <tr>
    <th style="text-align: center;padding : 2px">Payhead Name</th>
    <th style="text-align: center;padding : 2px">Amount(Monthly)</th>
    <th style="text-align: center;padding : 2px">Amount(Yearly)</th>
  </tr>`;

  for (var item of finalData) {
    let tempData = '<tr>';

    tempData =
      tempData +
      '<td style="text-align: left;padding : 2px">' +
      item.payheadName +
      '</td>';
    tempData =
      tempData +
      '<td style="text-align: right;padding : 2px">' +
      item.EmployeeSalaryAmount +
      '</td>';
    let amt = salaryType == 'M' ? +item.yearlyAmount : '';
    tempData =
      tempData + '<td style="text-align: right;padding : 2px">' + amt + '</td>';

    tempData = tempData + '</tr>';
    html = html + tempData;
  }

  html = html + `</table>`;

  finalOBJ.SalaryStructure = html;

  if (salaryType != 'M') {
    finalOBJ.CTC = '';
    finalOBJ.Gross = '';
    finalOBJ.Net = '';
    finalOBJ.NetInWords = '';
    finalOBJ.GrossInWords = '';
    finalOBJ.CTCInWords = '';
  }

  return finalOBJ;
}

async function getEmployeeShift(userid, date) {
  let shiftName = '';
  const getShift = await EmployeeShift.findOne({
    raw: true,
    where: {
      userMasterID: userid,
      status: 1,
      startDate: {
        [Sequelize.Op.lte]: new Date(date),
      },
      [Sequelize.Op.or]: [
        {
          endDate: {
            [Sequelize.Op.gte]: new Date(date),
          },
        },
        {
          endDate: { [Sequelize.Op.eq]: null },
        },
      ],
    },
  });

  if (getShift) {
    if (getShift.shiftID) {
      const getShiftName = await Shift.findOne({
        raw: true,
        where: {
          shiftID: getShift.shiftID,
        },
        attributes: ['shiftName'],
      });
      shiftName = getShiftName ? getShiftName.shiftName : '';
    } else if (getShift.shiftsID && getShift.shiftsID.length) {
      const getShiftName = await Shift.findOne({
        raw: true,
        where: {
          shiftID: getShift.shiftsID[0],
        },
        attributes: ['shiftName'],
      });
      shiftName = getShiftName ? getShiftName.shiftName : '';
    }
  }
  return shiftName;
}

async function getUserLetter(userMasterID, latterType) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const data = await UserLetters.findOne({
    where: {
      userMasterID,
    },
    include: [
      {
        required: true,
        model: UserMaster,
        attributes: ['email', 'displayName', 'userNumber', 'companyMasterId'],
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['branchID'],
            include: [
              {
                model: BranchMaster,
                as: 'branchMaster',
                attributes: ['branchName'],
              },
            ],
          },
          {
            required: false,
            model: EmployeeDepartment,
            attributes: ['departmentID'],
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['departmentName'],
              },
            ],
          },
          {
            required: false,
            model: EmployeeDesignation,
            attributes: ['designationID'],
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            include: [
              {
                model: Designation,
                as: 'designation',
                attributes: ['designationName'],
              },
            ],
          },
          {
            required: false,
            model: UserReportTO,
            attributes: ['reportToID'],
          },
          {
            model: companyMaster,
            attributes: ['companyName', 'companyLogo'],
          },
        ],
      },
    ],
    attributes: [latterType],
  });

  return data;
}

exports.sendEmailOfferLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 9,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'offerLetter');

    const userData = data1 ? data1.userMaster : null;
    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;

    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const offerLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.offerLetter,
      ),
      secure: fromtomail.secure,
    };
    if (!offerLetterData.filePath || !fs.existsSync(offerLetterData.filePath)) {
      throw new Error('Offer letter file not found. Unable to send email.');
    }
    sendOfferLetter(offerLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: "Offer Letter sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailJoinigLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 10,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'joiningLetter');
    const userData = data1 ? data1.userMaster : null;
    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const recipientEmail = userData && userData.email ? userData.email : null;

    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    const offerLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.joiningLetter,
      ),
      secure: fromtomail.secure,
    };
    if (!offerLetterData.filePath || !fs.existsSync(offerLetterData.filePath)) {
      throw new Error('Joining letter file not found. Unable to send email.');
    }
    sendOfferLetter(offerLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: 'Joining Letter Email sent successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailExperienceLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 12,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'experienceLetter');

    const userData = data1 ? data1.userMaster : null;
    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const recipientEmail = userData && userData.email ? userData.email : null;

    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    const experienceLetterLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.experienceLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !experienceLetterLetterData.filePath ||
      !fs.existsSync(experienceLetterLetterData.filePath)
    ) {
      throw new Error(
        'Experience letter file not found. Unable to send email.',
      );
    }
    sendOfferLetter(experienceLetterLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: 'Experience Letter Email sent successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailTerminationLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 13,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'terminationLetter');

    const userData = data1 ? data1.userMaster : null;
    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const recipientEmail = userData && userData.email ? userData.email : null;

    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    const terminationLetterLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.terminationLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !terminationLetterLetterData.filePath ||
      !fs.existsSync(terminationLetterLetterData.filePath)
    ) {
      throw new Error(
        'Termination letter file not found. Unable to send email.',
      );
    }
    sendOfferLetter(terminationLetterLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: 'Termination Letter Email sent successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailAppointmentLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: 11,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'appointmentLetter');

    const userData = data1 ? data1.userMaster : null;

    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;
    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const appointmentLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.appointmentLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !appointmentLetterData.filePath ||
      !fs.existsSync(appointmentLetterData.filePath)
    ) {
      throw new Error(
        'Appointment letter file not found. Unable to send email.',
      );
    }
    sendOfferLetter(appointmentLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: "Appointment Letter sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailRelievingLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: mailTemplateTypes.relievingLetterMailTemplate,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'relievingLetter');

    const userData = data1 ? data1.userMaster : null;

    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;
    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const relievingLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.relievingLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !relievingLetterData.filePath ||
      !fs.existsSync(relievingLetterData.filePath)
    ) {
      throw new Error('Relieving letter file not found. Unable to send email.');
    }
    await sendOfferLetter(relievingLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: "Relieving Letter sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailDisengagementLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: mailTemplateTypes.disengagementLetterMailTemplate,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'disengagementLetter');

    const userData = data1 ? data1.userMaster : null;

    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;
    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const disengagementLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.disengagementLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !disengagementLetterData.filePath ||
      !fs.existsSync(disengagementLetterData.filePath)
    ) {
      throw new Error(
        'Disengagement letter file not found. Unable to send email.',
      );
    }
    await sendOfferLetter(disengagementLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: "Disengagement Letter sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailEmploymentCertificate = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: mailTemplateTypes.employmentProofCertificateTemplate,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'employmentCertificate');

    const userData = data1 ? data1.userMaster : null;

    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;
    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const employmentCertificateData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.employmentCertificate,
      ),
      secure: fromtomail.secure,
    };
    if (
      !employmentCertificateData.filePath ||
      !fs.existsSync(employmentCertificateData.filePath)
    ) {
      throw new Error(
        'Employment Certificate file not found. Unable to send email.',
      );
    }
    await sendOfferLetter(employmentCertificateData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message:
        "Employment Certificate sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.sendEmailConfirmationLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromtomail) {
      return res.status(200).json({
        status: 401,
        message: 'Please Set Email in Notification Policy.',
      });
    }

    const get_MailTemplate = await mailTemplateEditor.findOne({
      raw: true,
      where: {
        companyMasterID: companyMasterID,
        status: 1,
        mailTypeID: mailTemplateTypes.confirmationLetterMailTemplate,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getUserLetter(userMasterID, 'confirmationLetter');

    const userData = data1 ? data1.userMaster : null;

    const empJoining =
      data1 &&
      data1.userMaster.employeeJoiningDetails &&
      data1.userMaster.employeeJoiningDetails.length > 0
        ? data1.userMaster.employeeJoiningDetails[0]
        : '';
    const empBranch =
      data1 &&
      data1.userMaster.employeeBranchs &&
      data1.userMaster.employeeBranchs.length > 0
        ? data1.userMaster.employeeBranchs[0]
        : '';
    const empDepart =
      data1 &&
      data1.userMaster.employeeDepartments &&
      data1.userMaster.employeeDepartments.length > 0
        ? data1.userMaster.employeeDepartments[0]
        : '';
    const empDesig =
      data1 &&
      data1.userMaster.employeeDesignations &&
      data1.userMaster.employeeDesignations.length > 0
        ? data1.userMaster.employeeDesignations[0]
        : '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = tomorrow.getDate().toString().padStart(2, '0');
    const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
    const y = tomorrow.getFullYear();

    const formatted = `${d}/${m}/${y}`;

    const recipientEmail = userData && userData.email ? userData.email : null;
    if (!recipientEmail) {
      return res.status(200).json({
        status: 401,
        message: 'User Email Not found.',
      });
    }
    // Replace placeholders in subject and body directly using empData properties
    get_MailTemplate.subject = get_MailTemplate.subject
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      );

    get_MailTemplate.body = get_MailTemplate.body
      .replace('[EmployeeCode]', empJoining ? empJoining.employeeCode : '')
      .replace('[EmployeeName]', userData ? userData.displayName : '')
      .replace('[EmployeeNumber]', userData ? userData.userNumber : '')
      .replace(
        '[Branch]',
        empBranch && empBranch.branchMaster
          ? empBranch.branchMaster.branchName
          : '',
      )
      .replace(
        '[Department]',
        empDepart && empDepart.department
          ? empDepart.department.departmentName
          : '',
      )
      .replace(
        '[Designation]',
        empDesig && empDesig.designation
          ? empDesig.designation.designationName
          : '',
      )
      .replace('[TomorrowDate]', formatted);

    const confirmationLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(
        __dirname,
        '..',
        'uploads',
        'letter',
        data1.confirmationLetter,
      ),
      secure: fromtomail.secure,
    };
    if (
      !confirmationLetterData.filePath ||
      !fs.existsSync(confirmationLetterData.filePath)
    ) {
      throw new Error(
        'Confirmation Letter file not found. Unable to send email.',
      );
    }
    await sendOfferLetter(confirmationLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: "Confirmation Letter sent to employee's emailid successfully.",
    });
  } catch (err) {
    next(err);
  }
};

exports.showHideLetterToEmp = async (req, res, next) => {
  try {
    const { showLetter, letterTemplate, userMasterID, letterID } = req.body;

    const letterConfig = {
      'Offer Letter': {
        model: UserLetters,
        field: 'showOfferLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Joining Letter': {
        model: UserLetters,
        field: 'showJoiningLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Experience Letter': {
        model: UserLetters,
        field: 'showExperienceLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Termination Letter': {
        model: UserLetters,
        field: 'showTerminationLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Appointment Letter': {
        model: UserLetters,
        field: 'showAppointmentLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Disengagement Letter': {
        model: UserLetters,
        field: 'showDisengagementLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Employment Proof Certificate': {
        model: UserLetters,
        field: 'showEmploymentCertificateLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Confirmation Letter': {
        model: UserLetters,
        field: 'showConfirmationLetterToEmp',
        whereKey: 'userMasterID',
      },
      'Relieving Letter': {
        model: UserLetters,
        field: 'showRelievingLetterToEmp',
        whereKey: 'userMasterID',
      },

      'Increment Letter': {
        model: UserIncrementLetter,
        field: 'isVisibleToEmp',
        whereKey: 'userincrementLetterID',
      },
      'Discrepancy Letter': {
        model: EmployeeDiscrepancyLetter,
        field: 'isVisibleToEmp',
        whereKey: 'employeeDiscrepancyLetterID',
      },
      'Transfer Letter': {
        model: UserTransferLetter,
        field: 'isVisibleToEmp',
        whereKey: 'userTransferLetterID',
      },
    };

    const config = letterConfig[letterTemplate];

    if (!config) {
      return res.status(400).json({
        status: 400,
        message: 'Letter type not found',
      });
    }

    const whereCondition = {
      [config.whereKey]:
        config.whereKey === 'userMasterID' ? userMasterID : letterID,
    };

    const updateData = {
      [config.field]: showLetter,
      updateBy: req.userDetails.userMasterId,
      updateByIp: req.userDetails.userIpAddress,
    };

    await config.model.update(updateData, {
      where: whereCondition,
    });

    return res.status(200).json({
      status: 200,
      message: `${letterTemplate} will be ${
        showLetter ? 'visible' : 'hidden'
      } to the employee`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeLetters = async (req, res, next) => {
  try {
    let { userMasterID } = req.body;
    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    const userLetter = await UserLetters.findOne({
      where: { userMasterID },
    });

    const letterConfig = [
      {
        label: 'Offer Letter',
        path: 'offerLetter',
        flag: 'showOfferLetterToEmp',
      },
      {
        label: 'Joining Letter',
        path: 'joiningLetter',
        flag: 'showJoiningLetterToEmp',
      },
      {
        label: 'Appointment Letter',
        path: 'appointmentLetter',
        flag: 'showAppointmentLetterToEmp',
      },
      {
        label: 'Confirmation Letter',
        path: 'confirmationLetter',
        flag: 'showConfirmationLetterToEmp',
      },
      {
        label: 'Experience Letter',
        path: 'experienceLetter',
        flag: 'showExperienceLetterToEmp',
      },
      {
        label: 'Termination Letter',
        path: 'terminationLetter',
        flag: 'showTerminationLetterToEmp',
      },
      {
        label: 'Relieving Letter',
        path: 'relievingLetter',
        flag: 'showRelievingLetterToEmp',
      },
      {
        label: 'Employment Proof Certificate',
        path: 'employmentCertificate',
        flag: 'showEmploymentCertificateLetterToEmp',
      },
      {
        label: 'Disengagement Letter',
        path: 'disengagementLetter',
        flag: 'showDisengagementLetterToEmp',
      },
    ];

    let visibleLetters = [];
    if (userLetter) {
      visibleLetters = letterConfig
        .filter((config) => userLetter[config.flag])
        .map((config) => ({
          label: config.label,
          path: userLetter[config.path],
          [config.flag]: userLetter[config.flag],
        }));
    }
    const [transferLetters, incrementLetters, discripancyLetters] =
      await Promise.all([
        UserTransferLetter.findAll({
          where: { userMasterID, isVisibleToEmp: true },
          attributes: ['path'],
        }),
        UserIncrementLetter.findAll({
          where: { userMasterID, isVisibleToEmp: true },
          attributes: ['incrementLetter'],
        }),
        EmployeeDiscrepancyLetter.findAll({
          where: { userMasterID, isVisibleToEmp: true },
          attributes: ['path'],
        }),
      ]);

    return res.status(200).json({
      status: 200,
      data: {
        userLetters: visibleLetters,
        incrementLetters: incrementLetters,
        discripancyLetters: discripancyLetters,
        transferLetters: transferLetters,
      },
    });
  } catch (error) {
    next(error);
  }
};
