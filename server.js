const express = require("express"); // 呼叫套件express，負責接收、回應
const fs = require("fs"); // 呼叫套件fs，負責讀寫data.json
const path = require("path");

const crypto = require("crypto"); // 產生登入憑證、比對密碼用

// 讀取 .env 裡的設定(密碼放這裡，不要寫在程式碼裡)；沒有這個檔案就略過
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (err) {}

const app = express(); // 建立server並存在變數app裡
app.use(express.json()); // 自動把fetch送來的JSON字串轉成物件(放在req.body)
app.use(express.static(path.join(__dirname, "public", "html")));
app.use(express.static(path.join(__dirname, "public")));

const FILE = path.join(__dirname, "data.json");
const MAX_VEHICLES = 10;
const DEFAULT_STATUS = "審查中"; // 新申請的預設狀態

// ---------- 小工具 ----------

// 讀取全部申請；檔案不存在或是空的就回傳 []
const load = () => {
  if (!fs.existsSync(FILE)) return [];
  const text = fs.readFileSync(FILE, "utf8").trim();
  return text ? JSON.parse(text) : [];
};

// 把整份申請寫回 data.json
const save = (list) => fs.writeFileSync(FILE, JSON.stringify(list, null, 2));

// 任何東西都轉成「去掉頭尾空白的字串」(undefined/null 會變成空字串)
const str = (v) => String(v ?? "").trim();

// 比對手機時去掉空白、減號、括號，所以 0911-111-111 和 0911111111 視為相同
const phoneKey = (v) => str(v).replace(/[\s\-()]/g, "");

// 這筆申請的登記人是不是 name + phone
const isApplicant = (a, name, phone) =>
  str(a.applicantName) === name && phoneKey(a.applicantPhone) === phone;

// 找出 :id 那筆申請，並確認 body 裡的登記人姓名+手機是對的
// 找不到、或姓名手機對不上，都回傳 null(不透露「這筆存不存在」)
const findOwned = (req) => {
  const name = str(req.body?.name);
  const phone = phoneKey(req.body?.phone);
  if (!name || !phone) return null;

  const list = load();
  const application = list.find((a) => String(a.id) === req.params.id);
  if (!application || !isApplicant(application, name, phone)) return null;
  return { list, application };
};

// ---------- 登記 ----------

// 新增一筆申請
app.post("/api/applications", (req, res) => {
  const b = req.body || {};
  const vehicles = Array.isArray(b.vehicles) ? b.vehicles : [];

  if (vehicles.length > MAX_VEHICLES) {
    return res.status(400).json({ ok: false, message: `申請車輛至多${MAX_VEHICLES}台` });
  }

  // 只收需要的欄位(不直接存 req.body，避免多餘或奇怪的資料被寫進檔案)
  const record = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    status: DEFAULT_STATUS,
    debug: b.debug === true,
    unit: str(b.unit),
    eventName: str(b.eventName),
    startDate: str(b.startDate),
    endDate: str(b.endDate),
    area: str(b.area),
    applicantName: str(b.applicantName),
    applicantPhone: str(b.applicantPhone),
    applicantEmail: str(b.applicantEmail),
    supervisorName: str(b.supervisorName),
    supervisorEmail: str(b.supervisorEmail),
    vehicles: vehicles.map((v) => ({
      plateNo: str(v?.plateNo),
      driverName: str(v?.driverName),
      driverPhone: str(v?.driverPhone),
    })),
  };

  const list = load();
  list.push(record);
  save(list);
  res.json({ ok: true, id: record.id });
});

// ---------- 查詢 ----------

