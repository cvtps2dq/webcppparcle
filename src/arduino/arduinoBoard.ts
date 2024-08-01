// arduinoBoard.ts

// ----------КОНТЕКСТ-------------
// этот класс глобальный.
// поддерживается только один
// экземпляр этого класса!

// ----------ПОДДЕРЖКА------------
// сейчас поддерживается только UNO.
// этот класс описывает простую
// модель платы Arduino,
// с идеей симуляции в реальном времени.

// keep it super simple, stupid.
// cvtps2dq, 2024 - 1T - interpreter-core

import Pin from "./pin";

class ArduinoBoard {
    digitalPins = new Array(13);
    analogPins = new Array(6);
    id: string = "";
    constructor(id : string) {
        this.id = id;
        for (let i = 0; i <= 18; i++) {
            this.digitalPins[i] = new Pin();
        }
        for (let i = 0; i <= 6; i++) {
            this.analogPins[i] = new Pin();
        }
    }

}

const arduino = new ArduinoBoard("global_board");
export default arduino;