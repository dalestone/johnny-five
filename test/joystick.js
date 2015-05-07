var MockFirmata = require("./util/mock-firmata"),
  five = require("../lib/johnny-five.js"),
  sinon = require("sinon"),
  Board = five.Board,
  Joystick = five.Joystick;

var io = new MockFirmata();
var board = new Board({
  io: io,
  debug: false,
  repl: false
});


exports["Joystick -- Analog"] = {

  setUp: function(done) {

    this.clock = sinon.useFakeTimers();
    this.analogRead = sinon.spy(MockFirmata.prototype, "analogRead");
    this.stick = new Joystick({
      pins: ["A0", "A1"],
      freq: 100,
      board: board
    });

    this.instance = [{
      name: "hasAxis",
    }, {
      name: "x"
    }, {
      name: "y"
    }];

    done();
  },

  tearDown: function(done) {
    this.analogRead.restore();
    this.clock.restore();
    done();
  },

  shape: function(test) {
    test.expect(this.instance.length);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.stick[property.name], "undefined");
    }, this);

    test.done();
  },

  data: function(test) {
    var x = this.analogRead.args[0][1];
    var y = this.analogRead.args[1][1];
    var spy = sinon.spy();

    test.expect(2);

    this.stick.on("data", spy);

    x(512);
    y(560);

    this.clock.tick(200);

    test.ok(spy.calledOnce);
    test.deepEqual(spy.args[0], [{
      x: 512,
      y: 560
    }]);

    test.done();
  },

  change: function(test) {
    test.expect(10);

    var spy = sinon.spy();
    var x = this.stick.io.analogRead.args[0][1];
    var y = this.stick.io.analogRead.args[1][1];

    this.stick.on("change", spy);


    // FIRST -----------------------------------


    x(1023);
    this.clock.tick(100);

    y(1023);
    this.clock.tick(100);

    test.equal(Math.round(this.stick.x), 1);
    test.equal(Math.round(this.stick.y), 1);

    // SECOND -----------------------------------

    x(512);
    this.clock.tick(100);

    y(512);
    this.clock.tick(100);

    test.equal(Math.round(this.stick.x), 0);
    test.equal(Math.round(this.stick.y), 0);


    // THIRD -----------------------------------

    x(0);
    this.clock.tick(100);

    y(0);
    this.clock.tick(100);

    test.equal(Math.round(this.stick.x), -1);
    test.equal(Math.round(this.stick.y), -1);


    // -----------------------------------

    test.equal(spy.callCount, 3);

    test.deepEqual(spy.args[0], [{
      x: 1023,
      y: 1023
    }]);

    test.deepEqual(spy.args[1], [{
      x: 512,
      y: 512
    }]);

    test.deepEqual(spy.args[2], [{
      x: 0,
      y: 0
    }]);


    test.done();

  },
};

exports["Joystick -- ESPLORA"] = {

  setUp: function(done) {

    this.clock = sinon.useFakeTimers();
    this.analogRead = sinon.spy(MockFirmata.prototype, "analogRead");
    this.stick = new Joystick({
      controller: "ESPLORA",
      freq: 100,
      board: board
    });

    this.instance = [{
      name: "hasAxis",
    }, {
      name: "x"
    }, {
      name: "y"
    }];

    done();
  },

  tearDown: function(done) {
    this.analogRead.restore();
    this.clock.restore();
    done();
  },

  shape: function(test) {
    test.expect(this.instance.length);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.stick[property.name], "undefined");
    }, this);

    test.done();
  },

  data: function(test) {
    test.expect(2);

    var spy = sinon.spy();

    this.stick.on("data", spy);

    var x = this.stick.io.analogRead.args[0][1];

    // This is REQUIRED for y to exist
    x(1023);

    this.clock.tick(10);

    var y = this.stick.io.analogRead.args[1][1];

    y(1023);

    this.clock.tick(10);

    test.equal(spy.callCount, 1);

    test.deepEqual(spy.args[0], [{
      x: 1023,
      y: 1023
    }]);

    test.done();
  },

  change: function(test) {
    test.expect(10);

    var spy = sinon.spy();

    this.stick.on("change", spy);


    // FIRST -----------------------------------

    var x = this.stick.io.analogRead.args[0][1];

    // This is REQUIRED for y to exist
    x(1023);

    this.clock.tick(10);

    var y = this.stick.io.analogRead.args[1][1];

    y(1023);

    this.clock.tick(10);

    test.equal(Math.round(this.stick.x), 1);
    test.equal(Math.round(this.stick.y), 1);

    // SECOND -----------------------------------

    x = this.stick.io.analogRead.args[2][1];

    // This is REQUIRED for y to exist
    x(512);

    this.clock.tick(10);

    y = this.stick.io.analogRead.args[3][1];

    y(512);

    this.clock.tick(10);

    test.equal(Math.round(this.stick.x), 0);
    test.equal(Math.round(this.stick.y), 0);

    // THIRD -----------------------------------

    x = this.stick.io.analogRead.args[2][1];

    // This is REQUIRED for y to exist
    x(0);

    this.clock.tick(10);

    y = this.stick.io.analogRead.args[3][1];

    y(0);

    this.clock.tick(10);

    test.equal(Math.round(this.stick.x), -1);
    test.equal(Math.round(this.stick.y), -1);

    // -----------------------------------

    test.equal(spy.callCount, 3);

    test.deepEqual(spy.args[0], [{
      x: 1023,
      y: 1023
    }]);

    test.deepEqual(spy.args[1], [{
      x: 512,
      y: 512
    }]);

    test.deepEqual(spy.args[2], [{
      x: 0,
      y: 0
    }]);


    test.done();
  },
};
