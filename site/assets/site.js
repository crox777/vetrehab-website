/* Vet Rehab Costa Rica - JS minimo: menu movil y cierre de submenus. */
(function () {
  "use strict";

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Cerrar menu" : "Abrir menu");
    });
  }

  /* Cierra los <details> del menu al hacer clic fuera o con Escape. */
  var drops = Array.prototype.slice.call(document.querySelectorAll(".nav details"));

  function closeAll(except) {
    drops.forEach(function (d) {
      if (d !== except) { d.open = false; }
    });
  }

  drops.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) { closeAll(d); }
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".nav")) { closeAll(null); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAll(null);
      if (nav && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.focus();
      }
    }
  });
})();
