# 北市大臨時停車系統

臺北市立大學校內活動的**臨時停車申請系統**。申請人可以在線上登記活動用車、查詢申請狀態；管理員可以在後台審核申請。

使用 Node.js + Express 架設，前端是純 HTML / CSS / JavaScript，資料暫時存在 `data.json`。

---

## 功能

### 申請人（前台）

- **線上登記**：分兩步驟填寫
  - 第一步：申請單位、活動名稱、活動日期、停車校區、申請人與單位主管資料
  - 第二步：車輛資料（車牌、駕駛人姓名、手機），一次最多 10 台
- **日期限制**：活動開始日最早只能選「今天 + 2 天」，結束日不能早於開始日
- **查詢申請**：用「姓名 + 手機」查詢，分成兩種身分
  - 登記人：看得到自己登記的完整資料，可以取消申請、重發郵件、編輯並重新送審
  - 駕駛人：只看得到活動資訊和自己的車輛，看不到其他人的聯絡資料
- **申請狀態**：審查中、申請通過、已退回（會顯示退回理由）、已取消
- **過期顯示**：活動結束日已經過了的申請會變成灰色，排在最下面
- **步驟動畫**：登記頁面切換時，進度條和卡片有前進／倒退的動畫

### 管理員（後台）

- **登入**：密碼設定在 `.env`，登入後有效 8 小時；連續輸錯 5 次會鎖住 10 分鐘
- **申請列表**：「全部」分頁分成三區
  1. 審查中：開始日期近的在上
  2. 申請通過：開始日期近的在上
  3. 已過期 / 已取消 / 已退回：結束日期舊的在下
- **即將開始提醒**：審查中的申請，開始日期在 5 天內會出現橘色提醒
- **分頁與搜尋**：可以依狀態切換分頁，也可以搜尋登記人、單位、活動名稱
- **展開詳細資料**：點一列可以看到聯絡資料、審核紀錄和每台車的資料
- **審核**：通過或退回，退回時必須填寫理由

### 共通

- **回到頂端**：往下捲之後，左上角會出現灰色箭頭，按了回到最上面
- **減少動態效果**：系統有開啟「減少動態效果」的使用者，動畫會自動關閉

---

## 安裝與啟動

需要 **Node.js 20.12 以上**（因為用到內建的 `process.loadEnvFile` 讀取 `.env`）。

```bash
git clone https://github.com/uuymaion/web_Class.git
cd web_Class
npm install
```

在專案根目錄（跟 `server.js` 同一層）建立 `.env`，設定後台密碼：

```
ADMIN_PASSWORD=你的密碼
```

啟動 server：

```bash
node server.js
```

打開瀏覽器：

| 頁面 | 網址 |
|---|---|
| 首頁 | http://localhost:3000 |
| 後台登入 | http://localhost:3000/adminLogin.html |

> Windows PowerShell 要用 `npm.cmd install`。
> `.env` 和 `data.json` 都在 `.gitignore` 裡，**不會也不能** commit。

---

## 資料夾結構

```
web_Class/
├── server.js          # Express server 與所有 API
├── data.json          # 申請資料
├── .env               # 後台密碼
└── public/
    ├── html/          # 所有網頁
    ├── css/           # styles.css 為共用樣式，其餘為各頁專用
    └── js/            # script.js 為共用功能，其餘為各頁專用
```

| 頁面 | HTML | 說明 |
|---|---|---|
| 首頁 | `index.html` | 選擇登記或查詢 |
| 登記第一步 | `stepOne.html` | 活動與申請人資料 |
| 登記第二步 | `stepTwo.html` | 車輛資料 |
| 登記完成 | `success.html` | 送出成功 |
| 查詢 | `search.html` | 選擇身分、輸入姓名與手機 |
| 查詢結果 | `result.html` | 申請列表與操作按鈕 |
| 後台登入 | `adminLogin.html` | 管理員登入 |
| 後台列表 | `admin.html` | 申請列表與審核 |

---

## API

### 前台

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/applications` | 送出新申請 |
| POST | `/api/query` | 用姓名 + 手機查詢 |
| POST | `/api/applications/:id/cancel` | 取消申請 |
| POST | `/api/applications/:id/resend` | 重發郵件（目前尚未串接寄信） |

### 後台（除了登入，都需要在標頭帶 `Authorization: Bearer <token>`）

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/admin/login` | 登入，取得 token |
| POST | `/api/admin/logout` | 登出 |
| GET | `/api/admin/check` | 檢查 token 是否有效 |
| GET | `/api/admin/applications` | 申請列表 |
| GET | `/api/admin/applications/:id` | 單筆完整資料 |
| POST | `/api/admin/applications/:id/review` | 審核（通過 / 退回） |

---

## 開發用：Debug 模式

網址後面加上 `?debug=1` 開啟、`?debug=0` 關閉，例如：

```
http://localhost:3000/stepOne.html?debug=1
```

開啟後右上角會出現「DEBUG 模式」標籤，可以自動填入隨機的測試資料。用 debug 模式送出的申請，在後台會標示「測試」。