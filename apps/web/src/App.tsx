import { useState } from 'react';
import { randomSeed } from '@nexum/engine';
import { GameScreen } from './components/GameScreen';
import { RulesPanel } from './components/RulesPanel';
import { SetupScreen, defaultSetup } from './components/SetupScreen';
import type { SetupValues } from './components/SetupScreen';
import type { GameClient, MatchSetup } from './game/GameClient';
import { LocalGameClient } from './game/LocalGameClient';

export function App() {
  const [setupValues, setSetupValues] = useState<SetupValues>(defaultSetup);
  const [client, setClient] = useState<GameClient | null>(null);
  const [showRules, setShowRules] = useState(false);

  const start = (setup: MatchSetup) => {
    client?.dispose();
    setClient(new LocalGameClient(setup));
    setShowRules(false);
  };
  const exit = () => {
    client?.dispose();
    setClient(null);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>NEXUM</h1>
          <p>Trick-taking a Contratti · mazzo comune · 13 carte a giocatore</p>
        </div>
        <button type="button" className="btn" aria-expanded={showRules} onClick={() => setShowRules((s) => !s)}>
          Regole
        </button>
      </header>

      {showRules && <RulesPanel />}

      {client ? (
        <GameScreen
          key={client.setup.seed}
          client={client}
          onReplay={() => start({ ...client.setup, seed: randomSeed() })}
          onExit={exit}
        />
      ) : (
        <SetupScreen values={setupValues} onChange={setSetupValues} onStart={start} />
      )}
    </div>
  );
}