// 用「姓名 + 手機」查詢；role 是 "applicant"(登記人) 或 "driver"(駕駛人)
// 用 POST 而不是 GET，手機號碼才不會出現在網址上
app.post("/api/query", (req, res) => {
  const role = req.body?.role;
  const name = str(req.body?.name);
  const phone = phoneKey(req.body?.phone);

  if (role !== "applicant" && role !== "driver") {
    return res.status(400).json({ ok: false, message: "查詢身分不正確" });
  }
  if (!name || !phone) {
    return res.status(400).json({ ok: false, message: "請輸入姓名與手機號碼" });
  }

  const list = load();
  const today = toDateStr(new Date());
  let results;

  if (role === "applicant") {
    // 登記人：可以看到自己登記的完整資料
    results = list
      .filter((a) => isApplicant(a, name, phone))
      .map((a) => ({ ...a, status: a.status || DEFAULT_STATUS, expired: isExpired(a, today) }));
  } else {
    // 駕駛人：只能看到活動資訊 + 「自己的」車輛，看不到別人的手機或 email
    results = list
      .map((a) => ({
        application: a,
        mine: (a.vehicles || []).filter(
          (v) => str(v.driverName) === name && phoneKey(v.driverPhone) === phone
        ),
      }))
      .filter((x) => x.mine.length > 0)
      .map(({ application: a, mine }) => ({
        id: a.id,
        applicantName: a.applicantName,
        eventName: a.eventName,
        startDate: a.startDate,
        endDate: a.endDate,
        area: a.area,
        status: a.status || DEFAULT_STATUS,
        expired: isExpired(a, today),
        vehicles: mine,
      }));
  }

  results.sort(byGroupThenDate);
  res.json({ ok: true, role, results });
});

// ---------- 取消 / 重發郵件(只有登記人可以) ----------

// 取消申請：狀態改成「已取消」，資料保留不刪除
app.post("/api/applications/:id/cancel", (req, res) => {
  const hit = findOwned(req);
  if (!hit) return res.status(404).json({ ok: false, message: "找不到這筆申請" });

  hit.application.status = "已取消";
  hit.application.cancelledAt = new Date().toISOString();
  save(hit.list);
  res.json({ ok: true, status: hit.application.status });
});

// 重發郵件：目前還沒有串接寄信功能，只在終端機印出紀錄
// 之後要寄信的話，在 TODO 那裡接 nodemailer，並把 sent 改成 true
app.post("/api/applications/:id/resend", (req, res) => {
  const hit = findOwned(req);
  if (!hit) return res.status(404).json({ ok: false, message: "找不到這筆申請" });

  if (hit.application.status === "已取消") {
    return res.status(400).json({ ok: false, message: "已取消的申請無法重發郵件" });
  }

  // TODO: 在這裡寄信給 hit.application.applicantEmail
  console.log(`[寄信 stub] 重發申請 ${hit.application.id} 的通知 -> ${hit.application.applicantEmail}`);
  res.json({ ok: true, sent: false });
});

// ---------- 後台登入 ----------

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 登入後憑證有效 8 小時
const MAX_FAILS = 5;                     // 連續輸錯幾次就先鎖住
const LOCK_MS = 10 * 60 * 1000;          // 鎖住多久

if (!ADMIN_PASSWORD) {
  console.warn("尚未設定 ADMIN_PASSWORD(請建立 .env)，後台登入功能停用");
}

const sessions = new Map(); // 憑證 -> 到期時間(毫秒)；server 重開後要重新登入
const fails = new Map();    // IP -> { count, lockedUntil }

// 兩邊都先轉成雜湊再比，長度固定，也不會被用回應時間猜密碼
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const passwordOk = (input) => crypto.timingSafeEqual(sha(input), sha(ADMIN_PASSWORD));

// 後台 API 的守門員：沒帶有效憑證就回 401，擋在最前面
const requireAdmin = (req, res, next) => {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expires = sessions.get(token);
  if (!expires || expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ ok: false, message: "請先登入" });
  }
  req.adminToken = token;
  next();
};

// 登入：密碼對就發一組憑證
app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ ok: false, message: "後台尚未啟用" });
  }

  const record = fails.get(req.ip) || { count: 0, lockedUntil: 0 };
  if (record.lockedUntil > Date.now()) {
    return res.status(429).json({ ok: false, message: "嘗試次數過多，請稍後再試" });
  }

  const password = String(req.body?.password ?? "");
  if (!passwordOk(password)) {
    record.count += 1;
    if (record.count >= MAX_FAILS) {
      record.count = 0;
      record.lockedUntil = Date.now() + LOCK_MS;
    }
    fails.set(req.ip, record);
    return res.status(401).json({ ok: false, message: "密碼錯誤" });
  }

  fails.delete(req.ip);
  for (const [t, exp] of sessions) if (exp < Date.now()) sessions.delete(t); // 順便清掉過期的
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + TOKEN_TTL_MS);
  res.json({ ok: true, token });
});

// 登出：讓這組憑證失效
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  sessions.delete(req.adminToken);
  res.json({ ok: true });
});

