const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let users = [];
let boardNodes = [
  { id: '1', type: 'folder', title: 'Руководство УМВД', x: 100, y: 100 },
  { id: '2', type: 'doc', title: 'Приказ №1', code: 'УМВД-001', author: 'Павел Аграбейко', role: 'Начальник УМВД', sections: [{ title: 'Без заголовка', text: 'Текст приказа...' }], x: 350, y: 100, parentId: '1' }
];

let leaderTemplates = [
  { id: 't1', title: 'Постановление о возбуждении', code: 'УМВД-П-01', role: 'Следователь', sections: [{ title: 'Установил', text: 'Текст...' }, { title: 'Решил', text: 'Текст...' }] },
  { id: 't2', title: 'Приказ о назначении', code: 'УМВД-ПР-02', role: 'Начальник УМВД', sections: [{ title: 'Без заголовка', text: 'Назначить сотрудника...' }] }
];

let currentUser = null;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- АВТОРИЗАЦИЯ ---
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
  currentUser = newUser;
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) return res.json({ success: false, error: 'Неверный логин или пароль' });

  currentUser = user;
  res.json({ success: true, user });
});

app.get('/api/me', (req, res) => {
  res.json({ loggedIn: !!currentUser, user: currentUser });
});

app.post('/api/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// --- ДОСКА И БЛАНКИ ---
app.get('/api/board', (req, res) => res.json(boardNodes));
app.post('/api/board', (req, res) => {
  if (req.body.nodes) boardNodes = req.body.nodes;
  res.json({ success: true });
});

app.get('/api/leader/templates', (req, res) => res.json(leaderTemplates));

app.post('/api/leader/templates', (req, res) => {
  if (!currentUser || (!currentUser.is_leader && currentUser.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Только Лидер или Админ может менять бланки!' });
  }
  if (req.body.templates) {
    leaderTemplates = req.body.templates;
  }
  res.json({ success: true });
});

// --- АДМИНКА ---
app.get('/api/admin/users', (req, res) => {
  if (!currentUser || currentUser.role !== 'ADMIN') return res.status(403).json({ error: 'Нет доступа' });
  res.json(users);
});

app.post('/api/admin/update-user', (req, res) => {
  if (!currentUser || currentUser.role !== 'ADMIN') return res.status(403).json({ error: 'Нет доступа' });
  const { id, role, is_leader } = req.body;
  const targetUser = users.find(u => u.id === Number(id));

  if (!targetUser) return res.json({ success: false, error: 'Пользователь не найден' });
  if (targetUser.is_main_admin && (role !== 'ADMIN' || !is_leader)) {
    return res.json({ success: false, error: 'Нельзя снять права у Главного Администратора (UID 1)' });
  }

  targetUser.role = role;
  targetUser.is_leader = Boolean(is_leader);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
