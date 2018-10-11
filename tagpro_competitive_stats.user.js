// ==UserScript==
// @name           TagPro Competitive Stats
// @author         Poeticalto
// @namespace      https://poeticalto.github.io/
// @website        https://github.com/poeticalto/tagpro-comp-stats
// @supportURL     https://www.reddit.com/message/compose/?to=Poeticalto
// @include        http://tagpro-*.koalabeast.com*
// @description    Sets up an Autoscore/Backscore compatible no-script group and sends cap updates/stats while in game
// @updateURL      https://gist.github.com/Poeticalto/00de8353fce79cac9059b22f20242039/raw/TagPro_Competitive_Group_Maker.user.js
// @downloadURL    https://gist.github.com/Poeticalto/00de8353fce79cac9059b22f20242039/raw/TagPro_Competitive_Group_Maker.user.js
// @grant          GM_getValue
// @grant          GM_setValue
// @version        0.3604
// ==/UserScript==

// Special thanks to  Destar, Some Ball -1, Ko, and ballparts for their work in this userscript!
// If your abbreviations/jerseys are out of date, message /u/Poeticalto using the support link above so he can update them or make a pull request on the corresponding GitHub repo.

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// Custom Options can be accessed through the following steps:                                           //
// 1. Create a private group as the leader.                                                              //
// 2. Click on the League Modifier Box. (Underneath the Swap Teams button)                               //
// 3. At the bottom of the list, click on the option you want to toggle.                                 //
// The option's current state will be shown in brackets. (like [currently enabled])                      //
// Current Options:                                                                                      //
// Enable/Disable Jerseys = Enables/Disables team jerseys in spectator mode                              //
// Enable/Disable Jersey Spin = Enables/Disables the spin of jerseys in spectator mode                   //
// Enable/Disable Save Stats Locally = Allows the user to locally save game stats after leaving the game //
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Log script in console
console.log(GM_info.script.name + ' active (Version: ' + GM_info.script.version + ')');

