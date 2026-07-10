/*
 * ============================================================
 *  ESP32 Medical Sensor Dashboard
 *  Sensors: DHT11 | IR | AD8232 ECG
 *  AI-Assisted Eye Disease Detection & Patient Monitoring
 * ============================================================
 *
 *  Wiring Summary:
 *  ---------------
 *  DHT11   → DATA : GPIO4
 *  IR      → OUT  : GPIO5
 *  AD8232  → OUTPUT : GPIO34 (ADC input, analog)
 *            LO+    : GPIO26 (digital input, lead-off detection)
 *            LO-    : GPIO27 (digital input, lead-off detection)
 *
 *  API Endpoints:
 *  ---------------
 *  GET /         → Full HTML dashboard
 *  GET /dht11    → JSON: temperature + humidity
 *  GET /irsensor → JSON: IR detection value
 *  GET /ecg      → JSON: ECG signal + lead status + connection
 * ============================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// ─── WiFi Credentials ─────────────────────────────────────
const char* ssid     = "A10s422";
const char* password = "sri422116";

// ─── DHT11 ────────────────────────────────────────────────
#define DHTPIN   4
#define DHTTYPE  DHT11
DHT dht(DHTPIN, DHTTYPE);

// ─── IR Sensor ────────────────────────────────────────────
#define IRPIN    5

// ─── AD8232 ECG ───────────────────────────────────────────
#define ECG_OUTPUT_PIN  34   // Analog output from AD8232
#define ECG_LO_PLUS     26   // Lead-Off detection LO+
#define ECG_LO_MINUS    27   // Lead-Off detection LO-

// ─── Web Server ───────────────────────────────────────────
WebServer server(80);

// ─── ECG Reading Helper ───────────────────────────────────
/*
 * Reads the AD8232 ECG sensor.
 * Returns:
 *   connected  → true if electrodes are properly attached
 *   ecgValue   → raw ADC value (0–4095) when connected, -1 if leads off
 */
struct ECGData {
  bool connected;
  int  ecgValue;
};

ECGData readECG() {
  ECGData data;
  // Always sample the raw analog signal so it can be inspected even when
  // lead-off is asserted (useful for wiring/debug).
  data.ecgValue  = analogRead(ECG_OUTPUT_PIN);
  // LO+ or LO- HIGH → leads off (electrodes disconnected)
  data.connected = !(digitalRead(ECG_LO_PLUS) == HIGH || digitalRead(ECG_LO_MINUS) == HIGH);
  return data;
}

