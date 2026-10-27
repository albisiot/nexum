import { useState } from 'react';
import { randomSeed } from '@nexum/engine';
import { useAuth } from './auth/auth';
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
  const auth = useAuth();

  const go = (next: Screen) => {
    client?.dispose();
    setClient(null);
    setScreen(next);
    window.scrollTo(0, 0);
  };
  const myName = auth.status === 'signedIn' ? auth.account.firstName : null;

  const choose = (mode: GameMode) => {
    setSetupValues((v) => {
      // Chi ha fatto l'accesso occupa il primo posto con il proprio nome.
      const names = myName && v.names[0] === 'Giocatore 1' ? [myName, ...v.names.slice(1)] : v.names;
      return { ...v, mode, names };
    });
    go('setup');
  };
  const start = (setup: MatchSetup) => {
    client?.dispose();
    if (setup.mode === 'solo' && myName) {
      setup = { ...setup, seats: setup.seats.map((s, i) => (i === 0 ? { ...s, name: myName } : s)) };
    }
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
