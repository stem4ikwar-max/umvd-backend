const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.json());

// Настройка сессий (куки живут 24 часа)
app.use(session({
  secret: 'umvd_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(__dirname));

let users = [];
let boardNodes = [
  { id: '1', type: 'folder', title: 'Руководство УМВД', color: '#15181e', x: 100, y: 100 },
  { id: '2', type: 'folder', title: 'Следственный Отдел', color: '#15181e', x: 150, y: 280, parentId: '1' },
  { id: '3', type: 'doc', title: 'Постановление №1', code: 'УМВД-001', author: 'Павел Аграбейко', role: 'Начальник УМВД', sections: [{ title: 'Установил', text: 'Текст постановления...' }], color: '#15181e', x: 250, y: 460, parentId: '2' }
];

let leaderTemplates = [
  { id: 't1', title: 'Постановление о возбуждении', code: 'УМВД-П-01', role: 'Следователь', sections: [{ title: 'Установил', text: 'Текст...' }, { title: 'Решил', text: 'Текст...' }] }
];

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполните все поля' });
  if (/[а-яА-ЯёЁ]/.test(username)) return res.json({ success: false, error: 'Логин только на английском!' });
  if (username.length < 6) return res.json({ success: false, error: 'Логин от 6 символов!' });

  const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) return res.json({ success: false, error: 'Логин занят' });

  const isFirstUser = users.length === 0;
  const newUser = {
    id: users.length + 1,
    username,
    password,
    role: isFirstUser ? 'ADMIN' : 'USER',
    is_leader: isFirstUser,
    is_main_admin: isFirstUser
  };

  users.push(newUser);
  req.session.user = newUser;
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.json({ success: false, error: 'Неверный логин или пароль' });

  req.session.user = user;
  res.json({ success: true, user });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/board', (req, res) => res.json(boardNodes));
app.post('/api/board', (req, res) => {
  const u = req.session.user;
  if (!u || (!u.is_leader && u.role !== 'ADMIN')) return res.status(403).json({ error: 'Нет доступа' });
  if (req.body.nodes) boardNodes = req.body.nodes;
  res.json({ success: true });
});

app.get('/api/leader/templates', (req, res) => res.json(leaderTemplates));
app.post('/api/leader/templates', (req, res) => {
  const u = req.session.user;
  if (!u || (!u.is_leader && u.role !== 'ADMIN')) return res.status(403).json({ error: 'Нет доступа' });
  if (req.body.templates) leaderTemplates = req.body.templates;
  res.json({ success: true });
});

app.get('/api/admin/users', (req, res) => {
  const u = req.session.user;
  if (!u || u.role !== 'ADMIN') return res.status(403).json({ error: 'Нет доступа' });
  res.json(users);
});

app.post('/api/admin/update-user', (req, res) => {
  const u = req.session.user;
  if (!u || u.role !== 'ADMIN') return res.json({ success: false, error: 'Только Админ!' });

  const { id, role, is_leader } = req.body;
  const targetUser = users.find(usr => usr.id === Number(id));

  if (!targetUser) return res.json({ success: false, error: 'Пользователь не найден' });
  if (targetUser.is_main_admin && (role !== 'ADMIN' || !is_leader)) {
    return res.json({ success: false, error: 'Нельзя снять права у Главного Администратора' });
  }

  targetUser.role = role;
  targetUser.is_leader = Boolean(is_leader);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
