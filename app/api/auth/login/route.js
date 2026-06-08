import db from '@/database/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
    const { username, password } = await request.json();
    const prepared = await db.prepare('SELECT * FROM users WHERE username = ?');
    const user = await prepared.get(username);
    if (!user) return Response.json({ error: '用户名不存在' }, { status: 401 });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return Response.json({ error: '密码错误' }, { status: 401 });
    const token = generateToken(user);
    return Response.json({ token, user: { id: user.id, username: user.username, role: user.role } });
}