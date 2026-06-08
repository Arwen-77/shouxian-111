import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
const JWT_EXPIRES_IN = '7d';

let db = null;

async function initDB() {
  if (db) return db;
  
  const initSqlJs = await import('sql.js');
  const SQL = initSqlJs.default;
  
  db = await new SQL.Database({
    locateFile: file => `/${file}`
  });
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100),
      password VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      answer INTEGER NOT NULL,
      explanation TEXT,
      category TEXT DEFAULT '综合',
      difficulty INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS answer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      question_id INTEGER,
      user_answer INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
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
      scenario_id INTEGER,
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      feedback TEXT,
      score INTEGER DEFAULT 0,
      FOREIGN KEY (scenario_id) REFERENCES training_scenarios(id)
    );
    
    CREATE TABLE IF NOT EXISTS training_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      scenario_id INTEGER,
      selected_option INTEGER NOT NULL,
      score INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (scenario_id) REFERENCES training_scenarios(id)
    );
  `);
  
  const questionsCount = db.prepare('SELECT COUNT(*) as count FROM questions').get();
  if (!questionsCount || questionsCount.count === 0) {
    const sampleQuestions = [
      { question: '保险合同的订立必须遵循的原则不包括', options: JSON.stringify(['最大诚信原则', '自愿原则', '公平原则', '等价交换原则']), answer: 3, explanation: '保险合同订立原则包括最大诚信、自愿、公平、互利等，但不等价交换', category: '保险基础知识', difficulty: 1 },
      { question: '以下哪种风险属于纯粹风险？', options: JSON.stringify(['投资股票', '购买彩票', '火灾损失', '创业']), answer: 2, explanation: '纯粹风险只有损失机会，没有获利可能，火灾属于纯粹风险', category: '保险基础知识', difficulty: 1 },
      { question: '保险的基本职能是', options: JSON.stringify(['融资职能', '经济补偿职能', '社会管理职能', '风险管理职能']), answer: 1, explanation: '保险的基本职能是经济补偿，其他是派生职能', category: '保险基础知识', difficulty: 1 },
      { question: '投保人对下列哪项财产不具有保险利益？', options: JSON.stringify(['自己的房屋', '租赁的房屋', '朋友的汽车', '自己的身体']), answer: 2, explanation: '投保人对朋友的汽车没有法律上承认的利益', category: '保险基础知识', difficulty: 2 },
      { question: '人身保险合同的主体不包括', options: JSON.stringify(['投保人', '保险人', '被保险人', '受益人']), answer: 3, explanation: '受益人是保险金受领人，不是合同主体', category: '保险基础知识', difficulty: 2 },
      { question: '以下关于保险合同的说法正确的是', options: JSON.stringify(['保险合同是单务合同', '保险合同是射幸合同', '保险合同是无偿合同', '保险合同是实践性合同']), answer: 1, explanation: '保险合同是射幸合同，即合同履行结果取决于偶然事件', category: '保险基础知识', difficulty: 2 },
      { question: '保险金额是指', options: JSON.stringify(['投保人缴纳的保费', '保险人承担赔偿的最高限额', '保险标的的实际价值', '保险费的计算依据']), answer: 1, explanation: '保险金额是保险人承担赔偿或给付责任的最高限额', category: '保险基础知识', difficulty: 1 },
      { question: '以下哪种情况属于保险欺诈？', options: JSON.stringify(['隐瞒病史投保', '发生意外后及时报案', '如实告知健康状况', '按期缴纳保费']), answer: 0, explanation: '隐瞒病史属于故意隐瞒重要事实，构成保险欺诈', category: '保险基础知识', difficulty: 1 },
      { question: '保险理赔的基本原则是', options: JSON.stringify(['重合同、守信用', '主动、迅速、准确、合理', '实事求是', '以上都是']), answer: 3, explanation: '保险理赔应遵循重合同守信用、主动迅速准确合理、实事求是等原则', category: '保险基础知识', difficulty: 1 },
      { question: '下列关于代位求偿权的说法错误的是', options: JSON.stringify(['代位求偿权仅适用于财产保险', '保险人行使代位求偿权不影响被保险人的其他权利', '被保险人放弃对第三者的赔偿请求权的，保险人仍需承担赔偿责任', '代位求偿权是一种法定权利']), answer: 2, explanation: '被保险人放弃对第三者赔偿请求权的，保险人可以拒绝赔偿', category: '保险基础知识', difficulty: 3 },
      { question: '客户说"保险太贵了"，正确的回应是', options: JSON.stringify(['不贵啊，一天才几块钱', '您说得对，我们可以根据预算调整方案', '不买保险风险更大', '这已经是最便宜的了']), answer: 1, explanation: '先认同客户感受，再提供解决方案', category: '销售技巧', difficulty: 2 },
      { question: '客户说"我有社保了"，正确的回应是', options: JSON.stringify(['社保不够用', '社保是基础，商保是补充', '社保报销很多', '有社保就够了']), answer: 1, explanation: '客观说明社保与商保的互补关系', category: '销售技巧', difficulty: 2 },
      { question: '客户说"我再考虑考虑"，正确的做法是', options: JSON.stringify(['尊重客户，过几天再联系', '追问具体顾虑', '直接放弃', '施加压力']), answer: 1, explanation: '了解客户顾虑才能针对性解决', category: '销售技巧', difficulty: 1 },
      { question: '以下哪种沟通方式更有效？', options: JSON.stringify(['单向灌输', '双向沟通', '只顾自己说', '不倾听客户需求']), answer: 1, explanation: '双向沟通能更好了解客户需求', category: '销售技巧', difficulty: 1 },
      { question: '保险销售的核心是', options: JSON.stringify(['推销产品', '满足客户需求', '完成业绩', '讲解条款']), answer: 1, explanation: '以客户需求为导向才是正确的销售理念', category: '销售技巧', difficulty: 1 }
    ];

    for (const q of sampleQuestions) {
      db.run(
        'INSERT INTO questions (question, options, answer, explanation, category, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
        [q.question, q.options, q.answer, q.explanation, q.category, q.difficulty]
      );
    }

    const scenarios = [
      { title: '客户说"保险太贵了"', scenario: '客户是一位35岁的白领，月收入15000元，有房贷和孩子。当你推荐重疾险时，他说："保险太贵了，我买不起。"', scenario_type: '客户异议处理', difficulty: 1, tips: '要理解客户的真实顾虑，用专业的方式展示保险的价值和必要性。' },
      { title: '客户说"我再考虑考虑"', scenario: '你详细介绍了产品后，客户说："我再考虑考虑，过几天给你答复。"', scenario_type: '成交技巧', difficulty: 2, tips: '要了解客户犹豫的真实原因，并提供有价值的信息帮助决策。' },
      { title: '重疾险产品介绍', scenario: '客户是一位40岁的企业主，想了解重疾险。请向他介绍重疾险的核心价值。', scenario_type: '产品介绍', difficulty: 2, tips: '要用通俗易懂的语言，结合客户实际情况，突出产品的核心价值。' },
      { title: '客户需求分析', scenario: '客户是一位28岁的单身女性，刚工作几年，想买保险但不知道买什么。请帮她分析需求。', scenario_type: '需求分析', difficulty: 1, tips: '要通过提问了解客户的具体情况，包括收入、负债、家庭责任等。' },
      { title: '客户说"我有社保了"', scenario: '客户说："我有社保了，不需要商业保险。"', scenario_type: '客户异议处理', difficulty: 2, tips: '要客观分析社保和商业保险的区别，用事实说话，不要贬低社保。' }
    ];

    for (const s of scenarios) {
      db.run(
        'INSERT INTO training_scenarios (title, scenario, scenario_type, difficulty, tips) VALUES (?, ?, ?, ?, ?)',
        [s.title, s.scenario, s.scenario_type, s.difficulty, s.tips]
      );
    }

    const options = [
      { scenario_id: 1, option_text: '您说得对，确实不便宜。但我们可以根据您的预算调整方案，先保障最关键的风险。', is_correct: 1, feedback: '很好！这个回答既认同了客户的感受，又提出了建设性的解决方案。', score: 90 },
      { scenario_id: 1, option_text: '不贵啊，一天也就几十块钱，少喝两杯咖啡就有了。', is_correct: 0, feedback: '这种说法可能会让客户觉得你不理解他的经济压力，容易引起反感。', score: 30 },
      { scenario_id: 1, option_text: '那您觉得多少钱合适呢？我们可以调整保额。', is_correct: 1, feedback: '不错！通过询问客户的预算，可以更好地为其定制方案。', score: 75 },
      { scenario_id: 1, option_text: '您有房贷和孩子，万一出事了，谁来还房贷？谁来养孩子？', is_correct: 0, feedback: '虽然说的是事实，但语气过于直接，可能会让客户感到被威胁。', score: 40 },
      { scenario_id: 2, option_text: '好的，您慢慢考虑。有需要随时联系我。', is_correct: 0, feedback: '这样回答太被动，可能会失去成交机会。', score: 40 },
      { scenario_id: 2, option_text: '我理解您的谨慎。您主要考虑哪方面呢？是保障范围、保费还是其他？我可以帮您详细分析。', is_correct: 1, feedback: '非常好！通过开放式问题了解客户顾虑，展现专业性和服务意识。', score: 95 },
      { scenario_id: 2, option_text: '现在投保有优惠活动，过了这个月就没了。', is_correct: 0, feedback: '用促销手段施压可能会让客户觉得你在推销，而不是为他着想。', score: 35 },
      { scenario_id: 2, option_text: '那您先考虑，我下周再联系您。', is_correct: 1, feedback: '可以接受，但缺少主动了解客户顾虑的步骤。', score: 60 },
      { scenario_id: 3, option_text: '重疾险就是确诊重大疾病后，保险公司一次性赔付一笔钱，您可以自由支配，用于治疗、康复或弥补收入损失。', is_correct: 1, feedback: '很好！简洁明了地说明了重疾险的核心功能和资金使用灵活性。', score: 85 },
      { scenario_id: 3, option_text: '重疾险包含100种重大疾病，保额最高可达100万，等待期90天，保障终身。', is_correct: 0, feedback: '虽然信息准确，但过于技术化，没有突出对客户的价值。', score: 50 },
      { scenario_id: 3, option_text: '作为企业主，您是家庭的经济支柱。一旦生病，不仅治疗需要钱，企业运营也会受影响。重疾险可以给您一笔现金流，让您安心养病。', is_correct: 1, feedback: '非常好！结合客户身份和实际情况，生动地说明了保险的必要性。', score: 95 },
      { scenario_id: 3, option_text: '重疾险是必备保险，现在环境污染严重，得大病的人越来越多，一定要买。', is_correct: 0, feedback: '用恐吓的方式推销，可能会让客户反感。', score: 30 },
      { scenario_id: 4, option_text: '您单身，没有家庭负担，建议先买意外险和医疗险，保费便宜保障高。', is_correct: 0, feedback: '虽然建议合理，但没有充分了解客户情况就下结论。', score: 55 },
      { scenario_id: 4, option_text: '请问您目前的收入情况如何？有没有负债？父母是否需要您赡养？未来有什么规划？', is_correct: 1, feedback: '非常好！通过系统性的提问全面了解客户情况，体现专业性。', score: 95 },
      { scenario_id: 4, option_text: '年轻人建议买重疾险，现在买保费便宜，以后年龄大了就贵了。', is_correct: 0, feedback: '虽然说的是事实，但没有了解客户的具体需求和预算。', score: 45 },
      { scenario_id: 4, option_text: '您最担心什么风险？是意外、疾病还是其他？我们可以针对性地配置保障。', is_correct: 1, feedback: '不错！从客户关心的风险出发，引导需求分析。', score: 85 },
      { scenario_id: 5, option_text: '社保是基础保障，但有起付线、封顶线和报销比例限制。商业保险可以补充这些不足，给您更全面的保障。', is_correct: 1, feedback: '很好！客观地说明了社保和商保的关系，强调互补性。', score: 90 },
      { scenario_id: 5, option_text: '社保报销太少了，根本不够用，必须买商业保险。', is_correct: 0, feedback: '贬低社保可能会让客户觉得你不专业或有偏见。', score: 35 },
      { scenario_id: 5, option_text: '社保只报销医疗费用，如果生病不能工作，收入损失怎么办？重疾险可以弥补这部分损失。', is_correct: 1, feedback: '非常好！指出了社保的保障缺口，用具体场景说明商业保险的价值。', score: 95 },
      { scenario_id: 5, option_text: '您说得对，社保确实很重要。但您知道社保有哪些限制吗？我给您详细说说。', is_correct: 1, feedback: '不错！先认同客户，再引导了解详情。', score: 80 }
    ];

    for (const opt of options) {
      db.run(
        'INSERT INTO scenario_options (scenario_id, option_text, is_correct, feedback, score) VALUES (?, ?, ?, ?, ?)',
        [opt.scenario_id, opt.option_text, opt.is_correct, opt.feedback, opt.score]
      );
    }
  }
  
  return db;
}

export async function createUser(username, password, email) {
  try {
    const database = await initDB();
    
    const existing = database.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      throw new Error('用户名已存在');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = database.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
    const result = stmt.run([username, hashedPassword, email || '']);
    stmt.free();
    
    return { id: result.lastInsertRowid, username, email: email || '' };
  } catch (error) {
    console.error('创建用户失败:', error.message);
    throw error;
  }
}

export async function findUserByUsername(username) {
  try {
    const database = await initDB();
    
    const user = database.prepare('SELECT id, username, password, email FROM users WHERE username = ?').get(username);
    
    return user;
  } catch (error) {
    console.error('查找用户失败:', error.message);
    throw error;
  }
}

export async function findUserById(id) {
  try {
    const database = await initDB();
    
    const user = database.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id);
    
    return user;
  } catch (error) {
    console.error('查找用户ID失败:', error.message);
    throw error;
  }
}

export async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

export async function login(username, password) {
  try {
    const user = await findUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return null;
    }
    
    const token = generateToken(user);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    };
  } catch (error) {
    console.error('登录失败:', error.message);
    throw error;
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getAllQuestions() {
  try {
    const database = await initDB();
    
    const questions = [];
    const stmt = database.prepare('SELECT * FROM questions');
    let row;
    while ((row = stmt.get())) {
      questions.push(row);
    }
    stmt.free();
    
    return questions;
  } catch (error) {
    console.error('获取问题失败:', error.message);
    throw error;
  }
}

export async function getQuestionById(id) {
  try {
    const database = await initDB();
    
    const question = database.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    
    return question;
  } catch (error) {
    console.error('获取问题失败:', error.message);
    throw error;
  }
}

export async function saveAnswerRecord(userId, questionId, userAnswer, isCorrect) {
  try {
    const database = await initDB();
    
    const stmt = database.prepare('INSERT INTO answer_records (user_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)');
    stmt.run([userId, questionId, userAnswer, isCorrect ? 1 : 0]);
    stmt.free();
    
    return true;
  } catch (error) {
    console.error('保存答题记录失败:', error.message);
    throw error;
  }
}

export async function getUserRecords(userId) {
  try {
    const database = await initDB();
    
    const records = [];
    const stmt = database.prepare('SELECT * FROM answer_records WHERE user_id = ?');
    let row;
    while ((row = stmt.get(userId))) {
      records.push(row);
    }
    stmt.free();
    
    return records;
  } catch (error) {
    console.error('获取答题记录失败:', error.message);
    throw error;
  }
}

export async function getAllScenarios() {
  try {
    const database = await initDB();
    
    const scenarios = [];
    const stmt = database.prepare('SELECT * FROM training_scenarios');
    let row;
    while ((row = stmt.get())) {
      scenarios.push(row);
    }
    stmt.free();
    
    return scenarios;
  } catch (error) {
    console.error('获取训练场景失败:', error.message);
    throw error;
  }
}

export async function getScenarioById(id) {
  try {
    const database = await initDB();
    
    const scenario = database.prepare('SELECT * FROM training_scenarios WHERE id = ?').get(id);
    
    if (scenario) {
      const options = [];
      const stmt = database.prepare('SELECT * FROM scenario_options WHERE scenario_id = ?');
      let row;
      while ((row = stmt.get(id))) {
        options.push(row);
      }
      stmt.free();
      scenario.options = options;
    }
    
    return scenario;
  } catch (error) {
    console.error('获取训练场景失败:', error.message);
    throw error;
  }
}

export async function saveTrainingRecord(userId, scenarioId, selectedOption, score) {
  try {
    const database = await initDB();
    
    const stmt = database.prepare('INSERT INTO training_records (user_id, scenario_id, selected_option, score) VALUES (?, ?, ?, ?)');
    stmt.run([userId, scenarioId, selectedOption, score]);
    stmt.free();
    
    return true;
  } catch (error) {
    console.error('保存训练记录失败:', error.message);
    throw error;
  }
}

export async function getUserTrainingRecords(userId) {
  try {
    const database = await initDB();
    
    const records = [];
    const stmt = database.prepare('SELECT * FROM training_records WHERE user_id = ?');
    let row;
    while ((row = stmt.get(userId))) {
      records.push(row);
    }
    stmt.free();
    
    return records;
  } catch (error) {
    console.error('获取训练记录失败:', error.message);
    throw error;
  }
}
