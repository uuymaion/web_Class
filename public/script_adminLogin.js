document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const passwordInput = document.getElementById("adminPassword");
  const loginBtn = document.getElementById("loginBtn");
  const errorBox = document.getElementById("loginError");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  // 重新輸入時把錯誤訊息收起來
  passwordInput.addEventListener("input", clearError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 阻止表單自己跳轉，改由這裡用 fetch 送出
    clearError();

    const password = passwordInput.value;
    if (!password) {
      showError("請輸入密碼");
      passwordInput.focus();
      return;
    }

    // 送出期間先停用按鈕，避免連按送出兩次
    loginBtn.disabled = true;
    loginBtn.textContent = "登入中…";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        // 登入成功：把憑證存起來，之後呼叫後台 API 時帶在標頭
        sessionStorage.setItem("adminToken", data.token);
        window.location.href = "admin.html";
        return;
      }

      if (res.status === 401) {
        showError("密碼錯誤");
      } else if (res.status === 429) {
        showError("嘗試次數過多，請稍後再試");
      } else {
        showError("登入失敗，請稍後再試");
      }
    } catch (err) {
      showError("無法連線到伺服器，請確認 server 已啟動");
    }

    // 失敗才會跑到這裡：恢復按鈕，並選取密碼方便重新輸入
    loginBtn.disabled = false;
    loginBtn.textContent = "登入";
    passwordInput.select();
  });
});
