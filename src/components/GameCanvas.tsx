import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface GameCanvasProps {
  gameData: {
    code: string;
    assets: Array<{
      name: string;
      type: string;
      url: string;
    }>;
    config: {
      width: number;
      height: number;
      physics: boolean;
    };
  };
  onScoreSubmit: (score: number) => void;
  gameTitle: string;
}

export default function GameCanvas({ gameData, onScoreSubmit, gameTitle }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !gameData) return;

    // Dynamically import Phaser
    import('phaser').then((Phaser) => {
      // Clean up existing game
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }

      // Create game scene from generated code
      const GameScene = new Function('Phaser', `
        ${gameData.code}
        return ${gameData.code.match(/class (\w+)/)?.[1] || 'GameScene'};
      `)(Phaser);

      const config = {
        type: Phaser.AUTO,
        width: gameData.config.width,
        height: gameData.config.height,
        parent: canvasRef.current,
        physics: gameData.config.physics ? {
          default: 'arcade',
          arcade: {
            // Add missing x property to satisfy Vector2Like typing
            gravity: { x: 0, y: 300 },
            debug: false
          }
        } : undefined,
        scene: GameScene,
        backgroundColor: '#1a1a2e'
      };

      gameRef.current = new Phaser.Game(config);

      // Listen for game events
      gameRef.current.events.on('gameEnd', (score: number) => {
        setCurrentScore(score);
        setGameEnded(true);
        setIsPlaying(false);
        toast.success(`Game Over! Score: ${score}`);
      });

      setIsPlaying(true);
      setGameEnded(false);
      setCurrentScore(0);
    }).catch((error) => {
      console.error('Failed to load Phaser:', error);
      toast.error('Failed to load game engine');
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameData]);

  const handleRestart = () => {
    if (gameRef.current) {
      gameRef.current.scene.restart();
      setIsPlaying(true);
      setGameEnded(false);
      setCurrentScore(0);
    }
  };

  const handlePause = () => {
    if (gameRef.current && gameRef.current.scene.scenes[0]) {
      if (isPlaying) {
        gameRef.current.scene.scenes[0].scene.pause();
        setIsPlaying(false);
      } else {
        gameRef.current.scene.scenes[0].scene.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmitScore = () => {
    onScoreSubmit(currentScore);
    toast.success('Score submitted to leaderboard!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass border-white/20 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold tracking-tight text-white">
              {gameTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={gameEnded}
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {currentScore > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white/90">
                Score: {currentScore}
              </span>
              {gameEnded && (
                <Button
                  onClick={handleSubmitScore}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 glow"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Submit Score
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div 
            ref={canvasRef} 
            className="w-full rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800"
            style={{ 
              minHeight: gameData.config.height,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}