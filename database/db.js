import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let db = null;

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function getDb() {
  if (db) return db;
  
  const SQL = await initSqlJs({
    locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
  });
  
  const dbPath = path.join(process.cwd(), 'database', 'shouxian.db');
  
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(data));
  } else {
    db = new SQL.Database();
    initTables();
    saveDb();
  }
  
  return db;
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      chapter TEXT
    );
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      user_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      answer_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS training_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      scenario TEXT NOT NULL,
      scenario_type TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      tips TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scenario_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      feedback TEXT,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (scenario_id) REFERENCES training_scenarios(id)
    );
  `);

  let countResult = db.exec("SELECT COUNT(*) as c FROM questions");
  let count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
  
  if (count === 0) {
    db.run(`
      INSERT INTO questions (type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter)
      VALUES ('single', '以下哪种保险产品不属于人寿保险的范畴？', '定期寿险', '健康保险', '终身寿险', '两全保险', 'B', '健康保险不属于人寿保险范畴。', '保险基础知识')
    `);
    db.run(`
      INSERT INTO questions (type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter)
      VALUES ('single', '保险合同成立后，除法律另有规定外，不得解除保险合同的主体是？', '投保人', '保险人', '被保险人', '受益人', 'B', '根据保险法规定，投保人可以解除合同，保险人不得解除合同。', '保险基础知识')
    `);
    db.run(`
      INSERT INTO questions (type, content, option_a, option_b, option_c, option_d, answer, explanation, chapter)
      VALUES ('judge', '人寿保险适用损失补偿原则。', '', '', '', '', '错误', '人寿保险是定额给付型，不适用损失补偿原则。', '保险基础知识')
    `);
  }

  countResult = db.exec("SELECT COUNT(*) as c FROM training_scenarios");
  count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
  
  if (count === 0) {
    db.run(`INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES ('客户对价格的异议', '客户说：你们的保险产品太贵了，我觉得没必要买。请问你该如何回应？', '客户异议处理', 1, '要理解客户的顾虑，强调保险的价值和保障。')`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (1, '直接降价优惠给客户', 0, '这不是最佳选择，直接降价会影响公司利润，也显得产品价值不高。', 30)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (1, '解释保险的保障范围和长期价值', 1, '很好！要强调保险带来的安心和保障，而不是单纯比较价格。', 100)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (1, '告诉客户便宜没好货', 0, '这种说法太绝对，可能会让客户感到被轻视。', 20)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (1, '推荐更便宜的产品', 0, '这可能导致客户购买不符合需求的产品，影响客户体验。', 50)`);

    db.run(`INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES ('客户担心理赔难', '客户表示听说保险公司理赔很麻烦，担心出了事拿不到钱。你该如何回应？', '客户异议处理', 2, '要强调公司的信誉和理赔流程的透明性。')`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (2, '让客户放心，公司信誉很好', 0, '虽然正确，但缺乏说服力，需要更具体的证据。', 50)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (2, '解释理赔流程，并分享成功案例', 1, '非常好！用具体案例和透明的流程说明来打消客户疑虑。', 100)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (2, '让客户看合同条款', 0, '条款太复杂，客户可能看不懂，需要用更易懂的方式解释。', 40)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (2, '保证一定能理赔成功', 0, '这是不恰当的承诺，理赔需要根据具体情况而定。', 20)`);

    db.run(`INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES ('客户犹豫不决', '客户对是否购买保险犹豫不决，说需要再考虑考虑。你该如何跟进？', '成交技巧', 1, '要给客户适当的时间，但也要保持跟进。')`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (3, '给客户一周时间考虑', 0, '时间太长，客户可能会忘记或改变主意。', 40)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (3, '询问顾虑并提供解决方案', 1, '很好！了解客户的顾虑并针对性解决，有助于推动决策。', 100)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (3, '不断催促客户做决定', 0, '过于pushy会让客户感到压力，可能导致反感。', 20)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (3, '送一些小礼品促成签约', 0, '这可能违反公司规定，也不是长久之计。', 30)`);

    db.run(`INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES ('家庭保障需求分析', '一对年轻夫妻，有一个3岁孩子，月收入合计2万元。你该如何分析他们的保险需求？', '需求分析', 2, '要考虑家庭结构、收入状况和未来规划。')`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (4, '推荐最贵的保险产品', 0, '不考虑客户实际需求，只推贵的产品是不负责任的。', 20)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (4, '先了解家庭情况和担忧，再推荐合适的方案', 1, '非常好！需求分析是顾问的核心能力，要先倾听再推荐。', 100)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (4, '直接推荐热销产品', 0, '热销产品不一定适合每个客户，需要个性化分析。', 30)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (4, '建议等收入更高再考虑', 0, '保险应该尽早规划，越早越便宜，保障时间也更长。', 40)`);

    db.run(`INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES ('产品对比说明', '客户想比较你们公司的产品和竞争对手的产品。你该如何回应？', '产品介绍', 2, '要客观公正，突出自身优势但不贬低对手。')`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (5, '说竞争对手的产品不好', 0, '贬低竞争对手显得不专业，也可能违反规定。', 20)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (5, '客观对比优缺点，强调自身优势', 1, '很好！专业的顾问应该客观分析，帮助客户做出明智选择。', 100)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (5, '说自己的产品完美无缺', 0, '没有完美的产品，过分吹嘘会降低可信度。', 40)`);
    db.run(`INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (5, '拒绝比较', 0, '客户有比较需求是正常的，回避会让客户觉得你心虚。', 30)`);
  }
}

function saveDb() {
  const data = db.export();
  const dbPath = path.join(process.cwd(), 'database', 'shouxian.db');
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export default {
  async prepare(sql) {
    const convertedSql = convertPlaceholders(sql);
    const database = await getDb();
    return {
      run: async (...params) => {
        const stmt = database.prepare(convertedSql);
        stmt.bind(params);
        stmt.step();
        const result = database.exec("SELECT last_insert_rowid() as id");
        const lastInsertRowid = result.length > 0 ? result[0].values[0][0] : null;
        stmt.free();
        saveDb();
        return { lastInsertRowid };
      },
      get: async (...params) => {
        const database = await getDb();
        const stmt = database.prepare(convertedSql);
        stmt.bind(params);
        if (!stmt.step()) {
          stmt.free();
          return null;
        }
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        stmt.free();
        const obj = {};
        for (let i = 0; i < columns.length; i++) {
          obj[columns[i]] = values[i];
        }
        return obj;
      },
      all: async (...params) => {
        const database = await getDb();
        const stmt = database.prepare(convertedSql);
        stmt.bind(params);
        const columns = stmt.getColumnNames();
        const results = [];
        while (stmt.step()) {
          const values = stmt.get();
          const obj = {};
          for (let i = 0; i < columns.length; i++) {
            obj[columns[i]] = values[i];
          }
          results.push(obj);
        }
        stmt.free();
        return results;
      }
    };
  },
  async query(sql, params = []) {
    const database = await getDb();
    const convertedSql = convertPlaceholders(sql);
    const stmt = database.prepare(convertedSql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  },
  async exec(sql) {
    const database = await getDb();
    database.run(sql);
  }
};