import { NextResponse } from 'next/server';
import db from '@/database/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  let query = `
    SELECT 
      ts.id,
      ts.title,
      ts.scenario,
      ts.scenario_type,
      ts.difficulty,
      ts.tips
    FROM training_scenarios ts
  `;
  let params = [];

  if (type) {
    query += ' WHERE ts.scenario_type = ?';
    params.push(type);
  }

  query += ' ORDER BY ts.difficulty ASC, ts.id DESC';

  const stmt = await db.prepare(query);
  const scenarios = await stmt.all(...params);
  
  const scenariosWithOptions = await Promise.all(
    scenarios.map(async (scenario) => {
      const optionStmt = await db.prepare(
        'SELECT id, option_text, is_correct, feedback, score FROM scenario_options WHERE scenario_id = ?'
      );
      const options = await optionStmt.all(scenario.id);
      return {
        ...scenario,
        options
      };
    })
  );

  return NextResponse.json(scenariosWithOptions);
}