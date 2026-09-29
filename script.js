/* ==========================================================================
   ORGANIZADOR DE ESTUDOS 3000 - LÓGICA & INTERATIVIDADE
   ========================================================================== */

// --- ESTADO DA APLICAÇÃO ---
const DEFAULT_STATE = {
    theme: 'dark',
    columns: [
        { id: 'col-dores', title: 'Dores & Incômodos Atuais', icon: 'fa-triangle-exclamation' },
        { id: 'col-acao', title: 'Estratégias em Ação', icon: 'fa-spinner' },
        { id: 'col-superado', title: 'Desafios Superados', icon: 'fa-circle-check' }
    ],
    cards: [
        {
            id: 'card-1',
            columnId: 'col-dores',
            title: 'Procrastinação com o Celular',
            description: 'Perco mais de 2 horas trocando de redes sociais antes de começar a estudar pra valer.',
            solution: 'Usar a técnica Pomodoro e deixar o celular em outro cômodo durante o bloco de foco.',
            color: '#ef4444',
            checklist: [
                { text: 'Instalar bloqueador de apps', done: true },
                { text: 'Deixar celular na sala', done: false }
            ],
            drawingData: null
        },
        {
            id: 'card-2',
            columnId: 'col-dores',
            title: 'Acúmulo de Matéria na Véspera',
            description: 'Sensação constante de estar atrasado e desespero antes das avaliações.',
            solution: 'Montar cronograma semanal fixo dividindo as disciplinas por dia.',
            color: '#f59e0b',
            checklist: [],
            drawingData: null
        },
        {
            id: 'card-3',
            columnId: 'col-acao',
            title: 'Resumos Passivos sem Questões',
            description: 'Gasto muito tempo decorando e reescrevendo em vez de resolver exercícios.',
            solution: 'Praticar o Estudo Ativo fazendo 15 questões logo após cada leitura.',
            color: '#3b82f6',
            checklist: [
                { text: 'Resolver 10 questões de Fixação', done: false }
            ],
            drawingData: null
        }
    ],
    stickyNotes: [
        { id: 'sn-1', text: '💡 Revisar Fórmula de Física às 16h', x: 50, y: 50, color: '#fef08a' }
    ]
};

let appState = JSON.parse(localStorage.getItem('estudos3000_state')) || DEFAULT_STATE;

// PÁGINAS DE APROFUNDAMENTO (uma por tema dos cards padrão)
const DEEP_DIVE_PAGES = {
    'card-1': 'paginas/procrastinacao-celular.html',
    'card-2': 'paginas/acumulo-materia.html',
    'card-3': 'paginas/resumos-passivos.html'
};

// VARIÁVEIS DE CONTROLE
let activeCardId = null;
let currentView = 'kanban';
let cardCanvasCtx = null;
let isDrawingCard = false;
let globalCanvasCtx = null;
let isDrawingGlobal = false;
let globalTool = 'pencil';
let cardTool = 'pencil';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(appState.theme);
    renderBoard();
    updateStats();
    initEventListeners();
    initGlobalWhiteboard();
    initCardCanvas();
});

// --- SALVAR ESTADO LOCAL ---
function saveState() {
    localStorage.setItem('estudos3000_state', JSON.stringify(appState));
    updateStats();
}

// --- CONTROLE DE TEMAS ---
function applyTheme(theme) {
    appState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    saveState();
}

// --- RENDERIZAÇÃO DO QUADRO KANBAN ---
function renderBoard() {
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = '';

    appState.columns.forEach(col => {
        const colCards = appState.cards.filter(c => c.columnId === col.id);
        
        const colEl = document.createElement('div');
        colEl.className = 'kanban-column';
        colEl.dataset.colId = col.id;

        colEl.innerHTML = `
            <div class="column-header">
                <div class="column-title">
                    <i class="fa-solid ${col.icon || 'fa-folder'} text-warning"></i>
                    <span>${col.title}</span>
                    <span class="card-count">${colCards.length}</span>
                </div>
                <div class="column-actions">
                    <button class="btn-icon delete-col-btn" title="Excluir Coluna"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="cards-container" id="container-${col.id}"></div>
        `;

        board.appendChild(colEl);

        const cardsContainer = colEl.querySelector('.cards-container');

        // Configurar Drag & Drop da Coluna
        cardsContainer.addEventListener('dragover', handleDragOver);
        cardsContainer.addEventListener('dragleave', handleDragLeave);
        cardsContainer.addEventListener('drop', handleDrop);

        // Deletar Coluna
        colEl.querySelector('.delete-col-btn').addEventListener('click', () => deleteColumn(col.id));

        // Renderizar Cards
        colCards.forEach(card => {
            const cardEl = createCardElement(card);
            cardsContainer.appendChild(cardEl);
        });
    });

    updateCategorySelects();
}

