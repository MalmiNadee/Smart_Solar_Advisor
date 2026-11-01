#pragma once
#include <Arduino.h>
#include <stdio.h>

inline void vlogf(const char* lvl, const char* fmt, va_list args){
  char buf[256];
  vsnprintf(buf, sizeof(buf), fmt, args);
  Serial.printf("[%s] %s\n", lvl, buf);
}
inline void logInfo(const char* fmt, ...){
  va_list a; va_start(a, fmt); vlogf("INFO", fmt, a); va_end(a);
}
inline void logWarn(const char* fmt, ...){
  va_list a; va_start(a, fmt); vlogf("WARN", fmt, a); va_end(a);
}
inline void logDot(){ Serial.print("."); }
