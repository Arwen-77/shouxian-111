import db from '@/database/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    const { username, password } = await request.json();
    const prepared = await db.prepare('SELECT id FROM users WHERE username = ?');
    const existing = await prepared.get(username);
    if (existing) {
        return Response.json({ error: '用户名已存在' }, { status: 400 });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const insertStmt = await db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const result = await insertStmt.run(username, hashed, 'student');
    return Response.json({ success: true, userId: result.lastInsertRowid });
}