class GerenciadorDeQuiz {
  constructor() {
    this.elementos = {
      blocoQuiz: document.getElementById("blocoQuizVideo"),
      statusQuiz: document.getElementById("quizStatus"),
      tituloQuiz: document.getElementById("quizTitulo"),
      descricaoQuiz: document.getElementById("quizDescricao"),
      corpoQuiz: document.getElementById("quizCorpo"),
      areaResultado: document.getElementById("quizResultado"),
      acoesQuiz: document.getElementById("quizAcoes"),
      botaoGerar: document.getElementById("gerarQuiz"),
      botaoResponder: document.getElementById("responderQuiz"),
      botaoRefazer: document.getElementById("refazerQuiz"),
      player: document.getElementById("playerBrasflix"),
      videoTitulo: document.getElementById("videoTitulo"),
      videoDescricao: document.getElementById("videoDescricao"),
      videoCategoria: document.getElementById("videoCategoria")
    };

    this.configuracao = {
      usarIAAutomaticamente: true,
      provedor: "mistral",
      quantidadeQuestoes: 5,
      chaveLocalStorage: "brasflix_ultimo_resultado_quiz_video"
    };

    this.quizAtual = null;
    this.resultadoAtual = null;

    this.iniciar();
  }

  iniciar() {
    this.vincularEventos();
    this.prepararInterfaceInicial();
  }

  vincularEventos() {
    if (this.elementos.botaoGerar) {
      this.elementos.botaoGerar.addEventListener("click", async () => {
        await this.gerarQuiz();
      });
    }

    if (this.elementos.botaoResponder) {
      this.elementos.botaoResponder.addEventListener("click", () => {
        this.corrigirQuiz();
      });
    }

    if (this.elementos.botaoRefazer) {
      this.elementos.botaoRefazer.addEventListener("click", async () => {
        await this.gerarQuiz();
      });
    }
  }

  prepararInterfaceInicial() {
    this.definirTitulo("Quiz do vídeo");
    this.definirDescricao("As perguntas serão criadas com base no vídeo atual.");
    this.definirStatus("Gere perguntas automáticas sobre o vídeo atual.");
    this.limparCorpoQuiz();
    this.limparResultado();

    if (this.elementos.botaoResponder) {
      this.elementos.botaoResponder.style.display = "none";
    }

    if (this.elementos.botaoRefazer) {
      this.elementos.botaoRefazer.style.display = "none";
    }
  }

  definirTitulo(texto) {
    if (this.elementos.tituloQuiz) {
      this.elementos.tituloQuiz.textContent = texto;
    }
  }

  definirDescricao(texto) {
    if (this.elementos.descricaoQuiz) {
      this.elementos.descricaoQuiz.textContent = texto;
    }
  }

  definirStatus(texto) {
    if (this.elementos.statusQuiz) {
      this.elementos.statusQuiz.textContent = texto;
    }
  }

  limparCorpoQuiz() {
    if (this.elementos.corpoQuiz) {
      this.elementos.corpoQuiz.innerHTML = "";
    }
  }

  limparResultado() {
    if (this.elementos.areaResultado) {
      this.elementos.areaResultado.innerHTML = "";
      this.elementos.areaResultado.style.display = "none";
    }
  }

  mostrarResultado(html) {
    if (this.elementos.areaResultado) {
      this.elementos.areaResultado.innerHTML = html;
      this.elementos.areaResultado.style.display = "block";
    }
  }

  async gerarQuiz() {
    this.quizAtual = null;
    this.resultadoAtual = null;

    this.definirStatus("Gerando quiz...");
    this.limparResultado();
    this.limparCorpoQuiz();

    if (this.elementos.botaoGerar) {
      this.elementos.botaoGerar.disabled = true;
      this.elementos.botaoGerar.textContent = "Gerando...";
    }

    if (this.elementos.botaoResponder) {
      this.elementos.botaoResponder.style.display = "none";
    }

    if (this.elementos.botaoRefazer) {
      this.elementos.botaoRefazer.style.display = "none";
    }

    try {
      let quiz = null;

      if (this.configuracao.usarIAAutomaticamente) {
        quiz = await this.gerarQuizComIA();
      }

      if (!quiz) {
        this.mostrarQuizIndisponivel();
        return;
      }

      this.quizAtual = quiz;
      this.renderizarQuiz(quiz);
      this.definirStatus("Quiz gerado com sucesso.");

      if (this.elementos.botaoResponder) {
        this.elementos.botaoResponder.style.display = "inline-block";
      }

      if (this.elementos.botaoRefazer) {
        this.elementos.botaoRefazer.style.display = "inline-block";
      }
    } catch (erro) {
      console.error("Erro ao gerar quiz:", erro);
      this.mostrarQuizIndisponivel();
    } finally {
      if (this.elementos.botaoGerar) {
        this.elementos.botaoGerar.disabled = false;
        this.elementos.botaoGerar.textContent = "Iniciar quiz";
      }
    }
  }