// CRIAR ELEMENTO DOM DO CARD
function createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'study-card';
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    cardEl.style.borderLeftColor = card.color || '#6366f1';

    const completedTasks = card.checklist ? card.checklist.filter(t => t.done).length : 0;
    const totalTasks = card.checklist ? card.checklist.length : 0;
    const deepDiveUrl = DEEP_DIVE_PAGES[card.id];

    cardEl.innerHTML = `
        <div class="card-header-tags">
            <span class="card-tag-preview" style="background-color: ${card.color};"></span>
        </div>
        <div class="card-title">${escapeHtml(card.title)}</div>
        <div class="card-desc-snippet">${escapeHtml(card.description || 'Sem descrição...')}</div>
        <div class="card-footer-info">
            ${totalTasks > 0 ? `<span><i class="fa-solid fa-list-check"></i> ${completedTasks}/${totalTasks}</span>` : ''}
            ${card.drawingData ? `<span><i class="fa-solid fa-paint-brush"></i> Possui Desenho</span>` : ''}
            ${deepDiveUrl ? `<a href="${deepDiveUrl}" class="deep-dive-link" title="Aprofundar assunto" onclick="event.stopPropagation();"><i class="fa-solid fa-book-open"></i> Aprofundar</a>` : ''}
        </div>
    `;

    // Eventos de Drag & Drop
    cardEl.addEventListener('dragstart', handleDragStart);
    cardEl.addEventListener('dragend', handleDragEnd);

    // Evento de Clique para abrir Modal
    cardEl.addEventListener('click', () => openCardDetailModal(card.id));

    return cardEl;
}

// --- LÓGICA DRAG & DROP ---
let draggedCardId = null;

function handleDragStart(e) {
    draggedCardId = this.dataset.cardId;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggedCardId = null;
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const targetColId = this.id.replace('container-', '');
    
    if (draggedCardId && targetColId) {
        const card = appState.cards.find(c => c.id === draggedCardId);
        if (card) {
            card.columnId = targetColId;
            saveState();
            renderBoard();
        }
    }
}

// --- ESTATÍSTICAS ---
function updateStats() {
    document.getElementById('totalCardsCount').textContent = appState.cards.length;
    document.getElementById('totalColsCount').textContent = appState.columns.length;
    
    // Supondo que a última coluna ou a coluna "superado" é a de resolvidos
    const lastColId = appState.columns[appState.columns.length - 1]?.id;
    const resolved = appState.cards.filter(c => c.columnId === lastColId).length;
    document.getElementById('resolvedCardsCount').textContent = resolved;
}

// --- MODAL DETALHES DO CARD & LOUSA INTERNA ---
function openCardDetailModal(cardId) {
    activeCardId = cardId;
    const card = appState.cards.find(c => c.id === cardId);
    if (!card) return;

    document.getElementById('modalCardTitle').textContent = card.title;
    document.getElementById('modalCardDescription').value = card.description || '';
    document.getElementById('modalCardSolution').value = card.solution || '';
    document.getElementById('modalTagPreview').style.backgroundColor = card.color || '#6366f1';

    renderChecklist(card);
    loadCardCanvas(card.drawingData);

    document.getElementById('cardDetailModal').classList.add('active');
}

function closeCardDetailModal() {
    if (activeCardId) {
        saveCardCanvasData();
    }
    document.getElementById('cardDetailModal').classList.remove('active');
    activeCardId = null;
}

