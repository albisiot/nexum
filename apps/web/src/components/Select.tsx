import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  /** Le opzioni vicine con lo stesso gruppo stanno sotto un titolo. */
  group?: string;
}

/** Un tocco fuori chiude il riquadro. */
function useDismiss(open: boolean, box: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  });
}

/** Il riquadro si apre verso l'alto o verso sinistra quando sotto o a destra non c'è spazio. */
function usePlacement(open: boolean, pop: RefObject<HTMLElement | null>): string {
  const [place, setPlace] = useState('');
  useLayoutEffect(() => {
    const el = pop.current;
    if (!open || !el) {
      setPlace('');
      return;
    }
    const rect = el.getBoundingClientRect();
    const box = el.parentElement!.getBoundingClientRect();
    const up = rect.bottom > window.innerHeight - 8 && box.top > window.innerHeight - box.bottom;
    const end = rect.right > window.innerWidth - 8;
    setPlace(`${up ? ' up' : ''}${end ? ' end' : ''}`);
  }, [open, pop]);
  return place;
}

/** Elenco a tendina nello stile del gioco, al posto della lista disegnata dal sistema. */
export function Select({ value, options, onChange }: { value: string; options: SelectOption[]; onChange(value: string): void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const place = usePlacement(open, list);
  const current = options.findIndex((o) => o.value === value);
  useDismiss(open, box, () => setOpen(false));

  // Tiene in vista l'opzione attiva, senza far scorrere la pagina.
  useEffect(() => {
    const l = list.current;
    const el = l?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !l || !el) return;
    if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight;
  }, [open, active]);

  const show = () => {
    setActive(Math.max(0, current));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i]!.value);
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) show();
      else setActive((a) => Math.min(options.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : options.length - 1);
    } else if (e.key.length === 1) {
      const found = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (found >= 0) setActive(found);
    }
  };

  return (
    <div ref={box} className={`select${open ? ' open' : ''}`}>
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{options[current]?.label}</span>
        <span className="select-caret" aria-hidden="true" />
      </button>
      {open && (
        // preventDefault: dentro un'etichetta, un tocco qui non deve riattivare il pulsante.
        <div ref={list} id={id} className={`select-list${place}`} role="listbox" onClick={(e) => e.preventDefault()}>
          {options.map((o, i) => (
            <Fragment key={o.value}>
              {o.group && o.group !== options[i - 1]?.group && <span className="select-group">{o.group}</span>}
              <button
                type="button"
                id={`${id}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === current}
                tabIndex={-1}
                className={`select-option${i === active ? ' active' : ''}${i === current ? ' selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {o.label}
              </button>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

const SWATCHES = [
  '#2f7de1', '#3e4fa6', '#2aa6a6', '#45a367',
  '#9ccc3c', '#d4ac37', '#ee8a33', '#d94a4a',
  '#d65a9c', '#8f5ad6', '#7a4a2b', '#6b7280',
  '#1c2340', '#e6e8f0',
];

/** Scelta del colore nello stile del gioco, al posto della finestra del sistema. */
export function ColorField({ value, onChange }: { value: string; onChange(color: string): void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const place = usePlacement(open, pop);
  useDismiss(open, box, () => setOpen(false));

  return (
    <div
      ref={box}
      className={`select${open ? ' open' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button type="button" className="select-trigger" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="color-swatch" style={{ background: value }} />
        <span className="select-value">{value}</span>
        <span className="select-caret" aria-hidden="true" />
      </button>
      {open && (
        <div ref={pop} className={`select-list color-pop${place}`} onClick={(e) => e.preventDefault()}>
          <div className="color-grid">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch${color === value.toLowerCase() ? ' selected' : ''}`}
                style={{ background: color }}
                aria-label={color}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <input aria-label="Codice del colore" value={value} maxLength={7} placeholder="#2f7de1" onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}
