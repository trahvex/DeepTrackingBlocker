//Javascript que va detras del manifestjson

// esta funcion se ejecuta al ser instalado
chrome.runtime.onInstalled.addListener(

    //meter aqui una url de bienvenida o algo sabes

);

//cargar modelo al iniciar navegador
chrome.runtime.onStartup.addListener(
    function() {






    }
);

//change badge color (badge shows the number of suspicious url blocked on a website)
chrome.browserAction.setBadgeBackgroundColor({color:'#FF5733'});



// Here we will save tabId, tab url, number of blocked url and its lists
var tabsInfo = new Map();

function newInfo (tabId){
    chrome.tabs.get(tabId,
        function(tab) {
            let info = [
                tabId,
                tab.url,
                0,
                []
            ];
            tabsInfo.set(tabId,info);
        }
    );
}

// ############################################## REQUEST PROCESSING ##############################################

//este script deberia escuchar peticiones http y analizarlas
chrome.webRequest.onBeforeRequest.addListener(
    function(details){ //this is a callback function executed when details of the webrequest are available
        const request_url = details.url;
        const idTab = details.tabId;

        if(!tabsInfo.has(idTab)){
            newInfo(idTab);
        }

        let suspicious = false;
        //aqui se pasa el filtro supongamos (incluir preprocessing), if url is suspicious return suspicious = true;









        if (suspicious || request_url == 'https://dpz3v.aoscdn.com/web/webbuild/img/bg.a8a2.jpg') {
            chrome.tabs.get(idTab,
                function(tab) {
                    chrome.browserAction.setBadgeText(
                        {tabId: idTab, text: ((++tabsInfo.get(idTab)[2]).toString())}
                    );
                    tabsInfo.get(idTab)[3].push(request_url);
                }
            );

            console.log(tabsInfo);
            return {cancel: true};
        };
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
);



// ############################################## TABS LISTENERS ##############################################

//on activated tab, creates new tabInfo if tab visited is not registered
chrome.tabs.onActivated.addListener(
    function(activeInfo){

        if(tabsInfo.has(activeInfo.tabId)){
            return;
        }

        newInfo(activeInfo.tabId);
    }
);

//on updated tab, creates new tabInfo when page is reloaded or url is changed
chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo){
        if(changeInfo.status == "loading" && tabsInfo.has(tabId)){
            newInfo(tabId);
        }
        else{
            return;
        };

    }
);


//on removed, remove tabInfo when a tab is closed
chrome.tabs.onRemoved.addListener(
    function(tabId){
        if(!tabsInfo.has(tabId)){
            return;
        }
        tabsInfo.delete(tabId);
    }
)
