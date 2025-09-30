import { useState, useEffect } from 'react';
import { MiniDoc, Collection, Rkey } from './types';
import { getRecord } from './microcosm';

function Pfp({ did, link }: {
  did: Did,
  link: String,
}) {
  const CDN = 'https://cdn.bsky.app/img/avatar_thumbnail/plain'; // freeloading
  const url = `${CDN}/${did.val}/${link}@jpeg`
  return <img
    alt="avatar"
    src={url}
    style={{
      display: "block",
      width: "100%",
      height: "100%",
    }}
  />;
}

function LilUser({ doc, children }: {
  doc: MiniDoc,
  children: any,
}) {
  const [pfpLink, setPfpLink] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const uri = `at://${doc.did.val}/app.bsky.actor.profile/self`;
      const profile = await getRecord(
        doc.did,
        new Collection('app.bsky.actor.profile'),
        new Rkey('self'),
      );
      const link = profile?.avatar?.ref?.$link;
      if (link && !cancel) setPfpLink(link);
      const name = profile?.displayName;
      if (name && !cancel) setDisplayName(name);
    })();
    return () => cancel = true;
  }, [doc.did.val]);

  return (
    <div style={{
      display: "flex",
      textAlign: "left",
      alignItems: "center",
      background: "#333",
      padding: "0.5em 0.6em",
      gap: "0.6em",
      borderRadius: "0.3em",
    }}>
      <div style={{
        background: "#000",
        height: "42px",
        width: "42px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#858",
        fontSize: "0.8em",
        borderRadius: "100%",
        flexShrink: "0",
        overflow: "hidden",
      }}>
        {pfpLink
          ? <Pfp did={doc.did} link={pfpLink} />
          : <>&hellip;</>}
      </div>
      <div style={{
        flexGrow: "1",
      }}>
        <h3 style={{
          margin: 0,
          fontSize: "1em",
        }}>
            {displayName || doc.handle.val}
        </h3>
        <p style={{
          fontSize: "1em",
          margin: 0,
          lineHeight: "1",
          opacity: "0.8",
        }}>
          {displayName && <><code>{doc.handle.val}</code><br/></>}
          <code>{doc.did.val}</code>
        </p>
      </div>
      {children && (
        <div>
          {children}
        </div>
      )}
    </div>
  )
}

export default LilUser;
