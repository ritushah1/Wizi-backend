const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const { errorMessage } = require('../response_message/message');

exports.getsalarystructuredataBygradeId = async (req, res, next) => {
  try {
    let { gradeStructureID } = await req.body;

    if(!gradeStructureID) {
      return res.status(200).json({
        status:401,
        message:errorMessage.INVALID_REQUEST
      })
    }

    let finddata = await GradeSalaryStructure.findAll({
      where: {
        gradeStructureID: gradeStructureID,
        status: 1,
      },
      include: [
        { model: GradeStructure },
        { model: HRSalaryFields, include: [{ model: Payheadmaster }] },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: finddata,
    });
  } catch (err) {
    next(err);
  }
};
