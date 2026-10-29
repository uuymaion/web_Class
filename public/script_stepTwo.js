document.addEventListener("DOMContentLoaded", () => {
  const step2Form = document.getElementById("step2Form");
  const backBtn = document.getElementById("backBtn");
  const addVehicleBtn = document.getElementById("addVehicleBtn");
  const maxVehicle = 10;
  const vehicleList = document.getElementById("vehicleList");
  const vehicleCountEl = document.getElementById("vehicleCount");

  // 更新車輛數
  function updateCount() {
    const groups = vehicleList.querySelectorAll(".vehicle-group");
    const count = vehicleList.querySelectorAll(".vehicle-group").length;
    vehicleCountEl.textContent = count;
    groups.forEach((group, i) => {
      group.querySelector(".plate-label").textContent = `車號 ${i + 1}`;
      group.querySelector(".delete-btn").style.display = count === 1 ? "none" : "";
    });

    vehicleCountEl.textContent = count;
    addVehicleBtn.style.display = count >= maxVehicle ? "none" : "";
    // 超過十輛addVehicleBtn會"none"也就是消失
  }

  // 新增：把畫面上所有 .vehicle-group 的資料收集成陣列
  function collectVehicleData() {
    const groups = vehicleList.querySelectorAll(".vehicle-group");
    return Array.from(groups).map((group) => {
      // querySelectorAll() 是抓出所有符合條件(這邊的是css的某個選擇器，平常也可以放其他css的合法class)的元素，回傳的是 NodeList
      // 並且將NodeList轉成array

      const inputs = group.querySelectorAll("input");
      return {
        plateNo: inputs[0].value,
        driverName: inputs[1].value,
        driverPhone: inputs[2].value,
      };
    });
  }

  // 新增：把存起來的車輛陣列，還原成畫面上對應數量的 .vehicle-group，並填回值
  function restoreVehicleData(vehicles) {
    if (!vehicles || vehicles.length === 0) return;

    const firstGroup = vehicleList.querySelector(".vehicle-group");

    vehicles.forEach((vehicle, index) => {
      // 第一組沿用原本就存在的 HTML，其餘用複製的方式補齊
      let group = vehicleList.querySelectorAll(".vehicle-group")[index];
      if (!group) {
        group = firstGroup.cloneNode(true);
        group.querySelector(".plate-label").textContent = `車號 ${index + 1}`;
        vehicleList.appendChild(group);
      }
      const inputs = group.querySelectorAll("input");
      inputs[0].value = vehicle.plateNo || "";
      inputs[1].value = vehicle.driverName || "";
      inputs[2].value = vehicle.driverPhone || "";
    });
    updateCount();
  }

  // 新增：頁面載入時，檢查有沒有之前存過的車輛資料，有的話還原回畫面
  const savedStep2 = sessionStorage.getItem("step2Data");
  if (savedStep2) {
    restoreVehicleData(JSON.parse(savedStep2));
  }
  updateCount(); 

  // 修改：回到第一頁之前，先把目前 step2 的資料存起來
  backBtn.addEventListener("click", () => {
    sessionStorage.setItem("step2Data", JSON.stringify(collectVehicleData()));
    window.location.href = "stepOne.html";
  });

  // 新增一組車輛欄位（沒有變，跟原本一樣）
  addVehicleBtn.addEventListener("click", () => {
    const count = vehicleList.querySelectorAll(".vehicle-group").length;
    if(count>=maxVehicle) return;

    const firstGroup = vehicleList.querySelector(".vehicle-group");
    const newGroup = firstGroup.cloneNode(true);
    newGroup.querySelectorAll("input").forEach((input) => (input.value = ""));
    newGroup.querySelector(".plate-label").textContent = `車號 ${count + 1}`; 
    vehicleList.appendChild(newGroup);
    updateCount();
  });
  // 刪除車輛(事件委派:監聽整個 vehicleList,點到垃圾桶才處理)
  vehicleList.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    if (vehicleList.querySelectorAll(".vehicle-group").length <= 1) return;

    btn.closest(".vehicle-group").remove();
    updateCount();   // 重新編號、更新計數、＋ 號會重新出現
  });

  // 送出整份申請
  step2Form.addEventListener("submit", (e) => {
    e.preventDefault();

    const step1Data = JSON.parse(sessionStorage.getItem("step1Data") || "{}");
    // 修改：改用 collectVehicleData()，才不會漏掉多台車的資料
    const vehicles = collectVehicleData();

    const fullData = { ...step1Data, vehicles };
    console.log("送出資料：", fullData);
    alert("申請已送出");

    // 修改：送出後兩份暫存資料都要清掉
    sessionStorage.setItem("registrationData", JSON.stringify(fullData));
    sessionStorage.removeItem("step1Data");
    sessionStorage.removeItem("step2Data");
    window.location.href = "success.html";
  });
});
