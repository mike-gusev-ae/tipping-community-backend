const { IPFS_TYPES } = require('./enums/ipfs');

module.exports = (sequelize, DataTypes) => sequelize.define('IPFSEntry', {
  // attributes
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM({
      values: Object.values(IPFS_TYPES),
    }),
    allowNull: false,
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});
