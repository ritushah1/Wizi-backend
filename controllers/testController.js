const Test = require('../models/test');

//get all data
exports.getData = async (req, res, next) => {
  try {
    let data = {
      test: 'test',
    };
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};
