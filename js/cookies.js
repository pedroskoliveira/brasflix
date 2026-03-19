function ocultarCookies() {
  const cookieBox = document.getElementById("cookies");
  if (cookieBox) cookieBox.style.display = "none";
}

function aceitarCookies() {
  localStorage.setItem("cookieAceito", "true");
  ocultarCookies();
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("cookieAceito")) {
    ocultarCookies();
  }
});

window.aceitarCookies = aceitarCookies;
export { aceitarCookies };
