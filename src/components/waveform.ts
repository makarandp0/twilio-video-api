import { getAudioContext } from './getAudioContext';
const FFT_SIZE = 512;

import jss from '../jss'

// Create your style.
const style = {
  background_gray: {
    background: '#bbbbbb'
  }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

let instance = 0;
export function waveform({ width = 200, height = 150, mediaStream }: { mediaStream: MediaStream, width?: number, height?: number }) {
  const thisInstance = instance++;
  let stopped = false;
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  canvas.classList.add(sheet.classes.background_gray);

  // To manipulate the canvas, we use its context. The canvas refers to the DOM element itself,
  // while the canvas refers to the underlying implementation which can be drawn to.
  const canvasContext = canvas.getContext('2d') as CanvasRenderingContext2D;
  canvasContext.lineWidth = 4;
  canvasContext.strokeStyle = 'rgb(0, 0, 0)';

  // We will get the frequency data by using an AnalyserNode, a feature of the AudioContext APIs.
  const audioContext = getAudioContext();
  const analyser = audioContext.createAnalyser();

  // The FFT (fast fourier transform) takes a size parameter, which determines how many frequency
  // bins the audio is dissected into. Each frame, we will analyze the audio, and AnalyserNode
  // will update our buffer array. We can then inspect the array to see and render the specific
  // data values.
  analyser.fftSize = FFT_SIZE;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function renderFrame() {
    if (stopped) {
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const canvasCtx = canvasContext;

    // Ask the browser to run this function again on the next animation frame. The frames
    // drawn per second here depend on browser, but generally this is 30 or 60 fps.
    requestAnimationFrame(renderFrame);

    // Get the current frequency data from the audio stream.
    analyser.getByteTimeDomainData(dataArray);

    // Reset the canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.beginPath();

    // Each byte of frequency will be drawn to the canvas, so each byte of frequency represents
    // a certain slice of the full width of the canvas.
    var sliceWidth = width / bufferLength;

    canvasCtx.font = '30px Verdana';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`${thisInstance}`, 25, 25);

    // For each byte of frequency, draw a slice to the canvas. Together, the canvas will be
    // covered by the resulting slices from left to right.
    var x = 0;
    for (var i = 0; i < bufferLength; i++) {
      var v = dataArray[i] / 128.0;
      v *= v;
      var y = v * height / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    // End the line at the middle right, and draw the line.
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

  function start() {
    stopped = false;
    audioContext.resume().then(function() {
      // Create a new audio source for the passed stream, and connect it to the analyser.
      const audioSource = audioContext.createMediaStreamSource(mediaStream);
      audioSource.connect(analyser);
      // Start the render loop
      renderFrame();
    });
  }

  function stop() {
    stopped = true;
  }


  if (mediaStream.getAudioTracks().length !== 0) {
    start();
  } else {
    stop();
  }

  return {
    element: canvas,
    stop: (): void => {
      stop();
    },
    updateStartStop: () => {
      setTimeout(() => {
        const hasAudio = mediaStream.getAudioTracks().length !== 0;
        if (hasAudio && stopped) {
          start();
        } else if (!hasAudio) {
          stop();
        }
      });
    }
  }
}

