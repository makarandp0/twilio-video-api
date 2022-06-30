/* eslint-disable callback-return */
/* eslint-disable no-console */
'use strict';

const credentials = require('./twilio_credentials.json');

var http = require('http');
const cors = require('cors');
// Automatically allow cross-origin requests

const twilio = require('twilio');
var AccessToken = twilio.jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;
var express = require('express');
var randomName = require('./randomname');

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;


function getCredentials(environment) {
  const { accountSid, signingKeySid, signingKeySecret, authToken } = credentials[environment];
  return { accountSid, authToken, signingKeySid, signingKeySecret, environment };
}

function createAccessToken({ environment = 'prod', identity, roomName }) {
  const {
    accountSid,
    signingKeySid,
    signingKeySecret
  } = credentials[environment];

  const accessTokenGenerator = new AccessToken(
    accountSid,
    signingKeySid,
    signingKeySecret,
    { identity, ttl: MAX_ALLOWED_SESSION_DURATION });

  // Grant the access token Twilio Video capabilities.
  const grant = roomName ? new AccessToken.VideoGrant({ room: roomName }) : new VideoGrant();
  accessTokenGenerator.addGrant(grant);
  return accessTokenGenerator.toJwt();
}

// fetch is available only on Node 18+ we have to wait.
async function createRoomUsingFetch({ environment = 'prod', topology, roomName, extraRoomOptions }) {
  const HOST_NAME_REST = environment === 'prod' ? 'video.twilio.com' : `video.${envSelect.getValue()}.twilio.com`;
  const HOST_URL_REST = 'https://' + HOST_NAME_REST;

  if (extraRoomOptions)  {
    extraRoomOptions = JSON.parse(extraRoomOptions);
  }
  console.log('extraRoomOptions = ', extraRoomOptions);
  const fetchURL = 'https://' + HOST_NAME_REST + '?' + new URLSearchParams({
    Type: topology,
    UniqueName: roomName,
    ...extraRoomOptions
  });
  console.log('fetchURL: ', fetchURL);
  try {
    const response = await fetch(fetchURL, {
      headers: {
        Authorization: Buffer.from('apiKeySid.value + ":" + apiKeySecret.value').toString('base64')
      },
      method: "POST"
    });

    console.log(' response.ok = ', response.ok, ' status = ', response.status );
    if (response.ok) {
      console.log('response ok!');
      const json = await response.json();
      if (json.status === 'in-progress') {
        return json;
      }
    }
    console.log(response);
    return response;
  } catch (ex) {
    console.log('Fetch error: ', ex);
  }
}

async function createRoom({ environment = 'prod', topology, roomName, extraRoomOptions }) {
  const { accountSid, signingKeySid, signingKeySecret } = getCredentials(environment);
  console.log('Using account: ', accountSid);
  const { video } = twilio(signingKeySid, signingKeySecret, {
    accountSid,
    region: environment === 'prod' ? null : environment,
    logLevel: 'debug'
  });

  console.log('extraRoomOptions = ', extraRoomOptions);
  if (extraRoomOptions)  {
    extraRoomOptions = JSON.parse(extraRoomOptions);
  }

  const createRoomOptions = {
    type: topology,
    uniqueName: roomName,
    ...extraRoomOptions
  };

  console.log('createRoomOptions: ', createRoomOptions);
  const result = await video.rooms.create(createRoomOptions).catch(error => {
    if (error.code !== 53113) {
      console.log('Error creating room: ', error);
      throw error;
    }
    return video.rooms(roomName).fetch();
  });
  console.log('createRoom returned:', result);
  return result;
}

async function completeRoom({ environment = 'prod', roomName }) {
  const { accountSid, signingKeySid, signingKeySecret } = getCredentials(environment);
  const { video } = twilio(signingKeySid, signingKeySecret, {
    accountSid,
    region: environment === 'prod' ? null : environment
  });

  const result = await video.rooms(roomName).update({ status: 'completed' });
  console.log('completeRoom returned: ', result);
  return result;
}

// Create Express webapp.
const app = express();
app.use(cors({ origin: true }));

app.get('/getCreds', function(request, response) {
  const { environment = 'prod' } = request.query;
  const { accountSid, signingKeySid, signingKeySecret, authToken } = getCredentials(environment);
  response.set('Content-Type', 'application/json');
  response.send({ accountSid, authToken, environment, signingKeySid, signingKeySecret });
});

app.get('/token', async function(request, response, next) {
  console.log("request.query:", request.query);
  const { identity = randomName(), environment = 'prod', topology, roomName, extraRoomOptions } = request.query;
  if (topology) {
    // topology was specified, have to create room
    try {
      const result = await createRoom({ environment, roomName, topology, extraRoomOptions });
      // const result = await createRoomUsingFetch({ environment, roomName, topology, extraRoomOptions });

      response.set('Content-Type', 'application/json');

      result.token = createAccessToken({ environment, roomName, identity });
      result.identity = identity;
      response.send(result);
    } catch (err) {
      if (err.code === 53100) {
        console.log('Failed to create room error 53100:, will try to get token anyways');
        const token = createAccessToken({ environment, roomName, identity });
        response.send({ identity, token });
      } else {
        next(err);
      }

    }
  } else {
    const token = createAccessToken({ environment, identity });
    response.send({ identity, token });
  }
});

// creates a room and a token for it.
app.get('/getOrCreateRoom', async function(request, response, next) {
  try {
    const { roomName, topology, environment, extraRoomOptions } = request.query;
    const result = await createRoom({ environment, roomName, topology, extraRoomOptions });
    response.set('Content-Type', 'application/json');
    result.token = createAccessToken({ environment, roomName, topology });
    response.send(result);
  } catch (err) {
    next(err);
  }
});

app.get('/completeRoom', async function(request, response, next) {
  const { environment, roomName } = request.query;
  try {
    const result = await completeRoom({ environment, roomName });
    response.set('Content-Type', 'application/json');
    response.send(result);
  } catch (err) {
    next(err);
  }
});

// Create http server and run it.
var server = http.createServer(app);
var port = 3002;
server.listen(port, function() {
  console.log('Express server running on *:' + port);
});
