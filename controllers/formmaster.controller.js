const Sequelize = require('sequelize');
const FormMaster = require('../models/formMaster');
const ProductPermission = require('../models/productPermission');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const OperationMaster = require('../models/operation');
const subscriptionPlan = require('../models/subscriptionPlan');
const companyMaster = require('../models/companyMaster');

/**
 * save form data.
 *
 * @body {createBy} createBy user id of user who added the form.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddForm = async (req, res, next) => {
  try {
    let = {
      formName,
      description,
      parentFormMasterID,
      operation,
      defaultRight,
      icon,
      path,
      menuName,
    } = await req.body;

    const existingFormType = await FormMaster.findOne({
      where: {
        formName,
        status: ['0', '1'],
      },
    });

    if (existingFormType) {
      return res.status(200).json({
        status: 401,
        message: 'Form already exists.',
      });
    }

    let insert_db_status = await FormMaster.create({
      formName,
      description,
      operation,
      parentFormMasterID,
      defaultRight,
      createBy: req.userDetails.userMasterId,
      createByIp: req.userDetails.userIpAddress,
      icon,
      path,
      menuName,
    });
    res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Form'),
      data: insert_db_status,
    });
  } catch (err) {
    next(err);
  }
};

/**
 return all form data
 */

exports.getAllFormData = async (req, res, next) => {
  try {
    let { limit, page, searchQuery } = await req.body;
    let offset = (page - 1) * limit;
    let form_master = [];
    let totalcount;
    if (limit == '' && page == '') {
      form_master = await FormMaster.findAll({
        raw: true,
        order: [['formMasterID', 'ASC']],
        where: {
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
      });
      for (var j = 0; j < form_master.length; j++) {
        let form = [];
        let get_one_data1 = await FormMaster.findOne({
          where: {
            formMasterID: form_master[j].parentFormMasterID,
          },
        });
        if (get_one_data1) {
          form_master[j].parentFormMasterID = get_one_data1.formName;
        }
        for (var i = 0; i < form_master[j].operation.length; i++) {
          let get_one_data = await OperationMaster.findOne({
            where: {
              operationID: form_master[j].operation[i],
            },
            raw: true,
          });
          form.push(get_one_data.operationName);
        }
        form_master[j].operation = form;
      }
      totalcount = await FormMaster.count({
        raw: true,
        order: [['formMasterID', 'ASC']],
        where: {
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
      });
    } else if (searchQuery && page == '' && limit == '') {
      form_master = await FormMaster.findAll({
        where: {
          formName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },

          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        raw: true,
        order: [['formMasterID', 'ASC']],
      });
      for (var j = 0; j < form_master.length; j++) {
        let form = [];
        let get_one_data1 = await FormMaster.findOne({
          where: {
            formMasterID: form_master[j].parentFormMasterID,
          },
        });
        if (get_one_data1) {
          form_master[j].parentFormMasterID = get_one_data1.formName;
        }
        for (var i = 0; i < form_master[j].operation.length; i++) {
          let get_one_data = await OperationMaster.findOne({
            where: {
              operationID: form_master[j].operation[i],
            },
            raw: true,
          });
          form.push(get_one_data.operationName);
        }
        form_master[j].operation = form;
      }
      totalcount = await FormMaster.count({
        where: {
          formName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },

          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        raw: true,
        order: [['formMasterID', 'ASC']],
      });
    } else if (searchQuery && page && limit) {
      form_master = await FormMaster.findAll({
        where: {
          formName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },

          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        raw: true,
        order: [['formMasterID', 'ASC']],
        limit: limit,
        offset: offset,
      });
      for (var j = 0; j < form_master.length; j++) {
        let form = [];
        let get_one_data1 = await FormMaster.findOne({
          where: {
            formMasterID: form_master[j].parentFormMasterID,
          },
        });
        if (get_one_data1) {
          form_master[j].parentFormMasterID = get_one_data1.formName;
        }
        for (var i = 0; i < form_master[j].operation.length; i++) {
          let get_one_data = await OperationMaster.findOne({
            where: {
              operationID: form_master[j].operation[i],
            },
            raw: true,
          });
          form.push(get_one_data.operationName);
        }
        form_master[j].operation = form;
      }
      totalcount = await FormMaster.count({
        where: {
          formName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },

          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        raw: true,
        order: [['formMasterID', 'ASC']],
      });
    } else {
      form_master = await FormMaster.findAll({
        raw: true,
        where: {
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        limit: limit,
        offset: offset,
        order: [['formMasterID', 'ASC']],
      });

      for (var j = 0; j < form_master.length; j++) {
        let form = [];
        let get_one_data1 = await FormMaster.findOne({
          where: {
            formMasterID: form_master[j].parentFormMasterID,
          },
        });
        if (get_one_data1) {
          form_master[j].parentFormMasterID = get_one_data1.formName;
        }
        for (var i = 0; i < form_master[j].operation.length; i++) {
          let get_one_data = await OperationMaster.findOne({
            where: {
              operationID: form_master[j].operation[i],
            },
            raw: true,
          });
          form.push(get_one_data.operationName);
        }
        form_master[j].operation = form;
      }
      totalcount = await FormMaster.count({
        raw: true,
        where: { status: ['0', '1'] },
      });
    }

    return res
      .status(200)
      .json({ status: 200, data: form_master, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with formMaster id
 *
 * @param {id} formMasterID  to fetch form name
 */

exports.getFormById = async (req, res, next) => {
  try {
    let get_one_data = await FormMaster.findOne({
      where: {
        formMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with parent formMaster id
 *
 * @param {id} parentFormMasterID  to fetch form name
 */

exports.postGetFormByParentId = async (req, res, next) => {
  try {
    let { parentFormMasterID } = req.body;
    let get_form_data = await FormMaster.findAll({
      where: {
        parentFormMasterID: parentFormMasterID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: get_form_data });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} formMasterID  to update id
 */

exports.postUpdateForm = async (req, res, next) => {
  try {
    let = {
      formMasterID,
      formName,
      description,
      operation,
      parentFormMasterID,
      defaultRight,
      icon,
      path,
      menuName,
    } = await req.body;

    const existingFormType = await FormMaster.findOne({
      where: {
        formName,
        formMasterID: {
          [Sequelize.Op.ne]: formMasterID,
        },
        status: ['0', '1'],
      },
    });

    if (existingFormType) {
      return res.status(200).json({
        status: 401,
        message: 'Form already exists.',
      });
    }
    await FormMaster.update(
      {
        formName,
        description,
        operation,
        parentFormMasterID,
        defaultRight,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
        icon,
        path,
        menuName,
      },
      {
        where: { formMasterID },
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Form'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} formMasterID  to update status of form
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    let = { formMasterID, status } = await req.body;
    let delete_status;
    if (status == '1') {
      delete_status = await FormMaster.update(
        {
          status,
        },
        {
          where: { formMasterID },
        },
      );
    }

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Form')
          : message.usermessage.deactiveMessage('Form'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} formMasterID  to delete id
 */

exports.postDeleteFormById = async (req, res, next) => {
  try {
    const { formMasterID } = await req.body;
    await FormMaster.update(
      {
        status: 2,
      },
      {
        where: { formMasterID },
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Form'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * search data
 *
 * @param {id} searchQuery  to search data
 */
exports.postSearchForm = async (req, res, next) => {
  try {
    let = { searchQuery } = await req.body;
    let search_results = await FormMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { formName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
          { description: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
        ],
      },
    });

    return res.status(200).json({ status: 200, data: search_results });
  } catch (err) {
    next(err);
  }
};

exports.getparentformdata = async (req, res, next) => {
  try {
    let form_master = [];

    form_master = await FormMaster.findAll({
      order: [['formName', 'ASC']],
      where: {
        status: 1,
        parentFormMasterID: null,
      },
    });

    return res.status(200).json({ status: 200, data: form_master });
  } catch (err) {
    next(err);
  }
};

exports.GetFormMaster = async (req, res, next) => {
  try {
    const { companyMasterID } = req.query;

    let totalPermissionIDs = null;

    // ✅ Step 1: Get permission IDs (if company provided)
    if (companyMasterID) {
      const company = await companyMaster.findOne({
        raw: true,
        where: { status: 1, companyMasterID },
      });

      if (!company) {
        return res.status(200).json({
          status: 200,
          data: [],
          message: 'company deactive or deleted',
        });
      }

      const companyID =
        company.parentCompanyMasterID && company.parentCompanyMasterID != 0
          ? company.parentCompanyMasterID
          : companyMasterID;

      const subscription = await subscriptionPlan.findOne({
        raw: true,
        where: { status: 1, companyMasterID: companyID },
      });

      if (!subscription) {
        return res.status(200).json({
          status: 200,
          data: [],
          message: 'No subscription plan found',
        });
      }

      const permissions = await ProductPermission.findAll({
        raw: true,
        where: {
          productMasterID: subscription.productMasterID,
          status: 1,
        },
        attributes: ['formMasterID'],
        group: ['formMasterID'],
      });

      totalPermissionIDs = permissions.map((p) => p.formMasterID);
    }

    // ✅ Step 2: Fetch all forms at once
    const formWhere = {
      status: 1,
      ...(totalPermissionIDs && { formMasterID: totalPermissionIDs }),
    };

    const allForms = await FormMaster.findAll({
      where: formWhere,
      order: [['formMasterID', 'ASC']],
      raw: true,
    });

    // ✅ Step 3: Separate parent & child
    const parentForms = [];
    const childMap = {};

    for (const form of allForms) {
      if (!form.parentFormMasterID) {
        form.children = [];
        parentForms.push(form);
      } else {
        if (!childMap[form.parentFormMasterID]) {
          childMap[form.parentFormMasterID] = [];
        }
        childMap[form.parentFormMasterID].push(form);
      }
    }

    // ✅ Step 4: Collect all operation IDs
    const operationIDs = new Set();
    allForms.forEach((f) => {
      if (Array.isArray(f.operation)) {
        f.operation.forEach((op) => operationIDs.add(op));
      }
    });

    // ✅ Step 5: Fetch all operations in one query
    const operations = await OperationMaster.findAll({
      where: { operationID: [...operationIDs] },
      attributes: ['operationID', 'operationName'],
      raw: true,
    });

    const operationMap = {};
    operations.forEach((op) => {
      operationMap[op.operationID] = op;
    });

    // ✅ Step 6: Map operations to child forms
    Object.values(childMap).forEach((children) => {
      children.forEach((child) => {
        if (Array.isArray(child.operation)) {
          child.operation = child.operation
            .map((id) => operationMap[id])
            .filter(Boolean);
        }
      });
    });

    // ✅ Step 7: Attach children to parents
    parentForms.forEach((parent) => {
      parent.children = childMap[parent.formMasterID] || [];
    });

    return res.status(200).json({
      status: 200,
      data: parentForms,
      ...(totalPermissionIDs && { ids: totalPermissionIDs }),
    });
  } catch (err) {
    next(err);
  }
};

exports.getmenulist = async (req, res, next) => {
  try {
    let = { limit, pages } = await req.body;
    let offset = (pages - 1) * limit;
    let results;
    results = await sequelize.query(
      `SELECT * FROM public.ms_view_getmenulist`,
      { type: Sequelize.SELECT },
    );
    var parentarr = results[0].filter((r1) => r1.parentFormMasterID == null);
    var finalarr = [];
    parentarr.forEach((element) => {
      var submenu = [];
      var child = results[0].filter(
        (r1) => r1.parentFormMasterID == element.formMasterID,
      );
      if (child.length != 0) {
        child.forEach((element) => {
          submenu.push({
            icon: element.icon,
            lable: element.lable,
            menu: element.menu,
            to: element.path,
          });
        });
        finalarr.push({
          icon: element.icon,
          lable: element.lable,
          menu: element.menu,
          to: element.path,
          subs: submenu,
        });
      } else {
        finalarr.push({
          icon: element.icon,
          lable: element.lable,
          menu: element.menu,
          to: element.path,
        });
      }
    });

    return res.status(200).json({ status: 200, data: finalarr });
  } catch (err) {
    next(err);
  }
};
