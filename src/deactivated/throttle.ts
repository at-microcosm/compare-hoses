import { useCallback } from 'react';

export function asyncThrottle(minT, callback, followUp) {
  let timer = null;
  let lastArgs = null;

  function throttled(...args) {
    lastArgs = args;
    if (timer === null) {
      timer = setTimeout(async () => {
        followUp(await callback(...lastArgs));
        timer = null;
      }, minT);
    }
  }
  return throttled;
}
