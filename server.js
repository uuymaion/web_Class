const express = require("express"); // 呼叫套件express，負責接收、回應
const fs = require("fs"); // 呼叫套件fs，負責讀寫data.js

const app = express(); // 建立server並存在變數app裡
app.use(express.json()); // 
app.use(express.static("public"));   // 你的 html/css/js 放在 public 資料夾

const FILE = "data.json";
const load = () => {
  if (!fs.existsSync(FILE)) return [];
  const text = fs.readFileSync(FILE, "utf8").trim();
  return text ? JSON.parse(text) : [];
};

// 新增一筆申請
app.post("/api/applications", (req, res) => {
  const list = load();
  list.push({ id: Date.now(), ...req.body });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  res.json({ ok: true });
});

// 讀取全部申請
app.get("/api/applications", (req, res) => res.json(load()));

app.listen(3000, () => console.log("http://localhost:3000"));