'use strict'

const os = require('os');
const http = require('http');
const serialport = require('serialport');
const config = require('config');

// USB device file
const portName = config.serial.port;

// send interval milliseconds
const SEND_INTERVAL_MILLISECS = config.intervalMilliSec;

// last send time
let lastSendTime = 0;

/**
 * check send interval
 * @return {boolean}
 * @private
 */
function isOverInterval_() {
  return Date.now() - lastSendTime > SEND_INTERVAL_MILLISECS;
}

/**
 * update last send time
 * @private
 */
function updateSendTime_() {
  lastSendTime = Date.now();
}

/**
 * send data to server
 * @param {Object} data
 * @private
 */
function send_(data) {
  const opts = {
    host: config.api.host,
    port: config.api.port,
    method: 'POST',
    path: '/api/atmos',
    headers: {
      'content-type': 'application/json'
    }
  };

  const req = http.request(opts, (res) => {
    if (res.statusCode !== 200) {
      console.warn('statusCode:', res.statusCode);
    }
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(JSON.stringify(data), 'utf8');
  req.end();

  updateSendTime_();
}

// setup serial port
const sp = new serialport.SerialPort(portName, {
  baudRate: config.serial.boudRate,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false,
  parser: serialport.parsers.readline('\n')
});

sp.on('data', (input) => {
  const buffer = new Buffer(input, 'utf8');
  try {
    if (isOverInterval_()) {
      const data = {
        time: Date.now(),
        content: JSON.parse(buffer) 
      };
      send_(data);
    }
  } catch (e) {
    console.error(e, buffer.toString('utf8'));
  }
});
