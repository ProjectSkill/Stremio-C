# 🎬 Stremio Lite - iPhone-Optimized Backend

A lightweight, mobile-first Stremio backend built for seamless iPhone streaming with one-tap copy-and-play functionality.

## ✨ Features

- **📱 iPhone-First Design**: Optimized touch interface, no zoom, smooth animations
- **🔗 Headless Navigation**: Paste IMDb ID directly in URL bar (`?id=tt0111161`)
- **📋 One-Tap Copy**: Click any stream to copy URL to clipboard
- **🎯 Auto Player Picker**: Automatically shows player options after copy
- **🍔 Hamburger Menu**: Set default player and preferences
- **⚡ Lightning Fast**: Minimal dependencies, optimized for Render
- **🔒 HTTPS Ready**: Works out-of-the-box on Render with automatic SSL

## 🎮 Supported Players

- **Infuse** (recommended for iPhone)
- **nPlayer**
- **OutPlayer**
- **VLC**
- **Browser** (fallback)

## 📁 File Structure

```
stremio-lite/
├── server.js          # Complete backend + frontend (single file)
├── package.json       # Minimal dependencies
├── Dockerfile         # Optimized Docker build
├── .dockerignore      # Build optimization
└── README.md          # This file
```

## 🚀 Local Development

### Prerequisites

- Node.js 18+ installed
- Docker (optional, for testing container)

### Setup Steps

1. **Clone/Create Project**

```bash
mkdir stremio-lite
cd stremio-lite
```

1. **Create Files**
- Copy `server.js` content
- Copy `package.json` content
- Copy `Dockerfile` content
- Copy `.dockerignore` content
1. **Install Dependencies**

```bash
npm install
```

1. **Run Locally**

```bash
npm start
```

1. **Access Application**
- Open browser: `http://localhost:3000`
- Test with IMDb ID: `http://localhost:3000?id=tt0111161`

### Test Docker Build Locally

```bash
# Build image
docker build -t stremio-lite .

# Run container
docker run -p 3000:3000 stremio-lite

# Test
curl http://localhost:3000/health
```

## 🌐 Render Deployment

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stremio-lite.git
git push -u origin main
```

1. **Deploy on Render**
- Go to [render.com](https://render.com)
- Click “New +” → “Web Service”
- Connect your GitHub repository
- Configure:
  - **Name**: `stremio-lite` (or your choice)
  - **Environment**: `Docker`
  - **Region**: Choose closest to your location
  - **Plan**: Free (or paid for better performance)
- Click “Create Web Service”
1. **Wait for Deployment**
- Render will build and deploy automatically
- Takes 2-5 minutes for first deploy
- You’ll get a URL like: `https://stremio-lite.onrender.com`
1. **Test Deployment**
- Visit: `https://your-app.onrender.com`
- Test: `https://your-app.onrender.com?id=tt0111161`

### Method 2: Manual Docker Deploy

If you prefer not to use GitHub:

1. **Connect Docker Registry**
- Render Dashboard → “New +” → “Web Service”
- Choose “Deploy an existing image from a registry”
- Push your image to Docker Hub first
1. **Configure**
- Image URL: Your Docker Hub image
- Port: `3000`

## 📱 iPhone Usage Guide

### Method 1: Direct Browser (Easiest)

1. **Open Safari** on iPhone
1. **Type URL**: `https://your-app.onrender.com?id=tt0111161`
1. **Streams auto-load** when page opens
1. **Tap any stream** → URL copied + player picker appears
1. **Choose player** → Stream opens automatically

### Method 2: iOS Shortcuts (Advanced)

Create a shortcut for quick access:

1. **Open Shortcuts App** → “+” New Shortcut
1. **Add Actions**:
- “Ask for Input” → Prompt: “Paste IMDb ID”
- “Text” → `https://your-app.onrender.com?id=`
- “Combine Text” → Combine [URL] + [Input]
- “Open URLs” → Open [Combined Text]
1. **Name it**: “Stremio Quick Search”
1. **Add to Home Screen** for one-tap access

