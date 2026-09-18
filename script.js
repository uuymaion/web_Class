document.addEventListener("DOMContentLoaded", () => { 
  const step1Form = document.getElementById("step1Form");

  // 第一步 -> 第二步
  step1Form.addEventListener("submit", (e) => {
    e.preventDefault();

    const step1Data = Object.fromEntries(new FormData(step1Form).entries());
    sessionStorage.setItem("step1Data", JSON.stringify(step1Data));

    // 導向 stepTwo.html
    window.location.href = "stepTwo.html";
  });
});
