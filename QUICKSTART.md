# Quick Start Guide

Get your personal dashboard running in under 5 minutes.

## Prerequisites

Choose ONE of:
- **Docker Desktop** (recommended): [Download here](https://www.docker.com/products/docker-desktop)
- **Node.js 18+**: [Download here](https://nodejs.org/)

## Automated Setup

### Windows
```bash
setup.bat
```

### Mac/Linux
```bash
chmod +x setup.sh
./setup.sh
```

The script will detect your environment and guide you through setup.

---

## Manual Setup

### With Docker

```bash
# 1. Create environment file
cp .env.example .env.local

# 2. Start containers
docker-compose up -d

# 3. Open browser
http://localhost:3000
```

**That's it!** Hot reload works automatically.

### Without Docker

```bash
# 1. Create environment file
cp .env.example .env.local

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
http://localhost:3000
```

---

## Next Steps

1. **Customize**: Edit `app/page.tsx` to add your widgets
2. **Configure**: Add API keys in `.env.local`
3. **Develop**: Changes auto-reload in browser

## Common Issues

**Hot reload not working in Docker?**
- Make sure you're editing files on your host machine (not inside container)
- Wait 1-2 seconds after saving (polling checks every second)

**Port 3000 already in use?**
- Change port in `docker-compose.yml` to `3001:3000`
- Or kill the process using port 3000

**Need help?**
- Read `README.md` for full documentation
- Read `DOCKER_GUIDE.md` for Docker-specific help

---

## File Structure Overview

```
my-dashboard/
├── app/                    # Next.js app (your code goes here)
├── Dockerfile              # Development Docker image
├── Dockerfile.prod         # Production Docker image
├── docker-compose.yml      # Docker orchestration
├── next.config.js          # Hot reload configuration
├── package.json            # Dependencies
└── README.md              # Full documentation
```

## Development Workflow

1. **Edit code** in `app/` directory
2. **Save file** (Ctrl+S / Cmd+S)
3. **See changes** in browser automatically

No manual rebuild needed!

---

Happy coding! 🚀
