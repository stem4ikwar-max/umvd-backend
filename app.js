let currentUser = null, store = [], currentAuthMode = 'login';
let scale = 0.8, panX = window.innerWidth / 5, panY = window.innerHeight / 5;
let editingDocId = null, currentImages = [];
let selectedNodeForCtx = null, linkingSourceNode = null, targetCreateType = 'folder';

const colors = ['#1a1d24', '#1e3a8a', '#065f46', '#991b1b', '#854d0e', '#5b21b6', '#831843', '#134e4a', '#312e81', '#3f6212'];

const board = document.getElementById('board-container');
const svg = document.getElementById('connections-svg');
const contextMenu = document.getElementById('context-menu');

const palette = document.getElementById('color-palette');
if (palette) {
  colors.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.backgroundColor = c;
    dot.onclick = () => setNodeColor(c);
    palette.appendChild(dot);
  });
}

function switchAuthTab(mode) {
  currentAuthMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
}

async function submitAuth() {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const res = await fetch(currentAuthMode === 'login' ? '/api/login' : '/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) checkAuthStatus();
  else alert(data.error || 'Ошибка');
}

async function checkAuthStatus() {
  const res = await fetch('/api/me');
  const data = await res.json();
  if (data.loggedIn) {
    currentUser = data.user;
    document.getElementById('auth-screen').style.display = 'none';
    setupProfileUI();
    loadBoard();
  }
}

function setupProfileUI() {
  document.getElementById('avatar-btn').innerText = currentUser.username.charAt(0).toUpperCase();
  document.getElementById('prof-name').innerText = currentUser.username;
  document.getElementById('prof-role').innerText = currentUser.role === 'ADMIN' ? 'Администратор' : (currentUser.is_leader ? 'Лидер' : 'Пользователь');

  if (currentUser.is_leader || currentUser.role === 'ADMIN') {
    document.getElementById('leader-tools').style.display = 'flex';
    document.getElementById('leader-color-menu').style.display = 'flex';
    document.getElementById('leader-img-upload').style.display = 'block';
  }
  if (currentUser.role === 'ADMIN') {
    document.getElementById('btn-admin-modal').style.display = 'block';
  }
}

async function loadBoard() {
  const res = await fetch('/api/board');
  store = await res.json();
  updateTransform(); renderBoard();
}

async function saveBoard() {
  if (!currentUser.is_leader && currentUser.role !== 'ADMIN') return;
  await fetch('/api/board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodes: store }) });
}

function renderBoard() {
  document.querySelectorAll('.board-node').forEach(el => el.remove());
  store.forEach(node => {
    const div = document.createElement('div');
    div.className = 'board-node';
    div.style.left = node.x + 'px';
    div.style.top = node.y + 'px';
    if (node.bgColor) div.style.backgroundColor = node.bgColor;

    div.innerHTML = `<div class="node-type">${node.type === 'doc' ? '📄 Документ' : '📁 Отдел'}</div><div class="node-title">${node.title}</div>`;

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      selectedNodeForCtx = node;
      contextMenu.style.left = e.clientX + 'px'; contextMenu.style.top = e.clientY + 'px';
      contextMenu.style.display = 'block';
    });

    div.addEventListener('click', (e) => {
      e.stopPropagation();
      if (linkingSourceNode && linkingSourceNode.id !== node.id) {
        node.parentId = linkingSourceNode.id; saveBoard(); renderBoard(); linkingSourceNode = null; return;
      }
      if (node.type === 'doc') openEditor(node.id);
    });

    if (currentUser.is_leader || currentUser.role === 'ADMIN') {
      div.addEventListener('mousedown', (e) => { if (e.button === 0) startDragNode(e, node); });
    }
    board.appendChild(div);
  });
  drawLines();
}

