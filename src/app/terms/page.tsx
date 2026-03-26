export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.72), transparent 56%), linear-gradient(180deg, #fffdf6 0%, #fff3da 100%)",
        color: "rgba(0,0,0,0.88)",
        padding: "24px 16px 40px",
        display: "grid",
        justifyItems: "center",
      }}
    >
      <article style={{ width: "100%", maxWidth: 760, display: "grid", gap: 14 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>利用規約</h1>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.62)" }}>
            株式会社スポカレ
          </div>
        </header>

        <section style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0, lineHeight: 1.9 }}>
            本規約は、株式会社スポカレ（以下「当社」といいます。）が提供するスポーツファン向けサービス「スポカレコミュニティ」（以下「本サービス」といいます。）の利用に関する条件を定めるものです。本サービスの利用者（以下「ユーザー」といいます。）は、本規約に同意した上で、本サービスを利用するものとします。
          </p>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第1条（本規約への同意）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>ユーザーは、本規約に同意した上で、本サービスを利用するものとします。ユーザーが本サービスを利用した場合、本規約に同意したものとみなします。</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第2条（アカウント登録）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>
              本サービスでは、スコア予想、ランキング参加、コメント投稿機能を利用するためにアカウント登録（Googleアカウントによるログイン）が必要です。
            </li>
            <li>ユーザーは、アカウント登録に際して、虚偽ではない正確な情報を登録するものとし、登録情報に変更が生じた場合は速やかにこれを修正するものとします。</li>
            <li>当社は、過去に本規約違反等によりアカウントの削除処分を受けたユーザーからのアカウント登録を拒否できるものとします。</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第3条（ユーザー投稿コンテンツ（UGC）の知的財産権）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>ユーザーが本サービスに投稿するテキスト、画像、動画、音声、その他のコンテンツ（以下「ユーザーコンテンツ」といいます。）に関する著作権その他の知的財産権は、原則として、当該ユーザーに帰属します。</li>
            <li>ユーザーは、本サービスにユーザーコンテンツを投稿した時点で、当社に対し、当該ユーザーコンテンツを、本サービスの運営、プロモーション、広告宣伝、改善のために無償で、非独占的に、複製、公衆送信、頒布、翻訳、翻案、その他の利用を行うことを許諾するものとします。</li>
            <li>前項のライセンスは、ユーザーコンテンツが知的財産権によって保護されている限り継続するものとします。</li>
            <li>ユーザーは、ユーザーコンテンツについて、当社に対し、著作者人格権を行使しないものとします。</li>
            <li>ユーザーは、ユーザーコンテンツを投稿するにあたり、当該コンテンツに関する著作権、肖像権、パブリシティ権その他の知的財産権について、自らが適法な権原を有していること、および第三者の権利を侵害していないことを表明し、保証するものとします。</li>
            <li>ユーザーが、第三者の知的財産権（プロスポーツ団体、選手、チームロゴ等）を利用する場合、別途当該権利者から利用許諾を得る必要があります。ユーザーがこれらの権利を侵害する行為を行った場合、当社は一切責任を負いません。</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第4条（禁止事項）</h2>
          <p style={{ margin: 0, lineHeight: 1.9 }}>ユーザーは、本サービスの利用に際して、以下の行為を行ってはならないものとします。</p>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>1. 第三者保護を目的とした禁止事項</div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
              <li>当社または第三者の著作権、肖像権、パブリシティ権、その他の知的財産権を侵害する行為、またはそのおそれのある行為。</li>
              <li>他のユーザーまたは第三者の名誉、信用、プライバシーを侵害し、または誹謗中傷する行為。</li>
              <li>本人の承諾なく、他のユーザーまたは第三者の個人情報を特定、開示、漏洩する行為。</li>
            </ul>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>2. 運営者保護を目的とした禁止事項</div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
              <li>当社の事前の許可なく、本サービス上の情報やコンテンツを営利目的で利用する行為。</li>
              <li>虚偽の情報を登録する行為、または第三者になりすまして本サービスを利用する行為。</li>
              <li>本サービスの運営を妨害する行為、または当社に不利益を与える行為。</li>
              <li>コンピューターウィルス等の有害なプログラムを提供する行為、またはハッキング行為。</li>
            </ul>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>3. 公序良俗・法令違反を目的とした禁止事項</div>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
              <li>法令、公序良俗に反する行為、または犯罪行為に関連する行為。</li>
              <li>過度に暴力的、露骨な性的表現、差別的な表現など、他人に不快感を与える投稿。</li>
              <li>政治的活動、宗教的活動、または特定の団体への勧誘行為。</li>
            </ul>
          </div>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第5条（免責事項）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>本サービスは「現状有姿」で提供されるものとし、当社は、本サービスに事実上または法律上の瑕疵がないことを保証しません。</li>
            <li>当社は、本サービスを通じて提供される情報（投稿内容、試合日程、選手情報等）の正確性、完全性、有用性を保証する義務を負いません。</li>
            <li>本サービスの利用によりユーザー間に生じたトラブル、紛争、または損害について、当社は一切責任を負いません。</li>
            <li>当社は、ユーザーが本サービスを利用したことにより、または利用できなかったことにより生じるいかなる損害についても、当社の故意または重大な過失による場合を除き、一切の責任を負いません。</li>
            <li>
              情報流通プラットフォーム対処法（旧プロバイダ責任制限法）に基づき、本サービス上のユーザーコンテンツに起因する権利侵害について、当社は責任を免れるものとします。ただし、当社が権利侵害情報を速やかに削除するための体制を運用することを前提とします。
            </li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第6条（利用停止、アカウント削除）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>当社は、ユーザーが本規約に違反した場合、または違反するおそれがあると判断した場合、事前の通知なく当該ユーザーの投稿コンテンツを削除・非表示にし、またはアカウントの一時停止、もしくは永久削除をすることができるものとします。</li>
            <li>ユーザーが本規約に違反し、当社に損害を与えた場合、ユーザーは当社に対し、その損害を賠償する責任を負うものとします。</li>
            <li>ユーザーは、所定の手続きに従い、いつでもアカウントを削除することができます。</li>
            <li>アカウントを削除した場合、当該アカウントに関する全てのデータは削除され、一度削除されたアカウントは復元できないものとします。</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第7条（本規約の変更）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>当社は、民法第548条の4の規定に基づき、個別のユーザーの同意を得ることなく、本規約の内容を変更できるものとします。</li>
            <li>本規約の変更にあたっては、変更後の規約の内容と効力発生時期を、本サービス上での告知または別途当社が定める方法により、ユーザーに周知するものとします。</li>
            <li>ユーザーが規約の変更後に本サービスを利用した場合、または変更の告知から一定期間内にアカウントを削除しなかった場合、変更後の規約に同意したものとみなします。</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>第8条（準拠法および管轄裁判所）</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>本規約の解釈および適用は、日本法に準拠するものとします。</li>
            <li>本サービスに関して、ユーザーと当社の間で生じた紛争については、当社の本店所在地を管轄する地方裁判所を、第一審の専属的合意管轄裁判所とします。</li>
          </ol>
        </section>
      </article>
    </main>
  );
}
