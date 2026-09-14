const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'umvd-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Ошибка БД:', err.message);
  else console.log('Подключено к базе данных SQLite.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'USER',
    is_leader INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS board_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS leader_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    code TEXT,
    bodyHtml TEXT,
    role TEXT
  )`);

  // Создание администратора по умолчанию
  db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT INTO users (username, password, role, is_leader) VALUES (?, ?, 'ADMIN', 1)`, ['admin', hash]);
    }
  });

  // Заполнение базовых шаблонов бланков
  db.get(`SELECT COUNT(*) as count FROM leader_templates`, [], (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO leader_templates (title, code, bodyHtml, role) VALUES 
        ('ПОСТАНОВЛЕНИЕ', 'УМВД-RES-001', 'О назначении внеплановой проверки личного состава УМВД.', 'Начальник УМВД'),
        ('ПРИКАЗ', 'УМВД-ORD-002', 'О присвоении очередного специального звания.', 'Генерал-майор полиции')`);
    }
  });
});

// Middleware проверки авторизации
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Необходима авторизация' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Доступ запрещен (требуются права Admin)' });
  }
  next();
}

// API Маршруты
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполните все поля' });

  const hash = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
    if (err) return res.json({ success: false, error: 'Пользователь уже существует' });
    req.session.user = { id: this.lastID, username, role: 'USER', is_leader: 0 };
    res.json({ success: true, user: req.session.user });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.json({ success: false, error: 'Неверный логин или пароль' });
    }
    req.session.user = { id: user.id, username: user.username, role: user.role, is_leader: user.is_leader };
    res.json({ success: true, user: req.session.user });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) {
    db.get(`SELECT id, username, role, is_leader FROM users WHERE id = ?`, [req.session.user.id], (err, user) => {
      if (user) {
        req.session.user = user;
        return res.json({ loggedIn: true, user });
      }
      res.json({ loggedIn: false });
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Работа с доской
app.get('/api/board', requireAuth, (req, res) => {
  db.get(`SELECT content FROM board_data WHERE id = 1`, [], (err, row) => {
    if (row && row.content) res.json(JSON.parse(row.content));
    else res.json([]);
  });
});

app.post('/api/board', requireAuth, (req, res) => {
  const isLeaderOrAdmin = req.session.user.is_leader || req.session.user.role === 'ADMIN';
  if (!isLeaderOrAdmin) return res.status(403).json({ error: 'Нет прав на редактирование' });

  const content = JSON.stringify(req.body.nodes || []);
  db.run(`INSERT INTO board_data (id, content) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET content=excluded.content`, [content], (err) => {
    if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
    res.json({ success: true });
  });
});

// Шаблоны Лидера
app.get('/api/leader/templates', requireAuth, (req, res) => {
  db.all(`SELECT * FROM leader_templates`, [], (err, rows) => {
    res.json(rows || []);
  });
});

// Админ-панель
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all(`SELECT id, username, role, is_leader FROM users`, [], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/api/admin/update-user', requireAdmin, (req, res) => {
  const { id, role, is_leader } = req.body;
  db.run(`UPDATE users SET role = ?, is_leader = ? WHERE id = ?`, [role, is_leader ? 1 : 0, id], (err) => {
    res.json({ success: !err });
  });
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
