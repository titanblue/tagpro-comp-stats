// ==UserScript==
// @name           TagPro Competitive Stats
// @author         Poeticalto
// @namespace      https://poeticalto.github.io/
// @include        http://tagpro-*.koalabeast.com*
// @description    Sets up an Autoscore/Backscore compatible no-script group and sends cap updates/stats while in game
// @updateURL      https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/tagpro_competitive_stats.user.js
// @downloadURL    https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/tagpro_competitive_stats.user.js
// @grant          GM_getValue
// @grant          GM_setValue
// @version        0.31
// ==/UserScript==
// Special thanks to  Destar, Some Ball -1, Ko, and ballparts for their work in this userscript

// How to use:  [SERVER is the TagPro Server, GROUPID is the group identifier if group is setup, MAPNAME is the name of the map]
// If you want a regular comp group: http://tagpro-SERVER.koalabeast.com/groups/#cg
// If you want a comp group set to a map: http://tagpro-SERVER.koalabeast.com/groups/#cg-MAPNAME
// If you have a group setup but want to make it comp: http://tagpro-SERVER.koalabeast.com/groups/GROUPID/#cg
// If you have a group setup but want to make it comp with a map: http://tagpro-SERVER.koalabeast.com/groups/groupid/#cg-MAPNAME

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// If your abbreviations are out of date, that means you need to msg /u/Poeticalto to update them for you.//
////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////
// Custom Options                                 //
////////////////////////////////////////////////////
// Enable jerseys for available teams in spec mode//
var enableJerseys = true;
// Spin jerseys to show ball rotation             //
var spinJerseys = true;
////////////////////////////////////////////////////

