const Tip = require('./tip');

module.exports = (sequelize, DataTypes) => {
  const Retip = sequelize.define('Retip', {
    // attributes
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    unclaimed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sender: { type: DataTypes.STRING },
  }, {
    timestamps: true,
  });
  Retip.belongsTo(Tip(sequelize, DataTypes), { foreignKey: 'tipId' });
  return Retip;
};
