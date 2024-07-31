const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Follower = sequelize.define('Follower', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    follower_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    following_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'followers'
});

module.exports = Follower;
