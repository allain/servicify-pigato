var test = require('blue-tape');

var Servicify = require('servicify');

test('supports the full lifecycle', function(t) {
  var servicify = new Servicify({
    driver: require('..')
  });

  t.equal(servicify.opts.driver.name, 'pigato', 'name of driver is exposed');

  return servicify.listen().then(function(server) {
    t.equal(typeof server, 'object', 'server is an object');
    t.equal(typeof server.stop , 'function', 'server.stop is a function');

    return servicify.offer('promise-identity').then(function(offering) {
      t.equal(typeof offering, 'object', 'offering is an object');
      t.equal(typeof offering.invoke, 'function', 'invoke is a function');
      t.equal(typeof offering.stop, 'function', 'offering is a function');

      var fn = servicify('promise-identity@~1.x.x');
      var value = Math.random();
      return fn(value).then(function (result) {
        t.equal(result, value, 'expected value to be the same');
      }).then(offering.stop);
    }).then(server.stop);
  });
});