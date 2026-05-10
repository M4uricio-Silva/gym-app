// --- NOVA FUNÇÃO: INTEGRAÇÃO COM A KAISER AI ---
async function chamarKaiserAI() {
    const promptInput = document.getElementById('ai-prompt').value;
    const btn = document.getElementById('btn-ai');
    const responseArea = document.getElementById('ai-response-area');

    if (!promptInput) return alert('Diga à Kaiser AI o que você quer treinar!');

    // Feedback visual
    btn.innerText = "Consultando a base de dados...";
    btn.disabled = true;
    responseArea.classList.remove('hidden');
    responseArea.innerText = "Calculando as melhores variáveis para hipertrofia...";

    try {
        // Tenta conectar ao servidor
        const res = await fetch('/api/kaiser-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido: promptInput })
        });

        const data = await res.json();

        if (res.ok) {
            responseArea.innerText = data.resposta;
        } else {
            responseArea.innerText = "Erro no sistema: " + (data.error || "Tente novamente");
        }
    } catch (err) {
        responseArea.innerText = "⚠️ Conexão não disponível. Verifique se o servidor está rodando em /api/kaiser-ai\n\nPara desenvolvimento local, você pode usar a API OpenAI ou outro serviço.";
        console.error("Erro na chamada da API:", err);
    } finally {
        btn.innerText = "Gerar Treino com IA";
        btn.disabled = false;
    }
}

// --- 1. SETUP DE NAVEGAÇÃO ---
function switchTab(tabId, btn) { document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(tabId).classList.add('active'); btn.classList.add('active'); }

// --- 2. GESTÃO DE EXERCÍCIOS E MODELOS (BIBLIOTECA) ---
let currentBase64Image = null;
let editingExerciseId = null;

function handleImageUpload(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { currentBase64Image = ev.target.result; document.getElementById('image-preview').src = currentBase64Image; document.getElementById('image-preview').style.display = 'block'; document.getElementById('upload-text').style.display = 'none'; }; r.readAsDataURL(f); }

function resetExerciseForm() {
    document.getElementById('ex-name').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-text').style.display = 'block';
    currentBase64Image = null;
    editingExerciseId = null;
    document.getElementById('ex-form-title').innerText = 'Novo Exercício';
    document.getElementById('btn-save-ex').innerText = 'Salvar';
}

async function saveExercise() {
    const n = document.getElementById('ex-name').value.trim(); const c = document.getElementById('ex-category').value;
    if (!n || !currentBase64Image) return alert('Preencha o nome e a foto!');

    const idToSave = editingExerciseId ? editingExerciseId : Date.now().toString();
    await dbAdd('exercises', { id: idToSave, name: n, category: c, image: currentBase64Image });
    resetExerciseForm();
    initManage();
}

async function editExercise(id, name, category, imageStr) {
    editingExerciseId = id;
    document.getElementById('ex-name').value = name;
    document.getElementById('ex-category').value = category;
    currentBase64Image = imageStr;
    document.getElementById('image-preview').src = imageStr;
    document.getElementById('image-preview').style.display = 'block';
    document.getElementById('upload-text').style.display = 'none';
    document.getElementById('ex-form-title').innerText = 'Editar Exercício';
    document.getElementById('btn-save-ex').innerText = 'Atualizar';
    window.scrollTo(0, 0);
}

async function deleteExercise(id) {
    if (confirm('Tem certeza que deseja apagar este exercício da biblioteca?')) {
        await dbDelete('exercises', id);
        initManage();
    }
}

