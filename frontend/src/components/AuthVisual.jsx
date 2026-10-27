import "./AuthVisual.css";

const CARDS = [
  { stage: "Applied", role: "Frontend Intern", cls: "av-c1" },
  { stage: "Interview", role: "Electronics Engineer", cls: "av-c2" },
  { stage: "Offer", role: "Embedded Developer", cls: "av-c3" },
];

export default function AuthVisual() {
  return (
    <div className="av-root" aria-hidden="true">
      <span className="av-blob av-b1" />
      <span className="av-blob av-b2" />
      {CARDS.map((card) => (
        <div key={card.stage} className={`av-card ${card.cls}`}>
          <small>{card.stage}</small>
          <strong>{card.role}</strong>
        </div>
      ))}
    </div>
  );
}
