const sequelize = require('../config/database');
const empWorkingAgreement = require('../models/empWorkAgreement');
const empResponsibility = require('../models/empResponsibilities');
const empResponsibilityDetails = require('../models/empResponsibilityDetails');
const Designation = require('../models/designation');
const message = require('../response_message/message');
const empWorkAgreement = require('../models/empWorkAgreement');
const WorkAgreement = require('../models/workAgreement');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { notificationScreentTypes } = require('../utils/dbUtils');
const { Sequelize, Op } = require('sequelize');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDiscrepancyLetter = require('../models/employeeDiscrepancyLetter');
const base64Img = require('base64-img');
const {
  asiaKolkataDateTime,
  addPageBreak,
  sendNotification_NEW,
  getEmployeeAddress,
  toWords,
} = require('../utils/commonUtilFunctions');
const { launch } = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { generateOfferLetterPdf } = require('../utils/pdfGenerate');
const UserInbox = require('../models/UserInbox');
const UserReportTO = require('../models/employeeReportTo');
const moment = require('moment');
// ---------------- ADD ----------------
exports.addUserWorkAgreement = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userMasterID,
      designationID,
      agreementName,
      effectiveDate,
      toDate,
      salary,
      responsibilities,
    } = req.body;

    if (toDate < effectiveDate) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Effective To Cannot be greater then Effective From',
      });
    }

    const createdAgreement = await empWorkingAgreement.create(
      {
        userMasterID,
        designationId: designationID,
        agreementName,
        salary,
        startDate: effectiveDate,
        endDate: toDate,
      },
      {
        transaction,
        user: req.userDetails,
      },
    );

    if (responsibilities && responsibilities.length) {
      for (const responsibility of responsibilities) {
        const createdResponsibility = await empResponsibility.create(
          {
            workAgrID: createdAgreement.id,
            responsibilityName: responsibility.name,
          },
          {
            transaction,
            user: req.userDetails,
          },
        );

        const descriptionData = (responsibility.descriptions || []).map(
          (description) => ({
            responsibilityDescription: description,
            empRespoID: createdResponsibility.empResID,
          }),
        );

        if (descriptionData.length) {
          await empResponsibilityDetails.bulkCreate(descriptionData, {
            transaction,
            user: req.userDetails,
            individualHooks: true,
          });
        }
      }
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Work Agreement'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// ---------------- LIST ----------------
exports.getUserWorkAgreement = async (req, res, next) => {
  try {
    const { userMasterID, page, limit } = req.body;

    if (!userMasterID) {
      return res
        .status(200)
        .json({ status: 400, message: 'invalid parameters' });
    }

    const pageNumber = page || 1;
    const pageLimit = limit || 10;
    const offset = (pageNumber - 1) * pageLimit;

    const agreements = await empWorkingAgreement.findAndCountAll({
      where: { userMasterID },
      attributes: [
        'id',
        'userMasterID',
        'designationId',
        'agreementName',
        'salary',
        'startDate',
        'endDate',
        'authStatus',
        'agreementID',
        'agreementHTML',
        'agreementPath',
        'acceptedAt',
      ],
      include: [
        {
          model: Designation,
        },
        {
          model: empResponsibility,
          as: 'ER',
          attributes: ['empResID', 'responsibilityName'],
          include: [
            {
              model: empResponsibilityDetails,
              as: 'ERD',
              attributes: ['empResDetailID', 'responsibilityDescription'],
            },
          ],
        },
      ],
      order: [['id', 'DESC']],
      limit: pageLimit,
      offset: offset,
      distinct: true, // required so `count` isn't inflated by the ER/ERD joins
    });

    return res.status(200).json({
      status: 200,
      data: agreements.rows,
      totalcount: agreements.count,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- DELETE ----------------
exports.deleteUserWorkAgreement = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { userWorkAgreementID } = req.body;

    if (!userWorkAgreementID) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 400, message: 'invalid parameters' });
    }

    const responsibilities = await empResponsibility.findAll({
      where: { workAgrID: userWorkAgreementID },
      attributes: ['empResID'],
      transaction,
    });

    const responsibilityIDs = responsibilities.map((r) => r.empResID);

    if (responsibilityIDs.length) {
      await empResponsibilityDetails.destroy({
        where: { empRespoID: { [Op.in]: responsibilityIDs } },
        transaction,
        user: req.userDetails,
        individualHooks: true,
      });

      await empResponsibility.destroy({
        where: { workAgrID: userWorkAgreementID },
        transaction,
        user: req.userDetails,
        individualHooks: true,
      });
    }

    await empWorkingAgreement.destroy({
      where: { id: userWorkAgreementID },
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Work Agreement'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// EDIT

exports.editUserWorkAgreement = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      userMasterID,
      designationID,
      agreementName,
      effectiveDate,
      toDate,
      salary,
      responsibilities,
      id,
    } = req.body;

    if (!id) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 400, message: 'Invalid parameters' });
    }
    if (toDate < effectiveDate) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Effective To Cannot be greater then Effective From',
      });
    }
    const editData = await empWorkAgreement.findOne({
      where: { id: id, userMasterID: userMasterID },
    });
    if (!editData) {
      await transaction.rollback();
      return res.status(200).json({ status: 400, message: 'no data found' });
    }
    await empWorkAgreement.update(
      {
        designationID,
        agreementName,
        startDate: effectiveDate,
        endDate: toDate,
        salary,
      },
      { where: { id: id, userMasterID: userMasterID }, transaction },
    );

    const responsibilityID = await empResponsibility.findAll({
      where: { workAgrID: id },
      attributes: ['empResID'],
    });

    const destroyResponsibility = await empResponsibility.destroy({
      where: { workAgrID: id },
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    const destroyID = responsibilityID.map((item) => item.empResID);
    await empResponsibilityDetails.destroy({
      where: { empRespoID: { [Op.in]: destroyID } },
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    if (responsibilities && responsibilities.length) {
      for (const responsibility of responsibilities) {
        const createdResponsibility = await empResponsibility.create(
          {
            workAgrID: id,
            responsibilityName: responsibility.name,
          },
          {
            transaction,
            user: req.userDetails,
          },
        );

        const descriptionData = (responsibility.descriptions || []).map(
          (description) => ({
            responsibilityDescription: description,
            empRespoID: createdResponsibility.empResID,
          }),
        );

        if (descriptionData.length) {
          await empResponsibilityDetails.bulkCreate(descriptionData, {
            transaction,
            user: req.userDetails,
            individualHooks: true,
          });
        }
      }
    }
    await transaction.commit();
    return res
      .status(200)
      .json({ status: 200, message: 'Edit Work Agreement Succesfull' });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// get by id

exports.getByWorkAgreementID = async (req, res, next) => {
  try {
    const { id, userMasterID } = req.body;

    const workAgreementData = await empWorkAgreement.findOne({
      where: { id: id, userMasterID: userMasterID },
      attributes: [
        'id',
        'userMasterID',
        'designationId',
        'agreementName',
        'salary',
        'startDate',
        'endDate',
        'authStatus',
      ],
      include: [
        {
          model: empResponsibility,
          as: 'ER',
          attributes: ['empResID', 'responsibilityName'],
          include: [
            {
              model: empResponsibilityDetails,
              as: 'ERD',
              attributes: ['empResDetailID', 'responsibilityDescription'],
            },
          ],
        },
      ],
    });
    if (!workAgreementData) {
      return res.status(200).json({ status: 400, message: 'no data found' });
    }
    return res.status(200).json({ status: 200, data: workAgreementData });
  } catch (err) {
    next(err);
  }
};

// get responsibility by id

exports.getResponsibilityByID = async (req, res, next) => {
  try {
    const { id } = req.body;
    const responsibilityData = await empResponsibility.findAll({
      where: { workAgrID: id },
      attributes: ['empResID', 'responsibilityName'],
      include: [
        {
          model: empResponsibilityDetails,
          as: 'ERD',
          attributes: ['empResDetailID', 'responsibilityDescription'],
        },
      ],
    });
    if (!responsibilityData) {
      return res.status(200).json({ status: 400, message: 'no data found' });
    }
    return res.status(200).json({ status: 200, data: responsibilityData });
  } catch (err) {
    next(err);
  }
};

// delete

// exports.deleteWorkAgreementBYID = async (req, res, next) => {
//   try {
//     const { id, userMasterID } = req.body;
//     if (!id || !userMasterID) {
//       return res
//         .status(200)
//         .json({ status: 400, message: 'Invalid Parameters' });
//     }
//     const workAgreementData = await empWorkAgreement.findOne({
//       where: { id: id, userMasterID: userMasterID },
//     });
//     if (!workAgreementData) {
//       return res.status(200).json({ status: 400, message: 'data not found' });
//     }
//   } catch (err) {}
// };

exports.generateWorkAgreement = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, workAgreementID, id } = req.body;

    const workAgreement = await WorkAgreement.findOne({
      raw: true,
      where: { workAgreementID },
      include: [{ model: companyMaster, attributes: ['letterHead'] }],
      transaction,
    });

    await addGenerateLetter(
      userMasterID,
      workAgreement,
      'WorkAgreement',
      req,
      transaction,
      id,
    );

    await UserInbox.create(
      {
        activityTable: empWorkAgreement.getTableName(),
        activityTablePK: id,
        message: `Your work agreement is ready for review.`,
        assignedBy: req.userDetails.userMasterId,
        assignedTo: userMasterID,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    // if (findUserData && findUserData.firebaseToken && findUserData.deviceType) {
    //   const notification = {
    //     title: `${workAgreement.workAgreementName}`,
    //     body: `Your work agreement is ready for review.`,
    //   };
    //   const data = {
    //     screen: notificationScreentTypes.DISCREPANCYLETTER,
    //   };
    //   sendNotification_NEW(
    //     findUserData.firebaseToken,
    //     findUserData.deviceType,
    //     notification,
    //     data,
    //   );
    // }

    return res.status(200).json({
      status: 200,
      message: 'Work Agreement Generated Successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getEmployeeDiscrepancyLetter = async (req, res, next) => {
  try {
    const { limit, page, userMasterID, searchQuery } = await req.body;

    const condition = {};

    condition.status = 1;

    condition.userMasterID = userMasterID;

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows, count } = await EmployeeDiscrepancyLetter.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        { model: UserMaster, attributes: ['displayName'] },
        {
          model: DiscrepancyLetter,
          attributes: [
            'discrepancyLetterID',
            'discrepancyLetterName',
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
      item.htmlContent = addPageBreak(item.discrepancyLetterHTML);
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

exports.updateEmployeeDiscrepancyLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, letterHTML, id, discrepancyLetterID } =
      await req.body;

    const letterDetails = await WorkAgreement.findOne({
      raw: true,
      where: { discrepancyLetterID },
    });

    const letterResponse = await editGenerateLetter(
      'WorkAgreement',
      userMasterID,
      letterHTML,
      discrepancyLetterID,
      req.userDetails.userMasterId,
      req.userDetails.userIpAddress,
      letterDetails,
      id,
      transaction,
    );
    await transaction.commit();
    return res.status(200).json(letterResponse);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
exports.deleteEmployeeDiscrepancyLetter = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = await req.body;

    const findData = await empWorkAgreement.findByPk(id);

    await findData.update(
      {
        agreementID: null,
        agreementHTML: null,
        agreementPath: null,
        agreementGeneratedAt: null,
        referenceNumber: null,
      },
      {
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Work Agreement'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getMyWorkAgreement = async (req, res, next) => {
  try {
    const { page, limit } = req.body;

    const pageNumber = page || 1;
    const pageLimit = limit || 10;
    const offset = (pageNumber - 1) * pageLimit;

    const agreements = await empWorkingAgreement.findAndCountAll({
      where: {
        userMasterID: req.userDetails.userMasterId,
        agreementID: {
          [Sequelize.Op.ne]: null,
        },
      },
      attributes: [
        'id',
        'userMasterID',
        'designationId',
        'agreementName',
        'salary',
        'startDate',
        'endDate',
        'authStatus',
        'agreementID',
        'agreementHTML',
        'agreementPath',
        'authStatus',
        'acceptedAt',
      ],
      include: [
        {
          model: Designation,
        },
        {
          model: empResponsibility,
          as: 'ER',
          attributes: ['empResID', 'responsibilityName'],
          include: [
            {
              model: empResponsibilityDetails,
              as: 'ERD',
              attributes: ['empResDetailID', 'responsibilityDescription'],
            },
          ],
        },
      ],
      order: [['id', 'DESC']],
      limit: pageLimit,
      offset: offset,
      distinct: true, // required so `count` isn't inflated by the ER/ERD joins
    });

    return res.status(200).json({
      status: 200,
      data: agreements.rows,
      totalcount: agreements.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptAgreemnt = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { isAccepted, id } = req.body;

    if (isAccepted) {
      await empWorkAgreement.update(
        {
          authStatus: 1,
          acceptedAt: new Date(),
          acceptedBy: req.userDetails.userMasterId,
        },
        {
          where: {
            id,
          },
        },
      );

      await UserInbox.destroy({
        where: {
          activityTablePK: id,
          activityTable: empWorkAgreement.getTableName(),
        },
      });
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Agreement Accepted Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteAgreement = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.body;

    await empWorkAgreement.update(
      {
        agreementPath: null,
        agreementHTML: null,
        agreementID: null,
        agreementGeneratedAt: null,
        authStatus: 0,
        acceptedAt: null,
        acceptedBy: null,
      },
      {
        where: { id },
      },
    );

    await UserInbox.destroy({
      where: {
        activityTablePK: id,
        activityTable: empWorkAgreement.getTableName(),
      },
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Agreement Deleted Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

async function addGenerateLetter(
  userMasterID,
  letterDetails,
  lettertype,
  req,
  transaction,
  id,
) {
  let cont;
  try {
    let referenceNumber = null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (
      letterDetails?.setReferenceNumber &&
      letterDetails?.resetRefNumber &&
      letterDetails?.currentSequence !== 1
    ) {
      const currentMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      );

      const getCurrentMonthGeneratedLetters = await empWorkAgreement.findAll({
        where: {
          agreementID: letterDetails.workAgreementID,
          createdAt: { [Op.gt]: currentMonth },
        },
        transaction,
      });

      if (getCurrentMonthGeneratedLetters.length == 0) {
        await WorkAgreement.update(
          {
            startingSequence: 1,
            currentSequence: 1,
          },
          {
            where: { workAgreementID: letterDetails.workAgreementID },
            transaction,
          },
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

    const Department =
      EmployeeData.employeeDepartments &&
      EmployeeData.employeeDepartments.length > 0 &&
      EmployeeData.employeeDepartments[0].department
        ? EmployeeData.employeeDepartments[0].department.departmentName
        : '';

    const Designation =
      EmployeeData.employeeDesignations &&
      EmployeeData.employeeDesignations.length > 0 &&
      EmployeeData.employeeDesignations[0].designation
        ? EmployeeData.employeeDesignations[0].designation.designationName
        : '';

    const CompanyName = EmployeeData.companyMaster.companyName;
    const UserName = EmployeeData.displayName;
    const UserNumber = EmployeeData.userNumber;
    // const currentDateTime = new Date().toISOString();

    const companyAddress = EmployeeData?.companyMaster?.companyAddress;

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

    const Employeejoining =
      EmployeeData.employeeJoiningDetails &&
      EmployeeData.employeeJoiningDetails.length > 0
        ? EmployeeData.employeeJoiningDetails[0]
        : null;

    const JoiningDate =
      Employeejoining && Employeejoining.joiningDate
        ? Employeejoining.joiningDate.split('-').reverse().join('-')
        : '';

    const employeeProjects = EmployeeData?.employeeProjects;

    const BranchAddress =
      EmployeeData.employeeBranches &&
      EmployeeData.employeeBranches.length > 0 &&
      EmployeeData.employeeBranches[0].branchMaster
        ? EmployeeData.employeeBranches[0].branchMaster.branchAddress
        : '';

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

    let allProjectsName = null;
    if (employeeProjects.length > 0) {
      allProjectsName = employeeProjects
        .map((pro) => pro?.project?.projectName)
        .join(', ');
    }
    let resposibilityForPDF;
    if (id) {
      const responsibility = await empResponsibility.findAll({
        where: {
          workAgrID: id,
        },
        include: [
          {
            model: empResponsibilityDetails,
            as: 'ERD',
          },
        ],
      });

      if (responsibility.length > 0 && letterDetails.letterHead != 'uploaded') {
  let tableHtml = `
<table border="1" cellpadding="5" cellspacing="0" width="100%">
  <thead>
    <tr>
      <th>Sr.</th>
      <th>Responsibility</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
`;

  responsibility.forEach((resp, index) => {
    const details = resp.ERD || [];

    if (details.length > 0) {
      details.forEach((detail, detailIndex) => {
        if (detailIndex === 0) {
          tableHtml += `
            <tr>
              <td rowspan="${details.length}">
                ${index + 1}
              </td>
              <td rowspan="${details.length}">
                ${resp.responsibilityName}
              </td>
              <td>
                ${detail.responsibilityDescription}
              </td>
            </tr>
          `;
        } else {
          tableHtml += `
            <tr>
              <td>
                ${detail.responsibilityDescription}
              </td>
            </tr>
          `;
        }
      });
    } else {
      tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${resp.responsibilityName}</td>
          <td></td>
        </tr>
      `;
    }
  });

  tableHtml += `
  </tbody>
</table>
`;

  letterDetails.letterTemplate = letterDetails.letterTemplate
    .split('[Responsibility]')
    .join(tableHtml);
}

resposibilityForPDF = responsibility

if (responsibility && letterDetails.letterHead == 'uploaded') {
  letterDetails.letterTemplate = letterDetails.letterTemplate
    .split('[Responsibility]')
    .join('__RESPONSIBILITY_TABLE__');

  // obj.responsibility = responsibility;
}
    }

    const getAgreement = await empWorkAgreement.findOne({
      where: {
        id,
      },
    });

    if (getAgreement) {
      const amount = Number(getAgreement.salary);

      const salaryText = `${amount.toLocaleString('en-IN')} (${toWords.convert(amount)})`;

      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Salary]')
        .join(salaryText);
      const effectiveTo = moment(getAgreement.endDate, 'YYYY-MM-DD').format(
        'DD-MM-YYYY',
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EffectiveTo]')
        .join(effectiveTo);
      const effectiveFrom = moment(getAgreement.startDate, 'YYYY-MM-DD').format(
        'DD-MM-YYYY',
      );
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[EffectiveFrom]')
        .join(effectiveFrom);
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

    if (BranchAddress) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[BranchAddress]')
        .join(BranchAddress);
    }

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[JoiningDate]')
      .join(JoiningDate);

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[ReportingPerson]')
      .join(ReportTOPerson);

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[ReportingPersonWithDesignation]')
      .join(ReportingPersonWithDesignation);

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[CompanyAddress]')
      .join(companyAddress);

    const systemDate = new Date()
      .toISOString()
      .slice(0, 10)
      .split('-')
      .reverse()
      .join('-');

    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[SystemDate]')
      .join(systemDate);

    const Email = EmployeeData.email;
    letterDetails.letterTemplate = letterDetails.letterTemplate
      .split('[Address]')
      .join(await getAddress(userMasterID));

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
    if (Department) {
      letterDetails.letterTemplate = letterDetails.letterTemplate
        .split('[Department]')
        .join(Department);
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

    const fileName = `uploads/agreements/${Date.now()}_${userMasterID}_${lettertype}.pdf`;

    const uploadDir = path.join(__dirname, '../uploads/agreements');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

    if (letterDetails.letterHead == 'yes') {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: EmployeeData.companyMasterId },
        transaction,
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
      const data1 = { content: cont, letterName: 'Work Agreement' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        headerTemplate,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else if (letterDetails.letterHead == 'no') {
      cont = `<div class="main1" style="font-size: 12px !important">${letterDetails.letterTemplate}</div>`;
      const data1 = { content: cont, letterName: 'Work Agreement' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);

      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } else {
      const companyDetails = await companyMaster.findOne({
        raw: true,
        where: { companyMasterID: EmployeeData.companyMasterId },
        attributes: ['letterHead'],
        transaction,
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
        letterName: 'Work Agreement',
        letterHead: companyDetails.letterHead,
        responsibility: resposibilityForPDF,
      };
      const pdfBuffer = await generateOfferLetterPdf(
        'preboardingOfferLetter',
        data1,
      );
      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }

    await empWorkAgreement.update(
      {
        agreementPath: fileName,
        agreementID: letterDetails.workAgreementID,
        agreementHTML: cont,
        referenceNumber: referenceNumber,
        agreementGeneratedAt: new Date(),
      },
      {
        where: {
          id: req.body.id,
        },
        user: req.userDetails,
        transaction,
      },
    );
    if (letterDetails.setReferenceNumber) {
      await WorkAgreement.update(
        {
          currentSequence: parseInt(letterDetails.currentSequence) + 1,
        },
        {
          where: {
            workAgreementID: letterDetails.workAgreementID,
          },
          transaction,
        },
      );
    }
  } catch (err) {
    throw err;
  }
}

async function editGenerateLetter(
  letterType,
  userMasterID,
  letterHTML,
  createBy,
  createByIp,
  letterDetails,
  id,
  transaction,
) {
  try {
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

    const user = await UserMaster.findOne({
      raw: true,
      where: { userMasterID },
      include: [{ model: companyMaster, attributes: ['companyName'] }],
    });

    if (!user) {
      return { status: 401, message: `User not found` };
    }
    const fileName = `uploads/agreements/${Date.now()}_${userMasterID}_${letterType}.pdf`;

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
        const data1 = { content, letterName: 'Work Agreement' };
        const pdfBuffer = await generatePDF(
          'preboardingOfferLetter',
          data1,
          headerTemplate,
        );
        const pdfFilePath = path.join(__dirname, `../${fileName}`);
        fs.writeFileSync(pdfFilePath, pdfBuffer);
      });
    } else {
      const content =
        `<div class="main1" style="font-size: 12px !important">` +
        letterHTML +
        `</div>`;
      const data1 = { content, letterName: 'Work Agreement' };
      const pdfBuffer = await generatePDF(
        'preboardingOfferLetter',
        data1,
        null,
      );

      const pdfFilePath = path.join(__dirname, `../${fileName}`);
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    }

    await empWorkAgreement.update(
      {
        path: fileName,
        agreementHTML: letterHTML,
        updateBy: createBy,
        updateByIp: createByIp,
      },
      {
        where: { id: id },
      },
      { transaction },
    );

    return { status: 200, message: `Work Agreement Updated Successfully` };
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
        attributes: [
          'companyName',
          'companyLogo',
          'companyMasterID',
          'companyAddress',
        ],
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

function renderHtmlTemplate(content, values) {
  return Object.entries(values).reduce((html, [key, value]) => {
    return html.split(`{{${key}}}`).join(value == null ? '' : String(value));
  }, content);
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
