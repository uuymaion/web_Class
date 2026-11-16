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

  // 分頁順序；「已退回」等第三張 issue 做審核功能時再加進來
  const STATUS_TABS = ["全部", "審查中", "申請通過", "已取消", "已過期"];
  const STATUS_CLASS = {
    審查中: "status-pending",
    申請通過: "status-approved",
    已取消: "status-cancelled",
    已過期: "status-expired",
  };

  let applications = []; // 從 API 抓回來的全部申請
  let currentTab = "全部";
  let keyword = "";

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

      const nameCell = el("div", "cell-name", a.applicantName);
      if (a.debug) nameCell.appendChild(el("span", "test-tag", "測試"));
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
      row.appendChild(statusCell);

      rowsBox.appendChild(row);
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
      render();
    } catch (err) {
      showError("無法載入申請資料，請確認 server 已啟動後重新整理");
    }
  }

  loadApplications();
});
