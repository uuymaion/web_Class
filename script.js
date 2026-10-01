document.addEventListener("DOMContentLoaded", () => { 
  // addEventListener 可以理解成監聽器「當某件事發生時，幫我執行某個函式」
  // DOMContentLoaded 簡單說就是html建立完成的時候，這個條件就是上述的「某件事」
  
  const step1Form = document.getElementById("step1Form");
  const startDate = step1Form.elements["startDate"];
  const endDate = step1Form.elements["endDate"];
  const savedData = sessionStorage.getItem("step1Data");

  // 開始日期只能選今天以後
  startDate.min = new Date().toISOString().split("T")[0];
  // 選了開始日期之後，結束日期的最小值跟著變
  startDate.addEventListener("change", () => {
    endDate.min = startDate.value;
  });

  // 如果使用者從第二頁跳回來的話需要把資料存回網頁
  if(savedData) {
    const data = JSON.parse(savedData); // JSON.parse() 是把字串轉回物件

    Object.keys(data).forEach((key) => { // 把data的所有keys分別拿出來，forEach() 會對每個key執行一次裡面的函式
      const field = step1Form.elements[key];
      // 前面的data是使用者存下來的資料；field是對應到step1Form裡面name屬性等於key的欄位

      if (!field) return;

      // 先處理有選項的部分
      if (field instanceof RadioNodeList || field.type === "checkbox" || field.type === "radio") {
        const options = field instanceof RadioNodeList ? Array.from(field) : [field];
        // instanceof RadioNodeList 是判斷 field 是否為 RadioNodeList 是專門用來裝「同name裡的多個元素」
        // Array.form() 是把很像陣列的東西（也就是上面說的RadioNodeList）轉成真正的陣列，陣列才能方便我們提取使用

        options.forEach((option) => {
          option.checked = option.value === data[key];
        });
        // 先看右邊的===，結果是true或false，然後把這個結果給左邊的checked屬性
        // 選項的表示方式就是true跟false，但回傳的是選項上的字（ex天母校區）
        // 所以假設使用者儲存下來的資料是天母校區，走到博愛校區的時候就會false

      // 剩下都是文字，可以直接貼上
      } else {
        field.value = data[key];
      }
    });
  }

  // 送出第一頁的資料
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
