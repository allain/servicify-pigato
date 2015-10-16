var Client = require('pigato').Client;
var Broker = require('pigato').Broker;
var Worker = require('pigato').Worker

module.exports = function(servicifyOptions) {
  function listen(opts) {
    var brokerAddress = 'tcp://' + opts.host + ':' + opts.port;

    return start(new Broker(brokerAddress)).then(function (broker) {
      broker.on('error', function(err) {
        console.error(err);
      });

      return {
        stop: stop.bind(null, broker)
      };
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
      return {
        invoke: function () {
          return invoke([].slice.call(arguments));
        },
        stop: function () {
          return stop(worker);
        }
      };
    });
  }

  function request(spec, args, requestOptions) {
    var opts = Object.assign({}, servicifyOptions, requestOptions, {
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
    request: request,
    name: 'pigato'
  };
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