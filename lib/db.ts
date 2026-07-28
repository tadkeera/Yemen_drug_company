import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDbConnection() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'Yemen_drug_company.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  return db;
}