function drawLines() {
  svg.innerHTML = '';
  store.forEach(node => {
    if (node.parentId) {
      const p = store.find(n => n.id === node.parentId);
      if (p) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const x1 = p.x + 90, y1 = p.y + 30, x2 = node.x + 90, y2 = node.y + 30;
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`);
        path.setAttribute('stroke', '#4b5563'); path.setAttribute('stroke-width', '2'); path.setAttribute('fill', 'none');
        svg.appendChild(path);
      }
    }
  });
}

function setNodeColor(color) {
  if (selectedNodeForCtx) {
    selectedNodeForCtx.bgColor = color;
    saveBoard(); renderBoard();
  }
}

function execCmd(cmd) { document.execCommand(cmd, false, null); updatePaper(); }
function highlightSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'highlight-yellow';
    range.surroundContents(span);
    updatePaper();
  }
}

function toggleSecMenu() {
  const m = document.getElementById('sec-menu');
  m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}
function insertSection(text) {
  const ed = document.getElementById('inp-rich-body');
  ed.innerHTML += `<br><strong>${text}</strong><br>`;
  document.getElementById('sec-menu').style.display = 'none';
  updatePaper();
}

function uploadImageFromFile(e) {
  const file = e.target.files[0];
  if (file) {
    const r = new FileReader();
    r.onload = (evt) => {
      currentImages.push({ url: evt.target.result, x: 200, y: 150 });
      renderDraggableImages();
    };
    r.readAsDataURL(file);
  }
}

function renderDraggableImages() {
  const container = document.getElementById('images-container');
  container.innerHTML = '';
  currentImages.forEach((img) => {
    const imageEl = document.createElement('img');
    imageEl.src = img.url;
    imageEl.className = 'draggable-img';
    imageEl.style.left = img.x + 'px';
    imageEl.style.top = img.y + 'px';
    imageEl.style.width = '100px';

    if (currentUser.is_leader || currentUser.role === 'ADMIN') {
      imageEl.onmousedown = (e) => {
        let shiftX = e.clientX - imageEl.getBoundingClientRect().left;
        let shiftY = e.clientY - imageEl.getBoundingClientRect().top;
        function moveAt(pageX, pageY) {
          const rect = document.getElementById('paper-doc').getBoundingClientRect();
          img.x = pageX - rect.left - shiftX;
          img.y = pageY - rect.top - shiftY;
          imageEl.style.left = img.x + 'px'; imageEl.style.top = img.y + 'px';
        }
        function onMouseMove(e) { moveAt(e.pageX, e.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        document.onmouseup = () => { document.removeEventListener('mousemove', onMouseMove); document.onmouseup = null; };
      };
    }
    container.appendChild(imageEl);
  });
}

function openEditor(id) {
  const doc = store.find(n => n.id === id);
  if (!doc) return;
  editingDocId = id;
  currentImages = doc.images || [];

  document.getElementById('inp-title').value = doc.title || '';
  document.getElementById('inp-code').value = doc.code || '';
  document.getElementById('inp-rich-body').innerHTML = doc.bodyHtml || '';
  document.getElementById('inp-author').value = doc.author || '';
  document.getElementById('inp-role').value = doc.role || '';

  renderDraggableImages();
  updatePaper();
  document.getElementById('editor-modal').style.display = 'flex';
}

function updatePaper() {
  document.getElementById('p-title-head').innerText = (document.getElementById('inp-title').value || 'ДОКУМЕНТ').toUpperCase();
  document.getElementById('p-code').innerText = document.getElementById('inp-code').value || 'УМВД-000';
  document.getElementById('p-body-content').innerHTML = document.getElementById('inp-rich-body').innerHTML;
  
  const rawAuthor = document.getElementById('inp-author').value;
  const parts = rawAuthor.trim().split(/\s+/);
  document.getElementById('p-author').innerText = parts.length >= 2 ? `${parts[0].charAt(0).toUpperCase()}. ${parts[1]}` : (rawAuthor || 'П. Аграбейко');
  document.getElementById('p-role').innerText = document.getElementById('inp-role').value || 'Должность';
}

function saveEditorData() {
  const doc = store.find(n => n.id === editingDocId);
  if (doc) {
    doc.title = document.getElementById('inp-title').value;
    doc.code = document.getElementById('inp-code').value;
    doc.bodyHtml = document.getElementById('inp-rich-body').innerHTML;
    doc.author = document.getElementById('inp-author').value;
    doc.role = document.getElementById('inp-role').value;
    doc.images = currentImages;
    saveBoard(); renderBoard(); alert('Сохранено!');
  }
}

function downloadPNG() {
  const paper = document.getElementById('paper-doc');
  html2canvas(paper, { scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = (document.getElementById('inp-title').value || 'Документ') + '.png';
    a.click();
  });
}

async function openLeaderModal() {
  const res = await fetch('/api/leader/templates');
  const templates = await res.json();
  const list = document.getElementById('leader-docs-list');
  list.innerHTML = '';
  templates.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="padding:8px;">${t.title}</td><td style="padding:8px; text-align:right;"><button class="btn-outline" onclick="applyTemplate('${t.id}')">Применить</button></td>`;
    list.appendChild(tr);
  });
  document.getElementById('leader-modal').style.display = 'flex';
}

async function applyTemplate(tId) {
  const res = await fetch('/api/leader/templates');
  const templates = await res.json();
  const t = templates.find(x => x.id == tId);
  if (t) {
    store.push({ id: Date.now().toString(), type: 'doc', title: t.title, code: t.code, bodyHtml: t.bodyHtml, role: t.role, x: 250, y: 250 });
    saveBoard(); renderBoard();
    document.getElementById('leader-modal').style.display = 'none';
  }
}

async function openAdminModal() {
  const res = await fetch('/api/admin/users');
  const users = await res.json();
  const tbody = document.getElementById('admin-users-list');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:8px;">${u.username}</td>
      <td style="padding:8px;">
        <select id="role-${u.id}" class="form-control" style="padding:4px;">
          <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>USER</option>
          <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
      </td>
      <td style="padding:8px; text-align:center;">
        <input type="checkbox" id="lead-${u.id}" ${u.is_leader ? 'checked' : ''}>
      </td>
      <td style="padding:8px;"><button class="btn-main" style="padding:4px 8px;" onclick="saveUserRights(${u.id})">Сохранить</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('admin-modal').style.display = 'flex';
}

async function saveUserRights(userId) {
  const role = document.getElementById(`role-${userId}`).value;
  const is_leader = document.getElementById(`lead-${userId}`).checked;
  await fetch('/api/admin/update-user', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, role, is_leader })
  });
  alert('Права успешно обновлены!');
}

