<?php
// weather.php - Weather API wrapper for frontend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/config.php';

$response = ['success' => false, 'data' => null, 'error' => ''];

try {
    $city = $_GET['city'] ?? ($_POST['city'] ?? 'Nairobi');
    $city = trim($city) ?: 'Nairobi';

    // If OpenWeather API key is configured, use it
    if (defined('OPENWEATHER_API_KEY') && OPENWEATHER_API_KEY) {
        $apiKey = OPENWEATHER_API_KEY;
        $units = defined('OPENWEATHER_DEFAULT_UNITS') ? OPENWEATHER_DEFAULT_UNITS : 'metric';
        $url = "https://api.openweathermap.org/data/2.5/weather?q=" . urlencode($city) . "&units={$units}&appid={$apiKey}";

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($raw && $httpCode === 200) {
            $json = json_decode($raw, true);
            if ($json && isset($json['main'])) {
                $rain = 0;
                if (isset($json['rain'])) {
                    if (isset($json['rain']['1h'])) $rain = $json['rain']['1h'];
                    elseif (isset($json['rain']['3h'])) $rain = $json['rain']['3h'];
                }

                $data = [
                    'temperature' => $json['main']['temp'],
                    'feels_like' => $json['main']['feels_like'] ?? null,
                    'description' => ucfirst($json['weather'][0]['description'] ?? ''),
                    'city' => $json['name'] ?? $city,
                    'country' => $json['sys']['country'] ?? '',
                    'humidity' => $json['main']['humidity'] ?? null,
                    'windSpeed' => $json['wind']['speed'] ?? null,
                    'pressure' => $json['main']['pressure'] ?? null,
                    'rainfall' => $rain,
                    'source' => 'openweather'
                ];

                $response['success'] = true;
                $response['data'] = $data;
                echo json_encode($response);
                exit;
            }
        }
        // If call failed, fall through to demo data below
    }

    // If no OpenWeather key or call failed, try a free public fallback (Nominatim + Open-Meteo)
    try {
        // Geocode city -> lat/lon using OpenStreetMap Nominatim (no API key)
        $geoUrl = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" . urlencode($city);
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $geoUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_USERAGENT => 'farmsoln/1.0 (+https://example.com)'
        ]);
        $geoRaw = curl_exec($ch);
        $geoCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($geoRaw && $geoCode === 200) {
            $geoJson = json_decode($geoRaw, true);
            if (is_array($geoJson) && count($geoJson) > 0) {
                $lat = $geoJson[0]['lat'];
                $lon = $geoJson[0]['lon'];

                // Query Open-Meteo (free) for current weather and hourly humidity/precipitation
                $meteoUrl = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current_weather=true&hourly=relativehumidity_2m,precipitation&timezone=UTC";
                $ch2 = curl_init();
                curl_setopt_array($ch2, [
                    CURLOPT_URL => $meteoUrl,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 8,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                $meteoRaw = curl_exec($ch2);
                $meteoCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
                curl_close($ch2);

                if ($meteoRaw && $meteoCode === 200) {
                    $mjson = json_decode($meteoRaw, true);
                    if ($mjson && isset($mjson['current_weather'])) {
                        $cw = $mjson['current_weather'];
                        // try to map humidity and precipitation from hourly arrays using the current timestamp
                        $time = $cw['time'] ?? null;
                        $humidity = null;
                        $precip = null;
                        if (!empty($time) && isset($mjson['hourly']) && isset($mjson['hourly']['time'])) {
                            $idx = array_search($time, $mjson['hourly']['time']);
                            if ($idx !== false) {
                                if (isset($mjson['hourly']['relativehumidity_2m'][$idx])) {
                                    $humidity = $mjson['hourly']['relativehumidity_2m'][$idx];
                                }
                                if (isset($mjson['hourly']['precipitation'][$idx])) {
                                    $precip = $mjson['hourly']['precipitation'][$idx];
                                }
                            }
                        }

                        // map Open-Meteo weathercode to simple description (basic mapping)
                        $wc = $cw['weathercode'] ?? null;
                        $desc = 'Unknown';
                        $codeMap = [
                            0 => 'Clear sky',
                            1 => 'Mainly clear',
                            2 => 'Partly cloudy',
                            3 => 'Overcast',
                            45 => 'Fog',
                            48 => 'Depositing rime fog',
                            51 => 'Light drizzle',
                            53 => 'Moderate drizzle',
                            55 => 'Dense drizzle',
                            61 => 'Slight rain',
                            63 => 'Moderate rain',
                            65 => 'Heavy rain',
                            80 => 'Light rain showers',
                            81 => 'Moderate rain showers',
                            82 => 'Violent rain showers'
                        ];
                        if ($wc !== null && isset($codeMap[$wc])) $desc = $codeMap[$wc];

                        $data = [
                            'temperature' => $cw['temperature'] ?? null,
                            'feels_like' => null,
                            'description' => $desc,
                            'city' => $geoJson[0]['display_name'] ?? $city,
                            'country' => $geoJson[0]['display_name'] ?? '',
                            'humidity' => $humidity,
                            'windSpeed' => $cw['windspeed'] ?? null,
                            'pressure' => null,
                            'rainfall' => $precip,
                            'source' => 'open-meteo'
                        ];

                        $response['success'] = true;
                        $response['data'] = $data;
                        echo json_encode($response);
                        exit;
                    }
                }
            }
        }
    } catch (Exception $e) {
        // ignore and fall through to demo
    }

    // Fallback: return simulated demo weather data
    $demo = [
        'temperature' => 24 + rand(-3, 3),
        'feels_like' => 24,
        'description' => 'Partly Cloudy',
        'city' => $city,
        'country' => 'KE',
        'humidity' => rand(50, 85),
        'windSpeed' => rand(1, 6),
        'pressure' => rand(1000, 1025),
        'rainfall' => rand(0, 20),
        'source' => 'demo'
    ];

    $response['success'] = true;
    $response['data'] = $demo;
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);
