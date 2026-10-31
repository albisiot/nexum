import { useState } from 'react';
import { POWERS, factionIds, getCard, getFaction, isPowerImplemented, packCards } from '@nexum/engine';
import type { CardId } from '@nexum/engine';
import type { CSSProperties } from 'react';
import { useProfile } from '../shop/profile';
import { AccountPanel } from './AccountPanel';
import { CardView } from './CardView';

interface Props {
  onShop(): void;
  onBack(): void;
}

/** L'album: le carte trovate, e il posto vuoto per quelle che mancano. */
export function CollectionScreen({ onShop, onBack }: Props) {
  const state = useProfile();
  const [selected, setSelected] = useState<CardId | null>(null);
  const all = packCards();
  const owned = state.status === 'ready' ? state.profile.cards : {};
  const total = all.filter((c) => c.id in owned).length;
  const card = selected ? getCard(selected) : null;

  return (
    <section className="panel collection">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <div className="shop-head">
        <h2>Collezione</h2>
        {state.status === 'ready' && (
          <span className="coins">
            {total}/{all.length} carte
          </span>
        )}
      </div>

      {state.status === 'signedOut' && (
        <>
          <p className="hint">Per avere una collezione serve l’accesso con Google.</p>
          <AccountPanel required />
        </>
      )}
      {state.status === 'loading' && <p className="status">Caricamento…</p>}
      {state.status === 'error' && <p className="status bad">{state.message}</p>}

      {state.status === 'ready' && (
        <>
          {total === 0 && <p className="hint">Non hai ancora nessuna carta: le trovi nei pacchetti del negozio.</p>}
          <div className="controls">
            <button type="button" className="btn" onClick={onShop}>
              Vai al negozio
            </button>
          </div>
          {card && (
            <div className="collection-detail" aria-live="polite">
              <b>{card.name}</b>
              <span className="hint">
                {getFaction(card.faction).name} · {card.value}
              </span>
              <p>{card.effect || 'Nessun potere.'}</p>
              {isPowerImplemented(card) && <p className="card-rule hint">Regola: {POWERS[card.power!]!.summary}.</p>}
            </div>
          )}
          {factionIds().map((id) => {
            const cards = all.filter((c) => c.faction === id).sort((a, b) => b.value - a.value);
            if (!cards.length) return null;
            const faction = getFaction(id);
            return (
              <section key={id} className="collection-faction">
                <h3 className="step">
                  <span className="dot" style={{ '--faction': faction.color } as CSSProperties} />
                  {faction.name} · {cards.filter((c) => c.id in owned).length}/{cards.length}
                </h3>
                <div className="collection-grid">
                  {cards.map((c) =>
                    c.id in owned ? (
                      <button
                        key={c.id}
                        type="button"
                        className={`collection-card${c.id === selected ? ' selected' : ''}`}
                        aria-pressed={c.id === selected}
                        aria-label={c.name}
                        onClick={() => setSelected(c.id === selected ? null : c.id)}
                      >
                        <span className="card-slot">
                          <CardView cardId={c.id} mini />
                        </span>
                      </button>
                    ) : (
                      <span key={c.id} className="card-slot card-missing" aria-label="Carta da trovare">
                        ?
                      </span>
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
