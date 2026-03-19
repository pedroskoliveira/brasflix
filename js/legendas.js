/**
 * ================================================
 * SISTEMA DE LEGENDAS MULTILÍNGUE
 * ================================================
 * Suporta português, inglês e espanhol
 */

const Legendas = {
    // Idiomas suportados
    IDIOMAS: {
        pt: { nome: "Português (BR)", codigo: "pt-BR" },
        en: { nome: "English (US)", codigo: "en-US" },
        es: { nome: "Español (MX)", codigo: "es-MX" }
    },

    // Estado da legendagem
    estado: {
        ativo: false,
        idiomaAtual: "pt",
        videoId: "",
        legendas: {}
    },

    // Inicializar legendas
    inicializar(videoId, containerVideoId = "videoContainer", botaoLegendaId = "btnLegendas") {
        this.estado.videoId = videoId;

        const containerVideo = document.getElementById(containerVideoId);
        const player = document.querySelector(`#${containerVideoId} video`) || document.getElementById("playerBrasflix");

        if (!containerVideo || !player) return;

        // Criar elementos de legenda
        const containerLegendas = document.createElement("div");
        containerLegendas.id = "legendas-container";
        containerLegendas.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 0;
            right: 0;
            text-align: center;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            font-size: 16px;
            color: #fff;
            font-family: Arial, sans-serif;
            z-index: 100;
            display: none;
            line-height: 1.4;
        `;
        containerVideo.appendChild(containerLegendas);

        // Criar painel de controle
        const painelControle = document.createElement("div");
        painelControle.id = "legendas-painel-controle";
        painelControle.style.cssText = `
            display: none;
            position: absolute;
            bottom: 100px;
            right: 20px;
            background: #1a1a1a;
            border: 1px solid #e50914;
            border-radius: 8px;
            padding: 15px;
            z-index: 101;
            min-width: 250px;
        `;

        painelControle.innerHTML = `
            <div style="color: #fff; margin-bottom: 10px; font-weight: bold;">Legendas</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${Object.entries(this.IDIOMAS).map(([codigo, info]) => `
                    <button data-idioma="${codigo}" style="
                        padding: 8px 12px;
                        background: ${codigo === this.estado.idiomaAtual ? '#e50914' : '#2a2a2a'};
                        color: #fff;
                        border: 1px solid #e50914;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        ${info.nome}
                    </button>
                `).join("")}
                <button id="btn-desativar-legendas" style="
                    padding: 8px 12px;
                    background: #2a2a2a;
                    color: #f87171;
                    border: 1px solid #f87171;
                    border-radius: 4px;
                    cursor: pointer;
                ">
                    ✕ Desativar
                </button>
            </div>
        `;
        containerVideo.appendChild(painelControle);

        // Botão de ativar legendas
        const botaoLegendas = document.getElementById(botaoLegendaId) || this.criarBotaoLegendas(containerVideo);

        if (botaoLegendas) {
            botaoLegendas.addEventListener("click", () => {
                painelControle.style.display = painelControle.style.display === "none" ? "block" : "none";
            });
        }

        // Event listeners para idiomas
        painelControle.querySelectorAll("button[data-idioma]").forEach(botao => {
            botao.addEventListener("click", (e) => {
                const novoIdioma = e.target.dataset.idioma;
                this.trocarIdioma(novoIdioma);

                // Atualizar visual do botão
                painelControle.querySelectorAll("button[data-idioma]").forEach(b => {
                    b.style.background = b.dataset.idioma === novoIdioma ? "#e50914" : "#2a2a2a";
                });
            });
        });

        // Botão desativar
        const btnDesativar = painelControle.querySelector("#btn-desativar-legendas");
        if (btnDesativar) {
            btnDesativar.addEventListener("click", () => {
                this.desativar();
                painelControle.style.display = "none";
            });
        }

        // Escutar mudanças de tempo do vídeo para atualizar legendas
        player.addEventListener("timeupdate", () => {
            if (this.estado.ativo) {
                this.atualizarLegenda(player.currentTime);
            }
        });
    },

    // Criar botão de legendas
    criarBotaoLegendas(containerVideo) {
        const botao = document.createElement("button");
        botao.id = "btnLegendas";
        botao.innerHTML = "🔤 Legendas";
        botao.style.cssText = `
            padding: 8px 16px;
            background: #e50914;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            position: absolute;
            bottom: 20px;
            right: 20px;
            z-index: 99;
            transition: all 0.3s;
        `;

        botao.addEventListener("mouseover", () => {
            botao.style.background = "#bb0000";
        });

        botao.addEventListener("mouseout", () => {
            botao.style.background = "#e50914";
        });

        if (containerVideo) {
            containerVideo.appendChild(botao);
        }

        return botao;
    },

    // Carregar legendas (simulado ou via API)
    async carregarLegendas(videoId) {
        // Formato de exemplo para legendas
        // Na prática, viria do Firebase ou API de legendas
        const legendasExemplo = {
            pt: [
                { inicio: 0, fim: 5, texto: "Bem-vindo ao BRASFLIX" },
                { inicio: 5, fim: 10, texto: "A plataforma de streaming inteligente" },
                { inicio: 10, fim: 20, texto: "Com IA integrada para melhor experiência" }
            ],
            en: [
                { inicio: 0, fim: 5, texto: "Welcome to BRASFLIX" },
                { inicio: 5, fim: 10, texto: "The intelligent streaming platform" },
                { inicio: 10, fim: 20, texto: "With integrated AI for better experience" }
            ],
            es: [
                { inicio: 0, fim: 5, texto: "Bienvenido a BRASFLIX" },
                { inicio: 5, fim: 10, texto: "La plataforma de transmisión inteligente" },
                { inicio: 10, fim: 20, texto: "Con IA integrada para mejor experiencia" }
            ]
        };

        // TODO: Substituir por API real
        // const legendas = await fetch(`/api/legendas/${videoId}`).then(r => r.json());

        this.estado.legendas = legendasExemplo;
        return legendasExemplo;
    },

    // Ativar legendas
    async ativar() {
        const containerLegendas = document.getElementById("legendas-container");
        if (!containerLegendas) return;

        // Carregar legendas se não estiverem carregadas
        if (Object.keys(this.estado.legendas).length === 0) {
            await this.carregarLegendas(this.estado.videoId);
        }

        this.estado.ativo = true;
        containerLegendas.style.display = "block";
    },

    // Desativar legendas
    desativar() {
        const containerLegendas = document.getElementById("legendas-container");
        if (containerLegendas) {
            containerLegendas.style.display = "none";
        }
        this.estado.ativo = false;
    },

    // Trocar idioma
    trocarIdioma(novoIdioma) {
        if (!this.IDIOMAS[novoIdioma]) return;

        this.estado.idiomaAtual = novoIdioma;

        if (!this.estado.ativo) {
            this.ativar();
        }
    },

    // Atualizar legenda atual
    atualizarLegenda(tempoAtual) {
        const containerLegendas = document.getElementById("legendas-container");
        if (!containerLegendas || !this.estado.ativo) return;

        const legendasIdioma = this.estado.legendas[this.estado.idiomaAtual];
        if (!legendasIdioma) return;

        // Encontrar legenda para tempo atual
        const legendaAtual = legendasIdioma.find(
            leg => tempoAtual >= leg.inicio && tempoAtual < leg.fim
        );

        if (legendaAtual) {
            containerLegendas.textContent = legendaAtual.texto;
        } else {
            containerLegendas.textContent = "";
        }
    }
};

window.Legendas = Legendas;
export { Legendas };
