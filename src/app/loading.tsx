import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        color: "#fff",
        position: "relative",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "grid", justifyItems: "center", gap: 14 }}>
        <Image src="/スポカレロゴ.png" alt="スポカレ" width={240} height={60} priority />
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.80)", fontSize: 13 }}>読込中...</div>
      </div>
    </div>
  );
}
