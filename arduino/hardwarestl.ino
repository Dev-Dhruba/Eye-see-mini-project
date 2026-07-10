#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// WiFi
const char* ssid = "A10s422";
const char* password = "sri422116";

// DHT
#define DHTPIN 4
#define DHTTYPE DHT11

// IR sensor
#define IRPIN 5

DHT dht(DHTPIN, DHTTYPE);

WebServer server(80);



String getHTML(float temp, float hum, int ir) {

  String irState = ir == 0 ? "DETECTED" : "CLEAR";

  String html = "<!DOCTYPE html><html>";
  html += "<head><meta http-equiv='refresh' content='3'/>";
  html += "<title>ESP32 Sensors</title></head>";
  html += "<body style='font-family:Arial;text-align:center;'>";

  html += "<h1>ESP32 Sensor Dashboard</h1>";

  html += "<h2>Temperature: " + String(temp) + " C</h2>";
  html += "<h2>Humidity: " + String(hum) + " %</h2>";
  html += "<h2>IR Sensor: " + irState + "</h2>";

  html += "</body></html>";

  return html;
}



// ---------- ROOT ----------

void handleRoot() {

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  int ir = digitalRead(IRPIN);

  if (isnan(h) || isnan(t)) {
    server.send(200, "text/plain", "Sensor error");
    return;
  }

  server.send(200, "text/html", getHTML(t, h, ir));
}



// ---------- DHT JSON ----------

void handleDHT() {

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    server.send(500, "application/json", "{\"error\":\"dht\"}");
    return;
  }

  String json = "{";
  json += "\"temperature\":";
  json += t;
  json += ",";
  json += "\"humidity\":";
  json += h;
  json += "}";

  server.send(200, "application/json", json);
}



// ---------- IR JSON ----------

void handleIR() {

  int ir = digitalRead(IRPIN);

  String json = "{";

  json += "\"ir\":";
  json += ir;

  json += "}";

  server.send(200, "application/json", json);
}



// ---------- SETUP ----------

void setup() {

  Serial.begin(115200);

  dht.begin();

  pinMode(IRPIN, INPUT);

  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected");
  Serial.println(WiFi.localIP());


  server.on("/", handleRoot);

  server.on("/dht11", handleDHT);

  server.on("/irsensor", handleIR);

  server.begin();
}



// ---------- LOOP ----------

void loop() {
  server.handleClient();
}
