
#ifndef _ARDUINO_H
#define _ARDUINO_H

#define HIGH 1
#define LOW  0

#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2

#define PI 3.1415926535897932384626433832795
#define HALF_PI 1.5707963267948966192313216916398
#define TWO_PI 6.283185307179586476925286766559
#define DEG_TO_RAD 0.017453292519943295769236907684886
#define RAD_TO_DEG 57.295779513082320876798154814105
#define EULER 2.718281828459045235360287471352

#define SERIAL  0
#define DISPLAY 1

#define LSBFIRST 0
#define MSBFIRST 1

#define CHANGE 1
#define FALLING 2
#define RISING 3

static const int A0 = 100;
static const int A1 = 101;
static const int A2 = 102;
static const int A3 = 103;
static const int A4 = 104;
static const int A5 = 105;

#endif

__libcall void pinMode(int pin, int mode);
__libcall void digitalWrite(int pin, int state);
