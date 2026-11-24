const Sequelize = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const AppraisalFeedbackReq = require('../models/appraisalFeedbacklRequest');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const {
  asiaKolkataDateTime,
  createEmployeeJoiningDetailHistory,
} = require('../utils/commonUtilFunctions');
const ConfirmationAppraisalForm = require('../models/confirmationAppraisalFormParam');
const AppraisalFeedbackReqValue = require('../models/appraisalFeedbackReqValue');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const {
  authorizationMasterTypes,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const Handlebars = require('handlebars');

exports.getAllRequestForFeedback = async (req, res, next) => {
  try {
    const { limit, page, searchQuery } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {
      AuthorizedByUserMasterId: {
        [Sequelize.Op.contains]: [req.userDetails.userMasterId],
      },
      AuthorizationMasterID: authorizationMasterTypes.probationAssessment,
      status: 1,
    };
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const today = new Date();
    const completeDate = new Date(new Date().setDate(today.getDate() + 30));
    const { rows, count } = await FormAuthorizationDetails.findAndCountAll({
      where: condition,
      distinct: true,
      paginationQuery,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName', 'userNumber'],
          where: {
            status: 1,
            ...(searchQuery && {
              displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` },
            }),
          },

          include: [
            {
              model: EmployeeJoiningDetails,
              attributes: [
                'endDate',
                'employeeCode',
                'employment',
                'joiningDate',
              ],
              where: {
                employment: 'Probation',
                endDate: {
                  [Sequelize.Op.lte]: new Date(completeDate),
                },
              },
            },
            {
              model: EmployeeEmployeement,
              attributes: ['employeeEmployeementId', 'isExtended'],
              where: { employeement: 'Probation' },
              include: [
                {
                  model: AppraisalFeedbackReq,
                  as: 'eA',
                  attributes: [
                    'appraisalFeedbackReqID',
                    'filledByID',
                    'isReassessment',
                  ],
                  required: false,
                },
              ],
            },
            {
              model: EmployeeDesignation,
              attributes: ['designationID'],
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: true,
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                  required: true,
                  include: [
                    {
                      model: ConfirmationAppraisalForm,
                      as: 'caf',
                      where: {
                        formParameters: { [Sequelize.Op.ne]: null },
                        status: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              model: EmployeeBranch,
              required: false,
              attributes: ['branchID'],
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
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
          ],
        },
      ],
    });

    const loggedInUserId = req.userDetails.userMasterId;
    const filteredData = [];

    for (const row of rows) {
      const authorizers = row.AuthorizedByUserMasterId || [];
      const criteria = row.AuthorizationCriteriaID;

      const emp = row.userMaster;
      const employment = emp.employeeEmployeements?.[0];
      if (!employment) continue;

      const feedbacks = employment.eA || [];
      const filledByIds = feedbacks.map((f) => f.filledByID);
      const totalFilled = filledByIds.length;

      const alreadyFilledByCurrentUser = filledByIds.includes(loggedInUserId);

      let requiredCount = 0;
      let canFill = false;

      // ===== DETERMINE REQUIRED COUNT =====
      if (criteria == authorizationCriteriaType.ANYONE) requiredCount = 1;
      else if (criteria == authorizationCriteriaType.ANYTWO) requiredCount = 2;
      else if (criteria == authorizationCriteriaType.ANYTHREE)
        requiredCount = 3;

      // ===== SEQUENCE LOGIC =====
      if (criteria == authorizationCriteriaType.SEQUENCENO) {
        const currentUserIndex = authorizers.indexOf(loggedInUserId);

        // If user not in authorizer list → skip
        if (currentUserIndex == -1) continue;

        const sortedFeedbacks = feedbacks.sort(
          (a, b) =>
            authorizers.indexOf(a.filledByID) -
            authorizers.indexOf(b.filledByID),
        );

        // Get all users before current user in sequence
        const previousAuthorizers = authorizers.slice(0, currentUserIndex);

        // Check if all previous users have filled
        const allPreviousFilled = previousAuthorizers.every((id) =>
          sortedFeedbacks.some((f) => f.filledByID == id),
        );

        //  IMPORTANT: If previous not filled → skip completely
        if (!allPreviousFilled) continue;

        const alreadyFilledByCurrentUser = sortedFeedbacks.some(
          (f) => f.filledByID == loggedInUserId,
        );

        canFill = !alreadyFilledByCurrentUser;

        var pastAppraisalFeedbackReqIds = sortedFeedbacks
          .filter((f) => authorizers.indexOf(f.filledByID) < currentUserIndex)
          .map((f) => f.appraisalFeedbackReqID);
      } else {
        if (!alreadyFilledByCurrentUser) {
          canFill = totalFilled < requiredCount;
        }

        var pastAppraisalFeedbackReqIds = feedbacks.map(
          (f) => f.appraisalFeedbackReqID,
        );
      }

      filteredData.push({
        name: emp.displayName,
        designationId: emp.employeeDesignations?.[0]?.designationID,
        branch: emp.employeeBranches?.[0]?.branchMaster?.branchName,
        designation:
          emp.employeeDesignations?.[0]?.designation?.designationName,
        department: emp.employeeDepartments?.[0]?.department?.departmentName,
        empCode: emp.employeeJoiningDetails?.[0]?.employeeCode,
        endDate: emp.employeeJoiningDetails?.[0]?.endDate,
        employment: emp.employeeJoiningDetails?.[0]?.employment,
        joiningDate: emp.employeeJoiningDetails?.[0]?.joiningDate,
        number: emp.userNumber,
        employeeEmploymentID: employment.employeeEmployeementId,
        appraisalFeedbackReqID:
          feedbacks.find((f) => f.filledByID == loggedInUserId)
            ?.appraisalFeedbackReqID || null,
        canFill,

        pastAppraisalFeedbackReqIds,
        isExtended: employment.isExtended,
        showReassessmentButton: employment.isExtended == true,
        isReassessment: feedbacks.some(
          (feeds) =>
            req.userDetails.userMasterId == feeds.filledByID &&
            feeds.isReassessment == true,
        ),
      });
    }

    const totalcount = filteredData.length;

    let paginatedData = filteredData;

    if (page && limit) {
      const start = (page - 1) * limit;
      const end = start + parseInt(limit);
      paginatedData = filteredData.slice(start, end);
    }

    return res.status(200).json({
      status: 200,
      data: paginatedData,
      totalcount,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddAppraisalFeedbackReqValue = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { fields, employeeEmploymentID, suggestionAuthority, isExtended } =
      req.body;

    if (!fields) {
      await t.rollback();
      return res.status(200).json({
        status: 401,
        message: 'No Data to save.',
      });
    }

    const appraisalFeedbackReq = await AppraisalFeedbackReq.create(
      {
        filledByID: req.userDetails.userMasterId,
        employeeEmploymentID: employeeEmploymentID,
        authoritySuggestion: suggestionAuthority?.authoritySuggestion || null,
        isTargetAchieved: suggestionAuthority?.isTargetAchieved || null,
        extendedReason: suggestionAuthority?.extendedReason || null,
        isReassessment: isExtended ? true : false,
      },
      { user: req.userDetails, transaction: t },
    );

    const dataToInsert = [];

    fields.map((field) => {
      dataToInsert.push({
        appraisalFeedbackReqID: appraisalFeedbackReq.appraisalFeedbackReqID,
        parameter: field.name,
        value: field.isApplicable ? field.performance : 'N/A',
        needsToImprove: field.needsToImprove,
        fieldType: field.fieldType,
      });
    });

    await AppraisalFeedbackReqValue.bulkCreate(dataToInsert, {
      user: req.userDetails,
      individualHooks: true,
      transaction: t,
    });

    // Extend 90 days probation if final authorizer extends probation
    if (suggestionAuthority.authoritySuggestion == 'Extend') {
      const getAllFeedbacks = await AppraisalFeedbackReq.findAll({
        where: {
          employeeEmploymentID: employeeEmploymentID,
        },
        include: [
          {
            as: 'eA',
            model: EmployeeEmployeement,
            attributes: [
              'employeeEmployeementId',
              'userMasterID',
              'endDate',
              'applicableDate',
              'employeement',
            ],
            where: {
              employeeEmployeementId: employeeEmploymentID,
              status: 1,
            },
            include: [
              {
                model: UserMaster,
                as: 'employee',
                attributes: ['userMasterID'],
                include: [
                  {
                    model: FormAuthorizationDetails,
                    attributes: [
                      'AuthorizationCriteriaID',
                      'AuthorizedByUserMasterId',
                    ],
                    where: {
                      AuthorizationMasterID:
                        authorizationMasterTypes.probationAssessment,
                      status: 1,
                    },
                  },
                ],
              },
            ],
          },
        ],
        transaction: t,
      });
      const endDate = new Date(getAllFeedbacks?.[0]?.eA?.endDate);
      endDate.setDate(endDate.getDate() + 90);
      const confirmExtendDate = endDate.toISOString().split('T')[0];
      const userMasterID = getAllFeedbacks?.[0]?.eA?.employee?.userMasterID;
      const updateBy = req.userDetails.userMasterId;
      const updateByIP = req.userDetails.userIpAddress;
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE &&
        getAllFeedbacks.length >= 1
      ) {
        await extendEmployee(
          userMasterID,
          employeeEmploymentID,
          confirmExtendDate,
          updateBy,
          updateByIP,
          t,
          getAllFeedbacks,
        );
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO &&
        getAllFeedbacks.length >= 2
      ) {
        await extendEmployee(
          userMasterID,
          employeeEmploymentID,
          confirmExtendDate,
          updateBy,
          updateByIP,
          t,
          getAllFeedbacks,
        );
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE &&
        getAllFeedbacks.length >= 3
      ) {
        await extendEmployee(
          userMasterID,
          employeeEmploymentID,
          confirmExtendDate,
          updateBy,
          updateByIP,
          t,
          getAllFeedbacks,
        );
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO &&
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizedByUserMasterId.length == getAllFeedbacks.length
      ) {
        await extendEmployee(
          userMasterID,
          employeeEmploymentID,
          confirmExtendDate,
          updateBy,
          updateByIP,
          t,
          getAllFeedbacks,
        );
      }
    } else if (suggestionAuthority.authoritySuggestion == 'Confirm') {
      const getAllFeedbacks = await AppraisalFeedbackReq.findAll({
        where: {
          employeeEmploymentID: employeeEmploymentID,
        },
        include: [
          {
            as: 'eA',
            model: EmployeeEmployeement,
            attributes: [
              'employeeEmployeementId',
              'userMasterID',
              'endDate',
              'applicableDate',
              'employeement',
              'isExtended',
            ],
            where: {
              employeeEmployeementId: employeeEmploymentID,
              status: 1,
            },
            include: [
              {
                model: UserMaster,
                as: 'employee',
                attributes: ['userMasterID'],
                include: [
                  {
                    separate: true,
                    model: FormAuthorizationDetails,
                    attributes: [
                      'AuthorizationCriteriaID',
                      'AuthorizedByUserMasterId',
                    ],
                    where: {
                      AuthorizationMasterID:
                        authorizationMasterTypes.probationAssessment,
                      status: 1,
                    },
                  },
                ],
              },
            ],
          },
        ],
        transaction: t,
      });

      const userMasterID = getAllFeedbacks?.[0]?.eA?.employee?.userMasterID;
      const employementEndDate = getAllFeedbacks?.[0]?.eA?.endDate;
      let endDate = null;
      const createBy = req.userDetails.userMasterId;
      const createByIP = req.userDetails.userIpAddress;
      if (employementEndDate) {
        const date = new Date(employementEndDate);
        date.setDate(date.getDate() + 1);
        const nextDate = date.toISOString().split('T')[0];
        endDate = nextDate;
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE &&
        getAllFeedbacks.length >= 1
      ) {
        await confirmEmployee(
          userMasterID,
          endDate,
          createBy,
          createByIP,
          t,
          employeeEmploymentID,
        );
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO &&
        getAllFeedbacks.length >= 2
      ) {
        if (isExtended) {
          const currentFormFilledUsers = getAllFeedbacks.filter(
            (item) => item.isReassessment == true,
          );
          if (currentFormFilledUsers.length >= 2) {
            await confirmEmployee(
              userMasterID,
              endDate,
              createBy,
              createByIP,
              t,
              employeeEmploymentID,
            );
          }
        } else {
          await confirmEmployee(
            userMasterID,
            endDate,
            createBy,
            createByIP,
            t,
            employeeEmploymentID,
          );
        }
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE &&
        getAllFeedbacks.length >= 3
      ) {
        if (isExtended) {
          const currentFormFilledUsers = getAllFeedbacks.filter(
            (item) => item.isReassessment == true,
          );
          if (currentFormFilledUsers.length >= 3) {
            await confirmEmployee(
              userMasterID,
              endDate,
              createBy,
              createByIP,
              t,
              employeeEmploymentID,
            );
          }
        } else {
          await confirmEmployee(
            userMasterID,
            endDate,
            createBy,
            createByIP,
            t,
            employeeEmploymentID,
          );
        }
      }
      if (
        getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
          ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO &&
        getAllFeedbacks.length >=
          getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
            ?.AuthorizedByUserMasterId.length
      ) {
        if (isExtended) {
          const currentFormFilledUsers = getAllFeedbacks.filter(
            (item) => item.isReassessment == true,
          );
          if (
            currentFormFilledUsers.length >=
            getAllFeedbacks?.[0]?.eA?.employee?.authorizationDetails?.[0]
              ?.AuthorizedByUserMasterId.length
          ) {
            await confirmEmployee(
              userMasterID,
              endDate,
              createBy,
              createByIP,
              t,
              employeeEmploymentID,
            );
          }
        } else {
          await confirmEmployee(
            userMasterID,
            endDate,
            createBy,
            createByIP,
            t,
            employeeEmploymentID,
          );
        }
      }
    }

    await t.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.appraisalFeedbackSent,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getFilledFormValue = async (req, res, next) => {
  try {
    const { appraisalFeedbackReqID } = req.body;

    const filledFormData = await AppraisalFeedbackReq.findAll({
      attributes: [
        'appraisalFeedbackReqID',
        'authoritySuggestion',
        'isTargetAchieved',
        'extendedReason',
      ],
      where: { appraisalFeedbackReqID },
      include: [
        {
          model: AppraisalFeedbackReqValue,
          where: { appraisalFeedbackReqID: appraisalFeedbackReqID },
        },
        {
          model: UserMaster,
          as: 'reviewer',
          attributes: ['displayName', 'userMasterID'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: filledFormData,
    });
  } catch (error) {
    next(error);
  }
};

exports.showAppraisalFeedbackToHR = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const employee = await UserMaster.findOne({
      where: { userMasterID },
      attributes: ['userMasterID', 'displayName', 'userNumber'],
      include: [
        {
          model: FormAuthorizationDetails,
          required: true,
          attributes: ['AuthorizedByUserMasterId'],
          where: {
            AuthorizationMasterID: authorizationMasterTypes.probationAssessment,
            status: 1,
          },
        },
        {
          model: EmployeeEmployeement,
          as: 'employeeEmployeements',
          where: { employeement: 'Probation' },
          required: false,
          attributes: [
            'employeeEmployeementId',
            'employeement',
            'applicableDate',
            'endDate',
          ],
          include: [
            {
              model: AppraisalFeedbackReq,
              as: 'eA',
              attributes: [
                'filledByID',
                'employeeEmploymentID',
                'appraisalFeedbackReqID',
                'createdAt',
              ],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
          required: false,
        },
        {
          required: false,
          model: EmployeeDesignation,
          attributes: ['designationID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
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
          model: EmployeeBranch,
          attributes: ['branchID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
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
      ],
    });

    const authorizerIDs = employee?.authorizationDetails
      .map((auth) => auth?.AuthorizedByUserMasterId)
      .flat();
    let reviewers = [];
    if (authorizerIDs) {
      reviewers = await UserMaster.findAll({
        where: { userMasterID: { [Sequelize.Op.in]: authorizerIDs } },
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
          {
            required: false,
            model: EmployeeDesignation,
            attributes: ['designationID'],
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                { endDate: null },
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
            model: EmployeeBranch,
            attributes: ['branchID'],
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                { endDate: null },
              ],
            },
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
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                { endDate: null },
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
        ],
      });
    }

    const filledUsers = [];
    const pendingUsers = [];

    reviewers?.forEach((rev) => {
      const feedbacks = employee?.employeeEmployeements?.[0]?.eA.filter(
        (f) => f.filledByID == rev.userMasterID,
      );

      if (feedbacks && feedbacks.length > 0) {
        feedbacks.forEach((feedback) => {
          filledUsers.push({
            userMasterID: rev.userMasterID,
            displayName: rev.displayName,
            userNumber: rev.userNumber,
            appraisalFeedbackReqID: feedback.appraisalFeedbackReqID,
            employment: employee.employeeEmployeements?.[0]?.employeement,
            startDate: employee.employeeEmployeements?.[0]?.applicableDate,
            endDate: employee.employeeEmployeements?.[0]?.endDate,
            createdAt: feedback.createdAt,
            empCode: rev.employeeJoiningDetails?.[0]?.employeeCode || null,
            branch: rev.employeeBranches?.[0]?.branchMaster?.branchName || null,
            department:
              rev.employeeDepartments?.[0]?.department?.departmentName || null,
            designation:
              rev.employeeDesignations?.[0]?.designation?.designationName ||
              null,
          });
        });
      } else {
        pendingUsers.push({
          userMasterID: rev.userMasterID,
          displayName: rev.displayName,
          userNumber: rev.userNumber,
          appraisalFeedbackReqID: null,
          employment: employee.employeeEmployeements?.[0]?.employeement,
          startDate: employee.employeeEmployeements?.[0]?.applicableDate,
          endDate: employee.employeeEmployeements?.[0]?.endDate,
          createdAt: null,
          empCode: rev.employeeJoiningDetails?.[0]?.employeeCode || null,
          branch: rev.employeeBranches?.[0]?.branchMaster?.branchName || null,
          department:
            rev.employeeDepartments?.[0]?.department?.departmentName || null,
          designation:
            rev.employeeDesignations?.[0]?.designation?.designationName || null,
        });
      }
    });

    return res.status(200).json({
      status: 200,
      filledUsers,
      pendingUsers,
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadAppraisalFeedbackPDF = async (req, res, next) => {
  try {
    const { appraisalFeedbackReqID } = req.body;
    const appraisal = await AppraisalFeedbackReq.findOne({
      attributes: ['createdAt'],
      where: { appraisalFeedbackReqID },
    });

    if (!appraisal) {
      throw new Error('Appraisal record not found');
    }

    const filterDate = appraisal.createdAt;

    const filledFormData = await AppraisalFeedbackReq.findOne({
      attributes: [
        'filledByID',
        'employeeEmploymentID',
        'createdAt',
        'appraisalFeedbackReqID',
        'authoritySuggestion',
        'isTargetAchieved',
        'extendedReason',
      ],
      where: { appraisalFeedbackReqID },
      include: [
        {
          model: AppraisalFeedbackReqValue,
        },
        {
          model: UserMaster,
          as: 'reviewer',
          attributes: ['displayName'],
        },
        {
          as: 'eA',
          model: EmployeeEmployeement,
          attributes: [
            'userMasterID',
            'applicableDate',
            'endDate',
            'employeement',
          ],

          include: [
            {
              model: UserMaster,
              as: 'employee',
              attributes: ['userMasterID', 'displayName'],
              include: [
                {
                  separate: true,
                  required: false,
                  model: EmployeeJoiningDetails,
                  attributes: ['employeeCode', 'joiningDate'],
                },
                {
                  separate: true,
                  required: false,
                  model: EmployeeDesignation,
                  attributes: ['designationID'],
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(filterDate),
                    },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                      { endDate: { [Sequelize.Op.eq]: null } },
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
                  separate: true,
                  required: false,
                  model: EmployeeBranch,
                  attributes: ['branchID'],
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(filterDate),
                    },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  include: [
                    {
                      model: BranchMaster,
                      as: 'branchMaster',
                      attributes: ['branchName'],
                    },
                  ],
                },
                {
                  separate: true,
                  required: false,
                  model: EmployeeDepartment,
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(filterDate),
                    },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  attributes: ['departmentID'],
                  include: [
                    {
                      model: Department,
                      as: 'department',
                      attributes: ['departmentName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!filledFormData) {
      return res.status(404).json({ message: 'No data found' });
    }

    const employee = filledFormData?.eA?.employee;
    const probationApplicableDate =
      new Date(filledFormData?.eA?.applicableDate).toLocaleDateString(
        'en-IN',
      ) || '';
    const probationEndDate =
      new Date(filledFormData?.eA?.endDate).toLocaleDateString('en-IN') || '';
    const reviewerName = filledFormData?.reviewer?.displayName || '';
    const targetAchievement = filledFormData?.isTargetAchieved || '';
    const reasonToExtend = filledFormData?.extendedReason || '';
    const employeeInfo = {
      employeeName: employee?.displayName || '',
      employeeCode: employee?.employeeJoiningDetails?.[0].employeeCode || '',
      designation:
        employee.employeeDesignations?.[0]?.designation?.designationName || '',
      department:
        employee.employeeDepartments?.[0]?.department?.departmentName || '',
      branch: employee.employeeBranches?.[0]?.branchMaster?.branchName || '',
      reviewerName,
      createdAt: new Date(filledFormData.createdAt).toLocaleDateString('en-IN'),
      joiningDate:
        new Date(
          employee?.employeeJoiningDetails?.[0].joiningDate,
        ).toLocaleDateString('en-IN') || '',
    };
    let authoritySuggestionText = '';
    if (filledFormData?.authoritySuggestion === 'Confirm') {
      authoritySuggestionText = 'To Confirm';
    } else if (filledFormData?.authoritySuggestion === 'Extend') {
      authoritySuggestionText = 'To be Extended';
    } else {
      authoritySuggestionText = 'Do Not Confirm';
    }

    const appraisalFeedback = filledFormData.appraisalFeedbackReqValues.map(
      (item) => {
        const val = (item.value || '').toLowerCase();
        const needs = item.needsToImprove?.trim() || '';
        const tick = '✔️';
        const isNA = val === 'n/a' || val === 'na';

        return {
          parameter: item.parameter || '—',
          applicable: isNA ? 'N/A' : tick,
          fieldType: item.fieldType || '',
          needsToImprove: needs,
          average: val === 'average' ? tick : '',
          good: val === 'good' ? tick : '',
          excellent: val === 'excellent' ? tick : '',
        };
      },
    );

    const showReason =
      filledFormData?.authoritySuggestion === 'Extend' ||
      filledFormData?.authoritySuggestion === 'Do Not Confirm';

    const pdfData = {
      employeeInfo,
      probationApplicableDate,
      probationEndDate,
      targetAchievement,
      authoritySuggestionText,
      reasonToExtend,
      reviewerName: employeeInfo.reviewerName,
      appraisalFeedback,
      showReason,
    };

    const htmlFilePath = path.join(__dirname, '../html/appraisalFeedback.html');
    const htmlSource = fs.readFileSync(htmlFilePath, 'utf8');
    Handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });
    const template = Handlebars.compile(htmlSource);
    const htmlTemplate = template(pdfData);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    const pdfDir = path.join(__dirname, '../uploads/appraisal-feedback');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfPath = path.join(pdfDir, `appraisal_feedback_${Date.now()}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="appraisal_feedback.pdf"',
    );
    fs.createReadStream(pdfPath).pipe(res);
  } catch (error) {
    console.error('Error generating PDF:', error);
    next(error);
  }
};

async function confirmEmployee(
  userMasterID,
  endDate,
  createBy,
  createByIP,
  t,
  employeeEmploymentID,
) {
  await EmployeeEmployeement.create(
    {
      userMasterID,
      applicableDate: new Date(endDate),
      endDate: null,
      employeement: 'Confirm',
      createBy: createBy,
      createByIp: createByIP,
    },
    { transaction: t },
  );
  await AppraisalFeedbackReq.update(
    {
      isAuthCycleDone: true,
    },
    {
      where: {
        employeeEmploymentID: employeeEmploymentID,
      },
      transaction: t,
    },
  );
  createEmployeeJoiningDetailHistory(userMasterID, t);
  await EmployeeJoiningDetails.update(
    {
      endDate: null,
      applicableDate: endDate,
      employment: 'Confirm',
      updateBy: createBy,
      updateByIp: createByIP,
    },
    {
      where: {
        userMasterID: userMasterID,
      },
      transaction: t,
    },
  );
}

async function extendEmployee(
  userMasterID,
  employeeEmploymentID,
  confirmExtendDate,
  updateBy,
  updateByIP,
  t,
  getAllFeedbacks,
) {
  await EmployeeEmployeement.update(
    {
      isExtended: true,
      endDate: confirmExtendDate,
      updateBy: updateBy,
      updateByIp: updateByIP,
    },
    {
      where: {
        employeeEmployeementId: employeeEmploymentID,
      },
      transaction: t,
    },
  );
  await AppraisalFeedbackReq.update(
    {
      isAuthCycleDone: true,
    },
    {
      where: {
        employeeEmploymentID: employeeEmploymentID,
      },
      transaction: t,
    },
  );
  createEmployeeJoiningDetailHistory(
    getAllFeedbacks?.[0]?.employeeEmployeement?.userMasterID,
    t,
  );
  await EmployeeJoiningDetails.update(
    {
      endDate: confirmExtendDate,
      updateBy: updateBy,
      updateByIp: updateByIP,
    },
    {
      where: {
        userMasterID: userMasterID,
      },
      transaction: t,
    },
  );
}
