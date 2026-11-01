#pragma once
#include <Wire.h>
#include <BH1750.h>
#include "../config.h"

struct LuxReading {
  float lux1=NAN, lux2=NAN, lux_avg=NAN;
};

class BH1750Pair {
  BH1750 s1, s2;
  TwoWire wire2;
public:
  BH1750Pair(): s1(BH1750_ADDR_1),
                s2(0x23),  // Both can use 0x23 since they're on separate I2C buses
                wire2(1) {}  // Use I2C controller 1 for second bus

  void begin(){
    // Initialize first I2C bus (Wire) for sensor 1 on pins 21/22
    Wire.begin(I2C_SDA, I2C_SCL);
    Wire.setClock(100000); // Set I2C clock to 100kHz
    delay(100); // Allow I2C bus to stabilize
    
    // Initialize second I2C bus (Wire1) for sensor 2 on pins 25/26
    wire2.begin(I2C_SDA2, I2C_SCL2);
    wire2.setClock(100000);
    delay(100);
    
    // Initialize sensor 1 on first I2C bus (Wire) at address 0x23
    bool ok1 = s1.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire);
    delay(50); // Small delay between initializations
    
    // Initialize sensor 2 on second I2C bus (wire2) at address 0x23
    // Since they're on separate buses, both can use the same address
    bool ok2 = s2.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &wire2);
    
    if (!ok1) {
      Serial.printf("[BH1750] Sensor 1 (0x23) on bus 1 (SDA:%d/SCL:%d) initialization failed! Check wiring.\n", 
                    I2C_SDA, I2C_SCL);
    }
    if (!ok2) {
      Serial.printf("[BH1750] Sensor 2 (0x23) on bus 2 (SDA:%d/SCL:%d) initialization failed! Check wiring.\n", 
                    I2C_SDA2, I2C_SCL2);
      Serial.println("[BH1750] Note: Both sensors use address 0x23 since they're on separate I2C buses");
    }
    if (ok1 && ok2) {
      Serial.println("[BH1750] Both sensors initialized successfully at address 0x23 on separate I2C buses");
    }
  }

  LuxReading readAveraged(uint8_t samples=SAMPLE_AVG){
    LuxReading r;
    float a=0,b=0; int c1=0,c2=0;
    for(uint8_t i=0;i<samples;i++){
      float x=s1.readLightLevel(); if(x>0){ a+=x;c1++; }
      x=s2.readLightLevel(); if(x>0){ b+=x;c2++; }
      delay(20);
    }
    if(c1) r.lux1=a/c1;
    if(c2) r.lux2=b/c2;
    if(c1||c2) r.lux_avg = ( (c1? r.lux1:0)+(c2? r.lux2:0) ) / float((c1?1:0)+(c2?1:0));
    return r;
  }
};
