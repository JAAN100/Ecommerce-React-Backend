import { Sequelize } from 'sequelize';
import fs from 'fs';
 
const isUsingRDS = process.env.RDS_HOSTNAME && process.env.RDS_USERNAME && process.env.RDS_PASSWORD;
const dbType = process.env.DB_TYPE || 'postgres';
const defaultPorts = {
  mysql: 3306,
  postgres: 5432,
};
const defaultPort = defaultPorts[dbType];
 
export let sequelize;
 
if (isUsingRDS) {
  const { default: pg } = await import('pg');
  sequelize = new Sequelize({
    database: process.env.RDS_DB_NAME,
    username: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT || defaultPort,
    dialect: dbType,
    dialectModule: pg,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  const sqlJsAsSqlite3 = (await import('sql.js-as-sqlite3')).default;
  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlJsAsSqlite3,
    logging: false
  });
 
  // Save database to file after write operations (local only)
  sequelize.addHook('afterCreate', saveDatabaseToFile);
  sequelize.addHook('afterDestroy', saveDatabaseToFile);
  sequelize.addHook('afterUpdate', saveDatabaseToFile);
  sequelize.addHook('afterSave', saveDatabaseToFile);
  sequelize.addHook('afterUpsert', saveDatabaseToFile);
  sequelize.addHook('afterBulkCreate', saveDatabaseToFile);
  sequelize.addHook('afterBulkDestroy', saveDatabaseToFile);
  sequelize.addHook('afterBulkUpdate', saveDatabaseToFile);
}
 
export async function saveDatabaseToFile() {
  const dbInstance = await sequelize.connectionManager.getConnection();
  const binaryArray = dbInstance.database.export();
  const buffer = Buffer.from(binaryArray);
  fs.writeFileSync('database.sqlite', buffer);
}