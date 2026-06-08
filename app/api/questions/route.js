import db from '@/database/db';

export async function GET(request) {
  const prepared = await db.prepare('SELECT * FROM questions');
  const questions = await prepared.all();
  return Response.json(questions);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter } = body;

    if (!type || !content || !answer) {
      return Response.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const insertStmt = await db.prepare(
      'INSERT INTO questions (type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = await insertStmt.run(type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter);

    return Response.json({ 
      id: result.lastInsertRowid,
      type,
      content,
      option_a,
      option_b,
      option_c,
      option_d,
      answer,
      explanation,
      chapter
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}