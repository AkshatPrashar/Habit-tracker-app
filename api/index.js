import app from '../src/app.js';
import connectDB from '../src/db/connectDB.js';

let dbConnection = null;

export default async function handler(req, res) {
  if (!dbConnection) {
    dbConnection = connectDB().catch((err) => {
      dbConnection = null;
      throw err;
    });
  }
  await dbConnection;
  return app(req, res);
}
