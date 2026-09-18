document.addEventListener("DOMContentLoaded", () => { 
  // addEventListener 可以理解成監聽器「當某件事發生時，幫我執行某個函式」
  // DOMContentLoaded 簡單說就是html建立完成的時候，這個條件就是上述的「某件事」
  
  const step1Form = document.getElementById("step1Form");

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
