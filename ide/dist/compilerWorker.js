import {
    CallbackOutputFile,
    compileFile,
    CompilerError,
    importObj,
    NativeRuntime,
    StringInputFile
} from "./interpreter-core.js";

const msgType = {
    MSG_COMPILER: 'compiler',
    MSG_ERROR: 'error',
    MSG_RUNTIME: 'runtime',
    MSG_RESULT: 'result',
    MSG_SERVICE: 'service',
    MSG_LISTING : 'listing'
};

function showOutput(msg, type) {
    self.postMessage({ type, message: msg });
}

onmessage = async function(e) {
    console.log("Worker received message:", e.data);

    if (e.data.command === 'compile') {
        const code = e.data.code;

        showOutput("cc -o main main.cpp", msgType.MSG_COMPILER);

        try {
            const obj = compileFile("main.cpp", code);

            if (obj == null) {
                showOutput("no compiled object", msgType.MSG_RUNTIME);
                return;
            }

            showOutput("run main", msgType.MSG_RUNTIME);

            const runtime = new NativeRuntime({
                importObjects: importObj,
                code: obj.binary,
                memorySize: 10 * 65536,
                entry: obj.entry,
                heapStart: obj.heapStart,
                files: [
                    new StringInputFile(code),
                    new CallbackOutputFile(x => showOutput(x, msgType.MSG_RESULT)),
                    new CallbackOutputFile(x => showOutput(x, msgType.MSG_RESULT)),
                ],
            });

            await runtime.run();

            showOutput("code execution ended.", msgType.MSG_RUNTIME);

        } catch (e) {
            processError(e, CompilerError);
        }
    }
};

function processError(e, CompilerError) {
    console.error("Error processing:", e);

    if (e instanceof CompilerError) {
        showOutput(e.toString(), msgType.MSG_ERROR);
    } else {
        showOutput(e.toString(), msgType.MSG_SERVICE);
    }
}

self.onerror = function(e) {
    console.error("Worker error:", e);
    showOutput(e.message, msgType.MSG_ERROR);
};
