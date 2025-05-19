import { useEffect, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart';
import './App.css'
import '@mui/x-charts-vendor/d3-scale'
import Relay from './Relay'
import knownRelays from './knownRelays'

const INTERVAL = 1600;
const SERIES_LEN = 6;
const KEEPALIVE = 10 * 60 * 1000;

function App() {
  const [relays, setRelays] = useState([]);
  const [receiver, setReceiver] = useState(() => () => null);
  const [keepalive, setKeepalive] = useState(() => () => null);
  const [rateBars, setRateBars] = useState({ series: [] });
  const [died, setDied] = useState(false);

  useEffect(() => {
    let lastChangeover = performance.now();
    let currentCounts = {};
    let series = [];
    let raf = requestAnimationFrame(update);
    let ttl = setTimeout(die, KEEPALIVE);

    setReceiver(() => (url, type, event) => {
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
      let dt = (now - lastChangeover) / 1000;
      const relays = Object.keys(series.at(-1)?.counts || {}).toSorted();

      setRateBars({
        xAxis: [{
          data: series
            .map(({ t }) => (-(now - t) / 1000).toFixed(1))
            .concat(['now']),
          label: 'bucket (seconds ago)',
        }],
        series: relays.map(r => ({
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
      setReceiver(() => () => null);
      setKeepalive(() => () => null);
      clearInterval(nextBlock);
      cancelAnimationFrame(raf);
    };
  }, []);


  function showRelay(url, show) {
    setDied(false);
    if (show) {
      setRelays(rs => rs.includes(url) ? rs : [...rs, url]);
    } else {
      setRelays(rs => rs.includes(url) ? rs.filter(u => u !== url) : rs);
    }
    keepalive();
  }

  return (
    <>
      <h1>compare hoses</h1>
      <p><em>warning: enabling many relay connections requires a lot of bandwidth</em></p>

      <form style={{ display: 'block', textAlign: 'left' }}>
        {knownRelays.map(({ url, desc }) => (
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
          const { desc } = knownRelays.find(e => e.url === url);
          return (
            <div key={url}>
              <Relay
                url={url}
                desc={desc}
                onRecieveEvent={(type, event) => receiver(url, type, event)}
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
