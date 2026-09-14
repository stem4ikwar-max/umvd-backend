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

// Отображение UID и прав
function updateProfileUI(user) {
  document.getElementById('prof-name').innerText = user.username;
  document.getElementById('prof-role').innerText = user.role === 'ADMIN' ? 'Администратор' : (user.is_leader ? 'Лидер' : 'Пользователь');
  document.getElementById('prof-uid').innerText = `UID: ${user.id}`;
  
  const isPowerUser = user.role === 'ADMIN' || user.is_leader;
  document.getElementById('leader-tools').style.display = isPowerUser ? 'flex' : 'none';
  document.getElementById('btn-top-admin').style.display = user.role === 'ADMIN' ? 'block' : 'none';
  document.getElementById('leader-img-upload').style.display = isPowerUser ? 'block' : 'none';
  document.getElementById('btn-save-doc').style.display = isPowerUser ? 'block' : 'none';
}

// Отрисовка блоков секций в редакторе
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

// Отрисовка бумажного бланка справа
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
