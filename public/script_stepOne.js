document.addEventListener("DOMContentLoaded", () => { 
  // addEventListener 可以理解成監聽器「當某件事發生時，幫我執行某個函式」
  // DOMContentLoaded 簡單說就是html建立完成的時候，這個條件就是上述的「某件事」
  
  const step1Form = document.getElementById("step1Form");
  const endDate = step1Form.elements["endDate"];
  const savedData = sessionStorage.getItem("step1Data");

  const ADVANCE_DAYS = 3; // 要在活動開始「幾天前」提出申請，想改天數只要改這裡

  // 把 Date 轉成 "YYYY-MM-DD"
  // 用本地時間來算；toISOString() 是用 UTC，台灣早上 8 點前會變成「昨天」
  const toDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // 最早可以選的活動開始日 = 今天 + ADVANCE_DAYS 天
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + ADVANCE_DAYS);
  const earliestStart = toDateStr(earliest);

  // 日期限制(DEBUG 模式不限制，方便測試)
  if (!DEBUG) {
    startDate.min = earliestStart;
  }
  // 選了開始日期之後，結束日期的最小值跟著變；如果原本選的結束日期變得比開始日期早，就清掉讓使用者重選
  startDate.addEventListener("change", () => {
    if (DEBUG) return;
    endDate.min = startDate.value;
    if (endDate.value && endDate.value < startDate.value) endDate.value = "";
  });

  // 第一步 -> 第二步
  step1Form.addEventListener("submit", (e) => {

    e.preventDefault();
	// 會讓我自己的JS優先動，阻止網頁自動跳轉
    const step1Data = Object.fromEntries(new FormData(step1Form).entries());
    const errors = [];

    if (!step1Data.unit || step1Data.unit.trim() === "")  errors.push("申請單位/系所"); 
    if (!step1Data.eventName || step1Data.eventName.trim() === "")  errors.push("活動名稱"); 
    if (!step1Data.startDate || step1Data.startDate.trim() === "")  errors.push("開始活動/停車日期"); 
    if (!step1Data.endDate || step1Data.endDate.trim() === "")  errors.push("結束活動/停車日期"); 
    if (!step1Data.area || step1Data.area.trim() === "")  errors.push("停車場地點");
    if (!step1Data.applicantName || step1Data.applicantName.trim() === "")  errors.push("申請人姓名");
    if (!step1Data.applicantEmail || step1Data.applicantEmail.trim() === "")  errors.push("申請人Email");
    if (!step1Data.applicantPhone || step1Data.applicantPhone.trim() === "")  errors.push("申請人聯絡電話");
        if (!step1Data.supervisorName || step1Data.supervisorName.trim() === "")  errors.push("單位主管姓名");
    if (!step1Data.supervisorEmail || step1Data.supervisorEmail.trim() === "")  errors.push("單位主管Email");



    if (!DEBUG && errors.length > 0) {
      alert("尚未輸入以下欄位：\n" + errors.join("\n"));
      return;
    }

    sessionStorage.setItem("step1Data", JSON.stringify(step1Data));

    // 導向 stepTwo.html
    window.location.href = "stepTwo.html";
  });
});