  async gerarQuizComIA() {
    const ferramentaIA = this.obterFerramentaDeIA();
    if (!ferramentaIA) return null;

    const contexto = this.montarContextoDoQuiz();

    const resposta = await ferramentaIA({
      provider: this.configuracao.provedor,
      prompt: `Crie um quiz com ${this.configuracao.quantidadeQuestoes} perguntas de múltipla escolha sobre o vídeo atual.`,
      system: `
Você é a PedrIA do BRASFLIX.
Crie um quiz em português do Brasil.
As perguntas devem ser claras, curtas e objetivas.
Cada pergunta deve ter exatamente 4 alternativas.
Apenas 1 alternativa correta por pergunta.
As perguntas devem ser baseadas somente no contexto real recebido.
Se o contexto não for suficiente, responda com JSON inválido mínimo ou vazio, sem inventar fatos.

Responda SOMENTE em JSON válido no formato:

{
  "titulo": "string",
  "descricao": "string",
  "questoes": [
    {
      "pergunta": "string",
      "alternativas": ["A", "B", "C", "D"],
      "indiceCorreto": 0,
      "explicacao": "string"
    }
  ]
}
      `.trim(),
      context: contexto
    });

    if (!resposta?.sucesso) {
      return null;
    }

    const dados = this.tentarConverterJson(resposta.texto);
    if (!this.quizEhValido(dados)) {
      return null;
    }

    return dados;
  }

  obterFerramentaDeIA() {
    if (window.aiEngine && typeof window.aiEngine.perguntar === "function") {
      return async ({ provider, prompt, system, context }) => {
        return await window.aiEngine.perguntar({
          provider,
          prompt,
          system,
          context
        });
      };
    }

    if (window.PedrIA && typeof window.PedrIA.perguntar === "function") {
      return async ({ provider, prompt, system, context }) => {
        return await window.PedrIA.perguntar({
          provider,
          prompt,
          system,
          context
        });
      };
    }

    if (window.pedria && typeof window.pedria.perguntar === "function") {
      return async ({ provider, prompt, system, context }) => {
        return await window.pedria.perguntar({
          provider,
          prompt,
          system,
          context
        });
      };
    }

    return null;
  }

  montarContextoDoQuiz() {
    const tituloPagina = document.title || "BRASFLIX - Vídeo";
    const tituloVideo = this.elementos.videoTitulo?.textContent?.trim() || "";
    const descricaoVideo = this.elementos.videoDescricao?.textContent?.trim() || "";
    const categoriaVideo = this.elementos.videoCategoria?.textContent?.trim() || "";
    const caminhoPagina = window.location.pathname || "";
    const urlAtual = window.location.href || "";
    const duracao = document.getElementById("videoDuracao")?.textContent?.trim() || "";
    const publicacao = document.getElementById("videoPublicacao")?.textContent?.trim() || "";
    const visualizacoes = document.getElementById("videoViews")?.textContent?.trim() || "";

    return {
      tituloPagina,
      caminhoPagina,
      urlAtual,
      tituloVideo,
      descricaoVideo,
      categoriaVideo,
      duracao,
      publicacao,
      visualizacoes,
      quantidadeQuestoes: this.configuracao.quantidadeQuestoes
    };
  }

  quizEhValido(quiz) {
    if (!quiz || typeof quiz !== "object") return false;
    if (!Array.isArray(quiz.questoes) || !quiz.questoes.length) return false;

    return quiz.questoes.every((questao) => {
      return (
        typeof questao.pergunta === "string" &&
        Array.isArray(questao.alternativas) &&
        questao.alternativas.length === 4 &&
        typeof questao.indiceCorreto === "number"
      );
    });
  }

  mostrarQuizIndisponivel() {
    this.quizAtual = null;
    this.limparCorpoQuiz();
    this.definirStatus("Não foi possível gerar o quiz agora.");

    this.mostrarResultado(`
      <div class="quiz-resumo-final">
        <h3>Quiz indisponível</h3>
        <p>Não consegui gerar as perguntas neste momento.</p>
        <p>Verifique sua conexão e tente novamente.</p>
      </div>
    `);

    if (this.elementos.botaoResponder) {
      this.elementos.botaoResponder.style.display = "none";
    }

    if (this.elementos.botaoRefazer) {
      this.elementos.botaoRefazer.style.display = "inline-block";
    }
  }

