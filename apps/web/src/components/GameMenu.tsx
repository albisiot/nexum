import { canVibrate, vibrate } from '../game/feedback';
import { setSettings, useSettings } from '../game/settings';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

interface Props {
  onClose(): void;
  onSettings(): void;
  onRules(): void;
  onExit(): void;
}

/** Il menu ☰ della partita: suoni, vibrazione, Impostazioni, Regole e uscita. */
export function GameMenu({ onClose, onSettings, onRules, onExit }: Props) {
  const settings = useSettings();
  return (
    <Sheet className="menu-sheet" label="Menu della partita" onClose={onClose}>
      <div className="menu-sheet-list">
        <button
          type="button"
          className="menu-row"
          role="switch"
          aria-checked={settings.sound}
          onClick={() => setSettings({ sound: !settings.sound })}
        >
          <Icon name={settings.sound ? 'suono' : 'muto'} size={20} />
          <span>Suoni</span>
          <span className="menu-state">{settings.sound ? 'Attivi' : 'Spenti'}</span>
        </button>
        {canVibrate && (
          <button
            type="button"
            className="menu-row"
            role="switch"
            aria-checked={settings.vibrate}
            onClick={() => {
              setSettings({ vibrate: !settings.vibrate });
              if (!settings.vibrate) vibrate(40);
            }}
          >
            <Icon name={settings.vibrate ? 'vibrazione' : 'senza-vibrazione'} size={20} />
            <span>Vibrazione quando tocca a te</span>
            <span className="menu-state">{settings.vibrate ? 'Attiva' : 'Spenta'}</span>
          </button>
        )}
        <button type="button" className="menu-row" aria-haspopup="dialog" onClick={onSettings}>
          <Icon name="impostazioni" size={20} />
          <span>Impostazioni</span>
        </button>
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
