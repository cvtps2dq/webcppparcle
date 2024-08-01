
const myWorker = new Worker('compilerWorker.js', { type: "module" });

// Handle messages from the worker
myWorker.onmessage = function(e) {
    const { type, message} = e.data;
    switch (type) {
        case 'MSG_COMPILER':
        case 'MSG_ERROR':
        case 'MSG_RUNTIME':
        case 'MSG_RESULT':
        case 'MSG_SERVICE':
        case 'MSG_LISTING':
            console.log(`[${type}] ${message}`);
            break;
        default:
            console.log(`[${type}] ${message}`);
    }
}

// Start compilation in the worker
function startup(){
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
}


