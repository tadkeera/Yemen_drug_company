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

  // Add db.run to execute queries like UPDATE, ALTER TABLE, etc.
  dbInstance.run = function (sql: string, params: any[] = []) {
    dbInstance.run(sql, params);
  };

  return dbInstance;
}

// Save the in-memory database back to the local .db file on disk
export async function saveDb() {
  if (dbInstance) {
    const dbPath = path.join(process.cwd(), 'Yemen_drug_company.db');
    const data = dbInstance.export();
    
    // On Vercel, the filesystem is read-only except for /tmp.
    // We attempt to write to disk, which works perfectly on Local Host.
    // If it fails on Vercel, it fails gracefully without crashing.
    try {
      fs.writeFileSync(dbPath, Buffer.from(data));
      console.log('Database successfully saved to disk.');
      return true;
    } catch (err) {
      console.error('Database write-to-disk bypassed (Expected on Vercel read-only filesystem):', err);
      return false;
    }
  }
  return false;
}
