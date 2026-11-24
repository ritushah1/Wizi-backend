const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const logger = require('../config/logger');
const Form16 = require('../models/form16');
const Form16child = require('../models/form16child');
const message = require('../response_message/message');

exports.postSaveForm16 = async (req, res, next) => {
  try {
    let { SalaryDetails, Series, ParentForm16ID, form16child } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      let db_insert = await Form16.create(
        {
          SalaryDetails,
          Series,
          ParentForm16ID,
          createBy,
          createByIp,
        },
        { transaction: t }
      );
      let Form16ID = db_insert.Form16ID;
      if (Object.keys(form16child).length != 0) {
        let child_insert = await Form16child.create(
          {
            Form16ID,
            GrossAmount: form16child.GrossAmount,
            QualifyingAmount: form16child.QualifyingAmount,
            StartDate: form16child.StartDate,
            EndDate: form16child.EndDate,
            createBy,
            createByIp,
          },
          { transaction: t }
        );

        res.status(200).json({
          status: 200,
          message: message.usermessage.form16dataandchildsave,
          data: db_insert,
          childData: child_insert,
        });
        return child_insert;
      }
      res.status(200).json({
        status: 200,
        message: message.usermessage.form16datasave,
        data: db_insert,
      });
      return db_insert;
    });
  } catch (err) {
    next(err);
  }
};

exports.postReturnAllForm16 = async (req, res, next) => {
  try {
    let { limit, page } = await req.body;
    let offset = (page - 1) * limit;
    let form16data;
    if (limit == '' && page == '') {
      form16data = await Form16.findAll({
        where: { status: 1, ParentForm16ID: 0 },
        order: [['Form16ID', 'ASC']],
      });
    } else {
      form16data = await Form16.findAll({
        limit: limit,
        offset: offset,
        where: { status: [0, 1] },
        order: [['Form16ID', 'ASC']],
      });
    }
    const total_count = await Form16.count({
      where: { status: ['0', '1'] },
      raw: true,
    });

    res.status(200).json({ status: 200, data: form16data, count: total_count });
  } catch (err) {
    next(err);
  }
};

exports.postReturnAllForm16ChildData = async (req, res, next) => {
  try {
    let { limit, page } = await req.body;
    let offset = (page - 1) * limit;
    let form16data;
    if (limit == '' && page == '') {
      form16data = await Form16.findAll({
        where: { status: 1, ParentForm16ID: { [Sequelize.Op.ne]: 0 } },
        order: [['Form16ID', 'ASC']],
      });
    } else {
      form16data = await Form16.findAll({
        limit: limit,
        offset: offset,
        where: { status: 1, ParentForm16ID: { $ne: 0 } },
        order: [['Form16ID', 'ASC']],
      });
    }
    const total_count = await Form16.count({
      where: { status: ['0', '1'] },
      raw: true,
    });

    res.status(200).json({ status: 200, data: form16data, count: total_count });
  } catch (err) {
    next(err);
  }
};

exports.postReturnAllForm16andChild = async (req, res, next) => {
  try {
    let { limit, page } = await req.body;
    let offset = (page - 1) * limit;
    let results;
    if (limit == '' && page == '') {
      results = await sequelize.query(
        'SELECT * FROM public.ms_view_getform16',
        { type: Sequelize.SELECT }
      );
    } else {
      results = await sequelize.query(
        'SELECT * FROM public.ms_view_getform16 limit $1 offset $2',
        { bind: [limit, offset] },
        { type: Sequelize.SELECT }
      );
    }
    //let srlno
    for (i = 0; i < results[0].length; i++) {
      results[0][i].srlNo = i + 1;
    }
    let total_count = await Form16.count({
      where: { status: ['0', '1'] },
    });

    res.status(200).json({ status: 200, data: results[0], count: total_count });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteForm16 = async (req, res, next) => {
  try {
    let { Form16ID } = await req.body;
    let result = await sequelize.transaction(async (t) => {
      let delete_status = await Form16.update(
        {
          status: 2,
        },
        {
          where: { Form16ID: Form16ID },
          transaction: t,
        }
      );

      let delete_child = await Form16child.update(
        {
          status: 2,
        },
        {
          where: { Form16ID: Form16ID },
          transaction: t,
        }
      );

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.form16datadeleted });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateform16andchild = async (req, res, next) => {
  try {
    let { Form16ID, SalaryDetails, Series, ParentForm16ID, form16child } =
      await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      let change_data_status = await Form16.update(
        {
          SalaryDetails,
          Series,
          ParentForm16ID,
          updateBy,
          updateByIp,
        },
        {
          where: { Form16ID: Form16ID },
          transaction: t,
        }
      );
      if (Object.keys(form16child).length != 0) {
        let change_child_status = await Form16child.update(
          {
            GrossAmount: form16child.GrossAmount,
            QualifyingAmount: form16child.QualifyingAmount,
            StartDate: form16child.StartDate,
            EndDate: form16child.EndDate,
            updateBy,
            updateByIp,
          },
          {
            where: { Form16ID: Form16ID },
            transaction: t,
          }
        );

        res.status(200).json({
          status: 200,
          message: message.usermessage.form16childdataupdate,
        });
      } else {
        res
          .status(200)
          .json({ status: 200, message: message.usermessage.form16dataupdate });
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.postStatusChange = async (req, res, next) => {
  try {
    let { Form16ID, status } = await req.body;
    let delete_status;
    await sequelize.transaction(async (t) => {
      if (status == 1) {
        delete_status = await Form16.update(
          {
            status: 0,
          },
          {
            where: {
              Form16ID: Form16ID,
              status: {
                [Sequelize.Op.in]: [0, 1],
              },
            },
            transaction: t,
          }
        );
      } else {
        delete_status = await Form16.update(
          {
            status: 1,
          },
          {
            where: {
              Form16ID: Form16ID,
            },
            transaction: t,
          }
        );
      }
      if (delete_status != 0) {
        res.status(200).json({
          status: 200,
          message: message.usermessage.form16datadeleted,
          data: {},
        });
      } else {
        res.status(200).json({
          status: 400,
          message: message.usermessage.form16datanotfound,
          data: {},
        });
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getForm16byForm16ID = async (req, res, next) => {
  try {
    let get_one_data = await Form16.findOne({
      where: {
        Form16ID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });
    let child_data = await Form16child.findOne({
      where: {
        Form16ID: req.params.id,
      },
    });
    get_one_data.dataValues.childdata = child_data;

    if (!get_one_data) {
      res.status(200).json({
        status: 200,
        message: message.usermessage.form16datanotfound,
      });
    }
    res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};
