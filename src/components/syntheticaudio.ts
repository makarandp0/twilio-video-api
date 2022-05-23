import { getAudioContext } from './getAudioContext';

/* eslint-disable no-undef */

interface MediaStreamAudioDestinationNode extends AudioNode {
  stream: MediaStream;
}

export interface SyntheticAudioControl {
  track: MediaStreamTrack;
  getGain: () => AudioParam;
}

export function syntheticAudio() : SyntheticAudioControl {
  const audioContext = getAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const dst = gainNode.connect(audioContext.createMediaStreamDestination()) as MediaStreamAudioDestinationNode;
  oscillator.connect(gainNode);
  // const dst = oscillator.connect(audioContext.createMediaStreamDestination()) as MediaStreamAudioDestinationNode;
  oscillator.start();
  const track = dst.stream.getAudioTracks()[0];
  const originalStop = track.stop;
  track.stop = () => {
    originalStop.call(track);
  };

  console.log('makarand gainNode: ', gainNode.gain);
  gainNode.gain.value += 0.2
  return {
    track,
    getGain: () : AudioParam => {
      return gainNode.gain;
    }
  }
}
