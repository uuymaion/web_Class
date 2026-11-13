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
        // ---------- 隨機填入測試資料(只有 DEBUG 模式才有) ----------
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const digits = (n) => Array.from({ length: n }, () => randInt(0, 9)).join("");
    const randName = () =>
      pick(["王", "李", "陳", "林", "張", "黃", "吳", "劉"]) +
      pick(["小明", "大華", "美玲", "志豪", "雅婷", "建宏", "怡君", "冠宇"]);
    const randPhone = () => "09" + digits(8);
    const randPlate = () => {
      const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + randInt(0, 25))).join("");
      return `${letters}-${digits(4)}`;
    };
    // 今天 + n 天，格式 YYYY-MM-DD(用本地時間)
    const dateAfter = (n) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const setValue = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.value = value;
    };

    // 步驟 1：申請資料
    function fillStep1() {
      const start = randInt(3, 20); // 符合「3 天前申請」的規則
      const n = randInt(100, 999);
      setValue("#unit", pick(["資訊科學系", "體育學院", "音樂系", "數學系", "訪客"]));
      setValue("#eventName", pick(["迎新茶會", "校慶園遊會", "社團成果展", "籃球友誼賽", "畢業展"]));
      setValue("#startDate", dateAfter(start));
      setValue("#endDate", dateAfter(start + randInt(0, 2))); // 結束日不早於開始日
      pick(Array.from(document.querySelectorAll('input[name="area"]'))).checked = true;
      setValue("#applicantName", randName());
      setValue("#applicantPhone", randPhone());
      setValue("#applicantEmail", `test${n}@example.com`);
      setValue("#supervisorName", randName());
      setValue("#supervisorEmail", `boss${n}@example.com`);
      document.querySelectorAll('input[name="agree"], input[name="deadlineAck"]').forEach((el) => (el.checked = true));
    }

    // 步驟 2：車輛(隨機 1~3 台，不夠就按「＋」補)
    function fillStep2() {
      const addBtn = document.getElementById("addVehicleBtn");
      const target = randInt(1, 3);
      const current = document.querySelectorAll("#vehicleList .vehicle-group").length;
      for (let i = current; i < target; i++) addBtn.click();

      document.querySelectorAll("#vehicleList .vehicle-group").forEach((group) => {
        const inputs = group.querySelectorAll("input");
        inputs[0].value = randPlate();
        inputs[1].value = randName();
        inputs[2].value = randPhone();
      });
    }

    // 在步驟 1、步驟 2 頁面左上角加一顆「隨機填入」按鈕
    document.addEventListener("DOMContentLoaded", () => {
      const isStep1 = document.getElementById("step1Form");
      const isStep2 = document.getElementById("step2Form");
      if (!isStep1 && !isStep2) return; // 其他頁面不需要

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "隨機填入";
      btn.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:9999;background:#1F5F4A;" +
        "color:#fff;border:none;font-size:12px;padding:4px 10px;border-radius:4px;cursor:pointer;";
      btn.addEventListener("click", () => (isStep1 ? fillStep1() : fillStep2()));
      document.body.appendChild(btn);
    });
  }
})();