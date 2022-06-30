# twilio-video-api

This app demonstrates usage of twilio-video sdk.  It allows you to connect multiple participants to  twilio-video room, and publish media.

# Setup
- Step 1: clone the repo

```
git clone https://github.com/makarandp0/twilio-video-api.git

```

- Step 2: install dependencies.

```
cd twilio-video-api
npm install
```

- Step 3: update twilio credentials
create and update `twilio_credentials.json`. You can find your credentials at [twilio console](https://www.twilio.com/console/project/settings)

```
cp server/twilio_credentials.json_template server/twilio_credentials.json

```

- Step 4: start server

This server is used by the webpage to generate token to join a room.
```
node server
```
server by defaults listens to requests on port 3002

- Step 5: open the application

There are two ways to open the app. You can use online version or you can run it locally. To run online version point your browser to: https://makarandp0.github.io/twilio-video-api/


Run it locally:

```
npm start
```

App starts listening on port 8080, Open http://localhost:8080/



# Usage

app supports various url parameters

| parameter       | usage                                 | default  |
| --------------- |:--------------------------------------|:--------|
| room            | if specified used as the name of the room to join | auto generated |
| identity        | if specified used as identity to join the room  | auto generated   |
| autoJoin        | if true app joins specified room after page load  | `false`   |
| autoPublish     | if not false app publishes tracks as they are created  | `true`   |
| autoVideo       | if specified app creates local video track at startup  |  `false`  |
| autoAudio       | if specified app creates local audio track at startup  |  `false`  |
| extraInfo       | if specified app renders links to room properties      |  `false`  |
| sendLogs        | if specified app sends console logs over data channel. Useful for testing mobile->desktop | `false` |
| logLevel        | if specified used as default log level | `WARN` |
| extraRoomOptions| specify json for extra room options like maxParticipants, videoCodecs, mediaRegion etc.  |   |
| topology        | type of room to use  |  `group-small`  |
| env             | backend environment to use  |  `prod`  |
| extraConnectOptions  | additional connect options to use  | `{"networkQuality":true}`   |
| server          | server to use to acquire token to join video room |  `http://localhost:3002`  |
| trackConstraints| constraints to use when creating a track |  ``  |


when navigated to
http://localhost:8080/?room=foo&autoJoin&autoAudio&autoVideo&identity=mak

The page will join room `foo` with `mak` as local identity and publish a video and audio track to the room.


# Online demo
This app is hosted at https://makarandp0.github.io/twilio-video-api/. It requires that you run your [token server](https://github.com/makarandp0/twilio-video-api/tree/main/server) on localhost port 3002 or pass `Server` parameter pointing to where the server is running.
