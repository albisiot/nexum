import { useEffect, useState } from 'react';
import { randomSeed } from '@nexum/engine';
import { useAuth } from './auth/auth';
import { isEditor } from './auth/editor';
import { catalogStore, useCatalogVersion } from './catalog/store';
import { ConfirmHost } from './components/ConfirmDialog';
import { CollectionScreen } from './components/CollectionScreen';
import { EditorScreen } from './components/EditorScreen';
import { GameScreen } from './components/GameScreen';
import { MenuScreen } from './components/MenuScreen';
import { OnlineScreen } from './components/OnlineScreen';
import { PatchNotesScreen } from './components/PatchNotesScreen';
import { RoadmapScreen } from './components/RoadmapScreen';
import { RulesPanel } from './components/RulesPanel';
import { SetupScreen, defaultSetup, sanitizeSetup } from './components/SetupScreen';
import { ShopScreen } from './components/ShopScreen';
import type { SetupValues } from './components/SetupScreen';
import type { GameClient, GameMode, MatchSetup } from './game/GameClient';
import { LocalGameClient } from './game/LocalGameClient';

type Screen = 'menu' | 'setup' | 'online' | 'shop' | 'collection' | 'patchNotes' | 'roadmap' | 'editor';

/** In sviluppo, `?editor` apre l'Editor anche senza accesso (salvare e pubblicare restano bloccati dal database). */
const DEV_EDITOR = import.meta.env.DEV && new URLSearchParams(window.location.search).has('editor');

/** Il codice di una stanza, se si arriva da un link di invito. */
const INVITE = new URLSearchParams(window.location.search).get('room');

export function App() {
  const [screen, setScreen] = useState<Screen>(INVITE ? 'online' : 'menu');
  const [setupValues, setSetupValues] = useState<SetupValues>(defaultSetup);
  const [client, setClient] = useState<GameClient | null>(null);
  const [showRules, setShowRules] = useState(false);
  const auth = useAuth();
  const catalogVersion = useCatalogVersion();
  const canEdit = isEditor(auth) || DEV_EDITOR;

  // Un nuovo catalogo può togliere fazioni o Contratti già scelti nella preparazione.
  useEffect(() => setSetupValues((v) => sanitizeSetup(v)), [catalogVersion]);
  // Il catalogo pubblicato non si cambia a metà partita.
  useEffect(() => catalogStore.setGameRunning(client !== null), [client]);

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

  const enterOnline = (online: GameClient) => {
    client?.dispose();
    setClient(online);
    setShowRules(false);
    window.scrollTo(0, 0);
  };

  const onMenu = (screen === 'menu' || (screen === 'editor' && !canEdit)) && !client;

  return (
    <div className="app">
      {/* Durante le prese la testata è nascosta dal CSS: "Regole" passa nel riquadro del Contratto. */}
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
          rulesOpen={showRules}
          onRules={() => setShowRules((s) => !s)}
          onReplay={client.setup.mode === 'online' ? undefined : () => start({ ...client.setup, seed: randomSeed() })}
          onExit={() => go(client.setup.mode === 'online' ? 'online' : 'setup')}
          onMenu={() => go('menu')}
        />
      ) : screen === 'setup' ? (
        <SetupScreen values={setupValues} onChange={setSetupValues} onStart={start} onBack={() => go('menu')} />
      ) : screen === 'online' ? (
        <OnlineScreen invite={INVITE} onEnter={enterOnline} onBack={() => go('menu')} />
      ) : screen === 'shop' ? (
        <ShopScreen onCollection={() => go('collection')} onBack={() => go('menu')} />
      ) : screen === 'collection' ? (
        <CollectionScreen onShop={() => go('shop')} onBack={() => go('menu')} />
      ) : screen === 'patchNotes' ? (
        <PatchNotesScreen onBack={() => go('menu')} />
      ) : screen === 'roadmap' ? (
        <RoadmapScreen onBack={() => go('menu')} />
      ) : screen === 'editor' && canEdit ? (
        <EditorScreen onBack={() => go('menu')} />
      ) : (
        <MenuScreen
          onPlay={choose}
          onOnline={() => go('online')}
          onShop={() => go('shop')}
          onCollection={() => go('collection')}
          onRoadmap={() => go('roadmap')}
          onPatchNotes={() => go('patchNotes')}
          onEditor={canEdit ? () => go('editor') : undefined}
        />
      )}
      <ConfirmHost />
    </div>
  );
}
