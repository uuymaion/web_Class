document.addEventListener("DOMContentLoaded", () => { 
  // addEventListener 可以理解成監聽器「當某件事發生時，幫我執行某個函式」
  // DOMContentLoaded 簡單說就是html建立完成的時候，這個條件就是上述的「某件事」
  
  const step1Form = document.getElementById("step1Form");

  // 如果有input過的話，就要儲存資料
  const savedData = sessionStorage.getItem("step1Data");
  // getItem是讀之前儲存過的字串資料，沒輸入過的話會是NULL

  if(savedData){
    const data = JSON.parse(savedData);
    // parse是將字串轉回物件，方便js辨識和使用

    Object.keys(data).forEach((key) => {
      // object.keys(data)是把所有savedData變成一個陣列
      // forEach(key)是把陣列的元素一個一個拿出來

      const field = step1Form.elements[key];
      // field代表現在讀到的name，並非input蒐集到的資料

      if (!field) return;

        // radio / checkbox 跟一般 input 的填法不一樣，要分開處理
      if (field instanceof RadioNodeList || field.type === "checkbox" || field.type === "radio") {
        // instanceof 判斷「某個東西是不是某種類型」，會回傳布林值
        // RadioNodeList 是特殊的集合，是儲存那種name有多個元素的
        // ===嚴格相等，不會有"5"==5是true的狀況


        // 同一個 name 有多個元素時（例如 radio 或多選 checkbox）
        const options = field instanceof RadioNodeList ? Array.from(field) : [field];
        // 
        options.forEach((option) => {
          option.checked = option.value === data[key];
        });
      } else {
        field.value = data[key];
      }
    });
  }

  // 第一步 -> 第二步
  step1Form.addEventListener("submit", (e) => {

    e.preventDefault();
	// 會讓我自己的JS優先動，阻止網頁自動跳轉
	
    const step1Data = Object.fromEntries(new FormData(step1Form).entries());
    sessionStorage.setItem("step1Data", JSON.stringify(step1Data));

    // 導向 stepTwo.html
    window.location.href = "stepTwo.html";
  });
});
