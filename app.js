function getWeather() {
    const city = document.getElementById('city-input').value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    showLoading();
    hideError();
    hideWeatherInfo();

    // Use a working API key - you'll need to replace this with your own
    const apiKey = 'f466f632dbc88caf0663639a4527be0b'; // You need to get this from OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('City not found. Please check the spelling.');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please try again later.');
                } else {
                    throw new Error('Weather service unavailable. Please try again.');
                }
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            displayWeather(data);
            generateFarmingRecommendations(data);
        })
        .catch(error => {
            hideLoading();
            showError(error.message);
            console.error('Error:', error);
        });
}

function displayWeather(data) {
    // Update main weather information
    document.getElementById('city-name').textContent = data.name;
    document.getElementById('country').textContent = data.sys.country;
    document.getElementById('temp').textContent = Math.round(data.main.temp);
    document.getElementById('feels-like').textContent = Math.round(data.main.feels_like) + '°C';
    document.getElementById('humidity').textContent = data.main.humidity + '%';
    document.getElementById('wind-speed').textContent = data.wind.speed + ' m/s';
    document.getElementById('pressure').textContent = data.main.pressure + ' hPa';
    document.getElementById('weather-desc').textContent = data.weather[0].description;
    
    // Update weather icon
    const iconCode = data.weather[0].icon;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    document.getElementById('weather-icon').alt = data.weather[0].description;
    
    // Update additional information
    document.getElementById('sunrise').textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById('sunset').textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.getElementById('cloudiness').textContent = data.clouds.all + '%';
    document.getElementById('visibility').textContent = (data.visibility / 1000).toFixed(1) + ' km';
    
    // Estimate rainfall (OpenWeatherMap doesn't provide this in current weather)
    const rainfall = data.rain ? data.rain['1h'] || 0 : 0;
    document.getElementById('rainfall').textContent = rainfall + ' mm';

    showWeatherInfo();
}

function generateFarmingRecommendations(weatherData) {
    const temp = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const rainfall = weatherData.rain ? weatherData.rain['1h'] || 0 : 0;
    const windSpeed = weatherData.wind.speed;
    const description = weatherData.weather[0].description.toLowerCase();
    
    let recommendations = [];
    
    // Temperature-based recommendations
    if (temp < 10) {
        recommendations.push("❄️ Consider protecting sensitive crops from cold temperatures");
    } else if (temp > 30) {
        recommendations.push("☀️ High temperatures - ensure adequate irrigation for crops");
    } else {
        recommendations.push("🌡️ Optimal temperature range for most crops");
    }
    
    // Humidity-based recommendations
    if (humidity > 80) {
        recommendations.push("💧 High humidity - watch for fungal diseases and ensure proper ventilation");
    } else if (humidity < 30) {
        recommendations.push("🏜️ Low humidity - increase irrigation frequency");
    }
    
    // Rainfall-based recommendations
    if (rainfall > 5) {
        recommendations.push("🌧️ Significant rainfall - check drainage systems and postpone spraying");
    } else if (rainfall === 0 && humidity < 50) {
        recommendations.push("💦 No rainfall - irrigation recommended");
    }
    
    // Wind-based recommendations
    if (windSpeed > 5) {
        recommendations.push("💨 Windy conditions - protect young plants and consider windbreaks");
    }
    
    // General farming tips based on weather description
    if (description.includes('rain')) {
        recommendations.push("🌱 Good time for planting rain-fed crops");
    } else if (description.includes('clear') || description.includes('sunny')) {
        recommendations.push("☀️ Perfect weather for harvesting and drying crops");
    } else if (description.includes('cloud')) {
        recommendations.push("⛅ Cloudy conditions good for transplanting seedlings");
    }
    
    // Display recommendations
    const tipsContainer = document.getElementById('farming-tips');
    if (recommendations.length > 0) {
        tipsContainer.innerHTML = '<ul>' + recommendations.map(rec => `<li>${rec}</li>`).join('') + '</ul>';
    } else {
        tipsContainer.innerHTML = '<p>No specific recommendations based on current weather conditions.</p>';
    }
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showWeatherInfo() {
    document.getElementById('weather-display').classList.remove('hidden');
}

function hideWeatherInfo() {
    document.getElementById('weather-display').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Search button event
    document.getElementById('search-btn').addEventListener('click', getWeather);
    
    // Enter key in input field
    document.getElementById('city-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            getWeather();
        }
    });
    
    // Location buttons event
    document.querySelectorAll('.location-btn').forEach(button => {
        button.addEventListener('click', function() {
            const city = this.getAttribute('data-city');
            document.getElementById('city-input').value = city;
            getWeather();
        });
    });
    
    // Load default city weather on page load only if input has a value
    const initialCity = document.getElementById('city-input').value.trim();
    if (initialCity) {
        getWeather();
    }
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'login.html';
    }
}
// User Management
class DashboardManager {
    constructor() {
        this.user = null;
        this.news = [];
        this.init();
    }

