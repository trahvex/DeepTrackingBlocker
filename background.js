//Javascript que va detras del manifestjson

// esta funcion se ejecuta al ser instalado
chrome.runtime.onInstalled.addListener(

    //meter aqui una url de bienvenida o algo sabes

);

var model;
//cargar modelo al iniciar navegador
chrome.runtime.onStartup.addListener(
    function() {
        console.log("HOLAAAAAAAAa");
        model = tf.loadLayersModel('./modelo_tfjs/model.json');
        console.log(model);
    }
);

//change badge color (badge shows the number of suspicious url blocked on a website)
chrome.browserAction.setBadgeBackgroundColor({color:'#FF5733'});



// ############################################## FUNCIONES PARA EL MODELO ##############################################

//needed for the model
async function processModel(){
    model = await tf.loadLayersModel('./modelo_tfjs/model.json');
    //model.summary();
}
processModel();

//load dictionary for preprocessing
jQuery.getJSON("dict_url_raw.json", function(json) {
    dict = json
    //al caracter que tiene el 0 asignado como traduccion se lo cambiamos para que no interfiera con el padding, se le da el valor de dict.length que es el immediatamente mas peque siguiente
    for (var key in dict) {
        if (dict.hasOwnProperty(key) && dict[key] == 0) {
            dict[key] = Object.keys(dict).length;
        }
    }
});


//procesa el resultado del modelo pa retornar un int
function processResult(data){
    data = data.reshape([2]);
    data = data.argMax(); //aqui tiene el valor que toca pero sigue siendo un tensor
    return data.arraySync();
}



// Here we will save tabId, tab url, number of blocked url and its lists
var tabsInfo = new Map();
var dict;


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

// ############################################## REQUEST PROCESSING ##############################################
chrome.webRequest.onBeforeRequest.addListener(
    function(details){ //this is a callback function executed when details of the webrequest are available

        const request_url = details.url;
        const idTab = details.tabId;

        if(idTab >= 0 && !tabsInfo.has(idTab)){
            newInfo(idTab);
        }


        let suspicious = 0;

        //######################### URL PREPROCESSING #########################

        //convertimos la url de string a array de caracteres
        const url_array = Array.from(request_url);

        //traducimos la url de caracteres a numeros segun el diccionario creado por la notebook (esta depende de la base de datos que utiliza para el training)
        for (i=0; i < url_array.length; i++){
            if(dict.hasOwnProperty(url_array[i]))
                url_array[i]=dict[url_array[i]];
        }

        //padding a la izquierda
        padded_url_array = Array(200).fill(0).concat(url_array).slice(url_array.length);


        //######################### INFERENCE TASK #########################
        if(model != undefined) {
            suspicious = processResult(model.predict(tf.tensor(padded_url_array,[1, 200])));
        }

        console.log("URL:", request_url, " y es:", suspicious);

        //return;
        if (suspicious) {
            chrome.tabs.get(idTab,
                function(tab) {
                    chrome.browserAction.setBadgeText(
                        {tabId: idTab, text: ((++tabsInfo.get(idTab)[2]).toString())}
                    );
                    tabsInfo.get(idTab)[3].push(request_url);
                }
            );
            //console.log(tabsInfo);
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
        //console.log(tabsInfo);
        tabsInfo.delete(tabId);
    }
)
