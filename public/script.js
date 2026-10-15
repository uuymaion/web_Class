document.addEventListener("DOMContentLoaded", () => { 
  // addEventListener 可以理解成監聽器「當某件事發生時，幫我執行某個函式」
  // DOMContentLoaded 簡單說就是html建立完成的時候，這個條件就是上述的「某件事」
  
  const step1Form = document.getElementById("step1Form");

  // 第一步 -> 第二步
  step1Form.addEventListener("submit", (e) => {

    e.preventDefault();
	// 會讓我自己的JS優先動，阻止網頁自動跳轉
    const step1Data = Object.fromEntries(new FormData(step1Form).entries());
    const errors = [];

    if (!step1Data.unit || step1Data.unit.trim() === "")  errors.push("申請單位/系所"); 
    if (!step1Data.eventName || step1Data.eventName.trim() === "")  errors.push("活動名稱"); 
    if (!step1Data.eventDate || step1Data.eventDate.trim() === "")  errors.push("活動/停車日期"); 
    if (!step1Data.area || step1Data.area.trim() === "")  errors.push("停車場地點");
    if (!step1Data.startDate || step1Data.startDate.trim() === "")  errors.push("停車起始日期");
    if (!step1Data.endDate || step1Data.endDate.trim() === "")  errors.push("停車結束日期");
    if (!step1Data.plateNo || step1Data.plateNo.trim() === "")  errors.push("車牌號碼");
    if (!step1Data.driverName || step1Data.driverName.trim() === "")  errors.push("駕駛姓名");
    if (!step1Data.driverPhone || step1Data.driverPhone.trim() === "")  errors.push("駕駛電話");

    if (errors.length > 0) {
      alert("尚未輸入以下欄位：\n" + errors.join("\n"));
      return;
    }

    sessionStorage.setItem("step1Data", JSON.stringify(step1Data));

    // 導向 stepTwo.html
    window.location.href = "stepTwo.html";
  });
});
