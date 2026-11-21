document.addEventListener("DOMContentLoaded", () => {
  // 登記人、駕駛人兩個表單共用同一段程式，用 data-role 分辨是哪一個
  document.querySelectorAll(".search-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const role = form.dataset.role; // "applicant" 或 "driver"
      const name = form.querySelector('input[type="text"]').value.trim();
      const phone = form.querySelector('input[type="tel"]').value.trim();
      const roleText = role === "driver" ? "駕駛人" : "登記人";

      const missing = [];
      if (!name) missing.push(`${roleText}姓名`);
      if (!phone) missing.push(`${roleText}手機號碼`);
      if (missing.length > 0) {
        alert("尚未輸入以下欄位：\n" + missing.join("\n"));
        return;
      }

      // 先存起來，到結果頁再向後端查詢(這樣結果頁重新整理也不會掉資料)
      sessionStorage.setItem("querySession", JSON.stringify({ role, name, phone }));
      window.location.href = "result.html";
    });
  });

  document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
