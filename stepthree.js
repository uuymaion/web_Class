// 取得第二頁儲存的資料

const data = JSON.parse(
    sessionStorage.getItem("registrationData") || "{}"
);


// 找到顯示車輛資料的區域

const vehicleInfo =
    document.getElementById("vehicleInfo");


// 取得車輛資料

const vehicles = data.vehicles || [];


// 一台一台顯示

vehicles.forEach((vehicle, index) => {

    const vehicleDiv =
        document.createElement("div");

    vehicleDiv.className = "vehicle-result";


    vehicleDiv.innerHTML = `
        <p>
            <strong>車輛 ${index + 1}</strong>
        </p>

        <p>
            車號：${vehicle.plateNo}
        </p>

        <p>
            駕駛人：${vehicle.driverName}
        </p>

        <p>
            手機：${vehicle.driverPhone}
        </p>
    `;


    vehicleInfo.appendChild(vehicleDiv);

});