// Start Script (Group functions)
if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/*#*[crt]*g*-*[ 0-z]*$/)) {// This gets your unique ID to determine which team you are in the group
    //This is separate from the main functions because the 'you' event gets sent before the rest of the script has time to load
    tagpro.ready(function(){
        var tpUserId = "none";
        tagpro.group.socket.on("you", function(p){
            tpUserId = p;
            GM_setValue("tpUserId",tpUserId);
        });
    });
}

$(document).ready(function() {
    setTimeout(function(){
        if(!location.port || location.port < 8000){
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "/groups/#cg";
            a.textContent = "Competitive Group";
            li.appendChild(a);
            document.getElementById("site-nav").getElementsByTagName("ul")[0].appendChild(li);
        }
        if (window.location.href.split(".com")[1].match(/^\/groups\/#[crt]g-*[ 0-z]*$/)){ // If #cg/#tg/#rg is passed through, creates new group with competitive settings
            if (window.location.href.split( new RegExp( "-", "gi" ) ).length==3){
                GM_setValue("setMap",window.location.href.split("-")[2]); // sets a global var to remember the map name passed through
            }
            if (window.location.href.indexOf("#tg") >= 0){ // If #tg is passed through, change abbr to the right tournament
                setTournament(window.location.href.split("-")[1].split(".")[0]);
            }
            $('#public').prop('checked', false);
            GM_setValue("makepug", "true");
            $('#create-group-btn').click();
        }
        else if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/*#*[crt]*g*-*[ 0-z]*$/) && Array.apply(null, document.getElementsByClassName("js-leader")).length > 0 ){
            // the fancy stuff for the first condition allows for a map to be passed in
            var group;
            groupReady(); // runs function to grab group info
            GM_setValue("groupServer",window.location.href.split("-")[1].split(".")[0]); // sets var of server
            console.log("Group leader detected, setting up group");
            if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/#tg*-*[0-z]*$/)){ //set up tournament abbreviations if #tg is passed through
                setTournament(GM_getValue("groupServer"),"none");
            }
            if (window.location.href.split(".com")[1].match(/^\/groups\/[a-z]{8}\/#tg-*[ 0-z]*$/) || GM_getValue("setMap","none") != "none"){ // set up map if passed through
                var mapName = "";
                var mapList = document.getElementsByClassName("form-control js-socket-setting")[0];
                if (GM_getValue("setMap","none") == "none") {
                    mapName = window.location.href.split("-")[2].replace(" ","_").toLowerCase();
                }
                else {
                    mapName = GM_getValue("setMap","none").replace(" ","_").toLowerCase();
                }
                GM_setValue("setMap","none");
                var mapNameKey = {
                    "angry_pig":"AngryPig",
                    "bombing_run":"bomber",
                    "center_flag":"centerflag",
                    "command_center":"CommandCenter",
                    "danger_zone_3":"DangerZone",
                    "geokoala":"teamwork",
                    "hurricane":"Hurricane2",
                    "hyper_reactor":"HyperReactor",
                    "mars_ball_explorer":"WelcomeToMars",
                    "mars_game_mode":"GameMode",
                    "mode_7":"Mode7",
                    "snes_v2":"snes",
                    "thinking_with_portals":"ThinkingWithPortals",
                    "big_vird":"vee2",
                    "blast_off":"blastoff",
                    "boostsv2.1":"Boosts",
                    "contain_masters":"ContainMasters",
                    "diamond_faces":"Diamond",
                    "dumbell":"fullspeed",
                    "event_horizon":"eventhorizon",
                    "event_horizon_2":"eventhorizon2",
                    "figure_8":"map2-2",
                    "glory_hole":"RiskAndReward",
                    "grail_of_speed":"GrailOfSpeed",
                    "open_field_masters":"OFM",
                    "pokeball":"community1",
                    "push_it":"PushIt",
                    "the_holy_see":"HolySee",
                    "holy_see":"HolySee",
                    "vee":"bird",
                    "whirlwind_2":"whirlwind",
                    "yiss_3.2":"yiss 3.2",
                    "egg_ball":"mode/eggball"
                };
                Array.apply(null,mapList).forEach(function(mapOption) {
                    var name = mapOption.value;
                    mapNameKey[name.toLowerCase()] = name;
                });
                var map = mapNameKey[mapName] || ""; // defaults to random if the map name is not found
                tagpro.group.socket.emit("setting", {name : "map", value: map}); // syncs map change to server
            }
            if (GM_getValue("makepug","false") == "true"){
                console.log("Automated new group detected, setting comp settings");
                $('#pug-btn').click(); // Makes group a private game
                document.getElementsByClassName("btn btn-default group-assignment group-setting competitive-settings")[0].click(); // Turns on competitive settings
                GM_setValue("makepug", "false");
            }
            if (GM_getValue("groupId","none") != window.location.href.split("/")[4]){
                console.log("New group detected");
                document.getElementById("pug-btn").onclick = function(){ // Makes group a private game
                    console.log("Private group detected, setting up comp settings");
                    if (document.getElementsByName("competitiveSettings")[0].checked == false){
                        document.getElementsByClassName("btn btn-default group-assignment group-setting competitive-settings")[0].click(); // Turns on competitive settings
                    }
                }
            }
            GM_setValue("groupId",window.location.href.split("/")[4]);
            var buttonSettings = document.getElementsByClassName("pull-left player-settings")[0];
            var selectList = document.createElement("select");
            selectList.id = "autoscoreLeague";
            buttonSettings.appendChild(selectList);
            selectList.className = "form-control js-socket-setting";
            var abbrRequest = new XMLHttpRequest();
            abbrRequest.open("GET", "https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/teams.json");
            abbrRequest.responseType = "json";
            abbrRequest.send();
            abbrRequest.onload = function() {
                GM_setValue("autoscoreAbr",abbrRequest.response);
                var array = abbrRequest.response["Leagues"];
                for (var i = 0; i < array.length; i++) {
                    var option;
                    if (array[i] == "NA Competitive" || array[i] == "NA Tournaments" || array[i] == "EU Competitive" || array[i] == "OC Competitive"){
                        option = document.createElement("optgroup");
                        option.label = array[i];
                    }
                    else {
                        option = document.createElement("option");
                        option.value = array[i];
                        option.text = array[i];
                    }
                    selectList.appendChild(option);
                }
                if (abbrRequest.response["Leagues"].indexOf(GM_getValue("autoscoreImport","None")) > -1) { // Standard Import Condition
                    selectList.value = GM_getValue("autoscoreImport","None");
                }
                else { // This happens when the league has been removed from the teams json, usually because the season is over or league is dead
                    selectList.value = "None";
                }
                updateTeamAbr();
                document.getElementById("autoscoreLeague").onchange = function(){
                    updateTeamAbr();
                };
            }
        }
        else if(window.location.pathname.match(/^\/groups\/[a-z]{8}$/) && Array.apply(null, document.getElementsByClassName("js-leader")).length === 0){// non-leader in group
            // spectator shouldn't need arguments, so there's no need to parse group type/map choice
            console.log("Spectator/Player detected, skipping group setup");
            groupReady();
            GM_setValue("groupServer",window.location.href.split("-")[1].split(".")[0]);
            GM_setValue("groupId",window.location.href.split("/")[4]);
        }},250);
});

// In Game Functions
(function(window) {
    'use strict';
    if(!window.tagpro && window.location.port >=8000) {//comp game is detected when the tagpro object does not exist
        var userTeam = GM_getValue("userTeam","none");
        GM_setValue("userTeam","none");
        var groupPort = window.location.href.split(":")[2].split("/")[0];
        var m = new Date();
        var startTime = (Math.floor(m.getTime()/1000) + m.getTimezoneOffset()*60);
        console.log("Comp game detected on port "+groupPort+", player mode activated with team "+userTeam);
        const refreshRate = 10; // Times per second to update stats
        var backscoreRedCaps = 0; //backscore is taken directly from scoreboard, so it can be trusted
        var backscoreBlueCaps = 0;
        var updateRedCaps = 0; //auto is guessed from sound events, so it can't be trusted completely [used for cap updates]
        var updateBlueCaps = 0;
        var firstSound = true;
        document.getElementById("cheering").addEventListener("play",goodCap,false); //Note: play event does not activate if sounds are muted
        document.getElementById("sigh").addEventListener("play",badCap,false); // However, play event does activate is volume is set to 0 (but no mute)
        function goodCap(){
            if (firstSound == true){ //the first cheering sound starts the game, so don't increment cap counter
                console.log("Start of comp game detected");
                var x = new Date();
                startTime = (Math.floor(x.getTime()/1000) + x.getTimezoneOffset()*60); // gets start time in UTC to avoid timezone confusion
                firstSound = false;
            }
            else if (userTeam == 1){ // adds cap to Red team
                updateRedCaps += 1;
            }
            else if (userTeam == 2){ // adds cap to Blue team
                updateBlueCaps += 1;
            }
            capUpdate(updateRedCaps,updateBlueCaps,startTime,groupPort);
        }
        function badCap(){
            if (userTeam == 1){
                updateBlueCaps += 1;
            }
            else if (userTeam == 2){
                updateRedCaps += 1;
            }
            capUpdate(updateRedCaps,updateBlueCaps,startTime,groupPort);
        }
        var tableExport = [];
        var scoreboardCaps = [0,0];
        var teamNum = [];
        window.onbeforeunload = function(){//send stats before exiting the game
            if (typeof(backscoreRedCaps) == "undefined"){// undefined happens when there is no player on a team, so redefine to 0.
                backscoreRedCaps = 0;
            }
            if (typeof(backscoreBlueCaps) == "undefined"){
                backscoreBlueCaps = 0;
            }
            submitStats(backscoreRedCaps,backscoreBlueCaps,tableExport,teamNum,startTime,groupPort,false);
        };
        setInterval(function() {
            if($('#options').is(':visible')) {
                tableExport = [];
                $("table#stats tr").each(function() { // This part exports the stats table into an array to be exported later.
                    var arrayOfThisRow = [];
                    var tableData = $(this).find('td');
                    if (tableData.length > 0) {
                        tableData.each(function() {
                            arrayOfThisRow.push($(this).text().trim());
                        });
                        arrayOfThisRow.pop();
                        arrayOfThisRow.pop();
                        tableExport.push(arrayOfThisRow);
                    }
                });
                scoreboardCaps = [0,0];
                teamNum = [];
                $('#stats .stats tr').each(function(ind,el) { //every row
                    let $row = $(this);
                    if(!$row.hasClass('template')) {
                        let team = ($row.find('.scoreName.team-blue').length); //0 if red, 1 if blue
                        teamNum.push(team+1); // teamNum pushes the player team into an array to be exported.
                        var playerCapsRaw = $row.children().get(7).innerHTML;
                        var playerCapsNum = parseInt(playerCapsRaw);
                        scoreboardCaps[team] += playerCapsNum;
                    }
                });
                backscoreRedCaps = scoreboardCaps[0];
                backscoreBlueCaps = scoreboardCaps[1];
            }
        },1000/refreshRate);
    }
    else if (GM_getValue("compCheck",false) === true && window.location.port >= 8000) { // Spectator mode
        GM_setValue("compCheck",false); // Set comp check to false to avoid accidentally triggering spec mode
        var specGroupPort = window.location.port;
        var ma = new Date();
        var specStartTime = (Math.floor(ma.getTime()/1000) + ma.getTimezoneOffset()*60)+20; // set redundant start time
        var specRedCaps = 0;
        var specBlueCaps = 0;
        var endSubmit = false;
        var firstUpdate = false;
        console.log("TagPro Competitive Stats is now running in Spectator mode on port "+window.location.port);
        tagpro.ready(function(){
            if((GM_getValue("backRedJersey",false) || GM_getValue("backBlueJersey",false)) && enableJerseys) { // adapted version of Some Ball -1's jersey script
                var red = GM_getValue("backRedJersey");
                var blue = GM_getValue("backBlueJersey");
                var jersey = [red==="none"?false:red,blue==="none"?false:blue]; //incase "none" somehow makes it through
                if(jersey[0] || jersey[1]) {
                    var tr = tagpro.renderer,
                        oldUPSP = tr.updatePlayerSpritePosition;
                    tr.createJersey = function(player) {
                        if(!jersey[player.team-1]) {//make empty container if one team doesn't have a jersey
                            if(player.sprites.jersey) player.sprites.ball.removeChild(player.sprites.jersey);
                            player.sprites.jersey = new PIXI.DisplayObjectContainer();
                            player.sprites.jersey.team = player.team;
                            player.sprites.ball.addChildAt(player.sprites.jersey,1);
                        }
                        else {
                            if(player.sprites.jersey) {
                                player.sprites.ball.removeChild(player.sprites.jersey);
                            }
                            player.sprites.jersey = new PIXI.Sprite(PIXI.Texture.fromImage("http://i.imgur.com/"+jersey[player.team-1]+".png"));
                            player.sprites.jersey.team = player.team;
                            player.sprites.ball.addChildAt(player.sprites.jersey,1); //add on top of ball, below other stuff
                            player.sprites.jersey.anchor.x = 0.5;
                            player.sprites.jersey.anchor.y = 0.5;
                            player.sprites.jersey.x = 20;
                            player.sprites.jersey.y = 20;
                        }
                    };
                    tr.updatePlayerSpritePosition = function(player) {
                        if(!player.sprites.jersey) {
                            tr.createJersey(player);
                        }
                        if(player.sprites.jersey.team!==player.team) {
                            tr.createJersey(player);
                        }
                        var index = player.sprites.ball.getChildIndex(player.sprites.actualBall)+1;
                        if(index!==player.sprites.ball.getChildIndex(player.sprites.jersey)) {
                            player.sprites.ball.setChildIndex(player.sprites.jersey,index);
                        }
                        if(spinJerseys) {
                            player.sprites.jersey.rotation = player.angle;
                        }
                        oldUPSP(player);
                    };
                }
            }
            function setStartTime (){
                var tempStartTime = Math.floor(tagpro.gameEndsAt.getTime()/1000) + tagpro.gameEndsAt.getTimezoneOffset()*60;
                if (tempStartTime <= specStartTime+10){ // If you're in the 20 second waiting period, tagpro.gameEndsAt will return when the game starts
                    // A 10 second buffer is added for people who have faster balls
                    specStartTime = tempStartTime;
                }
                else { // regular condition, subtract game length from designated end time
                    specStartTime = tempStartTime - (parseInt(GM_getValue("groupTime","10"))*60);
                }
                capUpdate(tagpro.score.r, tagpro.score.b, specStartTime, specGroupPort); // first update should come from here since it has the correct start time
            }
            setTimeout(setStartTime, 1000); // tagpro.gameEndsAt is not immediately available, so ping a little after
            tagpro.socket.on("score", function(data){ // Cap update condition
                if (firstUpdate === true && (tagpro.score.r != 0 || tagpro.score.b != 0)){
                    if('r' in data) {
                        specRedCaps = data.r;
                    }
                    if('b' in data) {
                        specBlueCaps = data.b;
                    }
                    capUpdate(specRedCaps,specBlueCaps,specStartTime,specGroupPort);
                }
                else {
                    firstUpdate = true;
                }
            });
            tagpro.socket.on("end", function (data) { //  submit stats when the game ends
                var specExport= ["","","","","","","","","","","",""]; // apparently I'm too lazy to fix the empty space in the other one
                var specTeamExport = [];
                var finalId = Object.getOwnPropertyNames(tagpro.players);
                for (var i in finalId){
                    if (tagpro.players[finalId[i]]){
                        var playerrow = [];
                        var playerObject = tagpro.players[finalId[i]];
                        playerrow = [playerObject.auth ? "✓"+playerObject.name : playerObject.name, playerObject.score, playerObject["s-tags"], playerObject["s-pops"], playerObject["s-grabs"], playerObject["s-drops"], timeFromSeconds(playerObject["s-hold"],true), playerObject["s-captures"], timeFromSeconds(playerObject["s-prevent"],true), playerObject["s-returns"], playerObject["s-support"], playerObject["s-powerups"]];
                        specExport.push(playerrow);
                        specTeamExport.push(playerObject.team);
                    }
                }
                submitStats(specRedCaps,specBlueCaps,specExport,specTeamExport,specStartTime,specGroupPort,true);
                endSubmit = true;
            });
        });
        window.onbeforeunload = function(){ // sends stats if you leave the game for some reason before the end event
            GM_getValue("backRedJersey",false);
            GM_getValue("backBlueJersey",false);
            if (endSubmit === false) {
                var specExport= ["","","","","","","","","","","",""];
                var specTeamExport = [];
                var finalId = Object.getOwnPropertyNames(tagpro.players);
                for (var i in finalId){
                    if (tagpro.players[finalId[i]]){
                        var playerrow = [];
                        var playerObject = tagpro.players[finalId[i]];
                        playerrow = [playerObject.auth ? "✓ "+playerObject.name : playerObject.name, playerObject.score, playerObject["s-tags"], playerObject["s-pops"], playerObject["s-grabs"], playerObject["s-drops"], timeFromSeconds(playerObject["s-hold"],true), playerObject["s-captures"], timeFromSeconds(playerObject["s-prevent"],true), playerObject["s-returns"], playerObject["s-support"], playerObject["s-powerups"]];
                        specExport.push(playerrow);
                        specTeamExport.push(playerObject.team);
                    }
                }
                submitStats(specRedCaps,specBlueCaps,specExport,specTeamExport,specStartTime,specGroupPort,false);
            }
        };
    }
})(unsafeWindow);

// Misc Functions
function capUpdate(updateRedCaps,updateBlueCaps,startTime,groupPort){
    var y = new Date();
    var currentTime = (Math.floor(y.getTime()/1000) + y.getTimezoneOffset()*60); // gets start time in UTC
    var backscoreUpdate = "https://docs.google.com/forms/d/e/1FAIpQLSe57NOVRdas-tzT4MZ8-XPSkNO3MyKCTrAOyFGXp4PtNQcdkQ/formResponse?entry.133949532="+GM_getValue("backscoreRedAbr","Red")+"&entry.454687569="+GM_getValue("backscoreBlueAbr","Blue")+"&entry.184122371="+updateRedCaps+"&entry.1906941178="+updateBlueCaps+"&entry.2120828603="+GM_getValue("groupServer","none")+"&entry.1696460484="+GM_getValue("groupId","none")+"&entry.968816448="+GM_getValue("groupMap","none")+"&entry.1523561265="+startTime+"&entry.1474408630="+currentTime+"&entry.1681155627="+groupPort+"&entry.1189129646="+GM_getValue("groupTime","none")+"&entry.197322272="+"226078"+"&submit=Submit";
    if (currentTime-startTime < GM_getValue("groupTime",0)*60 && GM_getValue("backscoreBlueAbr","Blue") != "Blue" && GM_getValue("backscoreRedAbr","Red") != "Red"){
        $.post(backscoreUpdate); //post score update
        console.log("Cap detected, score update sent and is now "+updateRedCaps+"-"+updateBlueCaps);
    }
}
function getJerseys(){
    var specRedTeam = GM_getValue("backscoreRedAbr","none");
    var specBlueTeam = GM_getValue("backscoreBlueAbr","none");
    var teamJersey = GM_getValue("jerseyLinks");
    if (teamJersey.hasOwnProperty(specRedTeam)){// If jersey exists, set jersey
        GM_setValue("backRedJersey", teamJersey[specRedTeam][0]);
    }
    else {// otherwise, set to false to avoid issues
        GM_setValue("backRedJersey",false);
    }
    if (teamJersey.hasOwnProperty(specBlueTeam)){ // repeat for blue
        GM_setValue("backBlueJersey", teamJersey[specBlueTeam][1]);
    }
    else {
        GM_setValue("backBlueJersey",false);
    }
}
function groupReady(){
    tagpro.ready(function(){
        GM_setValue("compCheck",false);
        var jerseyRequest = new XMLHttpRequest();
        jerseyRequest.open("GET", "https://raw.githubusercontent.com/Poeticalto/tagpro-comp-stats/master/jerseys.json"); // This json contains a master list of jerseys
        jerseyRequest.responseType = "json";
        jerseyRequest.send();
        jerseyRequest.onload = function() {
            GM_setValue("jerseyLinks",jerseyRequest.response);
        }
        var group = tagpro.group = Object.assign(tagpro.group, {
            self: GM_getValue("tpUserId",undefined),
            players: {}
        });
        var socket = group.socket;
        socket.on("member", function(member) {
            group.players[member.id] = Object.assign(group.players[member.id] || {}, member);
        });
        socket.on("play", function(){
            if (typeof group != "undefined" && typeof group.self != "undefined" && typeof group.players != "undefined"){
                GM_setValue("userTeam",group.players[group.self].team);
            }
            else if (typeof group.self == "undefined"){
                GM_setValue("userTeam","none");
            }
            GM_setValue("backscoreRedAbr",$("input[name='redTeamName']").val());
            GM_setValue("backscoreBlueAbr",$("input[name='blueTeamName']").val());
            GM_setValue("groupMap",$("div[class='js-setting-value']")[0].innerHTML);
            GM_setValue("groupTime",$("div[class='js-setting-value']")[1].innerHTML.split(" Minute")[0]);
            GM_setValue("groupCapLimit",$("div[class='js-setting-value']")[2].innerHTML.split(" Capture Limit")[0]);
            var scriptCheck = false; // check if no script is enabled
            var warnCheck = false; // check if respawn warnings are disabled
            for (var i = 0; i < document.getElementsByClassName("extra-setting").length;i++){
                var extraSetting = document.getElementsByClassName("extra-setting")[i].innerText;
                if (extraSetting == "× User Scripts Disable" || extraSetting == "User Scripts Disable"){
                    scriptCheck = true;
                }
                else if (extraSetting == "× Respawn Warnings Disable" || extraSetting == "Respawn Warnings Disable"){
                    warnCheck = true;
                }
            }
            if (scriptCheck === true && warnCheck === true){
                GM_setValue("compCheck",true);
                getJerseys();
            }
            else {
                GM_setValue("compCheck",false);
            }
        });
    });
}

function setTournament(tournamentServer){
    switch (tournamentServer){ // change abbreviations to match the default tournament of the server
        case "radius":
            GM_setValue("autoscoreImport","RCL");
            break;
        case "sphere":
            GM_setValue("autoscoreImport","TToC");
            break;
        case "centra":
            GM_setValue("autoscoreImport","Pipberry");
            break;
        default:
            break;
    }
}

function submitStats(backscoreRedCaps,backscoreBlueCaps,tableExport,teamNum,startTime,groupPort,endCheck){
    var z = new Date();
    var endTime = (Math.floor(z.getTime()/1000) + z.getTimezoneOffset()*60); // gets end time in UTC
    var backscoreLink = "https://docs.google.com/forms/d/e/1FAIpQLSe57NOVRdas-tzT4MZ8-XPSkNO3MyKCTrAOyFGXp4PtNQcdkQ/formResponse?entry.133949532="+GM_getValue("backscoreRedAbr","Red")+"&entry.454687569="+GM_getValue("backscoreBlueAbr","Blue")+"&entry.184122371="+backscoreRedCaps+"&entry.1906941178="+backscoreBlueCaps+"&entry.2120828603="+GM_getValue("groupServer","none")+"&entry.1696460484="+GM_getValue("groupId","none")+"&entry.968816448="+GM_getValue("groupMap","none")+"&entry.2065162742="+encodeURIComponent(tableExport.toString().replace(/\s+/g, " "))+"&entry.2098213735="+teamNum.toString()+"&entry.2031694514="+"X"+"&entry.1523561265="+startTime+"&entry.1474408630="+endTime+"&entry.1681155627="+groupPort+"&entry.1189129646="+GM_getValue("groupTime","none")+"&entry.197322272="+"226078"+"&submit=Submit";
    var backscoreLinkFail = "https://docs.google.com/forms/d/e/1FAIpQLSe57NOVRdas-tzT4MZ8-XPSkNO3MyKCTrAOyFGXp4PtNQcdkQ/formResponse?entry.133949532="+GM_getValue("backscoreRedAbr","Red")+"&entry.454687569="+GM_getValue("backscoreBlueAbr","Blue")+"&entry.184122371="+backscoreRedCaps+"&entry.1906941178="+backscoreBlueCaps+"&entry.2120828603="+GM_getValue("groupServer","none")+"&entry.1696460484="+GM_getValue("groupId","none")+"&entry.968816448="+GM_getValue("groupMap","none")+"&entry.2065162742="+encodeURIComponent(tableExport.toString().replace(/\s+/g, " "))+"&entry.2098213735="+teamNum.toString()+"&entry.1523561265="+startTime+"&entry.1474408630="+endTime+"&entry.1681155627="+groupPort+"&entry.1189129646="+GM_getValue("groupTime","none")+"&entry.197322272="+"226078"+"&submit=Submit";
    var groupCapLimit = GM_getValue("groupCapLimit",-1);
    if (groupCapLimit == "No"){
        groupCapLimit = -1;
    }
    if (endCheck === true) { // This occurs when a spectator reaches the end of the game and the 'end' event is activated
        $.post(backscoreLink);
        console.log("Game detected as complete [End event], stats submitted");
    }
    else if (endTime-startTime > GM_getValue("groupTime",0)*60){//This is the Time success condition, when stats are submitted after the game has ended
        $.post(backscoreLink);
        console.log("Game detected as complete [Time], stats submitted");
    }
    else if (backscoreRedCaps == groupCapLimit || backscoreBlueCaps == groupCapLimit){//This is the Cap success condition, when stats are submitted when cap limit is reached
        $.post(backscoreLink);
        console.log("Game detected as complete [Cap Limit], stats submitted");
    }
    else{ //Everything else means something went wrong, i.e. game ended early or the you left the game early
        $.post(backscoreLinkFail);
        console.log("Game detected as incomplete, stats submitted");
    }
}

function updateTeamAbr(){ // This function fills in the team abbreviations
    var abrJson = GM_getValue("autoscoreAbr");
    GM_setValue("autoscoreImport",document.getElementById("autoscoreLeague").value);
    var redTeamName = document.getElementsByClassName("team-name")[2];
    var blueTeamName = document.getElementsByClassName("team-name")[3];
    var teams = [];
    var teamsRaw = [];
    var teamsLabels = [];
    var redTeamAbr;
    var blueTeamAbr;
    if (!!document.getElementById("redTeamAbr")){
        redTeamAbr = document.getElementById("redTeamAbr");
        blueTeamAbr = document.getElementById("blueTeamAbr");
    }
    else {
        redTeamAbr = document.createElement("select");
        blueTeamAbr = document.createElement("select");
        redTeamAbr.id = "redTeamAbr";
        blueTeamAbr.id = "blueTeamAbr";
        redTeamName.appendChild(redTeamAbr);
        blueTeamName.appendChild(blueTeamAbr);
    }
    if (document.getElementById("redTeamAbr").style.display == "none"){
        document.getElementById("redTeamAbr").style.display = "block";
        document.getElementById("blueTeamAbr").style.display = "block";
    }
    switch(document.getElementById("autoscoreLeague").value){
            // teams is the list which is shown on the group page
            // teamsLabels is the list of labels to help differentiate teams (usually server or conference)
            // teamsRaw is the list of abbreviations to put into the group
        case "TToC": // tournaments follow the same procedure so flow one case because I'm lazy
        case "RCL":
        case "CLTP":
        case "Pipberry":
            var tourneyModifier;
            if (document.getElementById("autoscoreLeague").value == "TToC"){
                tourneyModifier = "T";
            }
            else if (document.getElementById("autoscoreLeague").value == "RCL"){
                tourneyModifier = "R";
            }
            else if (document.getElementById("autoscoreLeague").value == "CLTP"){
                tourneyModifier = "C";
            }
            else if (document.getElementById("autoscoreLeague").value == "Pipberry"){
                tourneyModifier = "Y";
            }
            teams = [""];
            for (i=1;i<=24;i++){
                if (i < 10){
                    teams.push(tourneyModifier+"0"+i);
                }
                else {
                    teams.push(tourneyModifier+i);
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
    while (redTeamAbr.firstChild) {
        redTeamAbr.removeChild(redTeamAbr.firstChild);
        blueTeamAbr.removeChild(blueTeamAbr.firstChild);
    }
    for (var i = 0; i < teams.length; i++) {
        var optionr;
        var optionb;
        if (teamsLabels.indexOf(teams[i])>-1){
            optionr = document.createElement("optgroup");
            optionb = document.createElement("optgroup");
            optionr.label = teams[i];
            optionb.label = teams[i];
        }
        else{
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
    document.getElementById("redTeamAbr").onchange = function(){
        if (document.getElementById("redTeamAbr").value.length <= 0){
            tagpro.group.socket.emit("setting",{name:"redTeamName",value:"Red"});
        }
        else{
            tagpro.group.socket.emit("setting", {name: "redTeamName", value: teamsRaw[teams.indexOf(redTeamAbr.value)]});
        }
    };
    document.getElementById("blueTeamAbr").onchange = function(){
        if (document.getElementById("blueTeamAbr").value.length <= 0){
            tagpro.group.socket.emit("setting", {name: "blueTeamName", value: "Blue"});
        }
        else {
            tagpro.group.socket.emit("setting", {name: "blueTeamName", value: teamsRaw[teams.indexOf(blueTeamAbr.value)]});
        }
    };
}
//stolen from tagpro client code
function pad(t, e) {
    t = t.toString();
    var i = (e = e.toString()) + t,
        o = e.length > t.length ? e.length : t.length;
    return i.substr(i.length - o);
}
//stolen from tagpro client code
function timeFromSeconds(t, e) {
    if(0 == e) e = !1;
    var i = pad;
    t = parseFloat(t);
    var o = parseInt(t / 3600),
        n = t % 60,
        r = i(parseInt(t / 60) % 60, "00") + ":" + i(n, "00");
    return (!e || o > 0) && (r = i(o, "00") + ":" + r), r;
}