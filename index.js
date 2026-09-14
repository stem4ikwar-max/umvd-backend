const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация БД
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Ошибка подключении к БД:', err);
  else console.log('База данных SQLite подключена.');
});

db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'USER',
    is_leader INTEGER DEFAULT 0
  )`);

  // Таблица структуры доски и документов
  db.run(`CREATE TABLE IF NOT EXISTS board_nodes (
    id TEXT PRIMARY KEY,
    data TEXT
  )`);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

app.use(session({
  secret: 'umvd_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Проверка авторизации
function checkAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Необходима авторизация' });
  next();
}

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Ошибка БД' });

    const isFirstUser = row.count === 0;
    const role = isFirstUser ? 'ADMIN' : 'USER';
    const isLeader = isFirstUser ? 1 : 0;
    const hash = bcrypt.hashSync(password, 10);

    db.run("INSERT INTO users (username, password, role, is_leader) VALUES (?, ?, ?, ?)", 
      [username, hash, role, isLeader], function(err) {
        if (err) return res.status(400).json({ error: 'Пользователь уже существует' });
        
        req.session.user = { id: this.lastID, username, role, is_leader: isLeader };
        res.json({ success: true, user: req.session.user });
      });
  });
});

// Авторизация
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Неверный логин или пароль' });

    if (bcrypt.compareSync(password, user.password)) {
      req.session.user = { id: user.id, username: user.username, role: user.role, is_leader: user.is_leader };
      res.json({ success: true, user: req.session.user });
    } else {
      res.status(400).json({ error: 'Неверный логин или пароль' });
    }
  });
});

// Выход
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Получить текущего сессионного юзера
app.get('/api/me', (req, res) => {
  if (req.session.user) {
    db.get("SELECT id, username, role, is_leader FROM users WHERE id = ?", [req.session.user.id], (err, user) => {
      if (user) {
        req.session.user = user;
        res.json({ loggedIn: true, user });
      } else res.json({ loggedIn: false });
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// АДМИНКА: получение всех юзеров
app.get('/api/admin/users', checkAuth, (req, res) => {
  if (req.session.user.role !== 'ADMIN') return res.status(403).json({ error: 'Ограничение доступа' });
  db.all("SELECT id, username, role, is_leader FROM users", [], (err, rows) => {
    res.json(rows || []);
  });
});

// АДМИНКА: Выдать / Забрать Лидерку
app.post('/api/admin/toggle-leader', checkAuth, (req, res) => {
  if (req.session.user.role !== 'ADMIN') return res.status(403).json({ error: 'Ограничение доступа' });
  const { userId, isLeader } = req.body;
  db.run("UPDATE users SET is_leader = ? WHERE id = ?", [isLeader ? 1 : 0, userId], function(err) {
    res.json({ success: true });
  });
});

// Загрузить доску
app.get('/api/board', checkAuth, (req, res) => {
  db.all("SELECT * FROM board_nodes", [], (err, rows) => {
    const data = rows.map(r => JSON.parse(r.data));
    res.json(data);
  });
});

// Сохранить доску
app.post('/api/board', checkAuth, (req, res) => {
  const { nodes } = req.body;
  db.serialize(() => {
    db.run("DELETE FROM board_nodes");
    const stmt = db.prepare("INSERT INTO board_nodes VALUES (?, ?)");
    nodes.forEach(node => {
      stmt.run(node.id, JSON.stringify(node));
    });
    stmt.finalize();
    res.json({ success: true });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
