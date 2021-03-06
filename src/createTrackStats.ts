import { sheets } from 'jss';
import { AudioTrack, LocalAudioTrack, LocalVideoTrack, RemoteAudioTrack, RemoteVideoTrack, VideoTrack } from 'twilio-video';
import { createDiv } from './components/createDiv';
import { ILabeledStat, createLabeledStat } from './components/labeledstat';
import jss from './jss'

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
const sheet = jss.createStyleSheet(style)
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

export function createTrackStats(track: LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack, container: HTMLElement) {
  container = createDiv(container, 'trackStats');

  function isVideoTrack(track: AudioTrack | VideoTrack): track is VideoTrack {
    return track.kind === 'video';
  }

  createLabeledStat({
    container,
    label: 'class'
  }).setText(getClass(track));

  const readyState = createLabeledStat({
    container,
    label: 'readyState',
    valueMapper: (text: string) => text === 'ended' ? sheet.classes.background_red : undefined
  });

  const enabled = createLabeledStat({
    container,
    label: 'enabled',
    valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
  });

  const muted = createLabeledStat({
    container,
    label: 'muted',
    valueMapper: (text: string) => text === 'true' ? sheet.classes.background_yellow : undefined
  });

  let dimensions: ILabeledStat;
  if (isVideoTrack(track)) {
    dimensions = createLabeledStat({ container, label: 'dimensions' });
    track.on('dimensionsChanged', () => updateStats());
  }

  const started = createLabeledStat({
    container,
    label: 'Track.started',
    valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
  });

  const trackEnabled = createLabeledStat({
    container,
    label: 'Track.enabled',
    valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
  });

  function listenOnMSTrack(msTrack: MediaStreamTrack) {
    msTrack.addEventListener('ended', () => updateStats());
    msTrack.addEventListener('mute', () => updateStats());
    msTrack.addEventListener('unmute', () => updateStats());
  }

  track.on('disabled', () => updateStats());
  track.on('enabled', () => updateStats());
  track.on('stopped', () => updateStats());
  track.on('started', () => {
    updateStats();
    listenOnMSTrack(track.mediaStreamTrack);
  });

  function updateStats() {
    readyState.setText(track.mediaStreamTrack.readyState);
    enabled.setText(`${track.mediaStreamTrack.enabled}`);
    started.setText(`${track.isStarted}`);
    muted.setText(`${track.mediaStreamTrack.muted}`);
    trackEnabled.setText(`${track.isEnabled}`);

    if (isVideoTrack(track)) {
      const { width, height } = track.dimensions;
      dimensions.setText(`w${width} x h${height}`);
    }
  }

  return { updateStats };
}



