const VLibras = {
  inicializar(contexto = "", containerId = "") {
    console.log("[VLibras] Inicializado", { contexto, containerId });
    return true;
  }
};
window.VLibras = VLibras;
export { VLibras };
