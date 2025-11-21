class WeatherApp {
    constructor() {
        this.apiBaseUrl = '../php/weather.php';
        this.currentWeather = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Enter key support for city input
        document.getElementById('cityInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.getWeather();
        });
    }

    async getWeather() {
        const city = document.getElementById('cityInput').value;
        if (!city.trim()) {
            this.showNotification('Please enter a city name', 'warning');
            return;
        }

        this.showLoading('weather-loading');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentWeather = data.data;
                this.displayCurrentWeather();
                this.getForecast();
                this.generateFarmingInsights();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Weather error:', error);
            this.showNotification('Failed to fetch weather data', 'error');
        } finally {
            this.hideLoading('weather-loading');
        }
    }

    displayCurrentWeather() {
        const container = document.getElementById('current-weather');
        const weather = this.currentWeather;
        
        container.innerHTML = `
            <div class="weather-current">
                <div class="weather-main">
                    <div class="weather-temp">${Math.round(weather.temperature)}°C</div>
                    <div class="weather-desc">${weather.description}</div>
                    <div class="weather-location">${weather.city}, ${weather.country}</div>
                </div>
                <div class="weather-details">
                    <div class="weather-item">
                        <span>💧 Humidity</span>
                        <span>${weather.humidity}%</span>
                    </div>
                    <div class="weather-item">
                        <span>💨 Wind</span>
                        <span>${weather.windSpeed} m/s</span>
                    </div>
                    <div class="weather-item">
                        <span>📊 Pressure</span>
                        <span>${weather.pressure} hPa</span>
                    </div>
                    <div class="weather-item">
                        <span>🌧️ Rainfall</span>
                        <span>${weather.rainfall} mm</span>
                    </div>
                </div>
            </div>
        `;
    }

    async getForecast() {
        this.showLoading('forecast-loading');
        
        // Simulate forecast data
        setTimeout(() => {
            const forecastContainer = document.getElementById('weather-forecast');
            forecastContainer.innerHTML = `
                <div class="forecast-grid">
                    ${this.generateForecastDays().map(day => `
                        <div class="forecast-day">
                            <div class="forecast-date">${day.date}</div>
                            <div class="forecast-icon">${day.icon}</div>
                            <div class="forecast-temp">${day.temp}°C</div>
                            <div class="forecast-desc">${day.desc}</div>
                            <div class="forecast-rain">💧 ${day.rain}mm</div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.hideLoading('forecast-loading');
        }, 1000);
    }

    generateFarmingInsights() {
        this.showLoading('insights-loading');
        
        setTimeout(() => {
            const insightsContainer = document.getElementById('farming-insights');
            const weather = this.currentWeather;
            
            const insights = this.analyzeWeatherForFarming(weather);
            
            insightsContainer.innerHTML = `
                <div class="insights-grid">
                    ${insights.map(insight => `
                        <div class="insight-item ${insight.type}">
                            <div class="insight-icon">${insight.icon}</div>
                            <div class="insight-content">
                                <h4>${insight.title}</h4>
                                <p>${insight.message}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.hideLoading('insights-loading');
        }, 1500);
    }

    analyzeWeatherForFarming(weather) {
        const insights = [];
        const temp = weather.temperature;
        const rain = weather.rainfall;
        const humidity = weather.humidity;

        // Temperature insights
        if (temp < 10) {
            insights.push({
                type: 'warning',
                icon: '❄️',
                title: 'Cold Weather Alert',
                message: 'Protect sensitive crops from frost damage'
            });
        } else if (temp > 30) {
            insights.push({
                type: 'warning',
                icon: '☀️',
                title: 'Heat Stress Warning',
                message: 'Increase irrigation frequency to prevent heat stress'
            });
        } else {
            insights.push({
                type: 'success',
                icon: '✅',
                title: 'Optimal Temperature',
                message: 'Perfect conditions for most crops'
            });
        }

        // Rainfall insights
        if (rain > 50) {
            insights.push({
                type: 'info',
                icon: '🌧️',
                title: 'Good Rainfall',
                message: 'Reduce irrigation, good for rain-fed crops'
            });
        } else if (rain < 10) {
            insights.push({
                type: 'warning',
                icon: '💧',
                title: 'Low Rainfall',
                message: 'Increase irrigation, consider drought-resistant crops'
            });
        }

        // Humidity insights
        if (humidity > 80) {
            insights.push({
                type: 'warning',
                icon: '🍄',
                title: 'High Humidity',
                message: 'Monitor for fungal diseases, ensure good ventilation'
            });
        }

        return insights;
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.showNotification('Location detected! Fetching weather...', 'info');
                    // In a real app, you'd reverse geocode to get city name
                    this.getWeather();
                },
                (error) => {
                    this.showNotification('Unable to get location', 'error');
                }
            );
        } else {
            this.showNotification('Geolocation not supported', 'error');
        }
    }

    generateForecastDays() {
        const days = [];
        const today = new Date();
        
        for (let i = 1; i <= 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            days.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                icon: ['🌤️', '☀️', '🌧️', '⛅', '🌦️'][i % 5],
                temp: Math.round(this.currentWeather.temperature + (Math.random() * 4 - 2)),
                desc: ['Partly Cloudy', 'Sunny', 'Light Rain', 'Cloudy', 'Showers'][i % 5],
                rain: Math.round(Math.random() * 20)
            });
        }
        
        return days;
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'block';
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'none';
    }

    showNotification(message, type) {
        // Implementation similar to previous notification system
        console.log(`${type}: ${message}`);
    }
}