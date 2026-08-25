(function () {
  var HASH = "d7b94390e1467d64430fecff59e1218fd745e8b3df9daebd0a697a87cad64c5f";
  var KEY = "vetrehab_gate_ok";
  if (sessionStorage.getItem(KEY) === "1") return;

  document.documentElement.style.overflow = "hidden";

  var overlay = document.createElement("div");
  overlay.id = "gate-overlay";
  overlay.innerHTML =
    '<div class="gate-box">' +
      '<img class="gate-logo" src="assets/logo-vetrehab.jpg" alt="">' +
      '<p class="gate-title">Vista previa privada</p>' +
      '<p class="gate-sub">Este sitio todavia no esta aprobado para publicarse. Ingrese la contrasena para continuar.</p>' +
      '<form id="gate-form" autocomplete="off">' +
        '<input type="password" id="gate-pass" placeholder="Contrasena" required>' +
        '<button type="submit">Entrar</button>' +
      "</form>" +
      '<p class="gate-error" id="gate-error" hidden>Contrasena incorrecta.</p>' +
    "</div>";

  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(overlay);
    document.getElementById("gate-pass").focus();

    document.getElementById("gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = document.getElementById("gate-pass").value;
      sha256(val).then(function (digest) {
        if (digest === HASH) {
          sessionStorage.setItem(KEY, "1");
          document.documentElement.style.overflow = "";
          overlay.remove();
        } else {
          document.getElementById("gate-error").hidden = false;
        }
      });
    });
  });

  function sha256(text) {
    return crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(text))
      .then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, "0"); })
          .join("");
      });
  }
})();
