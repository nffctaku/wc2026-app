export default function Loading() {
  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gap: 12,
        position: "relative",
        minHeight: "100vh",
        backgroundImage: "url('/国旗/背景１.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.12)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12 }}>
        <div className="resultsMobileStageTag">グループステージ</div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 260,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.92)",
            fontWeight: 800,
          }}
        >
          読込中...
        </div>
      </div>
    </div>
  );
}
