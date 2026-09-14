const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_umvd_2026';

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Доступ запрещён' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) return res.status(500).json({ error: 'Ошибка БД' });

      const role = row.count === 0 ? 'admin' : 'user';

      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
        [username, hashedPassword, role], 
        function(err) {
          if (err) return res.status(400).json({ error: 'Пользователь уже существует' });
          res.json({ success: true, uid: this.lastID, role });
        }
      );
    });
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Пользователь не найден' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Неверный пароль' });

    const token = jwt.sign({ uid: user.uid, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, uid: user.uid, username: user.username, role: user.role });
  });
});

app.post('/api/admin/toggle-leader', authenticateToken, requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Режим лидера изменён администратором' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));