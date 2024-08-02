const myWorker = new Worker('compilerWorker.js', { type: "module" });

myWorker.onerror = function(e) {
    console.error("Worker error: ", e);
};

myWorker.onmessage = function(e) {
    const { type, message } = e.data;
    console.log(`[${type}] ${message}`);
}

function startup() {
    console.log("Start button clicked");
    console.log(myWorker);
    myWorker.postMessage({ command: 'compile', code: `#include "stdio.h"
#include "arduino.h"

void setup(){
    printf("testing runtime.");
    pinMode(A0, INPUT);
    pinMode(0, OUTPUT);
    digitalWrite(0, HIGH);
    digitalWrite(0, LOW);
}

void loop(){
// something
}

void main(){
    setup();
}` });
    console.log("Message posted to worker");
}
