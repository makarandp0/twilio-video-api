# twilio-video-api

This project is hosted @ https://makarandp0.github.io/twilio-video-api/

This app demonstrates usage of twilio-video sdk. The purpose is to be able to quickly test the api.

# Setup
- Step 1: clone the repo (https://github.com/makarandp0/twilio-video-api.git)

```
git clone https://github.com/makarandp0/twilio-video-api.git

```

- Step 2: install the dependencies.

```
cd twilio-video-api
npm install
```

- Step 3: store your twilio credentials in `twilio_credentials.json`
You can find your credentials at [twilio console](https://www.twilio.com/console/project/settings)

```
cp server/twilio_credentials.json_template server/twilio_credentials.json

```

- Step 4: start server
This server is used by the webpage to generate token to join a room.
```
node server
```
server by defaults listens to requests on port 3000

- Step 5: start the application
```
npm start
```

App starts listening on port 8080

open http://localhost:8080/


# Usage

app supports various url parameters

| parameter     | usage                                 | default  |
| ------------- |:--------------------------------------|:--------|
| room          | if specified used as the name of the room to join | auto generated |
| identity      | if specified used as identity to join the room  | auto generated   |
| autoJoin      | if true app joins specified room after page load  | `false`   |
| autoPublish   | if not false app publishes tracks as they are created  | `true`   |
| autoVideo     | if specified app creates local video track at startup  |  `false`  |
| autoAudio     | if specified app creates local audio track at startup  |  `false`  |
| topology      | type of room to use  |  `group-small`  |
| env           | backend environment to use  |  `prod`  |
| connectOptions| additional connect options to use  | `{"logLevel":"debug"}`   |
| token         | token or token server url to use to join the room |  `/token`  |


when navigated to
http://localhost:8080/?room=foo&autoJoin&autoAudio&autoVideo&identity=mak

The page will join room `foo` with `mak` as local identity and publish a video and audio track to the room.


# Online demo
To join the room you would need to specify `token` parameter.