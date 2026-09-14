// Инициализация базы данных в localStorage
const defaultAdmin = { id: 1, username: 'Fanchik314G', password: 'Fanchik314G"!', role: 'ADMIN', is_leader: true };

function getUsers() {
  const saved = localStorage.getItem('usersDB');
  if (!saved) {
    localStorage.setItem('usersDB', JSON.stringify([defaultAdmin]));
    return [defaultAdmin];
  }
  return JSON.parse(saved);
}

function saveUsers(users) {
  localStorage.setItem('usersDB', JSON.stringify(users));
}

// Загрузка документов/отделов
function getBoardDocs() {
  const saved = localStorage.getItem('boardDocs');
  return saved ? JSON.parse(saved) : [];
}

function saveBoardDocs(docs) {
  localStorage.setItem('boardDocs', JSON.stringify(docs));
}

let currentUser = null;
let currentAuthMode = 'login';

let currentDocData = {
  id: null,
  code: 'LSPD-MIS-SD-001',
  author: 'Skeptic Drugonight',
  role: 'Chief of the Los Santos Police Department',
  sections: [
    { title: 'Без заголовка', text: 'Я, Skeptic Drugonight, Chief of the Los Santos Police Department, пользуясь своими полномочиями...' },
    { title: 'Установил', text: 'Пример содержимого...' },
    { title: 'Постановил', text: 'Пример содержимого...' },
    { title: 'Решил', text: 'Проголосовать заочно...' }
  ]
};

