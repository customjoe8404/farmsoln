-- Aeterna FarmOS Database Schema

CREATE DATABASE IF NOT EXISTS aeterna2;
USE aeterna2;

-- Users table
CREATE TABLE system_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    farm_size DECIMAL(10,2),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Alerts table
CREATE TABLE farm_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    severity ENUM('critical', 'warning', 'info', 'success') DEFAULT 'info',
    source VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
    INDEX idx_severity (severity),
    INDEX idx_created (created_at),
    INDEX idx_user_status (user_id, is_read, is_resolved)
);

-- Crop recommendations table
CREATE TABLE crop_recommendations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    crop_name VARCHAR(100) NOT NULL,
    suitability_score DECIMAL(5,2),
    profitability_score DECIMAL(5,2),
    risk_level ENUM('low', 'medium', 'high'),
    growing_days INT,
    water_requirement VARCHAR(50),
    market_price DECIMAL(8,2),
    ai_insights TEXT,
    parameters JSON, -- Stores location, soil_type, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
    INDEX idx_suitability (suitability_score),
    INDEX idx_user_crop (user_id, crop_name)
);

-- Market data table
CREATE TABLE market_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commodity VARCHAR(50) NOT NULL,
    commodity_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    change DECIMAL(8,2),
    change_percent DECIMAL(5,2),
    volume BIGINT,
    region VARCHAR(50),
    unit VARCHAR(20),
    source VARCHAR(50),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_commodity (commodity),
    INDEX idx_region (region),
    INDEX idx_recorded (recorded_at)
);

-- Crop plans table
CREATE TABLE crop_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    crop_type VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    crop_name VARCHAR(100) NOT NULL,
    planting_date DATE NOT NULL,
    harvest_date DATE,
    area DECIMAL(8,2) NOT NULL,
    duration INT,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    notes TEXT,
    tasks JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_dates (planting_date, harvest_date)
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    sensor_type VARCHAR(50) NOT NULL,
    sensor_name VARCHAR(100),
    value DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    status ENUM('optimal', 'good', 'poor', 'critical') DEFAULT 'good',
    location VARCHAR(100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE,
    INDEX idx_sensor_type (sensor_type),
    INDEX idx_recorded (recorded_at),
    INDEX idx_user_sensor (user_id, sensor_type)
);

-- Price trends table
CREATE TABLE price_trends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commodity VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_commodity_date (commodity, date),
    INDEX idx_commodity_date (commodity, date)
);

-- User settings table
CREATE TABLE user_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    preferences JSON,
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE CASCADE
);

-- Insert default data
INSERT INTO system_users (username, email, password_hash, full_name, farm_size, location) VALUES
('demo_farmer', 'demo@aeternafarm.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Farmer', 50.00, 'Nairobi');

-- Insert sample market data
INSERT INTO market_data (commodity, commodity_name, price, change, change_percent, volume, region, unit, source) VALUES
('CORN', 'Corn', 450.50, 2.25, 0.50, 154200, 'local', 'bushel', 'alpha_vantage'),
('WEAT', 'Wheat', 620.75, -5.25, -0.84, 89200, 'local', 'bushel', 'alpha_vantage'),
('SOYB', 'Soybeans', 1250.25, 15.75, 1.28, 67300, 'local', 'bushel', 'alpha_vantage');