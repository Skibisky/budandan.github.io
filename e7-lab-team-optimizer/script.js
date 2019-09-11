var showChangelog = false;
var showInstructions = false;
$(document).ready(function () {
    // make select2
    $.fn.select2.defaults.set("width", null);
    $('#heroes-to-add').select2({
        placeholder: "Type your hero name",
        theme: "bootstrap"
    });
});

function toggleChangelog() {
    showChangelog = showChangelog == false ? true : false;
    if (showChangelog == true) {
        $("#changelog-wrapper").show(50);
        $("#changelog").html(`<i class="fa fa-caret-down"></i> Hide Changelog`);
    } else {
        $("#changelog").html(`<i class="fa fa-caret-right"></i> Show Changelog`);
        $("#changelog-wrapper").hide(50);
    }
}

function toggleInstructions() {
    showChangelog = showChangelog == false ? true : false;
    if (showChangelog == true) {
        $("#instructions-wrapper").show(50);
        $("#instructions").html(`<i class="fa fa-caret-down"></i> Hide Instructions`);
    } else {
        $("#instructions").html(`<i class="fa fa-caret-right"></i> Show Instructions`);
        $("#instructions-wrapper").hide(50);
    }
}

function setErrorMessage(message) {
    document.getElementById('error-message').innerHTML = message;
}

function setLockErrorMessage(message) {
    document.getElementById('lock-error-message').innerHTML = message;
}

