// ================= CONFIGURAÇÕES =================
let currentUserId = null;
let marcosTocados = new Set();
let updateInterval = null;
let dadosGlobaisPerfil = null;

// Guarda o último elo conhecido para detectar mudança de rank
let ultimoEloConhecido = null;

const rankGlow = {
    iron: 'drop-shadow-[0_0_15px_rgba(120,120,120,0.5)]',
    bronze: 'drop-shadow-[0_0_25px_rgba(205,127,50,0.5)]',
    gold: 'drop-shadow-[0_0_20px_rgba(180,180,180,0.6)]',
    diamond: 'drop-shadow-[0_0_25px_rgba(0,191,255,0.6)]',
    mistico: 'drop-shadow-[0_0_25px_rgba(0,255,200,0.6)]',
    master: 'drop-shadow-[0_0_25px_rgba(199,21,133,0.7)]',
    grandmaster: 'drop-shadow-[0_0_25px_rgba(255,69,0,0.7)]',
    legend: 'drop-shadow-[0_0_25px_rgba(255,255,255,0.8)]',
    devil: 'drop-shadow-[0_0_26px_rgba(75,0,130,0.9)]',
};

// ================= INICIALIZAÇÃO =================
document.addEventListener("DOMContentLoaded", () => {
    const temaSalvo = localStorage.getItem("aura_theme");
    
    // PADRÃO CLARO
    if (temaSalvo === 'aura') {
        document.body.classList.add('theme-aura');
    } else {
        document.body.classList.remove('theme-aura');
    }

    initDropdowns(); 

    const inputLogin = document.getElementById('user-id-input');
    if (inputLogin) {
        inputLogin.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                fazerLogin();
            }
        });
        setTimeout(() => inputLogin.focus(), 100);
    }

    const idSalvo = localStorage.getItem("aura_user_id");
    if (idSalvo) {
        iniciarSessao(idSalvo);
    } else {
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('login-overlay').classList.add('flex');
    }
});

function alternarTema() {
    const body = document.body;
    body.classList.toggle('theme-aura');
    
    if (body.classList.contains('theme-aura')) {
        localStorage.setItem("aura_theme", "aura");
    } else {
        localStorage.setItem("aura_theme", "corp");
    }
    atualizarVisualPerfil(); 
}

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

// ================= LÓGICA DE ABAS =================
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
        btn.classList.remove('bg-metal-red', 'text-white');
        btn.classList.add('bg-metal-dark', 'text-metal-text', 'hover:bg-metal-red', 'hover:text-white');
    });

    if (event && event.currentTarget) {
        const btn = event.currentTarget;
        btn.classList.remove('bg-metal-dark', 'text-metal-text', 'hover:bg-metal-red', 'hover:text-white');
        btn.classList.add('bg-metal-red', 'text-white', 'border-metal-border');
    }
}

function atualizarVisualPerfil() {
    if (!dadosGlobaisPerfil) return;

    const rankElement = document.getElementById('p-rank-nome');
    const isAura = document.body.classList.contains('theme-aura');

    const tamanhoGrande = ['text-3xl', 'md:text-5xl'];
    const tamanhoMenor = ['text-xl', 'md:text-3xl'];

    if (isAura) {
        rankElement.innerText = dadosGlobaisPerfil.elo.toUpperCase();
        rankElement.classList.add('text-metal-red', 'italic');
        rankElement.classList.remove('text-gray-600', 'not-italic', 'text-metal-text');
        rankElement.classList.remove(...tamanhoMenor);
        rankElement.classList.add(...tamanhoGrande);
    } else {
        rankElement.innerText = dadosGlobaisPerfil.cargo.toUpperCase();
        rankElement.classList.remove('text-metal-red', 'italic', 'text-metal-text');
        rankElement.classList.add('text-gray-600', 'not-italic');
        rankElement.classList.remove(...tamanhoGrande);
        rankElement.classList.add(...tamanhoMenor);
    }
}

