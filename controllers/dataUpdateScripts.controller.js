const Sequelize = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const Visit = require('../models/visit');
const VisitProduct = require('../models/visitProduct');
const PurposeOfVisit = require('../models/purposeOfVisit');

exports.updateVisitProductAndPurposeOfVisit = async (req, res, next) => {
  try {
    const { userMasterID, CHUNK_SIZE = 1000 } = req.body;

    const visitCondition = {};

    if (userMasterID) {
      visitCondition.assignID = userMasterID;
    }

    let lastVisitID = 0;
    let totalVisits = 0;
    let visitProductInserted = 0;
    let purposeOfVisitInserted = 0;

    while (true) {
      const whereCondition = {
        ...visitCondition,
        visitID: {
          [Sequelize.Op.gt]: lastVisitID,
        },
      };

      // -----------------------------------------
      // Fetch next chunk
      // -----------------------------------------
      const findVisit = await Visit.findAll({
        where: whereCondition,
        include: [
          {
            model: VisitProduct,
            as: 'vp',
          },
          {
            model: PurposeOfVisit,
            as: 'pov',
          },
        ],
        order: [['visitID', 'ASC']],
        limit: Number(CHUNK_SIZE),
      });

      if (!findVisit.length) {
        break;
      }

      totalVisits += findVisit.length;

      const visitProductObj = [];
      const purposeOfVisitObj = [];

      for (const visit of findVisit) {
        if(!visit.productID && !visit.visitPurposeID) continue;
        console.log(
          `[Visit Migration] Processing | ` +
            `VisitID: ${visit.visitID} | ` +
            `ProductID: ${visit.productID} | ` +
            `VisitPurposeID: ${visit.visitPurposeID}`,
        );
        // -----------------------------------------
        // VisitProduct
        // Only insert if productID exists
        // and VisitProduct record doesn't exist
        // -----------------------------------------
        if (visit.productID && !visit.vp?.length) {
          visitProductObj.push({
            visitID: visit.visitID,
            productID: visit.productID,
            createBy: visit.createBy,
            createByIp: visit.createByIp,
          });
        }

        // -----------------------------------------
        // PurposeOfVisit
        // Only insert if visitPurposeID exists
        // and PurposeOfVisit record doesn't exist
        // -----------------------------------------
        if (visit.visitPurposeID && !visit.pov?.length) {
          purposeOfVisitObj.push({
            visitID: visit.visitID,
            visitPurposeID: visit.visitPurposeID,
            createBy: visit.createBy,
            createByIp: visit.createByIp,
          });
        }
      }

      console.log(
        `[Visit Migration] Processing | ` +
          `LastVisitID: ${lastVisitID} | ` +
          `Fetched: ${findVisit.length} | ` +
          `Total: ${totalVisits} | ` +
          `VisitProduct: ${visitProductObj.length} | ` +
          `PurposeOfVisit: ${purposeOfVisitObj.length}`,
      );

      // -----------------------------------------
      // Insert VisitProduct
      // -----------------------------------------
      if (visitProductObj.length) {
        await VisitProduct.bulkCreate(visitProductObj, {
          hooks: false,
        });

        visitProductInserted += visitProductObj.length;

        console.log(
          `[Visit Migration] VisitProduct inserted: ${visitProductInserted}`,
        );
      }

      // -----------------------------------------
      // Insert PurposeOfVisit
      // -----------------------------------------
      if (purposeOfVisitObj.length) {
        await PurposeOfVisit.bulkCreate(purposeOfVisitObj, {
          hooks: false,
        });

        purposeOfVisitInserted += purposeOfVisitObj.length;

        console.log(
          `[Visit Migration] PurposeOfVisit inserted: ${purposeOfVisitInserted}`,
        );
      }

      // -----------------------------------------
      // Move to next chunk
      // -----------------------------------------
      lastVisitID = findVisit[findVisit.length - 1].visitID;

      // -----------------------------------------
      // Prevent unnecessary next query
      // -----------------------------------------
      if (findVisit.length < Number(CHUNK_SIZE)) {
        break;
      }
    }

    console.log(
      `[Visit Migration] Completed | ` +
        `Total Visits: ${totalVisits} | ` +
        `VisitProduct: ${visitProductInserted} | ` +
        `PurposeOfVisit: ${purposeOfVisitInserted}`,
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Pre-Boarding Request'),
      data: {
        totalVisits,
        visitProducts: {
          inserted: visitProductInserted,
        },
        purposeOfVisits: {
          inserted: purposeOfVisitInserted,
        },
      },
    });
  } catch (err) {
    console.error('[Visit Migration] Failed:', err);
    next(err);
  }
};
