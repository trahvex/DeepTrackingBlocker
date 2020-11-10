function create_host_section(host){
    let div = document.createElement("div");
    div.id = host;

    let sectionTitle = document.createElement("h3");
    sectionTitle.appendChild(document.createTextNode("Host: " + host));
    div.appendChild(sectionTitle);

    let label_host = document.createElement("label");
    let checkbox_host = document.createElement("input");
    checkbox_host.type = "checkbox";    // make the element a checkbox
    checkbox_host.name = host + "checkbox";      // give it a name we can check on the server side
    checkbox_host.value = host;
    //checkbox.checked = item.check;
    label_host.appendChild(checkbox_host);   // add the box to the element
    sectionTitle.appendChild(label_host);

    document.getElementById('blocked_urls').appendChild(div);
}


function createURLCheckbox(item){
    // create the necessary elements
    let label= document.createElement("label");
    //let description = document.createTextNode(item.url);
    let checkbox = document.createElement("input");

    checkbox.type = "checkbox";    // make the element a checkbox
    checkbox.name = "checkbox:"+ item.url;      // give it a name we can check on the server side
    checkbox.value = item.url;         // make its value "pair"
    checkbox.checked = item.check;

    label.appendChild(checkbox);   // add the box to the element
    label.appendChild(document.createTextNode(item.url)); // add the description to the element
    label.appendChild(document.createElement("br"));

    // add the label element to your div
    document.getElementById(item.host).appendChild(label);

    checkbox.addEventListener( 'change', function() {
    if(this.checked) {
        chrome.extension.sendRequest({method: 'add_exception', data: checkbox.value}, function(response) {});
    } else {
        chrome.extension.sendRequest({method: 'delete_exception', data: checkbox.value}, function(response) {});
    }
});
};

function get_blocked_urls(){
    chrome.extension.sendRequest({method: 'get_blocked_urls'}, function(response) {
        if(response && response.length > 0){
            let host_array = [];
            for (let i in response){//blocked urls are divided by sections
                url = response[i];
                if(!host_array.includes(url.host)){
                    host_array.push(url.host);
                    create_host_section(url.host);
                }
                createURLCheckbox(url);
            }
        }
        else{
            document.getElementById('blocked_urls').appendChild(document.createTextNode("There are no blocked urls in this tab"));
        }
	});
}

// Add listener to receive messages from background page
//chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
//	switch (request.method)
//	{
//	}
//});

// Run our script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {

	get_blocked_urls();

	// Attach onclick event to button
	//$("#add-ten-to-ticker").click( function() {
	//	localTicker.addToTicker(10);
	//});
});