// ─── HTML Dashboard ───────────────────────────────────────
String getHTML(float temp, float hum, int ir, ECGData ecg) {

  String irLabel   = (ir == 0) ? "DETECTED" : "CLEAR";
  String irColor   = (ir == 0) ? "#ef4444"  : "#22c55e";
  String irIcon    = (ir == 0) ? "●" : "○";

  String ecgStatus = ecg.connected ? "CONNECTED" : "LEADS OFF";
  String ecgColor  = ecg.connected ? "#22c55e"   : "#ef4444";
  String ecgValue  = ecg.connected ? String(ecg.ecgValue) : "—";
  String ecgBadge  = ecg.connected ? "LIVE" : "DISCONNECTED";
  String ecgBadgeC = ecg.connected ? "#22c55e" : "#ef4444";

  // Temperature color thresholds
  String tempColor = "#22c55e";
  if (temp > 38.0)      tempColor = "#ef4444";
  else if (temp > 37.0) tempColor = "#f59e0b";

  // Humidity color thresholds
  String humColor = "#22c55e";
  if (hum > 80 || hum < 20) humColor = "#ef4444";
  else if (hum > 70)         humColor = "#f59e0b";

  String html = R"rawhtml(<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="refresh" content="5"/>
  <title>MedSense · Patient Monitor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:        #0a0e17;
      --surface:   #111827;
      --surface2:  #1a2235;
      --border:    #1e2d45;
      --accent:    #3b82f6;
      --accent2:   #06b6d4;
      --text:      #e2e8f0;
      --muted:     #64748b;
      --green:     #22c55e;
      --red:       #ef4444;
      --orange:    #f59e0b;
      --radius:    14px;
      --glow:      0 0 24px rgba(59,130,246,0.12);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Sora', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.08) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,182,212,0.05) 0%, transparent 60%);
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      border-bottom: 1px solid var(--border);
      background: rgba(17,24,39,0.8);
      backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 10;
    }
    .logo {
      display: flex; align-items: center; gap: 12px;
    }
    .logo-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 12px var(--accent);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.5; transform: scale(0.85); }
    }
    .logo-text { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; }
    .logo-text span { color: var(--accent); }
    .header-meta {
      font-family: 'DM Mono', monospace;
      font-size: 0.7rem; color: var(--muted);
      text-align: right; line-height: 1.6;
    }
    .live-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.25);
      color: var(--green); font-size: 0.7rem; font-weight: 600;
      letter-spacing: 0.08em;
    }
    .live-badge::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: var(--green);
      animation: pulse 1.5s ease-in-out infinite;
    }

    /* ── Main Grid ── */
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .section-label {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem; color: var(--muted);
      letter-spacing: 0.15em; text-transform: uppercase;
      margin-bottom: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    /* ── Cards ── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .card:hover {
      border-color: rgba(59,130,246,0.3);
      box-shadow: var(--glow);
    }
    .card::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 60%);
      pointer-events: none;
    }

    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .card-label {
      font-size: 0.72rem; font-weight: 600;
      color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase;
    }
    .card-icon {
      font-size: 1.1rem; opacity: 0.6;
    }

    .card-value {
      font-family: 'DM Mono', monospace;
      font-size: 2.4rem; font-weight: 500;
      line-height: 1; margin-bottom: 8px;
      letter-spacing: -0.03em;
    }
    .card-unit {
      font-size: 1rem; font-weight: 400; opacity: 0.5; margin-left: 4px;
    }
    .card-status {
      font-size: 0.72rem; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      display: flex; align-items: center; gap: 6px;
      margin-top: 4px;
    }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      flex-shrink: 0;
    }
    .card-bar {
      margin-top: 16px;
      height: 3px; border-radius: 2px;
      background: var(--border);
      overflow: hidden;
    }
    .card-bar-fill {
      height: 100%; border-radius: 2px;
      transition: width 0.6s ease;
    }

    /* ── ECG Wide Card ── */
    .card-wide {
      grid-column: 1 / -1;
    }
    .ecg-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      align-items: center;
    }
    .ecg-reading {
      font-family: 'DM Mono', monospace;
      font-size: 3rem; font-weight: 500;
      letter-spacing: -0.04em;
    }
    .ecg-meta { display: flex; flex-direction: column; gap: 10px; }
    .ecg-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px;
      background: var(--surface2);
      border-radius: 8px;
      font-size: 0.75rem;
    }
    .ecg-row-label { color: var(--muted); }
    .ecg-row-val {
      font-family: 'DM Mono', monospace;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 2px 10px; border-radius: 999px;
      font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
      border: 1px solid currentColor;
    }

    /* ECG waveform decoration */
    .ecg-wave {
      opacity: 0.15;
      position: absolute; right: 0; bottom: 0;
      width: 180px; height: 60px;
    }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 24px;
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      color: var(--muted);
      border-top: 1px solid var(--border);
      margin-top: 16px;
    }
    footer a { color: var(--accent); text-decoration: none; }

    @media (max-width: 600px) {
      header { padding: 14px 16px; }
      main { padding: 20px 14px; }
      .ecg-grid { grid-template-columns: 1fr; }
      .card-value { font-size: 2rem; }
    }
  </style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-dot"></div>
    <div class="logo-text"><span>Med</span>Sense · ESP32</div>
  </div>
  <div class="header-meta">
    <div class="live-badge">LIVE MONITORING</div>
    <div style="margin-top:6px">Auto-refresh · 5s interval</div>
  </div>
</header>

