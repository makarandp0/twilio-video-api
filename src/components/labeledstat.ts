import { createElement } from './createElement';

import jss from '../jss'

// Create your style.
const style = {
  containerOverFlowHidden: {
    overflow: 'hidden',
  },
  '@keyframes blink': {
    '0%': 'transform:scale(1)',
    '50%': 'transform:scale(1.2)',
    '100%': 'transform:scale(1)',
  },
  runBlinkAnimation: {
    animation: '$blink 200ms',
  },
  runShowHideAnimation: {
    animation: '$showHide 2000ms',
  },
  labeledStat: {
    background: 'solid green 2px',
    margin: '2px'
  },
}
// Compile styles, apply plugins.
const sheet = jss.createStyleSheet(style)
sheet.attach();

export interface ILabeledStat {
  element: HTMLElement,
  setText: (text: string) => void;
  setLabel: (text: string) => void;
};

export function createLabeledStat({ container, label, id, valueMapper } : {
  container: HTMLElement,
  label: string,
  id? : string,
  valueMapper?: (text: string) => string|undefined
}): ILabeledStat {
  const classNames = [sheet.classes.labeledStat];
  const el = createElement({container, type: 'p', id, classNames });
  let lastClass: string|undefined;
  return {
    element: el,
    setLabel: (newLabel: string) => {
      label = newLabel;
    },
    setText: (text: string) => {
      if (lastClass) {
        el.classList.remove(lastClass);
      }

      const oldText = el.textContent;
      const newText = label + ': ' + text;
      el.textContent = newText;

      if (valueMapper) {
        lastClass = valueMapper(text);
        if (lastClass) {
          el.classList.add(lastClass);
        }
      }
      if (oldText !== newText) {
        // run animation as text changes.
        // to avoid parent resizing from scale animation
        // markit overflow: hidden while animation is running
        let containerNeedsUpdate = !container.classList.contains(sheet.classes.containerOverFlowHidden);
        if (containerNeedsUpdate) {
          container.classList.add(sheet.classes.containerOverFlowHidden);
        }

        el.classList.add(sheet.classes.runBlinkAnimation);

        const onAnimationEnded = () => {
          el.classList.remove(sheet.classes.runBlinkAnimation);
          if (containerNeedsUpdate) {
            container.classList.remove(sheet.classes.containerOverFlowHidden);
          }
          el.removeEventListener('animationend', onAnimationEnded);
        }
        el.addEventListener('animationend', onAnimationEnded);
      }
    }
  };
}
