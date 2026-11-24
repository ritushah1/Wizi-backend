const Sequelize = require('sequelize');
const Visit = require('../models/visit');
const VisitProduct = require('../models/visitProduct');

exports.upDateVisitProductData = async (req, res, next) => {
  try {
    const CHUNK_SIZE = 1000;
    let lastVisitID = 0;
    let totalInserted = 0;

    while (true) {
      // Get visits in chunks using visitID cursor pagination
      const visits = await Visit.findAll({
        where: {
          visitID: {
            [Sequelize.Op.gt]: lastVisitID,
          },
          productID: {
            [Sequelize.Op.ne]: null,
          },
        },
        attributes: [
          'visitID',
          'productID',
          'createBy',
          'createByIp',
          'updateBy',
          'updateByIp',
          'createdAt',
          'updatedAt',
        ],
        order: [['visitID', 'ASC']],
        limit: CHUNK_SIZE,
        raw: true,
      });

      // No more records
      if (!visits.length) {
        break;
      }
      const visitProductData = visits.map((visit) => {
        console.log('Processing Visit ID:', visit.visitID);

        return {
          visitID: visit.visitID,
          productID: visit.productID,

          createBy: visit.createBy,
          createByIp: visit.createByIp,

          updateBy: visit.updateBy,
          updateByIp: visit.updateByIp,

          // Keep same timestamps as Visit
          createdAt: visit.createdAt,
          updatedAt: visit.updatedAt,
        };
      });
      if (visitProductData.length > 0) {
        await VisitProduct.bulkCreate(visitProductData, {
          hooks: false,
        });

        totalInserted += visitProductData.length;
      }

      // Move to next chunk
      lastVisitID = visits[visits.length - 1].visitID;

      console.log(
        `Processed up to visitID: ${lastVisitID}, records: ${visitProductData.length}`,
      );
    }

    return res.status(200).json({
      message: 'Visit product data updated successfully.',
      totalProcessed: totalInserted,
    });
  } catch (err) {
    next(err);
  }
};
