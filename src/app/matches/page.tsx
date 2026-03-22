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
    championTeamId,
    setChampionTeamId,
    teamOptions,
    best4Slots,
    best4Count,
    updateBest4Slot,
    gsOptions,
    gsSlots,
    gsCount,
    gsMax,
    updateGsSlot,
    onLogin,
    onSave,
  } = useTournamentPredictions();

  return (
    <TournamentPredictionsView
      uid={uid}
      busy={busy}
      saving={saving}
      error={error}
      lockMs={lockMs}
      isLocked={isLocked}
      championTeamId={championTeamId}
      onChampionChange={setChampionTeamId}
      teamOptions={teamOptions}
      best4Slots={best4Slots}
      best4Count={best4Count}
      onBest4SlotChange={updateBest4Slot}
      gsOptions={gsOptions}
      gsSlots={gsSlots}
      gsCount={gsCount}
      gsMax={gsMax}
      onGsSlotChange={updateGsSlot}
      onLogin={onLogin}
      onSave={onSave}
      showSavedToLabel={true}
    />
  );
}
