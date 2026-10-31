import type { GameMode } from '../game/GameClient';
import { PATCH_NOTES } from '../patchNotes';
import { useProfile } from '../shop/profile';
import { AccountPanel } from './AccountPanel';
import { Icon } from './Icon';

interface Props {
  onPlay(mode: GameMode): void;
  onOnline(): void;
  onShop(): void;
  onCollection(): void;
  onRoadmap(): void;
  onPatchNotes(): void;
  /** Presente solo per l'account autorizzato a modificare carte e Contratti. */
  onEditor?: () => void;
}

export function MenuScreen({ onPlay, onOnline, onShop, onCollection, onRoadmap, onPatchNotes, onEditor }: Props) {
  const profile = useProfile();
  const ready = profile.status === 'ready' ? profile.profile : null;
  return (
    <section className="menu">
      <div className="menu-hero">
        <svg className="menu-crown" viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5Z" fill="var(--gold)" stroke="var(--ink)" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M5 21h14" fill="none" stroke="var(--ink)" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <h1 className="menu-logo">NEXUM</h1>
        <p>Gioco di carte trick-taking a Contratti</p>
      </div>

      <AccountPanel />

      <nav className="menu-list" aria-label="Menu principale">
        <button type="button" className="menu-item featured" onClick={() => onPlay('solo')}>
          <span className="menu-icon">
            <Icon name="cpu" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Gioca contro la CPU</span>
            <span className="menu-sub">Tu contro da 1 a 7 avversari gestiti dal computer</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={() => onPlay('local')}>
          <span className="menu-icon">
            <Icon name="multiplayer" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Gioca multiplayer</span>
            <span className="menu-sub">Da 2 a 8 giocatori sullo stesso dispositivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onOnline}>
          <span className="menu-icon">
            <Icon name="online" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Gioca online</span>
            <span className="menu-sub">Partite con gli amici, ognuno dal proprio dispositivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onShop}>
          <span className="menu-icon">
            <Icon name="negozio" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Negozio</span>
            <span className="menu-sub">{ready ? `Pacchetti di carte · hai ${ready.coins} monete` : 'Compra pacchetti di carte con le monete'}</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onCollection}>
          <span className="menu-icon">
            <Icon name="collezione" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Collezione</span>
            <span className="menu-sub">Le carte che hai trovato e quelle che ti mancano</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onRoadmap}>
          <span className="menu-icon">
            <Icon name="novita" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Prossimamente</span>
            <span className="menu-sub">Deckbuilding e le altre novità in arrivo</span>
          </span>
        </button>
        <button type="button" className="menu-item" onClick={onPatchNotes}>
          <span className="menu-icon">
            <Icon name="patch-notes" />
          </span>
          <span className="menu-text">
            <span className="menu-title">Patch notes</span>
            <span className="menu-sub">Tutti gli aggiornamenti del gioco</span>
          </span>
        </button>
        {onEditor && (
          <button type="button" className="menu-item editor-entry" onClick={onEditor}>
            <span className="menu-icon">
              <Icon name="editor" />
            </span>
            <span className="menu-text">
              <span className="menu-title">Editor</span>
              <span className="menu-sub">Modifica fazioni, carte e Contratti</span>
            </span>
          </button>
        )}
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
