const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Sesuaikan jalur dari '../config/database' ke '../config/db'

const FuelTransaction = sequelize.define('FuelTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transactionUuid: { type: DataTypes.STRING, unique: true, allowNull: false },
    driverId: { type: DataTypes.INTEGER, allowNull: false },
    vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    odometerBefore: { type: DataTypes.FLOAT, allowNull: false },
    odometerAfter: { type: DataTypes.FLOAT, allowNull: false },
    liters: { type: DataTypes.FLOAT, allowNull: false },
    totalCost: { type: DataTypes.FLOAT, allowNull: false },
    photoPath: { type: DataTypes.STRING, allowNull: true },
    isSynced: { type: DataTypes.BOOLEAN, defaultValue: true },
    transactionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = FuelTransaction;