document.addEventListener("DOMContentLoaded", () => {
  // 沒有登入憑證就回登入頁
  const token = sessionStorage.getItem("adminToken");
  if (!token) {
    window.location.replace("adminLogin.html");
    return;
  }

  const tabsBox = document.getElementById("tabs");
  const searchInput = document.getElementById("searchInput");
  const rowsBox = document.getElementById("rows");
  const emptyMsg = document.getElementById("emptyMsg");
  const errorMsg = document.getElementById("errorMsg");
  const summary = document.getElementById("summary");
  const logoutBtn = document.getElementById("logoutBtn");

  const rejectDialog = document.getElementById("rejectDialog");
  const rejectForm = document.getElementById("rejectForm");
  const rejectTarget = document.getElementById("rejectTarget");
  const rejectReason = document.getElementById("rejectReason");
  const rejectError = document.getElementById("rejectError");
  const rejectCancel = document.getElementById("rejectCancel");
  const rejectSubmit = document.getElementById("rejectSubmit");

  const STATUS_TABS = ["全部", "審查中", "申請通過", "已退回", "已取消", "已過期"];
  const STATUS_CLASS = {
    審查中: "status-pending",
    申請通過: "status-approved",
    已退回: "status-rejected",
    已取消: "status-cancelled",
    已過期: "status-expired",
  };

  let applications = []; // 從 API 抓回來的全部申請
  let currentTab = "全部";
  let keyword = "";
  let openId = null;              // 目前展開的那筆申請 id
  const detailCache = new Map();  // 已經抓過的詳細資料，避免重複抓

  // 建立一個元素；文字一律用 textContent 放進去，
  // 不用 innerHTML，這樣使用者填的內容不會被當成 HTML 執行
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 憑證無效或過期：清掉並回登入頁
  function goLogin() {
    sessionStorage.removeItem("adminToken");
    window.location.replace("adminLogin.html");
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }

  function countOf(status) {
    return status === "全部"
      ? applications.length
      : applications.filter((a) => a.status === status).length;
  }

  function renderTabs() {
    tabsBox.replaceChildren();
    STATUS_TABS.forEach((status) => {
      const btn = el("button", "tab" + (status === currentTab ? " active" : ""), `${status} ${countOf(status)}`);
      btn.type = "button";
      btn.addEventListener("click", () => {
        currentTab = status;
        render();
      });
      tabsBox.appendChild(btn);
    });
  }

  function renderRows() {
    const kw = keyword.trim();
    const shown = applications.filter((a) => {
      const okTab = currentTab === "全部" || a.status === currentTab;
      const okText = !kw || [a.applicantName, a.unit, a.eventName].some((s) => String(s || "").includes(kw));
      return okTab && okText;
    });

    rowsBox.replaceChildren();
    emptyMsg.hidden = shown.length > 0;

    shown.forEach((a) => {
      const row = el("div", "row");
      const isOpen = openId === a.id;
      row.classList.add("row-clickable");
      if (isOpen) row.classList.add("open");
      row.tabIndex = 0;
      row.setAttribute("aria-expanded", String(isOpen));
      row.addEventListener("click", () => toggleDetail(a.id));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target === row) toggleDetail(a.id);
      });

      const nameCell = el("div", "cell-name", a.applicantName);
      if (a.debug) nameCell.appendChild(el("span", "test-tag", "測試"));
      nameCell.prepend(el("span", "row-arrow", isOpen ? "▾" : "▸"));
      row.appendChild(nameCell);

      const eventCell = el("div");
      eventCell.appendChild(el("div", "cell-event", a.eventName));
      eventCell.appendChild(el("div", "cell-sub", a.unit));
      row.appendChild(eventCell);

      row.appendChild(el("div", "", `${a.startDate} ~ ${a.endDate}`));
      row.appendChild(el("div", "", a.area));
      row.appendChild(el("div", "", String(a.vehicleCount)));

      const statusCell = el("div");
      statusCell.appendChild(el("span", "pill " + (STATUS_CLASS[a.status] || ""), a.status));
      if (a.status === "已退回" && a.rejectReason) {
        statusCell.appendChild(el("div", "cell-sub", a.rejectReason));
      }
      row.appendChild(statusCell);

      // 操作欄：只有「審查中」可以通過 / 退回
      const actionCell = el("div", "cell-actions");
      if (a.status === "審查中") {
        const approveBtn = el("button", "action-btn approve", "通過");
        approveBtn.type = "button";
        approveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          approve(a, approveBtn);
        });

        const rejectBtn = el("button", "action-btn reject", "退回");
        rejectBtn.type = "button";
        rejectBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openReject(a);
        });

        actionCell.append(approveBtn, rejectBtn);
      } else {
        actionCell.appendChild(el("span", "cell-sub", "—"));
      }
      row.appendChild(actionCell);

      rowsBox.appendChild(row);
      if (isOpen) rowsBox.appendChild(buildDetail(a.id));
    });
  }

  function render() {
    summary.textContent = `待審查 ${countOf("審查中")} 筆`;
    renderTabs();
    renderRows();
  }

  searchInput.addEventListener("input", () => {
    keyword = searchInput.value;
    renderRows();
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
    } catch (err) {
      // 連不上伺服器也照樣登出這一端
    }
    goLogin();
  });

  async function loadApplications() {
    try {
      const res = await fetch("/api/admin/applications", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.status === 401) {
        goLogin();
        return;
      }
      if (!res.ok) throw new Error("bad status");

      const data = await res.json();
      applications = data.applications || [];
      detailCache.clear(); // 重新載入列表時，詳細資料也要重抓(例如審核後的退回理由)
      render();
    } catch (err) {
      showError("無法載入申請資料，請確認 server 已啟動後重新整理");
    }
  }

  // ---------- 展開詳細資料 ----------

  function toggleDetail(id) {
    openId = openId === id ? null : id;
    renderRows();
  }

  function buildDetail(id) {
    const box = el("div", "row-detail");
    const cached = detailCache.get(id);
    if (cached) {
      fillDetail(box, cached);
    } else {
      box.appendChild(el("p", "cell-sub", "載入中…"));
      loadDetail(id, box);
    }
    return box;
  }

  async function loadDetail(id, box) {
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.status === 401) {
        goLogin();
        return;
      }
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      detailCache.set(id, data.application);
      fillDetail(box, data.application);
    } catch (err) {
      box.replaceChildren(el("p", "admin-error", "無法載入詳細資料，請重新整理再試"));
    }
  }

  function formatTime(iso) {
    return iso ? new Date(iso).toLocaleString("zh-TW", { hour12: false }) : "—";
  }

  function fillDetail(box, d) {
    box.replaceChildren();

    // 聯絡資料
    const info = el("div", "detail-info");
    const items = [
      ["登記人電話", d.applicantPhone],
      ["登記人 Email", d.applicantEmail],
      ["主管", d.supervisorName],
      ["主管 Email", d.supervisorEmail],
      ["申請時間", formatTime(d.createdAt)],
    ];
    if (d.reviewedAt) items.push(["審核時間", formatTime(d.reviewedAt)]);
    if (d.rejectReason) items.push(["退回理由", d.rejectReason]);

    items.forEach(([label, value]) => {
      const item = el("div", "detail-item");
      item.append(el("div", "detail-label", label), el("div", "detail-value", value || "—"));
      info.appendChild(item);
    });
    box.appendChild(info);

    // 車輛清單
    const vehicles = d.vehicles || [];
    box.appendChild(el("div", "detail-title", `車輛 ${vehicles.length} 台`));
    if (vehicles.length === 0) {
      box.appendChild(el("p", "cell-sub", "沒有車輛資料"));
      return;
    }

    const table = el("table", "vehicle-table");
    const head = el("tr");
    ["#", "車牌", "駕駛人", "駕駛人電話"].forEach((t) => head.appendChild(el("th", "", t)));
    table.appendChild(el("thead")).appendChild(head);

    const body = el("tbody");
    vehicles.forEach((v, i) => {
      const tr = el("tr");
      [String(i + 1), v.plateNo, v.driverName, v.driverPhone].forEach((t) =>
        tr.appendChild(el("td", "", t || "—"))
      );
      body.appendChild(tr);
    });
    table.appendChild(body);
    box.appendChild(table);
  }
    // 送出審核；成功回傳 true，失敗回傳錯誤訊息
  async function review(id, action, reason = "") {
    try {
      const res = await fetch(`/api/admin/applications/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ action, reason }),
      });
      if (res.status === 401) {
        goLogin();
        return "請先登入";
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.message || "審核失敗，請稍後再試";
      return true;
    } catch (err) {
      return "無法連線到 server，請確認 server 已啟動";
    }
  }

  // 通過：先確認，避免誤按
  async function approve(a, btn) {
    if (!confirm(`確定要通過「${a.applicantName}／${a.eventName}」的申請嗎？`)) return;
    btn.disabled = true;
    const result = await review(a.id, "approve");
    if (result !== true) {
      btn.disabled = false;
      showError(result);
      return;
    }
    errorMsg.hidden = true;
    loadApplications();
  }

  // 退回：打開對話框填理由
  let rejectingId = null;

  function openReject(a) {
    rejectingId = a.id;
    rejectTarget.textContent = `${a.applicantName}／${a.eventName}（${a.startDate} ~ ${a.endDate}）`;
    rejectReason.value = "";
    rejectError.hidden = true;
    rejectDialog.showModal();
    rejectReason.focus();
  }

  rejectCancel.addEventListener("click", () => rejectDialog.close());

  rejectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = rejectReason.value.trim();
    if (!reason) {
      rejectError.textContent = "請填寫退回理由";
      rejectError.hidden = false;
      return;
    }

    rejectSubmit.disabled = true;
    const result = await review(rejectingId, "reject", reason);
    rejectSubmit.disabled = false;

    if (result !== true) {
      rejectError.textContent = result;
      rejectError.hidden = false;
      return;
    }
    rejectDialog.close();
    errorMsg.hidden = true;
    loadApplications();
  });

  loadApplications();
});
