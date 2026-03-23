import { Gestos } from "./gestos.js";

const GestosGlobal = {
  init() {
    window.addEventListener("brasflix:start-gestos", () => {
      Gestos.iniciar();
    });

    window.addEventListener("brasflix:stop-gestos", () => {
      Gestos.parar();
    });
  }
};

document.addEventListener("DOMContentLoaded", () => GestosGlobal.init());

window.GestosGlobalBRASFLIX = GestosGlobal;
export { GestosGlobal };
