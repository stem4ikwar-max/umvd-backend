const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Отдаём статические файлы из корня
app.use(express.static(__dirname));

// Простая база данных в памяти (для теста)
let users = [];
let boardNodes = [
  { id: '1', type: 'folder', title: 'Руководство УМВД', x: 100, y: 100 },
  { id: '2', type: 'doc', title: 'Приказ №1', code: 'УМВД-001', bodyHtml: 'Текст приказа...', author: 'Павел Аграбейко', role: 'Начальник УМВД', x: 350, y: 100, parentId: '1' }
];
let currentUser = null;

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Авторизация и регистрация
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: 'Заполните все поля' });
  
  const existing = users.find(u => u.username === username);
  if (existing) return res.json({ success: false, error: 'Пользователь уже существует' });

  const newUser = {
    id: Date.now(),
    username,
    password,
    role: users.length === 0 ? 'ADMIN' : 'USER', // Первый зарегистрированный — админ
    is_leader: users.length === 0
  };
  users.push(newUser);
  currentUser = newUser;
  res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.json({ success: false, error: 'Неверный логин или пароль' });

  currentUser = user;
  res.json({ success: true, user });
});

app.get('/api/me', (req, res) => {
  if (currentUser) {
    res.json({ loggedIn: true, user: currentUser });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/api/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// Доска документов
app.get('/api/board', (req, res) => {
  res.json(boardNodes);
});

app.post('/api/board', (req, res) => {
  if (req.body.nodes) {
    boardNodes = req.body.nodes;
  }
  res.json({ success: true });
});

// Лидерские бланки
app.get('/api/leader/templates', (req, res) => {
  res.json([
    { id: 't1', title: 'Постановление о возбуждении', code: 'УМВД-П-01', bodyHtml: '<b>Установил:</b> ...<br><b>Решил:</b> ...', role: 'Следователь' },
    { id: 't2', title: 'Приказ о назначении', code: 'УМВД-ПР-02', bodyHtml: 'Назначить сотрудника...', role: 'Начальник УМВД' }
  ]);
});

// Админ-панель
app.get('/api/admin/users', (req, res) => {
  res.json(users);
});

app.post('/api/admin/update-user', (req, res) => {
  const { id, role, is_leader } = req.body;
  const user = users.find(u => u.id === id);
  if (user) {
    user.role = role;
    user.is_leader = is_leader;
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
