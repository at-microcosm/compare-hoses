import { useCallback } from 'react';

export function asyncThrottle(minT, callback, followUp) {
  let timer = null;
  let lastArgs = null;

  let throttleId = 0;

  function throttled(...args) {
    // always make sure our callback args are fresh
    lastArgs = args;

    // early exit if we're waiting for the throttle still
    if (timer !== null) {
      return;
    }

    // otherwise we're starting a timer. make sure we know who we are.
    let myThrottle = ++throttleId;
    // we immediately get a new timer id
    timer = setTimeout(async () => {
      // make sure we synchronously clear this so next throttle isn't lost
      timer = null;
      // *then* we can start the actual callback
      let res = await callback(...lastArgs);
      // but since we awaited the callback, it's now possible to be stale, so check
      if (myThrottle === throttleId) {
        followUp(res);
      }
    }, minT);

  }
  return throttled;
}
