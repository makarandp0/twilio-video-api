import { createDiv } from './components/createDiv';
import {
  RemoteAudioTrackStats,
  RemoteParticipant,
  RemoteVideoTrackStats,
  Room,
  Track
} from 'twilio-video';
import { IRenderedRemoteTrackPublication, renderRemoteTrackPublication } from "./renderRemoteTrackPublication";

export type IRenderedRemoteParticipant = {
  container: HTMLElement;
  updateRemoteTrackStats: (trackStats: RemoteAudioTrackStats|RemoteVideoTrackStats) => void;
  stopRendering: () => void;
}

import jss from './jss'
import { createLabeledStat } from './components/labeledstat';
import { REST_CREDENTIALS } from './getCreds';
import { createButton } from './components/button';
import { createCollapsibleDiv } from './components/createCollapsibleDiv';
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
    // border: 'solid 1px black'
  },
  participantMediaDiv: {
    padding: '5px',
    display: 'flex',
    'flex-wrap': 'wrap'
  },
  publication: {
    padding: '5px'
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

function remoteParticipantRestAPI(participant: RemoteParticipant, container: HTMLElement, room: Room, restCreds: REST_CREDENTIALS) {
  createButton('copy exclude participant', container, () => {
    const command = `curl -X POST '${restCreds.restUrl}/v1/Rooms/${room.sid}/Participants/${room.localParticipant.sid}/SubscribeRules' \
    -u '${restCreds.signingKeySid}:${restCreds.signingKeySecret}' \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d 'Rules=[{"type": "include", "all": true},{"type": "exclude", "publisher": "${participant.sid}"}]'`;
    navigator.clipboard.writeText(command);
  });

  createButton('exclude participant', container, async () => {
    try {
      const fetchResult = await fetch(`${restCreds.restUrlNoCreds}/v1/Rooms/${room.sid}/Participants/${room.localParticipant.sid}/SubscribeRules`, {
        body: `Rules=[{"type": "include", "all": true},{"type": "exclude", "publisher": "${participant.sid}"}]`,
        headers: {
          "authorization": 'Basic ' + btoa(restCreds.signingKeySid + ":" + restCreds.signingKeySecret),
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site"
        },
        method: "POST"
      });
      if (fetchResult.ok) {
        const json = await fetchResult.json();
        console.log('fetchResult.json = ', json);
      } else {
        console.log('Failed to exclude participant: ', fetchResult);
        throw new Error('exclude participant error');
      }
    } catch (ex) {
      console.log('Failed to fetch:', ex);
      throw new Error('Failed to fetch: ' + ex);
    }
  });
}


export function renderRemoteParticipant(participant: RemoteParticipant, container: HTMLElement, room: Room, restCreds: REST_CREDENTIALS | null, shouldAutoAttach: () => boolean): IRenderedRemoteParticipant {

  let outerDiv: HTMLFieldSetElement;
  ({ innerDiv: container, outerDiv } = createCollapsibleDiv({ container, headerText: participant.identity, divClass: sheet.classes.participantDiv}))
  const participantSidAndState = createLabeledStat({
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
  participantSidAndState.setLabel(participant.sid);
  participantSidAndState.setText(participant.state);
  participant.on('reconnecting', () => participantSidAndState.setText(participant.state))
  participant.on('reconnected', () => participantSidAndState.setText(participant.state))

  // if (restCreds !== null) {
  //   remoteParticipantRestAPI(participant, container, room, restCreds);
  // }
  const participantMedia = createDiv(container, sheet.classes.participantMediaDiv);
  const renderedPublications = new Map<Track.SID, IRenderedRemoteTrackPublication>();
  participant.tracks.forEach(publication => {
    const rendered = renderRemoteTrackPublication({ room, trackPublication: publication, container: participantMedia, autoAttach: shouldAutoAttach() });
    renderedPublications.set(publication.trackSid, rendered);
  });

  participant.on('trackPublished', publication => {
    const rendered = renderRemoteTrackPublication({ room, trackPublication: publication, container: participantMedia, autoAttach: shouldAutoAttach() });
    renderedPublications.set(publication.trackSid, rendered);
  });
  participant.on('trackUnpublished', publication => {
    const rendered = renderedPublications.get(publication.trackSid);
    if (rendered) {
      rendered.stopRendering();
      renderedPublications.delete(publication.trackSid);
    }
  });
  return {
    container,
    updateRemoteTrackStats(trackStats: RemoteVideoTrackStats|RemoteAudioTrackStats) {
      renderedPublications.forEach((renderedTrackpublication: IRenderedRemoteTrackPublication, renderedTrackSid: Track.SID) => {
        if (trackStats.trackSid === renderedTrackSid) {
          renderedTrackpublication.updateRemoteTrackStats(trackStats);
        }
      });
    },
    stopRendering: () => {
      renderedPublications.forEach((renderedTrackpublication: IRenderedRemoteTrackPublication, renderedTrackSid: Track.SID) => {
        renderedTrackpublication.stopRendering();
        renderedPublications.delete(renderedTrackSid);
      });
      // container.remove();
      outerDiv.remove();
    }
  };
}
