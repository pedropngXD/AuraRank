// ================= CONFIGURAÇÕES =================
let currentUserId = null;
let marcosTocados = new Set();
let updateInterval = null;
let dadosGlobaisPerfil = null;

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
    
    // PADRÃO CLARO: Só ativa Aura se estiver explicitamente salvo
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
    // 1. ESCONDE TUDO
    ['tab-perfil', 'tab-leaderboard', 'tab-passados'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    // 2. MOSTRA O ALVO
    const target = document.getElementById('tab-' + tabName);
    target.classList.remove('hidden');
    target.classList.add('block');

    // 3. ATUALIZA BOTÕES (RESET)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        // Remove estado Ativo
        btn.classList.remove('bg-metal-red', 'text-white');
        
        // Adiciona estado Inativo (Fundo escuro, texto padrão, borda padrão)
        btn.classList.add('bg-metal-dark', 'text-metal-text', 'hover:bg-metal-red', 'hover:text-white');
    });

    // 4. DESTACA BOTÃO ATUAL
    if (event && event.currentTarget) {
        const btn = event.currentTarget;
        
        // Remove Inativo
        btn.classList.remove('bg-metal-dark', 'text-metal-text', 'hover:bg-metal-red', 'hover:text-white');
        
        // Adiciona Ativo (Fundo Vermelho, Texto Branco, E MANTÉM A BORDA VISÍVEL)
        btn.classList.add('bg-metal-red', 'text-white', 'border-metal-border');
    }
}

function atualizarVisualPerfil() {
    if (!dadosGlobaisPerfil) return;

    const rankElement = document.getElementById('p-rank-nome');
    const isAura = document.body.classList.contains('theme-aura');

    // Definição dos Tamanhos
    const tamanhoGrande = ['text-3xl', 'md:text-5xl']; // Para o Elo (Aura)
    const tamanhoMenor = ['text-xl', 'md:text-3xl'];   // Para o Cargo (Claro)

    if (isAura) {
        // --- MODO AURA (ELO) ---
        rankElement.innerText = dadosGlobaisPerfil.elo.toUpperCase();
        
        // 1. Cor e Estilo: Vermelho e Itálico
        rankElement.classList.add('text-metal-red', 'italic');
        rankElement.classList.remove('text-gray-600', 'not-italic', 'text-metal-text');
        
        // 2. Tamanho: Grande
        rankElement.classList.remove(...tamanhoMenor);
        rankElement.classList.add(...tamanhoGrande);

    } else {
        // --- MODO CLARO (CARGO) ---
        rankElement.innerText = dadosGlobaisPerfil.cargo.toUpperCase();
        
        // 1. Cor e Estilo: Cinza Escuro e Sem Itálico
        // 'text-gray-600' é um cinza escuro suave, 'text-gray-800' seria quase preto.
        rankElement.classList.remove('text-metal-red', 'italic', 'text-metal-text');
        rankElement.classList.add('text-gray-600', 'not-italic');
        
        // 2. Tamanho: Um pouco menor
        rankElement.classList.remove(...tamanhoGrande);
        rankElement.classList.add(...tamanhoMenor);
    }
}

async function atualizarDados() {
    if(!currentUserId) return;

    try {
        const res = await fetch(`/api/perfil/${currentUserId}`);
        const data = await res.json();
        if(data.error) { fazerLogout(); return; }

        dadosGlobaisPerfil = data;

        document.getElementById('p-nome').innerText = data.nome.toUpperCase();
        
        atualizarVisualPerfil();

        document.getElementById('p-xp-texto').innerHTML = `${data.total} / ${data.meta} <span class="points-label"></span>`;

        const rankImg = document.getElementById('p-rank-img');
        rankImg.src = `/static/imgs/${data.elo}.png`;
        rankImg.classList.remove(...Object.values(rankGlow));
        if (rankGlow[data.elo]) {
            rankImg.classList.add(rankGlow[data.elo]);
        }

        const pct = Math.min((data.total / data.meta) * 100, 100);
        document.getElementById('xp-bar').style.width = pct + '%';

        if (data.video && !marcosTocados.has(data.total)) {
            const chaveVideo = `aura_visto_${currentUserId}_${data.total}`;
            const jaAssistiu = localStorage.getItem(chaveVideo);
            const isAuraMode = document.body.classList.contains('theme-aura');

            if (!jaAssistiu && isAuraMode) {
                tocarVideo(data.video);
                localStorage.setItem(chaveVideo, "true");
            }
        }
    } catch (e) { console.error(e); }

    try {
        const res = await fetch('/api/leaderboard');
        const lista = await res.json();
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = '';

        lista.forEach((item, index) => {
            // PADRÃO DE CORES E BORDAS DO RANKING ATUAL
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
                <img src="/static/imgs/${item.elo}.png" class="rank-img-display h-[6.30rem] w-[11.30rem] object-contain mx-2 ${rankGlow[item.elo] || ''}">
            `;
            container.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

const MESES = {"Janeiro":1,"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6,"Julho":7,"Agosto":8,"Setembro":9,"Outubro":10,"Novembro":11,"Dezembro":12};

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
        if (!lista || lista.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">NADA ENCONTRADO.</p>';
            return;
        }

        lista.forEach((item, index) => {
            // --- CORREÇÃO AQUI ---
            // Antes usava 'text-metal-gold', etc. 
            // Agora usa 'text-metal-text' para acompanhar o tema (Preto ou Branco).
            let corPos = 'text-metal-text'; 

            const div = document.createElement('div');
            // Mantém a borda padrão 'border-metal-border'
            div.className = `bg-metal-dark border border-metal-border p-4 rounded-xl flex items-center justify-between shadow-lg`;
            
            div.innerHTML = `
                <div class="${corPos} font-metal text-3xl w-12 text-center">${index + 1}º</div>
                <div class="flex-1 text-left pl-4 font-bold text-xl text-metal-text tracking-wider truncate">${item.nome.toUpperCase()}</div>
                <div class="text-metal-red font-metal text-3xl min-w-[150px] text-right">
                    ${item.pontos} <span class="points-label"></span>
                </div>
                <img src="/static/imgs/${item.elo}.png" class="rank-img-display h-[6.30rem] w-[11.30rem] object-contain mx-2 ${rankGlow[item.elo] || ''}">
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-center text-metal-red">ERRO NO SERVIDOR</p>';
    }
}

function tocarVideo(nomeVideo) {
    const overlay = document.getElementById('video-overlay');
    const player = document.getElementById('player');
    player.src = `/static/vids/${nomeVideo}.mp4`;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    player.play().catch(() => {});
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