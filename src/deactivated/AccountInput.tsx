import { useState, useEffect, useCallback } from 'react';
import { MiniDoc } from './types';
import { asyncThrottle } from './throttle';
import { resolveMiniDoc } from './microcosm';
import LilUser from './LilUser';

function AccountInput({ onSet, children }: {
  onSet: (MiniDoc) => void,
  children: any,
}) {
  const [identifier, setIdentifier] = useState("");
  const [foundDoc, setFoundDoc] = useState(null);
  const [triedSubmitAt, setTriedSubmitAt] = useState(null);

  const lookup = useCallback(asyncThrottle(300, resolveMiniDoc, setFoundDoc), []);

  const handleIdChange = useCallback(e => {
    setIdentifier(e.target.value);
    lookup(e.target.value);
  });

  const handleSubmit = useCallback(e => {
    e.preventDefault();
    if (foundDoc) {
      onSet(foundDoc);
    } else {
      setTriedSubmitAt(+new Date());
    }
  });

  useEffect(() => {
    if (!triedSubmitAt) return;
    if (!foundDoc) return;
    if (new Date() - triedSubmitAt > 500) return;
    onSet(foundDoc);
  }, [foundDoc, triedSubmitAt])

  return (
    <form
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        display: "block",
      }}
      onSubmit={handleSubmit}
    >
      <label style={{
        display: "block",
      }}>
        Your handle or DID:{' '}
        <input
          style={{
            margin: "0.5em 0",
            padding: "0.3em 0.5em",
            font: "inherit",
            borderRadius: "0.3em",
            border: "1px solid #444"
          }}
          placeholder="bad-example.com"
          value={identifier}
          onChange={handleIdChange}
        />
      </label>
      {foundDoc
        ? <LilUser doc={foundDoc}>
            <button onClick={() => onSet(foundDoc)}>check</button>
          </LilUser>
        : <br/>
      }
    </form>
  )
}


export default AccountInput;
