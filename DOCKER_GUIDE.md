# Docker Setup Guide

Comprehensive guide for running this dashboard with Docker.

## Why Docker?

**Benefits:**
- Consistent environment across machines
- No need to install Node.js locally
- Isolated dependencies
- Easy to reset/rebuild
- Production-ready deployment

**Trade-offs:**
- Slightly slower hot reload (uses polling)
- Requires Docker Desktop installation
- Uses more system resources

## Prerequisites

### Windows
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Enable WSL 2 backend (Settings → General → Use WSL 2 based engine)
3. Allocate resources (Settings → Resources → 4GB RAM minimum)

### Mac
1. Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. Allocate resources (Settings → Resources → 4GB RAM minimum)

### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

## How Hot Reload Works

### Without Docker (Native)
- File watching uses `inotify` (Linux kernel feature)
- Instant detection of file changes
- No CPU overhead

### With Docker (Windows/Mac)
- Docker runs in a VM (Hyper-V/HyperKit)
- File change events don't cross VM boundary
- **Solution**: Enable polling in `next.config.js`
- Checks for changes every 1 second
- Trade-off: ~5% CPU usage for hot reload

### Configuration
```javascript
// next.config.js
webpack: (config, { dev }) => {
  if (dev) {
    config.watchOptions = {
      poll: 1000,           // Check every 1 second
      aggregateTimeout: 300, // Wait 300ms after change
    }
  }
  return config
}
```

## Development Workflow

### Starting the App

```bash
# First time setup
git clone <repo>
cd my-dashboard

# Start development environment
docker-compose up -d

# View logs (optional)
docker-compose logs -f app
```

**Open**: http://localhost:3000

### Making Changes

1. Edit files on your host machine (in VS Code, etc.)
2. Save the file
3. Wait 1-2 seconds
4. Browser auto-refreshes with changes

**Important**: Don't edit files inside the container!

### Common Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f app

# Restart containers (if something is stuck)
docker-compose restart

# Stop containers
docker-compose down

# Rebuild (after changing package.json)
docker-compose up -d --build

# Execute commands inside container
docker-compose exec app sh
docker-compose exec app npm run lint
```

### When to Rebuild

**Need to rebuild:**
- Added/removed npm packages
- Changed Dockerfile
- Changed docker-compose.yml

```bash
docker-compose down
docker-compose up -d --build
```

**Don't need to rebuild:**
- Changed source code (.tsx, .js files)
- Changed styles (.css files)
- Changed environment variables (just restart)

## Troubleshooting

### Hot Reload Not Working

**Symptoms**: Changes don't appear in browser

**Checklist:**
1. Is the file saved on host machine?
2. Check `docker-compose logs -f app` for errors
3. Verify volume mount in docker-compose.yml: `- .:/app`
4. Check next.config.js has polling enabled
5. Try refreshing browser manually (F5)

**Nuclear option:**
```bash
docker-compose down -v
docker-compose up -d --build
```

### Port Already in Use

**Error**: `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:**
```bash
# Windows: Find process using port
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux: Find and kill process
lsof -ti:3000 | xargs kill -9

# Or: Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Slow Performance

**Symptoms**: App is slow, high CPU usage

**Solutions:**

1. **Increase Docker resources:**
   - Docker Desktop → Settings → Resources
   - RAM: 4GB minimum (8GB recommended)
   - CPUs: 2 minimum (4 recommended)

2. **Check volume performance:**
   - Windows: Ensure project is in WSL 2 filesystem (`\\wsl$\Ubuntu\home\...`)
   - Mac: Use `:cached` flag in volume mounts

3. **Disable polling if not needed:**
   - On Linux, native file watching works
   - Remove `poll: 1000` from next.config.js

### Container Won't Start

**Check logs:**
```bash
docker-compose logs app
```

**Common issues:**
- **Syntax error in code**: Fix the error, container will restart
- **Missing dependencies**: Run `docker-compose up -d --build`
- **Port conflict**: Change port in docker-compose.yml

### Database Issues

**SQLite file permissions:**
```bash
# If database is locked
docker-compose exec app rm dev.db
docker-compose restart
```

**PostgreSQL connection:**
```bash
# Check if database is running
docker-compose ps db

