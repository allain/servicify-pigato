var Promise = require('native-promise-only');

var Client = require('pigato').Client;
var Broker = require('pigato').Broker;
var Worker = require('pigato').Worker;

var objectAssign = require('object-assign');

module.exports = function(servicifyOptions) {
  servicifyOptions = objectAssign({
    host: '127.0.0.1',
    port: 2020
  }, servicifyOptions);

  function listen(opts) {
    opts = objectAssign({}, servicifyOptions, opts);

    var brokerAddress = 'tcp://' + opts.host + ':' + opts.port;

    return start(new Broker(brokerAddress)).then(function (broker) {
      broker.on('error', function(err) {
        console.error(err);
      });

      return stop.bind(null, broker);
    });
  }

  function offer(spec, invoke, opts) {
    var worker = new Worker('tcp://' + opts.host + ':' + opts.port, spec.name + '@' + spec.version);

    worker.on('error', function(err) {
      console.error(err);
    });

    worker.on('request', function (inp, rep, opts) {
      invoke(inp.args, opts).then(function (result) {
        rep.end(result);
      }, function (err) {
        rep.error(err.message);
      });
    });

    return start(worker).then(function () {
      return stop.bind(null, worker);
    });
  }

  function call(spec, args, requestOptions) {
    var opts = objectAssign({}, servicifyOptions, requestOptions, {
      timeout: 10000
    });

    return new Promise(function (resolve, reject) {
      var client = new Client('tcp://' + opts.host + ':' + opts.port);
      client.once('start', resolve.bind(null, client));
      client.once('error', function(err) {
        reject(err);
      });
      client.start();
    }).then(function(client) {
      return new Promise(function (resolve, reject) {
        client.request(spec.name + '@' + spec.version, {args: args}, false, function (err, response) {
          stop(client).then(function () {
            return err ? reject(err) : resolve(response);
          });
        }, {timeout: opts.timeout});
      });
    });
  }

  return {
    listen: listen,
    offer: offer,
    call: call,
    name: 'pigato'
  };
};

module.exports.defaults = {
  host: '0.0.0.0',
  port: 2020
};

function start(startable) {
  return new Promise(function (resolve) {
    startable.once('start', resolve.bind(null, startable));
    startable.start();
  });
}

function stop(stoppable) {
  return new Promise(function (resolve) {
    stoppable.once('stop',  resolve.bind(null, stoppable));
    stoppable.stop();
  });
}