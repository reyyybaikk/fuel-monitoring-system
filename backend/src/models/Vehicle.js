const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Sesuaikan jalur dari '../config/database' ke '../config/db'

const Vehicle = sequelize.define('Vehicle', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    plateNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
    unitCode: { type: DataTypes.STRING, allowNull: true },
    region: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'maintenance', 'inactive'), defaultValue: 'active' }
});

module.exports = Vehicle;