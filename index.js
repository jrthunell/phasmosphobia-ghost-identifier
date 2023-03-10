var config;
var ghostTable;
var ghostRowTemplate;
var standardEvidenceElement;
var standardEvidenceTemplate;

var game = {
	gameSettings: {
		"piecesOfEvidence": 0
	},
	ghosts: [],
	standardEvidence: []
}

$( document ).ready(async function() {
    config = await (await fetch("config.json")).json();
	ghostTable = document.getElementById("ghost-template");
	ghostRowTemplate = ghostTable.innerHTML;
	for(var ghost in config.ghostTypes){
		game.ghosts[ghost] = 1;
	}
	
	standardEvidenceElement = document.getElementById("standard-evidence-template");
	standardEvidenceTemplate = standardEvidenceElement.innerHTML;
	for(var evidence of config.standardEvidence){
		game.standardEvidence[evidence] = "maybe";
	}
	
	loadOtherEvidence();
	
	refreshGameSettings(game.gameSettings);
	refreshStandardEvidence(game.standardEvidence);
	refreshOtherEvidence();
	refreshPage();
});

function refreshPage(){
	if(!config)
		return;
	
	
	calculateGhostProbabilities();
	refreshGhostTable(game.ghosts);
}

function refreshGameSettings(gameSettings){
	var piecesOfEvidenceOptions = [0,1,2,3];
	for(piecesOfEvidence of piecesOfEvidenceOptions){
		document.getElementById("pieces-of-evidence-button-" + piecesOfEvidence).className = "btn btn-secondary";
	}
	document.getElementById("pieces-of-evidence-button-" + gameSettings.piecesOfEvidence).className = "btn btn-primary";
}

function refreshStandardEvidence(standardEvidence){
	standardEvidenceElement.innerHTML = "";
	var standardEvidenceHTML = "";
	for(evidence in standardEvidence){
		// in 0-evidence runs, the only standard evidence available is ghost orbs (if the ghost is a mimic)
		if(game.gameSettings.piecesOfEvidence == 0 && evidence != "Ghost Orb"){
			game.standardEvidence[evidence] = "maybe";
			continue;
		}
		standardEvidenceHTML += standardEvidenceTemplate
			.replaceAll("$name", evidence);
	}
	standardEvidenceElement.innerHTML = standardEvidenceHTML;
	for(evidence in standardEvidence){
		var yesElem = document.getElementById(evidence + "-button-yes");
		if(yesElem && game.standardEvidence[evidence] == "yes"){
			yesElem.checked = true;
			yesElem.className = "btn btn-success btn-sm active";
		}
		
		var maybeElem = document.getElementById(evidence + "-button-maybe");
		if(maybeElem && game.standardEvidence[evidence] == "maybe"){
			maybeElem.checked = true;
			maybeElem.className = "btn btn-warning btn-sm active";
		}
		
		var noElem = document.getElementById(evidence + "-button-no");
		if(noElem && game.standardEvidence[evidence] == "no"){
			noElem.checked = true;
			noElem.className = "btn btn-danger btn-sm active";
		}
	}
}

function refreshGhostTable(ghosts){
	ghostTable.innerHTML = "";
	var ghostRows = ""
	var totalGhostProbabilityScores = Object.values(ghosts).reduce((acc, x)=>acc+x, 0);
	for(var name in ghosts){
		var probability = (ghosts[name] / totalGhostProbabilityScores * 100).toFixed(2);
		ghostRows += ghostRowTemplate.replace("$name", name).replace("$probability", probability);
	}
	ghostTable.innerHTML = ghostRows;
}

function setPiecesOfEvidence(piecesOfEvidence){
	game.gameSettings.piecesOfEvidence = piecesOfEvidence;
	refreshStandardEvidence(game.standardEvidence)
	refreshGameSettings(game.gameSettings);
	refreshPage();
}

