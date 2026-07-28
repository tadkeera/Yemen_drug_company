import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: any = null;

export async function getDbConnection() {
  if (dbInstance) return dbInstance;

  // Initialize sql.js (pure JS/WASM engine)
  const SQL = await initSqlJs();

  // Read the local .db file from the project directory
  const dbPath = path.join(process.cwd(), 'Yemen_drug_company.db');
  const fileBuffer = fs.readFileSync(dbPath);

  // Load the database buffer into sql.js
  dbInstance = new SQL.Database(fileBuffer);

  // Emulate db.all for compatibility with sqlite3's API
  dbInstance.all = function (sql: string, params: any[] = []) {
    const stmt = dbInstance.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  };

  return dbInstance;
}
