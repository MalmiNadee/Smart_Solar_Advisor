#pragma once
#include "../config.h"

inline int analogOversample(int pin){
  uint32_t sum=0;
  for(int i=0;i<ADC_SAMPLES;i++){ sum += analogRead(pin); delay(2); }
  return sum/ADC_SAMPLES;
}

struct RainReading {
  int raw1=0, raw2=0;     // 0..4095
  float pct1=0, pct2=0;   // 0..100 (0=dry, 100=wet)
};

class RainSensors {
public:
  void begin(){
    analogReadResolution(12);
  }
  RainReading read(){
    RainReading r;
    r.raw1 = analogOversample(PIN_RAIN1);
    r.raw2 = analogOversample(PIN_RAIN2);
    // HW-028 AO: higher value = more water (board dependent). Map to %.
    r.pct1 = (r.raw1 / 4095.0f) * 100.0f;
    r.pct2 = (r.raw2 / 4095.0f) * 100.0f;
    return r;
  }
};
