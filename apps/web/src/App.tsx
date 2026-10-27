import { useState } from 'react';
import { randomSeed } from '@nexum/engine';
import { GameScreen } from './components/GameScreen';
import { MenuScreen } from './components/MenuScreen';
import { PatchNotesScreen } from './components/PatchNotesScreen';
import { RulesPanel } from './components/RulesPanel';
import { SetupScreen, defaultSetup } from './components/SetupScreen';
import type { SetupValues } from './components/SetupScreen';
import type { GameClient, GameMode, MatchSetup } from './game/GameClient';
import { LocalGameClient } from './game/LocalGameClient';

type Screen = 'menu' | 'setup' | 'patchNotes';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [setupValues, setSetupValues] = useState<SetupValues>(defaultSetup);
  const [client, setClient] = useState<GameClient | null>(null);
  const [showRules, setShowRules] = useState(false);

  const go = (next: Screen) => {
    client?.dispose();
    setClient(null);
    setScreen(next);
    window.scrollTo(0, 0);
  };
  const choose = (mode: GameMode) => {
    setSetupValues((v) => ({ ...v, mode }));
    go('setup');
  };
  const start = (setup: MatchSetup) => {
    client?.dispose();
    setClient(new LocalGameClient(setup));
    setShowRules(false);
    window.scrollTo(0, 0);
  };

  const onMenu = screen === 'menu' && !client;

  return (
    <div className="app">
      <header className={`top${onMenu ? ' top-menu' : ''}`}>
        {!onMenu && (
          <div className="brand">
            <h1>NEXUM</h1>
            <p>Trick-taking a Contratti · mazzo comune · 13 carte a giocatore</p>
          </div>
        )}
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
          onExit={() => go('setup')}
          onMenu={() => go('menu')}
        />
      ) : screen === 'setup' ? (
        <SetupScreen values={setupValues} onChange={setSetupValues} onStart={start} onBack={() => go('menu')} />
      ) : screen === 'patchNotes' ? (
        <PatchNotesScreen onBack={() => go('menu')} />
      ) : (
        <MenuScreen onPlay={choose} onPatchNotes={() => go('patchNotes')} />
      )}
    </div>
  );
}
