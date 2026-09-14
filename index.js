const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Отдаем статические файлы (index.html, app.js, style.css) прямо из корня проекта
app.use(express.static(__dirname));

// При заходе на главную отдаем index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера (например, для Render/Heroku или локально)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
