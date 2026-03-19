/**
 * ================================================
 * RECOMENDAÇÕES INTELIGENTES COM IA
 * ================================================
 * Sugere vídeos baseado em histórico do usuário
 */

import { db, auth } from "./firebase-config.js";
import { AIEngine } from "./ai-engine.js";
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let usuarioAtualId = null;

onAuthStateChanged(auth, (user) => {
    if (user) usuarioAtualId = user.uid;
});

const RecommendationEngine = {
    // Obter histórico do usuário
    async obterHistoricoUsuario(userId, limite = 10) {
        try {
            const snap = await getDocs(
                query(
                    collection(db, "historico_visualizacoes"),
                    where("userId", "==", userId),
                    limit(limite)
                )
            );

            return snap.docs.map(doc => ({
                videoId: doc.data().videoId,
                videoTitulo: doc.data().videoTitulo,
                categoria: doc.data().categoria,
                tempoAssistido: doc.data().tempoAssistido
            }));
        } catch (erro) {
            console.error("Erro ao obter histórico:", erro);
            return [];
        }
    },

    // Obter todos os vídeos disponíveis
    async obterTodosVideos() {
        try {
            const snap = await getDocs(collection(db, "videos"));
            return snap.docs.map(doc => ({
                id: doc.id,
                titulo: doc.data().titulo,
                descricao: doc.data().descricao,
                categoria: doc.data().categoria,
                thumbnail: doc.data().thumbnail
            }));
        } catch (erro) {
            console.error("Erro ao obter vídeos:", erro);
            return [];
        }
    },

    // Recomendação via IA
    async gerarRecomendacoes(userId) {
        if (!AIEngine) return { sucesso: false, erro: "AIEngine não disponível" };

        try {
            const historico = await this.obterHistoricoUsuario(userId, 5);
            const todosVideos = await this.obterTodosVideos();

            if (historico.length === 0 || todosVideos.length === 0) {
                return { 
                    sucesso: false, 
                    erro: "Histórico ou vídeos insuficientes",
                    recomendacoes: []
                };
            }

            // Extrair categorias do histórico
            const categorias = [...new Set(historico.map(v => v.categoria))];
            const titulos = historico.map(v => v.videoTitulo);

            const prompt = `Baseado no histórico de visualizações do usuário, recomende 3-5 vídeos.

Vídeos assistidos: ${titulos.join(", ")}
Categorias de interesse: ${categorias.join(", ")}

Vídeos disponíveis:
${todosVideos.map(v => `- ${v.titulo} (${v.categoria}): ${v.descricao}`).join("\n")}

Retorne em JSON:
{
  "recomendacoes": [
    {
      "videoId": "id",
      "titulo": "Título",
      "razao": "Por que recomendo"
    }
  ]
}`;

            const resultado = await AIEngine.gerar({
                prompt,
                system: "Você é um especialista em recomendação de conteúdo. Sugira vídeos baseado nos interesses mostrados."
            });

            if (!resultado.sucesso) {
                return { sucesso: false, erro: resultado.erro, recomendacoes: [] };
            }

            try {
                const dados = JSON.parse(resultado.texto);
                return {
                    sucesso: true,
                    origem: resultado.origem,
                    recomendacoes: dados.recomendacoes || [],
                    timestamp: new Date().toISOString()
                };
            } catch (erro) {
                console.warn("Erro ao parsear recomendações:", erro);
                return { sucesso: false, erro: "Formato inválido", recomendacoes: [] };
            }
        } catch (erro) {
            console.error("Erro em gerarRecomendacoes:", erro);
            return { sucesso: false, erro: erro.message, recomendacoes: [] };
        }
    },

    // Renderizar recomendações
    async renderizarRecomendacoes(containerId) {
        if (!usuarioAtualId) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "<p>Carregando recomendações...</p>";

        const resultado = await this.gerarRecomendacoes(usuarioAtualId);

        if (!resultado.sucesso) {
            container.innerHTML = `<p style="color: #999;">Não foi possível gerar recomendações</p>`;
            return;
        }

        container.innerHTML = `
            <div style="padding: 15px; background: #1a1a1a; border-radius: 8px;">
                <h3>Recomendado para você 🎯</h3>
                <p style="font-size: 12px; color: #999;">Via ${resultado.origem}</p>
                ${resultado.recomendacoes.map(rec => `
                    <div style="padding: 10px; margin: 5px 0; background: #2a2a2a; border-left: 3px solid #e50914; border-radius: 4px;">
                        <strong>${rec.titulo}</strong>
                        <p style="font-size: 12px; color: #aaa; margin: 5px 0;">${rec.razao}</p>
                        <a href="video.html?id=${rec.videoId}" style="color: #e50914; text-decoration: none;">Assistir →</a>
                    </div>
                `).join("")}
            </div>
        `;
    }
};

window.RecommendationEngine = RecommendationEngine;
export { RecommendationEngine };
