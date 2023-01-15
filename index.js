$( document ).ready(async function() {
    var config = (await fetch("config.json")).json();
	alert(JSON.stringify(config));
});