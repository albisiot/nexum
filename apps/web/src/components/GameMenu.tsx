import { canVibrate, setPrefs, useFeedbackPrefs, vibrate } from '../game/feedback';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

interface Props {
  onClose(): void;
  onRules(): void;
  onExit(): void;
}

/** Il menu ☰ della partita: suoni, vibrazione, Regole e uscita. */
export function GameMenu({ onClose, onRules, onExit }: Props) {
  const prefs = useFeedbackPrefs();
  return (
    <Sheet className="menu-sheet" label="Menu della partita" onClose={onClose}>
      <div className="menu-sheet-list">
        <button type="button" className="menu-row" role="switch" aria-checked={prefs.sound} onClick={() => setPrefs({ sound: !prefs.sound })}>
          <Icon name={prefs.sound ? 'suono' : 'muto'} size={20} />
          <span>Suoni</span>
          <span className="menu-state">{prefs.sound ? 'Attivi' : 'Spenti'}</span>
        </button>
        {canVibrate && (
          <button
            type="button"
            className="menu-row"
            role="switch"
            aria-checked={prefs.vibrate}
            onClick={() => {
              setPrefs({ vibrate: !prefs.vibrate });
              if (!prefs.vibrate) vibrate(40);
            }}
          >
            <Icon name={prefs.vibrate ? 'vibrazione' : 'senza-vibrazione'} size={20} />
            <span>Vibrazione quando tocca a te</span>
            <span className="menu-state">{prefs.vibrate ? 'Attiva' : 'Spenta'}</span>
          </button>
        )}
        <button type="button" className="menu-row" onClick={onRules}>
          <Icon name="regole" size={20} />
          <span>Regole</span>
        </button>
        <button type="button" className="menu-row danger" onClick={onExit}>
          <Icon name="esci" size={20} />
          <span>Esci dalla partita</span>
        </button>
      </div>
    </Sheet>
  );
}