async function initManage() {
    const ex = await dbGetAll('exercises');
    const list = document.getElementById('exercise-list');
    list.innerHTML = ex.length ? '' : '<p style="color:var(--text-muted)">Nenhum exercício.</p>';
    ex.forEach(e => {
        list.innerHTML += `
                    <div class="exercise-card">
                        <img src="${e.image}">
                        <div class="exercise-info" style="flex:1"><p>${e.category}</p><h4>${e.name}</h4></div>
                        <div style="display:flex; gap:0.5rem; flex-direction:column;">
                            <button class="btn btn-secondary btn-small" onclick="editExercise('${e.id}', '${e.name}', '${e.category}', '${e.image}')">✎</button>
                            <button class="btn btn-danger btn-small" onclick="deleteExercise('${e.id}')">✕</button>
                        </div>
                    </div>`;
    });

    const cks = document.getElementById('tpl-exercise-selection');
    cks.innerHTML = ex.length ? '' : '<p style="color:var(--text-muted); font-size:0.8rem;">Cadastre exercícios primeiro.</p>';
    ex.forEach(e => {
        cks.innerHTML += `<label style="display:flex; align-items:center; gap:0.5rem; text-transform:none;"><input type="checkbox" value="${e.id}" class="tpl-chk" style="width:auto;"> ${e.name}</label>`;
    });

    const tpls = await dbGetAll('templates');
    const tList = document.getElementById('template-list');
    tList.innerHTML = tpls.length ? '' : '<p style="color:var(--text-muted)">Nenhum modelo.</p>';
    tpls.forEach(t => {
        tList.innerHTML += `
                    <div class="section-panel" style="display:flex; justify-content:space-between; align-items:center;">
                        <div><h4>${t.name}</h4><p style="font-size:0.8rem; color:var(--text-muted)">${t.exerciseIds.length} exercícios</p></div>
                        <button class="btn btn-danger btn-small" onclick="deleteTemplate('${t.id}')">Excluir</button>
                    </div>
                `;
    });
}

async function saveTemplate() {
    const name = document.getElementById('tpl-name').value.trim();
    const chks = document.querySelectorAll('.tpl-chk:checked');
    if (!name || chks.length === 0) return alert('Dê um nome e selecione pelo menos 1 exercício.');
    const ids = Array.from(chks).map(c => c.value);
    await dbAdd('templates', { id: Date.now().toString(), name, exerciseIds: ids });
    document.getElementById('tpl-name').value = '';
    chks.forEach(c => c.checked = false);
    initManage();
}

async function deleteTemplate(id) { if (confirm('Excluir modelo?')) { await dbDelete('templates', id); initManage(); } }

