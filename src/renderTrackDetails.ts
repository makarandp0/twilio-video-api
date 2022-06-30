import { sheets } from 'jss';
import { AudioTrack, LocalAudioTrack, LocalVideoTrack, RemoteAudioTrack, RemoteVideoTrack, Room, VideoTrack } from 'twilio-video';
import { createCollapsibleDiv } from './components/createCollapsibleDiv';
import { createDiv } from './components/createDiv';
import { createElement } from './components/createElement';
import { ILabeledStat, createLabeledStat } from './components/labeledstat';
import jss from './jss'
import { IRenderedMediaStreamTrack, renderMediaStreamTrackDetails } from './renderMediaStreamTrackDetails';

// Create your style.
const style = {
  background_red: {
    background: 'red',
  },
  background_green: {
    background: 'lightgreen',
  },
  background_yellow: {
    background: 'yellow',
  },
  audioTrack: {
    background: 'lightcoral',
  },
  videoTrack: {
    background: 'lightblue'
  }
}
// Compile styles, apply plugins.
export const sheet = jss.createStyleSheet(style)
sheet.attach();

type functionReturningString = () => string;
type stringOrFn = string|functionReturningString;


function getClass(track: LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack) {
  if (track instanceof LocalAudioTrack) {
    return 'LocalAudioTrack'
  } else if (track instanceof LocalVideoTrack) {
    return 'LocalVideoTrack'
  } else if (track.kind === 'audio') {
    return 'RemoteAudioTrack';
  } else if (track.kind === 'video') {
    return 'RemoteVideoTrack';
  } else {
    return 'unknown';
  }
}

export function renderTrackDetails({
  track, container
} : { track: LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack, container: HTMLElement }) {

  function isRemoteTrack(track: LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack): track is RemoteAudioTrack|RemoteVideoTrack {
    return `isSwitchedOff` in track;
  }

  createLabeledStat({
    container,
    label: 'class'
  }).setText(getClass(track));

  const started = createLabeledStat({
    container,
    label: 'started',
    valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
  });

  let trackEnabled: ILabeledStat|null = null;
  if (!isRemoteTrack(track)) {
    trackEnabled = createLabeledStat({
      container,
      label: 'isEnabled',
      valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
    });
  }
  createElement({ container, type: 'hr'});


  const renderedMSTrackDetails = renderMediaStreamTrackDetails({ container, mediaStreamTrack: track.mediaStreamTrack });

  function updateTrackDetails() {
    started.setText(`${track.isStarted}`);
    if (!isRemoteTrack(track)) {
      trackEnabled?.setText(`${track.isEnabled}`);
    }
    if (renderedMSTrackDetails) {
      renderedMSTrackDetails.update(track.mediaStreamTrack);
    }
  }


  track.on('dimensionsChanged', () => updateTrackDetails());
  track.on('disabled', () => updateTrackDetails());
  track.on('enabled', () => updateTrackDetails());
  track.on('stopped', () => updateTrackDetails());
  track.on('started', () => updateTrackDetails());
  track.on('switchedOff', () => updateTrackDetails());
  track.on('switchedOn', () => updateTrackDetails());

  return { updateTrackDetails };
}



