const express = require("express"); // 呼叫套件express，負責接收、回應
const fs = require("fs"); // 呼叫套件fs，負責讀寫data.js

const app = express(); // 建立server並存在變數app裡
app.use(express.json());
app.use(express.static("public"));
// app.use()是每個請求都要經過的處理
// express.json()這行會自動把fetch送來的JSON字串轉換成物件
// expresss.static("public")把public公開成網頁
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
const FILE = path.join(__dirname, "data.json");

// 檢查檔案是否存在
const load = () => {
  if (!fs.existsSync(FILE)) return []; // 不存在的話回傳[]
  const text = fs.readFileSync(FILE, "utf8").trim(); // 把檔案讀成文字，.trim()去掉頭尾空白
  return text ? JSON.parse(text) : []; // 有文字就回傳陣列（用JSON.parse轉）
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