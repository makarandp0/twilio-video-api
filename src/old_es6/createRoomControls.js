/* eslint-disable no-console */
import { randomName, randomRoomName } from './randomName.js';
import createButton from '../old_jsutilmodules/button.js';
import { createDiv } from '../old_jsutilmodules/createDiv.js';
import { createElement } from '../old_jsutilmodules/createElement.js';
import { createLabeledCheckbox } from '../old_jsutilmodules/createLabeledCheckbox.js';
import { createLabeledInput } from '../old_jsutilmodules/createLabeledInput.js';
import { createLink } from '../old_jsutilmodules/createLink.js';
import { createSelection } from '../old_jsutilmodules/createSelection.js';
import { getBooleanUrlParam } from '../old_jsutilmodules/getBooleanUrlParam.js';
import { log } from '../old_jsutilmodules/log.js';

function handleSDKLogs(logger) {
  const originalFactory = logger.methodFactory;
  logger.methodFactory = function(methodName, level, loggerName) {
    const method = originalFactory(methodName, level, loggerName);
    return function(dateTime, logLevel, component, message, data) {
      method(...arguments);
      // check for signaling events that previously used to be
      // emitted on (now deprecated) eventListener
      // they are fired with message = `event`, and group == `signaling`
      if (message === 'event' && data.group === 'signaling') {
        console.log(`makarand EventListenerAPI | ${data.name}`);
      }
    };
  };
  // logger.setLevel(logLevel);
  // logger = Twilio.Video.Logger.getLogger('twilio-video');
  // logger.setLevel('DEBUG');
  // const originalFactory = logger.methodFactory;
  //     logger.methodFactory = (methodName, level, loggerName) => {
  //       const method = originalFactory(methodName, level, loggerName);
  //       return (datetime, logLevel, component, message, event) => {
  //         method(datetime, logLevel, component, message, event);
  //         // check for signaling events that previously used to be
  //         // emitted on (now deprecated) eventListener
  //         // they are fired with message = `event`, and group == `signaling`
  //         if (message === 'event' && event.group === 'signaling') {
  //           console.log(`EventListenerAPI | ${event.name}`)
  //         }
  //       };
  //     };
}

/**
 *
 * @param {*} container
 * @param {*} Video
 * @param {*} roomJoined - callback is called when a room is joined to.
 * @param {*} localTracks - array of local tracks.
 */
