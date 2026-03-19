import { auth, db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { geminiClient } from "./gemini.js";
import { mistralClient } from "./mistral.js";

const AIEngine = {
  providerPadrao: "gemini",

  async coletarContextoUsuario(uid) {
    if (!uid) {
      return {
        historico: [],
        comentarios: [],
        favoritos: []
      };
    }

    try {
      const [historicoSnap, comentariosSnap, usuariosSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "historico_visualizacoes"),
            where("userId", "==", uid),
            orderBy("timestamp", "desc"),
            limit(10)
          )
        ),
        getDocs(
          query(
            collection(db, "comentarios"),
            where("userId", "==", uid),
            orderBy("timestamp", "desc"),
            limit(10)
          )
        ),
        getDocs(
          query(
            collection(db, "usuarios"),
            where("usuarioId", "==", uid),
            limit(1)
          )
        )
      ]);

      const historico = historicoSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      const comentarios = comentariosSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      let favoritos = [];
      if (!usuariosSnap.empty) {
        const usuario = usuariosSnap.docs[0].data() || {};
        favoritos = Array.isArray(usuario.favoritos) ? usuario.favoritos : [];
      }

      return { historico, comentarios, favoritos };
    } catch (error) {
      console.error("[AIEngine] Erro ao coletar contexto:", error);
      return {
        historico: [],
        comentarios: [],
        favoritos: []
      };
    }
  },

  montarContextoTexto(contexto = {}) {
    const historico = Array.isArray(contexto.historico) ? contexto.historico : [];
    const comentarios = Array.isArray(contexto.comentarios) ? contexto.comentarios : [];
    const favoritos = Array.isArray(contexto.favoritos) ? contexto.favoritos : [];

    const partes = [];

    if (historico.length) {
      partes.push(
        "Histórico recente do usuário:\n" +
          historico
            .map(
              (item, index) =>
                `${index + 1}. ${item.videoTitulo || item.titulo || "Vídeo"} | categoria: ${
                  item.categoria || "Sem categoria"
                } | tempoAssistido: ${Number(item.tempoAssistido || 0)}s`
            )
            .join("\n")
      );
    }

    if (favoritos.length) {
      partes.push(
        "Favoritos do usuário:\n" +
          favoritos
            .map(
              (item, index) =>
                `${index + 1}. ${item.titulo || "Vídeo"} | categoria: ${item.categoria || "Sem categoria"}`
            )
            .join("\n")
      );
    }

    if (comentarios.length) {
      partes.push(
        "Comentários recentes do usuário:\n" +
          comentarios
            .map(
              (item, index) =>
                `${index + 1}. vídeo: ${item.videoId || "—"} | comentário: ${
                  item.texto || item.conteudo || ""
                }`
            )
            .join("\n")
      );
    }

    return partes.join("\n\n");
  },

  async gerar({
    prompt,
    system = "Você é o assistente inteligente da plataforma BRASFLIX. Responda em português do Brasil, de forma útil, objetiva e amigável.",
    provider = null,
    incluirContextoUsuario = true
  }) {
    try {
      const prov = provider || this.providerPadrao;
      const uid = auth.currentUser?.uid || null;

      let contextoTexto = "";

      if (incluirContextoUsuario && uid) {
        const contexto = await this.coletarContextoUsuario(uid);
        contextoTexto = this.montarContextoTexto(contexto);
      }

      const context = [];
      if (contextoTexto) {
        context.push({
          role: "system",
          content: `Contexto do usuário BRASFLIX:\n${contextoTexto}`
        });
      }

      const cliente = prov === "mistral" ? mistralClient : geminiClient;
      const resposta = await cliente.sendMessage({
        message: prompt,
        context,
        systemInstruction: system
      });

      if (!resposta?.ok) {
        return {
          sucesso: false,
          origem: prov,
          erro: resposta?.error || "Falha ao gerar resposta."
        };
      }

      return {
        sucesso: true,
        origem: prov,
        texto: resposta.text || ""
      };
    } catch (error) {
      console.error("[AIEngine] Erro ao gerar resposta:", error);
      return {
        sucesso: false,
        origem: provider || this.providerPadrao,
        erro: error.message || "Erro interno na IA."
      };
    }
  }
};

window.AIEngine = AIEngine;

export { AIEngine };