//Javascript que va detras del manifestjson
//############################################## GLOBAL VARIABLES ##############################################
var model;
var dict;
// Here we will save tabId, tab url, number of blocked url and its lists
var tabsInfo = new Map();
loadModel();
load_dict();

//function to create a new entry for tabsInfo
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


//change badge color (badge shows the number of suspicious url blocked on a website)
chrome.browserAction.setBadgeBackgroundColor({color:'#FF5733'});

//############################################## LISTENERS ##############################################
// esta funcion se ejecuta al ser instalado
chrome.runtime.onInstalled.addListener(
    function(){
        //meter aqui una url de bienvenida o algo sabes
        loadModel();
        load_dict();
    }
);


//cargar modelo al iniciar navegador
chrome.runtime.onStartup.addListener(
    function() {
        loadModel();
        load_dict();
    }
);


// ############################################## FUNCIONES PARA EL MODELO ##############################################

//Load DNN model
async function loadModel(){
    model = await tf.loadLayersModel('./model_tfjs/model.json');
    //model.summary();
}

//load dictionary for preprocessing
async function load_dict(){
    await jQuery.getJSON("dict_url_raw.json", function(json) {
        dict = json
        //al caracter que tiene el 0 asignado como traduccion se lo cambiamos para que no interfiera con el padding, se le da el valor de dict.length que es el immediatamente mas peque siguiente
        for (var key in dict) {
            if (dict.hasOwnProperty(key) && dict[key] == 0) {
                dict[key] = Object.keys(dict).length;
            }
        }
    });
}

//######################### URL PREPROCESSING #########################

function url_preprocessing(url){
    //convertimos la url de string a array de caracteres
    const url_array = Array.from(url);

    //traducimos la url de caracteres a numeros segun el diccionario creado por la notebook (esta depende de la base de datos que utiliza para el training)
    for (i=0; i < url_array.length; i++){
        if(dict != undefined && dict.hasOwnProperty(url_array[i]))
            url_array[i]=dict[url_array[i]];
    }

    //padding a la izquierda
    return Array(200).fill(0).concat(url_array).slice(url_array.length);
}


//######################### INFERENCE TASK #########################
//With a processed url returns an int to say if it has to be blocked or not
function processResult(prepro_url){
    let result = model.predict(tf.tensor(prepro_url,[1, 200]));
    result = result.reshape([2]);
    result = result.argMax(); //aqui tiene el valor que toca pero sigue siendo un tensor
    return result.arraySync(); //Returns the tensor data as a nested array, as it is one value, it returns one int
}

function updateTabInfo (idTab, request_url){
    chrome.tabs.get(idTab,
        function(tab) {
            chrome.browserAction.setBadgeText(
                {tabId: idTab, text: ((++tabsInfo.get(idTab)[2]).toString())}
            );
            tabsInfo.get(idTab)[3].push(request_url);
        }
    );
}



// ############################################## REQUEST PROCESSING ##############################################
chrome.webRequest.onBeforeRequest.addListener(
    function(details){ //this is a callback function executed when details of the webrequest are available

        const request_url = details.url;
        const idTab = details.tabId;

        if(idTab >= 0 && !tabsInfo.has(idTab)){
            newInfo(idTab);
        }


        let suspicious = 0;

        let prepro_url = url_preprocessing(request_url);


        if(model != undefined) {
            suspicious = processResult(prepro_url);
        }

        console.log("URL:", request_url, " y es:", suspicious);

        //if it is classified as tracking, is added to tab info
        if (suspicious && tabsInfo.has(idTab)) {
            updateTabInfo(idTab,request_url);
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
        current_tab = activeInfo.tabId;
        if(tabsInfo.has(activeInfo.tabId)){
            return;
        }
        newInfo(activeInfo.tabId);
    }
);


var current_tab;

//on updated tab, creates new tabInfo when page is reloaded or url is changed
chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo){
        if(changeInfo.status == "loading" && tabsInfo.has(tabId)){
            current_tab = tabId;
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
        //console.log(tabsInfo);
        tabsInfo.delete(tabId);
    }
)


// ############################################## CONNECTIONS WITH POPUP ##############################################

chrome.extension.onConnect.addListener(function(port) {
     console.log("Connected .....");
     port.onMessage.addListener(function(msg,sender) {
         console.log("message recieved: " + msg, tabsInfo.get(current_tab)[3]);
         port.postMessage(tabsInfo.get(current_tab)[3]);
     });
})
