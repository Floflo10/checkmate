//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

var app = express(app);

//On récupère les fichiers static du répertoire actuel
app.use(express.static(__dirname));

//nous gardon les données des clients
var clients = {};

//get EurecaServer class
var EurecaServer = require('eureca.io').EurecaServer;

//création d'une instance EurecaServer
var eurecaServer = new EurecaServer({allow:['setId', 'spawnEnemy', 'kill', 'updateState']});

//on attache eureca.io sur notre serveur http
eurecaServer.attach(server);

//eureca.io fournit des évenements qui permet de détecter la connexion/déconnexion d'un client

//détection d'une connexion de client
eurecaServer.onConnect(function (conn) {
  console.log('Nouveau Client id=%s ', conn.id, conn.remoteAddress);

  //la method getClient fourni un proxy qui nous permet d'appeller les fonction clientes
  var remote = eurecaServer.getClient(conn.id);

  //enregistre le client
  clients[conn.id] = {id:conn.id, remote:remote}

  //appel de la methode setId définie côté client
  remote.setId(conn.id);
});

//détéction de la déconnexion d'un client
eurecaServer.onDisconnect(function (conn) {
  console.log('Client déconnecté ', conn.id);

  var removeId = clients[conn.id].id;

  delete clients[conn.id];

  for (var c in clients)
  {
    var remote = clients[c].remote;

    //ici on appel la methode kill() définie côté client
    remote.kill(conn.id);
  }
});

eurecaServer.exports.handshake = function()
{
  for (var c in clients)
  {
    var remote = clients[c].remote;
    for (var cc in clients)
    {
      //envoie de la dernière position connue
      var x = clients[cc].laststate ? clients[cc].laststate.x: 0;
      var y = clients[cc].laststate ? clients[cc].laststate.y: 0;

      remote.spawnEnemy(clients[cc].id, x, y);
    }
  }
}

//exposition du côté client
eurecaServer.exports.handleKeys = function (keys) {
  var conn = this.connection;
  var updatedClient = clients[conn.id];

  for (var c in clients)
  {
    var remote = clients[c].remote;
    remote.updateState(updateClient.id, keys);

    //on garde le dernier état connu et on l'envoie au nouveau client connecté
    clients[c].laststate = keys;
  }
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
