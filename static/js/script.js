// ================= CONFIGURAÇÕES =================
let currentUserId = null;
let marcosTocados = new Set();
let updateInterval = null;

// ================= INICIALIZAÇÃO =================
document.addEventListener("DOMContentLoaded", () => {
    initDropdowns(); 

    // --- CORREÇÃO DO ENTER E FOCO AUTOMÁTICO ---
    const inputLogin = document.getElementById('user-id-input');
    if (inputLogin) {
        // Garante que o input receba o evento de tecla
        inputLogin.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); // Impede comportamentos estranhos
                fazerLogin();
            }
        });
        // Foca no campo assim que abre a página
        setTimeout(() => inputLogin.focus(), 100);
    }
    // -------------------------------------------

    const idSalvo = localStorage.getItem("aura_user_id");
    if (idSalvo) {
        iniciarSessao(idSalvo);
    } else {
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('login-overlay').classList.add('flex');
    }
});

function fazerLogin() {
    const id = document.getElementById('user-id-input').value;
    if (!id) return;
    localStorage.setItem("aura_user_id", id);
    iniciarSessao(id);
}

function iniciarSessao(id) {
    currentUserId = id;
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('login-overlay').classList.remove('flex');
    document.getElementById('main-interface').style.display = 'flex'; 
    
    atualizarDados();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(atualizarDados, 30000);
}

function fazerLogout() {
    localStorage.removeItem("aura_user_id");
    location.reload();
}

function showTab(tabName, event) {
    ['tab-perfil', 'tab-leaderboard', 'tab-passados'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    const target = document.getElementById('tab-' + tabName);
    target.classList.remove('hidden');
    target.classList.add('block');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-metal-red', 'text-black', 'border-metal-red');
        btn.classList.add('bg-metal-dark', 'text-white', 'border-metal-border');
    });

    if (event && event.currentTarget) {
        const btn = event.currentTarget;
        btn.classList.remove('bg-metal-dark', 'text-white', 'border-metal-border');
        btn.classList.add('bg-metal-red', 'text-black', 'border-metal-red');
    }
}

async function atualizarDados() {
    if(!currentUserId) return;

    try {
        const res = await fetch(`/api/perfil/${currentUserId}`);
        const data = await res.json();
        if(data.error) { fazerLogout(); return; }

        document.getElementById('p-nome').innerText = data.nome.toUpperCase();
        document.getElementById('p-rank-nome').innerText = data.elo.toUpperCase();
        document.getElementById('p-xp-texto').innerText = `${data.total} / ${data.meta} Chamados`;
        document.getElementById('p-rank-img').src = `/static/imgs/${data.elo}.png`;
        const pct = Math.min((data.total / data.meta) * 100, 100);
        document.getElementById('xp-bar').style.width = pct + '%';

        if (data.video && !marcosTocados.has(data.total)) {
            tocarVideo(data.video);
            marcosTocados.add(data.total);
        }
    } catch (e) { console.error(e); }

    try {
        const res = await fetch('/api/leaderboard');
        const lista = await res.json();
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = '';
        lista.forEach((item, index) => {
            let corPos = index === 0 ? 'text-metal-gold' : (index === 1 ? 'text-gray-300' : 'text-orange-400');
            let borderClass = index === 0 ? 'border-metal-gold' : 'border-metal-border';
            const div = document.createElement('div');
            div.className = `bg-metal-dark border ${borderClass} p-4 rounded-xl flex items-center justify-between shadow-lg transform hover:scale-[1.01] transition-all`;
            div.innerHTML = `<div class="${corPos} font-metal text-3xl w-12 text-center">${index + 1}º</div><div class="flex-1 text-left pl-4 font-bold text-lg md:text-xl text-white tracking-wider truncate">${item.nome}</div><img src="/static/imgs/${item.elo}.png" class="h-12 w-12 object-contain mx-2"><div class="text-metal-red font-metal text-xl min-w-[100px] text-right">${item.pontos}</div>`;
            container.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

const MESES = {"Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12};
function initDropdowns() {
    const selAno = document.getElementById('sel-ano');
    const selMes = document.getElementById('sel-mes');
    if(!selAno) return;
    const anoAtual = new Date().getFullYear();
    for (let i = 2025; i <= anoAtual; i++) {
        let opt = document.createElement('option');
        opt.value = i; opt.innerText = i;
        if(i === anoAtual) opt.selected = true;
        selAno.appendChild(opt);
    }
    for (const [nome, valor] of Object.entries(MESES)) {
        let opt = document.createElement('option');
        opt.value = valor; opt.innerText = nome;
        selMes.appendChild(opt);
    }
}

async function buscarHistorico() {
    const ano = document.getElementById('sel-ano').value;
    const mes = document.getElementById('sel-mes').value;
    const container = document.getElementById('historico-list');
    container.innerHTML = '<p class="text-center text-gray-500 animate-pulse">BUSCANDO...</p>';
    try {
        const res = await fetch(`/api/historico?ano=${ano}&mes=${mes}`);
        const lista = await res.json();
        container.innerHTML = '';
        if (!lista || lista.length === 0) { container.innerHTML = '<p class="text-center text-gray-500">NADA ENCONTRADO.</p>'; return; }
        lista.forEach((item, index) => {
            let corPos = index === 0 ? 'text-metal-gold' : (index === 1 ? 'text-gray-300' : 'text-orange-400');
            const div = document.createElement('div');
            div.className = `bg-metal-dark border border-metal-border p-4 rounded-xl flex items-center justify-between shadow-lg`;
            div.innerHTML = `<div class="${corPos} font-metal text-3xl w-12 text-center">${index + 1}º</div><div class="flex-1 text-left pl-4 font-bold text-xl text-white tracking-wider truncate">${item.nome.toUpperCase()}</div><img src="/static/imgs/${item.elo}.png" class="h-12 w-12 object-contain mx-2"><div class="text-metal-red font-metal text-xl min-w-[100px] text-right">${item.pontos}</div>`;
            container.appendChild(div);
        });
    } catch (e) { container.innerHTML = '<p class="text-center text-metal-red">ERRO NO SERVIDOR</p>'; }
}

function tocarVideo(nomeVideo) {
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('player');
    player.src = `/static/vids/${nomeVideo}.mp4`;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    player.play().catch(e => console.log("Autoplay bloqueado"));
    player.onended = fecharVideo;
}
function fecharVideo() {
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('player');
    player.pause();
    player.currentTime = 0;
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}