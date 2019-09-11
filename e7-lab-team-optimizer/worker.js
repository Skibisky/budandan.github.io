function compareScores(a, b) {
    if (a.score > b.score)
        return -1;
    if (a.score < b.score)
        return 1;
    return 0;
}

function determineBestChatOptionsFromTeam(allHeroes, team) {
    let hero1 = allHeroes.filter(function (hero) {
        return hero.name === team[0];
    });
    let hero2 = allHeroes.filter(function (hero) {
        return hero.name === team[1];
    });
    let hero3 = allHeroes.filter(function (hero) {
        return hero.name === team[2];
    });
    let hero4 = allHeroes.filter(function (hero) {
        return hero.name === team[3];
    });

    let arrOfScoreObj = [];
    let scoreObjA1 = {
        option: hero1[0].chat1,
        hero: hero1[0],
        score: 0
    };
    let scoreObjA2 = {
        option: hero1[0].chat2,
        hero: hero1[0],
        score: 0
    };
    let scoreObjB1 = {
        option: hero2[0].chat1,
        hero: hero2[0],
        score: 0
    };
    let scoreObjB2 = {
        option: hero2[0].chat2,
        hero: hero2[0],
        score: 0
    };
    let scoreObjC1 = {
        option: hero3[0].chat1,
        hero: hero3[0],
        score: 0
    };
    let scoreObjC2 = {
        option: hero3[0].chat2,
        hero: hero3[0],
        score: 0
    };
    let scoreObjD1 = {
        option: hero4[0].chat1,
        hero: hero4[0],
        score: 0
    };
    let scoreObjD2 = {
        option: hero4[0].chat2,
        hero: hero4[0],
        score: 0
    };
    arrOfScoreObj.push(scoreObjA1);
    arrOfScoreObj.push(scoreObjA2);
    arrOfScoreObj.push(scoreObjB1);
    arrOfScoreObj.push(scoreObjB2);
    arrOfScoreObj.push(scoreObjC1);
    arrOfScoreObj.push(scoreObjC2);
    arrOfScoreObj.push(scoreObjD1);
    arrOfScoreObj.push(scoreObjD2);

    arrOfScoreObj.forEach(function (optionObj) {
        let score = 0;
        score += hero1[0][optionObj.option];
        score += hero2[0][optionObj.option];
        score += hero3[0][optionObj.option];
        score += hero4[0][optionObj.option];
        score -= optionObj.hero[optionObj.option];
        optionObj.score = score;
    });

    arrOfScoreObj.sort(compareScores);

    while (arrOfScoreObj[0].option == arrOfScoreObj[1].option) {
        arrOfScoreObj.splice(1, 1);
    }

    let optimalCampForTeam = {
        team: team,
        bestChatOption1: arrOfScoreObj[0],
        bestChatOption2: arrOfScoreObj[1],
        score: arrOfScoreObj[0].score + arrOfScoreObj[1].score
    };

    return optimalCampForTeam;
}

function k_combinations(set, k) {
    var i, j, combs, head, tailcombs;
    if (k > set.length || k <= 0) {
        return [];
    }
    if (k == set.length) {
        return [set];
    }
    if (k == 1) {
        combs = [];
        for (i = 0; i < set.length; i++) {
            combs.push([set[i]]);
        }
        return combs;
    }
    combs = [];
    for (i = 0; i < set.length - k + 1; i++) {
        head = set.slice(i, i + 1);
        tailcombs = k_combinations(set.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}

doStuff = false;
minScore = 0;
data = null;
icount = 0;
arrOfPossibleTeams = null;
currentRosterOfSIDs = null;
arrOfOutcomes = [];
arrOfPossibleTeamsContainingLockedHeroes = [];
function doWork() {
    if (data.lockedHeroes.length == 0) {
        for (var i = 0; i < 10; i++) {
            let result = determineBestChatOptionsFromTeam(data.allHeroes, arrOfPossibleTeams[icount]);
            if (result.score > minScore) {
                arrOfOutcomes.push(result);
                self.postMessage(result);
            }
            if (!doStuff)
                return;
                
            icount++;
            if (icount >= arrOfPossibleTeams.length)
                break;
        }
        
        if (icount < arrOfPossibleTeams.length){
            //this.setTimeout(doWork, 1);
        }
    } else {
        let lockedHeroesSIDs = data.lockedHeroes.map(hero => hero.Name);
        for (var j = 0; j < arrOfPossibleTeams.length; j++) {
            let containsAllHeroes = true;
            for (var k = 0; k < lockedHeroesSIDs.length; k++) {
                if (!arrOfPossibleTeams[j].includes(lockedHeroesSIDs[k])) {
                    containsAllHeroes = false;
                }
            }
            if (containsAllHeroes) {
                arrOfPossibleTeamsContainingLockedHeroes.push(arrOfPossibleTeams[j]);
            }
            if (!doStuff)
                return;
                
        }
        arrOfPossibleTeams = arrOfPossibleTeamsContainingLockedHeroes;
        for (var i = 0; i < 10; i++) {
            let result = determineBestChatOptionsFromTeam(data.allHeroes, arrOfPossibleTeams[icount]);
            if (result.score > minScore) {
                arrOfOutcomes.push(result);
                self.postMessage(result);
            }
            if (!doStuff)
                return;
            icount++;
            if (icount >= arrOfPossibleTeams.length)
                break;
        }
        if (icount < arrOfPossibleTeams.length){
            //this.setTimeout(doWork, 1);
        }
    }

}


self.addEventListener('message', function (e) {

    if (typeof e.data == "string") {
        doStuff = false;
    }
    else if (typeof e.data == "number") {
        minScore = e.data;
        if (doStuff && icount < arrOfPossibleTeams.length){
            this.setTimeout(doWork, 1);
        }
    }
    else {
        doStuff = true;
        icount = 0;
        data = e.data;
        arrOfPossibleTeamsContainingLockedHeroes = [];
        currentRosterOfSIDs = e.data.currentRoster.map(hero => hero.Name);
        arrOfPossibleTeams = k_combinations(currentRosterOfSIDs, e.data.teamSize);
        arrOfOutcomes = [];
        this.setTimeout(doWork, 1);
    }
});