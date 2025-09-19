import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Search, Globe, Lock, Calendar, User } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface GameLibraryProps {
  // Support async or sync handlers
  onPlayGame: (gameId: Id<"games">) => Promise<void> | void;
}

export default function GameLibrary({ onPlayGame }: GameLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPublicOnly, setShowPublicOnly] = useState(true);
  // Track per-card loading state by game id
  const [loadingGameId, setLoadingGameId] = useState<Id<"games"> | null>(null);

  const publicGames = useQuery(api.games.getPublicGames, { limit: 20 });
  const userGames = useQuery(api.games.getUserGames);

  const allGames = showPublicOnly ? (publicGames || []) : [...(publicGames || []), ...(userGames || [])];

  const filteredGames = allGames.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-500/20 text-green-300 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      hard: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      expert: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Filters */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <Search className="h-5 w-5 text-purple-400" />
            Game Library
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={showPublicOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPublicOnly(true)}
              className={showPublicOnly 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                : "glass border-white/20 text-white hover:bg-white/10"
              }
            >
              <Globe className="h-4 w-4 mr-2" />
              Public Games
            </Button>
            <Button
              variant={!showPublicOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPublicOnly(false)}
              className={!showPublicOnly 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                : "glass border-white/20 text-white hover:bg-white/10"
              }
            >
              <User className="h-4 w-4 mr-2" />
              All Games
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="glass border-white/20 hover:border-white/30 transition-all duration-300 group cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold tracking-tight text-white truncate">
                      {game.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getDifficultyColor(game.parameters.difficulty)}>
                        {game.parameters.difficulty}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white/70">
                        {game.parameters.theme}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-white/60">
                    {game.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-white/80 text-sm line-clamp-3">
                  {game.prompt}
                </p>
                
                <div className="flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {(game as any).userName || 'You'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(game._creationTime).toLocaleDateString()}
                  </div>
                </div>
                
                <Button
                  onClick={async () => {
                    setLoadingGameId(game._id);
                    try {
                      await Promise.resolve(onPlayGame(game._id));
                    } finally {
                      setLoadingGameId(null);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 group-hover:glow transition-all duration-300"
                  disabled={loadingGameId === game._id}
                >
                  {loadingGameId === game._id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Play Game
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <Card className="glass border-white/20">
          <CardContent className="text-center py-12">
            <div className="text-white/60 space-y-2">
              <Search className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-lg">No games found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}