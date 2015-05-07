var Board = require("../lib/board");
var Emitter = require("events").EventEmitter;
var util = require("util");
var __ = require("../lib/fn");
var priv = new Map();
var axes = ["x", "y"];

function Multiplexer(options) {
  this.pins = options.pins;
  this.io = options.io;

  // Setup these "analog" pins as digital output.
  this.io.pinMode(this.pins[0], this.io.MODES.OUTPUT);
  this.io.pinMode(this.pins[1], this.io.MODES.OUTPUT);
  this.io.pinMode(this.pins[2], this.io.MODES.OUTPUT);
  this.io.pinMode(this.pins[3], this.io.MODES.OUTPUT);
}

Multiplexer.prototype.select = function(channel) {
  this.io.digitalWrite(this.pins[0], channel & 1 ? this.io.HIGH : this.io.LOW);
  this.io.digitalWrite(this.pins[1], channel & 2 ? this.io.HIGH : this.io.LOW);
  this.io.digitalWrite(this.pins[2], channel & 4 ? this.io.HIGH : this.io.LOW);
  this.io.digitalWrite(this.pins[3], channel & 8 ? this.io.HIGH : this.io.LOW);
};

var Controllers = {
  ANALOG: {
    initialize: {
      value: function(opts, dataHandler) {
        var count = 0;
        var dataPoints = {
          x: 0,
          y: 0
        };

        opts.pins.forEach(function(pin, index) {
          this.io.pinMode(pin, this.io.MODES.ANALOG);
          this.io.analogRead(pin, function(value) {
            dataPoints[axes[index]] = value;
            count++;

            if (count === 2) {
              count = 0;
              dataHandler(dataPoints);
            }
          }.bind(this));
        }, this);
      }
    },
    toAxis: {
      value: function(raw) {
        return __.fscale(raw - 512, -512, 512, -1, 1);
      }
    }
  },
  ESPLORA: {
    initialize: {
      value: function(opts, dataHandler) {
        // References:
        //
        // https://github.com/arduino/Arduino/blob/master/libraries/Esplora/src/Esplora.h
        // https://github.com/arduino/Arduino/blob/master/libraries/Esplora/src/Esplora.cpp
        //
        var multiplexer = new Multiplexer({
          // Since Multiplexer uses digitalWrite,
          // we have to send the analog pin numbers
          // in their "digital" pin order form.
          pins: [ 18, 19, 20, 21 ],
          io: this.io
        });
        var channels = [ 11, 12 ];
        var index = 1;
        var count = 0;
        var dataPoints = {
          x: 0,
          y: 0
        };

        this.io.pinMode(4, this.io.MODES.ANALOG);

        var handler = function(value) {
          dataPoints[axes[index]] = value;
          count++;

          // Ensure that both pins have been read before
          // reporting a set of values.
          if (count === 2) {
            count = 0;
            dataHandler(dataPoints);
          }

          // Remove this handler to all the multiplexer
          // to setup the next pin for the next read.
          this.io.removeListener("analog-read-4", handler);

          setTimeout(read, 10);
        }.bind(this);

        var read = function() {
          multiplexer.select(channels[index ^= 1]);
          this.io.analogRead(4, handler);
        }.bind(this);

        read();
      }
    },
    toAxis: {
      value: function(raw) {
        return __.fscale(raw - 512, -512, 512, -1, 1);
      }
    }
  }
};

/**
 * Joystick
 * @constructor
 *
 * five.Joystick([ x, y[, z] ]);
 *
 * five.Joystick({
 *   pins: [ x, y[, z] ]
 *   freq: ms
 * });
 *
 *
 * @param {Object} opts [description]
 *
 */
function Joystick(opts) {
  if (!(this instanceof Joystick)) {
    return new Joystick(opts);
  }

  var controller = null;

  var state = {
    x: {
      value: 0,
      previous: 0,
      zeroV: null,
    },
    y: {
      value: 0,
      previous: 0,
      zeroV: null,
    }
  };

  Board.Component.call(
    this, opts = Board.Options(opts)
  );

  if (opts.controller && typeof opts.controller === "string") {
    controller = Controllers[opts.controller.toUpperCase()];
  } else {
    controller = opts.controller;
  }

  if (controller == null) {
    controller = Controllers["ANALOG"];
  }

  Object.defineProperties(this, controller);

  if (!this.toAxis) {
    this.toAxis = opts.toAxis || function(raw) { return raw; };
  }

  priv.set(this, state);

  if (typeof this.initialize === "function") {
    this.initialize(opts, function(data) {
      var isChange = false;

      Object.keys(data).forEach(function(axis) {
        var value = data[axis];
        var sensor = state[axis];
        var zeroV = sensor.zeroV < 0 ? sensor.zeroV * -1 : sensor.zeroV;

        sensor.value = value + zeroV;

        if (this.x !== sensor.x) {
          sensor.x = this.x;
          isChange = true;
        }

        if (this.y !== sensor.y) {
          sensor.y = this.y;
          isChange = true;
        }
      }, this);

      this.emit("data", {
        x: state.x.value,
        y: state.y.value
      });

      if (isChange) {
        this.emit("change", {
          x: state.x.value,
          y: state.y.value
        });
      }
    }.bind(this));
  }

  Object.defineProperties(this, {
    hasAxis: {
      value: function(axis) {
        return state[axis] ? typeof state[axis].value !== "undefined" : false;
      }
    },
    x: {
      get: function() {
        return this.toAxis(state.x.value);
      }
    },
    y: {
      get: function() {
        return this.toAxis(state.y.value);
      }
    }
  });
}

util.inherits(Joystick, Emitter);

module.exports = Joystick;
