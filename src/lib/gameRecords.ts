import { supabase } from "@/integrations/supabase/client";

export type GameResult = "win" | "lose" | "draw";
export type GameType = "chain_reaction" | "semantic_battle";

interface SaveGameRecordParams {
  gameType: GameType;
  result: GameResult;
  myScore: number;
  opponentScore: number;
  opponentId?: string;
  opponentName?: string;
  roomId?: string;
}

export async function saveGameRecord({
  gameType,
  result,
  myScore,
  opponentScore,
  opponentId,
  opponentName,
  roomId,
}: SaveGameRecordParams): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log("No authenticated user, skipping game record save");
      return false;
    }

    const userId = session.user.id;

    // Insert game record
    const { error: recordError } = await supabase.from("game_records").insert({
      user_id: userId,
      game_type: gameType,
      result,
      my_score: myScore,
      opponent_score: opponentScore,
      opponent_id: opponentId,
      opponent_name: opponentName,
      room_id: roomId,
    });

    if (recordError) {
      console.error("Error saving game record:", recordError);
      return false;
    }

    // Update profile stats directly
    const { data: profile } = await supabase
      .from("profiles")
      .select("battle_wins, battle_losses, battle_draws")
      .eq("id", userId)
      .single();

    if (profile) {
      const updates: Record<string, number> = {};
      if (result === "win") updates.battle_wins = ((profile as any).battle_wins || 0) + 1;
      else if (result === "lose") updates.battle_losses = ((profile as any).battle_losses || 0) + 1;
      else updates.battle_draws = ((profile as any).battle_draws || 0) + 1;

      await supabase.from("profiles").update(updates).eq("id", userId);
    }

    return true;
  } catch (err) {
    console.error("Error in saveGameRecord:", err);
    return false;
  }
}

export interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
}

export async function getGameStats(userId: string): Promise<GameStats> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("battle_wins, battle_losses, battle_draws")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 };
    }

    const wins = data.battle_wins || 0;
    const losses = data.battle_losses || 0;
    const draws = data.battle_draws || 0;
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    return { wins, losses, draws, totalGames, winRate };
  } catch (err) {
    console.error("Error fetching game stats:", err);
    return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 };
  }
}

export interface GameRecord {
  id: string;
  gameType: GameType;
  result: GameResult;
  myScore: number;
  opponentScore: number;
  opponentName?: string;
  playedAt: string;
}

export async function getRecentGameRecords(userId: string, limit: number = 10): Promise<GameRecord[]> {
  try {
    const { data, error } = await supabase
      .from("game_records")
      .select("*")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((record: any) => ({
      id: record.id,
      gameType: record.game_type as GameType,
      result: record.result as GameResult,
      myScore: record.my_score,
      opponentScore: record.opponent_score,
      opponentName: record.opponent_name,
      playedAt: record.played_at,
    }));
  } catch (err) {
    console.error("Error fetching game records:", err);
    return [];
  }
}