// SALVAR ALTERAÇÕES DO MODAL
document.getElementById('saveCardDetailBtn').addEventListener('click', () => {
    if (!activeCardId) return;
    const card = appState.cards.find(c => c.id === activeCardId);
    if (card) {
        card.title = document.getElementById('modalCardTitle').textContent;
        card.description = document.getElementById('modalCardDescription').value;
        card.solution = document.getElementById('modalCardSolution').value;
        saveCardCanvasData();
        saveState();
        renderBoard();
    }
    closeCardDetailModal();
});

// EXCLUIR CARD
document.getElementById('deleteCardBtn').addEventListener('click', () => {
    if (!activeCardId) return;
    if (confirm('Deseja realmente excluir este incômodo?')) {
        appState.cards = appState.cards.filter(c => c.id !== activeCardId);
        saveState();
        renderBoard();
        closeCardDetailModal();
    }
});

// --- SUB-TAREFAS / CHECKLIST ---
function renderChecklist(card) {
    const list = document.getElementById('modalChecklist');
    list.innerHTML = '';
    card.checklist = card.checklist || [];

    card.checklist.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = `checklist-item ${item.done ? 'completed' : ''}`;
        li.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleSubtask(${idx})">
            <span>${escapeHtml(item.text)}</span>
            <button class="btn-icon" onclick="removeSubtask(${idx})"><i class="fa-solid fa-xmark"></i></button>
        `;
        list.appendChild(li);
    });
}

window.toggleSubtask = function(idx) {
    const card = appState.cards.find(c => c.id === activeCardId);
    if (card && card.checklist[idx]) {
        card.checklist[idx].done = !card.checklist[idx].done;
        renderChecklist(card);
    }
};

window.removeSubtask = function(idx) {
    const card = appState.cards.find(c => c.id === activeCardId);
    if (card) {
        card.checklist.splice(idx, 1);
        renderChecklist(card);
    }
};

document.getElementById('addSubtaskBtn').addEventListener('click', () => {
    const input = document.getElementById('newSubtaskInput');
    const val = input.value.trim();
    if (val && activeCardId) {
        const card = appState.cards.find(c => c.id === activeCardId);
        card.checklist = card.checklist || [];
        card.checklist.push({ text: val, done: false });
        input.value = '';
        renderChecklist(card);
    }
});

// --- SELETOR DE COR NO MODAL ---
document.querySelectorAll('#tab-style .color-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        if (activeCardId) {
            const card = appState.cards.find(c => c.id === activeCardId);
            if (card) {
                card.color = color;
                document.getElementById('modalTagPreview').style.backgroundColor = color;
            }
        }
    });
});

// --- LOUSA / CANVAS INTERNO DO CARD ---
function initCardCanvas() {
    const canvas = document.getElementById('cardCanvas');
    cardCanvasCtx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', startCardDraw);
    canvas.addEventListener('mousemove', drawCard);
    canvas.addEventListener('mouseup', stopCardDraw);
    canvas.addEventListener('mouseleave', stopCardDraw);

    document.getElementById('clearCardCanvasBtn').addEventListener('click', () => {
        cardCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById('cardToolPencil').addEventListener('click', () => cardTool = 'pencil');
    document.getElementById('cardToolEraser').addEventListener('click', () => cardTool = 'eraser');
}

function startCardDraw(e) {
    isDrawingCard = true;
    const rect = e.target.getBoundingClientRect();
    cardCanvasCtx.beginPath();
    cardCanvasCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function drawCard(e) {
    if (!isDrawingCard) return;
    const rect = e.target.getBoundingClientRect();
    const color = document.getElementById('cardCanvasColor').value;
    const size = document.getElementById('cardCanvasSize').value;

    cardCanvasCtx.lineWidth = size;
    cardCanvasCtx.lineCap = 'round';

    if (cardTool === 'eraser') {
        cardCanvasCtx.strokeStyle = '#ffffff';
    } else {
        cardCanvasCtx.strokeStyle = color;
    }

    cardCanvasCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    cardCanvasCtx.stroke();
}

function stopCardDraw() {
    isDrawingCard = false;
}

function saveCardCanvasData() {
    const canvas = document.getElementById('cardCanvas');
    const card = appState.cards.find(c => c.id === activeCardId);
    if (card) {
        card.drawingData = canvas.toDataURL();
    }
}

function loadCardCanvas(dataUrl) {
    const canvas = document.getElementById('cardCanvas');
    cardCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (dataUrl) {
        const img = new Image();
        img.onload = () => cardCanvasCtx.drawImage(img, 0, 0);
        img.src = dataUrl;
    }
}

// --- LOUSA GLOBAL & STICKY NOTES ---
function initGlobalWhiteboard() {
    const container = document.getElementById('whiteboardContainer');
    const canvas = document.getElementById('globalCanvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    globalCanvasCtx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', (e) => {
        isDrawingGlobal = true;
        globalCanvasCtx.beginPath();
        globalCanvasCtx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawingGlobal) return;
        const color = document.getElementById('wbColorPicker').value;
        const size = document.getElementById('wbBrushSize').value;

        globalCanvasCtx.lineWidth = size;
        globalCanvasCtx.lineCap = 'round';
        globalCanvasCtx.strokeStyle = globalTool === 'eraser' ? (appState.theme === 'dark' ? '#0f172a' : '#f1f5f9') : color;

        globalCanvasCtx.lineTo(e.offsetX, e.offsetY);
        globalCanvasCtx.stroke();
    });

    canvas.addEventListener('mouseup', () => isDrawingGlobal = false);
    canvas.addEventListener('mouseleave', () => isDrawingGlobal = false);

    document.getElementById('wbToolPencil').addEventListener('click', () => globalTool = 'pencil');
    document.getElementById('wbToolEraser').addEventListener('click', () => globalTool = 'eraser');
    document.getElementById('clearWbBtn').addEventListener('click', () => {
        globalCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Renderizar Sticky Notes
    renderStickyNotes();
}

function renderStickyNotes() {
    const container = document.getElementById('stickyNotesContainer');
    container.innerHTML = '';

    appState.stickyNotes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'sticky-note';
        noteEl.style.left = `${note.x}px`;
        noteEl.style.top = `${note.y}px`;

        noteEl.innerHTML = `
            <div class="sticky-header">
                <button class="btn-icon" onclick="deleteStickyNote('${note.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <textarea class="sticky-content" onchange="updateStickyText('${note.id}', this.value)">${escapeHtml(note.text)}</textarea>
        `;

        makeDraggable(noteEl, note);
        container.appendChild(noteEl);
    });
}

document.getElementById('addStickyNoteBtn').addEventListener('click', () => {
    const newNote = {
        id: 'sn-' + Date.now(),
        text: 'Nova Anotação Rápida...',
        x: 100,
        y: 100,
        color: '#fef08a'
    };
    appState.stickyNotes.push(newNote);
    saveState();
    renderStickyNotes();
});

window.deleteStickyNote = function(id) {
    appState.stickyNotes = appState.stickyNotes.filter(n => n.id !== id);
    saveState();
    renderStickyNotes();
};

window.updateStickyText = function(id, text) {
    const note = appState.stickyNotes.find(n => n.id === id);
    if (note) {
        note.text = text;
        saveState();
    }
};

function makeDraggable(el, noteObj) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    el.onmousedown = (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;
        e.preventDefault();
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.onmouseup = () => {
            document.onmouseup = null;
            document.onmousemove = null;
            noteObj.x = parseInt(el.style.left);
            noteObj.y = parseInt(el.style.top);
            saveState();
        };
        document.onmousemove = (e) => {
            e.preventDefault();
            posX = mouseX - e.clientX;
            posY = mouseY - e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;
            el.style.top = (el.offsetTop - posY) + "px";
            el.style.left = (el.offsetLeft - posX) + "px";
        };
    };
}

// --- CRIAR NOVA CATEGORIA (COLUNA) ---
function updateCategorySelects() {
    const select = document.getElementById('newCardCategory');
    if (!select) return;
    select.innerHTML = '';
    appState.columns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = col.title;
        select.appendChild(opt);
    });
}

function deleteColumn(colId) {
    if (appState.columns.length <= 1) {
        alert('É necessário manter pelo menos uma categoria.');
        return;
    }
    if (confirm('Deseja excluir esta categoria? Os cards dela serão movidos para a primeira coluna.')) {
        appState.columns = appState.columns.filter(c => c.id !== colId);
        const fallbackColId = appState.columns[0].id;
        appState.cards.forEach(card => {
            if (card.columnId === colId) card.columnId = fallbackColId;
        });
        saveState();
        renderBoard();
    }
}

// --- LISTENERS DOS BOTÕES & MODAIS ---
function initEventListeners() {
    // Alternar Tema
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
        const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    });

    // Alternar Visões (Kanban x Lousa)
    document.getElementById('viewToggleBtn').addEventListener('click', function() {
        if (currentView === 'kanban') {
            currentView = 'whiteboard';
            document.getElementById('kanbanView').classList.remove('active');
            document.getElementById('whiteboardView').classList.add('active');
            this.innerHTML = '<i class="fa-solid fa-chalkboard"></i> <span>Ver Lousa</span>';
        } else {
            currentView = 'kanban';
            document.getElementById('whiteboardView').classList.remove('active');
            document.getElementById('kanbanView').classList.add('active');
            this.innerHTML = '<i class="fa-solid fa-table-columns"></i> <span>Quadro Kanban</span>';
        }
    });

    // Modal Novo Card
    const newCardModal = document.getElementById('newCardModal');
    document.getElementById('addCardBtn').addEventListener('click', () => newCardModal.classList.add('active'));
    document.getElementById('closeNewCardModalBtn').addEventListener('click', () => newCardModal.classList.remove('active'));
    document.getElementById('cancelNewCardBtn').addEventListener('click', () => newCardModal.classList.remove('active'));

    document.getElementById('confirmNewCardBtn').addEventListener('click', () => {
        const title = document.getElementById('newCardTitle').value.trim();
        const colId = document.getElementById('newCardCategory').value;
        const desc = document.getElementById('newCardDesc').value;
        const selectedColor = document.querySelector('#newCardColorGrid .selected')?.dataset.color || '#ef4444';

        if (title) {
            appState.cards.push({
                id: 'card-' + Date.now(),
                columnId: colId,
                title: title,
                description: desc,
                solution: '',
                color: selectedColor,
                checklist: [],
                drawingData: null
            });
            saveState();
            renderBoard();
            newCardModal.classList.remove('active');
            document.getElementById('newCardTitle').value = '';
            document.getElementById('newCardDesc').value = '';
        }
    });

    // Modal Nova Coluna
    const newColumnModal = document.getElementById('newColumnModal');
    document.getElementById('addColumnBtn').addEventListener('click', () => newColumnModal.classList.add('active'));
    document.getElementById('closeNewColModalBtn').addEventListener('click', () => newColumnModal.classList.remove('active'));
    document.getElementById('cancelNewColBtn').addEventListener('click', () => newColumnModal.classList.remove('active'));

    document.getElementById('confirmNewColBtn').addEventListener('click', () => {
        const title = document.getElementById('newColTitle').value.trim();
        const icon = document.getElementById('newColIcon').value;

        if (title) {
            appState.columns.push({
                id: 'col-' + Date.now(),
                title: title,
                icon: icon
            });
            saveState();
            renderBoard();
            newColumnModal.classList.remove('active');
            document.getElementById('newColTitle').value = '';
        }
    });

    // Fechar Modal Detalhes Card
    document.getElementById('closeDetailModalBtn').addEventListener('click', closeCardDetailModal);

    // Navegação por Abas no Modal
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const targetTab = e.target.closest('.tab-btn').dataset.tab;
            e.target.closest('.tab-btn').classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Seleção de Cores no Modal de Novo Card
    document.querySelectorAll('#newCardColorGrid .color-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#newCardColorGrid .color-opt').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
        });
    });

    // Filtro de Busca Realtime
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.study-card').forEach(cardEl => {
            const text = cardEl.textContent.toLowerCase();
            cardEl.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
}

// UTILITÁRIO SEGURANÇA CONTRA XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}