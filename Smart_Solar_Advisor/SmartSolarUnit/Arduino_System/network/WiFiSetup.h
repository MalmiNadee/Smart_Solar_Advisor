#pragma once
#include <WiFi.h>
#include "../secrets.h"
#include "../utils/Diagnostics.h"

namespace Net {

inline void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  logInfo("WiFi: connecting to %s ...", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    logDot();
    if (millis() - start > 20000) {
      logWarn("WiFi: retry...");
      WiFi.disconnect(true);
      delay(1000);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      start = millis();
    }
  }
  logInfo("\nWiFi: connected, IP=%s", WiFi.localIP().toString().c_str());
}

inline bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  connectWiFi();
  return WiFi.status() == WL_CONNECTED;
}

} // namespace Net
