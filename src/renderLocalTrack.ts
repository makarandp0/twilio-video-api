/* eslint-disable no-console */
import { createButton, IButton } from './components/button';
import { createDiv } from './components/createDiv';
import { createElement } from './components/createElement';
import { createLabeledStat, ILabeledStat } from './components/labeledstat';
import { log } from './components/log';
import { renderTrack } from './renderTrack';
import { Room, LocalAudioTrack, LocalVideoTrack, Track, LocalTrackPublication, LocalVideoTrackStats, LocalAudioTrackStats } from 'twilio-video';

import jss from './jss'
import { createCollapsibleDiv } from './components/createCollapsibleDiv';
import { renderLocalTrackStats } from './renderLocalTrackStats';
const round = (num: number) => Math.round((num + Number.EPSILON) * 10) / 10;
// Create your style.
const style = {
  background_gray: {
    background: 'gray',
  },
  background_green: {
    background: 'lightgreen',
  },
  localTrackControls: {
    /* since it attaches to track container */
    /* does not need top border */
    'border-bottom': 'solid 1px black',
    'border-left': 'solid 1px black',
    'border-right': 'solid 1px black',
  },
  localTrackContainer: {
    resize: 'both',
    // border: 'solid 1px black',
    overflow: 'auto',
    'overflow-y': 'scroll',
    // padding: '5px',
    width: '300px'
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();


const publishControls = new Map<Track.SID, Map<Room, IPublishControl>>();
export function updateLocalTrackStats(room: Room, trackStats: LocalVideoTrackStats[]|LocalAudioTrackStats[]) {
  if (trackStats.length > 0) {
    const trackPublishControls = publishControls.get(trackStats[0].trackId);
    if (trackPublishControls) {
      const publishControl = trackPublishControls.get(room);
      if (publishControl) {
        publishControl.updateLocalTrackStats(trackStats);
      }
    }
  }
}


type IPublishControl = {
  unPublishBtn: IButton;
  stopRendering: () => void;
  updateLocalTrackStats: (trackStats: LocalVideoTrackStats[]|LocalAudioTrackStats[]) => void
}

// creates buttons to publish unpublish track in a given room.
function createRoomPublishControls(container: HTMLElement, room: Room, track: LocalAudioTrack | LocalVideoTrack, shouldAutoPublish: boolean): IPublishControl {
  container = createDiv(container, sheet.classes.localTrackControls, 'localTrackControls');
  const roomSid = createElement({ container, type: 'h8', classNames: ['roomHeader'], innerHtml: room.localParticipant.identity });

  let priorityButtons: IButton[] = [];
  let unPublishBtn: IButton;
  let publishBtn: IButton;
  let priority: ILabeledStat;
  let trackPublication: LocalTrackPublication | null = Array.from(room.localParticipant.tracks.values()).find(trackPub => trackPub.track === track) || null;

  const updateControls = () => {
    // show priority buttons only when trackPublication is available.
    priorityButtons.forEach(priButton => priButton.show(!!trackPublication))
    publishBtn.show(!trackPublication);
    unPublishBtn.show(!!trackPublication);
    priority.setText(`${trackPublication?.priority}`);
  };

  let localTrackStatRender = renderLocalTrackStats(container);
  publishBtn = createButton('publish', container, async () => {
    publishBtn.disable();
    if (!trackPublication) {
      // eslint-disable-next-line require-atomic-updates
      trackPublication = await room.localParticipant.publishTrack(track);
      updateControls();
    }
    publishBtn.enable();
  });

  unPublishBtn = createButton('unpublish', container, () => {
    if (trackPublication) {
      trackPublication.unpublish();
      trackPublication = null;
      localTrackStatRender.stopRendering();
      updateControls();
    }
  });

  // for large rooms publish can happen later
  room.localParticipant.on('trackPublished', publication => {
    if (publication.track === track) {
      console.log(`Successfully published ${publication.kind} Track`);
      trackPublication = publication;
      updateControls();
    }
  });

  priority = createLabeledStat({
    container,
    label: 'publish priority'
  });

  // set publish priority.
  ['high', 'standard', 'low'].forEach(priorityText => {
    const button = createButton(priorityText, container, () => {
      trackPublication?.setPriority(priorityText as Track.Priority);
      updateControls();
    });
    priorityButtons.push(button);
  })

  updateControls();

  if (shouldAutoPublish) {
    publishBtn.click();
  }


  return {
    unPublishBtn,
    updateLocalTrackStats: (trackStats: LocalVideoTrackStats[]|LocalAudioTrackStats[]) => {
      if (trackPublication && trackPublication.trackSid === trackStats[0].trackSid) {
        localTrackStatRender.updateLocalTrackStats(trackStats);
      }
    },
    stopRendering: () => {
      localTrackStatRender.stopRendering();
      container.remove();
    }
  };
}

export interface IRenderedLocalTrack {
  roomAdded: (room: Room) => void;
  roomRemoved: (room: Room) => void;
}

export function renderLocalTrack({ rooms, track, container, autoAttach, autoPublish, trackName = 'LocalTrack', onClosed, videoDevices = [] }: {
  trackName?: string,
  rooms: Room[],
  track: LocalAudioTrack | LocalVideoTrack,
  container: HTMLElement,
  autoAttach: boolean,
  autoPublish: boolean,
  onClosed: () => void,
  videoDevices: MediaDeviceInfo[]
}): IRenderedLocalTrack {
  const { innerDiv: localTrackContainer, outerDiv } = createCollapsibleDiv({ container, headerText: trackName, divClass: sheet.classes.localTrackContainer });
  const { stopRendering } = renderTrack({ track, container: localTrackContainer, autoAttach });

  const localTrackControls = createDiv(localTrackContainer, sheet.classes.localTrackControls);
  createButton('disable', localTrackControls, () => track.disable());
  createButton('enable', localTrackControls, () => track.enable());
  createButton('stop', localTrackControls, () => {
    log('stopping track');
    track.stop();
    log('done stopping track');
  });

  createButton('restart', localTrackControls, () => {
    track.restart().catch((err: Error) => {
      console.log('track.restart failed', err);
    });
  });

  if (track.kind === 'video') {
    createButton('restart SD', localTrackControls, () => {
      track.restart({
        width: 200,
        height: 200
      }).catch((err: Error) => {
        console.log('track.restart failed', err);
      });
    });

    createButton('restart HD', localTrackControls, () => {
      track.restart({
        width: 1280,
        height: 720
      }).catch((err: Error) => {
        console.log('track.restart failed', err);
      });
    });
  }


  videoDevices.forEach(device => {
    createButton(`restart: ${device.label}`, localTrackControls, () => {
      const videoConstraints = {
        deviceId: { exact: device.deviceId },
      };
      console.log('calling restart with: ', videoConstraints);
      track.restart(videoConstraints).catch(err => {
        console.log('track.restart failed', err);
      });
    });
  });

  const trackPublishControls = new Map<Room, IPublishControl>();
  publishControls.set(track.id, trackPublishControls);

  // for existing rooms, publish track if shouldAutoPublish
  rooms.forEach((room: Room) => {
    trackPublishControls.set(room, createRoomPublishControls(localTrackContainer, room, track, autoPublish));
  });

  const roomAdded = (room: Room) => {
    if (!trackPublishControls.get(room)) {
      // for any rooms that are joined after track - do not auto publish,
      // as room starts of ith tracks depending on auto publish.
      trackPublishControls.set(room, createRoomPublishControls(localTrackContainer, room, track, false));
    }
  };

  const roomRemoved = (room: Room) => {
    const roomPublishControl = trackPublishControls.get(room);
    if (roomPublishControl) {
      roomPublishControl.stopRendering();
      trackPublishControls.delete(room);
    }
  };

  createButton('close', localTrackControls, () => {
    trackPublishControls.forEach((roomPublishControl: IPublishControl, room: Room) => {
      roomPublishControl.unPublishBtn.click();
      roomPublishControl.stopRendering();
      trackPublishControls.delete(room);
    })
    stopRendering();
    track.stop();
    // localTrackContainer.remove();
    outerDiv.remove();
    onClosed();
  });

  return {
    roomAdded,
    roomRemoved
  };
}
