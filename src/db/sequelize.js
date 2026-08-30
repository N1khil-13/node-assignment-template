/**
 * Using Sequelize is optional - we set this up using it.
 * You can replace this with anything else.
 */

const { Sequelize } = require("sequelize");

let sequelize = null;

const getSequelize = () => {
  if (!process.env.DATABASE_URL || !process.env.DB_DIALECT) {
    throw new Error("DATABASE_URL and DB_DIALECT must be set.");
  }

  if (!sequelize) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: process.env.DB_DIALECT,
      logging: false
    });
  }

  return sequelize;
};

const testConnection = async () => {
  if (!process.env.DATABASE_URL || !process.env.DB_DIALECT) {
    console.warn(
      "Database not configured yet. Set DATABASE_URL and DB_DIALECT when you choose a database for the assignment."
    );
    return;
  }

  try {
    const connection = getSequelize();
    await connection.authenticate();
    console.log("Database connection established.");
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
  }
};

module.exports = {
  getSequelize,
  testConnection
};
