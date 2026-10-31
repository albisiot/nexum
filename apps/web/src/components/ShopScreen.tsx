import { useState } from 'react';
import { CONTRACT_WIN_COINS, DUPLICATE_COINS, PACK_PRICE, PACK_SIZE, SERIES_WIN_COINS, duplicateCoins, packCards } from '@nexum/engine';
import type { CSSProperties } from 'react';
import type { PackPull } from '@nexum/engine';
import { plural } from '../game/text';
import { profileStore, useProfile } from '../shop/profile';
import { AccountPanel } from './AccountPanel';
import { CardView } from './CardView';

interface Props {
  onCollection(): void;
  onBack(): void;
}

/** Il negozio: si comprano pacchetti con le monete guadagnate vincendo. */
export function ShopScreen({ onCollection, onBack }: Props) {
  const state = useProfile();
  const [pulls, setPulls] = useState<PackPull[] | null>(null);
  const [opened, setOpened] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      setPulls(await profileStore.buyPack());
      setOpened((n) => n + 1);
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message === 'Non hai abbastanza monete.' ? (e as Error).message : 'Acquisto non riuscito: le monete non sono state toccate. Riprova.');
    }
    setBusy(false);
  };

  const profile = state.status === 'ready' ? state.profile : null;
  const missing = profile ? Math.max(0, PACK_PRICE - profile.coins) : 0;
  const found = profile ? Object.keys(profile.cards).length : 0;
  const refund = pulls ? duplicateCoins(pulls) : 0;

  return (
    <section className="panel shop">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <div className="shop-head">
        <h2>Negozio</h2>
        {profile && <span className="coins">{plural(profile.coins, 'moneta', 'monete')}</span>}
      </div>

      {state.status === 'signedOut' && (
        <>
          <p className="hint">Per guadagnare monete e aprire pacchetti serve l’accesso con Google: così la collezione resta tua.</p>
          <AccountPanel required />
        </>
      )}
      {state.status === 'loading' && <p className="status">Caricamento…</p>}
      {state.status === 'error' && <p className="status bad">{state.message}</p>}

      {profile && pulls && (
        <div className="pack-result" key={opened}>
          <h3 className="step">Nel pacchetto</h3>
          <div className="pack-cards">
            {pulls.map((pull, i) => (
              <div key={pull.cardId} className="pack-card" style={{ '--i': i } as CSSProperties}>
                <div className="card-slot">
                  <CardView cardId={pull.cardId} mini />
                </div>
                <span className={`pack-tag${pull.duplicate ? '' : ' new'}`}>{pull.duplicate ? `Doppione · +${DUPLICATE_COINS}` : 'Nuova!'}</span>
              </div>
            ))}
          </div>
          {refund > 0 && <p className="status good">I doppioni ti hanno dato {plural(refund, 'moneta', 'monete')}.</p>}
        </div>
      )}

      <div className="pack-item">
        <span className="pack-art free" aria-hidden="true">
          N
        </span>
        <div className="pack-info">
          <h3>Pacchetto gratis</h3>
          <p className="hint">Uno al giorno, in arrivo.</p>
        </div>
        <button type="button" className="btn" disabled>
          PROSSIMAMENTE
        </button>
      </div>

      {profile && (
        <>
          <div className="pack-item">
            <span className="pack-art" aria-hidden="true">
              N
            </span>
            <div className="pack-info">
              <h3>Pacchetto NEXUM</h3>
              <p className="hint">
                {PACK_SIZE} carte casuali e diverse, tra tutte le {packCards().length}. Ogni doppione vale {DUPLICATE_COINS} monete.
              </p>
            </div>
            <button type="button" className="btn primary" disabled={busy || missing > 0} onClick={() => void buy()}>
              {busy ? 'Apertura…' : `${pulls ? 'Aprine un altro' : 'Acquista'} · ${PACK_PRICE} monete`}
            </button>
          </div>
          {missing > 0 && (
            <p className="hint">
              Ti {missing === 1 ? 'manca' : 'mancano'} {plural(missing, 'moneta', 'monete')}. Ne guadagni {CONTRACT_WIN_COINS} per ogni Contratto vinto e{' '}
              {SERIES_WIN_COINS} in più se vinci una partita a più Contratti, contro la CPU o online.
            </p>
          )}
          {error && <p className="status bad">{error}</p>}
          <div className="controls">
            <button type="button" className="btn" onClick={onCollection}>
              La mia collezione · {found}/{packCards().length}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