    async init() {
        await this.loadUserData();
        await this.loadNews();
        this.updateUI();
        this.startAutoRefresh();
    }

    async loadUserData() {
        // Simulate API call to get user data
        try {
            const userData = await this.fetchUserData();
            this.user = userData;
        } catch (error) {
            console.error('Error loading user data:', error);
            this.user = this.getDefaultUser();
        }
    }

    async fetchUserData() {
        // Replace with actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    firstName: 'John', // This would come from your backend
                    lastName: 'Mwangi',
                    location: 'Nakuru, Kenya',
                    lastLogin: new Date().toISOString(),
                    registrationDate: '2024-01-15'
                });
            }, 500);
        });
    }

    getDefaultUser() {
        return {
            firstName: 'Farmer',
            lastName: '',
            location: 'Kenya',
            lastLogin: new Date().toISOString()
        };
    }

    async loadNews() {
        try {
            this.news = await this.fetchKenyaNews();
            this.displayNews();
        } catch (error) {
            console.error('Error loading news:', error);
            this.displayNewsError();
        }
    }

    async fetchKenyaNews() {
        // You can use NewsAPI, RSS feeds, or custom API
        // Example using a free news API (replace with your preferred source)
        const apiKey = 'YOUR_NEWS_API_KEY';
        const url = `https://newsapi.org/v2/everything?q=agriculture+kenya&sortBy=publishedAt&apiKey=${apiKey}`;
        
        // For demo purposes, return mock data
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        title: "Kenya's Agricultural Sector Shows Strong Growth in Q4 2024",
                        description: "Recent reports indicate a 15% growth in agricultural exports...",
                        source: "Business Daily",
                        publishedAt: new Date().toISOString(),
                        url: "#"
                    },
                    {
                        title: "New Irrigation Technology Revolutionizes Farming in Arid Areas",
                        description: "Innovative water-saving techniques are helping farmers...",
                        source: "Farmers Review",
                        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        url: "#"
                    },
                    {
                        title: "Government Announces New Subsidies for Small-Scale Farmers",
                        description: "The Ministry of Agriculture has launched a new program...",
                        source: "Ministry of Agriculture",
                        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                        url: "#"
                    }
                ]);
            }, 1000);
        });
    }

    updateUI() {
        this.updateWelcomeMessage();
        this.updateLocation();
        this.updateQuickStats();
    }

    updateWelcomeMessage() {
        const welcomeElement = document.getElementById('welcomeText');
        const personalizedWelcome = document.getElementById('personalizedWelcome');
        
        if (this.user) {
            const now = new Date();
            const hours = now.getHours();
            let greeting = 'Good ';
            
            if (hours < 12) greeting += 'morning';
            else if (hours < 18) greeting += 'afternoon';
            else greeting += 'evening';

            const welcomeMessage = `${greeting}, ${this.user.firstName}!`;
            welcomeElement.textContent = welcomeMessage;
            personalizedWelcome.textContent = `${greeting}, ${this.user.firstName}! Ready to manage your farm?`;
        }
    }

    updateLocation() {
        const locationElement = document.getElementById('userLocation');
        if (this.user && this.user.location) {
            locationElement.textContent = this.user.location;
        }
    }

    updateQuickStats() {
        // Update with real data from your APIs
        document.getElementById('weatherTemp').textContent = '24°C';
        document.getElementById('soilMoisture').textContent = '65%';
        document.getElementById('cropHealth').textContent = '88%';
    }

    displayNews() {
        const container = document.getElementById('newsContainer');
        const lastUpdated = document.getElementById('lastUpdated');
        
        lastUpdated.textContent = `Updated ${this.formatTime(new Date())}`;
        
        if (this.news.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📰</div>
                    <p>No news available at the moment</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.news.map(article => `
            <div class="news-item">
                <div class="news-title">${article.title}</div>
                <div class="news-description">${article.description}</div>
                <div class="news-meta">
                    <span class="news-source">${article.source}</span>
                    <span class="news-time">${this.formatTime(new Date(article.publishedAt))}</span>
                </div>
            </div>
        `).join('');
    }

    displayNewsError() {
        const container = document.getElementById('newsContainer');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>Unable to load news at the moment</p>
                <button class="btn-outline" onclick="dashboard.loadNews()">Retry</button>
            </div>
        `;
    }

    formatTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    }

    startAutoRefresh() {
        // Refresh news every 30 minutes
        setInterval(() => {
            this.loadNews();
        }, 30 * 60 * 1000);

        // Update welcome message based on time of day
        setInterval(() => {
            this.updateWelcomeMessage();
        }, 60 * 1000);
    }
}

// Initialize dashboard when page loads
const dashboard = new DashboardManager();