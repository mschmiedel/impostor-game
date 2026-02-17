## Main Page (index.html)
* Create Game Section
* Age input (10 as default value, 5-100 as range)
* Language dropdown (German, English, Spanish, French, Italian as options) Value always "de-DE" or similar, add different regions if possible (Deutsch - Deutschland, Español - México, etc.)
* Start Game Button
  * calls create game Api
  * redirects to game page

## Game Page (game.html)
* First waiting to join and showing new players as they join (poll every 2 seconds)
* Have a Link to join the game page with the game uuid
* Option to start game (only if you are the host) -> minimum 3 players to start game.
* Game Board
  * Turn Counter
  * Actual Role
  * Actual Word (if civilian)
* Once started, option to Start new Turn. (only if you are the host)
* Option to finish game (only if you are the host)

## Join Game Page (join.html)
* Input Game UUID if not in query
* Enter Name
* Join Game Button -> calls join api and redirects to game page