var app = new Vue({
    el: '#app',
    data: function () {
        return {
            allHeroes:[],
            heroData: [],
            maxNumberOfTeams: 50,
            calculatedTeams: [],
            currentRoster: [],
            lockedHeroes: [],
            isLoading: false,
            isInitializing: true,
            isUtilizingBackEnd: false,
            moreThanFourHeroesInRoster: false,
            showFindMyFourthModal: false,
            isLoadingFindFourth: false,
            bestFourthTeams: [],
            isUsingAdvancedFeatures: false,
            numOfSoulWeavers: 0,
            numOfKnights: 0,
            numOfOthers: 0,
            mustContainDefDown: false,
            teamSize: 4
        };
    },
    methods: {
        getOptimalTeams: function () {
            let self = this;
            self.calculatedTeams = [];
            self.isLoading = true;
            if (this.isUsingAdvancedFeatures) {
                let validatedTeamSize = 4;
                let validatedNumOfSoulWeavers = 0;
                let validatedNumOfKnights = 0;
                let validatedNumOfOthers = 0;
                if (this.teamSize < 1) {
                    alert("Please use a positive team size. Thank you.");
                    return;
                }
                if (this.teamSize > this.currentRoster.length) {
                    alert("Your team size is larger than your roster.");
                    return;
                }
                validatedTeamSize = this.teamSize;

                if (this.numOfSoulWeavers < 0) {
                    alert("Having a team of negative Soul Weavers will get you killed.");
                    return;
                }

                if (this.numOfKnights < 0) {
                    alert("Having a team of negative Knights will look weird.");
                    return;
                }

                if (this.numOfOthers < 0) {
                    alert("Having a team of negative Others will deal negative damage.");
                    return;
                }
                if (Number(this.numOfSoulWeavers) + Number(this.numOfKnights) + Number(this.numOfOthers) > this.teamSize) {
                    alert("Your team size does not fit your constraints. Please keep the total number of contraints under the team size.");
                    return;
                }
                validatedNumOfSoulWeavers = this.numOfSoulWeavers;
                validatedNumOfKnights = this.numOfKnights;
                validatedNumOfOthers = this.numOfOthers;
                $.ajax({
                    type: "POST",
                    url: "/Home/CalculateOptimalTeams",
                    data: {
                        "sCurrentRoster": JSON.stringify(this.currentRoster),
                        "maxNumberOfTeams": this.maxNumberOfTeams,
                        "sLockedHeroes": JSON.stringify(this.lockedHeroes),
                        "teamSize": validatedTeamSize,
                        "isUsingAdvancedFeatures": this.isUsingAdvancedFeatures,
                        "numOfSoulWeavers": validatedNumOfSoulWeavers,
                        "numOfKnights": validatedNumOfKnights,
                        "numOfOthers": validatedNumOfOthers,
                        "mustContainDefDown": this.mustContainDefDown
                    },
                    dataType: "json",
                    success: function (data) {
                        if (data.length == 0) alert("Could not find any teams matching your locks and contraints. Example: You might not have any Knights in your roster while asking for at least one.")
                        self.isLoading = false;
                        self.calculatedTeams = data;
                    },
                    error: function (data) {
                        self.isLoading = false;
                        alert("Could not calculate.");
                    }
                });
            } else {
                self.calculateOptimalTeamsJS();
                self.isLoading = false;
            }
        },
        calculateOptimalTeamsJS: function () {
            let arrOfPossibleTeamsContainingLockedHeroes = [];
            let currentRosterOfSIDs = this.currentRoster.map(hero => hero.Name);
            let arrOfPossibleTeams = this.k_combinations(currentRosterOfSIDs, this.teamSize);
            let arrOfOutcomes = [];
            if (this.lockedHeroes.length == 0) {
                for (var i = 0; i < arrOfPossibleTeams.length; i++) {
                    let result = this.determineBestChatOptionsFromTeam(arrOfPossibleTeams[i]);
                    arrOfOutcomes.push(result);
                }
            } else {
                let lockedHeroesSIDs = this.lockedHeroes.map(hero => hero.Name);
                var j = arrOfPossibleTeams.length;
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
                }
                arrOfPossibleTeams = arrOfPossibleTeamsContainingLockedHeroes;
                for (var i = 0; i < arrOfPossibleTeams.length; i++) {
                    let result = this.determineBestChatOptionsFromTeam(arrOfPossibleTeams[i]);
                    arrOfOutcomes.push(result);
                }
            }
            arrOfOutcomes.sort(this.compareScores);
            let numOfTeamsToOutput = (this.maxNumberOfTeams < arrOfPossibleTeams.length) ? this.maxNumberOfTeams : arrOfPossibleTeams.length;
            for (var i = 0; i < numOfTeamsToOutput; i++) {
                let heroArray = [];
                let campingOptions = [];
                for (var teamCounter = 0; teamCounter < arrOfOutcomes[i].team.length; teamCounter++) {
                    heroArray.push(this.heroData.find(model => model.Name === arrOfOutcomes[i].team[teamCounter]));
                }
                campingOptions.push({
                    "Hero": arrOfOutcomes[i].bestChatOption1.hero.name,
                    "Option": this.uppercaseWords(arrOfOutcomes[i].bestChatOption1.option.toString().replace('-', " ")),
                    "Score": 0
                });
                campingOptions.push({
                    "Hero": arrOfOutcomes[i].bestChatOption2.hero.name,
                    "Option": this.uppercaseWords(arrOfOutcomes[i].bestChatOption2.option.toString().replace('-', " ")),
                    "Score": 0
                });
                let calculatedTeam = {
                    "Heroes": heroArray,
                    "CampingOptions": campingOptions,
                    "Score": arrOfOutcomes[i].score
                }
                this.calculatedTeams.push(calculatedTeam);
            }
        },
        determineBestChatOptionsFromTeam: function (team) {
            let hero1 = this.allHeroes.filter(function (hero) {
                return hero.name === team[0];
            });
            let hero2 = this.allHeroes.filter(function (hero) {
                return hero.name === team[1];
            });
            let hero3 = this.allHeroes.filter(function (hero) {
                return hero.name === team[2];
            });
            let hero4 = this.allHeroes.filter(function (hero) {
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

            arrOfScoreObj.sort(this.compareScores);

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
        },
        k_combinations: function (set, k) {
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
                tailcombs = this.k_combinations(set.slice(i + 1), k - 1);
                for (j = 0; j < tailcombs.length; j++) {
                    combs.push(head.concat(tailcombs[j]));
                }
            }
            return combs;
        },
        toggleExperimentalFeatures: function () {
            this.isShowingExperimentalFeatures = !this.isShowingExperimentalFeatures;
        },
        leftHeros: function() {
            return this.heroData.filter(hero => !this.currentRoster.find(heroModel => heroModel.Id == hero.Id));
        },
        getHeroData: function () {
            let self = this;
            $.ajax({
                type: "POST",
                url: "/Home/GetInitialCampingModels",
                data: { },
                dataType: "json",
                success: function (data) {
                    self.heroData = data;
                    data.forEach(model => {
                        let oldHeroObj = self.createOldHeroObjectFromModel(model);
                        self.allHeroes.push(oldHeroObj);
                    });
                    self.isInitializing = false;
                },
                error: function (data) {
                    alert("Could not get heroes.");
                }
            });
        },
        addHeroesToRoster: function () {
            let currentRosterSIDs = this.currentRoster.map(el => el.Id);
            let newHeroes = $('#heroes-to-add').select2('data');
            for (const hero of newHeroes) {
                if (currentRosterSIDs.includes(hero.id)) {
                    setErrorMessage("Hero already exists in roster.");
                } else {
                    this.currentRoster.push(this.heroData.find(heroModel => heroModel.Id == hero.id));
                    setErrorMessage("");
                }
            }
            localStorage.setItem("Heroes", JSON.stringify(this.currentRoster));
            $('#heroes-to-add').val(null).trigger("change");
            this.sortRoster();
        },
        removeHeroFromRoster: function (hero) {
            this.currentRoster.splice(this.currentRoster.indexOf(hero), 1);
            this.lockedHeroes.splice(this.lockedHeroes.indexOf(hero), 1);
            localStorage.setItem("Heroes", JSON.stringify(this.currentRoster));
            this.sortRoster();
        },
        addToLockedHeroes: function (hero) {
            if (this.lockedHeroes.length >= 3) {
                setLockErrorMessage("You can only lock up to three heroes.");
                return;
            }
            this.lockedHeroes.push(hero);
        },
        removeFromLockedHeroes: function (hero) {
            setLockErrorMessage("<br>");
            this.lockedHeroes.splice(this.lockedHeroes.indexOf(hero), 1);
        },
        checkForFourHeroes: function () {
            if (this.currentRoster.length >= 4) {
                this.moreThanFourHeroesInRoster = true;
            } else {
                this.moreThanFourHeroesInRoster = false;
            }
        },
        refreshLocalStorage: function () {
            let oldLocalStorage = JSON.parse(localStorage.getItem("Heroes"));
            this.currentRoster = [];
            oldLocalStorage.forEach(old => {
                this.currentRoster.push(this.heroData.find(newObj => newObj.Id === old.Id));
            });
        },
        isALockedHero: function (hero) {
            let lockedHeroesSIDs = this.lockedHeroes.map(lockedHero => lockedHero.Id);
            return lockedHeroesSIDs.includes(hero.Id) ? true : false;
        },
        findFourth: function () {
            let arrOfPossibleTeamsContainingLockedHeroes = [];
            let arrOfOutcomes = [];
            let lockedHeroesPlaceholderArr = [];
            for (let a = 0; a < this.allHeroes.length; a++) {
                let fourthHeroName = this.allHeroes[a].name;
                lockedHeroesPlaceholderArr = [];
                lockedHeroesPlaceholderArr = this.lockedHeroes.map(hero => hero.Name);
                if (!lockedHeroesPlaceholderArr.includes(fourthHeroName)) {
                    lockedHeroesPlaceholderArr.push(fourthHeroName);
                    arrOfPossibleTeamsContainingLockedHeroes.push(lockedHeroesPlaceholderArr.slice());
                }
            }
            for (var i = 0; i < arrOfPossibleTeamsContainingLockedHeroes.length; i++) {
                let result = this.determineBestChatOptionsFromTeam(arrOfPossibleTeamsContainingLockedHeroes[i]);
                arrOfOutcomes.push(result);
            }
            arrOfOutcomes.sort(this.compareScores);
            for (var i = 0; i < arrOfOutcomes.length; i++) {
                let heroArray = [];
                let campingOptions = [];
                for (var teamCounter = 0; teamCounter < arrOfOutcomes[i].team.length; teamCounter++) {
                    heroArray.push(this.heroData.find(model => model.Name === arrOfOutcomes[i].team[teamCounter]));
                }
                campingOptions.push({
                    "Hero": arrOfOutcomes[i].bestChatOption1.hero.name,
                    "Option": this.uppercaseWords(arrOfOutcomes[i].bestChatOption1.option.toString().replace('-', " ")),
                    "Score": 0
                });
                campingOptions.push({
                    "Hero": arrOfOutcomes[i].bestChatOption2.hero.name,
                    "Option": this.uppercaseWords(arrOfOutcomes[i].bestChatOption2.option.toString().replace('-', " ")),
                    "Score": 0
                });
                let calculatedTeam = {
                    "Heroes": heroArray,
                    "CampingOptions": campingOptions,
                    "Score": arrOfOutcomes[i].score
                }
                this.bestFourthTeams.push(calculatedTeam);
            }
        },
        addAllHeroesToRoster: function () {
            confirm("Adding all the heroes to the roster will cause the morale calculations to take significant time to compute. Proceed?");
            this.currentRoster = [];
            this.lockedHeroes = [];
            this.currentRoster = this.heroData;
        },
        checkForClassMatch: function (hero, className) {
            if (!this.isUsingAdvancedFeatures) {
                return false;
            } else {
                if (hero.Class === className) {
                    return true;
                }
                return false;
            }
        },
        checkForNotSoulWeaverOrKnight: function (hero) {
            if (!this.isUsingAdvancedFeatures) {
                return false;
            } else {
                if (hero.Class !== "soul-weaver" && hero.Class !== "knight") {
                    return true;
                }
                return false;
            }
        },
        checkForDefDown: function (hero) {
            if (!this.isUsingAdvancedFeatures) {
                return false;
            } else {
                if (hero.HasDefenseDown && this.mustContainDefDown) {
                    return true;
                }
                return false;
            }
        },
        sortRoster: function () {
            this.currentRoster.sort(function (hero1, hero2) {
                return hero1.Name.localeCompare(hero2.Name);
            });
        },
        createOldHeroObjectFromModel: function (hero) {
            return {
                "name": hero.Name,
                "chat1": hero.Options[0],
                "chat2": hero.Options[1],
                "advice": hero.Reactions["advice"],
                "belief": hero.Reactions["belief"],
                "bizarre-story": hero.Reactions["bizarre-story"],
                "comforting-cheer": hero.Reactions["comforting-cheer"],
                "complain": hero.Reactions.complain,
                "criticism": hero.Reactions.criticism,
                "cute-cheer": hero.Reactions["cute-cheer"],
                "dream": hero.Reactions.dream,
                "food-story": hero.Reactions["food-story"],
                "gossip": hero.Reactions.gossip,
                "happy-memory": hero.Reactions["happy-memory"],
                "heroic-cheer": hero.Reactions["heroic-cheer"],
                "heroic-tale": hero.Reactions["heroic-tale"],
                "horror-story": hero.Reactions["horror-story"],
                "interesting-story": hero.Reactions["interesting-story"],
                "joyful-memory": hero.Reactions["joyful-memory"],
                "myth": hero.Reactions.myth,
                "occult": hero.Reactions.occult,
                "reality-check": hero.Reactions["reality-check"],
                "sad-memory": hero.Reactions["sad-memory"],
                "self-indulgent": hero.Reactions["self-indulgent"],
                "unique-comment": hero.Reactions["unique-comment"]
            };
        },
        compareScores: function (a, b) {
            if(a.score > b.score)
                return -1;
            if (a.score < b.score)
                return 1;
            return 0;
        },
        uppercaseWords: function (str) {
            var array1 = str.split(' ');
            var newarray1 = [];

            for (var x = 0; x < array1.length; x++) {
                newarray1.push(array1[x].charAt(0).toUpperCase() + array1[x].slice(1));
            }
            return newarray1.join(' ');
        }
    },
    mounted: function() {
        this.getHeroData();
        this.checkForFourHeroes();
        if (localStorage.getItem("Heroes") != null) {
            this.currentRoster = JSON.parse(localStorage.getItem("Heroes"));
        }
    },
    watch: {
        currentRoster: function () {
            this.checkForFourHeroes();
        },
        lockedHeroes: function () {
            if (this.lockedHeroes.length >= 3)
                this.showFindMyFourthModal = true;
            else
                this.showFindMyFourthModal = false;
        },
        numOfKnights: function () {
            this.calculatedTeams = [];
        },
        numOfSoulWeavers: function () {
            this.calculatedTeams = [];
        },
        numOfOthers: function () {
            this.calculatedTeams = [];
        },
        teamSize: function () {
            this.calculatedTeams = [];
        },
        isUsingAdvancedFeatures: function () {
            this.calculatedTeams = [];
        },
        mustContainDefDown: function () {
            this.calculatedTeams = [];
        }
    }
});