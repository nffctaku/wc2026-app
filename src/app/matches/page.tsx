"use client";

import TournamentPredictionsView from "./_components/TournamentPredictionsView";
import { useTournamentPredictions } from "./_lib/useTournamentPredictions";

export default function MatchesPage() {
  const {
    uid,
    busy,
    saving,
    error,

    lockMs,
    isLocked,
    canEditInitial,

    isRePredictWindow,
    reLockMs,
    canEditRe,
    championTeamId,
    setChampionTeamId,

    championTeamId2,
    setChampionTeamId2,
    teamOptions,
    best4Slots,
    best4Count,
    updateBest4Slot,

    best4Slots2,
    best4Count2,
    updateBest4Slot2,
    gsOptions,
    groups,
    gsQualifiedTeamIds,
    gsCount,
    gsMax,
    toggleGsQualified,
    onLogin,
  } = useTournamentPredictions();

  return (
    <TournamentPredictionsView
      uid={uid}
      busy={busy}
      saving={saving}
      error={error}
      lockMs={lockMs}
      isLocked={isLocked}
      canEditInitial={canEditInitial}
      isRePredictWindow={isRePredictWindow}
      reLockMs={reLockMs}
      canEditRe={canEditRe}
      championTeamId={championTeamId}
      onChampionChange={setChampionTeamId}
      championTeamId2={championTeamId2}
      onChampionChange2={setChampionTeamId2}
      teamOptions={teamOptions}
      best4Slots={best4Slots}
      best4Count={best4Count}
      onBest4SlotChange={updateBest4Slot}
      best4Slots2={best4Slots2}
      best4Count2={best4Count2}
      onBest4SlotChange2={updateBest4Slot2}
      gsOptions={gsOptions}
      groups={groups}
      gsQualifiedTeamIds={gsQualifiedTeamIds}
      gsCount={gsCount}
      gsMax={gsMax}
      onToggleGsTeam={toggleGsQualified}
      onLogin={onLogin}
      showSavedToLabel={true}
    />
  );
}
