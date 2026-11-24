const Customer = require('../models/customer');
const MeetingPurpose = require('../models/meetingPurpose');
const Product = require('../models/product');
const UserMaster = require('../models/userMaster');
const VisitMeetings = require('../models/visitMeetings');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment');
const { generateExcel } = require('../utils/exportData');
const { visitMeetingStatus } = require('../utils/commonVars');
const { stripHtml } = require('../utils/commonUtilFunctions');
const MeetingProduct = require('../models/meetingProducts');
const MeetingCopeople = require('../models/meetingCopeople');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const {
  addVisitMeetingData,
  updateVisitMeetingData,
  deleteVisitMeetingData,
  updateVisitMeetingStatusData,
  bulkAddUpdateVisitMeetingData,
} = require('./googleSheetIntegration.controller');

exports.addVisitMeetings = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const {
      agenda,
      coPersonID,
      customerID,
      meetingPurposeID,
      productID,
      meetingDate,
      meetingFromTime,
      meetingToTime,
      meetingType,
      userMasterID = null,
    } = await req.body;
    const companyMasterID = +req.userDetails.companyMasterId;
    const meeting = await VisitMeetings.create(
      {
        agenda,
        customerID,
        meetingPurposeID: meetingPurposeID,
        meetingStatus: visitMeetingStatus.SCHEDULED,
        meetingDate,
        fromTime: meetingFromTime,
        toTime: meetingToTime,
        userMasterID: userMasterID
          ? userMasterID
          : req.userDetails.userMasterId,
        meetingType: meetingType ? meetingType : 'Offline',
        createdBy: req.userDetails.userMasterId,
      },
      { user: req.userDetails, transaction: t },
    );

    if (productID && productID.length) {
      const productToInsert = productID.map((id) => {
        return {
          productID: id,
          visitMeetingID: meeting.visitMeetingID,
        };
      });
      await MeetingProduct.bulkCreate(productToInsert, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });
    }

    if (coPersonID && coPersonID.length) {
      const coPersonToInsert = coPersonID.map((id) => {
        return {
          userMasterID: id,
          visitMeetingID: meeting.visitMeetingID,
        };
      });
      await MeetingCopeople.bulkCreate(coPersonToInsert, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });
    }
    await t.commit();
    addVisitMeetingData(
      meeting.visitMeetingID,
      companyMasterID,
      req.userDetails,
    ).catch((err) => {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Meeting'),
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.listVisitMeetingss = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      fromDate,
      toDate,
      searchQuery,
      searchMeetingStatus,
      isDownload,
      companyMasterID,
      userMasterID,
      allMeetings = false,
    } = req.body;
    const condition = {};
    const userCondition = {};
    if (allMeetings) {
      if (!companyMasterID) {
        return res.status(200).json({
          status: 400,
          message: message.usermessage.notFoundMessage('Company'),
        });
      }
      userCondition.companyMasterId = companyMasterID;
    } else {
      condition.userMasterID = req.userDetails.userMasterId;
    }

    if (userMasterID) {
      userCondition.userMasterID = userMasterID;
    }
    condition.status = 1;

    if (fromDate && toDate) {
      condition.meetingDate = {
        [Sequelize.Op.between]: [fromDate, toDate],
      };
    }
    if (searchMeetingStatus) {
      condition.meetingStatus = searchMeetingStatus;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = Number(limit);
    }

    const rescheduledMeetingIds = await VisitMeetings.findAll({
      where: {
        previousMeetingID: {
          [Sequelize.Op.ne]: null,
        },
      },
      attributes: ['previousMeetingID'],
      raw: true,
    });

    const excludedMeetingIds = rescheduledMeetingIds.map(
      (e) => e.previousMeetingID,
    );

    const whereCondition = {
      ...condition,

      visitMeetingID: {
        [Sequelize.Op.notIn]:
          excludedMeetingIds.length > 0 ? excludedMeetingIds : [0],
      },
    };
    if (searchQuery) {
      whereCondition[Sequelize.Op.or] = [
        {
          agenda: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        Sequelize.where(Sequelize.col('customer.customerName'), {
          [Sequelize.Op.iLike]: `%${searchQuery}%`,
        }),
        Sequelize.where(Sequelize.col('meetingPurpose.meetingPurpose'), {
          [Sequelize.Op.iLike]: `%${searchQuery}%`,
        }),
      ];
    }

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // =========================
    // Main Query
    // =========================
    const { rows, count } = await VisitMeetings.findAndCountAll({
      where: whereCondition,
      distinct: true,
      ...paginationQuery,
      order: [['meetingDate', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: ['displayName'],
          where: {
            ...userCondition,
            ...userAccessCondition.where,
          },
          include: [...userAccessCondition.includeModels],
        },
        {
          required: true,
          model: MeetingPurpose,
          attributes: ['meetingPurpose'],
        },
        {
          required: true,
          model: Customer,
          attributes: ['customerName'],
        },
        {
          model: MeetingCopeople,
          attributes: ['userMasterID'],
          include: [
            {
              model: UserMaster,
              as: 'coPeople',
              attributes: ['displayName'],
            },
          ],
        },
        {
          model: MeetingProduct,
          attributes: ['productID'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['productName'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updateBy',
          attributes: ['displayName'],
        },
      ],
    });

    const getPreviousMeetings = async (previousMeetingID) => {
      const previousMeetings = [];

      let currentPreviousMeetingID = previousMeetingID;

      while (currentPreviousMeetingID) {
        const previousMeeting = await VisitMeetings.findOne({
          where: {
            visitMeetingID: currentPreviousMeetingID,
          },

          attributes: [
            'visitMeetingID',
            'meetingDate',
            'meetingStatus',
            'previousMeetingID',
            'agenda',
            'fromTime',
            'toTime',
            'meetingType',
          ],

          include: [
            {
              model: Customer,
              attributes: ['customerName'],
            },

            {
              model: MeetingPurpose,
              attributes: ['meetingPurpose'],
            },

            {
              model: UserMaster,
              as: 'user',
              attributes: ['displayName'],
            },

            {
              model: MeetingCopeople,
              attributes: ['userMasterID'],

              include: [
                {
                  model: UserMaster,
                  as: 'coPeople',
                  attributes: ['displayName'],
                },
              ],
            },

            {
              model: MeetingProduct,
              attributes: ['productID'],

              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['productName'],
                },
              ],
            },
          ],
        });

        if (!previousMeeting) {
          break;
        }

        previousMeetings.push(previousMeeting);

        currentPreviousMeetingID = previousMeeting.previousMeetingID;
      }

      return previousMeetings;
    };

    const updatedRows = await Promise.all(
      rows.map(async (meeting) => {
        const previousMeetings = await getPreviousMeetings(
          meeting.previousMeetingID,
        );

        return {
          ...meeting.toJSON(),
          previousMeetings,
        };
      }),
    );

    if (isDownload) {
      const finalExcelData = [];

      updatedRows.forEach((meeting) => {
        // =========================
        // Add Latest Meeting First
        // =========================

        finalExcelData.push({
          'Employee Name': meeting.user?.displayName || '',

          'Customer Name': meeting.customer?.customerName || '',

          'Product Name':
            meeting.meetingProducts
              ?.map((product) => product?.product?.productName)
              .join(',') || '',

          'Meeting Purpose': meeting.meetingPurpose?.meetingPurpose || '',

          'Meeting Date': meeting.meetingDate || '',

          'Meeting From Time': meeting.fromTime || '',

          'Meeting To Time': meeting.toTime || '',

          'Co Persons':
            meeting.meetingCopeople
              ?.map((coPeople) => coPeople?.coPeople?.displayName)
              .join(',') || '',

          'Assigned By': meeting.createBy?.displayName || '',

          'Meeting Status': meeting.meetingStatus || '',

          Agenda: stripHtml(meeting.agenda) || '',

          'Meeting Type': meeting.meetingType || '',

          'Created By': meeting.createBy?.displayName || '',

          'Created At':
            moment(meeting.createdAt).format('DD-MM-YYYY HH:mm') || '',

          'Updated By': meeting.updateBy?.displayName || '',

          'Updated At': meeting.updateBy
            ? moment(meeting.updatedAt).format('DD-MM-YYYY HH:mm')
            : '',
        });

        // =========================
        // Previous Meetings
        // 2 -> 1
        // =========================

        const previousMeetings = meeting.previousMeetings || [];

        previousMeetings.forEach((prevMeeting) => {
          finalExcelData.push({
            'Employee Name': prevMeeting.user?.displayName || '',

            'Customer Name': prevMeeting.customer?.customerName || '',

            'Product Name':
              prevMeeting.meetingProducts
                ?.map((product) => product?.product?.productName)
                .join(',') || '',

            'Meeting Purpose': prevMeeting.meetingPurpose?.meetingPurpose || '',

            'Meeting Date': prevMeeting.meetingDate || '',

            'Meeting From Time': prevMeeting.fromTime || '',

            'Meeting To Time': prevMeeting.toTime || '',

            'Co Persons':
              prevMeeting.meetingCopeople
                ?.map((coPeople) => coPeople?.coPeople?.displayName)
                .join(',') || '',

            'Assigned By': prevMeeting.createBy?.displayName || '',

            'Meeting Status': prevMeeting.meetingStatus || '',

            Agenda: stripHtml(prevMeeting.agenda) || '',

            'Meeting Type': prevMeeting.meetingType || '',

            'Created By': prevMeeting.createBy?.displayName || '',

            'Created At':
              moment(prevMeeting.createdAt).format('DD-MM-YYYY HH:mm') || '',

            'Updated By': prevMeeting.updateBy?.displayName || '',

            'Updated At': prevMeeting.updateBy
              ? moment(prevMeeting.updatedAt).format('DD-MM-YYYY HH:mm')
              : '',
          });
        });

        // =========================
        // Separator Row
        // =========================

        finalExcelData.push({
          isSeparator: true,
        });
      });

      return await generateExcel(
        finalExcelData,
        'Meeting Purpose',
        'xlsx',
        res,
      );
    }

    // =========================
    // Final Response
    // =========================

    return res.status(200).json({
      status: 200,
      data: updatedRows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getVisitMeetingsByID = async (req, res, next) => {
  try {
    const { visitMeetingID } = await req.body;
    const getVisitMeetingByID = await VisitMeetings.findOne({
      where: {
        visitMeetingID: visitMeetingID,
      },
      include: [
        {
          model: UserMaster,
          as: 'user',
          attributes: ['displayName'],
        },
        {
          model: MeetingCopeople,
          attributes: ['userMasterID'],
        },
        {
          model: MeetingProduct,
          attributes: ['productID'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getVisitMeetingByID,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateVisitMeetings = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const {
      agenda,
      coPersonID = [],
      customerID,
      meetingFromTime,
      meetingToTime,
      meetingPurposeID,
      meetingStatus,
      productID = [],
      meetingDate,
      visitMeetingID,
      meetingType,
      remark,
      userMasterID = null,
    } = req.body;

    const companyMasterId = +req.userDetails.companyMasterId;

    const oldData = await VisitMeetings.findOne({
      where: { visitMeetingID: visitMeetingID },
    });
    const oldDate = oldData.meetingDate;
    // Update main table
    await VisitMeetings.update(
      {
        agenda,
        customerID,
        fromTime: meetingFromTime,
        toTime: meetingToTime,
        meetingPurposeID,
        meetingStatus,
        meetingDate,
        updatedBy: req.userDetails.userMasterId,
        meetingType,
        remark,
        userMasterID: userMasterID
          ? userMasterID
          : req.userDetails.userMasterId,
      },
      { where: { visitMeetingID }, transaction: t },
    );

    // ================= PRODUCT LOGIC =================

    if (productID) {
      const existingProducts = await MeetingProduct.findAll({
        where: { visitMeetingID },
        attributes: ['productID'],
        transaction: t,
      });

      const existingProductIDs = existingProducts.map((p) => p.productID);

      // Find products to delete
      const productsToDelete = existingProductIDs.filter(
        (id) => !productID.includes(id),
      );

      // Find products to add
      const productsToAdd = productID.filter(
        (id) => !existingProductIDs.includes(id),
      );

      // Delete removed products
      if (productsToDelete.length) {
        await MeetingProduct.destroy({
          where: {
            visitMeetingID,
            productID: productsToDelete,
          },
          transaction: t,
        });
      }

      // Add new products
      if (productsToAdd.length) {
        const productToInsert = productsToAdd.map((id) => ({
          productID: id,
          visitMeetingID,
        }));

        await MeetingProduct.bulkCreate(productToInsert, {
          transaction: t,
        });
      }
    }

    // ================= CO-PERSON LOGIC =================

    if (coPersonID) {
      const existingCoPersons = await MeetingCopeople.findAll({
        where: { visitMeetingID },
        attributes: ['userMasterID'],
        transaction: t,
      });

      const existingCoPersonIDs = existingCoPersons.map((c) => c.userMasterID);

      // Find coPersons to delete
      const coPersonsToDelete = existingCoPersonIDs.filter(
        (id) => !coPersonID.includes(id),
      );

      // Find coPersons to add
      const coPersonsToAdd = coPersonID.filter(
        (id) => !existingCoPersonIDs.includes(id),
      );

      // Delete removed coPersons
      if (coPersonsToDelete.length) {
        await MeetingCopeople.destroy({
          where: {
            visitMeetingID,
            userMasterID: coPersonsToDelete,
          },
          transaction: t,
        });
      }

      // Add new coPersons
      if (coPersonsToAdd.length) {
        const coPersonToInsert = coPersonsToAdd.map((id) => ({
          userMasterID: id,
          visitMeetingID,
        }));

        await MeetingCopeople.bulkCreate(coPersonToInsert, {
          transaction: t,
        });
      }
    }

    await t.commit();
    updateVisitMeetingData(
      visitMeetingID,
      companyMasterId,
      oldDate,
      req.userDetails,
    ).catch((err) => {});

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit Meeting'),
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateVisitMeetingsStatus = async (req, res, next) => {
  try {
    const { visitMeetingID, status, remark } = await req.body;

    if (!visitMeetingID) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Visit Meeting'),
      });
    }
    const companyMasterID = req.userDetails.companyMasterId;

    const find_SameData = await VisitMeetings.findOne({
      where: {
        visitMeetingID,
      },
    });

    if (!find_SameData) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Visit Meeting'),
      });
    }

    await VisitMeetings.update(
      {
        status,
        updatedBy: req.userDetails.userMasterId,
        remark,
      },
      { where: { visitMeetingID: visitMeetingID } },
    );

    updateVisitMeetingStatusData(
      visitMeetingID,
      companyMasterID,
      req.userDetails,
    ).catch((err) => {});

    return res.status(200).json({
      status: 200,
      message:
        status == 1
          ? message.usermessage.activeMessage('Visit Meeting')
          : message.usermessage.deactiveMessage('Visit Meeting'),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteVisitMeetings = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { visitMeetingID } = req.body;

    if (!visitMeetingID) {
      await t.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Visit Meeting'),
      });
    }

    const meeting = await VisitMeetings.findOne({
      where: { visitMeetingID },
      transaction: t,
    });

    if (!meeting) {
      await t.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Visit Meeting'),
      });
    }

    // Delete child records first

    await MeetingProduct.destroy({
      where: { visitMeetingID },
      transaction: t,
    });

    await MeetingCopeople.destroy({
      where: { visitMeetingID },
      transaction: t,
    });

    // Delete main record

    await VisitMeetings.destroy({
      where: { visitMeetingID },
      transaction: t,
      individualHooks: true,
      user: req.userDetails,
    });

    await t.commit();

    deleteVisitMeetingData(
      req.userDetails.companyMasterId,
      visitMeetingID,
      meeting.meetingDate,
    ).catch((err) => {});

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Visit Meeting'),
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.bulkMeetingAddUpdate = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const bulkData = req.body;

    // ─── Validation ───────────────────────────────────────────────
    if (!Array.isArray(bulkData)) {
      await t.rollback();
      return res.status(400).send({
        status: 400,
        message: 'Only array of meeting objects is allowed.',
      });
    }

    if (!bulkData.length) {
      await t.rollback();
      return res.status(404).send({
        status: 404,
        message: 'No meeting data found.',
      });
    }

    // ─── Step 1: Validate existing visitMeetingIDs for plain updates ──
    const updateIds = bulkData
      .filter((m) => m.visitMeetingID && !m.previousMeetings?.length)
      .map((m) => m.visitMeetingID);

    const existingMeetings = updateIds.length
      ? await VisitMeetings.findAll({
          where: { visitMeetingID: updateIds },
          attributes: ['visitMeetingID'],
          transaction: t,
        })
      : [];

    const validUpdateSet = new Set(
      existingMeetings.map((m) => m.visitMeetingID),
    );

    // ─── Step 2: Separate into buckets ────────────────────────────
    const meetingsToCreate = []; // no visitMeetingID, no previousMeetings
    const meetingsToUpdate = []; // has visitMeetingID, no previousMeetings
    const rescheduleRoots = []; // has previousMeetings array

    for (const m of bulkData) {
      if (Array.isArray(m.previousMeetings) && m.previousMeetings.length) {
        rescheduleRoots.push(m);
      } else if (m.visitMeetingID) {
        if (validUpdateSet.has(m.visitMeetingID)) {
          meetingsToUpdate.push(m);
        }
        // unknown ID → skip
      } else {
        meetingsToCreate.push(m);
      }
    }

    // ─── Step 3: Bulk UPDATE existing meetings ────────────────────
    if (meetingsToUpdate.length) {
      await VisitMeetings.bulkCreate(
        meetingsToUpdate.map((m) => ({
          visitMeetingID: m.visitMeetingID,
          agenda: m.agenda,
          customerID: m.customerID,
          fromTime: m.meetingFromTime,
          toTime: m.meetingToTime,
          meetingPurposeID: m.meetingPurposeID,
          meetingDate: m.meetingDate,
          updatedBy: m.updatedBy,
          updatedAt: m.updatedAt,
          meetingStatus: m.meetingStatus,
          remark: m.remark,
          userMasterID: m.userMasterID,
          meetingType: m.meetingType,
        })),
        {
          updateOnDuplicate: [
            'agenda',
            'customerID',
            'fromTime',
            'toTime',
            'meetingPurposeID',
            'meetingDate',
            'updatedBy',
            'updatedAt',
            'meetingStatus',
            'remark',
            'userMasterID',
            'meetingType',
          ],
          transaction: t,
        },
      );
    }

    // ─── Step 4: Bulk CREATE new meetings ─────────────────────────
    let createdMeetings = [];

    if (meetingsToCreate.length) {
      createdMeetings = await VisitMeetings.bulkCreate(
        meetingsToCreate.map((m) => ({
          agenda: m.agenda,
          customerID: m.customerID,
          meetingPurposeID: m.meetingPurposeID,
          meetingStatus: m.meetingStatus || visitMeetingStatus.SCHEDULED,
          meetingDate: m.meetingDate,
          fromTime: m.meetingFromTime,
          toTime: m.meetingToTime,
          userMasterID: m.userMasterID,
          meetingType: m.meetingType || 'Offline',
          createdAt: m.createdAt,
          createdBy: m.createdBy,
        })),
        { returning: true, transaction: t, user: req.userDetails },
      );
    }

    // ─── Step 5: Process reschedule chains ────────────────────────

    //
    // Products & copeople for each node come from that node's
    // meetingProducts / meetingCopeople arrays in the payload.

    // Collect all product/coperson inserts for rescheduled chain meetings
    const rescheduleProductInserts = [];
    const rescheduleCoPersonInserts = [];

    for (const root of rescheduleRoots) {
      // Oldest entry last in array → reverse to process oldest first
      const chain = root.previousMeetings;

      let lastRealID = null; // will hold the real DB ID as we walk the chain

      for (const node of chain) {
        if (node.visitMeetingID) {
          // ── Already exists in DB: just mark RESCHEDULED ──────────
          await VisitMeetings.update(
            { meetingStatus: visitMeetingStatus.RESCHEDULED },
            { where: { visitMeetingID: node.visitMeetingID }, transaction: t },
          );
          lastRealID = node.visitMeetingID;
        } else {
          // ── Never synced: CREATE as RESCHEDULED ──────────────────
          const created = await VisitMeetings.create(
            {
              agenda: node.agenda,
              customerID: node.customerID,
              meetingPurposeID: node.meetingPurposeID,
              meetingStatus: visitMeetingStatus.RESCHEDULED,
              meetingDate: node.meetingDate,
              fromTime: node.fromTime,
              toTime: node.toTime,
              userMasterID: root.userMasterID,
              meetingType: node.meetingType,
              createdBy: root.createdBy,
              previousMeetingID: lastRealID, // link to previous node
            },
            { transaction: t, user: req.userDetails },
          );

          const newID = created.visitMeetingID;

          // Copy products from payload for this node
          if (node.meetingProducts?.length) {
            rescheduleProductInserts.push(
              ...node.meetingProducts.map((p) => ({
                visitMeetingID: newID,
                productID: p.productID,
              })),
            );
          }

          // Copy copeople from payload for this node
          if (node.meetingCopeople?.length) {
            rescheduleCoPersonInserts.push(
              ...node.meetingCopeople.map((c) => ({
                visitMeetingID: newID,
                userMasterID: c.userMasterID,
              })),
            );
          }

          lastRealID = newID;
        }
      }

      // ── Finally create the active (Scheduled) root meeting ───────
      const activeMeeting = await VisitMeetings.create(
        {
          agenda: root.agenda,
          customerID: root.customerID,
          meetingPurposeID: root.meetingPurposeID,
          meetingStatus: root.meetingStatus
            ? root.meetingStatus
            : visitMeetingStatus.SCHEDULED,
          meetingDate: root.meetingDate,
          fromTime: root.meetingFromTime,
          toTime: root.meetingToTime,
          userMasterID: root.userMasterID,
          meetingType: root.meetingType,
          createdBy: root.createdBy,
          createdAt: root.createdAt,
          previousMeetingID: lastRealID, // link to last node in chain
        },
        { transaction: t, user: req.userDetails },
      );

      const activeID = activeMeeting.visitMeetingID;
      root.visitMeetingID = activeID; // Attach for GC sync

      // Products & copeople for the active root meeting
      if (root.productID?.length) {
        rescheduleProductInserts.push(
          ...root.productID.map((id) => ({
            visitMeetingID: activeID,
            productID: id,
          })),
        );
      }

      if (root.coPersonID?.length) {
        rescheduleCoPersonInserts.push(
          ...root.coPersonID.map((id) => ({
            visitMeetingID: activeID,
            userMasterID: id,
          })),
        );
      }
    }

    // ─── Step 6: Products & copeople for plain create/update ──────
    const allPlainMeetings = [...meetingsToUpdate, ...createdMeetings];
    const allPlainIDs = allPlainMeetings.map(
      (m) => m.visitMeetingID ?? m.dataValues.visitMeetingID,
    );

    const productsToInsert = [...rescheduleProductInserts];
    const productsToDelete = [];
    const coPersonsToInsert = [...rescheduleCoPersonInserts];
    const coPersonsToDelete = [];

    if (allPlainIDs.length) {
      const [existingProducts, existingCoPersons] = await Promise.all([
        MeetingProduct.findAll({
          where: { visitMeetingID: allPlainIDs },
          transaction: t,
        }),
        MeetingCopeople.findAll({
          where: { visitMeetingID: allPlainIDs },
          transaction: t,
        }),
      ]);

      const productMap = new Map();
      const coPersonMap = new Map();

      existingProducts.forEach((p) => {
        if (!productMap.has(p.visitMeetingID))
          productMap.set(p.visitMeetingID, []);
        productMap.get(p.visitMeetingID).push(p.productID);
      });

      existingCoPersons.forEach((c) => {
        if (!coPersonMap.has(c.visitMeetingID))
          coPersonMap.set(c.visitMeetingID, []);
        coPersonMap.get(c.visitMeetingID).push(c.userMasterID);
      });

      for (const m of bulkData) {
        const meetingId = m.visitMeetingID;
        if (!meetingId || m.previousMeetings?.length) continue;

        const existingProd = productMap.get(meetingId) || [];
        const newProd = m.productID || [];

        productsToInsert.push(
          ...newProd
            .filter((id) => !existingProd.includes(id))
            .map((id) => ({ visitMeetingID: meetingId, productID: id })),
        );
        productsToDelete.push(
          ...existingProd
            .filter((id) => !newProd.includes(id))
            .map((id) => ({ visitMeetingID: meetingId, productID: id })),
        );

        const existingCo = coPersonMap.get(meetingId) || [];
        const newCo = m.coPersonID || [];

        coPersonsToInsert.push(
          ...newCo
            .filter((id) => !existingCo.includes(id))
            .map((id) => ({ visitMeetingID: meetingId, userMasterID: id })),
        );
        coPersonsToDelete.push(
          ...existingCo
            .filter((id) => !newCo.includes(id))
            .map((id) => ({ visitMeetingID: meetingId, userMasterID: id })),
        );
      }

      // Also insert products/copeople for brand-new plain meetings
      for (const m of createdMeetings) {
        const meetingId = m.visitMeetingID ?? m.dataValues.visitMeetingID;
        const source = meetingsToCreate[createdMeetings.indexOf(m)];

        if (source.productID?.length) {
          productsToInsert.push(
            ...source.productID.map((id) => ({
              visitMeetingID: meetingId,
              productID: id,
            })),
          );
        }
        if (source.coPersonID?.length) {
          coPersonsToInsert.push(
            ...source.coPersonID.map((id) => ({
              visitMeetingID: meetingId,
              userMasterID: id,
            })),
          );
        }
      }
    }

    // ─── Step 7: Flush all DB writes ──────────────────────────────
    if (productsToDelete.length) {
      await MeetingProduct.destroy({
        where: {
          [Sequelize.Op.or]: productsToDelete,
        },
        transaction: t,
        user: req.userDetails,
      });
    }
    if (productsToInsert.length) {
      await MeetingProduct.bulkCreate(productsToInsert, {
        transaction: t,
        user: req.userDetails,
      });
    }
    if (coPersonsToDelete.length) {
      await MeetingCopeople.destroy({
        where: {
          [Sequelize.Op.or]: coPersonsToDelete,
        },
        transaction: t,
        user: req.userDetails,
      });
    }
    if (coPersonsToInsert.length) {
      await MeetingCopeople.bulkCreate(coPersonsToInsert, {
        transaction: t,
        user: req.userDetails,
      });
    }

    await t.commit();
    const allProcessedIds = [
      ...allPlainIDs,
      ...rescheduleRoots.map((r) => r.visitMeetingID).filter((id) => id),
    ];
    // Filter out potential duplicates or nulls and process unique IDs
    const uniqueIds = [...new Set(allProcessedIds)].filter((id) => id);
    if (uniqueIds.length > 0) {
      bulkAddUpdateVisitMeetingData(
        uniqueIds,
        req.userDetails.companyMasterId,
        bulkData,
      ).catch((err) => {});
    }

    return res.status(200).send({
      status: 200,
      message: 'Meetings synced successfully.',
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.rescheduleVisitMeeting = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      meetingDate,
      meetingFromTime,
      meetingToTime,
      remark,
      previousMeetingID,
    } = await req.body;

    const companyMasterID = req.userDetails.companyMasterId;

    const findData = await VisitMeetings.findOne({
      where: {
        visitMeetingID: previousMeetingID,
      },
      include: [
        {
          model: MeetingCopeople,
          attributes: ['userMasterID'],
        },
        {
          model: MeetingProduct,
          attributes: ['productID'],
        },
      ],
    });

    if (!findData) {
      await t.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Visit Meeting'),
      });
    }

    await VisitMeetings.update(
      {
        meetingStatus: visitMeetingStatus.RESCHEDULED,
      },
      {
        where: {
          visitMeetingID: previousMeetingID,
        },
        transaction: t,
      },
    );

    const meeting = await VisitMeetings.create(
      {
        agenda: findData.agenda,
        customerID: findData.customerID,
        meetingPurposeID: findData.meetingPurposeID,
        meetingStatus: visitMeetingStatus.SCHEDULED,
        meetingDate,
        fromTime: meetingFromTime,
        toTime: meetingToTime,
        userMasterID: findData.userMasterID,
        meetingType: findData.meetingType,
        createdBy: req.userDetails.userMasterId,
        previousMeetingID,
      },
      { user: req.userDetails, transaction: t },
    );

    if (findData.meetingProducts && findData.meetingProducts.length) {
      const productToInsert = findData.meetingProducts.map((prod) => {
        return {
          productID: prod.productID,
          visitMeetingID: meeting.visitMeetingID,
        };
      });
      await MeetingProduct.bulkCreate(productToInsert, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });
    }

    if (findData.meetingCopeople && findData.meetingCopeople.length) {
      const coPersonToInsert = findData.meetingCopeople.map((coPerson) => {
        return {
          userMasterID: coPerson.userMasterID,
          visitMeetingID: meeting.visitMeetingID,
        };
      });
      await MeetingCopeople.bulkCreate(coPersonToInsert, {
        user: req.userDetails,
        individualHooks: true,
        transaction: t,
      });
    }
    await t.commit();
    updateVisitMeetingStatusData(
      meeting.visitMeetingID,
      companyMasterID,
      req.userDetails,
    ).catch((err) => {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit Meeting'),
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