function calculateGhostProbabilities(){
	// reset probabilities
	for(ghost in game.ghosts){
		game.ghosts[ghost] = 1;
	}
	
	// calculate based on standard evidence
	for(standardEvidence in game.standardEvidence){
		if(game.standardEvidence[standardEvidence] == "yes"){
			if(standardEvidence == "Ghost Orb" && game.gameSettings.piecesOfEvidence == 0){
				// if a ghost orb was found on a zero evidence run, it has to be a mimic
				for(ghost in game.ghosts){
					if(ghost != "The Mimic"){
						game.ghosts[ghost] = 0;
					}
				}
			}
			// this evidence was found, remove all ghosts that don't have it 
			for(ghost in game.ghosts){
				if(!config.ghostTypes[ghost].evidence.includes(standardEvidence)){
					game.ghosts[ghost] = 0;
				}
			}
		} else if(game.standardEvidence[standardEvidence] == "no" && game.gameSettings.piecesOfEvidence == 3){
			// this evidence was ruled out, remove all ghosts that have it
			for(ghost in game.ghosts){
				if(config.ghostTypes[ghost].evidence.includes(standardEvidence)){
					game.ghosts[ghost] = 0;
				}
			}
		} else if(game.standardEvidence[standardEvidence] == "no" && standardEvidence == "Ghost Orb" && game.gameSettings.piecesOfEvidence == 0){
			// if ghost orbs were ruled out on a 0-evidence run, it's most likely not the mimic
			game.ghosts["The Mimic"] /= 10;
		}
	}
	
	calculateOtherEvidenceGhostProbabilities();
	
	game.ghosts = sortObjectByValues(game.ghosts);
}

function calculateOtherEvidenceGhostProbabilities(){
	for(group in game.otherEvidence){
		for(name in game.otherEvidence[group]){
			var evidence = game.otherEvidence[group][name];
			switch(evidence.type){
				case "boolean":
					calculateBooleanEvidenceProbabilities(group, name);
					break;
				case "counter":
					calculateCounterEvidenceProbabilities(group, name);
					break;
			}
		}
	}
}

function calculateBooleanEvidenceProbabilities(group, name){
	var evidenceConfig = config.otherEvidence[group].filter(x => x.name == name)[0]
	var gameEvidence = game.otherEvidence[group][name];
	
	var totalGhostProbabilityScores = Object.values(game.ghosts).reduce((acc, x)=>acc+x, 0);
	
	if(gameEvidence.state == "yes"){
		for(ghost in evidenceConfig.trueProbabilities){
			if(ghost == "others")
				continue;
			// if there is a probability defined for this ghost, update accordingly
			game.ghosts[ghost] = (evidenceConfig.trueProbabilities[ghost] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) * 100;
		}
		for(ghost in game.ghosts){
			if(evidenceConfig[ghost] && evidenceConfig[ghost].trueProbabilities) continue;
			// use the "others" field for all other ghosts
			game.ghosts[ghost] = (evidenceConfig.trueProbabilities["others"] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) * 100;
		}
	} else if (gameEvidence.state == "no"){
		for(ghost in evidenceConfig.falseProbabilities){
			if(ghost == "others")
				continue;
			// if there is a probability defined for this ghost, update accordingly
			game.ghosts[ghost] = (evidenceConfig.falseProbabilities[ghost] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) * 100;
		}
		for(ghost in game.ghosts){
			if(evidenceConfig[ghost] && evidenceConfig.falseProbabilities[ghost]) continue;
			// use the "others" field for all other ghosts
			game.ghosts[ghost] = (evidenceConfig.falseProbabilities["others"] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) * 100;
		}
	}
}

function calculateCounterEvidenceProbabilities(group, name){
	var evidenceConfig = config.otherEvidence[group].filter(x => x.name == name)[0]
	var gameEvidence = game.otherEvidence[group][name];
	
	var totalGhostProbabilityScores = Object.values(game.ghosts).reduce((acc, x)=>acc+x, 0);
	for(var i = 0; i < gameEvidence.count; i++){
		var numGhosts = Object.keys(game.ghosts).length; // 24
		var probabilityOfEvent = (numGhosts - Object.keys(evidenceConfig.probabilities).length + 1) * evidenceConfig.probabilities['others']; 
		for(ghost in evidenceConfig.probabilities){
			if(ghost == "others") continue;
			probabilityOfEvent += evidenceConfig.probabilities[ghost];
		}
		probabilityOfEvent /= numGhosts;
		probabilityOfEvent /= 100; // 0.4875
		
		for(ghost in evidenceConfig.probabilities){
			if(ghost == "others")
				continue;
			// if there is a probability defined for this ghost, update accordingly
			// 0.2 * 1 / .4875
			game.ghosts[ghost] = (evidenceConfig.probabilities[ghost] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) / probabilityOfEvent * 100;
		}
		for(ghost in game.ghosts){
			if(evidenceConfig[ghost] && evidenceConfig.probabilities[ghost]) 
				continue;
			// use the "others" field for all other ghosts
			game.ghosts[ghost] = (evidenceConfig.probabilities["others"] / 100) * (game.ghosts[ghost] / totalGhostProbabilityScores) / probabilityOfEvent * 100;
		}
	}		
}

