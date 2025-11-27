// UI update helpers for weather and dashboard
function updateWeatherUI(data) {
  const cityName = document.getElementById("city-name");
  if (cityName) cityName.textContent = data.name;
  const country = document.getElementById("country");
  if (country) country.textContent = data.sys.country;
  const temp = document.getElementById("temp");
  if (temp) temp.textContent = Math.round(data.main.temp);
  const feelsLike = document.getElementById("feels-like");
  if (feelsLike)
    feelsLike.textContent = Math.round(data.main.feels_like) + "°C";
  const humidity = document.getElementById("humidity");
  if (humidity) humidity.textContent = data.main.humidity + "%";
  const windSpeed = document.getElementById("wind-speed");
  if (windSpeed) windSpeed.textContent = data.wind.speed + " m/s";
  const pressure = document.getElementById("pressure");
  if (pressure) pressure.textContent = data.main.pressure + " hPa";
  const weatherDesc = document.getElementById("weather-desc");
  if (weatherDesc) weatherDesc.textContent = data.weather[0].description;
  const iconCode = data.weather[0].icon;
  const weatherIcon = document.getElementById("weather-icon");
  if (weatherIcon) {
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = data.weather[0].description;
  }
  const rainfall = data.rain ? data.rain["1h"] || 0 : 0;
  const rainfallElem = document.getElementById("rainfall");
  if (rainfallElem) rainfallElem.textContent = rainfall + " mm";
  showWeatherInfo();
}

function updateFarmingTips(recommendations) {
  const tipsContainer = document.getElementById("farming-tips");
  if (tipsContainer) {
    if (recommendations.length > 0) {
      tipsContainer.innerHTML =
        "<ul>" +
        recommendations.map((rec) => `<li>${rec}</li>`).join("") +
        "</ul>";
    } else {
      tipsContainer.innerHTML =
        "<p>No specific recommendations based on current weather conditions.</p>";
    }
  }
}

function showLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.classList.remove("hidden");
}

function hideLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.classList.add("hidden");
}

function showWeatherInfo() {
  const weatherDisplay = document.getElementById("weather-display");
  if (weatherDisplay) weatherDisplay.classList.remove("hidden");
}

function hideWeatherInfo() {
  const weatherDisplay = document.getElementById("weather-display");
  if (weatherDisplay) weatherDisplay.classList.add("hidden");
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
  }
}

function hideError() {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) errorDiv.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", function () {
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn)
    searchBtn.addEventListener("click", function () {
      if (typeof fetchWeatherData === "function") fetchWeatherData();
    });
  const cityInput = document.getElementById("city-input");
  if (cityInput) {
    cityInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        if (typeof fetchWeatherData === "function") fetchWeatherData();
      }
    });
  }
  document.querySelectorAll(".location-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const city = this.getAttribute("data-city");
      const cityInput = document.getElementById("city-input");
      if (cityInput) cityInput.value = city;
      if (typeof fetchWeatherData === "function") fetchWeatherData();
    });
  });
  if (cityInput && cityInput.value.trim()) {
    if (typeof fetchWeatherData === "function") fetchWeatherData();
  }
});
