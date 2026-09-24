document.addEventListener("DOMContentLoaded", () => {
  const step2Form = document.getElementById("step2Form");
  const backBtn = document.getElementById("backBtn");
  const addVehicleBtn = document.getElementById("addVehicleBtn");
  const vehicleList = document.getElementById("vehicleList");

  // 回到第一頁（改成真的換頁，而不是切換 hidden）
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // 新增一組車輛欄位（這段完全沒變，跟原本一樣）
  addVehicleBtn.addEventListener("click", () => {
    const firstGroup = vehicleList.querySelector(".vehicle-group");
    const newGroup = firstGroup.cloneNode(true);
    newGroup.querySelectorAll("input").forEach((input) => (input.value = ""));
    vehicleList.appendChild(newGroup);
  });

  // 送出整份申請
  step2Form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 新增：把第一頁存在 sessionStorage 的資料讀回來
    const step1Data = JSON.parse(sessionStorage.getItem("step1Data") || "{}");
    const step2Data = Object.fromEntries(new FormData(step2Form).entries());

    const fullData = { ...step1Data, ...step2Data };
    console.log("送出資料：", fullData);
    alert("申請已送出（此為示範，請串接實際後端 API）");

    // 新增：送出後清掉暫存資料
    sessionStorage.removeItem("step1Data");
  });
});
sessionStorage.setItem(
    "registrationData",
    JSON.stringify(fullData)
);

window.location.href = "success.html";
