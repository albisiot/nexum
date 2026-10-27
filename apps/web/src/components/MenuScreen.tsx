import type { GameMode } from '../game/GameClient';
import { PATCH_NOTES } from '../patchNotes';
import { AccountPanel } from './AccountPanel';

interface Props {
  onPlay(mode: GameMode): void;
  onPatchNotes(): void;
}

export function MenuScreen({ onPlay, onPatchNotes }: Props) {
  return (
    <section className="menu">
      <div className="menu-hero">
        <h1 className="menu-logo">NEXUM</h1>
        <p>Gioco di carte trick-taking a Contratti</p>
      </div>

      <AccountPanel />

      <nav className="menu-list" aria-label="Menu principale">
        <button type="button" className="menu-item featured" onClick={() => onPlay('solo')}>
          <span className="menu-icon" aria-hidden="true">🤖</span>
          <span className="menu-text">
            <span className="menu-title">Gioca contro la CPU</span>
            <span className="menu-sub">Tu contro da 1 a 7 avversari gestiti dal computer</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={() => onPlay('local')}>
          <span className="menu-icon" aria-hidden="true">👥</span>
          <span className="menu-text">
            <span className="menu-title">Gioca multiplayer</span>
            <span className="menu-sub">Da 2 a 8 giocatori sullo stesso dispositivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" disabled>
          <span className="menu-icon" aria-hidden="true">🌐</span>
          <span className="menu-text">
            <span className="menu-title">
              Gioca online <span className="soon">Prossimamente</span>
            </span>
            <span className="menu-sub">Partite con gli amici, ognuno dal proprio dispositivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onPatchNotes}>
          <span className="menu-icon" aria-hidden="true">📜</span>
          <span className="menu-text">
            <span className="menu-title">Patch notes</span>
            <span className="menu-sub">Tutti gli aggiornamenti del gioco</span>
          </span>
        </button>
      </nav>

      <p className="menu-footer">
        Versione {PATCH_NOTES[0]!.version} ·{' '}
        <a href="https://github.com/albisiot/nexum" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </section>
  );
}
