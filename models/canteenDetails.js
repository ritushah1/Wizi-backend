const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const BranchMaster = require('../models/branchMaster');

const CanteenDetails = sequelize.define(
  'canteenDetails',
  {
    id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    canteenName: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Canteen name is required.' },
        isString(value) {
          if (typeof value !== 'string') {
            throw new Error('Canteen name must be a string.');
          }
        },
      },
    },

    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company is required.' },
      },
    },

    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Branch is required.' },
      },
    },

    createBy: { type: Sequelize.BIGINT },
    updateBy: { type: Sequelize.BIGINT },
    deleteBy: { type: Sequelize.BIGINT },
    createByIp: { type: Sequelize.STRING },
    updateByIp: { type: Sequelize.STRING },
    deleteByIp: { type: Sequelize.STRING },
  },
  {
    paranoid: true,
    indexes: [
      // unique index (case-insensitive)
      {
        unique: true,
        name: 'unique_canteen_per_company_insensitive',
        fields: [Sequelize.literal('LOWER("canteenName")'), 'companyMasterID'],
        where: {
          deletedAt: null,
        },
      },
      { fields: ['branchMasterID'] },
    ],
    validate: {
      async uniqueCanteenNamePerCompany() {
        if (this.companyMasterID && this.canteenName) {
          const existing = await CanteenDetails.findOne({
            where: {
              companyMasterID: this.companyMasterID,
              [Sequelize.Op.and]: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('canteenName')),
                this.canteenName.toLowerCase()
              ),
              id: { [Sequelize.Op.ne]: this.id || 0 },
              deletedAt: null,
            },
          });

          if (existing) {
            throw new Error(
              `Canteen name '${this.canteenName}' already exists for this company (case-insensitive).`
            );
          }
        }
      },
    },
  }
);

// ---------------------- Hooks for audit fields ----------------------
CanteenDetails.addHook('beforeCreate', (canteen, options) => {
  if (options.user) {
    canteen.createBy = options.user.userMasterId;
    canteen.createByIp = options.user.userIpAddress;
  }
});

CanteenDetails.addHook('beforeUpdate', (canteen, options) => {
  if (options.user) {
    canteen.updateBy = options.user.userMasterId;
    canteen.updateByIp = options.user.userIpAddress;
  }
});

CanteenDetails.addHook('beforeDestroy', (canteen, options) => {
  if (options.user) {
    canteen.deleteBy = options.user.userMasterId;
    canteen.deleteByIp = options.user.userIpAddress;
  }
});

// ---------------------- Associations ----------------------
CanteenDetails.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID', allowNull: false },
});
CanteenDetails.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID', allowNull: false },
});

CanteenDetails.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});
CanteenDetails.belongsTo(UserMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});
CanteenDetails.belongsTo(UserMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CanteenDetails;
