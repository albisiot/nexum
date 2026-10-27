import { PATCH_NOTES } from '../patchNotes';
import type { ChangeType } from '../patchNotes';

const LABELS: Record<ChangeType, string> = { new: 'Novità', change: 'Modifica', fix: 'Correzione' };

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

interface Props {
  onBack(): void;
}

export function PatchNotesScreen({ onBack }: Props) {
  return (
    <section className="panel patch-notes">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <h2>Patch notes</h2>
      <p className="hint">Tutti gli aggiornamenti di Nexum, dal più recente.</p>

      {PATCH_NOTES.map((note) => (
        <article key={note.version} className="note">
          <header className="note-head">
            <span className="version">v{note.version}</span>
            <h3>{note.title}</h3>
            <span className="hint">{note.date ? formatDate(note.date) : 'Prototipo'}</span>
          </header>
          <ul>
            {note.changes.map((c, i) => (
              <li key={i}>
                <span className={`change-tag ${c.type}`}>{LABELS[c.type]}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
