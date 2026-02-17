# Timetable Generator - Deployment Guide

## PROJECT OVERVIEW
- **Backend**: FastAPI (Python) - Port 8000 (default)
- **Frontend**: React + Vite (TypeScript) - Port 8080 (dev), static build for production
- **Current State**: No database (in-memory computation only)
- **Users**: 2 people
- **Requirement**: CI/CD pipeline, no scalability needed

---

## DATABASE RECOMMENDATIONS

### Option 1: No Database (Current State)
- **When**: If you only generate timetables on-demand and don't need to save them
- **Pros**: Simplest, zero cost, no setup
- **Cons**: No history, no saved timetables

### Option 2: SQLite (Recommended for 2 users)
- **When**: You want to save generated timetables, user preferences, or configuration
- **Pros**: 
  - Zero configuration
  - File-based (no separate server)
  - Perfect for 2 users
  - Free
- **Cons**: Not suitable for concurrent writes (but fine for 2 users)
- **Setup**: Just add `sqlalchemy` to requirements.txt, create models

### Option 3: PostgreSQL (If you want proper database)
- **When**: You want proper ACID transactions, future-proofing
- **AWS**: RDS PostgreSQL (t3.micro free tier eligible) or Aurora Serverless
- **Hostinger**: Included with VPS plans or use managed PostgreSQL
- **Pros**: Production-ready, concurrent access, backups
- **Cons**: More setup, potential cost

**RECOMMENDATION**: Start with SQLite. Upgrade to PostgreSQL only if you need concurrent writes or backups.

---

## AWS DEPLOYMENT OPTIONS

### Option A: AWS ECS (Elastic Container Service) - RECOMMENDED

**Architecture:**
- Frontend: S3 + CloudFront (static hosting)
- Backend: ECS Fargate (containerized)
- Database: RDS PostgreSQL (optional) or SQLite in container
- CI/CD: GitHub Actions → ECR → ECS

**What You Need to Learn:**
1. Docker (containerization)
2. AWS ECS basics (tasks, services, clusters)
3. AWS ECR (container registry)
4. S3 + CloudFront (static hosting)
5. GitHub Actions (CI/CD)
6. AWS IAM (permissions)

**Cost**: ~$15-30/month (Fargate + S3 + minimal RDS if used)

**Steps:**
1. Create Dockerfile for backend
2. Build frontend static files
3. Push backend image to ECR
4. Deploy frontend to S3
5. Setup ECS service with Fargate
6. Configure GitHub Actions for auto-deploy

