import { NextResponse } from 'next/server';
import { getDbConnection, saveDb } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const db = await getDbConnection();

    // 1. Action: Edit Drug Row
    if (action === 'edit-drug') {
      const body = await request.json();
      const { id, updates } = body;

      if (!id || !updates) {
        return NextResponse.json({ success: false, error: 'ID and updates are required' }, { status: 400 });
      }

      // Build dynamic SQL UPDATE query
      const keys = Object.keys(updates);
      const setClause = keys.map((key) => `"${key}" = ?`).join(', ');
      const values = Object.values(updates);

      // Execute UPDATE
      db.run(`UPDATE drugs SET ${setClause} WHERE id = ?`, [...values, id]);

      // Save database back to disk
      const savedDisk = await saveDb();

      return NextResponse.json({ 
        success: true, 
        message: 'Drug updated successfully',
        saved_to_disk: savedDisk
      });
    }

    // 2. Action: Add New Column dynamically
    if (action === 'add-column') {
      const body = await request.json();
      const { name } = body;

      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Column name is required' }, { status: 400 });
      }

      const colName = name.trim();

      // Basic SQL injection validation for column name (only letters, numbers, spaces, and underscores)
      const validNameRegex = /^[a-zA-Z0-9_\s\u0600-\u06FF\-]+$/;
      if (!validNameRegex.test(colName)) {
        return NextResponse.json({ success: false, error: 'اسم العمود يحتوي على رموز غير مسموح بها.' }, { status: 400 });
      }

      // Check if column already exists
      const pragma = await db.all("PRAGMA table_info(drugs)");
      const exists = pragma.some((col: any) => col.name.toLowerCase() === colName.toLowerCase());
      if (exists) {
        return NextResponse.json({ success: false, error: 'هذا العمود موجود بالفعل في قاعدة البيانات.' }, { status: 400 });
      }

      // Execute ALTER TABLE to add column
      db.run(`ALTER TABLE drugs ADD COLUMN "${colName}" TEXT`);

      // Save database back to disk
      const savedDisk = await saveDb();

      return NextResponse.json({ 
        success: true, 
        message: 'Column added successfully',
        saved_to_disk: savedDisk
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Save API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
