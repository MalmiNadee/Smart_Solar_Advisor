#pragma once
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "../config.h"
#include "../secrets.h"
#include "../utils/Diagnostics.h"
#include "../utils/TimeKeeper.h"

namespace Net {

inline bool postJson(const String& path, const JsonDocument& doc) {
  // Generate Firebase-safe timestamp: YYYYMMDD_HHMMSS
  time_t now = time(nullptr);
  struct tm t;
  localtime_r(&now, &t);
  char timestamp[32];
  snprintf(timestamp, sizeof(timestamp), "%04d%02d%02d_%02d%02d%02d",
           t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
           t.tm_hour, t.tm_min, t.tm_sec);
  
  // Get device_id from the document
  String device_id = doc["device_id"].as<String>();
  if (device_id.length() == 0) {
    device_id = DEVICE_ID; // Fallback to config
  }
  
  // Build Firebase REST API URL
  // Format: https://[PROJECT_ID].firebaseio.com/devices/[DEVICE_ID]/[TIMESTAMP].json?auth=[TOKEN]
  String url = String(FIREBASE_DB_URL) + "/devices/" + device_id + "/" + String(timestamp) + ".json?auth=" + String(FIREBASE_AUTH_TOKEN);
  
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(url);

  http.addHeader("Content-Type", "application/json");

  String payload;
  serializeJson(doc, payload);

  for (int attempt = 1; attempt <= HTTP_RETRY_MAX; ++attempt) {
    int code = http.PUT(payload);  // Use PUT for Firebase (creates/updates at specific path)
    if (code > 0) {
      if (code >= 200 && code < 300) {
        logInfo("Firebase PUT %s -> %d", url.c_str(), code);
        http.end();
        return true;
      } else {
        String response = http.getString();
        logWarn("Firebase PUT %s -> %d : %s", url.c_str(), code, response.c_str());
      }
    } else {
      logWarn("Firebase HTTP error: %s", http.errorToString(code).c_str());
    }
    delay(600 * attempt); // backoff
  }
  http.end();
  return false;
}

} // namespace Net
