const express = require("express"); // 呼叫套件express，負責接收、回應
const fs = require("fs"); // 呼叫套件fs，負責讀寫data.json
const path = require("path");

const app = express(); // 建立server並存在變數app裡
app.use(express.json()); // 自動把fetch送來的JSON字串轉成物件(放在req.body)
app.use(express.static(path.join(__dirname, "public"))); // 把public公開成網頁，網址 / 會自動開 index.html

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
  let results;

  if (role === "applicant") {
    // 登記人：可以看到自己登記的完整資料
    results = list
      .filter((a) => isApplicant(a, name, phone))
      .map((a) => ({ ...a, status: a.status || DEFAULT_STATUS }));
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
        vehicles: mine,
      }));
  }

  results.sort((x, y) => y.id - x.id); // 新的排前面
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