// Переключение табов входа/регистрации
function switchAuthTab(mode) {
  currentAuthMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${mode}`).classList.add('active');
  document.getElementById('auth-title').innerText = mode === 'login' ? 'Вход в систему' : 'Регистрация';
  document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
}

// Вход / Регистрация
function submitAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const users = getUsers();

  if (!username || !password) {
    return alert('Заполните все поля!');
  }

  if (currentAuthMode === 'login') {
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return alert('Ошибка: Аккаунт не найден или неверный пароль!');
    }
    currentUser = user;
  } else {
    if (/[а-яА-ЯёЁ]/.test(username)) {
      return alert('Ошибка: Русские буквы в логине запрещены!');
    }
    if (username.length < 6) {
      return alert('Ошибка: Длина логина должна быть от 6 символов!');
    }
    if (users.some(u => u.username === username)) {
      return alert('Ошибка: Логин уже занят!');
    }

    const newUser = {
      id: users.length + 1,
      username: username,
      password: password,
      role: 'USER',
      is_leader: false
    };
    users.push(newUser);
    saveUsers(users);
    currentUser = newUser;
  }

  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('board-viewport').style.display = 'block';
  
  updateProfileUI();
  renderBoard();
}

// Выход
function logout() {
  currentUser = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('board-viewport').style.display = 'none';
  document.getElementById('profile-dropdown').style.display = 'none';
}

function toggleProfileMenu() {
  const dropdown = document.getElementById('profile-dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function updateProfileUI() {
  if (!currentUser) return;

  document.getElementById('prof-name').innerText = currentUser.username;
  document.getElementById('prof-role').innerText = currentUser.role === 'ADMIN' ? 'Главный Администратор' : (currentUser.is_leader ? 'Лидер' : 'Пользователь');
  document.getElementById('prof-uid').innerText = `UID: ${currentUser.id}`;
  document.getElementById('avatar-btn').innerText = currentUser.username.charAt(0).toUpperCase();

  const isPowerUser = currentUser.role === 'ADMIN' || currentUser.is_leader;
  document.getElementById('leader-tools').style.display = isPowerUser ? 'flex' : 'none';
  document.getElementById('btn-top-admin').style.display = currentUser.role === 'ADMIN' ? 'block' : 'none';
}

// --- ОТРИСОВКА ДОСКИ / ОТДЕЛОВ / ДОКУМЕНТОВ ---
function renderBoard() {
  const board = document.getElementById('board-container');
  if (!board) return;

  const docs = getBoardDocs();
  board.innerHTML = '';

  if (docs.length === 0) {
    board.innerHTML = '<div style="color:#6b7280; text-align:center; margin-top:50px;">Нет созданных документов. Нажмите "+ Создать документ"</div>';
    return;
  }

  docs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'section-block';
    card.style.cursor = 'pointer';
    card.style.margin = '10px';
    card.style.padding = '15px';
    card.style.background = '#15181e';

    card.innerHTML = `
      <div style="font-weight:bold; color:#60a5fa;">${doc.code}</div>
      <div style="font-size:0.85rem; color:#ccc; margin-top:4px;">${doc.role} — ${doc.author}</div>
      <button class="btn-tool" style="margin-top:8px; font-size:0.75rem;" onclick="openEditorForEdit(${doc.id})">👁️ Открыть документ</button>
    `;
    board.appendChild(card);
  });
}

// Открытие редактора для создания
function openEditor() {
  currentDocData = {
    id: Date.now(),
    code: 'LSPD-MIS-SD-001',
    author: currentUser ? currentUser.username : 'Skeptic Drugonight',
    role: 'Chief of the Los Santos Police Department',
    sections: [
      { title: 'Без заголовка', text: 'Введите текст...' }
    ]
  };

  document.getElementById('inp-code').value = currentDocData.code;
  document.getElementById('inp-author').value = currentDocData.author;
  document.getElementById('inp-role').value = currentDocData.role;

  document.getElementById('editor-modal').style.display = 'flex';
  renderSectionBlocks();
}

// Открытие редактора для просмотра/редактирования
function openEditorForEdit(docId) {
  const docs = getBoardDocs();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;

  currentDocData = JSON.parse(JSON.stringify(doc));

  document.getElementById('inp-code').value = currentDocData.code;
  document.getElementById('inp-author').value = currentDocData.author;
  document.getElementById('inp-role').value = currentDocData.role;

  document.getElementById('editor-modal').style.display = 'flex';
  renderSectionBlocks();
}

function closeEditor() {
  document.getElementById('editor-modal').style.display = 'none';
}

// Сохранение документа в общую базу
function saveCurrentDoc() {
  const docs = getBoardDocs();
  const index = docs.findIndex(d => d.id === currentDocData.id);

  currentDocData.code = document.getElementById('inp-code').value;
  currentDocData.author = document.getElementById('inp-author').value;
  currentDocData.role = document.getElementById('inp-role').value;

  if (index !== -1) {
    docs[index] = currentDocData;
  } else {
    docs.push(currentDocData);
  }

  saveBoardDocs(docs);
  alert('Документ успешно сохранен!');
  closeEditor();
  renderBoard();
}

// --- УПРАВЛЕНИЕ СЕКЦИЯМИ БЛАНКА ---
function renderSectionBlocks() {
  const container = document.getElementById('sections-container');
  container.innerHTML = '';

  currentDocData.sections.forEach((sec, idx) => {
    const block = document.createElement('div');
    block.className = 'section-block';
    block.innerHTML = `
      <div class="section-header">
        <span class="section-title">${idx + 1}. ${sec.title}</span>
        <button class="btn-remove-sec" onclick="removeSectionBlock(${idx})">👁 Убрать</button>
      </div>
      <textarea class="sec-textarea" oninput="updateSectionText(${idx}, this.value)">${sec.text}</textarea>
    `;
    container.appendChild(block);
  });
  renderPaper();
}

function addSectionBlock(title, text) {
  currentDocData.sections.push({ title, text });
  renderSectionBlocks();
}

function removeSectionBlock(index) {
  currentDocData.sections.splice(index, 1);
  renderSectionBlocks();
}

function updateSectionText(index, val) {
  currentDocData.sections[index].text = val;
  renderPaper();
}

function renderPaper() {
  document.getElementById('p-code').innerText = document.getElementById('inp-code').value || 'LSPD-MIS-SD-001';
  document.getElementById('p-author').innerText = document.getElementById('inp-author').value || 'Skeptic Drugonight';
  document.getElementById('p-role').innerText = document.getElementById('inp-role').value || 'Chief of the Los Santos Police Department';

  const paperRender = document.getElementById('paper-sections-render');
  paperRender.innerHTML = '';

  currentDocData.sections.forEach(sec => {
    const secDiv = document.createElement('div');
    secDiv.style.marginBottom = '12px';
    
    if (sec.title && sec.title !== 'Без заголовка') {
      secDiv.innerHTML = `<div style="text-align:center; font-weight:bold; margin:8px 0; text-transform: lowercase;">${sec.title}:</div>`;
    }
    secDiv.innerHTML += `<div style="text-align:justify; white-space:pre-line;">${sec.text}</div>`;
    paperRender.appendChild(secDiv);
  });
}

// Модалки Админки и Лидеров
function openLeaderModal() { 
  document.getElementById('leader-modal').style.display = 'flex'; 
}

function openAdminModal() {
  if (currentUser.role !== 'ADMIN') return;
  const list = document.getElementById('admin-users-list');
  list.innerHTML = '';
  const users = getUsers();

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #282d37';
    tr.innerHTML = `
      <td style="padding:6px;">${user.id}</td>
      <td style="padding:6px;">${user.username}</td>
      <td style="padding:6px; color:#60a5fa;">${user.role}</td>
      <td style="padding:6px;">${user.is_leader ? '👑 Да' : 'Нет'}</td>
      <td style="padding:6px; text-align:right;">
        ${user.id !== 1 ? `<button class="btn-tool" style="font-size:0.75rem;" onclick="toggleLeader(${user.id})">${user.is_leader ? 'Снять Лидера' : 'Выдать Лидерку'}</button>` : '<i>Главный Админ</i>'}
      </td>
    `;
    list.appendChild(tr);
  });

  document.getElementById('admin-modal').style.display = 'flex';
}

function toggleLeader(userId) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.is_leader = !user.is_leader;
    saveUsers(users);
    openAdminModal();
    if (currentUser.id === user.id) {
      currentUser = user;
      updateProfileUI();
    }
  }
}

function resetZoom() {
  alert('Зум сброшен');
}

function downloadPNG() {
  const paper = document.getElementById('paper-doc');
  html2canvas(paper).then(canvas => {
    const link = document.createElement('a');
    link.download = 'document.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}
