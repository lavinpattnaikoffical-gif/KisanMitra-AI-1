const fs = require('fs');
const file = 'src/components/Devices.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldTemplateStart = `  const esp32Template = generatedCreds ? \`// KisanMitra AI - ESP32 Firmware`;
const oldTemplateEnd = `  delay(5000);
}
\` : "";`;

const newTemplate = `  const esp32Template = generatedCreds ? \`// KisanMitra_AI.ino
// Production firmware template for ESP32
// Update WiFi credentials and endpoint as needed.

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <TinyGPS++.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define DEVICE_ID "\${generatedCreds.id}"
#define DEVICE_SECRET "\${generatedCreds.secret}"

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASS "YOUR_WIFI_PASS"

const char* ENDPOINT = "http://52.90.130.245/api/telemetry/ingest";

#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34
#define PH_PIN 35
#define ONE_WIRE_BUS 18

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
DHT dht(DHTPIN,DHTTYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature soilSensor(&oneWire);
TinyGPSPlus gps;
HardwareSerial GPSSerial(2);

unsigned long lastSend=0;
const unsigned long SEND_INTERVAL=10000;

void connectWiFi(){
  if(WiFi.status()==WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID,WIFI_PASS);
  while(WiFi.status()!=WL_CONNECTED){
    delay(500);
  }
}

void setup(){
  Serial.begin(115200);
  dht.begin();
  soilSensor.begin();
  GPSSerial.begin(9600,SERIAL_8N1,16,17);
  display.begin(SSD1306_SWITCHCAPVCC,0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  connectWiFi();
}

void loop(){
  while(GPSSerial.available()) gps.encode(GPSSerial.read());

  if(millis()-lastSend<SEND_INTERVAL) return;
  lastSend=millis();

  connectWiFi();

  float airTemp=dht.readTemperature();
  float humidity=dht.readHumidity();

  soilSensor.requestTemperatures();
  float soilTemp=soilSensor.getTempCByIndex(0);

  int soilRaw=analogRead(SOIL_PIN);
  int moisture=constrain(map(soilRaw,4095,1500,0,100),0,100);

  int phRaw=analogRead(PH_PIN);
  float voltage=phRaw*3.3/4095.0;
  float ph=7+((2.5-voltage)/0.18);

  double lat=gps.location.isValid()?gps.location.lat():0.0;
  double lng=gps.location.isValid()?gps.location.lng():0.0;

  display.clearDisplay();
  display.setCursor(0,0);
  display.printf("Air %.1fC\\\\nHum %.1f%%\\\\nSoil %d%%\\\\npH %.2f\\\\n",airTemp,humidity,moisture,ph);
  display.display();

  JsonDocument doc;
  doc["temperature"]=airTemp;
  doc["humidity"]=humidity;
  doc["soilTemperature"]=soilTemp;
  doc["moisture"]=moisture;
  doc["ph"]=ph;
  JsonObject g=doc["gps"].to<JsonObject>();
  g["latitude"]=lat;
  g["longitude"]=lng;
  doc["timestamp"]=millis();

  String payload;
  serializeJson(doc,payload);

  HTTPClient http;
  http.begin(ENDPOINT);
  http.addHeader("Content-Type","application/json");
  http.addHeader("x-device-id",DEVICE_ID);
  http.addHeader("x-device-secret",DEVICE_SECRET);

  int code=http.POST(payload);
  Serial.printf("HTTP %d\\\\n",code);
  Serial.println(http.getString());
  http.end();
}
\` : "";`;

const startIndex = content.indexOf(oldTemplateStart);
if (startIndex === -1) {
  console.log("Could not find start of old template");
  process.exit(1);
}
const endIndex = content.indexOf(oldTemplateEnd);
if (endIndex === -1) {
  console.log("Could not find end of old template");
  process.exit(1);
}

const finalContent = content.substring(0, startIndex) + newTemplate + content.substring(endIndex + oldTemplateEnd.length);
fs.writeFileSync(file, finalContent);
console.log("Replaced successfully!");