// Start Script (Group functions)
if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/*#*[crt]*g*-*[ 0-z]*$/))
{ // This gets your unique ID to determine which team you are in the group
    //This is separate from the main functions because the 'you' event may get sent before the rest of the script has loaded
    tagpro.ready(function() {
        tagpro.group.socket.on("you", function(p) {
            GM_setValue("tpUserId", p);
        });
    });
}

if (GM_getValue("tpcsLastHref",0) != 0)
{ // This is a refresh condition to check if the player has re-entered the game.
    if (GM_getValue("tpcsLastHref",0) != window.location.href)
    { // player left the game, so clear the checks
        GM_setValue("compCheck", false); // Set comp check to false to avoid accidentally triggering spec mode
        GM_setValue("backRedJersey", false); // Delete stored jersey data so it doesn't get triggered
        GM_setValue("backBlueJersey", false);
        GM_setValue("tpcsLastHref",0);
		GM_setValue("tpcsStartTime",0);
    }
}

(function(window) {
    'use strict';
    // Group Functions, or the functions which run when user is on the group page
    if (window.location.href.split(".com")[1].match(/^\/groups\/#[crt]g-*[ 0-z]*$/))
    { // If #cg/#tg/#rg is passed through, creates new group with competitive settings
        if (window.location.href.split(new RegExp("-", "gi")).length == 3)
        {
            GM_setValue("setMap", window.location.href.split("-")[2]); // sets a global var to remember the map name passed through
        }
        if (window.location.href.indexOf("#tg") >= 0)
        { // If #tg is passed through, change abbr to the right tournament
            setTournament(window.location.href.split("-")[1].split(".")[0]);
        }
        document.getElementsByTagName("input")[1].checked = false; // ensures private group
        GM_setValue("makepug", true); // makepug is the flag to automatically set competitive settings
        document.getElementById("create-group-btn").click(); // create group
    }
    else if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/*#*[crt]*g*-*[ 0-z]*$/) && Array.apply(null, document.getElementsByClassName("js-leader")).length > 0)
    { // the fancy stuff for the first condition allows for a map to be passed in
        leaderReady(); // runs function to set up leader stuff
        groupReady(true); // runs function to grab group info
    }
    else if (window.location.pathname.match(/^\/groups\/[a-z]{8}$/) && Array.apply(null, document.getElementsByClassName("js-leader")).length === 0)
    { // non-leader in group
        // spectator shouldn't need arguments, so there's no need to parse group type/map choice
        GM_setValue("groupId", window.location.href.split("/")[4]); // the leader function already sets groupId, so there's no need to set it again
        console.log("Spectator/Player detected, skipping group setup");
        groupReady(false); // runs function to grab group info
        var redundantCount = 0;
        var redundantLeadCheck = setInterval(function () { // Recheck for leader every half second for ten seconds in case leader functions didn't load
            if (Array.apply(null, document.getElementsByClassName("js-leader")).length > 0)
            {
                changeLeader(true);
                window.clearInterval(redundantLeadCheck);
            }
            else if (redundantCount > 20)
            {
                window.clearInterval(redundantLeadCheck);
            }
            else
            {
                redundantCount++;
            }
        }, 500);
    }
    // Game functions, or functions which run when user is in game
    else if (!window.tagpro && window.location.port >= 8000)
    { //comp game is detected when the tagpro object does not exist and port is game eligible (i.e. greater than 8000)
        // Because the tagpro object is not defined, this already defines a comp eligible game, so there's no need for redundant checks
        var groupServer = window.location.href.split("-")[1].split(".")[0];
        var userTeam = GM_getValue("userTeam", "none");
        var groupPort = window.location.port;
        var m = new Date();
        var startTime = (Math.floor(m.getTime() / 1000) + m.getTimezoneOffset() * 60);
        console.log("Comp game detected on port " + groupPort + ", player mode activated with team " + userTeam);
        var backscoreRedCaps = 0; //backscore is taken directly from scoreboard, so it can be trusted
        var backscoreBlueCaps = 0;
        var updateRedCaps = 0; //auto is guessed from sound events, so it can't be trusted completely [used for cap updates]
        var updateBlueCaps = 0;
        var firstSound = true;
        var tableExport = []; // tableExport will send the scoreboard data
        var scoreboardCaps = [0, 0]; // scoreboard caps keeps count of each team's caps
        var teamNum = []; // teamNum represents the team of each player: Red = 1 and Blue = 2
        var sendCheck = GM_getValue("tpcsConfirmation", false);
        var localCheck = GM_getValue("backLocalStorage", false);
        var playerCompCheck = GM_getValue("compCheck", false);
        var playerLate = GM_getValue("tpcsLateFlag", false);
        document.getElementById("cheering").addEventListener("play", goodCap, false); //Note: play event does not activate if sounds are muted
        document.getElementById("sigh").addEventListener("play", badCap, false); // However, play event does activate is volume is set to 0 (but no mute)
        // these functions are inside the block instead of outside the script since I don't know how else to do it
        function goodCap() {
            if (firstSound === true)
            { //the first cheering sound starts the game, so don't increment cap counter
                console.log("Start of comp game detected");
                if (GM_getValue("tpcsStartTime",0) > 0)
                { // If the start time was previously saved, call back
                    startTime = GM_getValue("tpcsStartTime");
                    playerLate = false;
                }
                else
                { // If the start time doesn't exist, make a new one
                    var x = new Date();
                    startTime = (Math.floor(x.getTime() / 1000) + x.getTimezoneOffset() * 60); // gets start time in UTC to avoid timezone confusion
                    GM_setValue("tpcsStartTime", startTime);
                }
            }
            else if (userTeam == 1)
            { // adds cap to Red team
                updateRedCaps += 1;
            }
            else if (userTeam == 2)
            { // adds cap to Blue team
                updateBlueCaps += 1;
            }
            if ((userTeam == 1 || userTeam == 2) && (updateRedCaps != 0 || updateBlueCaps != 0 || firstSound === true))
            { // enter the cap update if the above scenarios are met
                if (sendCheck === true && playerLate === false && playerCompCheck === true)
                { // if the user has allowed sending data, send cap update
                    capUpdate(updateRedCaps, updateBlueCaps, startTime, groupPort, tableExport, teamNum, groupServer, false);
                }
                if (firstSound === true)
                {
                    firstSound = false;
                }
            }
        }
        function badCap() {
            if (userTeam == 1)
            { // adds cap to Blue team
                updateBlueCaps += 1;
            }
            else if (userTeam == 2)
            { // adds cap to Red team
                updateRedCaps += 1;
            }
            if (userTeam == 1 || userTeam == 2)
            { // enter the cap update if the above scenarios are met
                if (sendCheck === true && playerLate === false && playerCompCheck === true)
                { // if the user has allowed sending data, send cap update
                    capUpdate(updateRedCaps, updateBlueCaps, startTime, groupPort, tableExport, teamNum, groupServer, false);
                }
            }
        }
        setInterval(function() {
            if (document.getElementById("options").style.display == "block")
            { // If the table is open, save stats
                var playerStats = getStats(); // This was split into a function because I'm trying to see if the stats table can be updated without having the table open
                tableExport = playerStats[0];
                teamNum = playerStats[1];
                backscoreRedCaps = playerStats[2][0];
                backscoreBlueCaps = playerStats[2][1];
            }
        }, 100); // update ten times per second
        document.onkeydown = function() { // This function sends a backup of the scoreboard in case partial stats are needed or stats need to be recreated.
            if (event.keyCode == 27)
            { // 27 corresponds to escape key
                setTimeout(function() { // setTimeout is used to ensure the scoreboard is updated before the stats get sent
                    if (document.getElementById("options").style.display == "block")
                    { // checks if scoreboard is open
                        if (sendCheck === true)
                        { // sends partial stats if the user has allowed sending data
                            capUpdate(backscoreRedCaps, backscoreBlueCaps, startTime, groupPort, tableExport, teamNum, groupServer, false);
                        }
                    }
                }, 500);
            }
        };
        window.onbeforeunload = function() { //send stats before exiting the game
            GM_setValue("userTeam", "none");
            GM_setValue("tpcsLateFlag", true); // set the late flag to true in case the user refreshes.
            if (typeof(backscoreRedCaps) == "undefined")
            { // undefined happens when there is no player on a team, so redefine to 0.
                backscoreRedCaps = 0;
            }
            if (typeof(backscoreBlueCaps) == "undefined")
            {
                backscoreBlueCaps = 0;
            }
            if (sendCheck === true && localCheck === false)
            { // send stats, but do not save locally
                submitStats(backscoreRedCaps, backscoreBlueCaps, tableExport, teamNum, startTime, groupPort, groupServer, false, 0);
            }
            else if (sendCheck === true && localCheck === true)
            { // send stats AND save locally
                submitStats(backscoreRedCaps, backscoreBlueCaps, tableExport, teamNum, startTime, groupPort, groupServer, false, 1);
            }
            else
            { // only save stats locally
                submitStats(backscoreRedCaps, backscoreBlueCaps, tableExport, teamNum, startTime, groupPort, groupServer, false, 2);
            }
        };
    }
    else if (GM_getValue("compCheck", false) === true && window.location.port >= 8000) { // Spectator mode
        // A check is needed here because there is no difference between this and a regular public game
        GM_setValue("tpcsLateFlag", false); // It doesn't matter if a spectator is late since they have access to the tagpro object
        var specServer = window.location.href.split("-")[1].split(".")[0];
        var specGroupPort = window.location.port;
        var ma = new Date();
        var specStartTime = (Math.floor(ma.getTime() / 1000) + ma.getTimezoneOffset() * 60) + 20; // set redundant start time
        var specRedCaps = 0;
        var specBlueCaps = 0;
        var endSubmit = false; // endSubmit is a flag for the end event
        var firstUpdate = false;
        var specUpdateCheck = GM_getValue("tpcsConfirmation", false);
        var specLocalCheck = GM_getValue("backLocalStorage", false);
        console.log("TagPro Competitive Stats is now running in Spectator mode on port " + window.location.port);
        tagpro.ready(function() {
            if ((GM_getValue("backRedJersey", false) || GM_getValue("backBlueJersey", false)) && GM_getValue("backJerseyFlag", true))
            { // adapted version of Some Ball -1's jersey script
                var red = GM_getValue("backRedJersey"); // grab jersey data from the group
                var blue = GM_getValue("backBlueJersey");
                var jersey = [red === "none" ? false : red, blue === "none" ? false : blue, GM_getValue("ballRedTrans", 1), GM_getValue("ballBlueTrans", 1), GM_getValue("jerseyRedTrans", 1), GM_getValue("jerseyBlueTrans", 1)]; // set an array for jersey data for easy processing
                if (jersey[0] || jersey[1])
                { // If either team has jerseys, get the jersey image
                    var tr = tagpro.renderer,
                        oldUPSP = tr.updatePlayerSpritePosition;
                    tr.createJersey = function(player) {
                        if (!jersey[player.team - 1])
                        { // make empty container if one team doesn't have a jersey
                            if (player.sprites.jersey) player.sprites.ball.removeChild(player.sprites.jersey);
                            player.sprites.jersey = new PIXI.DisplayObjectContainer();
                            player.sprites.jersey.team = player.team;
                            player.sprites.ball.addChildAt(player.sprites.jersey, 1);
                        }
                        else
                        { // make container for jersey
                            if (player.sprites.jersey)
                            {
                                player.sprites.ball.removeChild(player.sprites.jersey);
                            }
                            player.sprites.jersey = new PIXI.Sprite(PIXI.Texture.fromImage("http://i.imgur.com/" + jersey[player.team - 1] + ".png"));
                            player.sprites.jersey.team = player.team;
                            player.sprites.ball.addChildAt(player.sprites.jersey, 1); //add on top of ball, below other stuff
                            player.sprites.jersey.anchor.x = 0.5;
                            player.sprites.jersey.anchor.y = 0.5;
                            player.sprites.jersey.x = 20;
                            player.sprites.jersey.y = 20;
                            if (jersey[player.team + 1] < 1 && jersey[player.team + 1] >= 0)
                            { // set transparency value for actual ball
                                player.sprites.actualBall.alpha = jersey[player.team + 1];
                            }
                            else
                            { // reset
                                player.sprites.actualBall.alpha = 1;
                            }
                            if (jersey[player.team + 3] < 1 && jersey[player.team + 3] >= 0)
                            { // set transparency value for jersey
                                player.sprites.jersey.alpha = jersey[player.team + 3];
                            }
                            else
                            { // reset
                                player.sprites.jersey.alpha = 1;
                            }
                        }
                    };
                    tr.updatePlayerSpritePosition = function(player) {
                        if (!player.sprites.jersey)
                        {
                            tr.createJersey(player);
                        }
                        if (player.sprites.jersey.team !== player.team)
                        {
                            tr.createJersey(player);
                        }
                        var index = player.sprites.ball.getChildIndex(player.sprites.actualBall) + 1;
                        if (index !== player.sprites.ball.getChildIndex(player.sprites.jersey))
                        {
                            player.sprites.ball.setChildIndex(player.sprites.jersey, index);
                        }
                        if (GM_getValue("backJerseySpin", true))
                        {
                            player.sprites.jersey.rotation = player.angle;
                        }
                        oldUPSP(player);
                    };
                }
            }
            setTimeout(function () {
                var tempStartTime = Math.floor(tagpro.gameEndsAt.getTime() / 1000) + tagpro.gameEndsAt.getTimezoneOffset() * 60; // returns UTC
                if (tempStartTime <= specStartTime + 10)
                { // If you're in the 20 second waiting period, tagpro.gameEndsAt will return when the game starts
                    // A 10 second buffer is added for people who have faster balls.
                    // Note that the 10 second buffer does not affect which statement is triggered since if the user is in game, gameEndsAt will return a completely different time.
                    specStartTime = tempStartTime;
                }
                else
                { // user is in game, subtract game length from designated end time
                    specStartTime = tempStartTime - (parseInt(GM_getValue("groupTime", "10")) * 60);
                }
                var currentId = sortByScore(Object.getOwnPropertyNames(tagpro.players));
                var capStats = getSpecStats(currentId);
                if (specUpdateCheck === true)
                { // the first cap update comes from here since it has the correct start time
                    capUpdate(tagpro.score.r, tagpro.score.b, specStartTime, specGroupPort, capStats[0], capStats[1], specServer, true);
                }
                firstUpdate = true;
            }, 1000); // tagpro.gameEndsAt is not immediately available, so ping a little after
            tagpro.socket.on("score", function(data) { // Cap update condition
                if (firstUpdate === true && (tagpro.score.r != 0 || tagpro.score.b != 0))
                { // score event gets spammed on occasion before the beginning of the game due to bad connection, so only process if caps are not zero
                    if ('r' in data)
                    { // process red
                        specRedCaps = data.r;
                    }
                    if ('b' in data)
                    { // process blue
                        specBlueCaps = data.b;
                    }
                    var currentId = sortByScore(Object.getOwnPropertyNames(tagpro.players));
                    var capStats = getSpecStats(currentId);
                    if (specUpdateCheck === true)
                    { // send data if user has allowed it
                        capUpdate(specRedCaps, specBlueCaps, specStartTime, specGroupPort, capStats[0], capStats[1], specServer, true);
                    }
                }
            });
            tagpro.socket.on("end", function(data) { //  submit stats when the end event is sent by the server
                var finalId = sortByScore(Object.getOwnPropertyNames(tagpro.players)); // sort IDs of players in the game by their score
                var specStats = getSpecStats(finalId); // get the stats using finalId
                if (specUpdateCheck === true && specLocalCheck === false)
                { // send stats, but do not save locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, true, 0);
                }
                else if (specUpdateCheck === true && specLocalCheck === true)
                { // send stats AND save locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, true, 1);
                }
                else
                { // only save stats locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, true, 2);
                }
                endSubmit = true;
            });
            /*tagpro.socket.on("playerLeft", function (id) {
                // support for players leaving will be added in a future update.
            });*/
        });
        window.onbeforeunload = function() { // sends stats if you leave the game for some reason before the end event, or if stats fail to send during the end event
            if (endSubmit === false)
            {
                var finalId = sortByScore(Object.getOwnPropertyNames(tagpro.players));
                var specStats = getSpecStats(finalId);
                if (specUpdateCheck === true && specLocalCheck === false)
                { // send stats, but do not save locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, false, 0);
                }
                else if (specUpdateCheck === true && specLocalCheck === true)
                { // send stats AND save locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, false, 1);
                }
                else
                { // only save stats locally
                    submitStats(specRedCaps, specBlueCaps, specStats[0], specStats[1], specStartTime, specGroupPort, specServer, false, 2);
                }
            }
        };
    }
})(unsafeWindow);

