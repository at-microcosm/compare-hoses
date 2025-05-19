import { useEffect, useState } from 'react';
import { Firehose } from '@skyware/firehose';
import './Relay.css';

type firehoseState = 'connecting' | 'connected' | 'errored' | 'closed';

function Relay({ url, desc, onRecieveEvent }) {
  const [state, setState] = useState('connecting');
  const [commits, setCommits] = useState(0);
  const [reconnects, setReconnects] = useState(0);

  useEffect(() => {
    const sendIt = (type, event) => {
      onRecieveEvent(type, event);
      setCommits(n => n + 1);
    };
    const firehose = new Firehose({ relay: url });
    firehose.on('open', () => setState('connected'));
    firehose.on('close', () => setState('closed'));
    firehose.on('reconnect', () => setReconnects(n => n + 1));
    firehose.on('error', e => console.error('oops', e) || setState('errored'));
    firehose.on('websocketError', () => setState('errored'));
    firehose.on('commit', (ev) => sendIt('commit', ev));
    firehose.on('sync', (ev) => sendIt('sync', ev));
    firehose.on('account', (ev) => sendIt('account', ev));
    firehose.on('identity', (ev) => sendIt('identity', ev));
    firehose.on('info', (...args) => console.info('info event', ...args));
    firehose.on('unknown', e => console.warn(`unknown event from ${url}`, e));
    firehose.start();

    return () => {
      firehose.close();
    };
  }, [url]);

  return (
    <div className="relay">
      <h2>{ desc }</h2>
      <p><code>{ url }</code></p>
      <p>[<code>{ state }</code>] (<code>{ commits.toLocaleString() }</code> events)</p>
      {(reconnects > 0) && (
        <p>reconnects: <code>{reconnects}</code></p>
      )}
    </div>
  );
}

export default Relay;
