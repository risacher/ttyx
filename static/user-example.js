// This is an example of some things that you can do by placing code in static/user.js

window.onbeforeunload = confirmExit;
function confirmExit(e) {
  var dlogText = "You have attempted to leave this page. Are you sure?";
  // send a C-w here?

  e.returnvalue = dlogText;
  return dlogText;
}


if (window.ttyx) {
    ttyx.on('open', function() {

        window.sid = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
        
        var ttyx = window.ttyx;
        window.ttyx.socket.on('connect', function() {
            console.log('connect ',window.ttyx.socket.io.engine.transports);
            document.getElementById('help').innerHTML += "<p>" + window.ttyx.socket.io.engine.transports.join(', ');

            window.ttyx.socket.emit('session', sid);

            // open starter window
            var initial = new ttyx.Window();
            setTimeout(function(){initial.maximize();}, 1500);
        });
    });
}
