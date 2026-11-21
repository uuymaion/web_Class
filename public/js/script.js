// 共用的 JS：每一頁都會載入，放所有頁面都要用的功能
// 各頁自己的功能放在 script_xxx.js

// 回到頂端：往下捲一段距離後，左上角會垂下一個灰色箭頭，按了就回到最上面
(() => {
  const SHOW_AFTER = 200; // 往下捲超過幾 px 才出現

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "back-to-top";
  btn.setAttribute("aria-label", "回到頂端");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
    '<polyline points="6 15 12 9 18 15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";
  document.body.appendChild(btn);

  // 捲動時決定要不要顯示(加上 show 這個 class，CSS 會讓它從上面滑下來)
  const update = () => btn.classList.toggle("show", window.scrollY > SHOW_AFTER);

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", update, { passive: true });
  update();
})();