**Pros:**
- Fully managed containers
- Auto-scaling (though you don't need it)
- CI/CD friendly
- Professional setup

**Cons:**
- More complex initial setup
- AWS learning curve

---

### Option B: AWS EC2 (Virtual Server)

**Architecture:**
- EC2 instance (t2.micro or t3.micro - free tier eligible)
- Nginx as reverse proxy
- PM2 or systemd for backend
- Frontend served via Nginx

**What You Need to Learn:**
1. Linux server administration (SSH, systemd)
2. Nginx configuration
3. PM2 or systemd for process management
4. SSL certificates (Let's Encrypt)
5. GitHub Actions for deployment

**Cost**: $0-10/month (free tier for first year, then ~$8/month)

**Steps:**
1. Launch EC2 instance (Ubuntu)
2. Install Python, Node.js, Nginx
3. Setup reverse proxy (Nginx)
4. Deploy backend with PM2
5. Build and serve frontend via Nginx
6. Setup GitHub Actions for SSH deployment

**Pros:**
- Cheapest option (free tier)
- Full control
- Simple architecture

**Cons:**
- Manual server management
- Need to handle updates, security patches

---

### Option C: AWS App Runner (Simplest)

**Architecture:**
- App Runner for backend (auto-builds from GitHub)
- S3 + CloudFront for frontend

**What You Need to Learn:**
1. Docker basics
2. GitHub Actions (for frontend)
3. AWS App Runner console

**Cost**: ~$7-15/month

**Steps:**
1. Connect GitHub repo to App Runner
2. App Runner auto-builds and deploys backend
3. Deploy frontend to S3 via GitHub Actions

**Pros:**
- Easiest AWS option
- Auto-deploys on git push
- Minimal configuration

**Cons:**
- Less control than ECS
- Slightly more expensive than EC2

---

## HOSTINGER DEPLOYMENT OPTIONS

### Option A: Hostinger VPS (Recommended)

**Architecture:**
- VPS with Ubuntu
- Nginx reverse proxy
- PM2 for backend
- Frontend served via Nginx

**What You Need to Learn:**
1. Linux server basics
2. Nginx configuration
3. PM2 process management
4. SSL setup (Let's Encrypt)
5. GitHub Actions for deployment

**Cost**: ~$4-8/month (VPS plans)

**Steps:**
1. Purchase VPS plan
2. Setup Ubuntu server
3. Install dependencies (Python, Node.js, Nginx)
4. Configure Nginx
5. Deploy backend with PM2
6. Build and serve frontend
7. Setup GitHub Actions for auto-deploy

**Pros:**
- Very affordable
- Full root access
- Good for learning

**Cons:**
- Manual server management
- Need to handle security updates

---

### Option B: Hostinger Shared Hosting (Not Recommended)

**Why Not**: Shared hosting doesn't support:
- Custom Python backend (FastAPI)
- Long-running processes
- Custom server configurations

**Alternative**: Use Hostinger VPS instead.

---

## CI/CD SETUP (GitHub Actions)

### For AWS ECS:
```yaml
# .github/workflows/deploy.yml
1. On push to main:
   - Build Docker image
   - Push to ECR
   - Update ECS service
   - Build frontend
   - Deploy to S3
   - Invalidate CloudFront cache
```

### For AWS EC2 / Hostinger VPS:
```yaml
# .github/workflows/deploy.yml
1. On push to main:
   - Build frontend
   - SSH into server
   - Pull latest code
   - Install dependencies
   - Restart services (PM2/systemd)
   - Deploy frontend files
```

**What You Need to Learn:**
- GitHub Actions YAML syntax
- Secrets management (GitHub Secrets)
- SSH key setup
- Docker (if using containers)

---

## RECOMMENDED LEARNING PATH

### Week 1: Basics
1. **Docker**: Learn to containerize your backend
   - Create Dockerfile
   - Build and run containers locally
   - Understand multi-stage builds

2. **Linux Basics**: If using EC2/VPS
   - SSH, file permissions
   - Systemd or PM2
   - Basic shell commands

### Week 2: Deployment Platform
3. **Choose Platform**: AWS ECS (recommended) or Hostinger VPS
   - Follow platform-specific tutorials
   - Deploy manually first
   - Understand networking (ports, security groups)

4. **Nginx**: If using EC2/VPS
   - Reverse proxy setup
   - SSL certificate (Let's Encrypt)
   - Static file serving

### Week 3: CI/CD
5. **GitHub Actions**:
   - Create workflow files
   - Setup secrets
   - Test deployment pipeline
   - Understand triggers (push, PR)

6. **Database** (if needed):
   - SQLite: Add SQLAlchemy models
   - PostgreSQL: Setup RDS or install on VPS

---

## SPECIFIC RECOMMENDATION FOR YOUR PROJECT

**Best Option: AWS ECS with Fargate**

**Why:**
- Professional CI/CD setup
- No server management
- Auto-deploys on git push
- Scalable if needed later (though you don't need it now)
- Clean separation (frontend S3, backend ECS)

**Architecture:**
```
Frontend (React) → Build → S3 → CloudFront → Users
Backend (FastAPI) → Docker → ECR → ECS Fargate → Users
Database → SQLite (in container) or RDS PostgreSQL
CI/CD → GitHub Actions → Auto-deploy on push
```

**Cost Breakdown:**
- ECS Fargate: ~$10-15/month (0.25 vCPU, 0.5GB RAM)
- S3 + CloudFront: ~$1-2/month
- RDS (optional): ~$15/month (t3.micro) or $0 (SQLite)
- **Total: ~$15-30/month**

---

## ALTERNATIVE: Hostinger VPS (Budget Option)

**If budget is tight:**
- Hostinger VPS: $4-8/month
- Full control, manual setup
- Same architecture as EC2
- Good for learning

**Architecture:**
```
Frontend (React) → Build → Nginx static files
Backend (FastAPI) → PM2 → Nginx reverse proxy
Database → SQLite (file) or PostgreSQL (installed on VPS)
CI/CD → GitHub Actions → SSH deploy
```

---

## FILES YOU'LL NEED TO CREATE

### 1. Backend Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Build Script
```bash
cd timetable-frontend
npm install
npm run build
# Output: dist/ folder
```

### 3. GitHub Actions Workflow
- `.github/workflows/deploy.yml`
- Handles: build, test, deploy

### 4. Nginx Config (if using EC2/VPS)
- Reverse proxy for backend
- Static file serving for frontend
- SSL configuration

### 5. Environment Variables
- `.env` file (don't commit)
- Backend URL for frontend
- Database connection (if using)

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] Add CORS configuration (update allowed origins)
- [ ] Environment variables setup
- [ ] Database models (if adding database)
- [ ] Error handling and logging
- [ ] Health check endpoint (`/health`)

### AWS ECS:
- [ ] Dockerfile created
- [ ] ECR repository created
- [ ] ECS cluster and service configured
- [ ] S3 bucket for frontend
- [ ] CloudFront distribution
- [ ] IAM roles and permissions
- [ ] GitHub Actions workflow

### Hostinger VPS:
- [ ] VPS purchased and configured
- [ ] Domain name pointed to VPS
- [ ] SSL certificate installed
- [ ] Nginx configured
- [ ] PM2/systemd service setup
- [ ] GitHub Actions workflow with SSH

### Post-Deployment:
- [ ] Test all endpoints
- [ ] Verify frontend-backend communication
- [ ] Monitor logs
- [ ] Setup basic monitoring (optional)

---

## KEY CONCEPTS TO UNDERSTAND

1. **Reverse Proxy**: Nginx sits in front of your backend, routes requests
2. **Containerization**: Docker packages your app with dependencies
3. **CI/CD**: Automated testing and deployment on code changes
4. **Static Hosting**: Frontend built files served from CDN/storage
5. **Environment Variables**: Configuration without hardcoding
6. **SSL/TLS**: HTTPS encryption (Let's Encrypt is free)
7. **Process Management**: PM2 or systemd keeps backend running
8. **GitHub Secrets**: Secure storage of API keys, passwords

---

## RESOURCES TO LEARN

1. **Docker**: Official Docker tutorial
2. **AWS ECS**: AWS ECS Workshop
3. **Nginx**: DigitalOcean Nginx guides
4. **GitHub Actions**: GitHub Actions documentation
5. **FastAPI Deployment**: FastAPI deployment guide
6. **React Build**: Vite production build guide

---

## FINAL RECOMMENDATION

**For CI/CD freedom and professional setup: AWS ECS**

**Steps:**
1. Learn Docker (2-3 days)
2. Create Dockerfile for backend
3. Setup AWS account
4. Create ECR repository
5. Setup ECS cluster and service
6. Deploy frontend to S3
7. Create GitHub Actions workflow
8. Test deployment

**Total learning time**: 1-2 weeks
**Monthly cost**: ~$15-30
**Maintenance**: Minimal (auto-deploys on push)

---

## QUICK START COMMAND REFERENCE

### Local Testing:
```bash
# Backend
cd timetable-backend
uvicorn main:app --reload

# Frontend
cd timetable-frontend
npm run dev
```

### Docker Build:
```bash
docker build -t timetable-backend ./timetable-backend
docker run -p 8000:8000 timetable-backend
```

### Frontend Build:
```bash
cd timetable-frontend
npm run build
# Output in dist/ folder
```

---

**Note**: Start with manual deployment to understand the process, then automate with CI/CD. Don't skip the learning phase - it's crucial for troubleshooting later.

