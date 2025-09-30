import { useState, useCallback, useEffect } from 'react';
import { MiniDoc, Collection, Did } from './types';
import { listRecords, resolveMiniDoc, getRepoStatus } from './microcosm';
import LilUser from './LilUser';
import knownRelays from '../knownRelays.json';

const INCLUDED_RELAYS = [
  // most relays don't send cors headers rn
  'wss://relay.xero.systems',
  'wss://relay1.us-east.bsky.network',
  'wss://relay1.us-west.bsky.network',

  // these relays are ineligible for other reasons:
  // 'wss://atproto.africa', // rsky-relay does not implement getRepoStatus (and doesn't have this bug)
  // 'wss://bsky.network', // old bgs codes does not have getRepoStatus
];


async function checkRelayStatuses(repo: Did) {
  const deactivateds = [];
  const missings = [];
  const fails = [];
  for (const url of INCLUDED_RELAYS) {
    const u = new URL(url);
    u.protocol = u.protocol.replace('ws', 'http');
    let repoStatus;
    try {
      repoStatus = await getRepoStatus(u, repo);
    } catch (e) {}
    if (repoStatus === 'notfound') {
      missings.push(u.hostname);
      continue;
    }
    if (!repoStatus) {
      fails.push(u.hostname);
      continue;
    }
    if (!repoStatus.active) {
      console.log('rs', repoStatus);
      deactivateds.push(u.hostname);
    }
  }
  return { deactivateds, missings, fails };
}

function FailSummary({ oof, children }) {
  const badRelays = {};
  const { deactivateds, missings, fails } = oof;

  deactivateds.forEach(u => badRelays[u] = 'deactivated');
  missings.forEach(u => badRelays[u] = 'not crawling');
  fails.forEach(u => badRelays[u] = 'check failed');

  return (
    <p style={{ fontSize: '0.8em', textAlign: 'right', margin: '0' }}>
      {Object.keys(badRelays).map(k => (<>
        <code>{k}</code>: <span style={{ color: "#f64" }}>{badRelays[k]}</span><br />
      </>))}
      <strong>pds:</strong> <code>{oof.doc.pds.hostname}</code> (<span style={{ color: "#7f6"}}>active</span>)<br/>
    </p>
  )
}

function Results({ actives }) {
  const hasFails = [];
  let oks = 0;
  actives.forEach(a => {
    if (a.deactivateds.length > 0 || a.missings.length > 0 || a.fails.length > 0) {
      hasFails.push(a);
    } else {
      oks += 1;
    }
  })
  return (
    <>
      <p>{oks} account{oks !== 1 && 's'} on alternative PDSs checked out ok.</p>
      {hasFails.length > 0 &&
        <>
          <h3>{hasFails.length} account{hasFails.length !== 1 && 's'} found with relay problems</h3>
          {hasFails.map(f => (
            <div  key={f.doc.did.val} style={{ margin: "0.5rem 0" }}>
              <LilUser doc={f.doc}>
                <FailSummary oof={f} />
              </LilUser>
            </div>
          ))}
        </>
      }
    </>
  );
}

function CheckFollowers({ doc }: {
  doc: MiniDoc,
}) {
  const [seenDids, setSeenDids] = useState({});
  const [actives, setActives] = useState([]);
  const [actuallyDeactivated, setActuallyDeactivated] = useState([]);
  const [mushrooms, setMushrooms] = useState([]);
  const [failures, setFailures] = useState([]);

  const checkFollowing = useCallback(async subject => {
    if (seenDids[subject]) return;
    else setSeenDids(s => ({ ...s, [subject]: true }));

    let doc;
    try {
      doc = await resolveMiniDoc(subject);
    } catch {}
    if (!doc) {
      setFailures(fs => [...fs, { subject, reason: 'resolution' }]);
      return;
    }
    if (doc.pds.hostname.endsWith(".host.bsky.network")) {
      setMushrooms(ms => [...ms, doc]);
      return;
    }
    let repoStatus;
    try {
      repoStatus = await getRepoStatus(doc.pds, doc.did);
    } catch (e) {}
    if (repoStatus === 'notfound') {
      setFailures(fs => [...fs, { subject, reason: 'notfound' } ]);
      return;
    }
    if (!repoStatus) {
      setFailures(fs => [...fs, { subject, reason: 'pds getRepoStatus' } ]);
      return;
    }
    if (!repoStatus.active) {
      setActuallyDeactivated(ads => [...ads, doc]);
      return;
    }
    const { deactivateds, missings, fails } = await checkRelayStatuses(doc.did);
    setActives(as => [...as, { doc, deactivateds, missings, fails }]);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async() => {
      // check ourselves first
      checkFollowing(doc.did.val);

      const gen = listRecords(doc.pds, doc.did, new Collection('app.bsky.graph.follow'));

      for await (const record of gen) {
        if (cancel) break;
        checkFollowing(record.subject);
      }
    })();
    return () => cancel = true;
  }, [doc.did.val, doc.pds]);

  return (
    <div style={{ marginBottom: "4em" }}>
      <h2>Checking following ({Object.keys(seenDids).length})&hellip;</h2>
      <p>Of your follows, {failures.length} failed resolution, {mushrooms.length} are on bsky mushroom PDSs, and {actuallyDeactivated.length} are actually deactivated.</p>
      <Results actives={actives} />

      <div style={{ textAlign: "left" }}>
        <h3 style={{ margin: "3em 0 0" }}>What these results mean</h3>

        <h4 style={{ marginBottom: "0", color: "#f64" }}>Deactivated</h4>
        <p>The relay has become desynchronized with this account, incorrectly marking it as not <code>active</code>. All commits from this account will be blocked by the relay; none will be broadcast to relay consumers.</p>

        <h4 style={{ marginBottom: "0", color: "#f64" }}>Not crawling</h4>
        <p>The relay doesn't know about this account—perhaps it as never crawled its PDS. No content from this account will be discovered by the relay, so relay consumers won't see it.</p>

        <h4 style={{ marginBottom: "0", color: "#f64" }}>Check failed</h4>
        <p>This account seems active, but something went wrong when checking its status with the relay. It might be fine!</p>

        <h3 style={{ margin: "3em 0 0" }}>Which relays are checked?</h3>

        <ul>
          {INCLUDED_RELAYS.map(u => (
            <li key={u}><code>{new URL(u).hostname}</code></li>
          ))}
        </ul>

        <h4 style={{ marginBottom: "0" }}>Excluded relays</h4>

        <ul>
          <li><code>atproto.africa</code> does not store repo status, so it can't get desynchronized, and won't drop commits.</li>
          <li><code>bsky.network</code>, running the old BGS code, does not implement <code>com.atproto.sync.getRepoStatus</code>.</li>
          <li>All other known relays do not allow CORS XRPC requests, so we can't check from your browser.</li>
        </ul>

        <p>Accounts on Bluesky's mushroom PDSs are not checked because accounts seem to mainly desynchronize when migrating PDSs. Since accounts can now be migrated into the mushrooms, perhaps they should be checked too?</p>
      </div>
    </div>
  );
}

export default CheckFollowers;
