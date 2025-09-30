import { useState } from 'react';
import { MiniDoc } from './types';
import { resolveMiniDoc } from './microcosm';
import LilUser from './LilUser';
import AccountInput from './AccountInput';
import CheckFollowers from './CheckFollowers';

function Deactivated() {
  const [doc, setDoc] = useState(null);

  return (
    <div style={{
      maxWidth: "800px",
    }}>
      <h1>Oops deactivated checker</h1>
      <p>This is a relay debugging tool to check if relays are blocking accounts you follow due to desynchronized <code>active</code> state. This can happen when accounts migrate to an alternative PDS host.</p>

      {doc
        ? <LilUser doc={doc}>
            <button
              style={{color: "#f90"}}
              title="clear"
              onClick={() => setDoc(null)}
            >&times;</button>
          </LilUser>
        : <AccountInput onSet={setDoc} />
      }

      {doc && <CheckFollowers doc={doc} />}

      <p><small>False positive note: it's possible for a relay to set an account as <code>deactivated</code> on purpose, but this moderation action is extremely rare.</small></p>
    </div>
  );
}

export default Deactivated;
