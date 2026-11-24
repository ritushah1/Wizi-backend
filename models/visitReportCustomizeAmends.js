const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const VisitReportMaster = require('./visitReportMaster');
const UserMaster = require('./userMaster');

const table_name = 'visitReportCustomizeAmend';

const VisitReportCustomizeAmend = sequelize.define(
  table_name,
  {
    visitReportCustomizeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    visitReportCustomizeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    visitReportMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    fieldLabel: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    index: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    inputType: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    value: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },

    isRequired: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    createBy: {
      type: Sequelize.BIGINT,
    },

    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes:[
        {
            fields:['visitReportCustomizeAmendID']
        }
    ]
  }
);



VisitReportCustomizeAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

VisitReportCustomizeAmend.belongsTo(VisitReportMaster, {
  foreignKey: { name: 'visitReportMasterID' },
});

VisitReportCustomizeAmend.belongsTo(VisitReportMaster, {
  as: 'vrMaster',
  foreignKey: { name: 'visitReportMasterID' },
});

VisitReportCustomizeAmend.belongsTo(UserMaster,{
    as:'createByUser',
    foreignKey:{name:'createBy'}
})

module.exports = VisitReportCustomizeAmend;