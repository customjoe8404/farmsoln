class MarketApp {
  constructor() {
    this.apiBaseUrl = "./market.php";
    this.config = {
      defaultRegion: "local",
      defaultCropFilter: "all",
      refreshInterval: 300000, // 5 minutes
      features: {},
    };

    this.currentRegion = this.config.defaultRegion;
    this.currentCropFilter = this.config.defaultCropFilter;
    this.priceData = [];
    this.charts = {};

    this.initializeApp();
  }

  async initializeApp() {
    await this.loadAppConfig();
    this.initializeEventListeners();
    this.loadMarketData();

    // Set up auto-refresh if feature is enabled
    if (this.config.features.real_time_data) {
      setInterval(() => {
        this.loadMarketData();
      }, this.config.refreshInterval);
    }
  }

  async loadAppConfig() {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_config",
        }),
      });

      const configData = await response.json();
      if (configData.success) {
        this.config.features = configData.feature_flags;
        this.config.appVersion = configData.app_version;
        this.config.environment = configData.app_env;

        console.log("App config loaded:", this.config);
      }
    } catch (error) {
      console.warn("Failed to load app config, using defaults:", error);
    }
  }

  initializeEventListeners() {
    // Region filter change
    const marketRegion = document.getElementById("market-region");
    if (marketRegion) {
      marketRegion.addEventListener("change", (e) => {
        this.currentRegion = e.target.value;
        this.loadMarketData();
      });
    }
    // Crop filter change
    const cropFilter = document.getElementById("crop-filter");
    if (cropFilter) {
      cropFilter.addEventListener("change", (e) => {
        this.currentCropFilter = e.target.value;
        this.loadMarketData();
      });
    }

    // Add feature-specific event listeners
    if (this.config.features.price_alerts) {
      this.initializePriceAlerts();
    }
  }

  initializePriceAlerts() {
    // Price alerts feature would be initialized here
    console.log("Price alerts feature enabled");
  }

  async loadMarketData() {
    try {
      this.showLoadingStates();

      // Load prices
      const pricesResponse = await this.fetchMarketPrices();
      if (pricesResponse.success) {
        this.priceData = pricesResponse.data;
        this.renderPriceOverview();

        // Only load trends and advice if features are enabled
        if (this.config.features.real_time_data) {
          await this.renderPriceTrends();
        }

        if (this.config.features.trading_advice) {
          const adviceResponse = await this.fetchTradingAdvice(this.priceData);
          if (adviceResponse.success) {
            this.renderTradingAdvice(adviceResponse.advice);
          }
        } else {
          this.hideTradingAdvice();
        }

        this.updateLastRefreshed();
      } else {
        this.showError(pricesResponse.error || "Failed to load market data");
      }
    } catch (error) {
      console.error("Error loading market data:", error);
      this.showError("Network error loading market data");
    }
  }

  async fetchMarketPrices() {
    const response = await fetch(this.apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get_prices",
        region: this.currentRegion,
        cropType: this.currentCropFilter,
      }),
    });

    return await response.json();
  }

  async fetchPriceTrends(symbol, period = "30days") {
    if (!this.config.features.real_time_data) {
      return { success: false, error: "Real-time data feature disabled" };
    }

    const response = await fetch(this.apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get_trends",
        symbol: symbol,
        period: period,
      }),
    });

    return await response.json();
  }

  async fetchTradingAdvice(pricesData) {
    if (!this.config.features.trading_advice) {
      return { success: false, error: "Trading advice feature disabled" };
    }

    const response = await fetch(this.apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get_advice",
        pricesData: pricesData,
      }),
    });

    return await response.json();
  }

  renderPriceOverview() {
    const container = document.getElementById("price-overview");
    if (!container) return;
    if (this.priceData.length === 0) {
      container.innerHTML =
        '<div class="no-data">No market data available</div>';
      return;
    }
    const html = `
            <div class="prices-grid">
                ${this.priceData
                  .map(
                    (commodity) => `
                    <div class="price-card ${
                      commodity.change >= 0 ? "price-up" : "price-down"
                    }">
                        <div class="commodity-header">
                            <h3>${commodity.name}</h3>
                            <span class="symbol">${commodity.commodity}</span>
                            ${
                              commodity.source === "mock_data"
                                ? '<span class="mock-badge">Demo</span>'
                                : ""
                            }
                        </div>
                        <div class="price-main">
                            <div class="current-price">$${commodity.regional_price.toFixed(
                              2
                            )}</div>
                            <div class="price-change ${
                              commodity.change >= 0 ? "positive" : "negative"
                            }">
                                ${commodity.change >= 0 ? "↗" : "↘"} 
                                ${Math.abs(commodity.change).toFixed(
                                  2
                                )} (${Math.abs(
                      commodity.change_percent
                    ).toFixed(2)}%)
                            </div>
                        </div>
                        <div class="price-meta">
                            <span class="volume">Vol: ${commodity.volume.toLocaleString()}</span>
                            <span class="source">${
                              commodity.source === "alpha_vantage"
                                ? "Live"
                                : "Demo"
                            }</span>
                        </div>
                        <div class="region-info">
                            <small>Region: ${commodity.region} (${
                      commodity.multiplier_applied
                    }x)</small>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            ${
              this.priceData.some((item) => item.source === "mock_data")
                ? '<div class="demo-notice"><small>⚠️ Some data is simulated for demonstration</small></div>'
                : ""
            }
        `;

    container.innerHTML = html;
  }

  async renderPriceTrends() {
    const container = document.getElementById("price-trends");
    if (!container) return;
    if (this.priceData.length > 0) {
      const mainCommodity = this.priceData[0];
      const selectorHtml = `
                <div class="trends-header">
                    <div class="trend-controls">
                        <select id="trend-commodity-select" class="trend-selector">
                            ${this.priceData
                              .map(
                                (commodity) =>
                                  `<option value="${commodity.commodity}">${commodity.name}</option>`
                              )
                              .join("")}
                        </select>
                        <div class="trend-periods">
                            <button class="period-btn active" data-period="7days">7D</button>
                            <button class="period-btn" data-period="30days">30D</button>
                            <button class="period-btn" data-period="90days">90D</button>
                        </div>
                    </div>
                    ${
                      !this.config.features.real_time_data
                        ? '<div class="feature-disabled">Trend analysis disabled</div>'
                        : ""
                    }
                </div>
                <div class="chart-container">
                    <canvas id="priceTrendChart"></canvas>
                </div>
            `;
      container.innerHTML = selectorHtml;
      if (this.config.features.real_time_data) {
        await this.loadTrendChart(mainCommodity.commodity);
        // Add event listeners for trend controls
        const trendCommoditySelect = document.getElementById(
          "trend-commodity-select"
        );
        if (trendCommoditySelect) {
          trendCommoditySelect.addEventListener("change", (e) => {
            this.loadTrendChart(e.target.value);
          });
        }
        document.querySelectorAll(".period-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            document
              .querySelectorAll(".period-btn")
              .forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");
            const trendCommoditySelect = document.getElementById(
              "trend-commodity-select"
            );
            if (trendCommoditySelect) {
              this.loadTrendChart(
                trendCommoditySelect.value,
                e.target.dataset.period
              );
            }
          });
        });
      }
    } else {
      container.innerHTML =
        '<div class="no-data">No data available for trends</div>';
    }
  }

  async loadTrendChart(symbol, period = "30days") {
    if (!this.config.features.real_time_data) return;

    const response = await this.fetchPriceTrends(symbol, period);

    if (response.success) {
      this.renderChart(response.trends, symbol);
    } else {
      document.getElementById("price-trends").innerHTML +=
        '<div class="error-state"><p>Failed to load trends: ' +
        response.error +
        "</p></div>";
    }
  }

  // Display loading placeholders while data is being fetched
  showLoadingStates() {
    const priceOverview = document.getElementById("price-overview");
    const priceTrends = document.getElementById("price-trends");
    const tradingAdvice = document.getElementById("trading-advice");

    if (priceOverview)
      priceOverview.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading market data...</p>
            </div>
        `;

    if (priceTrends)
      priceTrends.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Analyzing market trends...</p>
            </div>
        `;

    if (tradingAdvice)
      tradingAdvice.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Generating trading recommendations...</p>
            </div>
        `;
  }

  // Generic UI error renderer for market page
  showError(message) {
    const priceOverview = document.getElementById("price-overview");
    const priceTrends = document.getElementById("price-trends");
    const tradingAdvice = document.getElementById("trading-advice");

    const errHtml = `<div class="error-state"><p>${message}</p></div>`;
    if (priceOverview) priceOverview.innerHTML = errHtml;
    if (priceTrends) priceTrends.innerHTML = errHtml;
    if (tradingAdvice) tradingAdvice.innerHTML = errHtml;
  }

  // Render simple trading advice list
  renderTradingAdvice(advice) {
    const container = document.getElementById("trading-advice");
    if (!container) return;
    if (!advice || advice.length === 0) {
      container.innerHTML = `<div class="no-data">No trading advice available</div>`;
      return;
    }

    const html = `
            <div class="advice-list">
                ${advice
                  .map(
                    (a) => `
                    <div class="advice-item">
                        <div class="advice-title">${
                          a.title || a.symbol || "Advice"
                        }</div>
                        <div class="advice-body">${
                          a.text || a.recommendation || "-"
                        }</div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;

    container.innerHTML = html;
  }

  // Very small fallback chart renderer using canvas 2D if Chart.js is not present
  renderChart(trends, symbol) {
    const canvas = document.getElementById("priceTrendChart");
    const container = document.getElementById("price-trends");
    if (!container) return;
    if (!canvas) {
      container.innerHTML += `<div class="no-data">No chart canvas available</div>`;
      return;
    }

    // Normalize trends to array of numbers
    let values = [];
    if (!trends) trends = [];
    if (Array.isArray(trends)) {
      values = trends
        .map((t) => {
          if (typeof t === "number") return t;
          if (t && typeof t.value !== "undefined") return Number(t.value);
          if (t && typeof t.close !== "undefined") return Number(t.close);
          return NaN;
        })
        .filter((v) => !Number.isNaN(v));
    }

    const ctx = canvas.getContext("2d");
    // clear canvas
    canvas.width = canvas.clientWidth || 600;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (values.length === 0) {
      ctx.fillStyle = "#666";
      ctx.font = "14px sans-serif";
      ctx.fillText("No trend data available", 10, 30);
      return;
    }

    // draw simple line
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const padding = 20;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;

    ctx.strokeStyle = "#2b7a78";
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padding + (i / (values.length - 1)) * w;
      const y = padding + h - ((v - min) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // draw symbol label
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.fillText(symbol || "Trend", 10, canvas.height - 6);
  }

  // Simple wrapper to trigger a manual refresh from UI
  refreshData() {
    this.loadMarketData();
  }

  hideTradingAdvice() {
    const container = document.getElementById("trading-advice");
    container.innerHTML = `
            <div class="feature-disabled">
                <h3>💡 Trading Advice</h3>
                <p>Trading advice feature is currently disabled.</p>
                <small>Enable this feature in configuration to get AI-powered trading recommendations.</small>
            </div>
        `;
  }

  updateLastRefreshed() {
    // Update last refreshed timestamp in UI
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    // You can add this to your header or create a status element
    console.log(`Market data last refreshed: ${timeString}`);
  }

  // ... rest of the methods from previous implementation
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  window.marketApp = new MarketApp();
});
