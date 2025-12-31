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

export interface StreakBonus {
  streakCount: number;
  bonusPoints: number;
  isNewRecord: boolean;
}

// Calculate bonus points based on streak
const calculateStreakBonus = (streakCount: number): number => {
  if (streakCount < 3) return 0;
  if (streakCount === 3) return 500;  // 3연승: 500점
  if (streakCount === 4) return 750;  // 4연승: 750점
  if (streakCount === 5) return 1000; // 5연승: 1000점
  return 1000 + (streakCount - 5) * 300; // 6연승+: 1000 + 300씩 추가
};

export async function saveGameRecord({
  gameType,
  result,
  myScore,
  opponentScore,
  opponentId,
  opponentName,
  roomId,
}: SaveGameRecordParams): Promise<{ success: boolean; streakBonus?: StreakBonus }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log("No authenticated user, skipping game record save");
      return { success: false };
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
      return { success: false };
    }

    // Update profile stats directly
    const { data: profile } = await supabase
      .from("profiles")
      .select("battle_wins, battle_losses, battle_draws, win_streak, max_win_streak, points")
      .eq("id", userId)
      .single();

    if (profile) {
      const updates: Record<string, number> = {};
      let newStreak = (profile as any).win_streak || 0;
      let maxStreak = (profile as any).max_win_streak || 0;
      let currentPoints = (profile as any).points || 0;
      let streakBonus: StreakBonus | undefined;

      if (result === "win") {
        updates.battle_wins = ((profile as any).battle_wins || 0) + 1;
        newStreak += 1;
        updates.win_streak = newStreak;
        
        // Check if new record
        const isNewRecord = newStreak > maxStreak;
        if (isNewRecord) {
          updates.max_win_streak = newStreak;
        }
        
        // Calculate and apply streak bonus
        if (newStreak >= 3) {
          const bonusPoints = calculateStreakBonus(newStreak);
          updates.points = currentPoints + bonusPoints;
          streakBonus = {
            streakCount: newStreak,
            bonusPoints,
            isNewRecord
          };
        }
      } else if (result === "lose") {
        updates.battle_losses = ((profile as any).battle_losses || 0) + 1;
        updates.win_streak = 0; // Reset streak on loss
      } else {
        updates.battle_draws = ((profile as any).battle_draws || 0) + 1;
        // Draw doesn't affect streak
      }

      await supabase.from("profiles").update(updates).eq("id", userId);

      return { success: true, streakBonus };
    }

    return { success: true };
  } catch (err) {
    console.error("Error in saveGameRecord:", err);
    return { success: false };
  }
}

export interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  currentStreak: number;
  maxStreak: number;
}

export async function getGameStats(userId: string): Promise<GameStats> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("battle_wins, battle_losses, battle_draws, win_streak, max_win_streak")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, currentStreak: 0, maxStreak: 0 };
    }

    const wins = data.battle_wins || 0;
    const losses = data.battle_losses || 0;
    const draws = data.battle_draws || 0;
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const currentStreak = (data as any).win_streak || 0;
    const maxStreak = (data as any).max_win_streak || 0;

    return { wins, losses, draws, totalGames, winRate, currentStreak, maxStreak };
  } catch (err) {
    console.error("Error fetching game stats:", err);
    return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, currentStreak: 0, maxStreak: 0 };
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