function updateTransform() { board.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`; }
function resetZoom() { scale = 0.8; panX = window.innerWidth / 5; panY = window.innerHeight / 5; updateTransform(); }

function openCreateModal(t) { targetCreateType = t; document.getElementById('create-modal').style.display = 'flex'; }
function closeCreateModal() { document.getElementById('create-modal').style.display = 'none'; }
function submitCreateNode() {
  const title = document.getElementById('create-node-name').value;
  if (title) {
    store.push({ id: Date.now().toString(), type: targetCreateType, title, x: 200, y: 200, bodyHtml: '' });
    saveBoard(); renderBoard();
  }
  closeCreateModal();
}

function startLinkingProcess() { contextMenu.style.display = 'none'; linkingSourceNode = selectedNodeForCtx; }
function renameNodePrompt() {
  contextMenu.style.display = 'none';
  const t = prompt('Новое имя:', selectedNodeForCtx.title);
  if (t) { selectedNodeForCtx.title = t; saveBoard(); renderBoard(); }
}
function deleteNodeAction() {
  contextMenu.style.display = 'none';
  store = store.filter(n => n.id !== selectedNodeForCtx.id);
  saveBoard(); renderBoard();
}

let activeDragNode = null, dragOffset = { x: 0, y: 0 };
function startDragNode(e, node) {
  activeDragNode = node;
  dragOffset.x = (e.clientX / scale) - node.x; dragOffset.y = (e.clientY / scale) - node.y;
  document.addEventListener('mousemove', onDragNode); document.addEventListener('mouseup', stopDragNode);
}
function onDragNode(e) {
  if (!activeDragNode) return;
  activeDragNode.x = (e.clientX / scale) - dragOffset.x; activeDragNode.y = (e.clientY / scale) - dragOffset.y;
  renderBoard();
}
function stopDragNode() {
  activeDragNode = null;
  document.removeEventListener('mousemove', onDragNode); document.removeEventListener('mouseup', stopDragNode);
  saveBoard();
}

function toggleProfileMenu() { const p = document.getElementById('profile-dropdown'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; }
function closeEditorWithoutSaving() { document.getElementById('editor-modal').style.display = 'none'; }
async function logout() { await fetch('/api/logout', { method: 'POST' }); location.reload(); }

window.onclick = () => { contextMenu.style.display = 'none'; };
checkAuthStatus();