"use client";

export default function ScoreStepper({
  value,
  onChange,
  disabled,
  side,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
  side: "left" | "right";
}) {
  const canDec = !disabled && value > 0;
  const canInc = !disabled && value < 99;

  const controls = (
    <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 6, justifyItems: "center" }}>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        disabled={!canInc}
        style={{
          border: 0,
          background: "transparent",
          color: "#7ea2ff",
          fontWeight: 900,
          fontSize: 34,
          lineHeight: "28px",
          cursor: canInc ? "pointer" : "not-allowed",
          opacity: canInc ? 1 : 0.25,
          padding: 0,
        }}
      >
        +
      </button>

      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={!canDec}
        style={{
          border: 0,
          background: "transparent",
          color: "#7ea2ff",
          fontWeight: 900,
          fontSize: 34,
          lineHeight: "28px",
          cursor: canDec ? "pointer" : "not-allowed",
          opacity: canDec ? 1 : 0.25,
          padding: 0,
        }}
      >
        −
      </button>
    </div>
  );

  const pill = (
    <div
      style={{
        width: 58,
        height: 72,
        borderRadius: 10,
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(255,255,255,0.55)",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        fontSize: 26,
        color: "rgba(0,0,0,0.62)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {value}
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: side === "left" ? "42px 58px" : "58px 42px",
        alignItems: "center",
        gap: 10,
      }}
    >
      {side === "left" ? controls : pill}
      {side === "left" ? pill : controls}
    </div>
  );
}
