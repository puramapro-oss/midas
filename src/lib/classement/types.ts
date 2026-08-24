export interface RankingEntry {
  pseudo: string;
  total_score: number;
  risk_score: number;
  regularity_score: number;
  preservation_score: number;
  loyalty_score: number;
  rank: number;
  prize_amount: number;
  is_me?: boolean;
}

export interface RankingContest {
  id: string;
  month: number;
  year: number;
  status: string;
  prize_pool: number;
  total_participants: number;
  evaluated_at: string | null;
}

export interface RankingData {
  currentRanking: RankingContest | null;
  top10: RankingEntry[];
  myRanking: RankingEntry | null;
  pastRankings: RankingContest[];
  currentMonth: number;
  currentYear: number;
}

export interface Contest {
  id: string;
  type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  prize_pool: number;
  status: string;
  winners: { user_id: string; amount: number; rank: number }[];
}

export interface ContestData {
  weekly: Contest | null;
  monthly: Contest | null;
  myWeeklyTickets: number;
  myMonthlyTickets: number;
  weeklyParticipants: number;
  pastContests: Contest[];
}
