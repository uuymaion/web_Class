// debug.js
(function () {
  const params = new URLSearchParams(location.search);

  // 網址加 ?debug=1 開啟,?debug=0 關閉;存在 sessionStorage,換頁後仍有效
  if (params.get("debug") === "1") sessionStorage.setItem("debug", "1");
  if (params.get("debug") === "0") sessionStorage.removeItem("debug");

  window.DEBUG = sessionStorage.getItem("debug") === "1";

  if (window.DEBUG) {
    // 右上角小標籤,避免忘記自己開著
    document.addEventListener("DOMContentLoaded", () => {
      const tag = document.createElement("div");
      tag.textContent = "DEBUG 模式";
      tag.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:9999;background:#d93025;" +
        "color:#fff;font-size:12px;padding:2px 8px;border-radius:4px;";
      document.body.appendChild(tag);
    });
  }
})();