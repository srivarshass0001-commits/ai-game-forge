import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router";
import { 
  Sparkles, 
  Gamepad2, 
  Trophy, 
  Zap, 
  Users, 
  ArrowRight,
  Play,
  Star,
  Cpu,
  Palette
} from "lucide-react";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();

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
            <span className="text-white text-lg">Loading...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-64 h-64 rounded-full opacity-10"
              style={{
                background: `linear-gradient(45deg, 
                  oklch(0.7 0.3 ${280 + i * 40}) 0%, 
                  oklch(0.6 0.25 ${320 + i * 30}) 100%)`,
                left: `${20 + i * 15}%`,
                top: `${10 + i * 12}%`,
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 180, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center mb-8"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center glow-accent">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </motion.div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
                Create Games with
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {" "}AI Magic
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Transform your ideas into playable 2D games instantly. 
                No coding required – just describe your vision and watch AI bring it to life.
              </p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 py-6 text-lg font-semibold glow"
                onClick={() => window.location.href = '/auth'}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="glass border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg"
              >
                <Gamepad2 className="mr-2 h-5 w-5" />
                View Examples
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-wrap justify-center gap-8 pt-12"
            >
              {[
                { icon: Gamepad2, label: "Games Created", value: "10K+" },
                { icon: Users, label: "Active Creators", value: "2.5K+" },
                { icon: Trophy, label: "High Scores", value: "50K+" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/60">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Our cutting-edge AI doesn't just generate code – it creates complete gaming experiences 
              with mechanics, visuals, and balanced gameplay.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Cpu,
                title: "Smart Game Logic",
                description: "AI generates sophisticated game mechanics, physics, and interactive systems tailored to your vision.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Palette,
                title: "Visual Assets",
                description: "Automatically creates sprites, animations, and visual effects that match your game's theme and style.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: Zap,
                title: "Instant Deployment",
                description: "Games are ready to play immediately with built-in leaderboards and social features.",
                gradient: "from-orange-500 to-red-500"
              },
              {
                icon: Gamepad2,
                title: "Multiple Genres",
                description: "Create platformers, shooters, puzzles, arcade games, and more with genre-specific optimizations.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: Trophy,
                title: "Competitive Play",
                description: "Built-in scoring systems and global leaderboards make every game competitive and engaging.",
                gradient: "from-yellow-500 to-orange-500"
              },
              {
                icon: Star,
                title: "Community Sharing",
                description: "Share your creations with the community and discover amazing games from other creators.",
                gradient: "from-indigo-500 to-purple-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass border-white/20 hover:border-white/30 transition-all duration-300 group h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center group-hover:glow transition-all duration-300`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    <p className="text-white/70 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              From Idea to Game in Minutes
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Our streamlined process makes game creation accessible to everyone, 
              regardless of technical background.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Describe Your Vision",
                description: "Tell our AI what kind of game you want to create. Be as creative and detailed as you like!",
                icon: Sparkles
              },
              {
                step: "02", 
                title: "AI Generates Everything",
                description: "Watch as our AI creates game logic, visual assets, and mechanics tailored to your description.",
                icon: Cpu
              },
              {
                step: "03",
                title: "Play & Share",
                description: "Your game is instantly playable! Share it with friends and compete on global leaderboards.",
                icon: Trophy
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto glow-accent">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-sm font-bold text-white">{step.step}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-white/70 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <Card className="glass border-white/20 overflow-hidden">
            <CardContent className="p-12 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Ready to Create Magic?
                </h2>
                <p className="text-xl text-white/80 max-w-2xl mx-auto">
                  Join thousands of creators who are already building amazing games with AI. 
                  Your next masterpiece is just a description away.
                </p>
              </div>
              
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-12 py-6 text-xl font-semibold glow"
                onClick={() => window.location.href = '/auth'}
              >
                <Sparkles className="mr-3 h-6 w-6" />
                Start Creating Now
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
              
              <p className="text-white/60 text-sm">
                Free to start • No credit card required • Create unlimited games
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold">AI Game Creator</span>
          </div>
          <p className="text-white/60">
            Powered by{" "}
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors underline"
            >
              vly.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}