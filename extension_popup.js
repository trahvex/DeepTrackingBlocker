

var port = chrome.extension.connect({
     name: "Sample Communication"
});

port.postMessage("Hi BackGround");

port.onMessage.addListener(function(msg) {
    //actualiza la lista de urls bloqueadas en el popup
     for (var key in msg) {
        if (msg.hasOwnProperty(key)) {
            var element = document.createElement('li');
            element.appendChild(document.createTextNode(msg[key]));
            document.getElementById('lista_blocked_urls').appendChild(element);
        }
    }

});
