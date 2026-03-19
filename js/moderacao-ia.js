/**
 * ================================================
 * MODERAÇÃO INTELIGENTE DE COMENTÁRIOS
 * ================================================
 * IA detecta spam, hate speech e conteúdo inapropriado
 */

import { AIEngine } from "./ai-engine.js";

const ModeracaoIA = {
    // Tipos de infração
    TIPOS_INFRAÇAO: {
        NORMAL: "normal",
        SPAM: "spam",
        HATE_SPEECH: "hate_speech",
        COMERCIAL: "spam_comercial",
        INAPROPRIADO: "conteudo_inapropriado",
        DOENÇA: "informação_falsa"
    },

    // Analisar comentário para moderação
    async analisarComentario(textoComentario) {
        if (!AIEngine) {
            return { 
                aceitavel: true, 
                tipo: this.TIPOS_INFRAÇAO.NORMAL,
                confianca: 0,
                razao: "IA não disponível"
            };
        }

        if (textoComentario.length < 5) {
            return {
                aceitavel: false,
                tipo: this.TIPOS_INFRAÇAO.SPAM,
                confianca: 0.95,
                razao: "Comentário muito curto"
            };
        }

        const prompt = `Analise este comentário para moderação de conteúdo:

"${textoComentario}"

Categorize como:
- normal: Comentário OK
- spam: Publicidade, links suspeitos
- hate_speech: Discurso de ódio, insultos
- spam_comercial: Promoções não autorizadas
- conteudo_inapropriado: Explícito, violência
- informacao_falsa: Desinformação, fake news

Retorne em JSON:
{
  "tipo": "categoria",
  "aceitavel": true/false,
  "confianca": 0.0-1.0,
  "razao": "Explicação breve"
}`;

        const resultado = await AIEngine.gerar({
            prompt,
            system: "Você é um moderador de conteúdo online. Classifique comentários de forma justa e precisa."
        });

        if (!resultado.sucesso) {
            return { 
                aceitavel: true, 
                tipo: this.TIPOS_INFRAÇAO.NORMAL,
                confianca: 0.5,
                razao: "IA falhou, aprovando manualmente"
            };
        }

        try {
            const dados = JSON.parse(resultado.texto);
            return {
                tipo: dados.tipo,
                aceitavel: dados.aceitavel,
                confianca: dados.confianca,
                razao: dados.razao
            };
        } catch (erro) {
            return { 
                aceitavel: true, 
                tipo: this.TIPOS_INFRAÇAO.NORMAL,
                confianca: 0,
                razao: "Erro ao parsear análise"
            };
        }
    },

    // Analisar lote de comentários
    async analisarLote(comentarios) {
        const resultados = [];

        for (const comentario of comentarios) {
            const analise = await this.analisarComentario(comentario.conteudo);
            resultados.push({
                comentarioId: comentario.id,
                conteudo: comentario.conteudo,
                analise
            });
        }

        return {
            total: comentarios.length,
            aprovados: resultados.filter(r => r.analise.aceitavel).length,
            rejeitados: resultados.filter(r => !r.analise.aceitavel).length,
            resultados
        };
    },

    // Renderizar painel de moderação
    async renderizarPainelModeração(containerId, comentarios) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "<p>🔄 Analisando comentários...</p>";

        const analise = await this.analisarLote(comentarios);

        let html = `
            <div style="padding: 20px; background: #1a1a1a; border-radius: 8px;">
                <h3>🛡️ Painel de Moderação</h3>
                
                <div style="display: flex; gap: 10px; margin: 15px 0;">
                    <div style="flex: 1; background: #0a5f0a; padding: 15px; border-radius: 5px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; color: #4ade80;">✓</p>
                        <p style="margin: 5px 0 0 0; color: #4ade80;"><strong>${analise.aprovados}</strong> Aprovados</p>
                    </div>
                    <div style="flex: 1; background: #5f0a0a; padding: 15px; border-radius: 5px; text-align: center;">
                        <p style="margin: 0; font-size: 24px; color: #f87171;">✗</p>
                        <p style="margin: 5px 0 0 0; color: #f87171;"><strong>${analise.rejeitados}</strong> Rejeitados</p>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <h4>Detalhes</h4>
        `;

        for (const resultado of analise.resultados) {
            const cor = resultado.analise.aceitavel ? "#d1d5db" : "#f87171";
            const icone = resultado.analise.aceitavel ? "✓" : "✗";

            html += `
                <div style="background: #2a2a2a; padding: 12px; margin: 8px 0; border-left: 3px solid ${cor}; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: ${cor}; font-weight: bold;">${icone} ${resultado.analise.tipo.toUpperCase()}</p>
                            <p style="margin: 5px 0 0 0; color: #d1d5db; font-size: 13px;">"${resultado.conteudo.substring(0, 60)}..."</p>
                            <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">📝 ${resultado.analise.razao}</p>
                        </div>
                        <span style="color: #6b7280; font-size: 12px;">${Math.round(resultado.analise.confianca * 100)}%</span>
                    </div>
                </div>
            `;
        }

        html += "</div></div>";
        container.innerHTML = html;
    }
};

window.ModeracaoIA = ModeracaoIA;
export { ModeracaoIA };
