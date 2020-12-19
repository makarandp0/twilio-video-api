/* eslint-disable no-undefined */
/* eslint-disable require-atomic-updates */
/* eslint-disable no-console */
/* eslint-disable quotes */
'use strict';
console.log('loaded tokens.js');
import { createButton } from './components/button';
import { createDiv } from './components/createDiv';
// eslint-disable-next-line sort-imports
import { createLog, log } from './components/log';
import { createLabeledInput } from './components/createLabeledInput';
import { createLink } from './components/createLink';
import { createSelection } from './components/createSelection';
import Video from 'twilio-video';
demo(Video, document.body);

export function demo(Video: typeof import('twilio-video'), containerDiv: HTMLElement) {
  // create html
  const container = createDiv(containerDiv, 'foo', 'foo');
  createLog(containerDiv);

  createLink({ container, linkText: 'hey!', linkUrl: 'https://www.twilio.com' });
  const roomNameInput =  createLabeledInput({ container, labelText: 'roomName', placeHolder: 'roomName', initialValue: "roomName" });
  // const accountSid =  createLabeledInput({ container, labelText: 'accountSid', placeHolder: 'ACxxxx', initialValue: "ACxxx" });
  const apiKeySid =  createLabeledInput({ container, labelText: 'apiKeySid', placeHolder: 'SKxxx', initialValue: "SKxxx" });
  const apiKeySecret =  createLabeledInput({ container, labelText: 'apiKeySecret', placeHolder: 'xxxx', initialValue: "xxxx" });
  const envSelect = createSelection({
    container,
    // id: 'env',
    options: ['dev', 'stage', 'prod'],
    title: 'env',
    onChange: () => log('env change:', envSelect.getValue())
  });
  const topologySelect = createSelection({
    container,
    // id: 'topology',
    options: ['group-small', 'peer-to-peer', 'group', 'go'],
    title: 'topology',
    onChange: () => log('topology change:', topologySelect.getValue())
  });


  createButton('createRoom', container, async () => {
    const HOST_NAME_REST = envSelect.getValue() === 'prod' ? 'video.twilio.com' : `video.${envSelect.getValue()}.twilio.com`;
    const HOST_URL_REST = 'https://' + HOST_NAME_REST;
    //
    // NOTE: fetch request below requires that chrome be opened with `--disable-web-security` like:
    // open -na /Applications/Google\ Chrome.app --args --user-data-dir="/var/tmp/Chrome dev session" --disable-web-security
    //
    var searchParams = new URLSearchParams({ Type: topologySelect.getValue(), UniqueName: roomNameInput.value });
    const roomResult = await fetch(`${HOST_URL_REST}/v1/Rooms`, {
      "headers": {
        "authorization": 'Basic ' + btoa(apiKeySid.value + ":" + apiKeySecret.value),
        "content-type": "application/x-www-form-urlencoded",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "body": searchParams,
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    });

    if (roomResult.ok) {
      const json = await roomResult.json();
      if (json.status === 'in-progress') {
        return json;
      }
      }

    console.log('Failed to create room: ', roomResult);
    throw new Error(`Could not create ${topologySelect.getValue()} Room: ${roomNameInput.value}`);
  });
}
