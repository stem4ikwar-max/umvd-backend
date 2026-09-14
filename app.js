// База пользователей (UID 1 - Главный Админ)
let usersDB = [
  { id: 1, username: 'Fanchik314G', password: '123', role: 'ADMIN', is_leader: true }
];

let currentUser = null;
let currentAuthMode = 'login';

let currentDocData = {
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

// Вкладки авторизации
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

  if (!username || !password) return alert('Заполните все поля!');

  if (currentAuthMode === 'login') {
    const user = usersDB.find(u => u.username === username && u.password === password);
    if (!user) return alert('Неверный логин или пароль!');
    currentUser = user;
  } else {
    if (usersDB.some(u => u.username === username)) return alert('Логин уже занят!');
    const newUser = {
      id: usersDB.length + 1, // UID начинается с 2, 3 и т.д.
      username: username,
      password: password,
      role: 'USER',
      is_leader: false
    };
    usersDB.push(newUser);
    currentUser = newUser;
  }

  document.getElementById('auth-screen').style.display = 'none';
  updateProfileUI();
}

// Выход
function logout() {
  currentUser = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('profile-dropdown').style.display = 'none';
}

// Переключение профиля
function toggleProfileMenu() {
  const dropdown = document.getElementById('profile-dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Отрисовка профиля и прав
function updateProfileUI() {
  if (!currentUser) return;

  document.getElementById('prof-name').innerText = currentUser.username;
  document.getElementById('prof-role').innerText = currentUser.role === 'ADMIN' ? 'Администратор' : (currentUser.is_leader ? 'Лидер' : 'Пользователь');
  document.getElementById('prof-uid').innerText = `UID: ${currentUser.id}`;
  document.getElementById('avatar-btn').innerText = currentUser.username.charAt(0).toUpperCase();

  const isPowerUser = currentUser.role === 'ADMIN' || currentUser.is_leader;
  
  document.getElementById('leader-tools').style.display = isPowerUser ? 'flex' : 'none';
  document.getElementById('btn-top-admin').style.display = currentUser.role === 'ADMIN' ? 'block' : 'none';
  document.getElementById('leader-img-upload').style.display = isPowerUser ? 'block' : 'none';
  document.getElementById('btn-save-doc').style.display = isPowerUser ? 'block' : 'none';
}

// Модалки
function openLeaderModal() { 
  document.getElementById('leader-modal').style.display = 'flex'; 
}

function openAdminModal() {
  if (currentUser.role !== 'ADMIN') return;
  const list = document.getElementById('admin-users-list');
  list.innerHTML = '';

  usersDB.forEach(user => {
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
  const user = usersDB.find(u => u.id === userId);
  if (user) {
    user.is_leader = !user.is_leader;
    openAdminModal();
    if (currentUser.id === user.id) updateProfileUI();
  }
}

// Открытие редактора
function openEditor() {
  document.getElementById('editor-modal').style.display = 'flex';
  renderSectionBlocks();
}

function closeEditor() {
  document.getElementById('editor-modal').style.display = 'none';
}

function resetZoom() {
  alert('Зум сброшен');
}

// Логика блоков
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

// Отрисовка бланка
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

function downloadPNG() {
  const paper = document.getElementById('paper-doc');
  html2canvas(paper).then(canvas => {
    const link = document.createElement('a');
    link.download = 'document.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}
