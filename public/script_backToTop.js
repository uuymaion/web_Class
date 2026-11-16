(() => {
  const top = document.querySelector(".screen");
  if (!top) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.textContent = "回到頂端";
  button.hidden = true;
  top.tabIndex = -1;
  document.body.append(button);

  const updateVisibility = () => {
    button.hidden = window.scrollY < 160;
  };

  button.addEventListener("click", () => {
    top.focus({ preventScroll: true });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("pageshow", updateVisibility);
  updateVisibility();
})();