// Misc Functions, alphabetical order by name of function
function capUpdate(updateRedCaps, updateBlueCaps, startTime, groupPort, tableExport, teamNum, groupServer, specFlag) { // send cap update
    var y = new Date();
    var currentTime = (Math.floor(y.getTime() / 1000) + y.getTimezoneOffset() * 60); // gets start time in UTC
    var backscoreUpdate = "https://docs.google.com/forms/d/e/1FAIpQLSe57NOVRdas-tzT4MZ8-XPSkNO3MyKCTrAOyFGXp4PtNQcdkQ/formResponse?entry.133949532=" + GM_getValue("backscoreRedAbr", "Red") + "&entry.454687569=" + GM_getValue("backscoreBlueAbr", "Blue") + "&entry.184122371=" + updateRedCaps + "&entry.1906941178=" + updateBlueCaps + "&entry.2120828603=" + groupServer + "&entry.1696460484=" + GM_getValue("groupId", "none") + "&entry.968816448=" + GM_getValue("groupMap", "none") + "&entry.1523561265=" + startTime + "&entry.1474408630=" + currentTime + "&entry.1681155627=" + groupPort + "&entry.1189129646=" + GM_getValue("groupTime", "none") + "&entry.2065162742=" + encodeURIComponent(tableExport.toString()) + "&entry.2098213735=" + teamNum.toString();
    if (currentTime - startTime < GM_getValue("groupTime", 0) * 60 && GM_getValue("backscoreBlueAbr", "Blue") != "Blue" && GM_getValue("backscoreRedAbr", "Red") != "Red")
    { // don't send a cap update if any of the team names are default
        var capUpdateRequest = new XMLHttpRequest();
        capUpdateRequest.open("POST", backscoreUpdate + "&entry.197322272=" + GM_getValue("backscorePlayer", "Some%20Ball") + ((specFlag === true) ? "%20[S]" : "") + "&submit=Submit");
        capUpdateRequest.send();
        console.log("Cap detected, score update sent and is now " + updateRedCaps + "-" + updateBlueCaps);
    }
}

