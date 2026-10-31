import { ROADMAP, ROADMAP_STATUS } from '../roadmap';

interface Props {
  onBack(): void;
}

export function RoadmapScreen({ onBack }: Props) {
  return (
    <section className="panel patch-notes">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <h2>Prossimamente</h2>
      <p className="hint">Le novità in arrivo su Nexum. Quando una è pronta, la trovi nelle patch notes.</p>

      <div className="roadmap">
        {ROADMAP.map((item) => (
          <article key={item.title} className="note roadmap-item">
            <span className="roadmap-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <header className="note-head">
                <h3>{item.title}</h3>
                <span className={`roadmap-status ${item.status}`} data-tip={ROADMAP_STATUS[item.status].hint}>
                  {ROADMAP_STATUS[item.status].label}
                </span>
              </header>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
