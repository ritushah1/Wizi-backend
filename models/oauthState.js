const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const OAuthState = sequelize.define(
  'oauthState',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    state: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'Random state parameter for CSRF protection',
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Company ID initiating OAuth flow',
    },

    expires_at: {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'State expiration time (typically 10 minutes)',
    },

      createBy: {
        type: Sequelize.BIGINT,
        },
  createByIp: {
        type: Sequelize.STRING,
            },
  },
  {
    tableName: 'oauthStates',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['state'],
        name: 'oauth_states_state_unique',
      },
      {
        fields: ['expires_at'],
        name: 'oauth_states_expires_at_index',
      },
    ],
  },
);

// Auto-cleanup expired states (optional)
// Run this periodically via cron job or scheduler
OAuthState.cleanupExpired = async function () {
  try {
    const deleted = await OAuthState.destroy({
      where: {
        expires_at: {
          [Sequelize.Op.lt]: new Date(),
        },
      },
    });
    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} expired OAuth states`);
    }
    return deleted;
  } catch (error) {
    console.error('Error cleaning up OAuth states:', error);
    return 0;
  }
};

OAuthState.addHook('beforeCreate', (OAuthState, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    OAuthState.createBy = options.user.userMasterId;
    OAuthState.createByIp = options.user.userIpAddress;
});



module.exports = OAuthState;
