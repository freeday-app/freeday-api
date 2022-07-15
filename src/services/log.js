const Path = require('path');
const Fs = require('fs');
const Winston = require('winston');

const { format } = Winston;

// log header formatter
const printf = (i) => `${i.timestamp} [${i.level}] ${i.message}`;

// timestamp formatter
const timestamp = {
    format: 'YYYY-MM-DD HH:mm:ss'
};

// logger transports
const transports = [
    // console transport
    new Winston.transports.Console({
        name: 'console',
        level: 'info',
        handleExceptions: false,
        format: format.combine(
            format.colorize(),
            format.timestamp(timestamp),
            format.printf(printf)
        )
    })
];

// controls log directory
const logDir = process.env.LOG_DIR;
let fileTransportError = null;
if (!logDir) {
    fileTransportError = 'no log directory provided';
} else if (!Fs.existsSync(logDir)) {
    fileTransportError = `directory ${logDir} does not exist`;
} else {
    try {
        Fs.accessSync(logDir, Fs.constants.W_OK);
    } catch (err) {
        fileTransportError = `no write permission on ${logDir} directory`;
    }
}

// if log dir is ok adds file transport
if (!fileTransportError) {
    transports.push(
        new Winston.transports.File({
            name: 'file',
            level: 'info',
            filename: Path.join(logDir, 'freeday.log'),
            handleExceptions: false,
            maxsize: 5242880,
            maxFiles: 5,
            format: format.combine(
                format.timestamp(timestamp),
                format.printf(printf)
            )
        })
    );
}

// initialized logger
const Log = Winston.createLogger({
    transports,
    exitOnError: false
});

// transports enabling/disabling
Log.toggleTransport = (transportName, isOn, level = null) => {
    Log.transports.forEach((transport, i) => {
        if (transport.name === transportName) {
            Log.transports[i].silent = !isOn;
            if (level) {
                Log.transports[i].level = level;
            }
        }
    });
};

// displays warning message if file transport could not be initialized
if (fileTransportError) {
    Log.warn(`Log file transport could not be initialized (${fileTransportError})`);
}

module.exports = Log;