  renderizarQuiz(quiz) {
    this.definirTitulo(quiz.titulo || "Quiz do vídeo");
    this.definirDescricao(quiz.descricao || "Responda às perguntas abaixo.");
    this.limparCorpoQuiz();

    if (!this.elementos.corpoQuiz) return;

    const htmlQuestoes = quiz.questoes.map((questao, indiceQuestao) => {
      const alternativasHtml = questao.alternativas.map((alternativa, indiceAlternativa) => {
        const id = `quiz_q${indiceQuestao}_a${indiceAlternativa}`;

        return `
          <label class="quiz-alternativa" for="${id}">
            <input
              type="radio"
              name="questao_${indiceQuestao}"
              id="${id}"
              value="${indiceAlternativa}"
            />
            <span>${this.escaparHtml(alternativa)}</span>
          </label>
        `;
      }).join("");

      return `
        <div class="quiz-questao" data-indice-questao="${indiceQuestao}">
          <h4 class="quiz-pergunta">${indiceQuestao + 1}. ${this.escaparHtml(questao.pergunta)}</h4>
          <div class="quiz-alternativas">
            ${alternativasHtml}
          </div>
          <div class="quiz-explicacao" id="explicacao_${indiceQuestao}" style="display:none;"></div>
        </div>
      `;
    }).join("");

    this.elementos.corpoQuiz.innerHTML = htmlQuestoes;
  }

  corrigirQuiz() {
    if (!this.quizAtual || !Array.isArray(this.quizAtual.questoes)) {
      this.definirStatus("Nenhum quiz carregado.");
      return;
    }

    const respostas = [];
    let acertos = 0;

    this.quizAtual.questoes.forEach((questao, indiceQuestao) => {
      const marcada = document.querySelector(`input[name="questao_${indiceQuestao}"]:checked`);
      const indiceSelecionado = marcada ? Number(marcada.value) : -1;
      const acertou = indiceSelecionado === questao.indiceCorreto;

      if (acertou) acertos += 1;

      respostas.push({
        pergunta: questao.pergunta,
        indiceSelecionado,
        indiceCorreto: questao.indiceCorreto,
        acertou,
        explicacao: questao.explicacao || ""
      });

      this.mostrarExplicacaoDaQuestao(indiceQuestao, acertou, questao);
    });

    const total = this.quizAtual.questoes.length;
    const percentual = Math.round((acertos / total) * 100);

    this.resultadoAtual = {
      titulo: this.quizAtual.titulo || "Quiz do vídeo",
      acertos,
      total,
      percentual,
      respostas,
      data: new Date().toISOString()
    };

    this.salvarResultado(this.resultadoAtual);
    this.mostrarResumoResultado(this.resultadoAtual);
    this.definirStatus(`Você acertou ${acertos} de ${total}.`);
  }

  mostrarExplicacaoDaQuestao(indiceQuestao, acertou, questao) {
    const caixa = document.getElementById(`explicacao_${indiceQuestao}`);
    if (!caixa) return;

    const alternativaCorreta = questao.alternativas?.[questao.indiceCorreto] || "";
    const classe = acertou ? "quiz-explicacao-correta" : "quiz-explicacao-incorreta";
    const prefixo = acertou ? "✅ Correto." : "❌ Resposta incorreta.";

    caixa.className = `quiz-explicacao ${classe}`;
    caixa.style.display = "block";
    caixa.innerHTML = `
      <strong>${prefixo}</strong><br>
      Resposta correta: <strong>${this.escaparHtml(alternativaCorreta)}</strong><br>
      ${this.escaparHtml(questao.explicacao || "")}
    `;
  }

  mostrarResumoResultado(resultado) {
    const mensagemDesempenho = this.gerarMensagemDeDesempenho(resultado.percentual);

    this.mostrarResultado(`
      <div class="quiz-resumo-final">
        <h3>Resultado do Quiz</h3>
        <p><strong>Acertos:</strong> ${resultado.acertos} de ${resultado.total}</p>
        <p><strong>Percentual:</strong> ${resultado.percentual}%</p>
        <p><strong>Avaliação:</strong> ${this.escaparHtml(mensagemDesempenho)}</p>
      </div>
    `);
  }

  gerarMensagemDeDesempenho(percentual) {
    if (percentual === 100) return "Excelente, você acertou tudo.";
    if (percentual >= 80) return "Ótimo desempenho.";
    if (percentual >= 60) return "Bom resultado, mas ainda dá para melhorar.";
    if (percentual >= 40) return "Resultado razoável. Vale revisar o conteúdo.";
    return "Tente novamente e revise as respostas.";
  }

  salvarResultado(resultado) {
    try {
      localStorage.setItem(
        this.configuracao.chaveLocalStorage,
        JSON.stringify(resultado)
      );
    } catch (erro) {
      console.warn("Não foi possível salvar o resultado do quiz:", erro);
    }
  }

  tentarConverterJson(texto) {
    try {
      const textoLimpo = String(texto || "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(textoLimpo);
    } catch {
      return null;
    }
  }

  escaparHtml(valor = "") {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

window.GerenciadorDeQuiz = GerenciadorDeQuiz;
window.gerenciadorDeQuiz = new GerenciadorDeQuiz();
