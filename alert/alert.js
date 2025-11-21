class AlertsApp {
    constructor() {
        this.apiBaseUrl = '../php/alerts-api.php';
        this.alerts = [];
        this.filteredAlerts = [];
        this.currentFilter = 'all';
        this.updateInterval = null;
    }

    async initialize() {
        await this.loadAlerts();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Auto-refresh alerts every 2 minutes
        this.updateInterval = setInterval(() => {
            this.checkAlerts();
        }, 120000);
    }

    startAutoRefresh() {
        // Simulate real-time alert updates
        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance of new alert
                this.simulateNewAlert();
            }
        }, 30000);
    }

    async loadAlerts() {
        try {
            const response = await fetch(`${this.apiBaseUrl}?action=get_alerts`);
            const data = await response.json();
            
            if (data.success) {
                this.alerts = data.data;
            } else {
                // Load demo data
                this.loadDemoAlerts();
            }
        } catch (error) {
            console.error('Failed to load alerts:', error);
            this.loadDemoAlerts();
        }
        
        this.filterAlerts(this.currentFilter);
        this.updateStats();
    }

    async checkAlerts() {
        this.showNotification('Checking for new alerts...', 'info');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}?action=check_alerts`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                // Add new alerts
                data.data.forEach(newAlert => {
                    if (!this.alerts.find(alert => alert.id === newAlert.id)) {
                        this.alerts.unshift(newAlert);
                        this.showNotification(`New alert: ${newAlert.title}`, 'warning');
                    }
                });
                
                this.filterAlerts(this.currentFilter);
                this.updateStats();
                this.showNotification('New alerts checked', 'success');
            }
        } catch (error) {
            console.error('Failed to check alerts:', error);
            this.simulateNewAlert();
        }
    }

    filterAlerts(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        switch(filter) {
            case 'critical':
                this.filteredAlerts = this.alerts.filter(alert => alert.severity === 'critical' && !alert.resolved);
                break;
            case 'warning':
                this.filteredAlerts = this.alerts.filter(alert => alert.severity === 'warning' && !alert.resolved);
                break;
            case 'info':
                this.filteredAlerts = this.alerts.filter(alert => alert.severity === 'info' && !alert.resolved);
                break;
            case 'resolved':
                this.filteredAlerts = this.alerts.filter(alert => alert.resolved);
                break;
            case 'unread':
                this.filteredAlerts = this.alerts.filter(alert => !alert.read);
                break;
            default:
                this.filteredAlerts = this.alerts;
        }

        this.displayAlerts();
    }

    displayAlerts() {
        const container = document.getElementById('alerts-list');
        
        if (this.filteredAlerts.length === 0) {
            container.innerHTML = `
                <div class="empty-alerts">
                    <div class="empty-icon">✅</div>
                    <h3>No Alerts Found</h3>
                    <p>All clear! No ${this.currentFilter === 'all' ? '' : this.currentFilter} alerts at the moment.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredAlerts.map(alert => `
            <div class="alert-item ${alert.severity} ${alert.read ? 'read' : 'unread'}">
                <div class="alert-icon">${this.getAlertIcon(alert.severity)}</div>
                <div class="alert-content">
                    <div class="alert-header">
                        <h3 class="alert-title">${alert.title}</h3>
                        <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
                    </div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-actions">
                        <button onclick="alertsApp.markAsRead(${alert.id})" class="btn-primary btn-small">
                            ${alert.read ? '✓ Read' : 'Mark Read'}
                        </button>
                        ${!alert.resolved ? `
                            <button onclick="alertsApp.resolveAlert(${alert.id})" class="btn-outline btn-small">
                                Resolve
                            </button>
                        ` : ''}
                        <button onclick="alertsApp.viewDetails(${alert.id})" class="btn-outline btn-small">
                            Details
                        </button>
                    </div>
                </div>
                <div class="alert-source">${alert.source}</div>
            </div>
        `).join('');
    }

    updateStats() {
        const critical = this.alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
        const warning = this.alerts.filter(a => a.severity === 'warning' && !a.resolved).length;
        const info = this.alerts.filter(a => a.severity === 'info' && !a.resolved).length;
        const resolved = this.alerts.filter(a => a.resolved).length;

        document.getElementById('critical-count').textContent = critical;
        document.getElementById('warning-count').textContent = warning;
        document.getElementById('info-count').textContent = info;
        document.getElementById('resolved-count').textContent = resolved;
    }

    async markAsRead(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.read = true;
            
            try {
                await fetch(this.apiBaseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'mark_read',
                        alert_id: alertId
                    })
                });
            } catch (error) {
                console.error('Failed to mark alert as read:', error);
            }
            
            this.filterAlerts(this.currentFilter);
            this.updateStats();
        }
    }

    async resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.read = true;
            
            try {
                await fetch(this.apiBaseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'resolve_alert',
                        alert_id: alertId
                    })
                });
            } catch (error) {
                console.error('Failed to resolve alert:', error);
            }
            
            this.filterAlerts(this.currentFilter);
            this.updateStats();
            this.showNotification('Alert resolved successfully', 'success');
        }
    }

    async markAllAsRead() {
        this.alerts.forEach(alert => {
            alert.read = true;
        });
        
        try {
            await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'mark_all_read'
                })
            });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
        
        this.filterAlerts(this.currentFilter);
        this.updateStats();
        this.showNotification('All alerts marked as read', 'success');
    }

    async clearResolved() {
        this.alerts = this.alerts.filter(alert => !alert.resolved);
        
        try {
            await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'clear_resolved'
                })
            });
        } catch (error) {
            console.error('Failed to clear resolved alerts:', error);
        }
        
        this.filterAlerts(this.currentFilter);
        this.updateStats();
        this.showNotification('Resolved alerts cleared', 'success');
    }

    viewDetails(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            this.showNotification(`Alert details: ${alert.title} - ${alert.message}`, 'info');
        }
    }

    getAlertIcon(severity) {
        const icons = {
            'critical': '🚨',
            'warning': '⚠️',
            'info': 'ℹ️',
            'success': '✅'
        };
        return icons[severity] || '📢';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    loadDemoAlerts() {
        this.alerts = [
            {
                id: 1,
                title: 'Low Soil Moisture Detected',
                message: 'Soil moisture levels in the north field have dropped to 25%. Consider irrigation to prevent plant stress.',
                severity: 'warning',
                source: 'Soil Sensor #1',
                timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
                read: false,
                resolved: false
            },
            {
                id: 2,
                title: 'Temperature Alert',
                message: 'High temperatures (35°C) expected tomorrow. Prepare irrigation system and consider shade for sensitive crops.',
                severity: 'warning',
                source: 'Weather Forecast',
                timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
                read: true,
                resolved: false
            },
            {
                id: 3,
                title: 'Pest Detection - Aphids',
                message: 'Aphid infestation detected in tomato crops. Monitor closely and consider organic pest control measures.',
                severity: 'critical',
                source: 'Crop Health Monitor',
                timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
                read: false,
                resolved: false
            },
            {
                id: 4,
                title: 'Irrigation System Check',
                message: 'Scheduled maintenance for irrigation system due next week. Please inspect and service the system.',
                severity: 'info',
                source: 'Maintenance Schedule',
                timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
                read: true,
                resolved: false
            },
            {
                id: 5,
                title: 'Market Price Increase',
                message: 'Tomato prices have increased by 15% in the local market. Good time to consider harvesting and selling.',
                severity: 'info',
                source: 'Market Intelligence',
                timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
                read: true,
                resolved: true
            }
        ];
    }

    simulateNewAlert() {
        const alertTypes = [
            {
                title: 'Rain Forecast',
                message: 'Heavy rainfall (50mm) expected in 24 hours. Ensure proper drainage and protect sensitive crops.',
                severity: 'warning',
                source: 'Weather Service'
            },
            {
                title: 'Nutrient Deficiency',
                message: 'Low nitrogen levels detected in soil analysis. Consider fertilizer application for optimal growth.',
                severity: 'warning',
                source: 'Soil Analysis'
            },
            {
                title: 'Equipment Maintenance',
                message: 'Tractor #2 requires scheduled maintenance. Please service within the next 7 days.',
                severity: 'info',
                source: 'Equipment Manager'
            }
        ];

        const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const newAlert = {
            id: Date.now(),
            ...randomAlert,
            timestamp: new Date().toISOString(),
            read: false,
            resolved: false
        };

        this.alerts.unshift(newAlert);
        this.filterAlerts(this.currentFilter);
        this.updateStats();
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🌱 Aeterna Alert: ${newAlert.title}`, {
                body: newAlert.message,
                icon: '/favicon.ico'
            });
        }
    }

    showNotification(message, type) {
        console.log(`${type}: ${message}`);
    }
}