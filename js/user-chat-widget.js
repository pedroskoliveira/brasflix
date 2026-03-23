import { auth, db } from "./firebase-config.js";
import { criarInterfaceChatUsuario } from "./user-chat-ui.js";
import ChatUsuarios from "./user-chat.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function criarFallbackSeNecessario() {
  if (document.getElementById("user-chat-widget")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "user-chat-widget";
  wrapper.id = "user-chat-widget";
  wrapper.innerHTML = `
    <button id="user-chat-toggle" class="user-chat-toggle" aria-label="Abrir chat de usuários" type="button">💬</button>
    <div id="user-chat-panel" class="user-chat-panel" aria-hidden="true">
      <header class="user-chat-header">
        <div>
          <div class="user-chat-title">Chat com Usuários</div>
          <div class="user-chat-subtitle">Toque em um contato para iniciar</div>
        </div>
        <button id="user-chat-close" class="user-chat-close" aria-label="Fechar" type="button">✕</button>
      </header>
      <input id="user-chat-search" class="user-chat-search" type="search" placeholder="Buscar contato..." />
      <div id="user-chat-contacts" class="user-chat-contacts"></div>
      <div id="user-chat-conversation" class="user-chat-conversation">
        <div id="user-chat-conversation-header" class="user-chat-conversation-header">Selecione um contato</div>
        <div id="user-chat-messages" class="user-chat-messages"></div>
        <form id="user-chat-send-form" class="user-chat-send-form">
          <input id="user-chat-input" class="user-chat-input" type="text" placeholder="Digite sua mensagem..." autocomplete="off" />
          <button type="submit" class="user-chat-send-btn" aria-label="Enviar">➤</button>
        </form>
      </div>
      <div id="user-chat-status" class="user-chat-status">Aguardando login...</div>
    </div>
    <div id="user-chat-toasts" class="user-chat-toasts" aria-live="polite" aria-atomic="true"></div>
  `;
  document.body.appendChild(wrapper);
}

criarFallbackSeNecessario();
const ui = criarInterfaceChatUsuario();

const estado = {
  usuarioAtual: null,
  perfilAtual: null,
  contatos: [],
  contatosFiltrados: [],
  conversaAtual: null,
  conversasMap: new Map(),
  cancelarMensagens: null,
  cancelarConversas: null,
  contatoPendente: null
};

function reordenarContatosPorConversas() {
  estado.contatos.sort((a, b) => {
    const convA = estado.conversasMap.get(a.uid);
    const convB = estado.conversasMap.get(b.uid);
    const tempoA = convA?.ultimaMensagemEm?.toMillis?.() || convA?.ultimaMensagemEm?.seconds || 0;
    const tempoB = convB?.ultimaMensagemEm?.toMillis?.() || convB?.ultimaMensagemEm?.seconds || 0;

    if (tempoA !== tempoB) return tempoB - tempoA;
    return ChatUsuarios.obterNomeExibicao(a).localeCompare(ChatUsuarios.obterNomeExibicao(b), "pt-BR");
  });
}

function enriquecerContatosComConversa(lista = []) {
  return lista.map((contato) => {
    const conversa = estado.conversasMap.get(contato.uid);
    return {
      ...contato,
      preview: conversa?.ultimaMensagem || contato.email || "Sem mensagens ainda",
      previewTempo: conversa?.ultimaMensagemEm ? ChatUsuarios.formatarTempo(conversa.ultimaMensagemEm) : ""
    };
  });
}

function filtrarContatos(texto = "") {
  const termo = (texto || "").trim().toLowerCase();
  const base = !termo
    ? [...estado.contatos]
    : estado.contatos.filter((contato) => {
        const nome = (contato.nome || "").toLowerCase();
        const email = (contato.email || "").toLowerCase();
        return nome.includes(termo) || email.includes(termo);
      });

  estado.contatosFiltrados = enriquecerContatosComConversa(base);
  ui.renderizarContatos(estado.contatosFiltrados, estado.conversaAtual?.outroUid || "", selecionarContato);
}

async function carregarMeuPerfil(uid) {
  try {
    const referencia = doc(db, "usuarios", uid);
    const documento = await getDoc(referencia);
    estado.perfilAtual = documento.exists() ? documento.data() || {} : null;
  } catch (erro) {
    console.error("[Chat] Erro ao carregar perfil atual:", erro);
    estado.perfilAtual = null;
  }
}

async function carregarContatos() {
  if (!estado.usuarioAtual) return;

  ui.definirStatus("Carregando contatos...");

  try {
    const snapshot = await getDocs(collection(db, "usuarios"));
    estado.contatos = [];

    snapshot.forEach((documento) => {
      const dados = documento.data() || {};
      const contato = ChatUsuarios.normalizarContato({
        uid: dados.usuarioId || dados.uid || documento.id,
        nome: dados.nome || "",
        email: dados.email || "",
        fotoURL: dados.fotoURL || dados.avatar || ""
      });

      if (!contato.uid || contato.uid === estado.usuarioAtual.uid) return;
      estado.contatos.push(contato);
    });

    reordenarContatosPorConversas();
    filtrarContatos(ui.obterTextoBusca());
    ui.definirStatus("Selecione um contato para iniciar.");
  } catch (erro) {
    console.error("[Chat] Erro ao carregar contatos:", erro);
    ui.definirStatus("Erro ao carregar contatos.");
  }
}

