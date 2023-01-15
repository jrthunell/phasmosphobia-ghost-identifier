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
	
	
	refreshGameSettings(game.gameSettings);
	refreshStandardEvidence(game.standardEvidence);
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
		} else if(game.standardEvidence[standardEvidence] == "no"){
			// this evidence was ruled out, remove all ghosts that have it
			for(ghost in game.ghosts){
				if(config.ghostTypes[ghost].evidence.includes(standardEvidence)){
					game.ghosts[ghost] = 0;
				}
			}
		}
	}
	
	game.ghosts = sortObjectByValues(game.ghosts);
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