<main>

  <p class="section-label">Environmental Vitals</p>
  <div class="grid">

    <!-- Temperature -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">Temperature</span>
        <span class="card-icon">🌡</span>
      </div>
      <div class="card-value" style="color:)rawhtml";

  html += tempColor;
  html += R"rawhtml(">)rawhtml";
  html += String(temp, 1);
  html += R"rawhtml(<span class="card-unit">°C</span></div>
      <div class="card-status">
        <div class="status-dot" style="background:)rawhtml";
  html += tempColor;
  html += R"rawhtml("></div>
        <span style="color:)rawhtml";
  html += tempColor;
  html += R"rawhtml(">)rawhtml";
  html += (temp > 38.0) ? "FEVER RANGE" : (temp > 37.0 ? "ELEVATED" : "NORMAL");
  html += R"rawhtml(</span>
      </div>
      <div class="card-bar"><div class="card-bar-fill" style="width:)rawhtml";
  html += String(constrain((temp - 20.0) / 22.0 * 100.0, 5, 100), 0);
  html += R"rawhtml(%;background:)rawhtml";
  html += tempColor;
  html += R"rawhtml("></div></div>
    </div>

    <!-- Humidity -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">Humidity</span>
        <span class="card-icon">💧</span>
      </div>
      <div class="card-value" style="color:)rawhtml";
  html += humColor;
  html += R"rawhtml(">)rawhtml";
  html += String(hum, 1);
  html += R"rawhtml(<span class="card-unit">%</span></div>
      <div class="card-status">
        <div class="status-dot" style="background:)rawhtml";
  html += humColor;
  html += R"rawhtml("></div>
        <span style="color:)rawhtml";
  html += humColor;
  html += R"rawhtml(">)rawhtml";
  html += (hum > 80 || hum < 20) ? "OUT OF RANGE" : (hum > 70 ? "HIGH" : "OPTIMAL");
  html += R"rawhtml(</span>
      </div>
      <div class="card-bar"><div class="card-bar-fill" style="width:)rawhtml";
  html += String(constrain(hum, 5, 100), 0);
  html += R"rawhtml(%;background:)rawhtml";
  html += humColor;
  html += R"rawhtml("></div></div>
    </div>

    <!-- IR Sensor -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">IR Sensor</span>
        <span class="card-icon">👁</span>
      </div>
      <div class="card-value" style="font-size:1.8rem;color:)rawhtml";
  html += irColor;
  html += R"rawhtml(">)rawhtml";
  html += irLabel;
  html += R"rawhtml(</div>
      <div class="card-status" style="margin-top:12px">
        <div class="status-dot" style="background:)rawhtml";
  html += irColor;
  html += R"rawhtml("></div>
        <span style="color:)rawhtml";
  html += irColor;
  html += R"rawhtml(">)rawhtml";
  html += (ir == 0) ? "OBJECT IN RANGE" : "NO OBSTRUCTION";
  html += R"rawhtml(</span>
      </div>
      <div class="card-bar" style="margin-top:20px">
        <div class="card-bar-fill" style="width:)rawhtml";
  html += (ir == 0) ? "100" : "8";
  html += R"rawhtml(%;background:)rawhtml";
  html += irColor;
  html += R"rawhtml("></div></div>
    </div>

  </div><!-- /grid -->

  <p class="section-label">Cardiac Monitoring · AD8232 ECG</p>
  <div class="grid">
    <div class="card card-wide">
      <div class="ecg-grid">

        <!-- ECG Value -->
        <div>
          <div class="card-header">
            <span class="card-label">ECG Signal</span>
            <span class="badge" style="color:)rawhtml";
  html += ecgBadgeC;
  html += R"rawhtml(;border-color:)rawhtml";
  html += ecgBadgeC;
  html += R"rawhtml(">)rawhtml";
  html += ecgBadge;
  html += R"rawhtml(</span>
          </div>
          <div class="ecg-reading" style="color:)rawhtml";
  html += ecgColor;
  html += R"rawhtml(">)rawhtml";
  html += ecgValue;
  html += R"rawhtml(</div>
          <div class="card-status" style="margin-top:10px">
            <div class="status-dot" style="background:)rawhtml";
  html += ecgColor;
  html += R"rawhtml("></div>
            <span style="color:)rawhtml";
  html += ecgColor;
  html += R"rawhtml(">)rawhtml";
  html += ecg.connected ? "ELECTRODES ATTACHED" : "LEADS OFF — CHECK ELECTRODES";
  html += R"rawhtml(</span>
          </div>
        </div>

        <!-- ECG Meta -->
        <div class="ecg-meta">
          <div class="ecg-row">
            <span class="ecg-row-label">Electrode Status</span>
            <span class="ecg-row-val" style="color:)rawhtml";
  html += ecgColor;
  html += R"rawhtml(">)rawhtml";
  html += ecgStatus;
  html += R"rawhtml(</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">LO+ Lead</span>
            <span class="ecg-row-val" style="color:)rawhtml";
  html += ecg.connected ? "#22c55e" : "#ef4444";
  html += R"rawhtml(">GPIO26 · )rawhtml";
  html += ecg.connected ? "OK" : "OFF";
  html += R"rawhtml(</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">LO− Lead</span>
            <span class="ecg-row-val" style="color:)rawhtml";
  html += ecg.connected ? "#22c55e" : "#ef4444";
  html += R"rawhtml(">GPIO27 · )rawhtml";
  html += ecg.connected ? "OK" : "OFF";
  html += R"rawhtml(</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">ADC Range</span>
            <span class="ecg-row-val">0 – 4095</span>
          </div>
        </div>

        <!-- Info Panel -->
        <div class="ecg-meta">
          <div class="ecg-row">
            <span class="ecg-row-label">Sensor Model</span>
            <span class="ecg-row-val">AD8232</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">Output Pin</span>
            <span class="ecg-row-val">GPIO34</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">API Endpoint</span>
            <span class="ecg-row-val" style="color:#3b82f6">/ecg</span>
          </div>
          <div class="ecg-row">
            <span class="ecg-row-label">Context</span>
            <span class="ecg-row-val" style="color:#06b6d4">Eye Disease AI</span>
          </div>
        </div>

      </div><!-- /ecg-grid -->
    </div>
  </div><!-- /grid -->

