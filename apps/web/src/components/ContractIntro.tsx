import { getContract } from '@nexum/engine';
import type { PlayerView } from '@nexum/engine';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameClient } from '../game/GameClient';
import { INTRO_DEAL_MS, INTRO_SHOW_MS } from '../game/intro';
import { contractDescription, contractTitle, describeScoring } from '../game/text';
import { ContractIcon } from './Icon';

export type IntroPhase = 'show' | 'deal';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A che punto è la presentazione del Contratto `hand`: prima il riquadro, poi le carte distribuite, poi si gioca.
 * Parte solo se la mano non è ancora cominciata (`fresh`): chi rientra a partita in corso non la rivede.
 */
export function useContractIntro(client: GameClient, hand: number, fresh: boolean) {
  const [state, setState] = useState<{ client: GameClient; hand: number; phase: IntroPhase | 'done' } | null>(null);
  const own = state?.client === client && state.hand === hand ? state.phase : null;
  const phase = own ?? (fresh ? 'show' : 'done');

  useEffect(() => {
    if (phase === 'done') {
      client.beginHand();
      return;
    }
    // Con le animazioni ridotte niente distribuzione: si parte appena finisce la presentazione.
    const deal = reducedMotion() ? 0 : INTRO_DEAL_MS;
    const next = phase === 'show' && deal ? 'deal' : 'done';
    const timer = setTimeout(() => setState({ client, hand, phase: next }), phase === 'show' ? INTRO_SHOW_MS : deal);
    return () => clearTimeout(timer);
  }, [client, hand, phase]);

  return {
    phase: phase === 'done' ? null : phase,
    // Si salta solo la presentazione: la distribuzione, breve, resta.
    skip: () => setState({ client, hand, phase: reducedMotion() ? 'done' : 'deal' }),
  };
}

interface Props {
  view: PlayerView;
  /** "Contratto 2 di 5", oppure solo "Contratto" se la partita ne ha uno. */
  label: string;
  /** Online si parte tutti insieme: la presentazione non si può saltare. */
  online: boolean;
  onSkip(): void;
}

/** Il riquadro che presenta il Contratto a tutti prima di distribuire le carte. */
export function ContractIntro({ view, label, online, onSkip }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const contract = getContract(view.contract);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="panel contract-intro"
      aria-labelledby="contract-intro-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!online) onSkip();
      }}
    >
      <span className="hint">{label}</span>
      <span className="contract-intro-icon">
        <ContractIcon contract={contract} size={40} />
      </span>
      <h2 id="contract-intro-title">{contractTitle(view)}</h2>
      <span className="pill">{describeScoring(contract)}</span>
      <p>{contractDescription(view)}</p>
      <span className="contract-intro-bar" style={{ '--intro-ms': `${INTRO_SHOW_MS}ms` } as CSSProperties} aria-hidden="true" />
      {online ? (
        <p className="hint">Si parte tutti insieme tra pochi secondi.</p>
      ) : (
        <button type="button" className="btn primary" autoFocus onClick={onSkip}>
          Si parte
        </button>
      )}
    </dialog>
  );
}
