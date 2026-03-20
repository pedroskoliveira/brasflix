/**
 * ================================================
 * TRADUÇÃO AUTOMÁTICA COM IA
 * ================================================
 * Traduz comentários para múltiplos idiomas
 */

import { AIEngine } from "./ai-engine.js";

const TradutorIA = {
    IDIOMAS: {
        pt: "Português",
        en: "Inglês",
        es: "Espanhol",
        fr: "Francês",
        de: "Alemão",
        ja: "Japonês"
    },

    // Traduzir texto
    async traduzir(texto, idiomasDestino = ["en", "es"]) {
        if (!AIEngine) {
            return { 
                sucesso: false, 
                erro: "AIEngine não disponível",
                traducoes: {}
            };
        }

        if (!texto.trim()) {
            return { sucesso: false, erro: "Texto vazio", traducoes: {} };
        }

        const idiomasNomes = idiomasDestino.map(id => this.IDIOMAS[id] || id).join(", ");

        const prompt = `Traduza este texto para ${idiomasNomes}:

"${texto}"

Retorne em JSON (mantenha o significado exato):
{
  "original": "${texto}",
  "traducoes": {
    "en": "tradução em inglês",
    "es": "tradução em espanhol"
  }
}`;

        const resultado = await AIEngine.gerar({
            prompt,
            system: "Você é um tradutor profissional. Traduza com precisão e naturalidade."
        });

        if (!resultado.sucesso) {
            return { sucesso: false, erro: resultado.erro, traducoes: {} };
        }

        try {
            const dados = JSON.parse(resultado.texto);
            return {
                sucesso: true,
                origem: resultado.origem,
                traducoes: dados.traducoes,
                idiomas: idiomasDestino
            };
        } catch (erro) {
            return { sucesso: false, erro: "Erro ao parsear tradução", traducoes: {} };
        }
    },

    // Widget de tradução para comentários
    criarWidgetTraducao(textoOriginal, comentarioId) {
        const widget = document.createElement("div");
        widget.className = "traducao-widget";
        widget.id = `traducao-${comentarioId}`;
        widget.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 5px;
            border-left: 3px solid #e50914;
        `;

        widget.innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button data-idioma="en" style="padding: 6px 12px; background: #e50914; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                    🌐 English
                </button>
                <button data-idioma="es" style="padding: 6px 12px; background: #e50914; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                    🌐 Español
                </button>
                <button data-idioma="fr" style="padding: 6px 12px; background: #e50914; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                    🌐 Français
                </button>
            </div>
            <div id="traducoes-${comentarioId}" style="margin-top: 10px;"></div>
        `;

        // Adicionar listeners
        const botoes = widget.querySelectorAll("button");
        botoes.forEach(botao => {
            botao.addEventListener("click", async () => {
                const idioma = botao.dataset.idioma;
                botao.textContent = "⏳ Traduzindo...";
                botao.disabled = true;

                const resultado = await this.traduzir(textoOriginal, [idioma]);

                if (resultado.sucesso) {
                    const divTraducoes = document.getElementById(`traducoes-${comentarioId}`);
                    const traducao = resultado.traducoes[idioma];
                    
                    if (traducao) {
                        divTraducoes.innerHTML += `
                            <div style="padding: 8px; background: #1a1a1a; margin: 5px 0; border-radius: 3px;">
                                <p style="margin: 0; color: #999; font-size: 11px;">${this.IDIOMAS[idioma]}</p>
                                <p style="margin: 5px 0 0 0; color: #ddd;">${traducao}</p>
                            </div>
                        `;
                    }
                }

                botao.textContent = `🌐 ${this.IDIOMAS[idioma]}`;
                botao.disabled = false;
            });
        });

        return widget;
    }
};

window.TradutorIA = TradutorIA;
export { TradutorIA };
