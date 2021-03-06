import { createElement } from './createElement';

export function createLabeledInput({ container, labelText, placeHolder, initialValue, labelClasses = [], inputType = 'input', inputClasses = [] }: {
  container: HTMLElement,
  labelText: string | HTMLElement,
  placeHolder: string,
  initialValue?: string,
  labelClasses?: string[],
  inputType?: string,
  inputClasses?:string[]
}) : HTMLInputElement {
  let identityLabel = null;
  if (typeof labelText === 'string')  {
    identityLabel = createElement({ container, type: 'label', classNames: labelClasses });
    identityLabel.innerHTML = labelText;
  } else {
    identityLabel = labelText;
  }


  const inputElement = createElement({ container, type: inputType, classNames: inputClasses }) as HTMLInputElement;
  inputElement.placeholder = placeHolder;
  if (initialValue) {
    inputElement.value = initialValue;
  }

  return inputElement;
}
