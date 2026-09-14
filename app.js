let currentUser = null;
let boardNodes = [];
let leaderTemplates = [];
let currentEditingDoc = null;
let currentCreateType = 'folder';
let selectedNodeId = null;

window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.addEventListener('click', () => {
    const menu = document.getElementById('context-menu');
    if (menu) menu.style.display = 'none';
  });
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

  const res = await fetch(isLogin ? '/api/login' : '/api/register', {
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

async function loadBoard() {
  const res = await fetch('/api/board');
  boardNodes = await res.json();
  renderBoard();
}

function renderBoard() {
  const container = document.getElementById('board-container');
  container.querySelectorAll('.board-card').forEach(c => c.remove());

  renderConnections();

  boardNodes.forEach(node => {
    const card = document.createElement('div');
    card.className = `board-card ${node.type}`;
    card.style.cssText = `
      position:absolute; left:${node.x || 100}px; top:${node.y || 100}px; 
      background:${node.color || '#15181e'}; border:1px solid #282d37; 
      padding:12px; border-radius:8px; color:#fff; cursor:pointer; width:160px; z-index:2;
    `;
    
    card.innerHTML = `
      <div style="font-weight:bold; font-size:0.9rem;">${node.type === 'folder' ? '📁' : '📄'} ${node.title}</div>
      ${node.code ? `<div style="font-size:0.75rem; color:#60a5fa;">${node.code}</div>` : ''}
    `;

    card.onclick = (e) => {
      e.stopPropagation();
      if (node.type === 'doc') openEditor(node);
    };

    card.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedNodeId = node.id;
      const menu = document.getElementById('context-menu');
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.display = 'block';
    };

    container.appendChild(card);
  });
}

function renderConnections() {
  const svg = document.getElementById('connections-svg');
  if (!svg) return;
  svg.innerHTML = '';

  boardNodes.forEach(node => {
    if (node.parentId) {
      const parent = boardNodes.find(n => n.id === node.parentId);
      if (parent) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', (parent.x || 100) + 80);
        line.setAttribute('y1', (parent.y || 100) + 20);
        line.setAttribute('x2', (node.x || 100) + 80);
        line.setAttribute('y2', (node.y || 100) + 20);
        line.setAttribute('stroke', '#3b82f6');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4');
        svg.appendChild(line);
      }
    }
  });
}

async function changeNodeColor(color) {
  const node = boardNodes.find(n => n.id === selectedNodeId);
  if (node) {
    node.color = color;
    await saveBoardData();
    renderBoard();
  }
}

async function attachParentPrompt() {
  const folders = boardNodes.filter(n => n.type === 'folder' && n.id !== selectedNodeId);
  if (folders.length === 0) return alert('Нет доступных отделов!');

  const folderNames = folders.map((f, i) => `${i + 1}. ${f.title}`).join('\n');
  const choice = prompt(`Выберите отдел (0 для отвязки):\n${folderNames}`);
  
  if (choice === null) return;
  const idx = parseInt(choice) - 1;

  const node = boardNodes.find(n => n.id === selectedNodeId);
  if (choice === '0') {
    delete node.parentId;
  } else if (folders[idx]) {
    node.parentId = folders[idx].id;
  }

  await saveBoardData();
  renderBoard();
}

async function deleteCurrentNode() {
  if (!confirm('Удалить элемент?')) return;
  boardNodes = boardNodes.filter(n => n.id !== selectedNodeId);
  await saveBoardData();
  renderBoard();
}

async function saveBoardData() {
  await fetch('/api/board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: boardNodes })
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
    color: '#15181e',
    x: 150 + Math.random() * 150,
    y: 150 + Math.random() * 150
  };

  if (currentCreateType === 'doc') {
    newNode.code = 'УМВД-DOC';
    newNode.author = currentUser.username;
    newNode.role = currentUser.role;
    newNode.sections = [{ title: 'Без заголовка', text: 'Текст документа...' }];
  }

  boardNodes.push(newNode);
  await saveBoardData();
  closeCreateModal();
  renderBoard();
}

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

function openEditor(doc, isTemplate = false) {
  currentEditingDoc = { ...doc, isTemplate };
  document.getElementById('editor-modal').style.display = 'flex';

  document.getElementById('inp-code').value = doc.code || '';
  document.getElementById('inp-author').value = doc.author || currentUser.username;
  document.getElementById('inp-role').value = doc.role || currentUser.role;

  const isLeaderOrAdmin = currentUser.is_leader || currentUser.role === 'ADMIN';
  
  document.getElementById('leader-img-upload').style.display = isLeaderOrAdmin ? 'block' : 'none';

  const saveBtn = document.getElementById('btn-save-global');
  if (saveBtn) {
    saveBtn.style.display = isLeaderOrAdmin ? 'block' : 'none';
  }

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

  document.querySelectorAll('.section-block').forEach(b => {
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

async function saveEditorData() {
  if (!currentUser.is_leader && currentUser.role !== 'ADMIN') {
    return alert('Только Лидер или Админ может сохранять изменения для всех!');
  }

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
    alert('Бланк сохранен для всех!');
  } else {
    const idx = boardNodes.findIndex(n => n.id === currentEditingDoc.id);
    if (idx !== -1) boardNodes[idx] = currentEditingDoc;
    await saveBoardData();
    renderBoard();
    alert('Документ сохранен для всех!');
  }

  closeEditorWithoutSaving();
}

function closeEditorWithoutSaving() {
  document.getElementById('editor-modal').style.display = 'none';
  currentEditingDoc = null;
}

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

  alert('Права успешно обновлены!');
}