function sortObjectByValues(obj) {
    items = Object.keys(obj).map(function(key) {
        return [key, obj[key]];
    });
    items.sort(function(first, second) {
		if(first[1] == second[1]){
			return first[0].localeCompare(second[0])
		}
        return second[1] - first[1];
    });
    sorted_obj={}
    $.each(items, function(k, v) {
        use_key = v[0]
        use_value = v[1]
        sorted_obj[use_key] = use_value
    })
    return(sorted_obj)
} 

function setStandardEvidence(evidence, value){
	game.standardEvidence[evidence] = value;
	refreshStandardEvidence(game.standardEvidence);
	refreshPage();
}

function loadOtherEvidence(){
	game.otherEvidence = {};
	for(group in config.otherEvidence){
		game.otherEvidence[group] = {};
		for(evidence of config.otherEvidence[group]){
			switch(evidence.type){
				case "boolean":
					game.otherEvidence[group][evidence.name] = {
						name: evidence.name,
						type: evidence.type,
						state: "maybe"
					};
					break;
				case "counter":
					game.otherEvidence[group][evidence.name] = {
						name: evidence.name,
						type: evidence.type,
						count: 0
					};
					break;
				default:
					console.log("unrecognized evidence type: " + evidence.type);
			}
		}
	}
}

function refreshOtherEvidence(){
	var evidenceCardsWrapper = document.getElementById("other-evidence-cards");
	evidenceCardsWrapper.innerHTML = "";
	var evidenceCardsHTML = "";
	for(group in game.otherEvidence){
		evidenceCardsHTML += createEvidenceGroupHTML(group);
	}
	evidenceCardsWrapper.innerHTML = evidenceCardsHTML;
	
	refreshBooleanEvidenceHTML();
	refreshCounterEvidenceHTML();
}

function createEvidenceGroupHTML(group){
	var template = document.getElementById("evidence-card-template").innerHTML;
	var bodyHTML = "";
	for(evidence of Object.values(game.otherEvidence[group])){
		switch(evidence.type){
			case "boolean":
				bodyHTML += createBooleanEvidenceHTML(group, evidence);
				break;
			case "counter":
				bodyHTML += createCounterEvidenceHTML(group, evidence);
				break;
			default:
				console.log("unrecognized evidence type: " + evidence.type);
		}
	}
	return template.replaceAll("$group", group).replaceAll("$body", bodyHTML);
}

function createBooleanEvidenceHTML(group, evidence){
	var template = document.getElementById("boolean-evidence-template").innerHTML;
	
	return template
		.replaceAll("$group", group)
		.replaceAll("$name", evidence.name)
		.replaceAll("$callbackFnArgs", "'" + group + "','" + evidence.name + "'");
}

function refreshBooleanEvidenceHTML(){
	for(group in game.otherEvidence){
		for(name in game.otherEvidence[group]){
			var evidence = game.otherEvidence[group][name];
			if(evidence.type != "boolean") continue;
			var yesElem = document.getElementById(group + "-" + evidence.name + "-button-yes");
			if(yesElem && game.otherEvidence[group][name].state == "yes"){
				yesElem.checked = true;
				yesElem.className = "btn btn-success btn-sm active";
			}
			
			var maybeElem = document.getElementById(group + "-" + evidence.name + "-button-maybe");
			if(maybeElem && game.otherEvidence[group][name].state == "maybe"){
				maybeElem.checked = true;
				maybeElem.className = "btn btn-warning btn-sm active";
			}
			
			var noElem = document.getElementById(group + "-" + evidence.name + "-button-no");
			if(noElem && game.otherEvidence[group][name].state == "no"){
				noElem.checked = true;
				noElem.className = "btn btn-danger btn-sm active";
			}
		}
	}
}

function refreshCounterEvidenceHTML(){
	for(group in game.otherEvidence){
		for(name in game.otherEvidence[group]){
			var evidence = game.otherEvidence[group][name];
			if(evidence.type != "counter") continue;
			var counterElem = document.getElementById(group + "-" + name + "-counter");
			counterElem.value = evidence.count;
		}
	}
}

function setBooleanEvidence(state, group, name){
	game.otherEvidence[group][name].state = state;
	refreshOtherEvidence();
	refreshPage();
}

function createCounterEvidenceHTML(group, evidence){
	var template = document.getElementById("counter-evidence-template").innerHTML;
	return template
		.replaceAll("$group", group)
		.replaceAll("$name", evidence.name)
		.replaceAll("$callbackFnArgs", "'" + group + "','" + evidence.name + "'")
}

function decrementCounter(group, name){
	if(game.otherEvidence[group][name].count > 0)
		game.otherEvidence[group][name].count--;
	refreshOtherEvidence();
	refreshPage();
}

function incrementCounter(group, name){
	game.otherEvidence[group][name].count++;
	refreshOtherEvidence();
	refreshPage();
}