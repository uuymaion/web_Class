document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step1Form = document.getElementById("step1Form");
  const step2Form = document.getElementById("step2Form");
  const backBtn = document.getElementById("backBtn");
  const addVehicleBtn = document.getElementById("addVehicleBtn");
  const vehicleList = document.getElementById("vehicleList");

  // 第一步 -> 第二步
  step1Form.addEventListener("submit", (e) => {
    e.preventDefault();
    step1.hidden = true;
    step2.hidden = false;
    window.scrollTo(0, 0);
  });

  // 第二步 -> 回到第一步
  backBtn.addEventListener("click", () => {
    step2.hidden = true;
    step1.hidden = false;
    window.scrollTo(0, 0);
  });

  // 新增一組車輛欄位
  addVehicleBtn.addEventListener("click", () => {
    const firstGroup = vehicleList.querySelector(".vehicle-group");
    const newGroup = firstGroup.cloneNode(true);
    newGroup.querySelectorAll("input").forEach((input) => (input.value = ""));
    vehicleList.appendChild(newGroup);
  });

  // 送出整份申請（示意：可換成實際串接的 API）
  step2Form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(step1Form);
    new FormData(step2Form).forEach((value, key) => formData.append(key, value));
    console.log("送出資料：", Object.fromEntries(formData.entries()));
    alert("申請已送出（此為示範，請串接實際後端 API）");
  });
});
