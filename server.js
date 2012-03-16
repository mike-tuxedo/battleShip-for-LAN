var clientSocket;
var enemyIP; // diese IP wird gesetzt wenn ich an eine bestimmte adressse schicke
var listenToSpecialIP = false; //wenn ich eine Konkrete Spielanfrage schicke, will ich nur Nachrichten von dem einen Gegner erhalten (accepted oder declined). Ganz unten beim UDP-Empfang wird diese Variabel auf True/False geprüft und schickt nur nachrichten weiter die eine bestimmte IP haben.
var setSocketIO = false; //wird gesetzt wenn der Browser die html aufmacht also mit socketio connected
var open = true;

//UDP-Socket für externe Daten
var dgram = require("dgram");
var udpSocket = dgram.createSocket("udp4");

//udpSocket.setBroadcast(true);

//TCP-Socket für interne Daten
var http = require('http');
var tcpServer = http.createServer(function(request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });
});
var io = require('socket.io');

udpSocket.bind(1234);
tcpServer.listen(8080); //dieser Port muss gleich sein wie in der HTML

//io for data to send to the browser
var socket = io.listen(tcpServer);

//Ausgabe bei Verbindungsaufbau
udpSocket.on("listening", function () {
  var address = udpSocket.address();
  console.log("server listening " + address.address + ":" + address.port);
});

//-----------------------bis hier hat sich nicht viel geändert, aber jetzt dann ;) ---------------------------------------------



//message vom browser als UDP Broadcast weiterleiten
socket.sockets.on('connection', function(client) {
  setSocketIO = true;
  clientSocket = client;
  
  //meine Broadcastsendung wird hier weitergeleitet
  clientSocket.on('message', function(message) {      
    var message1 = new Buffer(message);
    udpSocket.send(message1, 0, message1.length, 1234, "255.255.255.255", function(err, bytes) {});
  });
  
  //Nachrichten an eine bestimmte Adresse
  clientSocket.on('requestToEnemy', function(message, ip) {
    listenToSpecialIP = true;
    enemyIP = ip;
    //ip = '255.255.255.255';
    
    var message1 = new Buffer(message);
    udpSocket.send(message1, 0, message1.length, 1234, ip, function(err, bytes) {});
    
    //clientSocket.emit('message', message + ';' + ip); //bei aktiviert bekomm ich die eigene accept meldung -> timerproblem
  });
  
  //Broadcastboolean reset
  clientSocket.on('resetSpecialIP', function() {
    listenToSpecialIP = false;
  });
  
  clientSocket.on('stopListening', function(){
    open = false;
  });
  
  clientSocket.on('continueListening', function(){
    open = true;
  });
});





//Eingehende Nachrichten werden an Konsole und an Browser geschickt
udpSocket.on("message", function (msg, rinfo) {
  console.log("server got: " + msg + " from " +  rinfo.address + ":" + rinfo.port);
  
  if(setSocketIO == true && open == true || msg == "mmtships:alive")
  {
    if(listenToSpecialIP) //derzeit nur false, in Zeile 49 ausgekommentiert, da haperts noch
    {
      if(String(rinfo.address) == enemyIP)  // !!!! '255.255.255.255' unbedingt auf enemyIP in er FH setzen !!!
        clientSocket.emit('message', String(msg) + ';' + String(rinfo.address));
    }
    else//wenn noch keine connection zw. Browser und ioSocket besteht, bringen hereinkommende Broadcast einen Fehler, da clientSocket noch nicht gesetzt ist. !!! Das waren die kurzen Ausfälle die wir hatten !!!
      clientSocket.emit('message', String(msg) + ';' + String(rinfo.address));
  }
});
