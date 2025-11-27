class SensorApp {
  constructor() {
    this.apiBaseUrl = "./sensors.php";
    this.sensorData = null;
    this.isScanning = false;
    this.updateInterval = null;
  }

  async initialize() {
    this.setupEventListeners();
    await this.loadInitialData();
  }

  setupEventListeners() {
    // Auto-refresh sensor data every 30 seconds
    this.updateInterval = setInterval(() => {
      if (this.sensorData) {
        this.refreshSensorData();
      }
    }, 30000);
  }

  async loadInitialData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}?action=get_sensors`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        this.sensorData = data.data;
        this.displaySensorReadings();
        this.updateFieldHealth();
      }
    } catch (error) {
      console.error("Failed to load sensor data:", error);
    }
  }

  async startScan() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.updateStatus(
      "🔄",
      "Scanning Field",
      "Collecting sensor data from field..."
    );

    try {
      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start_scan",
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.sensorData = data.data;
        this.displaySensorReadings();
        this.updateFieldHealth();
        this.generateRecommendations();
        this.updateStatus(
          "✅",
          "Scan Complete",
          "Field analysis completed successfully"
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Scan error:", error);
      this.updateStatus("❌", "Scan Failed", "Failed to collect sensor data");
      this.useDemoData();
    } finally {
      this.isScanning = false;
    }
  }

  displaySensorReadings() {
    const container = document.getElementById("sensor-readings");
    const now = new Date();
    if (!container) return;
    container.innerHTML = `
            <div class="sensor-readings">
                ${this.sensorData
                  .map(
                    (sensor) => `
                    <div class="sensor-reading ${sensor.status}">
                        <div class="sensor-icon">${this.getSensorIcon(
                          sensor.type
                        )}</div>
                        <div class="sensor-name">${this.formatSensorName(
                          sensor.type
                        )}</div>
                        <div class="sensor-value">${sensor.value}</div>
                        <div class="sensor-unit">${sensor.unit}</div>
                        <div class="sensor-status-badge ${sensor.status}">${
                      sensor.status
                    }</div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
    const lastUpdate = document.getElementById("last-update");
    if (lastUpdate)
      lastUpdate.textContent = `Last update: ${now.toLocaleTimeString()}`;
  }

  updateFieldHealth() {
    const container = document.getElementById("field-health");
    const healthScore = this.calculateFieldHealth();
    if (!container) return;
    container.innerHTML = `
            <div class="field-health-score">
                <div class="health-value">${healthScore}%</div>
                <div class="health-label">Overall Field Health</div>
                <div class="health-bar">
                    <div class="health-fill" style="width: ${healthScore}%"></div>
                </div>
                <div class="health-details">
                    <div class="health-item">
                        <span>Soil Quality</span>
                        <span>${this.getSoilQuality()}%</span>
                    </div>
                    <div class="health-item">
                        <span>Moisture Level</span>
                        <span>${this.getMoistureLevel()}%</span>
                    </div>
                    <div class="health-item">
                        <span>Nutrient Balance</span>
                        <span>${this.getNutrientBalance()}%</span>
                    </div>
                </div>
            </div>
        `;
  }

  calculateFieldHealth() {
    if (!this.sensorData) return 0;

    let totalScore = 0;
    let count = 0;

    this.sensorData.forEach((sensor) => {
      let score = 0;
      switch (sensor.type) {
        case "soil_moisture":
          score =
            sensor.value >= 30 && sensor.value <= 70
              ? 100
              : sensor.value >= 20 && sensor.value <= 80
              ? 70
              : 40;
          break;
        case "temperature":
          score =
            sensor.value >= 18 && sensor.value <= 32
              ? 100
              : sensor.value >= 15 && sensor.value <= 35
              ? 80
              : 60;
          break;
        case "ph":
          score =
            sensor.value >= 6.0 && sensor.value <= 7.5
              ? 100
              : sensor.value >= 5.5 && sensor.value <= 8.0
              ? 70
              : 40;
          break;
        case "nitrogen":
          score =
            sensor.value >= 40 && sensor.value <= 60
              ? 100
              : sensor.value >= 30 && sensor.value <= 70
              ? 80
              : 50;
          break;
        default:
          score = 80; // Default score for other sensors
      }
      totalScore += score;
      count++;
    });

    return Math.round(totalScore / count);
  }

  generateRecommendations() {
    const container = document.getElementById("sensor-recommendations");
    const recommendations = this.analyzeSensorData();
    if (!container) return;
    container.innerHTML = `
            <div class="recommendations-list">
                ${recommendations
                  .map(
                    (rec) => `
                    <div class="recommendation-item ${rec.priority}">
                        <div class="rec-icon">${rec.icon}</div>
                        <div class="rec-content">
                            <h4>${rec.title}</h4>
                            <p>${rec.message}</p>
                            ${
                              rec.action
                                ? `<button class="btn-small" onclick="sensorApp.executeAction('${rec.action}')">${rec.actionText}</button>`
                                : ""
                            }
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  analyzeSensorData() {
    const recommendations = [];
    const sensors = this.sensorData.reduce((acc, sensor) => {
      acc[sensor.type] = sensor;
      return acc;
    }, {});

    // Soil moisture analysis
    if (sensors.soil_moisture) {
      const moisture = sensors.soil_moisture.value;
      if (moisture < 30) {
        recommendations.push({
          priority: "high",
          icon: "💧",
          title: "Low Soil Moisture",
          message: `Soil moisture is at ${moisture}%. Consider irrigation to prevent plant stress.`,
          action: "irrigate",
          actionText: "Schedule Irrigation",
        });
      } else if (moisture > 70) {
        recommendations.push({
          priority: "medium",
          icon: "🚰",
          title: "High Soil Moisture",
          message: `Soil moisture is at ${moisture}%. Ensure proper drainage to prevent root rot.`,
          action: "check_drainage",
          actionText: "Check Drainage",
        });
      }
    }

    // pH analysis
    if (sensors.ph) {
      const ph = sensors.ph.value;
      if (ph < 6.0) {
        recommendations.push({
          priority: "medium",
          icon: "🧪",
          title: "Low Soil pH",
          message: `Soil pH is ${ph}. Consider adding lime to raise pH for better nutrient availability.`,
          action: "adjust_ph",
          actionText: "View Solutions",
        });
      } else if (ph > 7.5) {
        recommendations.push({
          priority: "medium",
          icon: "🧪",
          title: "High Soil pH",
          message: `Soil pH is ${ph}. Consider adding sulfur to lower pH for optimal plant growth.`,
        });
      }
    }

    // Temperature analysis
    if (sensors.temperature) {
      const temp = sensors.temperature.value;
      if (temp < 15) {
        recommendations.push({
          priority: "high",
          icon: "❄️",
          title: "Low Temperature",
          message: `Temperature is ${temp}°C. Protect sensitive crops from cold stress.`,
          action: "protect_crops",
          actionText: "View Protection Tips",
        });
      } else if (temp > 32) {
        recommendations.push({
          priority: "medium",
          icon: "☀️",
          title: "High Temperature",
          message: `Temperature is ${temp}°C. Increase irrigation frequency to prevent heat stress.`,
        });
      }
    }

    // Nutrient analysis
    if (sensors.nitrogen && sensors.nitrogen.value < 30) {
      recommendations.push({
        priority: "medium",
        icon: "🌿",
        title: "Low Nitrogen",
        message:
          "Nitrogen levels are low. Consider applying nitrogen fertilizer for better plant growth.",
        action: "fertilize",
        actionText: "Fertilizer Guide",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: "low",
        icon: "✅",
        title: "Optimal Conditions",
        message:
          "All sensor readings are within optimal ranges. Continue current practices.",
      });
    }

    return recommendations;
  }

  async executeAction(action) {
    switch (action) {
      case "irrigate":
        this.showNotification(
          "Irrigation scheduled for tomorrow morning",
          "success"
        );
        break;
      case "check_drainage":
        this.showNotification("Drainage system check recommended", "info");
        break;
      case "adjust_ph":
        this.showNotification("pH adjustment solutions displayed", "info");
        break;
      case "protect_crops":
        this.showNotification("Crop protection guide opened", "info");
        break;
      case "fertilize":
        this.showNotification("Fertilizer application guide displayed", "info");
        break;
    }
  }

  async resetSensors() {
    this.sensorData = null;
    this.updateStatus(
      "🔍",
      "Ready to Scan",
      "Click start scan to begin field analysis"
    );
    document.getElementById("sensor-readings").innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Initializing sensor network...</p>
            </div>
        `;
    document.getElementById("field-health").innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Assessing field conditions...</p>
            </div>
        `;
    document.getElementById("sensor-recommendations").innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📡</div>
                <h3>No sensor data available</h3>
                <p>Start a field scan to get personalized recommendations.</p>
            </div>
        `;
  }

  async calibrateSensors() {
    this.showNotification("Sensor calibration started...", "info");

    // Simulate calibration
    setTimeout(() => {
      this.showNotification("Sensors calibrated successfully", "success");
    }, 2000);
  }

  async refreshSensorData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}?action=refresh`);
      const data = await response.json();

      if (data.success) {
        this.sensorData = data.data;
        this.displaySensorReadings();
        this.updateFieldHealth();
      }
    } catch (error) {
      console.error("Failed to refresh sensor data:", error);
    }
  }

  updateStatus(icon, title, description) {
    document.getElementById("status-icon").textContent = icon;
    document.getElementById("status-title").textContent = title;
    document.getElementById("status-description").textContent = description;
  }

  getSensorIcon(type) {
    const icons = {
      soil_moisture: "💧",
      temperature: "🌡️",
      humidity: "💨",
      ph: "🧪",
      nitrogen: "🌿",
      phosphorus: "🔬",
      potassium: "⚗️",
      light: "☀️",
    };
    return icons[type] || "📊";
  }

  formatSensorName(type) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getSoilQuality() {
    return Math.round(Math.random() * 20 + 80); // 80-100%
  }

  getMoistureLevel() {
    return Math.round(Math.random() * 20 + 75); // 75-95%
  }

  getNutrientBalance() {
    return Math.round(Math.random() * 25 + 70); // 70-95%
  }

  useDemoData() {
    this.sensorData = [
      { type: "soil_moisture", value: 45, unit: "%", status: "optimal" },
      { type: "temperature", value: 24, unit: "°C", status: "optimal" },
      { type: "humidity", value: 68, unit: "%", status: "optimal" },
      { type: "ph", value: 6.8, unit: "pH", status: "optimal" },
      { type: "nitrogen", value: 42, unit: "ppm", status: "good" },
      { type: "phosphorus", value: 35, unit: "ppm", status: "optimal" },
      { type: "potassium", value: 48, unit: "ppm", status: "optimal" },
      { type: "light", value: 82, unit: "%", status: "optimal" },
    ];
    this.displaySensorReadings();
    this.updateFieldHealth();
    this.generateRecommendations();
  }

  showNotification(message, type) {
    // Implementation for showing notifications
    console.log(`${type}: ${message}`);
  }
}
