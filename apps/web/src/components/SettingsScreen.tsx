import type { ReactNode } from 'react';
import { useAuth } from '../auth/auth';
import { canVibrate, vibrate } from '../game/feedback';
import { AUTO_NEXT_CHOICES, NAME_MAX, setSettings, useSettings } from '../game/settings';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Sheet } from './Sheet';

interface RowProps {
  id: string;
  icon: IconName;
  title: string;
  hint: ReactNode;
  /** Un interruttore a destra del titolo. */
  toggle?: { on: boolean; onText: string; offText: string; onChange(on: boolean): void };
  /** Comandi sotto la spiegazione (scelte, campo di testo). */
  children?: ReactNode;
}

function Row({ id, icon, title, hint, toggle, children }: RowProps) {
  return (
    <div className="setting">
      <span className="icon-tile">
        <Icon name={icon} size={22} />
      </span>
      <div className="setting-text">
        <b id={`${id}-title`}>{title}</b>
        <span className="hint">{hint}</span>
      </div>
      {toggle && (
        <span className="setting-toggle">
          <span className="menu-state" aria-hidden="true">
            {toggle.on ? toggle.onText : toggle.offText}
          </span>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={toggle.on}
            aria-labelledby={`${id}-title`}
            onClick={() => toggle.onChange(!toggle.on)}
          />
        </span>
      )}
      {children && <div className="setting-control">{children}</div>}
    </div>
  );
}

/** Le Impostazioni: stanno nella schermata dal menu principale e nella finestra che si apre dal menu ☰ in partita. */
export function SettingsContent() {
  const settings = useSettings();
  const auth = useAuth();
  return (
    <div className="settings-list">
      <Row
        id="set-sound"
        icon={settings.sound ? 'suono' : 'muto'}
        title="Suoni"
        hint="Carte sul tavolo, prese, il tuo turno e le monete."
        toggle={{ on: settings.sound, onText: 'Attivi', offText: 'Spenti', onChange: (sound) => setSettings({ sound }) }}
      />
      {canVibrate && (
        <Row
          id="set-vibrate"
          icon={settings.vibrate ? 'vibrazione' : 'senza-vibrazione'}
          title="Vibrazione"
          hint="Una vibrazione breve quando tocca a te."
          toggle={{
            on: settings.vibrate,
            onText: 'Attiva',
            offText: 'Spenta',
            onChange: (on) => {
              setSettings({ vibrate: on });
              if (on) vibrate(40);
            },
          }}
        />
      )}
      <Row
        id="set-auto"
        icon="presa-auto"
        title="Presa successiva automatica"
        hint="A fine presa la partita va avanti da sola; un tocco sul tavolo va avanti subito. Online si prosegue sempre dopo 6 secondi."
      >
        <div className="length-picker" role="radiogroup" aria-labelledby="set-auto-title">
          {AUTO_NEXT_CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={settings.autoNext === c.value}
              className={`chip-option${settings.autoNext === c.value ? ' selected' : ''}`}
              onClick={() => setSettings({ autoNext: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Row>
      {auth.status === 'signedIn' ? (
        <Row
          id="set-name"
          icon="nome"
          title="Il tuo nome"
          hint={
            <>
              Hai fatto l’accesso: al tavolo usi il nome del tuo account, <b>{auth.account.firstName}</b>.
            </>
          }
        />
      ) : (
        <Row
          id="set-name"
          icon="nome"
          title="Il tuo nome"
          hint="Il nome con cui siedi al tavolo contro la CPU e al primo posto nel multiplayer. Vale dalla prossima partita."
        >
          <input
            value={settings.name}
            maxLength={NAME_MAX}
            placeholder="Tu"
            autoComplete="nickname"
            aria-labelledby="set-name-title"
            onChange={(e) => setSettings({ name: e.target.value })}
          />
        </Row>
      )}
    </div>
  );
}

export function SettingsScreen({ onBack }: { onBack(): void }) {
  return (
    <section className="panel settings">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <h2>Impostazioni</h2>
      <p className="hint">Valgono su questo dispositivo, anche dopo aver chiuso la pagina.</p>
      <SettingsContent />
    </section>
  );
}

/** In partita le Impostazioni si aprono in una finestra: la partita resta dov'è. */
export function SettingsDialog({ onClose }: { onClose(): void }) {
  return (
    <Sheet className="settings-sheet" label="Impostazioni" onClose={onClose}>
      <div className="sheet-frame">
        <header className="sheet-head">
          <h2>
            <Icon name="impostazioni" size={22} /> Impostazioni
          </h2>
          <button type="button" className="btn small icon-toggle" aria-label="Chiudi" onClick={onClose}>
            <Icon name="chiudi" size={18} />
          </button>
        </header>
        <div className="sheet-body">
          <SettingsContent />
        </div>
      </div>
    </Sheet>
  );
}
