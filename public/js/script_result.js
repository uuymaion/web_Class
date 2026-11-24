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

  // 狀態 -> 標籤的 class
  const STATUS_CLASS = { 申請通過: "tag-ok", 審查中: "tag-pending", 已取消: "tag-cancel", 已退回: "tag-rejected" };
  const statusTag = (status) => `<span class="status-tag ${STATUS_CLASS[status] || ""}">${esc(status)}</span>`;

  // 0912345678 -> 0912-345-678(不是 10 碼就照原樣)
  const fmtPhone = (p) => {
    const d = String(p || "").replace(/\D/g, "");
    return d.length === 10 ? `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}` : esc(p);
  };

  // 左邊的日期方塊：大字是開始日；一天的活動下面寫月份，好幾天的寫結束日
  function dateBlock(a) {
    const [, sm, sd] = String(a.startDate || "").split("-");
    const [, em, ed] = String(a.endDate || "").split("-");
    if (!sd) return `<div class="date-block"><b>--</b></div>`;
    const sub = a.startDate === a.endDate || !ed ? `${Number(sm)}月` : `~${Number(em)}/${Number(ed)}`;
    return `<div class="date-block"><b>${sd}</b><span>${sub}</span></div>`;
  }

  // 展開後的一格資料(標題在上、內容在下)
  const infoItem = (label, value) => `<div class="info-item"><span>${label}</span>${value || "—"}</div>`;

  // 一台車：車牌外框 + 駕駛人 + 手機
  const carRow = (v) =>
    `<div class="car-row"><span class="plate">${esc(v.plateNo)}</span><span class="car-driver">${esc(v.driverName)}</span><span class="car-phone">${fmtPhone(v.driverPhone)}</span></div>`;
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

  // 一筆申請 = 一條可以點開的長條(上面是摘要，下面是展開的詳細資料)
  function itemHtml(a, detailHtml, metaText) {
    return `
      <article class="app-item${a.expired || a.status === "已取消" ? " is-ended" : ""}" data-id="${esc(a.id)}">
        <button type="button" class="app-head" data-action="toggle" aria-expanded="false">
          ${dateBlock(a)}
          <span class="app-main">
            <span class="app-title">${esc(a.eventName)}</span>
            <span class="app-meta">${metaText}</span>
          </span>
          ${statusTag(a.status || "審查中")}
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <div class="app-detail" hidden>${detailHtml}</div>
      </article>`;
  }

  // 登記人：看得到完整資料，可以編輯、重發郵件、取消
  function applicantItem(a) {
    const status = a.status || "審查中";
    const closed = status === "已取消" || status === "已退回";
    const vehicles = a.vehicles || [];

    const detail = `
      ${status === "已退回" && a.rejectReason ? `<div class="reject-box"><b>⚠ 退回理由</b>${esc(a.rejectReason)}</div>` : ""}
      <h3 class="detail-title">活動資訊</h3>
      <div class="info-grid">
        ${infoItem("申請單位", esc(a.unit))}
        ${infoItem("停車校區", esc(a.area))}
        ${infoItem("活動日期", dateRange(a))}
        ${infoItem("登記人", esc(a.applicantName))}
        ${infoItem("登記人email", esc(a.applicantEmail))}
        ${infoItem("單位主管", esc(a.supervisorName))}
        ${infoItem("主管email", esc(a.supervisorEmail))}
      </div>
      <h3 class="detail-title">車輛 ${vehicles.length} 台</h3>
      <div class="car-list">${vehicles.map(carRow).join("")}</div>
      <p class="card-note">*編輯並重新送審會新增一筆申請，原本的資料不會自動刪除</p>
      <div class="action-row">
        <button type="button" class="action-btn action-edit" data-action="edit">編輯並重新送審</button>
        ${closed ? "" : `
        <button type="button" class="action-btn action-resend" data-action="resend">重發郵件</button>
        <button type="button" class="action-btn action-cancel" data-action="cancel">取消</button>`}
      </div>`;

    return itemHtml(a, detail, `${esc(a.area)} · ${vehicles.length} 台車`);
  }

  // 駕駛人：只看得到活動資訊和自己的車，不能編輯或取消
  function driverItem(a) {
    const vehicles = a.vehicles || [];
    const detail = `
      <h3 class="detail-title">活動資訊</h3>
      <div class="info-grid">
        ${infoItem("登記人", esc(a.applicantName))}
        ${infoItem("停車校區", esc(a.area))}
        ${infoItem("活動日期", dateRange(a))}
      </div>
      <h3 class="detail-title">我的車輛</h3>
      <div class="car-list">${vehicles.map(carRow).join("")}</div>`;

    return itemHtml(a, detail, `${esc(a.area)} · 登記人 ${esc(a.applicantName)}`);
  }
  function messageCard(title, hint) {
    return `
      <div class="card empty-card">
        <p>${esc(title)}</p>
        <p class="hint">${esc(hint)}</p>
        <button type="button" class="primary-btn research-btn" data-action="research">重新查詢</button>
      </div>`;
  }

  function render() {
    titleEl.textContent = session.role === "driver" ? "我的停車資格" : "我的申請";

    if (applications.length === 0) {
      listEl.innerHTML = messageCard("查無符合的資料", "請確認姓名與手機號碼是否和登記時填寫的相同");
      return;
    }

    // 分兩段：進行中 / 已結束、已取消(順序照 server 排好的)
    const toItem = session.role === "driver" ? driverItem : applicantItem;
    const ended = (a) => a.expired || a.status === "已取消";
    const active = applications.filter((a) => !ended(a));
    const done = applications.filter(ended);

    const section = (title, list) =>
      list.length ? `<h2 class="section-title">${title}</h2>${list.map(toItem).join("")}` : "";

    listEl.innerHTML = section("進行中", active) + section("已結束 / 已取消", done);

    // 只有一筆的話直接展開
    if (applications.length === 1) toggleItem(listEl.querySelector(".app-item"));
  }

  // 展開 / 收起一筆
  function toggleItem(item) {
    const head = item.querySelector(".app-head");
    const detail = item.querySelector(".app-detail");
    const open = detail.hidden;
    detail.hidden = !open;
    head.setAttribute("aria-expanded", String(open));
    item.classList.toggle("is-open", open);
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

    const item = btn.closest(".app-item");
    const id = item.dataset.id;
    const application = applications.find((a) => String(a.id) === id);

    if (action === "toggle") {
      toggleItem(item);
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

  loadResults();
});
