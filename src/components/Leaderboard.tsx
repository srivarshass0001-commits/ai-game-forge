import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
/* Removed unused Id import */

interface LeaderboardProps {
  gameId?: Id<"games">;
  showGlobal?: boolean;
}

export default function Leaderboard({ gameId, showGlobal = false }: LeaderboardProps) {
  const gameLeaderboard = useQuery(
    api.leaderboard.getGameLeaderboard,
    gameId ? { gameId, limit: 10 } : "skip"
  );
  
  const globalLeaderboard = useQuery(
    api.leaderboard.getGlobalLeaderboard,
    showGlobal ? { limit: 10 } : "skip"
  );

  const leaderboardData = showGlobal ? globalLeaderboard : gameLeaderboard;

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 1:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Award className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 2:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass border-white/20 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <Trophy className="h-5 w-5 text-yellow-400" />
            {showGlobal ? 'Global Leaderboard' : 'Game Leaderboard'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!leaderboardData ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 glass border-white/10 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-white/20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/20 rounded w-3/4" />
                    <div className="h-3 bg-white/20 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No scores yet!</p>
              <p className="text-sm">Be the first to play and set a record.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboardData.map((entry, index) => (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 glass border-white/10 rounded-lg hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8">
                    {index < 3 ? (
                      getRankIcon(index)
                    ) : (
                      <span className="text-white/70 font-bold">#{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">
                        {entry.playerName}
                      </p>
                      {index < 3 && (
                        <Badge className={`${getRankColor(index)} text-white border-0 text-xs px-2 py-0`}>
                          {index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <span className="font-mono">{entry.score.toLocaleString()}</span>
                      {showGlobal && (entry as any).gameTitle && (
                        <>
                          <span>•</span>
                          <span className="truncate">{(entry as any).gameTitle}</span>
                        </>
                      )}
                      {entry.timeElapsed && (
                        <>
                          <span>•</span>
                          <span>{Math.round(entry.timeElapsed / 1000)}s</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {entry.score.toLocaleString()}
                    </div>
                    {entry.level && (
                      <div className="text-xs text-white/60">
                        Level {entry.level}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}