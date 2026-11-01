#include "config.h"
#include "network/WiFiSetup.h"
#include "network/ApiClient.h"
#include "sensors/DHT22Pair.h"
#include "sensors/BH1750Pair.h"
#include "sensors/RainSensors.h"
#include "sensors/DustGP2Y1010.h"
#include "utils/TimeKeeper.h"
#include "utils/Diagnostics.h"
#include <ArduinoJson.h>

DHT22Pair     dht;
BH1750Pair    lux;
RainSensors   rain;
DustGP2Y1010  dust;

uint32_t nextTick = 0;

void setup() {
  Serial.begin(115200);
  delay(200);

  Net::connectWiFi();
  TimeKeeper::beginSNTP();

  dht.begin();
  lux.begin();
  rain.begin();
  dust.begin();

  pinMode(LED_BUILTIN, OUTPUT);
  nextTick = millis(); // start immediately
}

StaticJsonDocument<1024> buildPayload() {
  // Sample sensors
  DhtReading   dr  = dht.readAveraged();
  LuxReading   lr  = lux.readAveraged();
  RainReading  rr  = rain.read();
  DustReading  ds  = dust.read();

  StaticJsonDocument<1024> doc;
  doc["device_id"] = DEVICE_ID;
  doc["site_id"]   = SITE_ID;
  doc["timestamp"] = TimeKeeper::iso8601();

  JsonObject dht1 = doc.createNestedObject("dht1");
  dht1["temp_c"] = dr.t1;
  dht1["hum_%"]  = dr.h1;

  JsonObject dht2 = doc.createNestedObject("dht2");
  dht2["temp_c"] = dr.t2;
  dht2["hum_%"]  = dr.h2;

  JsonObject dhta = doc.createNestedObject("dht_avg");
  dhta["temp_c"] = dr.t_avg;
  dhta["hum_%"]  = dr.h_avg;

  JsonObject bh = doc.createNestedObject("bh1750");
  bh["lux1"]    = lr.lux1;
  bh["lux2"]    = lr.lux2;
  bh["lux_avg"] = lr.lux_avg;

  JsonObject rainj = doc.createNestedObject("rain");
  rainj["raw1"]  = rr.raw1;
  rainj["raw2"]  = rr.raw2;
  rainj["pct1"]  = rr.pct1;
  rainj["pct2"]  = rr.pct2;

  JsonObject dj = doc.createNestedObject("dust");
  dj["raw"]      = ds.raw;
  dj["voltage"]  = ds.voltage;
  dj["mg_m3"]    = ds.density;

  // room for later (battery, rssi, device uptime)
  doc["rssi"]    = WiFi.RSSI();
  doc["uptime_s"]= millis()/1000;
  return doc;
}

void loop() {
  uint32_t now = millis();
  if ( (int32_t)(now - nextTick) >= 0 ) {
    digitalWrite(LED_BUILTIN, HIGH);

    if (Net::ensureWiFi()) {
      StaticJsonDocument<1024> doc = buildPayload();
      bool ok = Net::postJson("", doc);  // Path is built inside postJson for Firebase
      logInfo("Upload %s", ok ? "OK" : "FAILED");
    } else {
      logWarn("WiFi not available; skipping upload.");
    }

    digitalWrite(LED_BUILTIN, LOW);
    nextTick += LOOP_PERIOD_MS;              // schedule next 5-min slot
    // guard against millis() overflow drift
    if ((int32_t)(nextTick - now) < 0 || (nextTick - now) > LOOP_PERIOD_MS)
      nextTick = now + LOOP_PERIOD_MS;
  }

  // Light sleep between polls (saves power & heat)
  delay(50);
}
