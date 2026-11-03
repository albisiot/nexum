import { useCatalogVersion } from '../catalog/store';
import type { GameMode } from '../game/GameClient';
import { useLastSetup } from '../game/lastSetup';
import { describeSave, useSavedGame } from '../game/savedGame';
import { PATCH_NOTES } from '../patchNotes';
import { useProfile } from '../shop/profile';
import { AccountPanel } from './AccountPanel';
import { Icon } from './Icon';
import { describeSetup } from './SetupScreen';

interface Props {
  /** Riprende la partita sul dispositivo salvata (compare solo se ce n'è una). */
  onResume(): void;
  /** Riparte subito con l'ultima preparazione (compare se non c'è una partita da riprendere). */
  onReplayLast(): void;
  /** Una partita contro la CPU che parte subito, con l'ultima preparazione o con quella iniziale. */
  onQuick(): void;
  onPlay(mode: GameMode): void;
  onOnline(): void;
  onTutorial(): void;
  onShop(): void;
  onCollection(): void;
  onSettings(): void;
  onRoadmap(): void;
  onPatchNotes(): void;
  onRules(): void;
  /** Presente solo per l'account autorizzato a modificare carte e Contratti. */
  onEditor?: () => void;
}

/** Sta tutto in uno schermo: in cima da dove ripartire, poi i modi di giocare, tre riquadri piccoli e i link. */
export function MenuScreen({
  onResume,
  onReplayLast,
  onQuick,
  onPlay,
  onOnline,
  onTutorial,
  onShop,
  onCollection,
  onSettings,
  onRoadmap,
  onPatchNotes,
  onRules,
  onEditor,
}: Props) {
  const profile = useProfile();
  const ready = profile.status === 'ready' ? profile.profile : null;
  const catalogVersion = useCatalogVersion();
  const saved = useSavedGame(catalogVersion);
  const last = useLastSetup(catalogVersion);
  return (
    <section className="menu">
      <div className="menu-hero">
        <svg className="menu-crown" viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5Z" fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M5 21h14" fill="none" stroke="var(--ink)" strokeWidth="1.75" strokeLinecap="round" />
          <path className="menu-spark" d="M3 3.2Q3 6 5.8 6Q3 6 3 8.8Q3 6 .2 6Q3 6 3 3.2Z" />
          <path className="menu-spark" d="M12 .2Q12 3 14.8 3Q12 3 12 5.8Q12 3 9.2 3Q12 3 12 .2Z" />
          <path className="menu-spark" d="M21 3.2Q21 6 23.8 6Q21 6 21 8.8Q21 6 18.2 6Q21 6 21 3.2Z" />
        </svg>
        <h1 className="menu-logo">
          NEXUM
          <span className="menu-logo-shine" aria-hidden="true">
            NEXUM
          </span>
        </h1>
        <p>Gioco di carte trick-taking a Contratti</p>
      </div>

      <AccountPanel />

      <nav className="menu-list" aria-label="Menu principale">
        {saved ? (
          <button type="button" className="menu-item featured" onClick={onResume}>
            <span className="menu-icon">
              <Icon name="riprendi" />
            </span>
            <span className="menu-text">
              <span className="menu-title">Riprendi la partita</span>
              <span className="menu-sub">{describeSave(saved)}</span>
            </span>
          </button>
        ) : (
          last && (
            <button type="button" className="menu-item featured" onClick={onReplayLast}>
              <span className="menu-icon">
                <Icon name="rigioca" />
              </span>
              <span className="menu-text">
                <span className="menu-title">Rigioca l’ultima</span>
                <span className="menu-sub">{describeSetup(last)}</span>
              </span>
            </button>
          )
        )}
        <div className="menu-split">
          <button type="button" className={`menu-item${saved || last ? '' : ' featured'}`} onClick={() => onPlay('solo')}>
            <span className="menu-icon">
              <Icon name="cpu" />
            </span>
            <span className="menu-text">
              <span className="menu-title">Contro la CPU</span>
              <span className="menu-sub">Da 1 a 7 avversari</span>
            </span>
          </button>
          <button type="button" className="menu-item menu-quick" onClick={onQuick}>
            <Icon name="veloce" />
            <span className="menu-quick-label">Partita veloce</span>
          </button>
        </div>
        <button type="button" className="menu-item" onClick={() => onPlay('local')}>
          <span className="menu-icon">
            <Icon name="multiplayer" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Multiplayer</span>
            <span className="menu-sub">Da 2 a 8 sullo stesso dispositivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onOnline}>
          <span className="menu-icon">
            <Icon name="online" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Online</span>
            <span className="menu-sub">Con gli amici, ognuno dal suo dispositivo</span>
          </span>
        </button>
      </nav>

      <nav className="menu-tiles" aria-label="Impara e colleziona">
        <button type="button" className="menu-tile" onClick={onTutorial}>
          <Icon name="tutorial" />
          <span className="menu-tile-title">Tutorial</span>
          <span className="menu-tile-sub">Impara a giocare</span>
        </button>
        <button type="button" className="menu-tile" onClick={onShop}>
          <Icon name="negozio" />
          <span className="menu-tile-title">Negozio</span>
          <span className="menu-tile-sub">{ready ? `Hai ${ready.coins} monete` : 'Pacchetti'}</span>
        </button>
        <button type="button" className="menu-tile" onClick={onCollection}>
          <Icon name="collezione" />
          <span className="menu-tile-title">Collezione</span>
          <span className="menu-tile-sub">Le tue carte</span>
        </button>
      </nav>

      <nav className="menu-links" aria-label="Altro">
        <button type="button" onClick={onRoadmap}>
          Prossimamente
        </button>
        <button type="button" onClick={onPatchNotes}>
          Patch notes <span className="menu-version">{PATCH_NOTES[0]!.version}</span>
        </button>
        <button type="button" aria-haspopup="dialog" onClick={onRules}>
          Regole
        </button>
        <button type="button" onClick={onSettings}>
          Impostazioni
        </button>
        {onEditor && (
          <button type="button" className="editor-entry" onClick={onEditor}>
            Editor
          </button>
        )}
        <a href="https://github.com/albisiot/nexum" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </section>
  );
}
