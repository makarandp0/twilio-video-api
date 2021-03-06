/* eslint-disable no-console */
import { createButton } from './button';

import jss from '../jss'

// Create your style.
const style = {
  logDiv: {
    height: '15em',
    padding: '1.5em',
    'min-height': '100%',
    'max-height': '100%',
    'margin-top': '3.125em',
    'text-align': 'left',
    'overflow-y': 'scroll',
  },
  logP: {
    color: '#686865',
    width: '90%',
    'font-family': '\'Share Tech Mono\', \'Courier New\', Courier, fixed-width',
    'font-size': '1.25em',
    'line-height': '1.25em',
    'margin-left': '1em',
    'text-indent': '-1.25em',

    }
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

let logClearBtn: { btn: HTMLButtonElement; show: (visible: boolean) => void; text: (newText: string) => void; click: () => void; enable: () => void; disable: () => void; };
let realLogDiv: HTMLDivElement;
export function createLog(logDiv? : HTMLElement) {
  if (!logClearBtn) {
    if (!logDiv) {
      logDiv = document.createElement('div');
      logDiv.classList.add(sheet.classes.logDiv);
      document.body.appendChild(logDiv);
    }
    logClearBtn = createButton('clear log', logDiv, () => {
      realLogDiv.innerHTML = '';
    });

    realLogDiv = document.createElement('div');
    logDiv.appendChild(realLogDiv);
  }
}

export function log(...args: any[]) {
  createLog();
  const message = args.map(arg => String(arg)).join(', ');
  realLogDiv.innerHTML += '<p>' + message  + '</p>';
  realLogDiv.scrollTop = realLogDiv.scrollHeight;
  console.log(...args);
}
