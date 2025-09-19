import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Library, Trophy, Sparkles, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

import GameCreator from '@/components/GameCreator';
import GameCanvas from '@/components/GameCanvas';
import GameLibrary from '@/components/GameLibrary';
import Leaderboard from '@/components/Leaderboard';

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [currentGame, setCurrentGame] = useState<{
    data: any;
    title: string;
    prompt: string;
    parameters: any;
    id?: Id<"games">;
  } | null>(null);

  const createGame = useMutation(api.games.createGame);
  const submitScore = useMutation(api.leaderboard.submitScore);

  useEffect(() => {
    // Add some floating particles for ambiance
    const particles = document.createElement('div');
    particles.className = 'fixed inset-0 pointer-events-none z-0';
    particles.innerHTML = Array.from({ length: 20 }, (_, i) => 
      `<div class="absolute w-2 h-2 bg-purple-400/20 rounded-full animate-pulse" 
            style="left: ${Math.random() * 100}%; top: ${Math.random() * 100}%; 
                   animation-delay: ${Math.random() * 2}s; animation-duration: ${2 + Math.random() * 2}s;"></div>`
    ).join('');
    document.body.appendChild(particles);

    return () => {
      if (document.body.contains(particles)) {
        document.body.removeChild(particles);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-lg">Loading your gaming universe...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const handleGameGenerated = async (gameData: any, title: string, prompt: string, parameters: any) => {
    try {
      const gameId = await createGame({
        title,
        prompt,
        parameters,
        gameData,
        isPublic: true,
      });

      setCurrentGame({
        data: gameData,
        title,
        prompt,
        parameters,
        id: gameId,
      });
      setActiveTab('play');
      toast.success('Game created and ready to play!');
    } catch (error) {
      console.error('Failed to save game:', error);
      toast.error('Failed to save game, but you can still play it!');
      setCurrentGame({
        data: gameData,
        title,
        prompt,
        parameters,
      });
      setActiveTab('play');
    }
  };

  const handlePlayGame = async (gameId: Id<"games">) => {
    // In a real app, you'd fetch the game data here
    toast.info('Loading game...');
    setActiveTab('play');
  };

  const handleScoreSubmit = async (score: number) => {
    if (!currentGame?.id) {
      toast.error('Cannot submit score - game not saved');
      return;
    }

    try {
      await submitScore({
        gameId: currentGame.id,
        score,
        timeElapsed: Date.now(),
      });
      toast.success('Score submitted successfully!');
    } catch (error) {
      console.error('Failed to submit score:', error);
      toast.error('Failed to submit score');
    }
  };

  const handleSignOut = async () => {
    try {
      setSignOutLoading(true);
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  AI Game Creator
                </h1>
                <p className="text-white/60 text-sm">
                  Welcome back, {user?.name || 'Creator'}!
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="glass border-white/20 text-white hover:bg-white/10"
              disabled={signOutLoading}
            >
              {signOutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="glass border-white/20 bg-transparent p-1">
            <TabsTrigger 
              value="create" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/70 border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </TabsTrigger>
            <TabsTrigger 
              value="library" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/70 border-0"
            >
              <Library className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
            {currentGame && (
              <TabsTrigger 
                value="play" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/70 border-0"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Play
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="leaderboard" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-white/70 border-0"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <GameCreator onGameGenerated={handleGameGenerated} />
              </div>
              <div>
                <Leaderboard showGlobal={true} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-8">
            <GameLibrary onPlayGame={handlePlayGame} />
          </TabsContent>

          {currentGame && (
            <TabsContent value="play" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <GameCanvas
                    gameData={currentGame.data}
                    onScoreSubmit={handleScoreSubmit}
                    gameTitle={currentGame.title}
                  />
                </div>
                <div>
                  <Leaderboard gameId={currentGame.id} />
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="leaderboard" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Leaderboard showGlobal={true} />
              <Leaderboard gameId={currentGame?.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}