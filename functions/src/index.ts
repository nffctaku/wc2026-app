/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functionsV1 from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

initializeApp();

type PredictionDoc = {
  uid: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
};

type MatchPredictionStatsDoc = {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  total: number;
  updatedAt: Timestamp;
};

type MatchDoc = {
  matchNumber?: number;
  status?: "SCHEDULED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
};

function outcome(home: number, away: number): "H" | "A" | "D" {
  if (home === away) return "D";
  return home > away ? "H" : "A";
}

function predOutcome(p?: Partial<PredictionDoc> | null): "H" | "A" | "D" | null {
  const hs = typeof p?.homeScore === "number" ? p.homeScore : NaN;
  const as = typeof p?.awayScore === "number" ? p.awayScore : NaN;
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
  return outcome(hs, as);
}

function deltaFor(out: "H" | "A" | "D" | null, sign: 1 | -1) {
  return {
    homeWin: out === "H" ? sign : 0,
    draw: out === "D" ? sign : 0,
    awayWin: out === "A" ? sign : 0,
    total: out ? sign : 0,
  };
}

export const onPredictionWritten = functionsV1
  .region("us-central1")
  .firestore.document("predictions/{predId}")
  .onWrite(async (change: functionsV1.Change<functionsV1.firestore.DocumentSnapshot>) => {
    const before = (change.before.exists ? (change.before.data() as PredictionDoc) : null) as PredictionDoc | null;
    const after = (change.after.exists ? (change.after.data() as PredictionDoc) : null) as PredictionDoc | null;

    const matchId = after?.matchId ?? before?.matchId;
    if (!matchId) return;

    const beforeOut = predOutcome(before);
    const afterOut = predOutcome(after);

    const db = getFirestore();
    const ref = db.doc(`matchPredictionStats/${matchId}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const cur = (snap.exists ? (snap.data() as Partial<MatchPredictionStatsDoc>) : {}) as Partial<MatchPredictionStatsDoc>;

      const dec = deltaFor(beforeOut, -1);
      const inc = deltaFor(afterOut, 1);

      const next: MatchPredictionStatsDoc = {
        matchId,
        homeWin: Math.max(0, (cur.homeWin ?? 0) + dec.homeWin + inc.homeWin),
        draw: Math.max(0, (cur.draw ?? 0) + dec.draw + inc.draw),
        awayWin: Math.max(0, (cur.awayWin ?? 0) + dec.awayWin + inc.awayWin),
        total: Math.max(0, (cur.total ?? 0) + dec.total + inc.total),
        updatedAt: Timestamp.now(),
      };

      tx.set(ref, next, {merge: true});
    });

    logger.info("matchPredictionStats updated", {
      matchId,
      before: beforeOut,
      after: afterOut,
    });
  });

function calcPoints(
  actualHome: number,
  actualAway: number,
  predHome: number,
  predAway: number
): number {
  if (actualHome === predHome && actualAway === predAway) return 50;
  if (outcome(actualHome, actualAway) === outcome(predHome, predAway)) return 20;
  return 0;
}

async function assertAdmin(uid: string): Promise<void> {
  const db = getFirestore();
  const snap = await db.doc(`users/${uid}`).get();
  const role = (snap.data() as {role?: string} | undefined)?.role;
  if (role !== "ADMIN") {
    throw new HttpsError("permission-denied", "ADMIN権限が必要です");
  }
}

export const backfillMatchPredictionStats = onCall(async (request) => {
  try {
    logger.info("backfillMatchPredictionStats called", {
      hasAuth: Boolean(request.auth),
      uid: request.auth?.uid ?? null,
    });

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }
    await assertAdmin(uid);

    const matchId =
      typeof (request.data as any)?.matchId === "string"
        ? String((request.data as any).matchId)
        : null;

    const db = getFirestore();
    let q = db.collection("predictions").orderBy("matchId");
    if (matchId) {
      q = q.where("matchId", "==", matchId);
    }

    const counts = new Map<
      string,
      {
        homeWin: number;
        draw: number;
        awayWin: number;
        total: number;
      }
    >();

    let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let predictionsProcessed = 0;

    while (true) {
      let page = q.limit(1000);
      if (last) page = page.startAfter(last);
      const snap = await page.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        const p = docSnap.data() as Partial<PredictionDoc>;
        const mid = typeof p.matchId === "string" ? p.matchId : null;
        if (!mid) continue;
        const out = predOutcome(p);
        if (!out) continue;

        predictionsProcessed += 1;
        const cur = counts.get(mid) ?? {homeWin: 0, draw: 0, awayWin: 0, total: 0};
        if (out === "H") cur.homeWin += 1;
        else if (out === "D") cur.draw += 1;
        else cur.awayWin += 1;
        cur.total += 1;
        counts.set(mid, cur);
      }

      last = snap.docs[snap.docs.length - 1] ?? null;
      if (snap.size < 1000) break;
    }

    const writer = db.bulkWriter();
    let docsWritten = 0;
    for (const [mid, c] of counts) {
      writer.set(
        db.doc(`matchPredictionStats/${mid}`),
        {
          matchId: mid,
          homeWin: c.homeWin,
          draw: c.draw,
          awayWin: c.awayWin,
          total: c.total,
          updatedAt: Timestamp.now(),
        },
        {merge: true}
      );
      docsWritten += 1;
    }
    await writer.close();

    logger.info("backfillMatchPredictionStats complete", {
      matchId,
      matchesUpdated: docsWritten,
      predictionsProcessed,
    });

    return {
      matchId,
      matchesUpdated: docsWritten,
      predictionsProcessed,
    };
  } catch (err) {
    logger.error("backfillMatchPredictionStats failed", err);
    if (err instanceof HttpsError) throw err;
    const e = err as any;
    throw new HttpsError("internal", "backfillMatchPredictionStats failed", {
      message: e?.message ? String(e.message) : String(err),
    });
  }
});

export const recalcPoints = onCall(async (request) => {
  try {
    logger.info("recalcPoints called", {
      hasAuth: Boolean(request.auth),
      uid: request.auth?.uid ?? null,
    });

    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "ログインが必要です");
    }

    await assertAdmin(uid);

    const db = getFirestore();
    const cfgSnap = await db.doc("tournamentConfig/current").get();
    const scoringVersion =
      (cfgSnap.data() as {scoringVersion?: number} | undefined)?.scoringVersion ?? 1;

    const finishedMatchesSnap = await db
      .collection("matches")
      .where("status", "==", "FINISHED")
      .get();

    const writer = db.bulkWriter();
    const totals = new Map<string, number>();
    let matchesProcessed = 0;
    let predictionsProcessed = 0;
    let pointsWritten = 0;

    for (const matchDoc of finishedMatchesSnap.docs) {
      const matchId = matchDoc.id;
      const m = matchDoc.data() as MatchDoc;
      if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") {
        continue;
      }

      const predSnap = await db
        .collection("predictions")
        .where("matchId", "==", matchId)
        .get();

      matchesProcessed += 1;
      predictionsProcessed += predSnap.size;

      for (const pDoc of predSnap.docs) {
        const p = pDoc.data() as PredictionDoc;
        if (typeof p.uid !== "string") continue;
        if (typeof p.homeScore !== "number" || typeof p.awayScore !== "number") continue;

        const points = calcPoints(m.homeScore, m.awayScore, p.homeScore, p.awayScore);
        totals.set(p.uid, (totals.get(p.uid) ?? 0) + points);

        const id = `${p.uid}_${matchId}`;
        const ref = db.doc(`userMatchPoints/${id}`);
        writer.set(
          ref,
          {
            uid: p.uid,
            matchId,
            matchNumber: m.matchNumber ?? null,
            points,
            scoringVersion,
            updatedAt: Timestamp.now(),
          },
          {merge: true}
        );
        pointsWritten += 1;
      }
    }

    for (const [userId, totalPoints] of totals) {
      const ref = db.doc(`userStats/${userId}`);
      writer.set(
        ref,
        {
          uid: userId,
          totalPoints,
          scoringVersion,
          updatedAt: Timestamp.now(),
        },
        {merge: true}
      );
    }

    await writer.close();

    logger.info("recalcPoints complete", {
      matchesProcessed,
      predictionsProcessed,
      pointsWritten,
      usersUpdated: totals.size,
      scoringVersion,
    });

    return {
      matchesProcessed,
      predictionsProcessed,
      pointsWritten,
      usersUpdated: totals.size,
      scoringVersion,
    };
  } catch (err) {
    logger.error("recalcPoints failed", err);
    if (err instanceof HttpsError) throw err;
    const e = err as any;
    throw new HttpsError("internal", "recalcPoints failed", {
      message: e?.message ? String(e.message) : String(err),
    });
  }
});
