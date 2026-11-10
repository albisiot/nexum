import { useEffect, useState } from 'react';
import { randomBotLevel, randomSeed } from '@nexum/engine';
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
import { RulesDialog } from './components/RulesPanel';
import { SettingsScreen } from './components/SettingsScreen';
import { SetupScreen, defaultSetup, sanitizeSetup, toMatchSetup } from './components/SetupScreen';
import { ShopScreen } from './components/ShopScreen';
import { Tutorial, tutorialSeen } from './components/Tutorial';
import type { SetupValues } from './components/SetupScreen';
import type { GameClient, GameMode, MatchSetup } from './game/GameClient';
import { lastSetup, saveLastSetup } from './game/lastSetup';
import { LocalGameClient } from './game/LocalGameClient';
import { clearSavedGame, resumableGame, saveGame } from './game/savedGame';
import type { ResumableGame } from './game/savedGame';
import { useSettings } from './game/settings';

type Screen = 'menu' | 'setup' | 'online' | 'shop' | 'collection' | 'settings' | 'patchNotes' | 'roadmap' | 'editor';

/** In sviluppo, `?editor` apre l'Editor anche senza accesso (salvare e pubblicare restano bloccati dal database). */
const DEV_EDITOR = import.meta.env.DEV && new URLSearchParams(window.location.search).has('editor');

/** Il codice di una stanza, se si arriva da un link di invito. */
const INVITE = new URLSearchParams(window.location.search).get('room');

