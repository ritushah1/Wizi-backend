const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');
const { usermessage } = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const base64Img = require('base64-img');
const {
  asiaKolkataDateTime,
  addPageBreak,
  findCompanyNotificationPolicy,
  sendNotification_NEW,
  getEmployeeAddress,
  toGetFormateddate,
} = require('../utils/commonUtilFunctions');
const { launch } = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const { sendOfferLetter } = require('../middleware/sendemail');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { mailTemplateTypes } = require('../utils/dbUtils');
const TransferLetter = require('../models/transferLetter');
const UserTransferLetter = require('../models/userTransferLetter');
const companyMaster = require('../models/companyMaster');
const { generateOfferLetterPdf } = require('../utils/pdfGenerate');

exports.addUserTransferLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      transferLetterID,
      userMasterID,
      effectiveDate,
      oldProjectID,
      newProjectID,
      oldDepartmentID,
      newDepartmentID,
      oldBranchID,
      newBranchID,
    } = req.body;

    const findTransferLetter = await TransferLetter.findOne({
      where: {
        transferLetterID: transferLetterID,
      },
      include: [{ model: companyMaster, attributes: ['letterHead'] }],
    });

    if (!findTransferLetter) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: usermessage.notFoundMessage('Transfer Letter'),
      });
    }
    if (!findTransferLetter) {
      await transaction.rollback();
      return res.status(200).json({ status: 401, message: 'Letter not found' });
    }
    const letterHead = findTransferLetter?.companyMaster?.letterHead;
    if (findTransferLetter.letterHead == 'uploaded') {
      if (!letterHead || letterHead == '') {
        await transaction.rollback();
        return res.status(200).json({
          message:
            'Company letter head not found! Please upload company letter head.',
          status: 401,
        });
      }
    }
    await addGenerateLetter(
      userMasterID,
      findTransferLetter,
      'TransferLetter',
      req,
      transaction,
      letterHead,
      effectiveDate,
      oldProjectID,
      newProjectID,
      oldDepartmentID,
      newDepartmentID,
      oldBranchID,
      newBranchID,
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('Transfer Letter'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getUserTransferLetter = async (req, res, next) => {
  try {
    const { userMasterID } = await req.body;

    const condition = {};

    condition.status = 1;

    condition.userMasterID = userMasterID;

    // const paginationQuery = {};
    // if (page && limit) {
    //   paginationQuery.offset = (page - 1) * limit;
    //   paginationQuery.limit = limit;
    // }

    const order = [['createdAt', 'DESC']];

    const { rows, count } = await UserTransferLetter.findAndCountAll({
      raw: true,
      where: condition,
      //   ...paginationQuery,
      order,
      include: [
        { model: UserMaster, attributes: ['displayName'] },
        {
          model: TransferLetter,
          as: 'transferLetter',
          attributes: [
            'transferLetterID',
            'transferLetterName',
            'letterTemplate',
            'letterTemplate',
            'letterHead',
            'status',
            'companyMasterID',
          ],
        },
      ],
    });

    for (item of rows) {
      item.htmlContent = addPageBreak(item.transferletterHTML);
    }
    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserTransferLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      userMasterID,
      transferLetterHTML,
      userTransferLetterID,
      transferLetterID,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const letterDetails = await TransferLetter.findOne({
      raw: true,
      where: { transferLetterID },
      include: [{ model: companyMaster, attributes: ['letterHead'] }],
    });

    const letterHead = letterDetails['companyMaster.letterHead'];
    if (letterDetails.letterHead == 'uploaded') {
      if (!letterHead || letterHead == '') {
        await transaction.rollback();
        return res.status(200).json({
          message:
            'Company letter head not found! Please upload company letter head.',
          status: 401,
        });
      }
    }

    const letterResponse = await editGenerateLetter(
      'TransferLetter',
      userMasterID,
      transferLetterHTML,
      transferLetterID,
      createBy,
      createByIp,
      letterDetails,
      userTransferLetterID,
      transaction,
      letterHead,
    );
    await transaction.commit();
    return res.status(200).json(letterResponse);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteUserTransferLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userTransferLetterID } = await req.body;
    if (!userTransferLetterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: usermessage.notFoundMessage('Transfer Letter'),
      });
    }

    const findData = await UserTransferLetter.findByPk(userTransferLetterID);

    if (!findData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: usermessage.notFoundMessage('Transfer Letter'),
      });
    }
    await findData.destroy({
      user: req.userDetails,
      transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Transfer Letter'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.sendEmailUserTransferLetter = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID, userTransferLetterID } = req.body;

    const fromtomail = await findCompanyNotificationPolicy(companyMasterID);

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
        mailTypeID: mailTemplateTypes.transferLetterMailTemplate,
      },
    });

    if (!get_MailTemplate) {
      return res.status(200).json({
        status: 401,
        message: 'Email template not found.',
      });
    }

    const data1 = await getTranferLetterData(
      userMasterID,
      userTransferLetterID,
    );

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
      );

    const offerLetterData = {
      host: fromtomail.hostmail,
      port: fromtomail.port,
      email: fromtomail.email,
      password: fromtomail.password,
      email_id: recipientEmail,
      filePath: path.join(__dirname, '../', data1.path),
      secure: fromtomail.secure,
    };

    sendOfferLetter(offerLetterData, get_MailTemplate);

    return res.status(200).json({
      status: 200,
      message: `Transfer Letter sent to ${recipientEmail} successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

async function addGenerateLetter(
  userMasterID,
  letterDetails,
  lettertype,
  req,
  transaction,
  letterHead,
  effectiveDate,
  oldProjectID,
  newProjectID,
  oldDepartmentID,
  newDepartmentID,
  oldBranchID,
  newBranchID,
) {
  let cont;
  try {
    let referenceNumber = null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const getDiscrepancyLetter = await TransferLetter.findOne({
      raw: true,
      where: {
        transferLetterID: letterDetails.transferLetterID,
      },
    });
    if (
      getDiscrepancyLetter?.setReferenceNumber &&
      getDiscrepancyLetter?.resetRefNumber &&
      getDiscrepancyLetter?.currentSequence !== 1
    ) {
      const currentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      const getCurrentMonthGeneratedLetters = await UserTransferLetter.findAll({
        where: {
          transferLetterID: letterDetails.transferLetterID,
          createdAt: { [Op.gt]: currentMonth },
        },
      });

      if (getCurrentMonthGeneratedLetters.length == 0) {
        await TransferLetter.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          { where: { transferLetterID: letterDetails.transferLetterID } },
        );

        letterDetails.currentSequence = 1;
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
    }

    const EmployeeData = await getEmployeeDetails(userMasterID);

    const systemDate = new Date()
      .toISOString()
      .slice(0, 10)
      .split('-')
      .reverse()
      .join('-');

    const employeecode =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0 &&
      EmployeeData.employeeJoiningDetails[0].employeeCode
        ? EmployeeData.employeeJoiningDetails[0].employeeCode
        : '';
    const Branch =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchName
        : '';

    const Designation =
      EmployeeData.employeeDesignations &&
      EmployeeData.employeeDesignations.length > 0 &&
      EmployeeData.employeeDesignations[0].designation
        ? EmployeeData.employeeDesignations[0].designation.designationName
        : '';

    const DepartmentName =
      EmployeeData.employeeDepartments &&
      EmployeeData.employeeDepartments.length > 0 &&
      EmployeeData.employeeDepartments[0].department
        ? EmployeeData.employeeDepartments[0].department.departmentName
        : '';

    const CompanyName = EmployeeData.companyMaster.companyName;
    const UserName = EmployeeData.displayName;
    const UserNumber = EmployeeData.userNumber;
    const currentDateTime = new Date().toISOString();

    const AdharcardNo = EmployeeData.employeeJoiningDetails[0]
      ? EmployeeData.employeeJoiningDetails[0].adharCard
      : '';

    const NameAsOnAadhaar = EmployeeData.employeeJoiningDetails[0]
      ? EmployeeData.employeeJoiningDetails[0].adharName
      : '';

    const divisionName =
      EmployeeData?.employeeDivisions?.[0]?.division?.divisionName;

    const officialEmail = EmployeeData?.officalEmail || '';
    const workingArea =
      EmployeeData?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
      '';

    const DateOfBirth =
      EmployeeData.employeeJoiningDetails[0] &&
      EmployeeData.employeeJoiningDetails[0].dob
        ? EmployeeData.employeeJoiningDetails[0].dob
            .split('-')
            .reverse()
            .join('-')
        : '';
    const BranchAddress =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchAddress
        : '';

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Address]')
      .join(await getAddress(userMasterID));

    const employeeProjects = EmployeeData?.employeeProjects;
    let allProjectsName = null;
    // if (employeeProjects.length > 0) {
    //   allProjectsName = employeeProjects
    //     .map((pro) => pro?.project?.projectName)
    //     .join(', ');
    // }

    if (effectiveDate) {
      const date = effectiveDate.split('-').reverse().join('-');
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EffectiveDate]')
        .join(date);
    }

    const [project, department, branch] = await Promise.all([
      Project.findAll({
        where: {
          projectID: [oldProjectID, newProjectID],
        },
      }),
      Department.findAll({
        where: {
          departmentId: [oldDepartmentID, newDepartmentID],
        },
      }),
      BranchMaster.findAll({
        where: {
          branchMasterID: [oldBranchID, newBranchID],
        },
      }),
    ]);

    if (oldProjectID) {
      const projectName = project.find(
        (item) => item.projectID == oldProjectID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldProjectName]')
        .join(projectName?.projectName);
    }

    if (newProjectID) {
      const projectName = project.find(
        (item) => item.projectID == newProjectID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewProjectName]')
        .join(projectName?.projectName);
    }

    if (oldDepartmentID) {
      const departmentName = department.find(
        (item) => item.departmentId == oldDepartmentID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldDepartmentName]')
        .join(departmentName?.departmentName);
    }

    if (newDepartmentID) {
      const departmentName = department.find(
        (item) => item.departmentId == newDepartmentID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewDepartmentName]')
        .join(departmentName?.departmentName);
    }

    if (oldBranchID) {
      const branchName = branch.find(
        (item) => item.branchMasterID == oldBranchID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldBranchName]')
        .join(branchName?.branchName);
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[OldBranchAddress]')
        .join(branchName?.branchAddress);
    }

    if (newBranchID) {
      const branchName = branch.find(
        (item) => item.branchMasterID == newBranchID,
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewBranchName]')
        .join(branchName?.branchName);
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[NewBranchAddress]')
        .join(branchName?.branchAddress);
    }

    if (referenceNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[ReferenceNumber]')
        .join(referenceNumber);
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
    //userLetters
    if (employeecode) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EmployeeCode]')
        .join(employeecode);
    }
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

    const Email = EmployeeData.email;

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

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CompanyName]')
      .join(CompanyName);

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[UserName]')
      .join(UserName);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[EmployeeName]')
      .join(UserName);
    if (UserNumber) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[UserNumber]')
        .join(UserNumber);
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
    if (Branch) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Branch]')
        .join(Branch);
    }
    if (DepartmentName) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Department]')
        .join(DepartmentName);
    }
    if (Designation) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Designation]')
        .join(Designation);
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

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[SystemDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDate]')
      .join(systemDate);
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CurrentDateTime]')
      .join(toGetFormateddate(currentDateTime));

    if (DateOfBirth) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[DateOfBirth]')
        .join(DateOfBirth);
    }
    if (BranchAddress) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[BranchAddress]')
        .join(BranchAddress);
    }
    const fileName = `uploads/letter/${Date.now()}_${userMasterID}_${lettertype}.pdf`;

    if (letterDetails.letterHead == 'yes') {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: EmployeeData.companyMasterId },
      });

      let base64 = '';

      if (companyDetails.companyLogo) {
        const imagePath = path.join(
          __dirname,
          `../uploads/company/logo/${companyDetails.companyLogo}`,
        );

        // ✅ File existence check
        if (!fs.existsSync(imagePath)) {
          throw new Error(
            'Company logo not found. Please upload company logo.',
          );
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

      const getTemplate = (type) =>
        path.join(__dirname, `../html/${type}.html`);
      const readFile = (name) => fs.promises.readFile(name, 'utf-8');

      const filePath = getTemplate('preboardingLetterHead');
      companyDetails.base64 = base64;
      const file = await readFile(filePath);
      const template = Handlebars.compile(file);
      const headerTemplate = template(companyDetails);

      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: 'Discrepancy Letter' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        headerTemplate,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else if (letterDetails.letterHead == 'no') {
      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: 'Discrepancy Letter' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);

      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else {
      if (letterHead) {
        imagePath =
          process.env.APIURL + `uploads/company/letterHead/${letterHead}`;
      }
      const letterName = 'Transfer Letter';
      cont = `<div class="main1">
            ${letterDetails.letterTemplate}
          </div>`;

      const data1 = {
        content: cont,
        letterName: letterName,
        letterHead: letterHead,
      };
      const timestamp = Date.now();
      const pdfBuffer = await generateOfferLetterPdf(
        'preboardingOfferLetter',
        data1,
      );
      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }
    //t = await sequelize.transaction();
    await UserTransferLetter.create(
      {
        path: fileName,
        userMasterID: userMasterID,
        transferLetterID: letterDetails.dataValues.transferLetterID,
        transferletterHTML: cont,
        referenceNumber: referenceNumber,
        effectiveDate: effectiveDate || null,
        oldProjectID: oldProjectID || null,
        newProjectID: newProjectID || null,
        oldDepartmentID: oldDepartmentID || null,
        newDepartmentID: newDepartmentID || null,
        oldBranchID: oldBranchID || null,
        newBranchID: newBranchID || null,
      },
      { user: req.userDetails, transaction },
      { transaction: transaction },
    );
    if (letterDetails.setReferenceNumber) {
      await TransferLetter.update(
        {
          currentSequence: parseInt(letterDetails.currentSequence) + 1,
        },
        {
          where: {
            transferLetterID: letterDetails.dataValues.transferLetterID,
          },
          transaction: transaction,
        },
      );
    }
    // await t.commit();
  } catch (err) {
    // if (t) await t.rollback();
    throw err;
  }
}

async function editGenerateLetter(
  letterType,
  userMasterID,
  letterHTML,
  letterID,
  createBy,
  createByIp,
  letterDetails,
  userTransferLetterID,
  transaction,
  letterHead,
) {
  try {
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

    const user = await UserMaster.findOne({
      raw: true,
      where: { userMasterID },
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    if (!user) {
      return { status: 401, message: `User not found` };
    }
    const fileName = `uploads/letter/${Date.now()}_${userMasterID}_${letterType}.pdf`;

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

        // ✅ 1. Validate file existence (fail fast)
        if (!fs.existsSync(imagePath)) {
          throw new Error(
            'Company logo not found. Please upload company logo.',
          );
        }

        // ✅ 2. Convert image to base64 safely
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

        const filePath = getTemplate('preboardingLetterHead');
        companyDetails.base64 = base64;
        const file = await readFile(filePath);
        const template = Handlebars.compile(file);
        const headerTemplate = template(companyDetails);

        const content =
          `<div class="main1" style="font-size: 12px !important">` +
          letterHTML +
          `</div>`;
        const data1 = { content, letterName: 'Transfer Letter' };
        const pdfBuffer = await generatePDF(
          'preboardingOfferLetter',
          data1,
          headerTemplate,
        );
        const pdfFilePath = path.join(__dirname, `../${fileName}`);
        fs.writeFileSync(pdfFilePath, pdfBuffer);
      });
    } else if (letterDetails.letterHead == 'no') {
      const content =
        `<div class="main1" style="font-size: 12px !important">` +
        letterHTML +
        `</div>`;
      const data1 = { content, letterName: 'Transfer Letter' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else {
      if (letterHead) {
        imagePath =
          process.env.APIURL + `uploads/company/letterHead/${letterHead}`;
      }
      const letterName = 'Transfer Letter';
      cont = `<div class="main1">` + letterHTML + `</div>`;

      const data1 = {
        content: cont,
        letterName: letterName,
        letterHead: letterHead,
      };
      const pdfBuffer = await generateOfferLetterPdf(
        'preboardingOfferLetter',
        data1,
      );
      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }

    await UserTransferLetter.update(
      {
        path: fileName,
        transferletterHTML: letterHTML,
        updateBy: createBy,
        updateByIp: createByIp,
      },
      {
        where: { userTransferLetterID: userTransferLetterID },
      },
      { transaction },
    );

    return { status: 200, message: `${letterType} Updated Successfully` };
  } catch (err) {
    console.error('Error generating letter:', err);
    throw err;
  }
}

async function getEmployeeDetails(userMasterID) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const data = await UserMaster.findOne({
    where: {
      userMasterID,
    },

    include: [
      {
        model: companyMaster,
        required: true,
        attributes: ['companyName', 'companyLogo', 'companyMasterID'],
      },
      {
        required: false,
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'joiningDate',
          'dob',
          'adharCard',
          'employment',
          'adharName',
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
    ],

    attributes: [
      'email',
      'displayName',
      'userNumber',
      'userMasterID',
      'companyMasterId',
      'officalEmail',
    ],
  });

  return data;
}
function renderHtmlTemplate(content, values) {
  return Object.entries(values).reduce((html, [key, value]) => {
    return html.split(`{{${key}}}`).join(value == null ? '' : String(value));
  }, content);
}
async function generatePDF(htmlFileName, obj, headerTemplate) {
  try {
    const templatePath = path.join(
      __dirname,
      '../html/',
      `${htmlFileName}.html`,
    );

     let content = fs.readFileSync(templatePath, 'utf-8');
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
        footerTemplate: ' ',
        margin: {
          top: '240px',
          bottom: '150px',
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
          bottom: '150px',
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

async function getTranferLetterData(userMasterID, userTransferLetterID) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const data = await UserTransferLetter.findOne({
    where: {
      userMasterID,
      userTransferLetterID,
    },
    include: [
      {
        required: true,
        model: UserMaster,
        attributes: ['email', 'displayName', 'userNumber', 'companyMasterId'],
        include: [
          {
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
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
            model: companyMaster,
            attributes: ['companyName', 'companyLogo'],
          },
        ],
      },
    ],
  });

  return data;
}

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
