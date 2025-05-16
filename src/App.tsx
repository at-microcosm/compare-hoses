import { useState } from 'react'
import './App.css'
import Relay from './Relay'
import knownRelays from './knownRelays'

function App() {
  const [relays, setRelays] = useState([]);

  const recieveEvent = () => null;

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
              <Relay url={url} desc={desc} onRecievedEvent={(type, event) => recieveEvent(url, type, event)} />
            </div>
          );
        })}
      </div>
    </>
  )
}

export default App
