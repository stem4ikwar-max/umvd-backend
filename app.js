let currentUser = null;
let currentDocData = {
  code: 'LSPD-MIS-SD-001',
  author: 'Павел Аграбейко',
  role: 'Начальник УМВД',
  sections: [
    { title: 'Без заголовка', text: 'Я, Skeptic Drugonight, Chief of the Los Santos Police Department...' },
    { title: 'Установил', text: 'Пример содержимого...' },
    { title: 'Постановил', text: 'Пример содержимого...' },
    { title: 'Решил', text: 'Проголосовать заочно...' }
  ]
};

// Переключение вкладок Вход / Регистрация
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById('auth-title').innerText = tab === 'login' ? 'Вход в систему' : 'Регистрация';
  document.getElementById('auth-submit-btn').innerText = tab === 'login' ? 'Войти' : 'Зарегистрироваться';
}

// Авторизация
function submitAuth() {
  const user = document.getElementById('auth-username').value.trim();
  if (!user) return alert('Введите логин!');

  currentUser = {
    id: 101,
    username: user,
    role: user.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
    is_leader: true // Включено для теста прав редактора
  };

  document.getElementById('auth-screen').style.display = 'none';
  updateProfileUI();
}

// Выход
function logout() {
  currentUser = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('profile-dropdown').style.display = 'none';
}

// Обновление профиля
function updateProfileUI() {
  if (!currentUser) return;
  document.getElementById('prof-name').innerText = currentUser.username;
  document.getElementById('prof-role').innerText = currentUser.role === 'ADMIN' ? 'Администратор' : (currentUser.is_leader ? 'Лидер' : 'Пользователь');
  document.getElementById('prof-uid').innerText = `UID: ${currentUser.id}`;

  const isPowerUser = currentUser.role === 'ADMIN' || currentUser.is_leader;
  document.getElementById('leader-tools').style.display = isPowerUser ? 'flex' : 'none';
  document.getElementById('btn-top-admin').style.display = currentUser.role === 'ADMIN' ? 'block' : 'none';
  document.getElementById('leader-img-upload').style.display = isPowerUser ? 'block' : 'none';
  document.getElementById('btn-save-doc').style.display = isPowerUser ? 'block' : 'none';
  document.getElementById('avatar-btn').innerText = currentUser.username.charAt(0).toUpperCase();
}

// Переключение меню профиля
function toggleProfileMenu() {
  const dropdown = document.getElementById('profile-dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// Управление модальными окнами
function openLeaderModal() { document.getElementById('leader-modal').style.display = 'flex'; }
function openAdminModal() { document.getElementById('admin-modal').style.display = 'flex'; }
function openEditor() { 
  document.getElementById('editor-modal').style.display = 'flex';
  renderSectionBlocks();
}
function closeEditor() { document.getElementById('editor-modal').style.display = 'none'; }
function resetZoom() { alert('Зум сброшен'); }

// Логика секций документа
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

// Отрисовка бумажного бланка
function renderPaper() {
  document.getElementById('p-code').innerText = document.getElementById('inp-code').value || 'LSPD-MIS-SD-001';
  document.getElementById('p-author').innerText = document.getElementById('inp-author').value || 'П. Аграбейко';
  document.getElementById('p-role').innerText = document.getElementById('inp-role').value || 'Начальник УМВД';

  const paperRender = document.getElementById('paper-sections-render');
  paperRender.innerHTML = '';

  currentDocData.sections.forEach(sec => {
    const secDiv = document.createElement('div');
    secDiv.style.marginBottom = '12px';
    
    if (sec.title && sec.title !== 'Без заголовка') {
      secDiv.innerHTML = `<div style="text-align:center; font-weight:bold; margin:8px 0;">${sec.title.toLowerCase()}:</div>`;
    }
    secDiv.innerHTML += `<div style="text-align:justify; white-space:pre-line;">${sec.text}</div>`;
    paperRender.appendChild(secDiv);
  });
}

// Скачивание PNG
function downloadPNG() {
  const paper = document.getElementById('paper-doc');
  html2canvas(paper).then(canvas => {
    const link = document.createElement('a');
    link.download = 'document.png';
    link.href = canvas.toDataURL();
    link.click();
  });
}
