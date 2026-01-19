const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Check if we're using a cloud database (Aiven) that requires SSL
const isProduction = process.env.NODE_ENV === 'production';

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'naus',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: isProduction ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
);

// Create MySQL2 pool for raw queries
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'naus',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('MySQL Connected with Sequelize on port', process.env.DB_PORT || 3307);

    // Test the pool connection
    await pool.query('SELECT 1');
    console.log('MySQL2 pool connected successfully');

    return sequelize;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // Don't exit, just throw
  }
};

module.exports = { sequelize, connectDB, pool };