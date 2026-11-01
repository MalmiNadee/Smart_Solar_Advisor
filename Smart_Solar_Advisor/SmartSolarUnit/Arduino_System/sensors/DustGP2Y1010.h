#pragma once
#include "../config.h"
#include "../utils/Diagnostics.h"

// Timing from Sharp app note: sample while LED is ON for ~280us, read, then LED off.
struct DustReading {
  int raw=0;          // 0..4095
  float voltage=0.0;  // ~0..3.0 V
  float density=0.0;  // rough mg/m^3 estimate
};

class DustGP2Y1010 {
public:
  void begin(){
    pinMode(PIN_DUST_LED_CTRL, OUTPUT);
    digitalWrite(PIN_DUST_LED_CTRL, HIGH); // LED off (active low)
    analogReadResolution(12);
  }

  DustReading read(){
    DustReading r;
    // LED ON (active low through 1k)
    digitalWrite(PIN_DUST_LED_CTRL, LOW);
    delayMicroseconds(280);
    int v = analogOversample(PIN_DUST_ANALOG);
    delayMicroseconds(40);
    digitalWrite(PIN_DUST_LED_CTRL, HIGH); // OFF
    delayMicroseconds(9680);

    r.raw = v;
    r.voltage = v * (3.3f / 4095.0f);

    // Empirical conversion (approx) from Sharp docs:
    // density (mg/m3) ≈ max(0, (Vout - 0.6) / 0.005)
    float corrected = r.voltage - 0.6f;
    r.density = corrected > 0 ? (corrected / 0.005f) : 0.0f;
    return r;
  }
};
