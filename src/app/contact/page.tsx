import Link from "next/link";

export default function ContactPage() {
  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>お問合せ</h1>
      </div>
      <p>
        お問合せはX（SNS）または管理者までお願いします。
      </p>
    </div>
  );
}
