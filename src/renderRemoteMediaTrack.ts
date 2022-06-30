import { RemoteAudioTrack, RemoteAudioTrackStats, RemoteTrackPublication, RemoteVideoTrack, RemoteVideoTrackStats, Room } from 'twilio-video';
import { createButton } from './components/button';
import { createDiv } from './components/createDiv';
import { createLabeledStat, ILabeledStat } from './components/labeledstat';
import { renderTrack } from './renderTrack';

import jss from './jss'
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
  remoteTrackControls: {
    /* since it attaches to track container */
    /* does not need top border */
    // 'border-bottom': 'solid 1px black',
    // 'border-left': 'solid 1px black',
    // 'border-right': 'solid 1px black',
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

export type IRenderedRemoteMediaTrack = {
  updateRemoteTrackStats: (trackStats: RemoteVideoTrackStats|RemoteAudioTrackStats) => void;
  stopRendering: () => void;
}

function getTrackMidValue(room: Room, track: RemoteAudioTrack|RemoteVideoTrack) {
  let mid = "none";
  if ( room ) {
    if (track.mediaStreamTrack) {
      // @ts-ignore
      const pcs: RTCPeerConnection[] = Array.from(room._signaling._peerConnectionManager._peerConnections.values()).map(pc => pc._peerConnection._peerConnection);
      pcs.forEach(pc => {
        const transceiver = pc.getTransceivers().find(t => t?.receiver?.track?.id == track.mediaStreamTrack.id);
        if (transceiver) {
          mid = transceiver.mid || "none";
        }
      });
    }
  }
  return mid;
}


export function renderRemoteMediaTrack({
  room, track, trackPublication, container, autoAttach
} : { room: Room, track: RemoteAudioTrack | RemoteVideoTrack, trackPublication: RemoteTrackPublication, container: HTMLElement, autoAttach: boolean }): IRenderedRemoteMediaTrack {
  let trackFPS: ILabeledStat;
  let trackAudioLevel: ILabeledStat;
  const videoTrack = track.kind === 'video' ? track as RemoteVideoTrack : null;
  const renderedTrack = renderTrack({ track, container, autoAttach });
  const trackBytesDiv = createDiv(container, sheet.classes.remoteTrackControls, 'remoteTrackControls');
  const statBytes = createLabeledStat({
    container: trackBytesDiv,
    label: 'received kbps',
    valueMapper: (text: string) => text === '0' ? sheet.classes.background_yellow : undefined
  });

  statBytes.setText('0');
  const codecAndSsrc = createLabeledStat({
    container: trackBytesDiv,
    label: 'codec',
  });

  if (videoTrack) {
    trackFPS = createLabeledStat({
      container: trackBytesDiv,
      label: 'fps',
      valueMapper: (text: string) => text === '0' ? sheet.classes.background_yellow : undefined
    });
  } else {
    trackAudioLevel = createLabeledStat({
      container: trackBytesDiv,
      label: 'audioLevel',
      valueMapper: (text: string) => text === '0' ? sheet.classes.background_yellow : undefined
    });
  }

  const publisherPriority = createLabeledStat({ container: trackBytesDiv, label: 'publisher priority' });
  publisherPriority.setText(`${trackPublication.publishPriority}`);
  trackPublication.on('publishPriorityChanged', () => {
    publisherPriority.setText(`${trackPublication.publishPriority}`);
  });

  const switchOffReason = createLabeledStat({
    container: trackBytesDiv,
    label: 'switchOffReason',
    valueMapper: (text: string|null) => text !== 'null' ? sheet.classes.background_yellow : undefined
  });

  const midValue = createLabeledStat({
    container: trackBytesDiv,
    label: 'mid',
    valueMapper: (text: string) => text === 'none' ? sheet.classes.background_yellow : undefined
  });

  const updateSwitchOffState = () => {
    switchOffReason.setText(`${track.switchOffReason}`);
    midValue.setText(getTrackMidValue(room, track));
  };
  track.on('switchedOff', updateSwitchOffState);
  track.on('switchedOn', updateSwitchOffState);

  createButton('update', trackBytesDiv, () => {
    updateSwitchOffState();
    renderedTrack.updateTrackDetails();
  });


  // buttons to set subscriber priority.
  const priority = createLabeledStat({ container: trackBytesDiv, label: 'subscriber priority' });
  priority.setText(`${track.priority}`);
  createButton('High', trackBytesDiv, () => {
    track.setPriority('high');
    priority.setText(`${track.priority}`);
  });
  createButton('Standard', trackBytesDiv, () => {
    track.setPriority('standard');
    priority.setText(`${track.priority}`);
  });
  createButton('Low', trackBytesDiv, () => {
    track.setPriority('low');
    priority.setText(`${track.priority}`);
  });
  createButton('Null', trackBytesDiv, () => {
    track.setPriority(null);
    priority.setText(`${track.priority}`);
  });

  if (videoTrack) {
    const renderHint = createLabeledStat({ container: trackBytesDiv, label: 'renderHint' });
    renderHint.setText(`none`);
    createButton('switchOff', trackBytesDiv, () => {
      videoTrack.switchOff();
      renderHint.setText(`off`);
    });
    createButton('switchOn', trackBytesDiv, () => {
      videoTrack.switchOn();
      renderHint.setText(`on`);
    });
    createButton('160x120', trackBytesDiv, () => {
      const renderDimensions = { width:  160, height: 120 };
      videoTrack.setContentPreferences({ renderDimensions });
      renderHint.setText(`renderDimensions=160x120`);
    });
    createButton('640x360', trackBytesDiv, () => {
      const renderDimensions = { width: 640, height: 360 };
      videoTrack.setContentPreferences({ renderDimensions });
      renderHint.setText(`renderDimensions=640x360`);
    });
    createButton('1280x720', trackBytesDiv, () => {
      const renderDimensions = { width: 1280, height: 720 };
      videoTrack.setContentPreferences({ renderDimensions });
      renderHint.setText(`renderDimensions=1280x720`);
    });
  }

  let previousBytes = 0;
  let previousTime = 0;
  return {
    updateRemoteTrackStats: (trackStats: RemoteVideoTrackStats|RemoteAudioTrackStats) => {
      const bytesReceived = trackStats.bytesReceived || 0;
      const videoTrackStats = track.kind === 'video' ? trackStats as RemoteVideoTrackStats : null;
      const audioTrackStats = track.kind === 'audio' ? trackStats as RemoteAudioTrackStats : null;
      if (statBytes) {
        const round = (num: number) => Math.round((num + Number.EPSILON) * 10) / 10;
        const kBitsPerSecond = round((bytesReceived - previousBytes) / ((trackStats.timestamp - previousTime)) * 10);
        previousBytes = bytesReceived;
        previousTime = trackStats.timestamp;
        statBytes.setText(kBitsPerSecond.toString());
      }
      if (audioTrackStats && audioTrackStats.audioLevel) {
        trackAudioLevel.setText(audioTrackStats.audioLevel.toString());
      }
      if (videoTrackStats && videoTrackStats.frameRate) {
        trackFPS.setText(videoTrackStats.frameRate.toString());
      }

      codecAndSsrc.setLabel(trackStats.codec || "null");
      codecAndSsrc.setText("ssrc:" + trackStats.ssrc);
      updateSwitchOffState();
    },
    stopRendering: () => {
      renderedTrack.stopRendering();
      trackBytesDiv.remove();
    }
  };
}