### Method 3: URL Bookmarklet

1. **Bookmark this in Safari**:

```javascript
javascript:window.location='https://your-app.onrender.com?id='+prompt('IMDb ID:')
```

1. **Tap bookmark** → Enter ID → Auto-navigate

## 🎯 Usage Examples

### Example 1: The Shawshank Redemption

```
https://your-app.onrender.com?id=tt0111161
```

### Example 2: Inception

```
https://your-app.onrender.com?id=tt1375666
```

### Example 3: The Dark Knight

```
https://your-app.onrender.com?id=tt0468569
```

## 🔧 Configuration

### Change Stream Sources

Edit `STREAM_SOURCES` array in `server.js`:

```javascript
const STREAM_SOURCES = [
  'https://torrentio.strem.fun',
  'https://v3-cinemeta.strem.io',
  // Add more Stremio addons here
];
```

### Adjust Stream Limit

Change line 112 in `server.js`:

```javascript
.slice(0, 50); // Change 50 to your preferred limit
```

### Customize Players

Add/remove players in the HTML section (search for `player-option` class).

## 🐛 Troubleshooting

### Issue: Streams Not Loading

**Solution 1**: Check Render logs

```bash
# In Render dashboard → Your service → Logs
```

**Solution 2**: Test stream sources manually

```bash
curl https://torrentio.strem.fun/stream/movie/tt0111161.json
```

**Solution 3**: Verify IMDb ID format

- Must start with `tt`
- Example: `tt0111161` ✅
- Example: `0111161` ❌

### Issue: Player Not Opening

**Cause**: Player app not installed on iPhone

**Solution**:

1. Install player app from App Store
1. Try “Browser” option as fallback
1. Check if URL was copied (look for “Copied!” indicator)

### Issue: HTTPS Certificate Error

**Cause**: Render is still provisioning SSL

**Solution**: Wait 5-10 minutes after first deploy

### Issue: Slow Performance on Free Tier

**Render Free Tier**: Spins down after 15 minutes of inactivity

**Solutions**:

1. Upgrade to paid tier ($7/month)
1. Use a ping service to keep it alive
1. Accept 30-second cold start on first request

## 📊 Performance Optimization

### Current Optimizations

- ✅ Alpine Linux base (5MB vs 900MB)
- ✅ Single-file architecture (no file I/O overhead)
- ✅ Inline HTML (no template engine)
- ✅ Minimal dependencies (2 packages only)
- ✅ Multi-stage Docker build
- ✅ Non-root container user
- ✅ Health check endpoint

### Further Optimizations (Optional)

1. **Enable caching**: Add Redis for stream caching
1. **CDN**: Use Cloudflare for static assets
1. **Compression**: Enable gzip (already in Express)

## 🔐 Security Notes

- Container runs as non-root user
- No sensitive data stored
- HTTPS enforced on Render
- No authentication (public streams only)

## 📝 Development Notes

### Why Single File?

- **Faster cold starts**: No file system overhead
- **Easier debugging**: Everything in one place
- **Simpler deployment**: No build step needed
- **Render-optimized**: Minimal container size

### Why Docker?

- **Consistency**: Same environment locally and in production
- **Render compatibility**: Native Docker support
- **Isolation**: Clean dependency management
- **Scalability**: Easy to replicate/scale

### Why These Players?

- **Infuse**: Best iPhone player, supports all formats
- **nPlayer**: Popular alternative with advanced features
- **OutPlayer**: Lightweight, fast playback
- **VLC**: Universal fallback
- **Browser**: Works everywhere

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

## 📄 License

MIT License - Use freely for personal projects

## 🆘 Support

- **GitHub Issues**: [Your repo]/issues
- **Render Docs**: https://render.com/docs
- **Stremio Addons**: https://stremio-addons.com

## 🎉 Credits

Built with:

- Express.js
- Node-fetch
- Love for clean, minimal code

-----

**Made with ❤️ for iPhone streaming enthusiasts**