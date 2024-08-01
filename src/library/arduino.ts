// Arduino.ts
// Syscall side of the Arduino C++ layer.
// 2024, cv2 - part of 1T LiveArduino

import {Runtime} from "../runtime/runtime";
import arduino from "../arduino/arduinoBoard";

function debugPrint(text: string){
    console.log("\x1b[42mliveduino: " + text + "\x1b[0m");
}

export function pinMode(this: Runtime, pin: number, mode: boolean): void {
        if (pin >= 100){
            if (pin - 100 <= 6) {
                arduino.analogPins[pin - 100].mode = mode;
                debugPrint(`setting analog pin ${pin - 100}, new mode: ${arduino.analogPins[pin - 100].mode ? "output" : "input"}`);
            }
            else {
                debugPrint("This pin does not exist! Arduino UNO only has 6 analog pins!");
            }
        }
        else {
            if (pin <= 13) {
                arduino.digitalPins[pin].mode = mode;
                debugPrint(`setting digital pin ${pin}, new mode: ${arduino.digitalPins[pin].mode ? "output" : "input"}`);
            } else {
                debugPrint("This pin does not exist! Arduino UNO only has 13 digital pins!");
            }
        }
}

export function digitalWrite(this: Runtime, pin: number, state: number): void {
    if (arduino.digitalPins[pin].mode == false) {
        console.log(`digitalWrite - pin number: ${pin}, Wrong pin mode detected! Current mode is: ${arduino.digitalPins[pin].mode ? "output" : "input"}`);
        if (pin == 0)
            {
                // @ts-ignore
                self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: "RX0", setVal: state, pinType: false }, id: Math.random() * 1000 });
            }
        else if (pin == 1) {
            // @ts-ignore
            self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: "TX1", setVal: state, pinType: false }, id: Math.random() * 1000 });
        }
        else
            // @ts-ignore
            self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: pin, setVal: state, pinType: false }, id: Math.random() * 1000 });
        return;
    }
    else if (pin <= 13) {
        arduino.digitalPins[pin].state = state;
        console.log(`digitalWrite - pin number: ${pin}, - new value is ${arduino.digitalPins[pin].state}`);
        if (pin == 0)
            // @ts-ignore
            self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: "RX0", setVal: state, pinType: false }, id: Math.random() * 1000 });
        else if (pin == 1) {
            // @ts-ignore
            self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: "TX1", setVal: state, pinType: false }, id: Math.random() * 1000 });
        }
        else
            // @ts-ignore
            self.postMessage({ err: 0, type: "arduino.digitalSet", data: { setPin: pin, setVal: state, pinType: false }, id: Math.random() * 1000 });
    }
    else {
        console.log(`digitalWrite - pin number: ${pin}, This pin does not exist! Arduino Uno only has 13 digital pins!`);
        // @ts-ignore
        self.postMessage({ err: 1, type: "arduino.digitalSet", data: { setPin: pin, setVal: state, pinType: false }, id: Math.random() * 1000 });
    }

}