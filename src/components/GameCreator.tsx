import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface GameCreatorProps {
  onGameGenerated: (gameData: any, title: string, prompt: string, parameters: any) => void;
}

export default function GameCreator({ onGameGenerated }: GameCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [parameters, setParameters] = useState({
    genre: 'arcade',
    difficulty: 'medium',
    theme: 'space',
    duration: 5,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateGame = useAction(api.gameGeneration.generateGame);

  const handleGenerate = async () => {
    if (!prompt.trim() || !title.trim()) {
      toast.error('Please enter both a title and description for your game');
      return;
    }

    setIsGenerating(true);
    try {
      toast.info('AI is generating your game... This may take a moment!');
      
      const gameData = await generateGame({
        prompt: prompt.trim(),
        parameters,
      });

      onGameGenerated(gameData, title, prompt, parameters);
      toast.success('Game generated successfully!');
    } catch (error) {
      console.error('Game generation failed:', error);
      toast.error('Failed to generate game. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Create Your Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/90 font-medium">Game Title</Label>
            <Input
              id="title"
              placeholder="Enter your game title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-white/90 font-medium">Game Description</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the game you want to create... Be creative! For example: 'A space shooter where you defend Earth from alien invaders with power-ups and boss battles'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="glass border-white/20 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            />
            <p className="text-xs text-white/60">
              Examples: "Tic Tac Toe with clean UI and scoring", "A retro brick breaker with faster ball speed", "A tricky platformer with floating islands".
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Genre</Label>
              <Select value={parameters.genre} onValueChange={(value) => setParameters(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="glass border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/20 bg-slate-900/90 backdrop-blur-xl">
                  <SelectItem value="arcade">🕹️ Arcade</SelectItem>
                  <SelectItem value="platformer">🏃 Platformer</SelectItem>
                  <SelectItem value="shooter">🚀 Shooter</SelectItem>
                  <SelectItem value="puzzle">🧩 Puzzle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Difficulty</Label>
              <Select value={parameters.difficulty} onValueChange={(value) => setParameters(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger className="glass border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/20 bg-slate-900/90 backdrop-blur-xl">
                  <SelectItem value="easy">😊 Easy</SelectItem>
                  <SelectItem value="medium">😐 Medium</SelectItem>
                  <SelectItem value="hard">😤 Hard</SelectItem>
                  <SelectItem value="expert">🔥 Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Theme</Label>
              <Select value={parameters.theme} onValueChange={(value) => setParameters(prev => ({ ...prev, theme: value }))}>
                <SelectTrigger className="glass border-white/20 text-white focus:border-purple-400 focus:ring-purple-400/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-white/20 bg-slate-900/90 backdrop-blur-xl">
                  <SelectItem value="space">🚀 Space</SelectItem>
                  <SelectItem value="fantasy">🧙 Fantasy</SelectItem>
                  <SelectItem value="cyberpunk">🤖 Cyberpunk</SelectItem>
                  <SelectItem value="nature">🌲 Nature</SelectItem>
                  <SelectItem value="retro">📼 Retro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-white/90 font-medium">
                Game Duration: {parameters.duration} minutes
              </Label>
              <Slider
                value={[parameters.duration]}
                onValueChange={(value) => setParameters(prev => ({ ...prev, duration: value[0] }))}
                max={15}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !title.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 py-6 text-lg font-semibold glow"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Game...
              </>
            ) : (
              <>
                <Gamepad2 className="mr-2 h-5 w-5" />
                Generate Game
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}