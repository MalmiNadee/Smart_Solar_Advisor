#pragma once
#include <WiFi.h>
#include "../utils/Diagnostics.h"

namespace TimeKeeper {

inline void beginSNTP() {
  configTime(5 * 3600, 0, "pool.ntp.org", "time.nist.gov"); // IST offset +5:00
  logInfo("NTP: syncing...");
  time_t now = time(nullptr);
  uint32_t start = millis();
  while (now < 1700000000 && (millis() - start) < 15000) { // wait till 2023+
    delay(200);
    now = time(nullptr);
  }
  logInfo("NTP: %ld", now);
}

inline String iso8601() {
  time_t now = time(nullptr);
  struct tm t;
  localtime_r(&now, &t);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S%z", &t);
  return String(buf);
}

} // namespace TimeKeeper
