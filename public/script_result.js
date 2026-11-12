document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("resultList");
  const titleEl = document.getElementById("resultTitle");

  // 查詢頁存下來的 { role, name, phone }；沒有的話代表不是從查詢頁來的，送回查詢頁
  const session = JSON.parse(sessionStorage.getItem("querySession") || "null");
  if (!session) {
    window.location.replace("search.html");
    return;
  }

  let applications = []; // 目前查到的結果

  // ---------- 小工具 ----------

  // 把文字裡的 < > & 等符號轉掉，避免使用者輸入的內容被當成 HTML 執行
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 2026-11-01 -> 2026/11/1
  const fmtDate = (d) => {
    const p = String(d || "").split("-");
    return p.length === 3 ? `${p[0]}/${Number(p[1])}/${Number(p[2])}` : esc(d);
  };

  const dateRange = (a) => `${fmtDate(a.startDate)}~${fmtDate(a.endDate)}`;

  const statusHtml = (status) => {
    const cls = { 申請通過: "status-ok", 審查中: "status-pending", 已取消: "status-cancel" }[status] || "";
    return `<span class="${cls}">${esc(status)}</span>`;
  };

  // 一列資料：標題 + 內容 + (選填)右邊的按鈕
  const row = (label, valueHtml, extraHtml = "") =>
    `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${valueHtml}</span>${extraHtml}</div>`;

  const pill = (action, text) => `<button type="button" class="pill-btn" data-action="${action}">${text}</button>`;

  // 把資料 POST 給後端，回傳 { ok, data }
  async function post(url, body) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch (err) {
      console.error(err);
      return { ok: false, data: { message: "無法連線到伺服器，請確認後端有啟動" } };
    }
  }

  // ---------- 畫面 ----------

  // 登記人看到的卡片(三張：主卡片、更多申請資料、車輛)
  function applicantGroup(a) {
    const status = a.status || "審查中";
    const cancelled = status === "已取消";
    const vehicles = a.vehicles || [];

    const infoRows = [
      row("申請單位", esc(a.unit), pill("collapse", "收起")),
      row("活動名稱", esc(a.eventName)),
      row("停車校區", esc(a.area)),
      row("申請人email", esc(a.applicantEmail)),
      row("申請單位主管", esc(a.supervisorName)),
      row("單位email", esc(a.supervisorEmail)),
    ].join("");

    const vehicleRows = vehicles
      .map((v, i) =>
        row(`車輛${i + 1}`, esc(v.plateNo), i === 0 ? pill("collapse", "收起") : "") +
        row(`駕駛人${i + 1}`, `${esc(v.driverName)} - ${esc(v.driverPhone)}`)
      )
      .join("");

    return `
      <article class="result-group" data-id="${esc(a.id)}">
        <div class="card result-card">
          ${row("登記人", esc(a.applicantName), pill("toggle-info", "更多申請資料"))}
          ${row("登記車數", vehicles.length, pill("toggle-vehicles", "點擊查看"))}
          ${row("活動日期", dateRange(a))}
          ${row("申請狀態", statusHtml(status))}
          <p class="card-note">*原本的資料不會自動刪除</p>
          <div class="action-row">
            <button type="button" class="action-btn action-edit" data-action="edit">編輯並重新送審</button>
            <button type="button" class="action-btn action-resend" data-action="resend" ${cancelled ? "disabled" : ""}>重發郵件</button>
            <button type="button" class="action-btn action-cancel" data-action="cancel" ${cancelled ? "disabled" : ""}>取消</button>
          </div>
        </div>
        <div class="card detail-card" data-panel="info" hidden>${infoRows}</div>
        <div class="card detail-card" data-panel="vehicles" hidden>${vehicleRows}</div>
      </article>`;
  }

  // 駕駛人看到的卡片(只有活動資訊 + 自己的車，不能編輯或取消)
  function driverGroup(a) {
    const vehicleRows = (a.vehicles || [])
      .map((v, i) => row(`車輛${i + 1}`, esc(v.plateNo)) + row(`駕駛人${i + 1}`, `${esc(v.driverName)} - ${esc(v.driverPhone)}`))
      .join("");

    return `
      <article class="result-group" data-id="${esc(a.id)}">
        <div class="card result-card">
          ${row("登記人", esc(a.applicantName))}
          ${row("活動名稱", esc(a.eventName))}
          ${row("停車校區", esc(a.area))}
          ${row("活動日期", dateRange(a))}
          ${row("申請狀態", statusHtml(a.status || "審查中"))}
          ${vehicleRows}
        </div>
      </article>`;
  }

  function messageCard(title, hint) {
    return `
      <div class="card empty-card">
        <p>${esc(title)}</p>
        <p class="hint">${esc(hint)}</p>
        <button type="button" class="pill-btn" data-action="research">重新查詢</button>
      </div>`;
  }

  function render() {
    titleEl.textContent = session.role === "driver" ? "駕駛人資料" : "登記資料";

    if (applications.length === 0) {
      listEl.innerHTML = messageCard("查無符合的資料", "請確認姓名與手機號碼是否和登記時填寫的相同");
      return;
    }
    listEl.innerHTML = applications.map(session.role === "driver" ? driverGroup : applicantGroup).join("");
  }

  async function loadResults() {
    listEl.innerHTML = `<p class="loading">查詢中…</p>`;
    const { ok, data } = await post("/api/query", session);

    if (!ok) {
      applications = [];
      listEl.innerHTML = messageCard(data.message || "查詢失敗，請稍後再試", "");
      return;
    }
    applications = data.results;
    render();
  }

  // ---------- 按鈕功能 ----------

  // 編輯並重新送審：把這筆資料放進暫存，帶到登記頁預先填好；送出後會是一筆「新的」申請，舊的不會被刪除
  function editApplication(a) {
    const step1Data = {
      unit: a.unit,
      eventName: a.eventName,
      startDate: a.startDate,
      endDate: a.endDate,
      area: a.area,
      applicantName: a.applicantName,
      applicantPhone: a.applicantPhone,
      applicantEmail: a.applicantEmail,
      supervisorName: a.supervisorName,
      supervisorEmail: a.supervisorEmail,
    };
    sessionStorage.setItem("step1Data", JSON.stringify(step1Data));
    sessionStorage.setItem("step2Data", JSON.stringify(a.vehicles || []));
    window.location.href = "stepOne.html";
  }

  async function resendMail(id) {
    const { ok, data } = await post(`/api/applications/${id}/resend`, { name: session.name, phone: session.phone });
    if (!ok) {
      alert(data.message || "重發失敗，請稍後再試");
      return;
    }
    alert(data.sent ? "已重發郵件" : "已記錄重發請求。\n(目前尚未串接寄信功能，不會真的寄出信件)");
  }

  async function cancelApplication(id) {
    if (!confirm("確定要取消這筆申請嗎？\n取消後狀態會變成「已取消」。")) return;

    const { ok, data } = await post(`/api/applications/${id}/cancel`, { name: session.name, phone: session.phone });
    if (!ok) {
      alert(data.message || "取消失敗，請稍後再試");
      return;
    }
    await loadResults(); // 重新查一次，畫面就會更新成「已取消」
  }

  // 事件委派：監聽整個清單，按到有 data-action 的按鈕才處理
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || btn.disabled) return;

    const action = btn.dataset.action;
    if (action === "research") {
      window.location.href = "search.html";
      return;
    }

    const group = btn.closest(".result-group");
    const id = group.dataset.id;
    const application = applications.find((a) => String(a.id) === id);

    if (action === "toggle-info" || action === "toggle-vehicles") {
      const panel = group.querySelector(`[data-panel="${action === "toggle-info" ? "info" : "vehicles"}"]`);
      panel.hidden = !panel.hidden;
    } else if (action === "collapse") {
      btn.closest(".detail-card").hidden = true;
    } else if (action === "edit") {
      editApplication(application);
    } else if (action === "resend") {
      resendMail(id);
    } else if (action === "cancel") {
      cancelApplication(id);
    }
  });

  const goHome = () => (window.location.href = "index.html");
  document.getElementById("homeBtn").addEventListener("click", goHome);
  document.getElementById("topBackBtn").addEventListener("click", goHome);

  loadResults();
});
