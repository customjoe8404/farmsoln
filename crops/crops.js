class CropApp {
    constructor() {
        this.apiBaseUrl = '../php/crop-api.php';
        this.recommendations = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-generate recommendations when parameters change
        ['location', 'soil-type', 'farm-size', 'water-availability'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                // Optional: Auto-update when parameters change
            });
        });
    }

    async getRecommendations() {
        const params = this.getFormParameters();
        
        if (!params.location.trim()) {
            this.showNotification('Please enter your location', 'warning');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'get_recommendations',
                    ...params
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.recommendations = data.data;
                this.displayRecommendations();
                this.displayCropComparison();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Crop recommendation error:', error);
            this.showNotification('Failed to get recommendations', 'error');
            this.useDemoData();
        } finally {
            this.hideLoading();
        }
    }

    getFormParameters() {
        return {
            location: document.getElementById('location').value,
            soil_type: document.getElementById('soil-type').value,
            farm_size: document.getElementById('farm-size').value,
            water_availability: document.getElementById('water-availability').value
        };
    }

    displayRecommendations() {
        const container = document.getElementById('recommendation-results');
        
        if (!this.recommendations.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <h3>No suitable crops found</h3>
                    <p>Try adjusting your farm parameters for better matches.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="recommendations-grid">
                ${this.recommendations.map((crop, index) => `
                    <div class="crop-card ${this.getSuitabilityClass(crop.suitability)}">
                        <div class="crop-rank">${this.getRankIcon(index)}</div>
                        <div class="crop-header">
                            <h3>${crop.name}</h3>
                            <span class="profit-badge ${crop.profitability > 70 ? 'high' : 'medium'}">
                                💰 ${Math.round(crop.profitability)}% ROI
                            </span>
                        </div>
                        <div class="suitability-score">${Math.round(crop.suitability)}% Match</div>
                        <div class="suitability-bar">
                            <div class="bar-fill" style="width: ${crop.suitability}%"></div>
                        </div>
                        <div class="crop-details">
                            <div class="detail-item">
                                <span>📅 Growing Period</span>
                                <span>${crop.growing_days} days</span>
                            </div>
                            <div class="detail-item">
                                <span>💧 Water Needs</span>
                                <span>${crop.water_requirement}</span>
                            </div>
                            <div class="detail-item">
                                <span>⚠️ Risk Level</span>
                                <span class="risk-${crop.risk_level}">${crop.risk_level}</span>
                            </div>
                            <div class="detail-item">
                                <span>💰 Market Price</span>
                                <span>$${crop.market_price}/kg</span>
                            </div>
                        </div>
                        ${crop.ai_insights ? `
                            <div class="ai-insight">
                                <strong>🤖 AI Insight:</strong> ${crop.ai_insights}
                            </div>
                        ` : ''}
                        <button class="btn-outline" onclick="cropApp.viewCropDetails('${crop.name}')">
                            View Details →
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayCropComparison() {
        const container = document.getElementById('crop-comparison');
        
        if (this.recommendations.length < 2) {
            container.innerHTML = '<p>Need at least 2 crops for comparison</p>';
            return;
        }

        container.innerHTML = `
            <div class="comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th>Crop</th>
                            <th>Suitability</th>
                            <th>Profitability</th>
                            <th>Risk</th>
                            <th>Water Needs</th>
                            <th>Growing Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.recommendations.slice(0, 5).map(crop => `
                            <tr>
                                <td><strong>${crop.name}</strong></td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${crop.suitability}%"></div>
                                        <span>${Math.round(crop.suitability)}%</span>
                                    </div>
                                </td>
                                <td>${Math.round(crop.profitability)}%</td>
                                <td><span class="risk-badge risk-${crop.risk_level}">${crop.risk_level}</span></td>
                                <td>${crop.water_requirement}</td>
                                <td>${crop.growing_days}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getSuitabilityClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    getRankIcon(index) {
        const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
        return icons[index] || '🌱';
    }

    viewCropDetails(cropName) {
        const crop = this.recommendations.find(c => c.name === cropName);
        if (crop) {
            this.showNotification(`Details for ${cropName}: ${crop.ai_insights}`, 'info');
        }
    }

    useDemoData() {
        this.recommendations = [
            {
                name: 'Maize',
                suitability: 85,
                profitability: 75,
                growing_days: 120,
                risk_level: 'medium',
                water_requirement: 'Medium',
                market_price: '0.35',
                ai_insights: 'Excellent match for current conditions'
            },
            {
                name: 'Beans',
                suitability: 78,
                profitability: 65,
                growing_days: 60,
                risk_level: 'low',
                water_requirement: 'Medium',
                market_price: '1.20',
                ai_insights: 'Good short-term crop with stable demand'
            }
        ];
        this.displayRecommendations();
        this.displayCropComparison();
    }

    showLoading() {
        document.getElementById('recommendation-results').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Analyzing farm conditions and generating recommendations...</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading state is replaced by content
    }

    showNotification(message, type) {
        console.log(`${type}: ${message}`);
    }
}