export function App() {
  const [screen, setScreen] = useState<Screen>(INVITE ? 'online' : 'menu');
  // Si legge l'ultima preparazione la prima volta che serve, così vale già il catalogo pubblicato; poi si tiene qui.
  const [setupValues, setSetupValues] = useState<SetupValues | null>(null);
  const [client, setClient] = useState<GameClient | null>(null);
  const [showRules, setShowRules] = useState(false);
  // Si apre da solo alla prima visita; chi arriva da un invito entra prima nella stanza e lo vedrà la volta dopo.
  const [showTutorial, setShowTutorial] = useState(() => !INVITE && !tutorialSeen());
  const auth = useAuth();
  const settings = useSettings();
  const catalogVersion = useCatalogVersion();
  const canEdit = isEditor(auth) || DEV_EDITOR;

  // Un nuovo catalogo può togliere fazioni o Contratti già scelti nella preparazione.
  useEffect(() => setSetupValues((v) => v && sanitizeSetup(v)), [catalogVersion]);
  // Il catalogo pubblicato non si cambia a metà partita.
  useEffect(() => catalogStore.setGameRunning(client !== null), [client]);

  const go = (next: Screen) => {
    client?.dispose();
    setClient(null);
    setScreen(next);
    window.scrollTo(0, 0);
  };
  // Chi ha fatto l'accesso usa il nome dell'account; gli altri quello scelto nelle Impostazioni.
  const myName = auth.status === 'signedIn' ? auth.account.firstName : settings.name.trim() || null;

  /** Nel multiplayer il primo posto prende il nome dell'account o delle Impostazioni. */
  const withMyName = (v: SetupValues): SetupValues =>
    myName && v.names[0] === 'Giocatore 1' ? { ...v, names: [myName, ...v.names.slice(1)] } : v;

  const choose = (mode: GameMode) => {
    setSetupValues(withMyName({ ...(setupValues ?? lastSetup() ?? defaultSetup(mode)), mode }));
    go('setup');
  };
  /** Una partita sul dispositivo: si salva dopo ogni mossa, con le scelte della preparazione da cui è nata. */
  const play = (setup: MatchSetup, values: SetupValues, saved?: ResumableGame) => {
    client?.dispose();
    const resume = saved && { state: saved.state, actions: saved.save.actions };
    setClient(new LocalGameClient(setup, { resume, onMove: (actions, state) => saveGame(setup, values, actions, state) }));
    setSetupValues(values);
    setShowRules(false);
    window.scrollTo(0, 0);
  };
  /** Una partita nuova: la sua preparazione diventa l'ultima, da ritrovare anche dopo aver chiuso la pagina. */
  const start = (setup: MatchSetup, values = setupValues ?? defaultSetup(setup.mode)) => {
    if (setup.mode === 'solo' && myName) {
      setup = { ...setup, seats: setup.seats.map((s, i) => (i === 0 ? { ...s, name: myName } : s)) };
    }
    saveLastSetup(values);
    play(setup, values);
  };
  /**
   * Dal menu, senza passare dalla preparazione: con l'ultima (o con quella iniziale). "Partita veloce" gioca sempre
   * contro la CPU, "Rigioca l'ultima" come l'ultima volta. Le fazioni non scelte a mano si ripescano a caso.
   */
  const quickStart = (mode?: GameMode) => {
    const last = lastSetup() ?? defaultSetup();
    const values = withMyName({ ...last, mode: mode ?? last.mode });
    start(toMatchSetup(values), values);
  };
  const resume = () => {
    const saved = resumableGame();
    if (!saved) return;
    const values = sanitizeSetup({ ...defaultSetup(saved.save.setup.mode), ...saved.save.values });
    setSetupValues(values);
    play(saved.save.setup, values, saved);
  };
  // Chi esce da una partita sul dispositivo la abbandona: non resta niente da riprendere.
  const leave = (next: Screen) => {
    if (client && client.setup.mode !== 'online') clearSavedGame();
    go(next);
  };

  const enterOnline = (online: GameClient) => {
    client?.dispose();
    setClient(online);
    setShowRules(false);
    window.scrollTo(0, 0);
  };

  const onMenu = (screen === 'menu' || (screen === 'editor' && !canEdit)) && !client;
  // Nelle partite online il tempo del turno scorre anche durante il tutorial.
  const openTutorial = client?.setup.mode === 'online' ? undefined : () => setShowTutorial(true);

  return (
    <div className="app">
      {/* Durante le prese la testata è nascosta dal CSS: "Regole" passa nel menu ☰ e in Info. Nel menu principale
          non c'è proprio: "Regole" sta tra i link in fondo. */}
      {!onMenu && (
        <header className="top">
          <div className="brand">
            <h1>NEXUM</h1>
            <p>Trick-taking a Contratti · mazzo comune · 13–25 carte a giocatore</p>
          </div>
          <button type="button" className="btn" aria-haspopup="dialog" onClick={() => setShowRules(true)}>
            Regole
          </button>
        </header>
      )}

      {showRules && <RulesDialog onTutorial={openTutorial} onClose={() => setShowRules(false)} />}

      {client ? (
        <GameScreen
          key={client.setup.seed}
          client={client}
          onRules={() => setShowRules(true)}
          onTutorial={openTutorial}
          onReplay={
            client.setup.mode === 'online'
              ? undefined
              : () =>
                  start({
                    ...client.setup,
                    seed: randomSeed(),
                    seats: client.setup.seats.map((s) => (s.kind === 'cpu' ? { ...s, level: randomBotLevel(Math.random) } : s)),
                  })
          }
          onExit={() => leave(client.setup.mode === 'online' ? 'online' : 'setup')}
          onMenu={() => leave('menu')}
        />
      ) : screen === 'setup' ? (
        setupValues && <SetupScreen values={setupValues} onChange={setSetupValues} onStart={start} onBack={() => go('menu')} />
      ) : screen === 'online' ? (
        <OnlineScreen invite={INVITE} onEnter={enterOnline} onBack={() => go('menu')} />
      ) : screen === 'shop' ? (
        <ShopScreen onCollection={() => go('collection')} onBack={() => go('menu')} />
      ) : screen === 'collection' ? (
        <CollectionScreen onShop={() => go('shop')} onBack={() => go('menu')} />
      ) : screen === 'settings' ? (
        <SettingsScreen onBack={() => go('menu')} />
      ) : screen === 'patchNotes' ? (
        <PatchNotesScreen onBack={() => go('menu')} />
      ) : screen === 'roadmap' ? (
        <RoadmapScreen onBack={() => go('menu')} />
      ) : screen === 'editor' && canEdit ? (
        <EditorScreen onBack={() => go('menu')} />
      ) : (
        <MenuScreen
          onResume={resume}
          onReplayLast={() => quickStart()}
          onQuick={() => quickStart('solo')}
          onPlay={choose}
          onOnline={() => go('online')}
          onTutorial={() => setShowTutorial(true)}
          onShop={() => go('shop')}
          onCollection={() => go('collection')}
          onSettings={() => go('settings')}
          onRoadmap={() => go('roadmap')}
          onPatchNotes={() => go('patchNotes')}
          onRules={() => setShowRules(true)}
          onEditor={canEdit ? () => go('editor') : undefined}
        />
      )}
      {showTutorial && (
        <Tutorial
          onClose={() => setShowTutorial(false)}
          onPlay={
            onMenu
              ? () => {
                  setShowTutorial(false);
                  choose('solo');
                }
              : undefined
          }
        />
      )}
      <ConfirmHost />
    </div>
  );
}
