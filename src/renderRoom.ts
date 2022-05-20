/* eslint-disable no-console */
import { createButton } from './components/button';
import { createDiv } from './components/createDiv';
import { createLabeledStat } from './components/labeledstat';
import { createLink } from './components/createLink';
import { createSelection } from './components/createSelection';
import { REST_CREDENTIALS } from './getCreds';
import { log as log2 } from './components/log';
import { updateLocalTrackStats } from './renderLocalTrack';
import {
  Log,
  Room,
  LocalVideoTrackStats,
  RemoteAudioTrackStats,
  RemoteVideoTrackStats,
  Participant,
  Track
} from 'twilio-video';
import { IRenderedRemoteParticipant, renderRemoteParticipant } from './renderRemoteParticipant';
import jss from './jss'
import { createCollapsibleDiv } from './components/createCollapsibleDiv';
import { logLevelSelector } from './logutils';
// Create your style.
const style = {
  background_gray: {
    background: 'gray',
  },
  background_yellow: {
    background: 'yellow',
  },
  background_green: {
    background: 'lightgreen',
  },
  background_red: {
    background: 'red',
  },
  remoteParticipants: {
    display: 'flex',
    height: 'auto',
    margin: 'auto',
    width: '100%',
    'justify-content': 'flex-start',
    'flex-wrap': 'wrap',
    'background-color': '#fff',
    'text-align': 'center',
  },
  roomContainer: {
    display: 'flex',
    margin: '5px',
    'flex-direction': 'column',
    // border: 'solid black 1px',
  },
  remoteTrackControls: {
    /* since it attaches to track container */
    /* does not need top border */
    'border-bottom': 'solid 1px black',
    'border-left': 'solid 1px black',
    'border-right': 'solid 1px black',
  },
  participantDiv: {
    margin: '2px',
  },
  participantMediaDiv: {
    padding: '5px',
    display: 'flex',
    'flex-wrap': 'wrap'
  },
  roomHeaderDiv: {
    display: 'flex'
  },
  publication: {
    padding: '5px'
  },
  collapsibleArea: {
    all:'inherit'
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();


async function renderExtraRoomInformation({ room, container, restCreds }:
  {
    room: Room,
    container: HTMLElement,
    restCreds: REST_CREDENTIALS,
  }) {
  const credentialsAt = `${restCreds.signingKeySid}:${restCreds.signingKeySecret}@`;
  const urlWithCreds = restCreds.restUrl;
  const urlWithoutCreds = restCreds.restUrlNoCreds;

  createLink({ container, linkText: 'RecordingRules', linkUrl: `${urlWithCreds}/v1/Rooms/${room.sid}/RecordingRules`, newTab: true });

  createButton('copy start recording', container, () => {
    const command = `curl -X POST '${urlWithCreds}/v1/Rooms/${room.sid}/RecordingRules' \
    -u '${restCreds.signingKeySid}:${restCreds.signingKeySecret}' \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d 'Rules=[{"type": "include", "all": "true"}]'`;
    navigator.clipboard.writeText(command);
  });

  createButton('copy stop recording', container, () => {
    const command = `curl -X POST '${urlWithCreds}/v1/Rooms/${room.sid}/RecordingRules' \
    -u '${restCreds.signingKeySid}:${restCreds.signingKeySecret}' \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d 'Rules=[{"type": "exclude", "all": "true"}]'`;
    navigator.clipboard.writeText(command);
  });

  createButton('copy Complete Room', container, () => {
    const command = `curl -X POST '${urlWithCreds}/v1/Rooms/${room.sid}' \
    -u '${restCreds.signingKeySid}:${restCreds.signingKeySecret}' \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d 'Status=completed'`;
    navigator.clipboard.writeText(command);
    // completeRoom
  });

  createLink({ container, linkText: `/v1/Rooms/${room.sid}`, linkUrl: `${urlWithCreds}/v1/Rooms/${room.sid}`, newTab: true });

  // this works.
  createButton('log room details to console', container, async () => {
    try {
      var headers = new Headers();
      headers.append('Authorization', 'Basic ' + btoa(restCreds.signingKeySid + ':' + restCreds.signingKeySecret));
      const result = await fetch(`${urlWithoutCreds}/v1/Rooms/${room.sid}`, { headers });
      console.log('Fetch room result: ', result);
      if (result.ok) {
        const json = await result.json();
        console.log('Result.json = ', JSON.stringify(json, null, 4));
      }

    } catch (e) {
      console.log('Error fetching: ', e);
    }
  });
}

export async function renderRoomDetails({ room, container, restCreds, logger }: {
  room: Room,
  container: HTMLElement,
  restCreds: REST_CREDENTIALS|null,
  logger: Log.Logger
}) {
  const roomStateAndSid = createLabeledStat({
    container,
    label: 'state',
    valueMapper: (text: string) => {
      switch(text) {
        case 'connected': return undefined;
        case 'reconnecting': return sheet.classes.background_yellow;
        case 'disconnected': return sheet.classes.background_red;
        default:
          return sheet.classes.background_red;
      }
   }
  });
  roomStateAndSid.setLabel(room.sid);
  roomStateAndSid.setText(room.state)

  const { innerDiv, outerDiv: collapsible }  = createCollapsibleDiv({ container, headerText: `Room Details`, divClass: sheet.classes.roomContainer, startHidden: true });
  container = innerDiv;
  const logLevelSelect = logLevelSelector({ container, logger });
  if (restCreds !== null) {
    renderExtraRoomInformation({ room, container, restCreds });
  }
  createButton('open monitor', container, () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@twilio/video-room-monitor/dist/browser/twilio-video-room-monitor.js';
    script.onload = () => {
      // @ts-ignore
      const monitor = window.Twilio.VideoRoomMonitor;
      monitor.registerVideoRoom(room);
      monitor.openMonitor();
    };
    document.body.appendChild(script);
  });

  // createLabeledStat({ container, label: 'room.sid' }).setText(room.sid);
  createLabeledStat({ container, label: 'localParticipant.sid' }).setText(room.localParticipant.sid);

  const recording = createLabeledStat({
    container,
    label: 'isRecording',
    valueMapper: (text: string) => text === 'true' ? sheet.classes.background_red : undefined
  });

  const dominantSpeaker = createLabeledStat({ container, label: 'dominantSpeaker' });
  const updateDominantSpeaker = () => dominantSpeaker.setText(room.dominantSpeaker ? room.dominantSpeaker.identity : 'none');
  room.on('dominantSpeakerChanged', updateDominantSpeaker);
  updateDominantSpeaker();

  const networkQuality = createLabeledStat({
    container,
    label: 'localParticipant.networkQualityLevel',
    valueMapper: (text: string) => {
      switch(text) {
        case 'null':
          return sheet.classes.background_gray;
        case '0':
        case '1':
          return sheet.classes.background_red;
        case '2':
        case '3':
            return sheet.classes.background_yellow;
        case '4':
        case '5':
          return undefined;
        default:
          return sheet.classes.background_red;
      }
    }
  });

  const updateNetworkQuality = () => networkQuality.setText(`${room.localParticipant.networkQualityLevel}`);
  room.localParticipant.addListener('networkQualityLevelChanged', updateNetworkQuality);

  const updateRecordingState = () => recording.setText(`${room.isRecording}`);
  const updateRoomState = () => roomStateAndSid.setText(room.state);

  const mosScore = createLabeledStat({
    container,
    label: 'mos',
  });
  mosScore.setText('null');

  const updateMos = () => {
    // @ts-ignore
    const mos = room.mosScore;
    console.log('room.mosScore: ', mos);
    mosScore.setText(`${mos}`);
  };
  room.addListener('mosScoreChanged', updateMos);
  room.addListener('disconnected', updateRoomState);
  room.addListener('reconnected', updateRoomState);
  room.addListener('reconnecting', updateRoomState);
  room.addListener('recordingStarted', () => {
    log2('recordingStarted');
    updateRecordingState();
  });
  room.addListener('recordingStopped', () => {
    log2('recordingStopped');
    updateRecordingState();
  });
  updateRoomState();
  updateRecordingState();
  updateNetworkQuality();

}

export async function renderRoom({ room, container, shouldAutoAttach, restCreds, logger }: {
  room: Room,
  container: HTMLElement,
  shouldAutoAttach: () => boolean,
  restCreds: REST_CREDENTIALS|null,
  logger: Log.Logger
}) {

  const { innerDiv, outerDiv: collapsible }  = createCollapsibleDiv({ container, headerText: room.localParticipant.identity, divClass: sheet.classes.roomContainer });
  container = innerDiv;
  // createLabeledStat({ container, label: 'class' }).setText('Room');

  renderRoomDetails({ room, container, restCreds, logger});
  const btnDisconnect = createButton('disconnect', container, () => {
    room.disconnect();
    collapsible.remove();
  });

  const isDisconnected = room.state === 'disconnected';

  // When we are about to transition away from this page, disconnect
  // from the room, if joined.
  window.addEventListener('beforeunload', () => room.disconnect());

  btnDisconnect.show(!isDisconnected);

  const renderedParticipants = new Map<Participant.SID, IRenderedRemoteParticipant>();
  const remoteParticipantsContainer = createDiv(container, sheet.classes.remoteParticipants, 'remote-participants');
  room.participants.forEach(participant => {
    renderedParticipants.set(participant.sid, renderRemoteParticipant(participant, remoteParticipantsContainer, room, restCreds, shouldAutoAttach));
  });

  // When a Participant joins the Room, log the event.
  room.on('participantConnected', participant => {
    renderedParticipants.set(participant.sid, renderRemoteParticipant(participant, remoteParticipantsContainer, room, restCreds, shouldAutoAttach));
  });

  // When a Participant leaves the Room, detach its Tracks.
  room.on('participantDisconnected', participant => {
    const rendered = renderedParticipants.get(participant.sid);
    if (rendered) {
      rendered.stopRendering();
      renderedParticipants.delete(participant.sid);
    }
  });

  var statUpdater = setInterval(async () => {
    const statReports = await room.getStats();
    statReports.forEach(statReport => {
      // statReport.localVideoTrackStats, can have multiple entries for a local video tracks when simulcast is enabled.
      // fold them into single entry.
      const trackSidToLayerStats = new Map<string, LocalVideoTrackStats[]>();
      statReport.localVideoTrackStats.forEach((trackStat: LocalVideoTrackStats) => {
        let statArray = trackSidToLayerStats.get(trackStat.trackSid);
        if (statArray) {
          statArray.push(trackStat);
        } else {
          trackSidToLayerStats.set(trackStat.trackSid, [trackStat]);
        }
      });

      Array.from(trackSidToLayerStats.values()).forEach(statArray => updateLocalTrackStats(room, statArray));
      statReport.localAudioTrackStats.forEach(localAudioTrackStats => updateLocalTrackStats(room, [localAudioTrackStats]));
      [...statReport.remoteAudioTrackStats, ...statReport.remoteVideoTrackStats].forEach(trackStats => {
        renderedParticipants.forEach(renderedParticipant => renderedParticipant.updateRemoteTrackStats(trackStats));
      });
    })
  }, 1000);

  // Once the LocalParticipant leaves the room, detach the Tracks
  // of all Participants, including that of the LocalParticipant.
  room.on('disconnected', () => {
    clearInterval(statUpdater);
    renderedParticipants.forEach((renderedParticipant: IRenderedRemoteParticipant, participantSid: Participant.SID) => {
      renderedParticipant.stopRendering();
      renderedParticipants.delete(participantSid);
    });
  });
}
