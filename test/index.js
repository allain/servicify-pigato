var test = require('blue-tape');
var isPromise = require('is-promise');
var Servicify = require('servicify');

test('has proper simple api', function(t) {
  var pigatoDriver = require('..');
  t.equal(typeof pigatoDriver, 'function', 'exports a factory function');

  var driver = pigatoDriver({});
  t.equal(typeof driver, 'object', 'returned driver instance is an object');
  t.equal(typeof driver.listen, 'function', 'has listen method');
  t.equal(typeof driver.offer, 'function', 'has offer method');
  t.equal(typeof driver.call, 'function', 'has dispatch method');


  var offering = driver.offer({name: 'a', version: '1.0.0'}, function invoke() {
    t.fail('should not be called in this example');
  }, {host: '127.0.0.1', port: 2020});

  t.ok(isPromise(offering), 'offering should a Promise which resolves into a stopping function');
  return offering.then(function(stopper) {
    t.equal(typeof stopper, 'function');
    return stopper();
  });
});

test('supports the full lifecycle', function (t) {
  var servicify = new Servicify({
    driver: require('..')
  });

  t.equal(servicify.opts.driver.name, 'pigato', 'name of driver is exposed');

  return servicify.listen().then(function (server) {
    t.equal(typeof server, 'object', 'server is an object');
    t.equal(typeof server.stop, 'function', 'server.stop is a function');

    return servicify.offer('promise-identity').then(function (offering) {
      t.equal(typeof offering, 'object', 'offering is an object');
      t.equal(typeof offering.invoke, 'function', 'invoke is a function');
      t.equal(typeof offering.stop, 'function', 'stop is a function');

      var fn = servicify('promise-identity@~1.x.x');
      var value = Math.random();

      return fn(value).then(function (result) {
        t.equal(result, value, 'expected value to be the same');
      }).then(offering.stop);
    }).then(server.stop);
  });
});
