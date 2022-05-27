import { waveform } from './components/waveform';
import { createButton } from './components/button';
import { createDiv } from './components/createDiv';
import { createLabeledStat } from './components/labeledstat';
import { renderTrackDetails } from './renderTrackDetails';
import { AudioTrack, VideoTrack, RemoteVideoTrack, RemoteAudioTrack, LocalAudioTrack, LocalVideoTrack, Track, Room } from 'twilio-video';

import jss from './jss'
import { setupAudioSyncDevices } from './setupAudioSyncDevices';

// Create your style.
const style = {
  background_yellow: {
    background: 'yellow'
  },
  trackContainer: {
    // border: 'solid 1px black',
    padding: '5px',
  },
  videoElement: {
    display: 'block',
    'max-width': '100% !important',
    'max-height': '80% !important'
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

function isRemoteTrack(track: Track): track is RemoteAudioTrack | RemoteVideoTrack {
  return  ('isSwitchedOff' in track);
}

/**
 * Attach the AudioTrack to the HTMLAudioElement and start the Waveform.
 */
export function attachAudioTrack(track: AudioTrack, container: HTMLElement) {
  const audioElement = container.appendChild(track.attach());
  audioElement.controls = true;
  const wave = waveform({ mediaStream: audioElement.srcObject as MediaStream, width: 200, height: 150 })
  const canvasContainer = createDiv(container, 'canvasContainer');
  canvasContainer.appendChild(wave.element);

  function startOrStopWaveForm() {
    wave.updateStartStop();
  }

  if (isRemoteTrack(track)) {
    const remoteAudioTrack = track as RemoteAudioTrack;
    remoteAudioTrack.addListener('switchedOff', startOrStopWaveForm);
    remoteAudioTrack.addListener('switchedOn', startOrStopWaveForm);
  }

  return {
    mediaElement: audioElement,
    stop: (): void => {
      wave.stop();
      if (isRemoteTrack(track)) {
        const remoteAudioTrack = track as RemoteAudioTrack;
        remoteAudioTrack.removeListener('switchedOff', startOrStopWaveForm);
        remoteAudioTrack.removeListener('switchedOn', startOrStopWaveForm);
      }
    }
  }
}

export function attachVideoTrack(track: VideoTrack, container: HTMLElement) {
  const videoElement = track.attach();
  videoElement.controls = true;
  videoElement.classList.add(sheet.classes.videoElement);
  container.appendChild(videoElement);
  return {
    mediaElement: videoElement,
    stop: (): void => {}
  }
}

// Attach the Track to the DOM.
export function renderTrack({ track, container, autoAttach } : {
  track: LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack,
  container: HTMLElement,
  autoAttach: boolean
}) {

  const trackContainer = createDiv(container, sheet.classes.trackContainer);
  const { updateTrackDetails } = renderTrackDetails({ track, container: trackContainer });

  const controlContainer = createDiv(trackContainer, 'trackControls');

  // createButton('update', controlContainer, () => updateTrackDetails());

  let mediaControls: HTMLElement | null = null;
  let stopMediaRender = () => {};
  const attachDetachBtn = createButton('attach', controlContainer, () => {
    if (mediaControls) {
      // track is already attached.
      track.detach().forEach(el => el.remove());
      mediaControls.remove();
      mediaControls = null;
      attachDetachBtn.text('attach');
    } else {
      // track is detached.
      mediaControls = createDiv(trackContainer, 'mediaControls');
      const mediaRenderer = track.kind === 'audio' ? attachAudioTrack(track, mediaControls): attachVideoTrack(track, mediaControls);
      const audioVideoElement = mediaRenderer.mediaElement;
      stopMediaRender = () => mediaRenderer.stop;

      createButton('pause', mediaControls, () => audioVideoElement?.pause());
      createButton('play', mediaControls, () => audioVideoElement?.play());

      // @ts-ignore
      const setSinkId = audioVideoElement.setSinkId ? audioVideoElement.setSinkId.bind(audioVideoElement) : null;
      if (setSinkId) {
        createButton('setupSink', mediaControls, () => {
          if (mediaControls) {
            setupAudioSyncDevices(mediaControls, setSinkId);
          }
        });
      }

      const isPlaying = createLabeledStat({
        container: mediaControls,
        label: 'playing',
        valueMapper: (text: string) => text === 'false' ? sheet.classes.background_yellow : undefined
      });
      const volume = createLabeledStat({
        container: mediaControls,
        label: 'volume'
      });
      // eslint-disable-next-line no-inner-declarations
      const updateMediaElementState = () => {
        isPlaying.setText(`${!audioVideoElement?.paused}`);
        volume.setText(`${audioVideoElement?.volume}`);
      }

      audioVideoElement.addEventListener('pause', () => updateMediaElementState());
      audioVideoElement.addEventListener('play', () => updateMediaElementState());
      attachDetachBtn.text('detach');
      updateMediaElementState();
    }
  });

  if (autoAttach) {
    attachDetachBtn.click();
  }
  updateTrackDetails();
  return {
    trackContainer,
    track,
    updateTrackDetails,
    stopRendering: () => {
      track.detach().forEach(element => {
        element.remove()
        element.srcObject = null;
      });
      trackContainer.remove();
      stopMediaRender();
    }
  };
}


