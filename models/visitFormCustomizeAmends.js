const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');

const table_name = 'visitFormCustomizeAmend';

const VisitFormCustomizeAmend = sequelize.define(
  table_name,
  {
    visitFormCustomizeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    visitFormCustomizeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
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
      allowNull: true,
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
            fields:['visitFormCustomizeAmendID']
        }
    ]
  }
);

VisitFormCustomizeAmend.belongsTo(companyMaster,{
    foreignKey:{name:'companyMasterID'}
})

VisitFormCustomizeAmend.belongsTo(UserMaster,{
    foreignKey:{name:'createBy'}
})

module.exports = VisitFormCustomizeAmend;