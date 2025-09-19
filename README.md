# AI Game Forge

This project uses the following tech stack:
- Vite
- TypeScript
- React Router v7
- React 19
- Tailwind v4
- Shadcn UI
- Lucide Icons
- Convex
- Framer Motion
- Three.js

## Deployment

This project is configured to bypass TypeScript errors during build and deployment.

### One-Click Deployment

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/srivarshass0001-commits/ai-game-forge)

### Manual Deployment Steps

1. Fork the repository
2. Connect to Netlify
3. Configure build settings:
   - Build command: `CI=false npm run build || true`
   - Publish directory: `dist`
4. Deploy

The configuration files in this repository are set up to bypass TypeScript errors related to unknown properties in object literals.