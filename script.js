// === 設定你的 API Key ===
const apiKey = 'd37605be856f1642a01ced648388468c'; 

// 選取 DOM 元素
const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const weatherInfo = document.getElementById('weather-info');
const cityNameEl = document.getElementById('city-name');
const tempEl = document.getElementById('temperature');
const descEl = document.getElementById('description');
const outfitTextEl = document.getElementById('outfit-text');
const weatherIconEl = document.getElementById('weather-icon');
const forecastContainer = document.getElementById('forecast-container');

// 監聽查詢按鈕
searchBtn.addEventListener('click', function() {
    let city = cityInput.value.trim();
    if (city === "") {
        alert("請輸入城市名稱喔！");
        return;
    }

    // 自動補上 ,TW 避免抓到中國同名城市 (解決桃園 6度問題)
    // 如果使用者已經打了逗號 (例如 Tokyo,JP) 就不幫他加
    if (!city.includes(',')) {
        city = city + ",TW"; 
    }

    // 使用 encodeURIComponent 處理中文網址
    const safeCity = encodeURIComponent(city);
    
    fetchCurrentWeather(safeCity, city);
    fetchForecast(safeCity);
});

// 監聽 Enter 鍵
cityInput.addEventListener('keypress', function(e){
    if(e.key === 'Enter') searchBtn.click();
});

// === 功能 1: 查詢當前天氣 ===
function fetchCurrentWeather(safeCity, displayCity) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${safeCity}&appid=${apiKey}&units=metric&lang=zh_tw`;

    searchBtn.textContent = "查詢中...";
    searchBtn.disabled = true;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("找不到城市");
            return res.json();
        })
        .then(data => {
            const temp = Math.round(data.main.temp);
            const desc = data.weather[0].description;
            const iconCode = data.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            
            // 介面顯示優化：把 ",TW" 去掉，且首字大寫
            let showName = displayCity.split(',')[0];
            showName = showName.charAt(0).toUpperCase() + showName.slice(1);

            updateCurrentUI(showName, temp, desc, iconUrl);
        })
        .catch(err => {
            console.error(err);
            alert("找不到這個城市，請確認拼字或 API Key！");
        })
        .finally(() => {
            searchBtn.textContent = "查詢 ✨";
            searchBtn.disabled = false;
        });
}

// === 功能 2: 查詢未來預報 ===
function fetchForecast(safeCity) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${safeCity}&appid=${apiKey}&units=metric&lang=zh_tw`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            // 處理資料：計算每日高低溫
            const dailyData = processForecastData(data.list);
            updateForecastUI(dailyData);
        })
        .catch(err => console.error("預報讀取失敗:", err));
}

// === 核心邏輯：把 3 小時資料整合成「天」 ===
function processForecastData(list) {
    const dailyForecasts = {};

    list.forEach(item => {
        // 取得日期 (例如 2025-11-26)
        const date = item.dt_txt.split(' ')[0];
        
        // 初始化那一天的資料物件
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                min: 100,
                max: -100,
                icon: item.weather[0].icon,
                date: date
            };
        }

        // 比較並更新高低溫
        if (item.main.temp_min < dailyForecasts[date].min) dailyForecasts[date].min = item.main.temp_min;
        if (item.main.temp_max > dailyForecasts[date].max) dailyForecasts[date].max = item.main.temp_max;

        // 優先使用接近中午 (12:00) 的天氣圖示
        if (item.dt_txt.includes("12:00:00")) {
            dailyForecasts[date].icon = item.weather[0].icon;
        }
    });

    // 只回傳前 5 天的資料
    return Object.values(dailyForecasts).slice(0, 5);
}

// === Helper: 根據溫度回傳 Emoji ===
function getOutfitEmoji(temp) {
    if (temp >= 28) return "🎽"; // 背心/短袖
    if (temp >= 23) return "👕"; // T-shirt
    if (temp >= 18) return "👔"; // 薄長袖/襯衫
    if (temp >= 12) return "🧥"; // 外套
    return "🧣"; // 圍巾/厚大衣
}

// 更新當前天氣畫面
function updateCurrentUI(name, temp, desc, iconUrl) {
    cityNameEl.textContent = name;
    tempEl.textContent = temp;
    descEl.textContent = desc;
    weatherIconEl.src = iconUrl;
    
    // 當前穿搭文字建議
    let suggestion = "";
    if (temp >= 28) suggestion = "🥵 好熱呀！穿短袖、短褲，多喝水！☀️";
    else if (temp >= 23) suggestion = "😊 舒適！穿件薄長袖或短袖配薄外套。✨";
    else if (temp >= 18) suggestion = "🌬️ 微涼～穿帽T或針織衫，搭長褲。🧣";
    else if (temp >= 12) suggestion = "🧥 變冷囉！穿厚外套、毛衣。🧤";
    else suggestion = "🥶 超級冷！羽絨外套、圍巾全副武裝！⛄";
    
    if (desc.includes("雨")) suggestion += " (記得帶傘☔)";

    outfitTextEl.textContent = suggestion;
    weatherInfo.style.display = 'block';
}

// 更新預報區塊畫面
function updateForecastUI(forecastList) {
    forecastContainer.innerHTML = ""; 

    forecastList.forEach(day => {
        const dateObj = new Date(day.date);
        const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`; // 日期格式 M/D
        
        const minTemp = Math.round(day.min);
        const maxTemp = Math.round(day.max);
        const iconUrl = `https://openweathermap.org/img/wn/${day.icon}.png`;
        
        // 取得衣服 Emoji
        const outfitEmoji = getOutfitEmoji(maxTemp);

        const cardHtml = `
            <div class="forecast-item">
                <span class="forecast-date">${dateStr}</span>
                <img src="${iconUrl}" class="forecast-icon" alt="icon">
                <div class="forecast-temp">
                    <span class="high-temp">${maxTemp}°</span> 
                    <span class="low-temp">${minTemp}°</span>
                </div>
                <div class="forecast-outfit" title="穿搭建議">${outfitEmoji}</div>
            </div>
        `;
        forecastContainer.innerHTML += cardHtml;
    });
}