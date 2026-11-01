#pragma once
#include <DHT.h>
#include "../config.h"
#include "../utils/Diagnostics.h"

struct DhtReading {
  float t1=NAN, h1=NAN, t2=NAN, h2=NAN;
  float t_avg=NAN, h_avg=NAN;
};

class DHT22Pair {
  DHT d1, d2;
public:
  DHT22Pair(): d1(PIN_DHT1, DHT22), d2(PIN_DHT2, DHT22) {}
  void begin(){ d1.begin(); d2.begin(); }

  DhtReading readAveraged(uint8_t samples=SAMPLE_AVG) {
    DhtReading r;
    float t1=0, h1=0, t2=0, h2=0; int c1=0,c2=0;
    for (uint8_t i=0;i<samples;i++){
      float a=d1.readTemperature(); float b=d1.readHumidity();
      if (!isnan(a)&&!isnan(b)){ t1+=a; h1+=b; c1++; }
      a=d2.readTemperature(); b=d2.readHumidity();
      if (!isnan(a)&&!isnan(b)){ t2+=a; h2+=b; c2++; }
      delay(50);
    }
    if(c1){ r.t1=t1/c1; r.h1=h1/c1; }
    if(c2){ r.t2=t2/c2; r.h2=h2/c2; }
    if(c1||c2){
      r.t_avg = ( (c1? r.t1:0) + (c2? r.t2:0) ) / float((c1?1:0)+(c2?1:0));
      r.h_avg = ( (c1? r.h1:0) + (c2? r.h2:0) ) / float((c1?1:0)+(c2?1:0));
    }
    return r;
  }
};
