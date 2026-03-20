export function criarInterfaceChatUsuario() {
  const elementos = {
    widget: document.getElementById("user-chat-widget"),
    botaoAbrir: document.getElementById("user-chat-toggle"),
    painel: document.getElementById("user-chat-panel"),
    botaoFechar: document.getElementById("user-chat-close"),
    busca: document.getElementById("user-chat-search"),
    contatos: document.getElementById("user-chat-contacts"),
    cabecalhoConversa: document.getElementById("user-chat-conversation-header"),
    mensagens: document.getElementById("user-chat-messages"),
    formularioEnvio: document.getElementById("user-chat-send-form"),
    campoMensagem: document.getElementById("user-chat-input"),
    status: document.getElementById("user-chat-status"),
    toasts: document.getElementById("user-chat-toasts")
  };

  function escaparHtml(valor = "") {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function definirStatus(texto) {
    if (elementos.status) {
      elementos.status.textContent = texto;
    }
  }

  function definirCabecalhoConversa(texto) {
    if (elementos.cabecalhoConversa) {
      elementos.cabecalhoConversa.textContent = texto;
    }
  }

  function limparMensagens() {
    if (elementos.mensagens) {
      elementos.mensagens.innerHTML = "";
    }
  }

  function mostrarToast(texto) {
    if (!elementos.toasts) return;

    const item = document.createElement("div");
    item.className = "user-chat-toast";
    item.textContent = texto;
    elementos.toasts.appendChild(item);

    setTimeout(() => {
      item.remove();
    }, 3000);
  }

  function abrirPainel() {
    if (!elementos.widget || !elementos.painel) return;

    elementos.widget.classList.add("open");
    elementos.painel.setAttribute("aria-hidden", "false");
    document.body.style.marginRight = "360px";
  }

  function fecharPainel() {
    if (!elementos.widget || !elementos.painel) return;

    elementos.widget.classList.remove("open");
    elementos.painel.setAttribute("aria-hidden", "true");
    document.body.style.marginRight = "0";
  }

  function alternarPainel() {
    if (!elementos.widget) return;

    const aberto = elementos.widget.classList.contains("open");
    if (aberto) {
      fecharPainel();
    } else {
      abrirPainel();
    }
  }

  function renderizarContatos(lista = [], uidConversaAtiva = "", aoSelecionarContato = null) {
    if (!elementos.contatos) return;

    if (!lista.length) {
      elementos.contatos.innerHTML = `
        <div class="user-chat-empty">
          Nenhum contato disponível.
        </div>
      `;
      return;
    }

    elementos.contatos.innerHTML = lista.map((contato) => {
      const ativo = uidConversaAtiva === contato.uid;

      return `
        <button
          type="button"
          class="user-chat-contact-item ${ativo ? "ativo" : ""}"
          data-uid="${escaparHtml(contato.uid)}"
        >
          <div class="user-chat-contact-avatar">
            ${escaparHtml((contato.nome || contato.email || "U").charAt(0).toUpperCase())}
          </div>

          <div class="user-chat-contact-info">
            <div class="user-chat-contact-name">${escaparHtml(contato.nome || "Sem nome")}</div>
            <div class="user-chat-contact-email">${escaparHtml(contato.email || "Sem email")}</div>
          </div>
        </button>
      `;
    }).join("");

    if (typeof aoSelecionarContato === "function") {
      elementos.contatos.querySelectorAll(".user-chat-contact-item").forEach((botao) => {
        botao.addEventListener("click", () => {
          aoSelecionarContato(botao.dataset.uid || "");
        });
      });
    }
  }

  function renderizarMensagens(lista = [], uidAtual = "") {
    if (!elementos.mensagens) return;

    if (!lista.length) {
      elementos.mensagens.innerHTML = `
        <div class="user-chat-empty">
          Nenhuma mensagem ainda. Envie a primeira.
        </div>
      `;
      return;
    }

    elementos.mensagens.innerHTML = lista.map((mensagem) => {
      const minha = mensagem.autorId === uidAtual;

      return `
        <div class="user-chat-message ${minha ? "minha" : "outra"}">
          <div class="user-chat-message-bubble">
            <div class="user-chat-message-author">${escaparHtml(mensagem.autorNome || "Usuário")}</div>
            <div class="user-chat-message-text">${escaparHtml(mensagem.texto || "")}</div>
          </div>
        </div>
      `;
    }).join("");

    elementos.mensagens.scrollTop = elementos.mensagens.scrollHeight;
  }

  function obterTextoBusca() {
    return elementos.busca?.value?.trim() || "";
  }

  function obterTextoMensagem() {
    return elementos.campoMensagem?.value?.trim() || "";
  }

  function limparCampoMensagem() {
    if (elementos.campoMensagem) {
      elementos.campoMensagem.value = "";
    }
  }

  function definirFormularioHabilitado(habilitado) {
    if (elementos.campoMensagem) {
      elementos.campoMensagem.disabled = !habilitado;
    }

    if (elementos.formularioEnvio) {
      const botao = elementos.formularioEnvio.querySelector("button");
      if (botao) botao.disabled = !habilitado;
    }
  }

  function aoBuscar(callback) {
    if (!elementos.busca || typeof callback !== "function") return;
    elementos.busca.addEventListener("input", () => {
      callback(obterTextoBusca());
    });
  }

  function aoAbrir(callback) {
    if (!elementos.botaoAbrir || typeof callback !== "function") return;
    elementos.botaoAbrir.addEventListener("click", (evento) => {
      evento.stopPropagation();
      callback();
    });
  }

  function aoFechar(callback) {
    if (!elementos.botaoFechar || typeof callback !== "function") return;
    elementos.botaoFechar.addEventListener("click", (evento) => {
      evento.stopPropagation();
      callback();
    });
  }

  function aoEnviar(callback) {
    if (!elementos.formularioEnvio || typeof callback !== "function") return;
    elementos.formularioEnvio.addEventListener("submit", (evento) => {
      evento.preventDefault();
      callback(obterTextoMensagem());
    });
  }

  return {
    elementos,
    escaparHtml,
    definirStatus,
    definirCabecalhoConversa,
    limparMensagens,
    mostrarToast,
    abrirPainel,
    fecharPainel,
    alternarPainel,
    renderizarContatos,
    renderizarMensagens,
    obterTextoBusca,
    obterTextoMensagem,
    limparCampoMensagem,
    definirFormularioHabilitado,
    aoBuscar,
    aoAbrir,
    aoFechar,
    aoEnviar
  };
}