function changeLeader(status) {
    if (status)
    { // status returns whether or not the user is the leader of the group
        if (!!document.getElementById("autoscoreLeague") && !!document.getElementById("redTeamAbr"))
        { // unhide leader elements if the user already had them loaded
            document.getElementById("autoscoreLeague").style.display = "block";
            document.getElementById("redTeamAbr").style.display = "block";
            document.getElementById("blueTeamAbr").style.display = "block";
        }
        else
        { // if the leader elements are not loaded, run the leaderReady function
            leaderReady();
        }
    }
    else
    { // changeLeader(false) only happens when the leader elements already exist, so hide leader elements
        document.getElementById("autoscoreLeague").style.display = "none";
        document.getElementById("redTeamAbr").style.display = "none";
        document.getElementById("blueTeamAbr").style.display = "none";
    }
}

function compCheck() {
    var checkSum = 0;
    var extraSettingsNum = document.getElementsByClassName("js-setting-value").length;
    var defaultSettings = ["Random", "10 Minutes", "No Capture Limit", "100% (Default)", "100% (Default)", "100% (Default)", "3 Seconds (Default)", "10 Seconds (Default)", "30 Seconds (Default)", "1 Minute (Default)", "Enabled", "Disabled (Default)", "Disable", "Disable"]
    for (var i = 1; i < extraSettingsNum; i++) {
        var extraSetting = document.getElementsByClassName("js-setting-value")[i].innerText;
        if (extraSetting == defaultSettings[i])
        {
            checkSum++;
        }
    }
    return checkSum;
}

