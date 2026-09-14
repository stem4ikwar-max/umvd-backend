let currentUser = null;
let boardNodes = [];
let leaderTemplates = [];
let currentEditingDoc = null;
let currentCreateType = 'folder';

// --- ИНИЦИАЛИЗАЦИЯ И АВТОРИЗАЦИЯ ---
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

function switchAuthTab(type) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${type}`).classList.add('active');
  document.getElementById('auth-title').innerText = type === 'login' ? 'Вход в систему' : 'Регистрация';
  document.getElementById('auth-submit-btn').innerText = type === 'login' ? 'Войти' : 'Зарегистрироваться';
}

async function submitAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const isLogin = document.getElementById('tab-login').classList.contains('active');
  const endpoint = isLogin ? '/api/login' : '/api/register';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (!data.success) return alert(data.error);

  currentUser = data.user;
  showBoard();
}

async function checkAuth() {
  const res = await fetch('/api/me');
  const data = await res.json();
  if (data.loggedIn) {
    currentUser = data.user;
    showBoard();
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-dropdown');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function showBoard() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('board-viewport').style.display = 'block';

  document.getElementById('avatar-btn').innerText = currentUser.username[0].toUpperCase();
  document.getElementById('prof-name').innerText = currentUser.username;
  document.getElementById('prof-role').innerText = currentUser.role;
  document.getElementById('prof-uid').innerText = `UID: ${currentUser.id}`;

  if (currentUser.is_leader || currentUser.role === 'ADMIN') {
    document.getElementById('leader-tools').style.display = 'flex';
  }
  if (currentUser.role === 'ADMIN') {
    document.getElementById('btn-top-admin').style.display = 'inline-block';
  }

  loadBoard();
}

// --- ДОСКА И ЭЛЕМЕНТЫ ---
async function loadBoard() {
  const res = await fetch('/api/board');
  boardNodes = await res.json();
  renderBoard();
}

function renderBoard() {
  const container = document.getElementById('board-container');
  container.querySelectorAll('.board-card').forEach(c => c.remove());

  boardNodes.forEach(node => {
    const card = document.createElement('div');
    card.className = `board-card ${node.type}`;
    card.style.cssText = `position:absolute; left:${node.x || 100}px; top:${node.y || 100}px; background:#15181e; border:1px solid #282d37; padding:12px; border-radius:8px; color:#fff; cursor:pointer; width:160px;`;
    
    card.innerHTML = `
      <div style="font-weight:bold; font-size:0.9rem;">${node.type === 'folder' ? '📁' : '📄'} ${node.title}</div>
      ${node.code ? `<div style="font-size:0.75rem; color:#60a5fa;">${node.code}</div>` : ''}
    `;

    if (node.type === 'doc') {
      card.onclick = () => openEditor(node);
    }

    container.appendChild(card);
  });
}

function openCreateModal(type) {
  currentCreateType = type;
  document.getElementById('create-modal-title').innerText = type === 'folder' ? 'Создать Отдел' : 'Создать Документ';
  document.getElementById('create-modal').style.display = 'flex';
}

function closeCreateModal() {
  document.getElementById('create-modal').style.display = 'none';
  document.getElementById('create-node-name').value = '';
}

async function submitCreateNode() {
  const name = document.getElementById('create-node-name').value.trim();
  if (!name) return alert('Введите название');

  const newNode = {
    id: Date.now().toString(),
    type: currentCreateType,
    title: name,
    x: 150 + Math.random() * 200,
    y: 150 + Math.random() * 200
  };

  if (currentCreateType === 'doc') {
    newNode.code = 'УМВД-DOC';
    newNode.author = currentUser.username;
    newNode.role = currentUser.role;
    newNode.sections = [{ title: 'Без заголовка', text: 'Текст документа...' }];
  }

  boardNodes.push(newNode);
  await fetch('/api/board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: boardNodes })
  });

  closeCreateModal();
  renderBoard();
}

function resetZoom() {
  document.getElementById('board-container').scrollTo(0, 0);
}

// --- ПАНЕЛЬ ЛИДЕРА И БЛАНКИ ---
async function openLeaderModal() {
  const res = await fetch('/api/leader/templates');
  leaderTemplates = await res.json();
  renderLeaderModal();
  document.getElementById('leader-modal').style.display = 'flex';
}

function renderLeaderModal() {
  const tbody = document.getElementById('leader-docs-list');
  tbody.innerHTML = leaderTemplates.map((t, index) => `
    <tr style="border-bottom:1px solid #282d37;">
      <td style="padding:8px;">${t.title}</td>
      <td style="padding:8px; color:#60a5fa;">${t.code}</td>
      <td style="padding:8px; text-align:right;">
        <button class="btn-tool" onclick="editLeaderTemplate(${index})">✏️ Изменить</button>
      </td>
    </tr>
  `).join('');
}

async function addNewLeaderTemplate() {
  const title = prompt('Название нового бланка:');
  if (!title) return;

  leaderTemplates.push({
    id: 't_' + Date.now(),
    title: title,
    code: 'УМВД-БЛАНК',
    role: 'Сотрудник',
    sections: [{ title: 'Без заголовка', text: 'Текст бланка...' }]
  });

  await saveLeaderTemplates();
  renderLeaderModal();
}

function editLeaderTemplate(index) {
  document.getElementById('leader-modal').style.display = 'none';
  openEditor(leaderTemplates[index], true);
}

