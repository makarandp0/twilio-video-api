/* eslint-disable no-console */
import createButton from './components/button';
import { createDiv } from './components/createDiv';
import generateAudioTrack from './old_jsutilmodules/syntheticaudio.js';
import generateVideoTrack from './old_jsutilmodules/syntheticvideo.js';
import { getBooleanUrlParam } from './components/getBooleanUrlParam';
import { getDeviceSelectionOptions } from './old_jsutilmodules/getDeviceSelectionOptions.js';
import { renderLocalTrack } from './old_es6/renderLocalTrack.js';
import { Room, LocalTrack } from 'twilio-video';

export function createLocalTracksControls({ container, rooms, Video, localTracks, shouldAutoAttach, shouldAutoPublish } : {
  container: HTMLElement,
  rooms: Room[],
  Video: typeof import('twilio-video'),
  localTracks: LocalTrack[],
  shouldAutoAttach: () => boolean,
  shouldAutoPublish: () => boolean
}) {
  container = createDiv(container, 'localTracks');

  let number = 0;
  const autoAudio = getBooleanUrlParam('autoAudio', false);
  const autoVideo = getBooleanUrlParam('autoVideo', false);

  const localTrackButtonsContainer = createDiv(container, 'trackButtons');
  const localTracksContainer = createDiv(container, 'trackRenders');

  const renderedTracks = new Map();
  function renderLocalTrack2(track: LocalTrack, videoDevices?: MediaDeviceInfo[]) {
    localTracks.push(track);
    renderedTracks.set(track, renderLocalTrack({
      container: localTracksContainer,
      rooms,
      track,
      videoDevices,
      shouldAutoAttach: shouldAutoAttach(),
      shouldAutoPublish: shouldAutoPublish(),
      onClosed: () => {
        const index = localTracks.indexOf(track);
        if (index > -1) {
          localTracks.splice(index, 1);
        }
        renderedTracks.delete(track);
      }
    }));
  }

  // eslint-disable-next-line no-unused-vars
  const btnPreviewAudio = createButton('+ Local Audio', localTrackButtonsContainer, async () => {
    const thisTrackName = 'mic-' + number++;
    const localTrack = await Video.createLocalAudioTrack({ logLevel: 'warn', name: thisTrackName });
    renderLocalTrack2(localTrack);
  });

  // eslint-disable-next-line no-unused-vars
  const btnSyntheticAudio = createButton('+ Synthetic Audio', localTrackButtonsContainer, async () => {
    const thisTrackName = 'Audio-' + number++;
    const msTrack = await generateAudioTrack();
    const localTrack = new Video.LocalAudioTrack(msTrack, { logLevel: 'warn', name: thisTrackName });
    renderLocalTrack2(localTrack);
  });

  // eslint-disable-next-line no-unused-vars
  const btnPreviewVideo = createButton('+ Local Video', localTrackButtonsContainer, async () => {
    const thisTrackName = 'camera-' + number++;
    const localTrack = await Video.createLocalVideoTrack({ logLevel: 'warn', name: thisTrackName });
    renderLocalTrack2(localTrack);
  });

  // eslint-disable-next-line no-unused-vars
  const btnSyntheticVideo = createButton('+ Synthetic Video', localTrackButtonsContainer, async () => {
    const canvas = document.createElement('canvas');
    const thisTrackName = 'Video-' + number++;
    const msTrack = await generateVideoTrack(canvas, thisTrackName);
    const localTrack = new Video.LocalVideoTrack(msTrack, { logLevel: 'warn', name: thisTrackName });
    renderLocalTrack2(localTrack);
  });

  // eslint-disable-next-line no-unused-vars
  const enumerateBtn = createButton('Enumerate Cameras', localTrackButtonsContainer, async () => {
    enumerateBtn.disable();
    const devices = await getDeviceSelectionOptions();
    devices.videoinput.forEach((device, i, videoDevices) => {
      createButton(device.label, localTrackButtonsContainer, async () => {
        const videoConstraints = {
          deviceId: { exact: device.deviceId },
        };
        const thisTrackName = 'camera-' + number++;
        const localTrack = await Video.createLocalVideoTrack({ logLevel: 'warn', name: thisTrackName, ...videoConstraints });

        renderLocalTrack2(localTrack, videoDevices);
      });
    });
  });

  if (autoAudio) {
    btnPreviewAudio.click();
  }
  if (autoVideo) {
    btnPreviewVideo.click();
  }

  return {
    roomAdded: (room: Room)  => {
      Array.from(renderedTracks.values()).forEach(renderedTrack => renderedTrack.roomAdded(room));
    },
    roomRemoved: (room: Room) => {
      Array.from(renderedTracks.values()).forEach(renderedTrack => renderedTrack.roomRemoved(room));
    },
  };
}