async function buscarSalaExistente(uidAtual, uidOutro) {
  const roomId = ChatUsuarios.gerarRoomId(uidAtual, uidOutro);
  const salaRef = doc(db, "chatRooms", roomId);
  const snapshot = await getDoc(salaRef);

  if (!snapshot.exists()) return null;
  const sala = { id: snapshot.id, ...snapshot.data() };
  return ChatUsuarios.salaEhValida(sala) ? sala : null;
}

async function criarSala(contato) {
  const uidAtual = estado.usuarioAtual.uid;
  const uidOutro = contato.uid;
  const participantesOrdenados = ChatUsuarios.gerarRoomId(uidAtual, uidOutro);
  const roomId = participantesOrdenados;

  const meuNome = ChatUsuarios.obterNomeExibicao({
    nome: estado.perfilAtual?.nome,
    displayName: estado.usuarioAtual?.displayName,
    email: estado.usuarioAtual?.email,
    uid: estado.usuarioAtual?.uid
  });

  const meuEmail = estado.perfilAtual?.email || estado.usuarioAtual.email || "";
  const minhaFoto = estado.perfilAtual?.fotoURL || estado.perfilAtual?.avatar || estado.usuarioAtual.photoURL || "";

  const salaRef = doc(db, "chatRooms", roomId);

  await setDoc(
    salaRef,
    {
      participantes: [uidAtual, uidOutro],
      participantesOrdenados,
      participantesInfo: {
        [uidAtual]: { nome: meuNome, email: meuEmail, fotoURL: minhaFoto },
        [uidOutro]: { nome: contato.nome || "", email: contato.email || "", fotoURL: contato.fotoURL || "" }
      },
      ultimaMensagem: "",
      ultimaMensagemEm: serverTimestamp(),
      ultimaMensagemPor: "",
      criadoEm: serverTimestamp()
    },
    { merge: true }
  );

  const salaDoc = await getDoc(salaRef);
  return { id: salaDoc.id, ...salaDoc.data() };
}

function ouvirMensagensDaConversa(roomId) {
  estado.cancelarMensagens?.();

  const consulta = query(collection(db, "chatRooms", roomId, "mensagens"), orderBy("criadoEm", "asc"));
  estado.cancelarMensagens = onSnapshot(
    consulta,
    (snapshot) => {
      const mensagens = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
      ui.renderizarMensagens(mensagens, estado.usuarioAtual?.uid || "");
    },
    (erro) => {
      console.error("[Chat] Erro em tempo real das mensagens:", erro);
      ui.definirStatus("Erro ao atualizar mensagens em tempo real.");
    }
  );
}

async function abrirOuCriarConversa(contatoRecebido) {
  ui.abrirPainel();

  if (!estado.usuarioAtual) {
    estado.contatoPendente = contatoRecebido || null;
    ui.definirStatus("Faça login para usar o chat.");
    return;
  }

  const contato = ChatUsuarios.normalizarContato(contatoRecebido);
  if (!ChatUsuarios.contatoEhValido(contato)) {
    ui.definirStatus("Contato inválido.");
    return;
  }

  if (ChatUsuarios.ehConversaPropria(estado.usuarioAtual.uid, contato.uid)) {
    ui.definirStatus("Você não pode abrir conversa com o próprio usuário.");
    return;
  }

  ui.definirStatus("Abrindo conversa...");
  ui.limparMensagens();
  ui.definirFormularioHabilitado(false);

  try {
    let sala = await buscarSalaExistente(estado.usuarioAtual.uid, contato.uid);
    if (!sala) sala = await criarSala(contato);

    estado.conversaAtual = {
      roomId: sala.id,
      outroUid: contato.uid,
      outroNome: contato.nome || contato.email || "Contato"
    };

    ui.definirCabecalhoConversa(`Conversando com ${contato.nome || contato.email || "Contato"}`);
    ui.definirStatus("Conversa aberta.");
    ui.definirFormularioHabilitado(true);
    ouvirMensagensDaConversa(sala.id);
    filtrarContatos(ui.obterTextoBusca());
    ui.abrirPainel();
  } catch (erro) {
    console.error("[Chat] Erro ao abrir conversa:", erro);
    ui.definirStatus(`Erro ao abrir conversa. ${erro?.message || ""}`.trim());
  }
}

async function selecionarContato(uidContato) {
  const contato = estado.contatos.find((item) => item.uid === uidContato);
  if (contato) await abrirOuCriarConversa(contato);
}