async function saveLeaderTemplates() {
  await fetch('/api/leader/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templates: leaderTemplates })
  });
}

// --- РЕДАКТОР ДОКУМЕНТА ---
function openEditor(doc, isTemplate = false) {
  currentEditingDoc = { ...doc, isTemplate };
  document.getElementById('editor-modal').style.display = 'flex';

  document.getElementById('inp-code').value = doc.code || '';
  document.getElementById('inp-author').value = doc.author || currentUser.username;
  document.getElementById('inp-role').value = doc.role || currentUser.role;

  document.getElementById('leader-img-upload').style.display = (currentUser.is_leader || currentUser.role === 'ADMIN') ? 'block' : 'none';

  const container = document.getElementById('sections-container');
  container.innerHTML = '';
  (doc.sections || []).forEach(sec => addSectionBlock(sec.title, sec.text));

  renderPaper();
}

function addSectionBlock(title, text) {
  const container = document.getElementById('sections-container');
  const div = document.createElement('div');
  div.className = 'section-block';
  div.innerHTML = `
    <div class="section-header">
      <span class="section-title">${title}</span>
      <button class="btn-remove-sec" onclick="this.parentElement.parentElement.remove(); renderPaper();">Удалить</button>
    </div>
    <textarea class="sec-textarea" oninput="renderPaper()">${text}</textarea>
  `;
  container.appendChild(div);
  renderPaper();
}

function renderPaper() {
  if (!currentEditingDoc) return;

  document.getElementById('p-code').innerText = document.getElementById('inp-code').value;
  document.getElementById('p-author').innerText = document.getElementById('inp-author').value;
  document.getElementById('p-role').innerText = document.getElementById('inp-role').value;

  const sectionsRender = document.getElementById('paper-sections-render');
  sectionsRender.innerHTML = '';

  const blocks = document.querySelectorAll('.section-block');
  blocks.forEach(b => {
    const title = b.querySelector('.section-title').innerText;
    const text = b.querySelector('.sec-textarea').value;
    
    const secDiv = document.createElement('div');
    secDiv.style.marginBottom = '12px';
    secDiv.innerHTML = `
      ${title !== 'Без заголовка' ? `<strong style="display:block; text-transform:uppercase; margin-bottom:4px;">${title}:</strong>` : ''}
      <div style="text-indent: 20px;">${text}</div>
    `;
    sectionsRender.appendChild(secDiv);
  });
}

function uploadImageFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const imgContainer = document.getElementById('images-container');
    imgContainer.innerHTML = `<img src="${e.target.result}" style="position:absolute; bottom:30px; right:30px; max-width:120px; opacity:0.8;">`;
  };
  reader.readAsDataURL(file);
}

async function saveEditorData() {
  const sections = [];
  document.querySelectorAll('.section-block').forEach(b => {
    sections.push({
      title: b.querySelector('.section-title').innerText,
      text: b.querySelector('.sec-textarea').value
    });
  });

  currentEditingDoc.code = document.getElementById('inp-code').value;
  currentEditingDoc.author = document.getElementById('inp-author').value;
  currentEditingDoc.role = document.getElementById('inp-role').value;
  currentEditingDoc.sections = sections;

  if (currentEditingDoc.isTemplate) {
    const idx = leaderTemplates.findIndex(t => t.id === currentEditingDoc.id);
    if (idx !== -1) leaderTemplates[idx] = currentEditingDoc;
    await saveLeaderTemplates();
    alert('Бланк лидера сохранен!');
  } else {
    const idx = boardNodes.findIndex(n => n.id === currentEditingDoc.id);
    if (idx !== -1) boardNodes[idx] = currentEditingDoc;
    await fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: boardNodes })
    });
    renderBoard();
    alert('Документ сохранен!');
  }

  closeEditorWithoutSaving();
}

function closeEditorWithoutSaving() {
  document.getElementById('editor-modal').style.display = 'none';
  currentEditingDoc = null;
}

function downloadPNG() {
  const paper = document.getElementById('paper-doc');
  html2canvas(paper).then(canvas => {
    const link = document.createElement('a');
    link.download = `${document.getElementById('inp-code').value || 'document'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}

// --- АДМИН-ПАНЕЛЬ ---
async function openAdminModal() {
  const res = await fetch('/api/admin/users');
  const users = await res.json();

  const tbody = document.getElementById('admin-users-list');
  tbody.innerHTML = users.map(u => `
    <tr style="border-bottom:1px solid #282d37;">
      <td style="padding:6px;">${u.id}</td>
      <td style="padding:6px;">${u.username}</td>
      <td style="padding:6px;">
        <select id="role-${u.id}" class="form-control" style="padding:2px; font-size:0.8rem;">
          <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>MEMBER</option>
          <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
      </td>
      <td style="padding:6px; text-align:center;">
        <input type="checkbox" id="leader-${u.id}" ${u.is_leader ? 'checked' : ''}>
      </td>
      <td style="padding:6px; text-align:right;">
        <button class="btn-tool" onclick="saveUserRole(${u.id})">💾</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('admin-modal').style.display = 'flex';
}

async function saveUserRole(userId) {
  const role = document.getElementById(`role-${userId}`).value;
  const is_leader = document.getElementById(`leader-${userId}`).checked;

  const res = await fetch('/api/admin/update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, role, is_leader })
  });

  const data = await res.json();
  if (!data.success) return alert(data.error);

  alert('Права пользователя обновлены!');
}
