document.addEventListener("DOMContentLoaded", () => {
  // 回到首頁就把查詢用的暫存清掉(裡面有姓名跟手機，不需要留著)
  sessionStorage.removeItem("querySession");

  // 從首頁按「登記」= 重新開始填，把之前沒送出的暫存資料清掉
  // (從「編輯並重新送審」進去的不會經過首頁，所以不受影響)
  document.getElementById("registerLink").addEventListener("click", () => {
    sessionStorage.removeItem("step1Data");
    sessionStorage.removeItem("step2Data");
  });
});
