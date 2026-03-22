const VLibras = {
  scriptId: "vlibras-plugin-script",
  widgetClass: "enabled",
  initialized: false,

  async carregarScript() {
    if (window.VLibras?.Widget || window.VLibrasWidget) return true;

    const existing = document.getElementById(this.scriptId);
    if (existing) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("VLibras não carregou a tempo.")), 15000);

        const check = () => {
          if (window.VLibras?.Widget || window.VLibrasWidget) {
            clearTimeout(timeout);
            resolve(true);
            return;
          }
          requestAnimationFrame(check);
        };

        check();
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = this.scriptId;
      script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
      script.async = true;

      const timeout = setTimeout(() => {
        reject(new Error("Timeout ao carregar script do VLibras."));
      }, 15000);

      script.onload = () => {
        const check = () => {
          if (window.VLibras?.Widget || window.VLibrasWidget) {
            clearTimeout(timeout);
            resolve(true);
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      };

      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Falha ao carregar o script do VLibras."));
      };

      document.head.appendChild(script);
    });
  },

  garantirContainer() {
    if (document.querySelector(".vw")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "enabled";
    wrapper.innerHTML = `
      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  },

  async inicializar() {
    if (this.initialized) return true;

    try {
      this.garantirContainer();
      await this.carregarScript();

      if (window.VLibras?.Widget) {
        new window.VLibras.Widget("https://vlibras.gov.br/app");
      } else if (window.VLibrasWidget) {
        new window.VLibrasWidget("https://vlibras.gov.br/app");
      } else {
        throw new Error("Construtor do VLibras não encontrado.");
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("[VLibras] Erro:", error);
      return false;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  VLibras.inicializar();
});

window.VLibrasBRASFLIX = VLibras;
export { VLibras };
