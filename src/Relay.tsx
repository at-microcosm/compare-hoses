import { useCallback, useEffect, useState } from 'react';
import { Firehose } from '@skyware/firehose';
import * as TID from '@atcute/tid';
import { BarChart } from '@mui/x-charts/BarChart';
import './Relay.css';

type HoseState = 'connecting' | 'connected' | 'errored' | 'closed';

const TIME_SIGNAL_NSID = 'app.bsky.feed.like';
const BUCKET_WIDTH = 32; // ms
const BUCKETS = 32;
const MAX_BUCKET = BUCKET_WIDTH * BUCKETS;

function Relay({ url, desc, includeEvents, onRecieveEvent }: {
  url: string,
  desc: string,
  includeEvents: Set,
  onRecieveEvent: (type: string, event: any) => void,
}) {
  const [state, setState] = useState('connecting' as HoseState);
  const [commits, setCommits] = useState(0);
  const [reconnects, setReconnects] = useState(0);
  const [buckets, setBuckets] = useState({
    idx: Array.from({ length: BUCKETS + 2 }).map(() => 0),
    recv: Array.from({ length: BUCKETS + 2 }).map(() => 0),
  });

  useEffect(() => {
    const sendIt = (type: string, event: any) => {
      if (!includeEvents.has(type)) return;
      onRecieveEvent(type, event);
      setCommits(n => n + 1);
      if (type === 'commit' && event.ops.length === 1) {
        const op = event.ops[0];
        try {
          const [nsid, rkey] = op.path.split('/');
          if (nsid === TIME_SIGNAL_NSID) {
            const posted = TID.parse(rkey).timestamp / 1000;
            const indexed = Date.parse(event.time)
            const indexed_dt = indexed - posted;
            const received_dt = +new Date() - indexed;

            let idx_bucket, recv_bucket;

            if (indexed_dt < 0) {
              idx_bucket = -1;
            } else if (indexed_dt >= MAX_BUCKET) {
              idx_bucket = BUCKETS;
            } else {
              idx_bucket = Math.min(Math.floor(indexed_dt / BUCKET_WIDTH), MAX_BUCKET)
            }
            if (received_dt < 0) {
              recv_bucket = -1;
            } else if (received_dt >= MAX_BUCKET) {
              recv_bucket = BUCKETS
            } else {
              recv_bucket = Math.min(Math.floor(received_dt / BUCKET_WIDTH), MAX_BUCKET)
            }

            setBuckets(({ idx, recv }) => {
              idx = idx.slice();
              recv = recv.slice();
              idx[idx_bucket + 1] += 1;
              recv[recv_bucket + 1] += 1;
              return { idx, recv };
            });
          }
        } catch (e) {}
      }
    };
    const firehose = new Firehose({ relay: url });
    firehose.on('open', () => setState('connected'));
    firehose.on('close', () => setState('closed'));
    firehose.on('reconnect', () => setReconnects(n => n + 1));
    firehose.on('error', e => {
      console.error('oops', e);
      setState('errored');
    });
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
  }, [url, includeEvents]);

  return (
    <div className="relay">
      <h2>{ desc }</h2>
      <p><code>{ url }</code></p>
      <p>[<code>{ state }</code>] (<code>{ commits.toLocaleString() }</code> events)</p>
      {(reconnects > 0) && (
        <p>reconnects: <code>{reconnects}</code></p>
      )}
      <BarChart
        height={180}
        width={420}
        yAxis={[{
          label: 'events',
          scaleType: 'symlog',
        }]}
        skipAnimation={true}
        xAxis={[{
          data: [-1]
            .concat(Array.from({ length: BUCKETS }).map((_, i) => i * BUCKET_WIDTH))
            .concat(['+']),
          label: 'index latency (ms)',
        }]}
        series={[{
          data: buckets.idx,
        }]}
      />
      <BarChart
        height={180}
        width={420}
        yAxis={[{
          label: 'events',
          scaleType: 'symlog',
        }]}
        skipAnimation={true}
        xAxis={[{
          data: [-1]
            .concat(Array.from({ length: BUCKETS }).map((_, i) => i * BUCKET_WIDTH))
            .concat(['+']),
          label: 'receive latency (ms)',
        }]}
        series={[{
          data: buckets.recv,
        }]}
      />
    </div>
  );
}

export default Relay;
