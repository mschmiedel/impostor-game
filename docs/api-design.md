## Impostor Game

### Create Game
* POST /createGame
* Payload:
  * Age of players: integer (age of youngest player)
  * Name of Creator: string
* Create a new Entry in redis with the game-id (new uuid) as key, and the game properties as value
  * `{
    "gameId": "uuid",
    "adminPwd": "uuid"
    "age": 10
    "status": "JOINING|STARTED|FINISHED"
    "players": [
      {
        "name": "Bob",
        "id": "uuid"
      },
      {
        "name": "Alice",
        "id": "uuid"
      }
    ],}`
  * Return the following payload if everything worked
    * `{ "gameId": "uuid", "status": "JOINING", "adminPwd": "uuid", "playerID": "uuid" }`
    * PlayerID is the id of the player who created the game
  * Return 400 or 500 if something went wrong

### Get Game Details
* GET /getGameDetails/:gameId?adminPwd=:uuid
* Returns full game details 1:1 from redis
* Return 404 if game not found
* Return 401 if adminPwd is wrong
* Return 400 or 500 if something went wrong

### Join Game
* POST /joinGame/:gameId
* Payload:
  * Player Name: string
* Add player to game in redis
* Return 200 if everything worked, Body: `{ "playerID": "uuid" }`
* Return 404 if game not found
* Return 400 or 500 if something went wrong (player already joined, game already started)

### Start Game
* POST /startGame/:gameId?adminPwd=:uuid
* Set game status to STARTED in redis
* Return 200 if everything worked, Body: `{ "status": "STARTED" }`

### Next Turn
* POST /nextTurn/:gameId?adminPwd=:uuid
* Return 200 if everything worked, Body: `{ "role": "CIVILIAN|IMPOSTOR", "word": "foo"|null }`
* Save a new turn in redis under the game in turns, with the following format: 
  * `{ "word": "foo"
       "impostors": [ "uuid1", "uuid2" ],
       "civilians": ["uuid3", "uuid4"]}`
  * Assign all players a role (CIVILIAN or IMPOSTOR) randomly with the following rules:
    * At least one impostor
    * 1/3 of players should be impostors or round down. 
      * 2 players -> 1 impostor
      * 3 players -> 1 impostor
      * 5 players -> 1 impostor
      * 6 players -> 2 impostors
      * 9 players -> 3 impostors
* For getting the word, ask google gemini ai for the word with the following prompt adding age from game as parameter:
  "We are playing Impostor Game. Please choose a random word that is suitable for age {{age}}. Return it as json object with key word."
  Use ENV Variable GOOGLE_API_KEY for the api key
  Use the model gemini-flash-lite-latest
* Return 404 if game not found
* Return 401 if adminPwd is wrong
* Return 400 or 500 if something went wrong

### Finish Game
* POST /finishGame/:gameId?adminPwd=:uuid
* Set game status to FINISHED in redis
* Return 200 if everything worked, Body: `{ "status": "FINISHED" }`
