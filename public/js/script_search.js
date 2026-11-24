document.addEventListener("DOMContentLoaded", () => {
  // 登記人、駕駛人兩個表單共用同一段程式，用 data-role 分辨是哪一個
  const form = document.getElementById("searchForm");
  const nameInput = document.getElementById("queryName");
  const phoneInput = document.getElementById("queryPhone");
  const nameLabel = document.getElementById("nameLabel");
  const phoneLabel = document.getElementById("phoneLabel");
  const roleInputs = document.querySelectorAll('input[name="role"]');

  const roleText = () => (currentRole() === "driver" ? "駕駛人" : "登記人");
  const currentRole = () => document.querySelector('input[name="role"]:checked').value;

  // 換身分時，欄位標題跟著換
  function updateLabels() {
    nameLabel.textContent = `${roleText()}姓名`;
    phoneLabel.textContent = `${roleText()}手機號碼`;
  }

  // 從結果頁按「重新查詢」回來時，把上次的身分和資料帶回來
  const last = JSON.parse(sessionStorage.getItem("querySession") || "null");
  if (last) {
    roleInputs.forEach((r) => (r.checked = r.value === last.role));
    nameInput.value = last.name || "";
    phoneInput.value = last.phone || "";
  }
  updateLabels();
  roleInputs.forEach((r) => r.addEventListener("change", updateLabels));

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const role = currentRole(); // "applicant" 或 "driver"
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    const missing = [];
    if (!name) missing.push(`${roleText()}姓名`);
    if (!phone) missing.push(`${roleText()}手機號碼`);
    if (missing.length > 0) {
      alert("尚未輸入以下欄位：\n" + missing.join("\n"));
      return;
    }

    // 先存起來，到結果頁再向後端查詢(這樣結果頁重新整理也不會掉資料)
    sessionStorage.setItem("querySession", JSON.stringify({ role, name, phone }));
    window.location.href = "result.html";
  });

  document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