// ================= ATUALIZAÇÃO DE DADOS =================
async function atualizarDados() {
    if (!currentUserId) return;

    try {
        const res = await fetch(`/api/perfil/${currentUserId}`);
        const data = await res.json();
        if (data.error) { fazerLogout(); return; }

        dadosGlobaisPerfil = data;

        document.getElementById('p-nome').innerText = data.nome.toUpperCase();
        
        atualizarVisualPerfil();

        document.getElementById('p-xp-texto').innerHTML = `${data.total} / ${data.meta} <span class="points-label"></span>`;

        const mesesNomes = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const mesAtual = new Date().getMonth();
        const pTemporada = document.getElementById('p-temporada');
        if (pTemporada) {
            pTemporada.innerText = `TEMPORADA ${mesesNomes[mesAtual]}`;
        }

        const rankImg = document.getElementById('p-rank-img');
        rankImg.src = `/static/imgs/${data.elo}.png`;
        rankImg.classList.remove(...Object.values(rankGlow));
        if (rankGlow[data.elo]) {
            rankImg.classList.add(rankGlow[data.elo]);
        }

        const pct = Math.min((data.total / data.meta) * 100, 100);
        document.getElementById('xp-bar').style.width = pct + '%';

        // ================= LÓGICA DO VÍDEO (CORRIGIDA) =================
        //
        // O vídeo deve ser exibido quando:
        //   1. A API retorna um vídeo para o total atual (data.video existe)
        //   2. O tema escuro (Aura) está ativo
        //   3. O vídeo ainda não foi exibido para este usuário neste marco
        //      (chave salva no localStorage por usuário + total de pontos)
        //
        // PROBLEMA ANTERIOR: marcosTocados era um Set em memória mas nunca
        // recebia .add(), e o localStorage era gravado antes da verificação,
        // fazendo o vídeo nunca disparar na segunda chamada de atualizarDados.
        //
        // SOLUÇÃO: usar apenas o localStorage como fonte de verdade, sem o Set.
        // A chave é salva SOMENTE após o vídeo ser efetivamente exibido.
        //
        if (data.video) {
            const isAuraMode = document.body.classList.contains('theme-aura');
            const chaveVideo = `aura_visto_${currentUserId}_${data.total}`;
            const jaAssistiu = localStorage.getItem(chaveVideo);

            if (isAuraMode && !jaAssistiu) {
                // Marca ANTES de tocar para evitar duplo disparo em chamadas rápidas
                localStorage.setItem(chaveVideo, "true");
                tocarVideo(data.video);
            }
        }
        // ================= FIM DA LÓGICA DO VÍDEO =================

    } catch (e) { console.error(e); }

    try {
        const res = await fetch('/api/leaderboard');
        const lista = await res.json();
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = '';

        lista.forEach((item, index) => {
            let corPos = 'text-metal-text'; 
            let borderClass = 'border-metal-border';

            const div = document.createElement('div');
            div.className = `bg-metal-dark border ${borderClass} p-4 rounded-xl flex items-center justify-between shadow-lg transform hover:scale-[1.01] transition-all`;

            div.innerHTML = `
                <div class="${corPos} font-metal text-3xl w-12 text-center">${index + 1}º</div>
                <div class="flex-1 text-left pl-4 font-bold text-lg md:text-xl text-metal-text tracking-wider truncate">${item.nome}</div>
                <div class="text-metal-red font-metal text-3xl min-w-[150px] text-right">
                    ${item.pontos} <span class="points-label"></span>
                </div>
                <img src="/static/imgs/${item.elo}.png" class="rank-img-display h-[7.5rem] w-[7.5rem] object-contain mx-2 ${rankGlow[item.elo] || ''}">
            `;
            container.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

const MESES = {"Janeiro":1,"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6,"Julho":7,"Agosto":8,"Setembro":9,"Outubro":10,"Novembro":11,"Dezembro":12};

function initDropdowns() {
    const selAno = document.getElementById('sel-ano');
    const selMes = document.getElementById('sel-mes');
    if (!selAno) return;

    const anoAtual = new Date().getFullYear();
    for (let i = 2025; i <= anoAtual; i++) {
        let opt = document.createElement('option');
        opt.value = i; opt.innerText = i;
        if (i === anoAtual) opt.selected = true;
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
        if (!lista || lista.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">NADA ENCONTRADO.</p>';
            return;
        }

        lista.forEach((item, index) => {
            let corPos = 'text-metal-text'; 

            const div = document.createElement('div');
            div.className = `bg-metal-dark border border-metal-border p-4 rounded-xl flex items-center justify-between shadow-lg`;
            
            div.innerHTML = `
                <div class="${corPos} font-metal text-3xl w-12 text-center">${index + 1}º</div>
                <div class="flex-1 text-left pl-4 font-bold text-xl text-metal-text tracking-wider truncate">${item.nome.toUpperCase()}</div>
                <div class="text-metal-red font-metal text-3xl min-w-[150px] text-right">
                    ${item.pontos} <span class="points-label"></span>
                </div>
                <img src="/static/imgs/${item.elo}.png" class="rank-img-display h-[7.5rem] w-[7.5rem] object-contain mx-2 ${rankGlow[item.elo] || ''}">
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center text-metal-red">ERRO NO SERVIDOR</p>';
    }
}

// ================= VÍDEO =================
function tocarVideo(nomeVideo) {
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('player');

    // CORREÇÃO: usar player.src diretamente (sem <source> interno no HTML)
    // Forçar reload do elemento para garantir que o novo src seja carregado
    player.pause();
    player.removeAttribute('src');
    player.load();

    player.src = `/static/vids/${nomeVideo}.mp4`;
    player.load();

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    player.play().catch((err) => {
        // Autoplay pode ser bloqueado pelo navegador na primeira interação.
        // Neste caso o overlay fica visível e o usuário clica para fechar/tocar.
        console.warn('Autoplay bloqueado pelo navegador:', err);
    });

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