</main>

<footer>
  MedSense · ESP32 Patient Monitor &nbsp;|&nbsp;
  <a href="/dht11">/dht11</a> &nbsp;·&nbsp;
  <a href="/irsensor">/irsensor</a> &nbsp;·&nbsp;
  <a href="/ecg">/ecg</a> &nbsp;|&nbsp;
  AI-Assisted Eye Disease Detection Platform
</footer>

</body>
</html>)rawhtml";

  return html;
}

// ─── Route: / (Root Dashboard) ────────────────────────────
void handleRoot() {
  float h  = dht.readHumidity();
  float t  = dht.readTemperature();
  int   ir = digitalRead(IRPIN);
  ECGData ecg = readECG();

  if (isnan(h) || isnan(t)) {
    server.send(500, "text/plain", "DHT11 sensor error");
    return;
  }
  server.send(200, "text/html", getHTML(t, h, ir, ecg));
}

// ─── Route: /dht11 ────────────────────────────────────────
void handleDHT() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    server.send(500, "application/json", "{\"error\":\"dht_read_failed\"}");
    return;
  }

  String json = "{";
  json += "\"temperature\":"  + String(t, 2) + ",";
  json += "\"humidity\":"     + String(h, 2);
  json += "}";

  server.send(200, "application/json", json);
}

// ─── Route: /irsensor ─────────────────────────────────────
void handleIR() {
  int ir = digitalRead(IRPIN);

  String json = "{";
  json += "\"ir\":"      + String(ir)                        + ",";
  json += "\"status\":\"" + String(ir == 0 ? "detected" : "clear") + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// ─── Route: /ecg ──────────────────────────────────────────
void handleECG() {
  ECGData ecg = readECG();

  String json = "{";
  json += "\"connected\":"       + String(ecg.connected ? "true" : "false") + ",";
  json += "\"leads_off\":"       + String(ecg.connected ? "false" : "true") + ",";
  json += "\"ecg_value\":"       + String(ecg.ecgValue)                     + ",";
 // json += "\"electrode_status\":\"" + (ecg.connected ? "connected" : "leads_off") + "\"";
  json += "\"electrode_status\":\"";
  json += (ecg.connected ? "connected" : "leads_off");
  json += "\"";
  json += "}";

  server.send(200, "application/json", json);
}

// ─── Setup ────────────────────────────────────────────────
void setup() {
  delay(1000); // Let ROM boot finish before Serial starts
  Serial.begin(115200);

  // Existing sensors
  dht.begin();
  pinMode(IRPIN, INPUT);

  // AD8232 ECG
  pinMode(ECG_LO_PLUS,  INPUT);   // LO+ lead-off detection
  pinMode(ECG_LO_MINUS, INPUT);   // LO- lead-off detection
  // GPIO34 is input-only ADC — no pinMode needed for analogRead
  analogReadResolution(12);                              // 0–4095 full scale
  analogSetPinAttenuation(ECG_OUTPUT_PIN, ADC_11db);     // ~0–3.3V range (AD8232 baseline ~1.65V)

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("Dashboard → http://");
  Serial.println(WiFi.localIP());

  // Routes (existing preserved + new /ecg)
  server.on("/",        handleRoot);
  server.on("/dht11",   handleDHT);
  server.on("/irsensor",handleIR);
  server.on("/ecg",     handleECG);   // NEW

  server.begin();
  Serial.println("HTTP server started.");
}

// ─── Loop ─────────────────────────────────────────────────
void loop() {
  server.handleClient();   // Non-blocking; keeps server responsive
}