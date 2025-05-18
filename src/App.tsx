import { useEffect, useState } from 'react'
import { BarChart } from '@mui/x-charts/BarChart';
import './App.css'
import '@mui/x-charts-vendor/d3-scale'
import Relay from './Relay'
import knownRelays from './knownRelays'

const INTERVAL = 1600;
const SERIES_LEN = 6;

function App() {
  const [relays, setRelays] = useState([]);
  const [receiver, setReceiver] = useState(() => () => null);
  const [rateBars, setRateBars] = useState({ series: [] });

  useEffect(() => {
    let lastChangeover = performance.now();
    let currentCounts = {};
    let series = [];

    setReceiver(() => (url, type, event) => {
      if (!currentCounts[url]) currentCounts[url] = 0;
      currentCounts[url] += 1;
    });

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

    const update = () => {
      let now = performance.now();
      let dt = (now - lastChangeover) / 1000;
      const relays = Object.keys(series.at(-1)?.counts || {}).toSorted();

      setRateBars({
        xAxis: [{
          data: series.map(({ t }) => (-(now - t) / 1000).toFixed(1))
        }],
        series: relays.map(r => ({
          label: r,
          data: series.map(({ dt, counts }) => {
            if (!counts[r]) return null;
            return (counts[r] / (dt / 1000)).toFixed(1);
          }),
        })),
      });

      raf = requestAnimationFrame(update);
    };
    let raf = requestAnimationFrame(update);

    return () => {
      setReceiver(() => () => null);
      clearInterval(nextBlock);
      cancelAnimationFrame(raf);
    };
  }, []);

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
                onInput={e => e.target.checked
                  ? relays.includes(url) || setRelays([...relays, url])
                  : setRelays(relays.filter(u => u !== url))
                }
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
      <div className=".throughputs">
        <BarChart
          height={300}
          {...rateBars}
        />
      </div>
    </>
  )
}

export default App