// --- 3. LÓGICA DO TREINO ---
let currentSession = [], activeExercise = null, activeSets = [];
function showWorkoutStep(id) { document.querySelectorAll('.workout-step').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function initWorkoutFlow() { renderWorkoutSummary(); showWorkoutStep('w-step-summary'); }
function confirmCancelWorkout() { if (currentSession.length > 0) { if (confirm("Sair e perder treino não salvo?")) { currentSession = []; nav('screen-home'); } } else { nav('screen-home'); } }

async function initCategorySelection() {
    const ex = await dbGetAll('exercises');
    const categories = [...new Set(ex.map(e => e.category))];
    const grid = document.getElementById('w-category-grid');
    
    if (categories.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:2rem;">Cadastre exercícios na Biblioteca primeiro.</p>';
        return;
    }
    
    grid.innerHTML = '';
    categories.forEach(cat => {
        const count = ex.filter(e => e.category === cat).length;
        grid.innerHTML += `<button class="menu-btn" onclick="selectCategory('${cat}')">${cat} <span>(${count})</span></button>`;
    });
}

async function selectCategory(cat) {
    const ex = await dbGetAll('exercises'); const filt = ex.filter(e => e.category === cat);
    document.getElementById('w-category-title').innerText = cat;
    const list = document.getElementById('w-exercise-list'); list.innerHTML = filt.length ? '' : '<p style="text-align:center; color:var(--text-muted);">Nenhum exercício nesta categoria.</p>';
    filt.forEach(e => {
        list.innerHTML += `<div class="exercise-card" onclick="startExercise('${e.id}')" style="cursor:pointer;"><img src="${e.image}"><div class="exercise-info"><h4>${e.name}</h4></div></div>`;
    });
    showWorkoutStep('w-step-exercises');
}

async function loadTemplatesForWorkout() {
    const tpls = await dbGetAll('templates');
    const list = document.getElementById('w-template-list');
    if (tpls.length === 0) return alert('Você não tem modelos cadastrados. Crie um na aba Biblioteca.');
    list.innerHTML = '';
    tpls.forEach(t => {
        list.innerHTML += `<button class="menu-btn" style="margin-bottom:0.5rem;" onclick="useTemplate('${t.id}')">${t.name} <span>+</span></button>`;
    });
    showWorkoutStep('w-step-templates');
}

async function useTemplate(tplId) {
    const tpls = await dbGetAll('templates');
    const exAll = await dbGetAll('exercises');
    const tpl = tpls.find(t => t.id === tplId);

    tpl.exerciseIds.forEach(eid => {
        const ex = exAll.find(e => e.id === eid);
        if (ex) currentSession.push({ exercise: ex, sets: [] });
    });
    renderWorkoutSummary();
    showWorkoutStep('w-step-summary');
}

async function startExercise(exId) {
    const exAll = await dbGetAll('exercises');
    const ex = exAll.find(e => e.id === exId);
    activeExercise = ex; activeSets = [];
    document.getElementById('active-ex-img').src = ex.image; document.getElementById('active-ex-name').innerText = ex.name; document.getElementById('active-ex-cat').innerText = ex.category;
    document.getElementById('set-weight').value = ''; document.getElementById('set-reps').value = '';
    renderSets(); showWorkoutStep('w-step-active');
}

function continueExercise(sessionIndex) {
    const item = currentSession[sessionIndex];
    activeExercise = item.exercise;
    activeSets = item.sets;
    document.getElementById('active-ex-img').src = activeExercise.image;
    document.getElementById('active-ex-name').innerText = activeExercise.name;
    document.getElementById('active-ex-cat').innerText = activeExercise.category;
    document.getElementById('set-reps').value = '';
    renderSets();
    currentSession.splice(sessionIndex, 1);
    showWorkoutStep('w-step-active');
}

function addSet() {
    const t = document.getElementById('set-type').value, w = document.getElementById('set-weight').value, r = document.getElementById('set-reps').value;
    if (!r || !w) return alert('Preencha carga e reps!');
    activeSets.push({ type: t, weight: Number(w), reps: Number(r) });
    renderSets(); document.getElementById('set-reps').value = ''; document.getElementById('set-reps').focus();
}
function renderSets() {
    const list = document.getElementById('sets-list'); list.innerHTML = '';
    activeSets.forEach((s, i) => { const bg = s.type === 'Aquec.' ? 'warmup' : 'work'; list.innerHTML += `<div class="set-row"><span class="set-badge ${bg}">${i + 1}</span><span>${s.weight}kg</span><span>${s.reps} reps</span><span style="font-size:0.8rem">${s.type}</span></div>`; });
}
function finishCurrentExercise() {
    if (activeSets.length > 0) currentSession.push({ exercise: activeExercise, sets: activeSets });
    activeExercise = null; activeSets = []; renderWorkoutSummary(); showWorkoutStep('w-step-summary');
}

function renderWorkoutSummary() {
    const c = document.getElementById('workout-summary-content'), b = document.getElementById('btn-finish-workout');
    if (currentSession.length === 0) { c.innerHTML = '<p style="color:var(--text-muted);">Nenhum exercício iniciado.</p>'; b.style.display = 'none'; return; }
    b.style.display = 'block'; c.innerHTML = '<h3 style="align-self:flex-start">Sua Ficha de Hoje:</h3><div style="width:100%;">';
    currentSession.forEach((item, index) => {
        const status = item.sets.length === 0 ? '<span style="color:var(--warning); font-size:0.8rem">Pendente</span>' : `<span style="color:var(--success); font-size:0.8rem">${item.sets.length} séries</span>`;
        c.innerHTML += `
                    <div class="exercise-card" style="cursor:pointer" onclick="continueExercise(${index})">
                        <img src="${item.exercise.image}">
                        <div class="exercise-info"><h4>${item.exercise.name}</h4>${status}</div>
                    </div>`;
    });
    c.innerHTML += '</div>';
}

async function saveWorkoutSession() {
    if (currentSession.some(item => item.sets.length === 0)) {
        if (!confirm("Existem exercícios sem séries registradas. Deseja finalizar mesmo assim? Eles não serão salvos no histórico.")) return;
    }
    const finalSession = currentSession.filter(item => item.sets.length > 0);
    if (finalSession.length === 0) { alert('Treino vazio abortado.'); currentSession = []; nav('screen-home'); return; }

    const t = new Date().toISOString().slice(0, 10);
    await dbAdd('workouts', { id: Date.now().toString(), date: t, exercises: finalSession });
    alert('Treino Salvo com Sucesso! 🏆'); currentSession = []; nav('screen-home');
}

// --- 4. HISTÓRICO CIRÚRGICO ---
function clearHistoryFilters() { document.getElementById('hist-filter-date').value = ''; document.getElementById('hist-filter-exercise').value = ''; loadHistory(); }

async function loadHistory() {
    const allWorkouts = await dbGetAll('workouts');
    const container = document.getElementById('history-list');
    const fDate = document.getElementById('hist-filter-date').value;
    const fExercise = document.getElementById('hist-filter-exercise').value.toLowerCase();

    allWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = '';

    let totalRendered = 0;

    allWorkouts.forEach(workout => {
        if (fDate && workout.date !== fDate) return;

        let dayExercises = workout.exercises;
        if (fExercise) {
            dayExercises = dayExercises.filter(exItem => exItem.exercise.name.toLowerCase().includes(fExercise));
        }

        if (dayExercises.length === 0) return;

        const dateParts = workout.date.split('-');
        const formatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        let exercisesHTML = '';
        dayExercises.forEach(exItem => {
            let setsHTML = '';
            exItem.sets.forEach((set, i) => { setsHTML += `<li>Série ${i + 1}: ${set.weight} kg x ${set.reps} reps (${set.type})</li>`; });
            exercisesHTML += `<div class="history-ex-title"><img src="${exItem.exercise.image}"><span>${exItem.exercise.name}</span></div><ul class="history-set-list">${setsHTML}</ul>`;
        });

        container.innerHTML += `<div class="history-card"><div class="history-header"><h4>${formatted}</h4></div><div>${exercisesHTML}</div></div>`;
        totalRendered++;
    });

    if (totalRendered === 0) container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 2rem;">Nenhum treino encontrado.</p>`;
}

// --- 5. ANÁLISE ---
async function populateAnalysisSelect() { const allWorkouts = await dbGetAll('workouts'); const select = document.getElementById('analysis-exercise-select'); select.innerHTML = ''; let uniqueExercises = new Map(); allWorkouts.forEach(workout => { workout.exercises.forEach(exItem => { uniqueExercises.set(exItem.exercise.name, exItem.exercise); }); }); if (uniqueExercises.size === 0) { select.innerHTML = '<option value="">Sem dados</option>'; return; } const sortedExercises = Array.from(uniqueExercises.values()).sort((a, b) => a.name.localeCompare(b.name)); sortedExercises.forEach(ex => { select.innerHTML += `<option value="${ex.name}">${ex.name}</option>`; }); }
async function runAnalysis() { const selected = document.getElementById('analysis-exercise-select').value; const res = document.getElementById('analysis-results'); if (!selected) return; const allWorkouts = await dbGetAll('workouts'); let history = []; allWorkouts.forEach(w => { const f = w.exercises.find(ex => ex.exercise.name === selected); if (f) history.push({ date: w.date, sets: f.sets }); }); history.sort((a, b) => new Date(a.date) - new Date(b.date)); if (history.length < 2) { res.innerHTML = `<p style="text-align:center; color:var(--warning);">Treine este exercício mais vezes para comparar.</p>`; return; } const first = history[0]; const last = history[history.length - 1]; function calcStats(d) { let v = 0, m = 0; d.sets.forEach(s => { if (s.type === 'Valendo') { v += (s.reps * s.weight); if (s.weight > m) m = s.weight; } }); return { v, m }; } const st1 = calcStats(first); const st2 = calcStats(last); function calcDelta(i, a) { if (i === 0 && a > 0) return 100; if (i === 0 && a === 0) return 0; return (((a - i) / i) * 100).toFixed(1); } const dV = calcDelta(st1.v, st2.v); const dW = calcDelta(st1.m, st2.m); function fDelta(d) { const n = Number(d); if (n > 0) return `<span style="color:var(--success)">+${n}% ↗</span>`; if (n < 0) return `<span style="color:var(--danger)">${n}% ↘</span>`; return `<span style="color:var(--warning)">0% →</span>`; } res.innerHTML = `<div class="section-panel" style="margin-top:1rem; text-align:center;"><h4>Primeiro vs Último</h4><div style="margin: 1.5rem 0"><p style="color:var(--text-muted); font-size:0.8rem">Volume Total</p><h3>${st1.v}kg → ${st2.v}kg ${fDelta(dV)}</h3></div><div><p style="color:var(--text-muted); font-size:0.8rem">Carga Máxima</p><h3>${st1.m}kg → ${st2.m}kg ${fDelta(dW)}</h3></div></div>`; }

// --- 6. EXPORTAR / IMPORTAR BACKUP (JSON) ---
async function exportData() {
    try {
        const exercises = await dbGetAll('exercises');
        const templates = await dbGetAll('templates');
        const workouts = await dbGetAll('workouts');

        const backup = {
            version: 1,
            date: new Date().toISOString(),
            data: { exercises, templates, workouts }
        };

        // Cria um Blob (arquivo binário temporário) para evitar quebrar com imagens Base64 grandes
        const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `gym_kaiser_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert("Erro ao exportar dados.");
        console.error(error);
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Isso apagará seus dados atuais e os substituirá pelos do backup. Deseja continuar?")) {
        event.target.value = ''; // Reseta o input
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.data || !backup.data.exercises) throw new Error("Formato inválido");

            const db = await initDB();
            const stores = ['exercises', 'templates', 'workouts'];
            const tx = db.transaction(stores, 'readwrite');

            // 1. Limpa o banco atual
            stores.forEach(store => tx.objectStore(store).clear());

            // 2. Insere os dados do backup
            backup.data.exercises.forEach(item => tx.objectStore('exercises').put(item));
            backup.data.templates.forEach(item => tx.objectStore('templates').put(item));
            backup.data.workouts.forEach(item => tx.objectStore('workouts').put(item));

            tx.oncomplete = () => {
                alert("Backup restaurado com sucesso!");
                initManage();
                event.target.value = ''; // Reseta o input para o próximo uso
            };

            tx.onerror = () => {
                alert("Erro ao restaurar banco de dados.");
                event.target.value = '';
            };

        } catch (error) {
            alert("Erro ao ler o arquivo de backup. Certifique-se de que escolheu o arquivo .json correto.");
            console.error(error);
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// --- 7. ATUALIZAR DASHBOARD DA HOME ---
async function updateHomeDashboard() {
    try {
        const workouts = await dbGetAll('workouts');
        const totalElement = document.getElementById('dash-total-workouts');
        const lastElement = document.getElementById('dash-last-workout');

        totalElement.innerText = workouts.length;

        if (workouts.length > 0) {
            // Ordena para pegar o mais recente
            workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastDateParts = workouts[0].date.split('-');
            lastElement.innerText = `${lastDateParts[2]}/${lastDateParts[1]}`;
        } else {
            lastElement.innerText = '--/--';
        }
    } catch (e) {
        console.error("Erro ao carregar dashboard:", e);
    }
}

// --- FUNÇÃO PRINCIPAL DE NAVEGAÇÃO ---
function nav(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    window.scrollTo(0, 0); 
}

// Atualiza o dashboard quando volta para home
const originalNav = nav;
nav = function (id) {
    originalNav(id);
    if (id === 'screen-home') updateHomeDashboard();
};

// Inicializa Banco de Dados
initDB().then(() => {
    updateHomeDashboard();
});