# View database logs
docker-compose logs db

# Connect to database
docker-compose exec db psql -U dashboard_user -d dashboard
```

## Production Deployment

### Build Production Image

```bash
# Build optimized image
docker build -f Dockerfile.prod -t my-dashboard:prod .

# Check image size (should be ~100-150MB)
docker images | grep my-dashboard
```

### Deploy with Docker Compose

```bash
# Copy production compose file
cp docker-compose.prod.yml docker-compose.yml

# Set environment variables
export DATABASE_URL="postgresql://..."
export NEWS_API_KEY="..."
export POSTGRES_PASSWORD="secure_password"

# Start production stack
docker-compose up -d

# View logs
docker-compose logs -f
```

### Multi-Stage Build Breakdown

```dockerfile
# Stage 1: deps (production dependencies only)
FROM node:18-alpine AS deps
RUN npm ci --production  # 50MB

# Stage 2: builder (build app)
FROM node:18-alpine AS builder
RUN npm ci              # Install dev deps
RUN npm run build       # Build app

# Stage 3: runner (minimal runtime)
FROM node:18-alpine AS runner
COPY --from=deps /app/node_modules    # Copy prod deps
COPY --from=builder /app/.next        # Copy built app
# Final image: ~100MB (5x smaller than dev)
```

## Docker Best Practices Used

### Security
✅ Multi-stage builds (minimal attack surface)
✅ Non-root user in production
✅ No secrets in Dockerfile (use environment variables)
✅ Official base images (node:18-alpine)

### Performance
✅ Layer caching (dependencies copied before source)
✅ .dockerignore to exclude unnecessary files
✅ Alpine Linux for small image size
✅ Named volumes for database persistence

### Development Experience
✅ Hot reload with polling (Windows/Mac support)
✅ Volume mounts for live editing
✅ docker-compose for one-command startup
✅ Clear separation of dev/prod configs

## Comparison: Docker vs Local

| Feature | Docker | Local |
|---------|--------|-------|
| **Setup Time** | 2 minutes | 5 minutes |
| **Hot Reload Speed** | 1-2 seconds | Instant |
| **Consistency** | Same everywhere | Varies by system |
| **Resource Usage** | Higher (~1GB RAM) | Lower (~500MB) |
| **Portability** | Perfect | Depends on Node version |
| **Production Parity** | High | Medium |

**Recommendation**: Use Docker if you're deploying with Docker, or want consistent environments. Use local if you prioritize speed.

## Advanced Tips

### Speed Up Rebuilds

```bash
# Use BuildKit (faster builds)
DOCKER_BUILDKIT=1 docker-compose build

# Cache npm packages in named volume
volumes:
  - npm_cache:/root/.npm
```

### Debug Inside Container

```bash
# Open shell in running container
docker-compose exec app sh

# Install debugging tools
apk add --no-cache curl vim

# Check environment
env | grep NODE
```

### View Database

```bash
# SQLite
docker-compose exec app sqlite3 dev.db
sqlite> .tables
sqlite> SELECT * FROM todos;

# PostgreSQL
docker-compose exec db psql -U dashboard_user -d dashboard
\dt
SELECT * FROM todos;
```

### Clean Up

```bash
# Remove containers
docker-compose down

# Remove containers + volumes (deletes database)
docker-compose down -v

# Remove images
docker rmi my-dashboard:prod

# Prune all unused Docker resources
docker system prune -a
```

## Learning Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js with Docker](https://nextjs.org/docs/deployment#docker-image)
- [Docker Mastery Course](https://www.udemy.com/course/docker-mastery/)

---

**Questions?** Open an issue on GitHub or check the README.md troubleshooting section.
