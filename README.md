# **tagpro-comp-stats**

The purpose of the TagPro Competitive Stats userscript is to save competitive game data for TagPro under STATS, or the Standardized Tracking and Accountability of TagPro Statistics. This is accomplished by providing standardized abbreviations for every single team and sending game data/cap updates for games played with the no-script toggle.

This userscript and the corresponding database of game data are not supported or affiliated with TagPro or KoalaBeast.

---

### [Download the userscript here](https://gist.github.com/Poeticalto/00de8353fce79cac9059b22f20242039/raw/TagPro_Competitive_Group_Maker.user.js)

Note: You'll need to download [Tampermonkey or other alternative](https://tampermonkey.net/) to use this userscript. The link above goes to the corresponding gist of the userscript in this repo, but the two are identical.

### [View game data here](https://docs.google.com/spreadsheets/d/1iETlKt4k8a4MS1PssIdbzGeoKZMFNgm1yh5JkpbrctE/edit#gid=1114772042)

Look up your game on the Raw Games sheet and input the id on one of the viewers. You can also switch the format to show seconds for hold/prevent instead of minutes:seconds. 

You can also filter games via map, up to 2 team names, server, up to 4 players, and date.

Raw data can also be retrived to submit to TPL. Just copy the cell containing the raw data, paste it into a pastebin, and submit it with the rest of your stats!

---

### **Using this Script in the Group Page**

If you're the group leader, a new option will appear for you [underneath the swap teams button.](https://i.imgur.com/KnH9E8v.png)

If you've ever worried about what abbreviations to use in your games, you'll never have to worry again. Just select the league you're playing in at the top, and [a nice box will appear allowing you to specify team names.](https://i.imgur.com/37HMuj5.png)

If you're done setting team names and don't want the boxes to set team names anymore, simply set the league to "None" and the boxes will disappear.

Once you've specified the team names and everyone is in, you're ready to launch the game!

If you're a player, this script will save 7 things before you launch into game: Red Team Name, Blue Team Name, Group ID, Server, Map, Time Limit, and Cap Limit.

---

### **Using this script in game**

When you're in game, this script essentially rips the scoreboard into an array and sends it as you leave the game, along with the stuff that was saved before. It's not fancy like tagpro.eu stats, but it'll get the job done for now.

If you're using custom team names, the script will also send cap updates, which allows for live score tickers to be implemented by each league.

So other than making sure the scoreboard is open when you leave the game (and assuming you leave when the game ends that already happens,) you don't have to do anything special in game to make sure stuff gets sent!

If you are viewing a no-script game in spectator mode, you will also be able to send stats and cap updates through this script. In addition, if a team has corresponding jerseys, this script will show them as well while you are watching the game. (You can disable jerseys or jersey spin in the options if needed.)

---

### **teams.json and jerseys.json**

This script imports two jsons in order to provide accurate information for players.

teams.json holds information about each team and the corresponding abbreviation. It is formatted as a json object where each league is a property. Each league contains three arrays. The first array is the raw list. This is the list that will show up under the Red and Blue team names. The second array contains header labels. These labels help to distinguish teams based on some qualification like server or conference. The third array is the abbreviation list. This array should be the exact same size as the first array, where each position corresponds to the abbreviation of the team in the first array.

In addition, there is a Leagues property which contains the list of all leagues in the json. This is used to populate the autoscore league selector at the top of the group page.

jerseys.json holds the raw imgur IDs for the jerseys of each team. It is formatted as a json object where each team abbreviation is a property. Abbreviations are sorted alphabetically, with the exception of NLTP (with league identifiers A and B) because league rules mandate the same abbreviation for both teams. Each abbreviation contains a single array with two strings and two numbers corresponding to the raw imgur IDs of the jerseys and the transparency of each jersey. The first string is the red jersey and the second string is the blue jersey. The first number corresponds to the transparency of the actual ball with the red jersey and the second number corresponds to the transparency of the actual ball with the blue jersey. 1 is the default value while 0 is fully transparent.

For examples on how to format each json, consult the teams.json and jerseys.json above.

--- 

### **Concise Update Log**

For detailed changes prior to v0.30, [check here.](https://gist.github.com/Poeticalto/00de8353fce79cac9059b22f20242039/revisions)

V0.01 (12/17/2017)- Updated Destar's private group scripts to toggle no-script and accept maps as an argument

V0.1 (12/17/2017)- Added update/download URLs to the script

V0.1a (12/18/2017)- Changed structure of non-standard map selection

V0.11 (12/18/2017)- Added ability to set Autoscore abbreviations

v0.12 (12/20/2017)- Changed leader conditions, added labels to easily identify leagues, and added the ability to manually submit stats

v0.13 (12/20/2017)- General script cleanup, changed leader conditions, and improved onChange detection for team names

v0.14 (12/20/2017)- General script cleanup

v0.15 (12/20/2017)- Removed debug language from script testing 

v0.15a (12/20/2017)- Changed label to "Competitive Group" on the main page

v0.16 (12/20/2017)- Added non-leader support for saving team names

v0.16a (12/20/2017)- Changed leader conditions

v0.17 (12/20/2017)- Changed leader conditions

V0.18 (03/04/2018)- Added function to send data automatically before exiting game, added game data

V0.19 (03/06/2018)- Added variables to help identify when the game has ended and help differentiate game data, disabled sending cap updates until infrastructure is set up 

V0.20 (unreleased)- Added ELTP/OLTP team abbreviations, enabled cap updates

V0.21 (03/22/2018)- Added functions to calculate cap updates based off sound events, improved overall functionality of code

V0.22 (03/25/2018)- fixed 0 startTime bug because some people apparently like playing with sounds off

V0.23 (03/29/2018)- fixed player bug relating to the group socket 'play' event

V0.24 (04/13/2018)- updated MLTP team abbreviations to S15

V0.25 (04/28/2018)- updated NLTP team abbreviations to S12, restructured cap update conditions

v0.26 (05/01/2018)- "BDL update", changed the default behavior of the abbreviations list to a blank option instead of the first abbreviation

v0.27 (05/23/2018)- "#Update", fixed a bug where certain special characters would prevent stats from submitting properly

v0.28 (08/04/2018)- updated MLTP team abbreviations to S16, fixed default group bug, restructured abbreviations in the group page, userscript now sends a cap update at the beginning of the game

v0.29 (08/05/2018)- "Destar's QoL update", added the option to disable the abbreviation selector under team names by selecting the "None" option in the league selector

v0.30 (08/12/2018)- Added a spectator mode and corresponding checks, fixed passing map names through URL, updated NLTP abbreviations to S13, changed default nature of tournament groups created using #tg, cleaned up in game functions, restructured update conditions for stats table, restructured various functions, restructured group identifier conditions

v0.31 (08/16/2018)- Changed format of abbreviations, added jerseys to Spectator mode, fix spacing bug, fix 0-0 score update bug, extend time before first score update, general cleanup