function download(content, fileName, contentType) { // this function exports game data into a json file
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function getJerseys() { // set jerseys for each team
    var specRedTeam = GM_getValue("backscoreRedAbr", "none");
    var specBlueTeam = GM_getValue("backscoreBlueAbr", "none");
    var teamJersey = GM_getValue("jerseyLinks");
    if (teamJersey.hasOwnProperty(specRedTeam))
    { // If jersey exists, set jersey
        GM_setValue("backRedJersey", teamJersey[specRedTeam][0]);
        GM_setValue("ballRedTrans", teamJersey[specRedTeam][2]);
        GM_setValue("jerseyRedTrans", teamJersey[specRedTeam][4]);
    }
    else
    { // otherwise, set to false to avoid issues
        GM_setValue("backRedJersey", false);
        GM_setValue("ballRedTrans", 1);
        GM_setValue("jerseyRedTrans", 1);
    }
    if (teamJersey.hasOwnProperty(specBlueTeam))
    { // repeat for blue
        GM_setValue("backBlueJersey", teamJersey[specBlueTeam][1]);
        GM_setValue("ballBlueTrans", teamJersey[specBlueTeam][3]);
        GM_setValue("jerseyBlueTrans", teamJersey[specBlueTeam][5]);
    }
    else
    {
        GM_setValue("backBlueJersey", false);
        GM_setValue("ballBlueTrans", 1);
        GM_setValue("jerseyBlueTrans", 1);
    }
}

function getSpecStats(finalId) {
    var specExport = [];
    var specTeamExport = [];
    for (var i in finalId)
    {
        if (tagpro.players[finalId[i]])
        {
            var playerrow = [];
            var playerObject = tagpro.players[finalId[i]];
            playerrow = [playerObject.auth ? "✓" + playerObject.name : playerObject.name, playerObject.score, playerObject["s-tags"], playerObject["s-pops"], playerObject["s-grabs"], playerObject["s-drops"], timeFromSeconds(playerObject["s-hold"], true), playerObject["s-captures"], timeFromSeconds(playerObject["s-prevent"], true), playerObject["s-returns"], playerObject["s-support"], playerObject["s-powerups"]];
            specExport.push(playerrow);
            specTeamExport.push(playerObject.team);
        }
    }
    return [specExport, specTeamExport];
}

function getStats() {
    var statPlayers = document.getElementsByTagName("table").stats.rows.length;
    var tableExport = [];
    var scoreboardCaps = [0, 0];
    var teamNum = [];
    for (var i = 2; i < statPlayers; i++)
    { // This part pushes the stats table into an array to be exported later.
        var playerPush = [];
        var playerTeam = document.getElementsByTagName("table").stats.rows[i].getElementsByClassName("team-blue").length;
        teamNum.push(playerTeam + 1);
        for (var j = 0; j <= 11; j++)
        {
            var editVal = document.getElementsByTagName("table").stats.rows[i].cells[j].innerText;
            if (j == 0)
            {
                if (editVal.substring(0, 1) == "✓")
                { // remove whitespace between checkmark and name
                    editVal = "✓".concat(editVal.substring(1).trim());
                }
                else
                {
                    editVal = editVal.trim();
                }
            }
            else if (j == 7)
            { // add team caps
                scoreboardCaps[playerTeam] += parseInt(editVal);
            }
            playerPush.push(editVal);
        }
        tableExport.push(playerPush);
    }
    return [tableExport, teamNum, scoreboardCaps];
}

function groupEscape(group, checkVersion) {
    if (typeof group != "undefined" && typeof group.self != "undefined" && typeof group.players != "undefined")
    {
        GM_setValue("userTeam", group.players[group.self].team);
    }
    else if (typeof group.self == "undefined")
    {
        GM_setValue("userTeam", "none");
    }
    GM_setValue("backscoreRedAbr", document.getElementsByTagName("input").redTeamName.value);
    GM_setValue("backscoreBlueAbr", document.getElementsByTagName("input").blueTeamName.value);
    GM_setValue("groupMap", document.getElementsByTagName("select").map.value);
    GM_setValue("groupTime", document.getElementsByTagName("select").time.value);
    GM_setValue("groupCapLimit", document.getElementsByTagName("select").caps.value);
    GM_setValue("tpcsStartTime", 0);
    if (tagpro.group.players[GM_getValue("tpUserId", undefined)])
    { // set the name of the user based on their name in group
        GM_setValue("backscorePlayer", encodeURIComponent(tagpro.group.players[GM_getValue("tpUserId", undefined)].name + " (" + checkVersion + ")"));
    }
    else
    { // if the group var is corrupt, set name to Some Ball
        GM_setValue("backscorePlayer", encodeURIComponent("Some Ball (" + checkVersion + ")"));
    }
    var groupPlayers = Object.keys(tagpro.group.players);
    var pubCount = 0;
    for (var g = 0; g < groupPlayers.length; g++)
    {
        if (tagpro.group.players[groupPlayers[g]].team == 0)
        {
            pubCount++;
        }
    }
    var escapeCheck = compCheck();
    if (escapeCheck >= 12 && pubCount == 0)
    {
        if (escapeCheck == 13 || document.getElementsByClassName("js-setting-value")[1].innerText != "10 Minutes")
        { // If minutes is the only thing which doesn't match, then it's still a legal comp game
            console.log("passed comp check");
            GM_setValue("compCheck", true);
            getJerseys();
        }
    }
    else
    {
        console.log("failed comp check");
        GM_setValue("compCheck", false);
    }
}

function groupReady(isLeader) { // grab necessary info from the group
    tagpro.ready(function() {
        GM_setValue("compCheck", false);
        var jerseyRequest = new XMLHttpRequest();
        jerseyRequest.open("GET", "https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/jerseys.json"); // This json contains a master list of jerseys
        jerseyRequest.responseType = "json";
        jerseyRequest.send();
        jerseyRequest.onload = function() {
            GM_setValue("jerseyLinks", jerseyRequest.response);
        }
        var group = tagpro.group = Object.assign(tagpro.group, {
            self: GM_getValue("tpUserId", undefined),
            players: {}
        });
        var socket = group.socket;
        socket.on("member", function(member) {
            group.players[member.id] = Object.assign(group.players[member.id] || {}, member);
            if (typeof tagpro.group.players[GM_getValue("tpUserId", undefined)] != "undefined") {
                if (tagpro.group.players[GM_getValue("tpUserId")].leader != isLeader) {
                    isLeader = tagpro.group.players[GM_getValue("tpUserId")].leader;
                    changeLeader(isLeader);
                }
            }
        });
        var checkVersion = GM_getValue("tpcsCurrentVer",0);
        if (checkVersion != GM_info.script.version || GM_getValue("tpcsConfirmation", false) === false)
        {
            checkVersion = GM_info.script.version;
            GM_setValue("tpcsCurrentVer",checkVersion);
            var updateNotes = "The TagPro Competitive Stats Userscript has been updated to V" + GM_info.script.version + "!\nHere is a summary of updates:\n1. Refactored leader code to allow swapping between leader/spectator\n2. increased timeout for group functions\n3. Added ability to save game data locally\n4. Fixed incorrect executions of capUpdate function\n5. Reimplement checkLeader function\n6. Added ability to show update notes in userscript\nClicking Ok means you accept the changes to this script and the corresponding privacy policy.\nThe full privacy policy and change log can be found by going to the script homepage through the Tampermonkey menu."
            GM_setValue("tpcsConfirmation", window.confirm(updateNotes));
        }
        socket.on("play", function() { // play event
            groupEscape(group, checkVersion); // groupEscape grabs the necessary data from the group page
            GM_setValue("tpcsLateFlag", false);
        });
        document.getElementById("join-game-btn").onclick = function() { // join button, or player enters game late
            // note: If a player enters the game late using the join game button, any stats they send when they leave will be marked incomplete due to time.
            // This can be corrected on the server side if needed.
            groupEscape(group, checkVersion);
            GM_setValue("tpcsLateFlag", true);
        };
    });
}

function leaderReady() {
    console.log("Group leader detected, setting up group");
    if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/#tg*-*[0-z]*$/))
    { // set up tournament abbreviations if #tg is passed through
        setTournament(window.location.href.split("-")[1].split(".")[0]);
    }
    if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/#tg-*[ 0-z]*$/) || GM_getValue("setMap", "none") != "none")
    { // set up map if passed through
        var mapName = "";
        var mapList = document.getElementsByClassName("form-control js-socket-setting")[0];
        if (GM_getValue("setMap", "none") == "none")
        { // map name is in the url
            mapName = window.location.href.split("-")[2].replace(" ", "_").toLowerCase();
        }
        else
        { // map name is in "setMap"
            mapName = GM_getValue("setMap", "none").replace(" ", "_").toLowerCase();
        }
        GM_setValue("setMap", "none");
        var mapNameKey = { // This is the list of TagPro maps which does not follow standard naming conventions
            "angry_pig": "AngryPig",
            "bombing_run": "bomber",
            "center_flag": "centerflag",
            "command_center": "CommandCenter",
            "danger_zone_3": "DangerZone",
            "geokoala": "teamwork",
            "hurricane": "Hurricane2",
            "hyper_reactor": "HyperReactor",
            "mars_ball_explorer": "WelcomeToMars",
            "mars_game_mode": "GameMode",
            "mode_7": "Mode7",
            "snes_v2": "snes",
            "thinking_with_portals": "ThinkingWithPortals",
            "big_vird": "vee2",
            "blast_off": "blastoff",
            "boostsv2.1": "Boosts",
            "contain_masters": "ContainMasters",
            "diamond_faces": "Diamond",
            "dumbell": "fullspeed",
            "event_horizon": "eventhorizon",
            "event_horizon_2": "eventhorizon2",
            "figure_8": "map2-2",
            "glory_hole": "RiskAndReward",
            "grail_of_speed": "GrailOfSpeed",
            "open_field_masters": "OFM",
            "pokeball": "community1",
            "push_it": "PushIt",
            "the_holy_see": "HolySee",
            "holy_see": "HolySee",
            "vee": "bird",
            "whirlwind_2": "whirlwind",
            "yiss_3.2": "yiss 3.2",
            "egg_ball": "mode/eggball"
        };
        Array.apply(null, mapList).forEach(function(mapOption) { // get the rest of the map names from the group
            var name = mapOption.value;
            mapNameKey[name.toLowerCase()] = name;
        });
        var map = mapNameKey[mapName] || ""; // defaults to random if the map name is not found
        tagpro.group.socket.emit("setting", {name: "map", value: map}); // syncs map change to server
    }
    if (GM_getValue("makepug", false) === true)
    { // If the group has been passed through with a toggle, automatically set competitive settings
        console.log("Automated new group detected, setting comp settings");
        document.getElementById("pug-btn").click();
        document.getElementsByClassName("btn btn-default group-assignment group-setting competitive-settings")[0].click();
        GM_setValue("makepug", false);
    }
    document.getElementById("pug-btn").onclick = function() { // If group is private, turn the group into a comp game
        console.log("Private group detected, setting up comp settings");
        if (document.getElementsByName("competitiveSettings")[0].checked == false)
        {
            document.getElementsByClassName("btn btn-default group-assignment group-setting competitive-settings")[0].click(); // Turns on competitive settings
        }
    }
    GM_setValue("groupId", window.location.href.split("/")[4]);
    var buttonSettings = document.getElementsByClassName("pull-left player-settings")[0];
    var selectList = document.createElement("select"); // selectList is the League selector in group
    selectList.id = "autoscoreLeague";
    buttonSettings.appendChild(selectList);
    selectList.className = "form-control js-socket-setting";
    selectList.style.margin = "1% 0%";
    selectList.title = "Click here to set a league for team abbreviations or change custom settings!";
    var abbrRequest = new XMLHttpRequest();
    abbrRequest.open("GET", "https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/teams.json"); // This json contains the abbreviations to use in group
    abbrRequest.responseType = "json";
    abbrRequest.send();
    abbrRequest.onload = function() {
        GM_setValue("autoscoreAbr", abbrRequest.response);
        var array = abbrRequest.response.Leagues;
        array.push("TagPro Competitive Stats Settings");
        if (GM_getValue("backJerseyFlag", true) === true)
        {
            array.push("Disable Jerseys [Currently Enabled]");
        }
        else
        {
            array.push("Enable Jerseys [Currently Disabled]");
        }
        if (GM_getValue("backJerseySpin", true) === true)
        {
            array.push("Disable Jersey Spin [Currently Enabled]");
        }
        else
        {
            array.push("Enable Jersey Spin [Currently Disabled]");
        }
        if (GM_getValue("backLocalStorage", false) === true)
        {
            array.push("Disable Saving Local Stats [Currently Enabled]");
        }
        else
        {
            array.push("Enable Saving Local Stats [Currently Disabled]");
        }
        for (var i = 0; i < array.length; i++)
        { // Fill in the league selector with the leagues in the json
            var option;
            var headerList = ["NA Competitive", "NA Tournaments", "EU Competitive", "OC Competitive", "TagPro Competitive Stats Settings"];
            if (headerList.indexOf(array[i]) >= 0)
            { // these are headers
                option = document.createElement("optgroup");
                option.label = array[i];
            }
            else
            {
                option = document.createElement("option");
                option.value = array[i];
                option.text = array[i];
            }
            selectList.appendChild(option);
        }
        if (abbrRequest.response.Leagues.indexOf(GM_getValue("autoscoreImport", "None")) > -1)
        { // Standard Import Condition
            selectList.value = GM_getValue("autoscoreImport", "None");
        }
        else
        { // This happens when the league has been removed from the teams json, usually because the season is over or league is dead
            selectList.value = "None";
        }
        updateTeamAbr();
        document.getElementById("autoscoreLeague").onchange = function() { // redo team names when league is changed
            updateTeamAbr();
        };
    }
    document.getElementById("launch-private-btn").onmouseover = function () {
        var alertCheck = compCheck();
        if (alertCheck == 13)
        {
            var checkTime = new Date();
            var checkProcess = (Math.floor(checkTime.getTime() / 1000) + checkTime.getTimezoneOffset() * 60);
            var oldId = GM_getValue("launchGroupId","nones");
            var currentId = GM_getValue("groupId", "none")
            var oldTime = GM_getValue("checkTime",0);
            if ((checkProcess - oldTime) >= (15*60) || currentId != oldId)
            {
                GM_setValue("checkTime", checkProcess);
                GM_setValue("launchGroupId", currentId);
                window.alert("A competitive game was detected without proper abbreviations!\nMake sure your abbreviations are set before launching!");
            }
        }
    }
}

function openSettings(setting) {
    var newSetting = "";
    if (setting == "Disable Jerseys [Currently Enabled]")
    {
        GM_setValue("backJerseyFlag", false);
        newSetting = "Enable Jerseys [Currently Disabled]";
    }
    else if (setting == "Enable Jerseys [Currently Disabled]")
    {
        GM_setValue("backJerseyFlag", true);
        newSetting = "Disable Jerseys [Currently Enabled]";
    }
    else if (setting == "Disable Jersey Spin [Currently Enabled]")
    {
        GM_setValue("backJerseySpin", false);
        newSetting = "Enable Jersey Spin [Currently Disabled]";
    }
    else if (setting == "Enable Jersey Spin [Currently Disabled]")
    {
        GM_setValue("backJerseySpin", true);
        newSetting = "Disable Jersey Spin [Currently Enabled]";
    }
    else if (setting == "Enable Saving Local Stats [Currently Disabled]")
    {
        GM_setValue("backLocalStorage", true);
        newSetting = "Disable Saving Local Stats [Currently Enabled]";
    }
    else if (setting == "Disable Saving Local Stats [Currently Enabled]")
    {
        GM_setValue("backLocalStorage", false);
        newSetting = "Enable Saving Local Stats [Currently Disabled]";
    }
    var updateSettingsArray = document.getElementById("autoscoreLeague").getElementsByTagName("option");
    for (var i = updateSettingsArray.length - 1; i >= 0; i--)
    { // loop backwards in the league selector array to update setting text
        if (updateSettingsArray[i].value == setting)
        {
            updateSettingsArray[i].value = newSetting;
            updateSettingsArray[i].text = newSetting;
            break;
        }
    }
}

//stolen from tagpro client code
function pad(t, e) {
    t = t.toString();
    var i = (e = e.toString()) + t,
        o = e.length > t.length ? e.length : t.length;
    return i.substr(i.length - o);
}

function setTournament(tournamentServer) { // change abbreviations to match the default tournament of the server
    switch (tournamentServer) {
        case "radius":
            GM_setValue("autoscoreImport", "RCL");
            break;
        case "sphere":
            GM_setValue("autoscoreImport", "TToC");
            break;
        case "centra":
            GM_setValue("autoscoreImport", "Pipberry");
            break;
        default:
            break;
    }
}

function sortByScore(playerArr) { // bubble sort id array based on the score
    var scoreArr = []; // create an array to sort
    for (var k in playerArr) {
        scoreArr.push(tagpro.players[playerArr[k]].score);
    }
    for (var i = 0; i < scoreArr.length; i++) { // basic (reverse) bubble sort because I'm boring
        for (var j = scoreArr.length - 1; j >= i; j--) {
            if (scoreArr[j - 1] < scoreArr[j]) {
                var tempElementScore = scoreArr[j - 1];
                var tempElementId = playerArr[j - 1];
                scoreArr[j - 1] = scoreArr[j];
                scoreArr[j] = tempElementScore;
                playerArr[j - 1] = playerArr[j];
                playerArr[j] = tempElementId;
            }
        }
    }
    return playerArr;
}

function submitStats(backscoreRedCaps, backscoreBlueCaps, tableExport, teamNum, startTime, groupPort, groupServer, endCheck, localCheck) { // submit stats at the end of the game
    var endCompCheck = GM_getValue("compCheck", false);
    var submitRequest = new XMLHttpRequest();
    var doneCheck = true;
    var z = new Date();
    var endTime = (Math.floor(z.getTime() / 1000) + z.getTimezoneOffset() * 60); // gets end time in UTC
    var backscoreLink = "https://docs.google.com/forms/d/e/1FAIpQLSe57NOVRdas-tzT4MZ8-XPSkNO3MyKCTrAOyFGXp4PtNQcdkQ/formResponse?entry.133949532=" + GM_getValue("backscoreRedAbr", "Red") + "&entry.454687569=" + GM_getValue("backscoreBlueAbr", "Blue") + "&entry.184122371=" + backscoreRedCaps + "&entry.1906941178=" + backscoreBlueCaps + "&entry.2120828603=" + groupServer + "&entry.1696460484=" + GM_getValue("groupId", "none") + "&entry.968816448=" + GM_getValue("groupMap", "none") + "&entry.2065162742=" + encodeURIComponent(tableExport.toString()) + "&entry.2098213735=" + teamNum.toString() + "&entry.1523561265=" + startTime + "&entry.1474408630=" + endTime + "&entry.1681155627=" + groupPort + "&entry.1189129646=" + GM_getValue("groupTime", "none") + "&entry.197322272=" + GM_getValue("backscorePlayer", "Some%20Ball") + ((endCheck === true) ? "%20[S]" : "") + ((endCompCheck === true) ? "" : "%20[F]") + "&entry.2031694514=" + "X" + "&submit=Submit";
    var groupCapLimit = GM_getValue("groupCapLimit", -1);
    if (groupCapLimit == 0)
    {
        groupCapLimit = -1;
    }
    if (endCheck === true)
    { // This occurs when a spectator reaches the end of the game and the 'end' event is activated
        submitRequest.open("POST", backscoreLink);
        console.log("Game detected as complete [End event], stats submitted");
    }
    else if (endTime - startTime > GM_getValue("groupTime", 0) * 60)
    { //This is the Time success condition, when stats are submitted after the game has ended
        submitRequest.open("POST", backscoreLink);
        console.log("Game detected as complete [Time], stats submitted");
    }
    else if (backscoreRedCaps == groupCapLimit || backscoreBlueCaps == groupCapLimit)
    { //This is the Cap success condition, when stats are submitted when cap limit is reached
        submitRequest.open("POST", backscoreLink);
        console.log("Game detected as complete [Cap Limit], stats submitted");
    }
    else
    { //Everything else means something went wrong, i.e. game ended early or the you left the game early
        submitRequest.open("POST", backscoreLink);
        doneCheck = false;
        console.log("Game detected as incomplete, stats submitted");
        GM_setValue("tpcsLastHref", window.location.href);
    }
    if (localCheck <= 1)
    { // send stats to server
        submitRequest.send();
    }
    if (localCheck >= 1)
    { // save stats locally
        var dataJson = {
            "complete": doneCheck,
            "redTeamName": GM_getValue("backscoreRedAbr", "Red"),
            "blueTeamName": GM_getValue("backscoreBlueAbr", "Red"),
            "groupServer": groupServer,
            "groupId": GM_getValue("groupId", "none"),
            "groupMap": GM_getValue("groupMap", "none"),
            "playerStats": tableExport.toString(),
            "teamNum": teamNum.toString(),
            "startTime":  startTime,
            "endTime":  endTime,
            "groupPort": groupPort,
            "groupTime":  GM_getValue("groupTime", "none")
        };
        download(JSON.stringify(dataJson),"tpcs-"+dataJson.startTime+"-"+dataJson.redTeamName+"-"+dataJson.blueTeamName+".json", "application/json");
    }
}

//stolen from tagpro client code
function timeFromSeconds(t, e) {
    if (0 == e) e = !1;
    var i = pad;
    t = parseFloat(t);
    var o = parseInt(t / 3600),
        n = t % 60,
        r = i(parseInt(t / 60) % 60, "00") + ":" + i(n, "00");
    return (!e || o > 0) && (r = i(o, "00") + ":" + r), r;
}

function updateTeamAbr() { // This function fills in the team abbreviations on the group page
    var abrJson = GM_getValue("autoscoreAbr");
    var settingsList = ["Disable Jerseys [Currently Enabled]", "Enable Jerseys [Currently Disabled]", "Disable Jersey Spin [Currently Enabled]", "Enable Jersey Spin [Currently Disabled]", "Disable Saving Local Stats [Currently Enabled]", "Enable Saving Local Stats [Currently Disabled]"];
    if (settingsList.indexOf(document.getElementById("autoscoreLeague").value) >= 0)
    {
        openSettings(document.getElementById("autoscoreLeague").value);
        document.getElementById("autoscoreLeague").value = GM_getValue("autoscoreImport", "none");
        document.getElementById("autoscoreLeague").text = GM_getValue("autoscoreImport", "none");
    }
    GM_setValue("autoscoreImport", document.getElementById("autoscoreLeague").value);
    var redTeamName = document.getElementsByClassName("team-name")[2];
    var blueTeamName = document.getElementsByClassName("team-name")[3];
    var teams = [];
    var teamsRaw = [];
    var teamsLabels = [];
    var redTeamAbr;
    var blueTeamAbr;
    if (!!document.getElementById("redTeamAbr"))
    {
        redTeamAbr = document.getElementById("redTeamAbr");
        blueTeamAbr = document.getElementById("blueTeamAbr");
    }
    else
    {
        redTeamAbr = document.createElement("select");
        blueTeamAbr = document.createElement("select");
        redTeamAbr.id = "redTeamAbr";
        blueTeamAbr.id = "blueTeamAbr";
        redTeamAbr.title = "Click here to select the Red team's abbreviation!";
        blueTeamAbr.title = "Click here to select the Blue team's abbreviation!";
        redTeamName.appendChild(redTeamAbr);
        blueTeamName.appendChild(blueTeamAbr);
    }
    if (document.getElementById("redTeamAbr").style.display == "none")
    {
        document.getElementById("redTeamAbr").style.display = "block";
        document.getElementById("blueTeamAbr").style.display = "block";
    }
    switch (document.getElementById("autoscoreLeague").value)
    {
            // teams is the list which is shown on the group page
            // teamsLabels is the list of labels to help differentiate teams (usually server or conference)
            // teamsRaw is the list of abbreviations to put into the group
        case "TToC": // tournaments follow the same procedure so flow one case because I'm lazy
        case "RCL":
        case "CLTP":
        case "Pipberry":
            var tourneyModifier;
            if (document.getElementById("autoscoreLeague").value == "TToC")
            {
                tourneyModifier = "T";
            }
            else if (document.getElementById("autoscoreLeague").value == "RCL")
            {
                tourneyModifier = "R";
            }
            else if (document.getElementById("autoscoreLeague").value == "CLTP")
            {
                tourneyModifier = "C";
            }
            else if (document.getElementById("autoscoreLeague").value == "Pipberry")
            {
                tourneyModifier = "Y";
            }
            teams = [""];
            for (i = 1; i <= 24; i++)
            {
                if (i < 10)
                {
                    teams.push(tourneyModifier + "0" + i);
                }
                else
                {
                    teams.push(tourneyModifier + i);
                }
            }
            teamsRaw = teams;
            teamsLabels = [];
            break;
        case "None":
            teams = [];
            teamsLabels = [];
            teamsRaw = [];
            document.getElementById("redTeamAbr").style.display = "none";
            document.getElementById("blueTeamAbr").style.display = "none";
            break;
        default:
            teams = abrJson[GM_getValue("autoscoreImport")][0];
            teamsRaw = abrJson[GM_getValue("autoscoreImport")][2];
            teamsLabels = abrJson[GM_getValue("autoscoreImport")][1];
            break;
    }
    while (redTeamAbr.firstChild)
    {
        redTeamAbr.removeChild(redTeamAbr.firstChild);
        blueTeamAbr.removeChild(blueTeamAbr.firstChild);
    }
    for (var i = 0; i < teams.length; i++)
    {
        var optionr;
        var optionb;
        if (teamsLabels.indexOf(teams[i]) > -1)
        {
            optionr = document.createElement("optgroup");
            optionb = document.createElement("optgroup");
            optionr.label = teams[i];
            optionb.label = teams[i];
        }
        else
        {
            optionr = document.createElement("option");
            optionb = document.createElement("option");
            optionr.value = teams[i];
            optionr.text = teams[i];
            optionb.value = teams[i];
            optionb.text = teams[i];
        }
        redTeamAbr.appendChild(optionr);
        blueTeamAbr.appendChild(optionb);
    }
    redTeamAbr.className = "form-control js-socket-setting";
    blueTeamAbr.className = "form-control js-socket-setting";
    document.getElementById("redTeamAbr").onchange = function() {
        if (document.getElementById("redTeamAbr").value.length <= 0)
        {
            tagpro.group.socket.emit("setting", { name: "redTeamName", value: "Red" });
        }
        else
        {
            tagpro.group.socket.emit("setting", { name: "redTeamName", value: teamsRaw[teams.indexOf(redTeamAbr.value)] });
        }
    };
    document.getElementById("blueTeamAbr").onchange = function() {
        if (document.getElementById("blueTeamAbr").value.length <= 0)
        {
            tagpro.group.socket.emit("setting", { name: "blueTeamName", value: "Blue" });
        }
        else
        {
            tagpro.group.socket.emit("setting", { name: "blueTeamName", value: teamsRaw[teams.indexOf(blueTeamAbr.value)] });
        }
    };
}