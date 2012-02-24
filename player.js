var socket = new io.connect('http://localhost:8080');
//var players = new Array(100);  //feature, jeder player soll nur einmal im playerfenster angezeigt werden
var myName = "";
var myStatus = 'waiting';
var entireMsg;
var enemyName;
var enemyIP;
var t;
var msgCounter = 0;
var alive;
var interval;

$(document).ready(function(){
  
  //löst die Nachricht auf und leitet ans Spiel weiter
  socket.on('message', function(message) {
      entireMsg = message;
      var msglength = message.length;
      var checkForGame = message.slice(0,8); //extract the name from "mmtships:name"
      var mainMsg = message.slice(9, msglength); //alles nach mmtships:
      var findDots = mainMsg.search(':'); // .search() gibt auch -1 zurück wenn er nichts findet

      var ipIndex = mainMsg.search(';');
      var actualIP = mainMsg.slice(ipIndex+1, mainMsg.length);
      var actualName; //der Name kann erst später ge-sliced werden, da noch nicht klar ist ob dahinter ein : oder ; ist

      $('#messagebox').prepend('<p> IP: ' + msgCounter + ' - ' + entireMsg + '</p><hr></hr>');

      if(checkForGame != 'mmtships') return; //irgend ein Broadcast wird sofort abgewimmelt

      //Nachricht von meinem Gegner?
      if(mainMsg.slice(0,12) == 'positionsset' || mainMsg.slice(0,10) == 'okyourturn' ||
        mainMsg.slice(0,4) == 'shot' || mainMsg.slice(0,3) == 'hit' || mainMsg.slice(0,4) == 'miss' ||
        mainMsg.slice(0,8) == 'nextturn' || mainMsg.slice(0,17) == 'allshipsdestroyed')
          orderToGame(entireMsg);

      //ok, nicht mein Gegner, also mal schaun wer das ist und was er will!
      if(findDots != -1)
      {
        actualName = mainMsg.slice(0,findDots);
        var enemyRes = mainMsg.slice(findDots+1, ipIndex);
        if(enemyRes == 'startgame')
          if(confirm(actualName + ' will mit dir spielen, du auch?')){
            myStatus = 'playing';
            enemyIP = actualIP;
            enemyName = actualName;
            socket.emit('requestToEnemy', 'mmtships:accepted', enemyIP); // !!!! enemyIP
            interval = setInterval("socket.emit('requestToEnemy', 'mmtships:alive', enemyIP)", 2000);
            gameStart();
          }
          else
            socket.emit('requestToEnemy', 'mmtships:declined', actualIP); // !!!! actualIP
      }
      else
      {
        if(mainMsg.slice(0, ipIndex) == 'accepted')
        {
          interval = setInterval("socket.emit('requestToEnemy', 'mmtships:alive', enemyIP)", 2000);
          clearTimeout(t);
          alive = setTimeout(function() {timeOut()}, 20000);
          gameStart();
        }
        else if(mainMsg.slice(0, ipIndex) == 'declined')
        {
          alert('Spieler hat abgelehnt');
          clearTimeout(t);
          timeOut(); //setzt noch den Broadcast wieder auf on
        }
        else if(mainMsg.slice(0, ipIndex) == 'alive')
        {
          clearTimeout(alive);
          alive = setTimeout(function() {timeOut()}, 20000);
        }
        else
          enemyToList(mainMsg.slice(0,ipIndex), actualIP);
      }
  });

  //Namen der Gegner in die Playerliste eintragen
  // !! und zur überprüfung ob schon vorhanden, später mal auch in ein Array eintragen
  function enemyToList(otherName, otherIP)
  {
      if(otherName != myName) {
        //Statusantwort
        var msg = 'mmtships:' + myName + ':' + myStatus;
        socket.emit('requestToEnemy', msg,otherIP); // !!!! STATT 255.255.255.255 otherIP
        //Eintrag in meine Liste
        $('#players').prepend('<p class="abc">' + otherName + ':' + otherIP + '</p>');
     }
  }




  //Broadcastanfrage schicken
  $('#button').click(function(event) {
      var msg = "mmtships:" + myName;
      socket.send(msg);
  });

  //Konkrete Anfrage senden | geil wär player + ip in hash eintragen, aber vorerst die einfache Variante
  $('.abc').live('click', function(event) {
      actualMsg = $(this).text();
      myStatus = 'playing';

      enemyName = actualMsg.slice(0,actualMsg.search(':'));

      enemyIP = actualMsg.slice(actualMsg.search(':')+1,actualMsg.length);
      var msg = 'mmtships:' + myName + ':startgame';
      socket.emit('requestToEnemy', msg, enemyIP); // !!!! STATT 255.255.255.255 enemyIP verwenden
      //starte timer 30s, bei incoming-message socket.emit('resetSpecialIP');
     // setTimeout("timeOut()", 3000);
     t = setTimeout(function() {timeOut()}, 5000);
  });

  function timeOut()
  {
      alert('Gegner antwortet nicht');
      myStatus = 'waiting';
      //socket.emit('resetSpecialIP');
  }

  function gameStart()
  {
    $('#mainblock').fadeIn('slow');
  }





  //Input wärend Spiel
  function orderToGame(message)
  {
    var msg = message.slice(0, message.search(';'));
    var yourturn = /okyourturn/;
    var positionsset = /positionsset/;
    
    if(positionsset.test(message))
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      var msg1 = 'mmtships:okyourturn:' + msgCounter;
      socket.emit('requestToEnemy', msg1, enemyIP);
      //startInterval = setInterval("socket.emit('requestToEnemy', msg1, enemyIP)",2000);
      $('#beginButton').fadeOut('slow');
      $("#playarea_0").fadeIn('slow');
      $("#header").fadeIn('slow');
      $("#set_game").fadeOut('slow');
    }
    else if(yourturn.test(message))
    {
      ALLOWED_TO_SHOOT = true;
      
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      clearInterval(startInterval);
    }
    else if(msg.slice(0, 13) == 'mmtships:shot')
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;

      clearInterval(startInterval);

      var x = msg.slice(14, 15);
      var y = msg.slice(16, 17);
      getShoot(x,y);
    }
    else if(msg.slice(0, 12) == 'mmtships:hit')
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      clearInterval(startInterval);
      
      getShootAnswer(true);
    }
    else if(msg.slice(0, 13) == 'mmtships:miss')
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      clearInterval(startInterval);
      
      getShootAnswer(false);
    }
    else if(msg.slice(0, 26) == 'mmtships:allshipsdestroyed')
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      clearInterval(startInterval);
      
      alert('You WIN!!!');
    }
    else if(msg.slice(0, 17) == 'mmtships:nextturn')
    {
      msgCounter = parseInt(msg.slice(msg.lastIndexOf(':')+1,msg.length));
      msgCounter++;
      
      clearInterval(startInterval);
      
      socket.emit('stopListening');
    }
  }
});
