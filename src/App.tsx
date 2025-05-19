import { useEffect, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart';
import './App.css'
import '@mui/x-charts-vendor/d3-scale'
import Relay from './Relay'
import knownRelays from './knownRelays.json'

const INTERVAL = 1600;
const SERIES_LEN = 6;
const KEEPALIVE = 10 * 60 * 1000;

interface Relay {
  url: string,
  desc: string,
};

interface Counts {
  [k: string]: number,
};

interface CountBatch {
  t: number,
  dt: number,
  counts: Counts,
};

const noopReceiver = (_url: string, _type: string, _event: any) => {};

function App() {
  const [relays, setRelays] = useState([] as string[]);
  const [receiver, setReceiver] = useState(() => noopReceiver);
  const [keepalive, setKeepalive] = useState(() => () => {});
  const [rateBars, setRateBars] = useState({ series: [] } as any);
  const [died, setDied] = useState(false);

  useEffect(() => {
    let lastChangeover = performance.now();
    let currentCounts: Counts = {};
    let series: CountBatch[] = [];
    let raf = requestAnimationFrame(update);
    let ttl = setTimeout(die, KEEPALIVE);

    setReceiver(() => (url: string, _type: string, _event: any) => {
      if (!currentCounts[url]) currentCounts[url] = 0;
      currentCounts[url] += 1;
    });

    setKeepalive(() => () => {
      clearTimeout(ttl);
      ttl = setTimeout(die, KEEPALIVE);
      setDied(false);
      console.info('keepalive: disconnection timer reset');
    });

    function die() {
      console.info('disconnecting due to inactivity');
      setRelays([]);
      setDied(true);
    }

    const nextBlock = setInterval(() => {
      let now = performance.now();
      let dt = now - lastChangeover;
      if (series.length >= SERIES_LEN - 1) series.shift();
      series.push({
        t: now,
        dt,
        counts: currentCounts,
      });
      lastChangeover = now;
      currentCounts = {};
    }, INTERVAL);

    function update() {
      let now = performance.now();
      const relays = Object.keys(series.at(-1)?.counts || {}).toSorted();

      setRateBars({
        xAxis: [{
          data: series
            .map(({ t }) => (-(now - t) / 1000).toFixed(1))
            .concat(['now']),
          label: 'bucket (seconds ago)',
        }],
        series: relays.map((r: string) => ({
          label: r,
          data: series
            .map(({ dt, counts }) => {
              if (!counts[r]) return null;
              return (counts[r] / (dt / 1000)).toFixed(1);
            })
            .concat([!currentCounts[r]
              ? null
              : (currentCounts[r] / (INTERVAL / 1000)).toFixed(1)
            ]),
        })),
      });

      raf = requestAnimationFrame(update);
    };

    return () => {
      setReceiver(() => noopReceiver);
      setKeepalive(() => () => null);
      clearInterval(nextBlock);
      cancelAnimationFrame(raf);
    };
  }, []);


  function showRelay(url: string, show: boolean) {
    setDied(false);
    if (show) {
      setRelays((rs: string[]) => rs.includes(url) ? rs : [...rs, url]);
    } else {
      setRelays((rs: string[]) => rs.includes(url) ? rs.filter(u => u !== url) : rs);
    }
    keepalive();
  }

  return (
    <>
      <h1>compare hoses</h1>
      <p><em>warning: enabling many relay connections requires a lot of bandwidth</em></p>

      <form style={{ display: 'block', textAlign: 'left' }}>
        {knownRelays.map(({ url, desc }: Relay) => (
          <p key={url} style={{margin: 0}}>
            <label>
              <input
                type="checkbox"
                onChange={e => showRelay(url, e.target.checked)}
                checked={relays.includes(url)}
              />
              { ` ${desc} ` }
              (<code>{ url.slice('wss://'.length) }</code>)
            </label>
          </p>
        ))}
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2em', textAlign: 'left' }}>
        {relays.map(url => {
          const { desc } = knownRelays.find((r: Relay) => r.url === url)!;
          return (
            <div key={url}>
              <Relay
                url={url}
                desc={desc}
                onRecieveEvent={(type: string, event: any) => receiver(url, type, event)}
              />
            </div>
          );
        })}
      </div>

      {died && (
        <p><em>disconnected to save bandwidth due to inactivity</em></p>
      )}

      <div className="throughputs">
        <BarChart
          height={300}
          yAxis={[{ label: 'events / sec' }]}
          skipAnimation={true}
          {...rateBars}
        />
      </div>
    </>
  )
}

export default App
