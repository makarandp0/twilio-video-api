import { createCollapsibleDiv } from './components/createCollapsibleDiv';
import { createDiv } from './components/createDiv';
import { createElement } from './components/createElement';
import { ILabeledStat, createLabeledStat } from './components/labeledstat';
import { sheet } from './renderTrackDetails';


export type IRenderedMediaStreamTrack = {
  update: (newMediaStreamTrack: MediaStreamTrack|null) => void;
}

export function renderMediaStreamTrackDetails({ mediaStreamTrack, container }: { mediaStreamTrack: MediaStreamTrack|null; container: HTMLElement; }) : IRenderedMediaStreamTrack {
    // media stream track details.
  const { innerDiv, outerDiv } = createCollapsibleDiv({ container, headerText: 'MediaStreamTrack Details', startHidden: true, divClass: [] });
  container = createDiv(innerDiv, []);
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


  // line separator between settings
  createElement({ container, type: 'hr' });

  const trackSettingKeyToLabeledStat = new Map<string, ILabeledStat>();

  function update() {
    readyState.setText(mediaStreamTrack ? mediaStreamTrack.readyState :  'unknown');
    enabled.setText(mediaStreamTrack ?  `${mediaStreamTrack.enabled}` :  'unknown');
    muted.setText(mediaStreamTrack ? `${mediaStreamTrack.muted}` :  'unknown');
    if (mediaStreamTrack) {
      const trackSettings = mediaStreamTrack.getSettings();
      const keys = Object.keys(trackSettings);
      keys.forEach(key => {
        // exclude big settings
        if (!['deviceId', 'groupId'].includes(key)) {
          let settingStat = trackSettingKeyToLabeledStat.get(key);
          if (!settingStat) {
            settingStat = createLabeledStat({
              container,
              label: key,
              valueMapper: (text: string) => text === 'true' ? sheet.classes.background_yellow : undefined
            });
            trackSettingKeyToLabeledStat.set(key, settingStat);
          }
          let statValue = trackSettings[key as keyof MediaTrackSettings];
          if (typeof statValue === 'number') {
            statValue = Math.round(statValue * 100) / 100;
          }
          settingStat.setText(String(statValue));
        }
      });
    } else {
      Array.from(trackSettingKeyToLabeledStat.values()).forEach((settingsStat) => {
        settingsStat.setText('unknown');
      });
    }
  }

  if (mediaStreamTrack) {
    mediaStreamTrack.addEventListener('ended', update);
    mediaStreamTrack.addEventListener('mute', update);
    mediaStreamTrack.addEventListener('unmute', update);
  }
  update();

  return {
    update: (newMediaStreamTrack: MediaStreamTrack|null) => {
      if (newMediaStreamTrack !== mediaStreamTrack) {
        if (mediaStreamTrack) {
          mediaStreamTrack.removeEventListener('ended', update);
          mediaStreamTrack.removeEventListener('mute', update);
          mediaStreamTrack.removeEventListener('unmute', update);
        }
        mediaStreamTrack = newMediaStreamTrack;
        if (mediaStreamTrack) {
          mediaStreamTrack.addEventListener('ended', update);
          mediaStreamTrack.addEventListener('mute', update);
          mediaStreamTrack.addEventListener('unmute', update);
        }
      }
      update();
    }
  };

}
