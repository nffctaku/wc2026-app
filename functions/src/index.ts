/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
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
setGlobalOptions({ maxInstances: 10 });

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