async function enviarMensagem(texto) {
  if (!estado.usuarioAtual) return ui.definirStatus("Faça login para enviar mensagens.");
  if (!estado.conversaAtual?.roomId) return ui.definirStatus("Selecione um contato primeiro.");
  if (!ChatUsuarios.validarMensagem(texto)) return ui.definirStatus("Digite uma mensagem válida.");

  const mensagem = ChatUsuarios.sanitizarMensagem(texto);

  try {
    const meuNome = ChatUsuarios.obterNomeExibicao({
      nome: estado.perfilAtual?.nome,
      displayName: estado.usuarioAtual?.displayName,
      email: estado.usuarioAtual?.email,
      uid: estado.usuarioAtual?.uid
    });

    await addDoc(collection(db, "chatRooms", estado.conversaAtual.roomId, "mensagens"), {
      texto: mensagem,
      autorId: estado.usuarioAtual.uid,
      autorNome: meuNome,
      criadoEm: serverTimestamp(),
      lida: false
    });

    await updateDoc(doc(db, "chatRooms", estado.conversaAtual.roomId), {
      ultimaMensagem: mensagem,
      ultimaMensagemEm: serverTimestamp(),
      ultimaMensagemPor: estado.usuarioAtual.uid
    });

    ui.limparCampoMensagem();
    ui.definirStatus("Mensagem enviada.");
  } catch (erro) {
    console.error("[Chat] Erro ao enviar mensagem:", erro);
    ui.definirStatus(`Erro ao enviar mensagem. ${erro?.message || ""}`.trim());
  }
}

function ouvirMinhasConversas() {
  if (!estado.usuarioAtual) return;

  estado.cancelarConversas?.();

  const consulta = query(
    collection(db, "chatRooms"),
    where("participantes", "array-contains", estado.usuarioAtual.uid),
    orderBy("ultimaMensagemEm", "desc")
  );

  estado.cancelarConversas = onSnapshot(
    consulta,
    (snapshot) => {
      estado.conversasMap.clear();
      snapshot.forEach((documento) => {
        const dados = documento.data() || {};
        const outroUid = (dados.participantes || []).find((uid) => uid !== estado.usuarioAtual.uid);
        if (!outroUid) return;
        estado.conversasMap.set(outroUid, { id: documento.id, ...dados });
      });

      reordenarContatosPorConversas();
      filtrarContatos(ui.obterTextoBusca());
    },
    (erro) => {
      console.error("[Chat] Erro ao ouvir conversas:", erro);
      ui.definirStatus("Erro ao atualizar a lista de conversas.");
    }
  );
}

function limparEstadoQuandoSai() {
  estado.perfilAtual = null;
  estado.contatos = [];
  estado.contatosFiltrados = [];
  estado.conversaAtual = null;
  estado.conversasMap.clear();
  estado.cancelarMensagens?.();
  estado.cancelarMensagens = null;
  estado.cancelarConversas?.();
  estado.cancelarConversas = null;

  ui.renderizarContatos([], "", null);
  ui.definirCabecalhoConversa("Selecione um contato");
  ui.limparMensagens();
  ui.definirFormularioHabilitado(false);
  ui.definirStatus("Aguardando login...");
}

function iniciarEventos() {
  ui.aoAbrir(() => ui.alternarPainel());
  ui.aoFechar(() => ui.fecharPainel());
  ui.aoBuscar((textoBusca) => filtrarContatos(textoBusca));
  ui.aoEnviar(async (texto) => enviarMensagem(texto));
}

function iniciarAutenticacao() {
  onAuthStateChanged(auth, async (usuario) => {
    estado.usuarioAtual = usuario || null;

    if (!usuario) {
      limparEstadoQuandoSai();
      return;
    }

    await carregarMeuPerfil(usuario.uid);
    await carregarContatos();
    ouvirMinhasConversas();

    ui.definirCabecalhoConversa("Selecione um contato");
    ui.definirFormularioHabilitado(false);
    ui.definirStatus("Selecione um contato para iniciar.");

    if (estado.contatoPendente) {
      const pendente = estado.contatoPendente;
      estado.contatoPendente = null;
      await abrirOuCriarConversa(pendente);
    }
  });
}

function iniciarChatUsuarios() {
  iniciarEventos();
  iniciarAutenticacao();
  ui.definirCabecalhoConversa("Selecione um contato");
  ui.definirFormularioHabilitado(false);
  ui.definirStatus("Aguardando login...");
}

iniciarChatUsuarios();

window.BrasflixUserChat = {
  openConversationWith(contato) {
    if (!contato) return;
    ui.abrirPainel();
    abrirOuCriarConversa(contato);
  },
  openPanel() {
    ui.abrirPainel();
    ui.definirStatus(estado.usuarioAtual ? "Selecione um contato para iniciar." : "Faça login para usar o chat.");
  },
  closePanel() {
    ui.fecharPainel();
  }
};