export function createRoomControls({ container, Video, roomJoined, localTracks }) {
  const urlParams = new URLSearchParams(window.location.search);
  const roomControlsDiv = createDiv(container, 'room-controls', 'room-controls');

  const twilioVideoVersion = createElement(roomControlsDiv, { type: 'h3', id: 'twilioVideoVersion' });
  twilioVideoVersion.innerHTML = 'Twilio-Video@' + Video.version;

  const topologySelect = createSelection({
    id: 'topology',
    container: roomControlsDiv,
    options: ['group-small', 'peer-to-peer', 'group', 'go'],
    title: 'topology',
    onChange: () => log('topology change:', topologySelect.getValue())
  });

  let extraConnectOptions;
  const envSelect = createSelection({
    id: 'env',
    container: roomControlsDiv,
    options: ['dev', 'stage', 'prod'],
    title: 'env',
    onChange: () => {
      const newEnv = envSelect.getValue();
      if (newEnv === 'dev') {
        // eslint-disable-next-line no-use-before-define
        extraConnectOptions.value = urlParams.get('connectOptions') || JSON.stringify({ wsServer: 'wss://us2.vss.dev.twilio.com/signaling' });
      }
      log('env change:', newEnv);
    }
  });

  const tokenInput = createLabeledInput({
    container: roomControlsDiv,
    labelText: createLink({ container: roomControlsDiv, linkText: 'Token or TokenUrl', linkUrl: 'https://www.twilio.com/console/video/project/testing-tools', newTab: true }),
    placeHolder: 'Enter token or token server url',
    labelClasses: ['tokenLabel'],
  });

  const localIdentity = createLabeledInput({
    container: roomControlsDiv,
    labelText: 'Identity: ',
    placeHolder: 'Enter identity or random one will be generated',
    labelClasses: ['identityLabel'],
  });

  const roomNameInput = createLabeledInput({
    container: roomControlsDiv,
    labelText: 'Room: ',
    placeHolder: 'Enter room name or random name will be generated',
    labelClasses: ['roomNameLabel'],
  });

  extraConnectOptions = createLabeledInput({
    container: roomControlsDiv,
    labelText: 'ConnectOptions: ',
    placeHolder: 'connectOptions as json here',
    labelClasses: ['connectOptionsLabel'],
    inputClasses: ['connectOptions'],
    inputType: 'textarea'
  });

  const controlOptionsDiv = createDiv(roomControlsDiv, 'control-options', 'control-options');

  // container, labelText, id
  const autoPublish = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'Auto Publish', id: 'autoPublish' });
  const autoAttach = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'Auto Attach', id: 'autoAttach' });
  const autoJoin = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'Auto Join', id: 'autoJoin' });
  const autoRecord = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'Record Participant', id: 'recordParticipant' });

  // process parameters.

  roomNameInput.value = urlParams.get('room') || randomRoomName();
  localIdentity.value = urlParams.get('identity') || randomName();
  const { protocol, host, pathname } = window.location;
  console.log({ protocol, host, pathname });
  tokenInput.value = urlParams.get('token') || `${protocol}//${host}/token`; // 'http://localhost:3000/token'

  // for working with dev env use: {"wsServer":"wss://us2.vss.dev.twilio.com/signaling"}
  extraConnectOptions.value = urlParams.get('connectOptions') || JSON.stringify({ logLevel: 'warn' });
  autoJoin.checked = urlParams.has('room') && urlParams.has('autoJoin');
  topologySelect.setValue(urlParams.get('topology') || 'group-small');
  // wsServer.value = urlParams.get('wsserver');
  envSelect.setValue(urlParams.get('env') || 'prod');
  autoAttach.checked = getBooleanUrlParam('autoAttach', true);
  autoPublish.checked = getBooleanUrlParam('autoPublish', true);
  autoRecord.checked = getBooleanUrlParam('record', false);

  /**
   * Get the Room credentials from the server.
   * @param {string} [identity] identity to use, if not specified server generates random one.
   * @returns {Promise<{identity: string, token: string}>}
   */

  async function getRoomCredentials() {
    const identity = localIdentity.value || randomName();
    let token = tokenInput.value;
    if (token.indexOf('http') >= 0) {
      let tokenUrl = token;
      const topology = topologySelect.getValue();
      const environment = envSelect.getValue();
      const roomName = roomNameInput.value;
      const recordParticipantsOnConnect = autoRecord.checked;

      let url = new URL(tokenUrl);

      console.log('Getting Token For: ', { environment, topology, roomName, identity, recordParticipantsOnConnect });
      const tokenOptions = { environment, topology, roomName, identity, recordParticipantsOnConnect };
      url.search = new URLSearchParams(tokenOptions);
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Failed to obtain token from ${url}, Status: ${response.status}`);
    } else if (token.length === 0) {
      throw new Error('Must specify token or tokenUrl');
    }

    return { token, identity };
  }


  function joinRoom(token) {
    const roomName = roomNameInput.value;
    if (!roomName) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name.');
      return;
    }

    let additionalConnectOptions = {};
    if (extraConnectOptions.value !== '') {
      try {
        additionalConnectOptions = JSON.parse(extraConnectOptions.value);
      } catch (e) {
        console.warn('failed to parse additional connect options.', e);
        return;
      }
    }

    log(`Joining room ${roomName} ${autoPublish.checked ? 'with' : 'without'} ${localTracks.length} localTracks`);
    const loggerName = `[${localIdentity.value}]:`;
    const logger = Video.Logger.getLogger(loggerName);
    handleSDKLogs(logger);
    const connectOptions = Object.assign({
      loggerName,
      tracks: autoPublish.checked ? localTracks : [],
      name: roomName,
      environment: envSelect.getValue()
    }, additionalConnectOptions);
    // Join the Room with the token from the server and the
    // LocalParticipant's Tracks.
    log(`Joining room ${roomName} with ${JSON.stringify(connectOptions, null, 2)}`);

    Video.connect(token, connectOptions)
      .then(room => {
        roomJoined(room, logger);
        // get new local identity for next join.
        localIdentity.value = randomName();
      }).catch(error => {
        log('Could not connect to Twilio: ' + error.message);
      });
  }

  // eslint-disable-next-line consistent-return
  const btnJoin = createButton('Join', roomControlsDiv, async () => {
    try {
      const token = (await getRoomCredentials()).token;
      return joinRoom(token);
    } catch (ex) {
      log('Failed: ', ex);
    }
  });

  if (autoJoin.checked) {
    btnJoin.click();
  }

  if (typeof Video.testPreflight === 'function') {
    let preflightTest = null;
    createButton('preparePreflight', roomControlsDiv, async () => {
      const aliceToken = (await getRoomCredentials()).token;
      const bobToken = (await getRoomCredentials()).token;
      createButton('testPreflight', roomControlsDiv, async () => {
        console.log('starting preflight');
        const environment = envSelect.getValue();
        preflightTest = Video.testPreflight(aliceToken, bobToken, { duration: 10000, environment });
        const deferred = {};
        deferred.promise = new Promise((resolve, reject) => {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });

        const logger = Video.Logger.getLogger('twilio-video');
        preflightTest.on('debug', (room1, room2) => {
          console.log('preflight debug:', room1, room2);
          roomJoined(room1, logger);
          roomJoined(room2, logger);
        });

        preflightTest.on('progress', progress => {
          console.log('preflight progress:', progress);
        });

        preflightTest.on('error', error => {
          console.error('preflight error:', error);
          deferred.reject(error);
        });

        preflightTest.on('completed', report => {
          console.log('preflight completed:', JSON.stringify(report, null, 4));
          deferred.resolve(report);
        });

        await deferred.promise;
      });
    });
  }
  return {
    shouldAutoAttach: () => autoAttach.checked,
    shouldAutoPublish: () => autoPublish.checked,
    getEnv: () => envSelect.getValue()
  };
}


