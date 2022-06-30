/* eslint-disable no-console */
import { randomParticipantName, randomRoomName } from  './randomName';
import { createButton, IButton } from './components/button';
import { createDiv } from './components/createDiv';
import { createElement } from './components/createElement';
import { createLabeledCheckbox } from './components/createLabeledCheckbox';
import { createLabeledInput } from './components/createLabeledInput';
import { createLink } from './components/createLink';
import { createSelection } from './components/createSelection';
import { getBooleanUrlParam } from './components/getBooleanUrlParam';
import { log } from './components/log';
import { Log, LocalTrack, Room, LocalDataTrack } from 'twilio-video';

import jss from './jss'
import { createCollapsibleDiv } from './components/createCollapsibleDiv';
import { getRestCreds, REST_CREDENTIALS } from './getCreds';
import { logLevelSelector } from './logutils';
import { setupLocalDescriptionOverride } from './setupLocalDescriptionOverride';

// @ts-ignore
// import clipBoardImage  from '../assets/clipboard.jpeg';

// Create your style.
const style = {
  roomControls: {
    width: '300px',
    display: 'flex',
    padding: '5px',
    // 'justify-contents': 'space-around',
    // border: 'solid black 1px',
    'flex-direction': 'column',
    'flex-wrap': 'wrap',
    'background-color': '#fff',
  },
  roomControlsInput: {
    // padding: '0.5em',
    'text-align': 'center',
  },
  zIndex: {
    // padding: '0.5em',
    'z-index': 10,
  },
  roomControlsRow: {
    'width': "100%",
    'flex-direction': 'row',
    'display': 'flex',
    'justify-content': 'space-around',
    'margin-top': '10px',
  },
  roomControlsLabel: {
    'flex-direction': 'column',
    'display': 'flex',
    'justify-content': 'center',
    'margin-top': '10px',
    // 'margin-right': '10px',
  },
  roomControlsButton: {
    'text-align': 'center'
  },
  joinRoomButton: {
    height: '3em',
  },
  width100: {
    width: '100%',
  },
  controlOptions: {
    display: 'flex',
    'flex-flow': 'row wrap',
    'margin-top': '10px',
    'justify-content': 'space-around',
    'align-items': 'center',
  },
  constraintsLabel: {
    // width: '100%',
    'text-align': 'center',
    'margin-top': '10px',
    'margin-right': '10px',
  },
  constraintsInput: {
    // width: '100%',
    // padding: '0.5em'
  },
  // imageBackground: {
  //   backgroundImage: "url(" + clipBoardImage + ")",
  //   'background-size': 'contain',
  //   'background-repeat': 'no-repeat',
  // }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

function handleSDKLogs(logger: Log.Logger) {
  let localDataTrack: LocalDataTrack|null = null;
  let localIdentity: string|null = null;
  const originalFactory = logger.methodFactory;
  logger.methodFactory = function(methodName: string, level: Log.LogLevelNumbers, loggerName: string) {
    const method = originalFactory(methodName, level, loggerName);
    return function(dateTime: Date, logLevel: string, component: string, message: string, data: any) {
      method(dateTime, logLevel, component, message, data);
      if (localDataTrack) {
        localDataTrack.send(JSON.stringify({
          localIdentity,
          dateTime,
          logLevel,
          component,
          message,
          data
        }));
      }
      // check for signaling events that previously used to be
      // emitted on (now deprecated) eventListener
      // they are fired with message = `event`, and group == `signaling`
      if (message === 'event' && data.group === 'signaling') {
        // console.log(`makarand EventListenerAPI | ${data.name}`);
      }
    };
  };

  // returns a function that allows sending logs to data channel.
  return {
    setLocalDataTrack: (dataTrack: LocalDataTrack, identity: string ) => {
      localDataTrack = dataTrack;
      localIdentity = identity;
    }
  }
}

export interface IRoomControl {
  shouldAutoAttach: () => boolean,
  shouldAutoPublish: () => boolean,
  getRoomControlsDiv: () => HTMLElement,
  getRoomCredentials: () => Promise<{ token: string, environment: string }>,
  getTrackConstraints: () => string
};

export function createRoomControls(
  container: HTMLElement,
  Video: typeof import('twilio-video'),
  localTracks: LocalTrack[],
  roomJoined: (room: Room, logger: Log.Logger, restCreds: REST_CREDENTIALS | null) => void
): IRoomControl {
  const urlParams = new URLSearchParams(window.location.search);


  ({ innerDiv: container } = createCollapsibleDiv({ container, headerText: 'Controls', divClass: sheet.classes.roomControls }));
  createElement({ container, type: 'h3', id: 'twilioVideoVersion', innerHtml: 'Twilio-Video@' + Video.version });

  const selectionDiv = createDiv(container, sheet.classes.roomControlsRow);
  const topologySelect = createSelection({
    id: 'topology',
    container: selectionDiv,
    options: ['group-small', 'peer-to-peer', 'group', 'go'],
    title: 'topology: ',
    labelClasses: [],
    onChange: () => {
      log('topology change:', topologySelect.getValue());
    }
  });

  // let extraConnectOptions: { value: string; };
  const envSelect = createSelection({
    id: 'env',
    container: selectionDiv,
    options: ['dev', 'stage', 'prod'],
    title: ' env: ',
    labelClasses: [],
    onChange: () => {
      const newEnv = envSelect.getValue();
      if (newEnv === 'dev') {
        // eslint-disable-next-line no-use-before-define
        // for dev2: wss://umatilla.vss.dev.twilio.com/signaling
        // const devOptions = Object.assign({}, defaultExtraConnectOptions, { wsServer: 'wss://us2.vss.dev.twilio.com/signaling' });
        const devOptions = {
          ...defaultExtraConnectOptions,
          wsServer: 'wss://us2.vss.dev.twilio.com/signaling'
        }
        extraConnectOptionsControl.value = urlParams.get('extraConnectOptions') || JSON.stringify(devOptions, null, 2);
      } else {
        const oldExtraConnectOptions = JSON.parse(extraConnectOptionsControl.value);
        delete oldExtraConnectOptions.wsServer;
        extraConnectOptionsControl.value = urlParams.get('extraConnectOptions') || JSON.stringify(oldExtraConnectOptions, null, 2);
      }
      log('env change:', newEnv);
    }
  });

  const roomAndIdentity = createDiv(container, sheet.classes.roomControlsRow);
  const identityInput = createLabeledInput({
    labelParent: true,
    container: roomAndIdentity,
    labelText: 'identity: ',
    placeHolder: 'Enter identity or random one will be generated',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.roomControlsInput]
  });

  const roomNameInput = createLabeledInput({
    labelParent: true,
    container : roomAndIdentity,
    labelText: 'Room: ',
    placeHolder: 'Enter room name or random name will be generated',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.roomControlsInput]

  });

  //
  // TODO: besides server also allow to use token created from: 'https://www.twilio.com/console/video/project/testing-tools'
  const labelText = createLink({ container, linkText: 'server', linkUrl: 'https://github.com/makarandp0/twilio-video-api#usage', newTab: true });
  labelText.classList.add(sheet.classes.roomControlsLabel);
  const tokenServerUrlInput = createLabeledInput({
    container,
    labelText,
    placeHolder: 'Enter server url',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.roomControlsInput, sheet.classes.zIndex]
  });

  const extraRoomOptionsControl = createLabeledInput({
    container,
    labelText: 'extraRoomOptions: ',
    placeHolder: 'extraRoomOptions as json here',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.zIndex],
    inputType: 'textarea'
  });

  const extraConnectOptionsControl = createLabeledInput({
    container,
    labelText: 'extraConnectOptions: ',
    placeHolder: 'extraConnectOptions as json here',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.zIndex],
    inputType: 'textarea'
  });


  const controlOptionsDiv = createDiv(container, sheet.classes.controlOptions, 'control-options');

  // container, labelText, id
  const autoPublish = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'autoPublish', id: 'autoPublish' });
  const autoAttach = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'autoAttach', id: 'autoAttach' });
  const extraInfo = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'extraInfo', id: 'extraInfo' });
  const sendLogs = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'sendLogs', id: 'sendLogs' });
  // const autoRecord = createLabeledCheckbox({ container: controlOptionsDiv, labelText: 'record', id: 'recordParticipant' });
  const defaultLogger = Video.Logger.getLogger('twilio-video');
  const logLevelSelect = logLevelSelector({ container: controlOptionsDiv, logger: defaultLogger });

  // for working with dev env use:
  // const defaultOptions = { wsServer: "wss://us2.vss.dev.twilio.com/signaling" };
  // for simulcast use:
  // { preferredVideoCodecs: [ { codec: "VP8", "simulcast": true }] }
  // const defaultOptions = { networkQuality: { local: 3, remote: 0 } };
  // const defaultOptions = {
  //   "preferredVideoCodecs": [{"codec":"H264"}],
  //   "iceTransportPolicy" : "relay"
  // };
  // goes into extraConnectOptionsControl
  const defaultExtraConnectOptions = {
    networkQuality: { local: 1, remote: 0 },
    dominantSpeaker: true,
    preferredVideoCodecs: 'auto',
    // preferredAudioCodecs: [{ codec: "opus", dtx: true }],
    // preferredAudioCodecs: [],
    bandwidthProfile: {
      video: {
        maxSwitchedOnTracks: 10,
        clientTrackSwitchOffControl: 'manual',
        contentPreferencesMode: 'manual',
      },
      audio: {
        maxSwitchedOnTracks: 10
      }
    }
  };

  // goes into extraRoomOptionsControl
  const defaultExtraRoomOptions = {
    recordParticipantsOnConnect: false,
    mediaRegion: "gll", // you can specify something like: "us2",
    maxParticipants: "default", // large-room is created when participants are 51+
    videoCodecs: "default", // you can specify something like: ["H264"] or ["H264", "VP8"]
    largeRoom: "true"
  };

  function getRoomOptions() {
    const identity = identityInput.value || randomParticipantName(); // randomName();
    const environment = envSelect.getValue();
    const roomName = roomNameInput.value;
    let topology = topologySelect.getValue();

    let extraRoomOptions = {};
    if (extraRoomOptionsControl.value !== '') {
      try {
        extraRoomOptions = JSON.parse(extraRoomOptionsControl.value);
      } catch (e) {
        console.warn('failed to parse room options.', e);
        // return;
      }
    }

    console.log('before: ', JSON.stringify(extraRoomOptions));
    Object.keys(extraRoomOptions).forEach(key => {
      // @ts-ignore
      if (extraRoomOptions[key] === "default") {
        // @ts-ignore
        delete extraRoomOptions[key];
      }
    });
    console.log('after: ', JSON.stringify(extraRoomOptions));

    return {
      environment, topology, roomName, identity,
      extraRoomOptions: JSON.stringify(extraRoomOptions)
    };
  }

  async function getRoomCredentials(): Promise<{token: string, environment: string}> {
    const tokenOptions = getRoomOptions();
    let tokenServerUrl = tokenServerUrlInput.value;
    let url = new URL(tokenServerUrl + '/token');
    console.log('Getting Token For: ', tokenOptions);
    url.search = (new URLSearchParams(tokenOptions)).toString();
    try {
      const response = await fetch(url.toString());
      if (response.ok) {
        const tokenResponse = await response.json();
        return { token: tokenResponse.token,  environment: tokenOptions.environment };
      }
      throw new Error(`Failed to obtain token from ${url}, Status: ${response.status}`);
    } catch (ex) {
      throw new Error(`Error fetching token ${url}, ${ex.message}`);
    }
  }

  async function joinRoom(token: string, restCreds: REST_CREDENTIALS | null) {
    const roomName = roomNameInput.value;
    if (!roomName) {
      // eslint-disable-next-line no-alert
      alert('Please enter a room name.');
      return;
    }

    let extraConnectOptions = {};
    if (extraConnectOptionsControl.value !== '') {
      try {
        extraConnectOptions = JSON.parse(extraConnectOptionsControl.value);
      } catch (e) {
        console.warn('failed to parse additional connect options.', e);
        return;
      }
    }

    // Local track logs are always connected on twilio-video logger
    // so use the same logger when we want to send logs.
    const loggerName = sendLogs.checked ? 'twilio-video' : `[${identityInput.value}]:` ;
    const logger = Video.Logger.getLogger(loggerName);
    logger.setLevel(defaultLogger.getLevel());

    const publishLogsAsData = sendLogs.checked;

    const logProcessor = handleSDKLogs(logger);
    const connectOptions = {
      loggerName,
      tracks: autoPublish.checked ? localTracks : [],
      name: roomName,
      environment: envSelect.getValue(),
      ...extraConnectOptions
    };
    // @ts-ignore
    if (connectOptions.video || connectOptions.audio) {
      // @ts-ignore
      delete connectOptions.tracks;
    }
    // Join the Room with the token from the server and the
    // LocalParticipant's Tracks.
    log(`Joining room ${roomName} with ${JSON.stringify(connectOptions, null, 2)} ${autoPublish.checked ? 'with' : 'without'} ${localTracks.length} localTracks`);

    try {
      const room = await Video.connect(token, connectOptions);
      roomJoined(room, logger, restCreds);
      identityInput.value = randomParticipantName(); // randomName();
      if (publishLogsAsData) {
        const localDataTrack = new Video.LocalDataTrack();
        await room.localParticipant.publishTrack(localDataTrack);
        logProcessor.setLocalDataTrack(localDataTrack, loggerName);
      }
    } catch (error) {
      log('Could not connect to Twilio: ' + error.message);
    }
  }

  // eslint-disable-next-line consistent-return
  const btnJoin = createButton('Join', container, async () => {
    setupLocalDescriptionOverride();
    try {
      const token = (await getRoomCredentials()).token;
      let restCreds: REST_CREDENTIALS | null =  null;
      if (extraInfo.checked) {
        try {
          restCreds = await getRestCreds(envSelect.getValue(), tokenServerUrlInput.value);
        } catch (restError) {
          log('failed to get rest credentials:', restError);
        }
      }
      return joinRoom(token, restCreds);
    } catch (ex) {
      log('Failed: ', ex);
    }
  });

  const trackConstraintsInput = createLabeledInput({
    container,
    labelText: 'trackConstraints: ',
    placeHolder: 'Optional, ex:\n{ "frameRate": 1, "width": 120 }',
    labelClasses: [sheet.classes.roomControlsLabel],
    inputClasses: [sheet.classes.roomControlsInput, sheet.classes.zIndex],
    inputType: 'textarea'
  });

  const controlsAndDefaults = [
    {control: roomNameInput, urlParamName: 'room', inputType: 'editBox', defaultValue: randomRoomName()},
    {control: identityInput, urlParamName: 'identity', inputType: 'editBox', defaultValue: randomParticipantName()},
    {control: tokenServerUrlInput, urlParamName: 'server', inputType: 'editBox', defaultValue: 'http://localhost:3002'},
    {control: extraConnectOptionsControl, urlParamName: 'extraConnectOptions', inputType: 'editBox', defaultValue: JSON.stringify(defaultExtraConnectOptions, null, 2)},
    {control: extraRoomOptionsControl, urlParamName: 'extraRoomOptions', inputType: 'editBox', defaultValue: JSON.stringify(defaultExtraRoomOptions, null, 2)},
    {control: autoAttach, urlParamName: 'autoAttach', inputType: 'checkBox', defaultValue: true},
    {control: autoPublish, urlParamName: 'autoPublish', inputType: 'checkBox', defaultValue: true},
    {control: extraInfo, urlParamName: 'extraInfo', inputType: 'checkBox', defaultValue: false},
    {control: sendLogs, urlParamName: 'sendLogs', inputType: 'checkBox', defaultValue: false},
    {control: topologySelect, urlParamName: 'topology', inputType: 'selectBox', defaultValue: 'group'},
    {control: envSelect, urlParamName: 'env', inputType: 'selectBox', defaultValue: 'prod'},
    {control: logLevelSelect, urlParamName: 'logLevel', inputType: 'selectBox', defaultValue: 'DEBUG'},
    {control: trackConstraintsInput, urlParamName: 'trackConstraints', inputType: 'editBox', defaultValue: '{ "width": 1280, "height": 720 }'},
  ];
  setDefaultValues();
  function setDefaultValues() {
    controlsAndDefaults.forEach(({ control, urlParamName, inputType, defaultValue }) => {
      if ('value' in control) {
        if (inputType === 'checkBox' && typeof defaultValue === 'boolean' ) {
          control.checked = getBooleanUrlParam(urlParamName, defaultValue);
        } else if (inputType === 'editBox' && typeof defaultValue === 'string' ) {
          control.value = urlParams.get(urlParamName) || defaultValue;
        } else {
          console.error('Error Not processing: ', urlParamName);
        }
      } else if ('setValue' in control && typeof defaultValue === 'string' ) {
        control.setValue(urlParams.get(urlParamName) || defaultValue);
      } else {
        console.error('Error Not processing: ', urlParamName);
      }
    })
  }

  const copyPasteControls = createDiv(container, sheet.classes.roomControlsRow);

  const clipboardBtn = createButton('Copy', copyPasteControls, () => {
    const url = new URL(window.location.origin + window.location.pathname);
    controlsAndDefaults.forEach(({ control, urlParamName, inputType, defaultValue }) => {
      if ('value' in control) {
        if (inputType === 'checkBox' && typeof defaultValue === 'boolean' && control.checked !== defaultValue) {
            url.searchParams.append(urlParamName, control.checked ? 'true' : 'false');
        } else if (inputType === 'editBox' && typeof defaultValue === 'string' && defaultValue != control.value) {
          url.searchParams.append(urlParamName, control.value);
        }
      } else if ('setValue' in control && typeof defaultValue === 'string' && control.getValue() !== defaultValue ) {
        url.searchParams.append(urlParamName, control.getValue());
      }
    });
    console.log("URL:", url.toString());
    navigator.clipboard.writeText(url.toString());
  });

  const pasteFromClipboard = createButton('Paste', copyPasteControls, async () => {
    const string = await navigator.clipboard.readText();
    const url = new URL(string);
    controlsAndDefaults.forEach(({ control, urlParamName, inputType, defaultValue }) => {
      const searchParamValue = url.searchParams.get(urlParamName);
      if (searchParamValue != null) {
        if ('value' in control) {
          if (inputType === 'checkBox') {
            control.checked = searchParamValue === 'true' ? true : false;
          } else if (inputType === 'editBox') {
            control.value = searchParamValue;
          }
        } else if ('setValue' in control) {
          control.setValue(searchParamValue);
        }
      }
    });
  });
  pasteFromClipboard.btn.classList.add(sheet.classes.width100);
  clipboardBtn.btn.classList.add(sheet.classes.width100);


  // clipboardBtn.btn.classList.add(sheet.classes.imageBackground);
  btnJoin.btn.classList.add(sheet.classes.joinRoomButton);


  if (urlParams.has('autoJoin')) {
    btnJoin.click();
  }

  return {
    shouldAutoAttach: () => autoAttach.checked,
    shouldAutoPublish: () => autoPublish.checked,
    getRoomControlsDiv: () => container,
    getRoomCredentials,
    getTrackConstraints: () => trackConstraintsInput.value
  };
}