// 檢查憑證是否有效(之後後台頁面載入時用來判斷要不要跳回登入頁，現在也用來測試)
app.get("/api/admin/check", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

// ---------- 後台：申請列表 ----------

// 用台灣時間算 "YYYY-MM-DD"，部署到其他時區的主機也不會差一天
const toDateStr = (d) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });

// 活動結束日已經過了就算過期(不管是什麼狀態)
const isExpired = (a, today) => Boolean(a.endDate) && a.endDate < today;

// 分區：0 = 審查中、1 = 申請通過、2 = 已過期 / 已取消 / 已退回
const groupOf = (a) => {
  if (a.expired) return 2;
  if (a.status === "審查中") return 0;
  if (a.status === "申請通過") return 1;
  return 2;
};

// 排序：先照分區；上兩區開始日期近的在前，最下區結束日期新的在前(舊的在最下面)
const byGroupThenDate = (x, y) => {
  const gx = groupOf(x), gy = groupOf(y);
  if (gx !== gy) return gx - gy;
  const byDate = gx < 2
    ? String(x.startDate).localeCompare(String(y.startDate))
    : String(y.endDate).localeCompare(String(x.endDate));
  return byDate || y.id - x.id; // 日期一樣時，新申請的排前面
};

// 列出全部申請(需要登入)；只回傳列表要用的欄位，不含電話和 email
app.get("/api/admin/applications", requireAdmin, (req, res) => {
  const today = toDateStr(new Date());
  const applications = load()
    .map((a) => ({
      id: a.id,
      applicantName: a.applicantName,
      unit: a.unit,
      eventName: a.eventName,
      startDate: a.startDate,
      endDate: a.endDate,
      area: a.area,
      vehicleCount: (a.vehicles || []).length,
      status: a.status || DEFAULT_STATUS,
      expired: isExpired(a, today),
      rejectReason: a.rejectReason || "", // 退回理由
      debug: a.debug === true,
    }))
    .sort(byGroupThenDate)
    .map((x) => ({ ...x, group: groupOf(x) }));
  res.json({ ok: true, applications });
});

// 單筆申請的完整資料(需要登入)；列表展開時才抓，含電話、email、每台車
app.get("/api/admin/applications/:id", requireAdmin, (req, res) => {
  const a = load().find((x) => String(x.id) === req.params.id);
  if (!a) return res.status(404).json({ ok: false, message: "找不到這筆申請" });
  res.json({
    ok: true,
    application: { ...a, expired: isExpired(a, toDateStr(new Date())) },
  });
});

// ---------- 後台：審核(通過 / 退回) ----------

const REVIEW_ACTIONS = {
  approve: "申請通過",
  reject: "已退回",
};
const MAX_REASON = 200; // 退回理由字數上限

// 審核一筆申請(需要登入)；body: { action: "approve" | "reject", reason }
// 只有「審查中」而且還沒過期的申請可以審核
app.post("/api/admin/applications/:id/review", requireAdmin, (req, res) => {
  const action = req.body?.action;
  const newStatus = REVIEW_ACTIONS[action];
  if (!newStatus) {
    return res.status(400).json({ ok: false, message: "審核動作不正確" });
  }

  const reason = str(req.body?.reason);
  if (action === "reject" && !reason) {
    return res.status(400).json({ ok: false, message: "請填寫退回理由" });
  }
  if (reason.length > MAX_REASON) {
    return res.status(400).json({ ok: false, message: `退回理由最多 ${MAX_REASON} 字` });
  }

  const list = load();
  const application = list.find((a) => String(a.id) === req.params.id);
  if (!application) {
    return res.status(404).json({ ok: false, message: "找不到這筆申請" });
  }

  // 只有還沒過期的「審查中」可以審核
  if (application.status !== "審查中" || isExpired(application, toDateStr(new Date()))) {
    return res.status(409).json({ ok: false, message: "這筆申請目前不能審核，請重新整理列表" });
  }

  application.status = newStatus;
  application.reviewedAt = new Date().toISOString();
  if (action === "reject") {
    application.rejectReason = reason;
  } else {
    delete application.rejectReason;
  }
  save(list);

  // TODO: 之後要寄信通知申請人(退回時附上理由)，在這裡呼叫寄信功能
  res.json({ ok: true, status: newStatus });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error("server 啟動失敗：", err.code, err.message);
    process.exit(1);
  }
  console.log(`http://localhost:${PORT}`);
});
