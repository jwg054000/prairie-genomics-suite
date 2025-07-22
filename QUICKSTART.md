# 🚀 Prairie Genomics Suite - 5-Minute Quick Start

**Get up and running in 5 minutes - No prior experience needed!**

## What You'll Need
- A computer (Windows, Mac, or Linux)
- Internet connection
- 30 minutes of free time

## Step 1: Install Prerequisites (5 minutes)

### Install Node.js
1. Go to [nodejs.org](https://nodejs.org)
2. Click the **green "LTS" button** to download
3. Run the installer, click "Next" through everything
4. **Test it worked**: Open Terminal/Command Prompt, type `node --version`
   - You should see something like `v18.17.0`

### Set Up Database (Choose Option A - It's Easier!)

#### Option A: MongoDB Atlas (Cloud - Recommended) ⭐
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Click **"Try Free"**
3. Create account with your email
4. Choose **"FREE"** tier (M0 Sandbox)
5. Pick a region close to you
6. Create cluster (takes 2-3 minutes)
7. Click **"Connect"** → **"Connect your application"**
8. Copy the connection string (looks like: `mongodb+srv://username:password@...`)

#### Option B: Local MongoDB (Advanced Users Only)
- Download from [mongodb.com/try/download/community](https://mongodb.com/try/download/community)
- Install and start the service

## Step 2: Download and Setup (2 minutes)

### Get the Code
```bash
# Navigate to where you want the project
cd Desktop  # or wherever you want it

# Copy the prairie_genomics_suite folder here
# (You should already have this from your Google Drive)
```

### Install Backend Dependencies
```bash
# Open Terminal/Command Prompt
cd prairie_genomics_suite/backend

# Install all packages (this takes 1-2 minutes)
npm install
```

### Install Frontend Dependencies
```bash
# In the same terminal, go to frontend folder
cd ../frontend

# Install all packages (this takes 1-2 minutes)  
npm install
```

## Step 3: Configuration (1 minute)

### Backend Config
```bash
# Go to backend folder
cd ../backend

# Copy the example config file
cp .env.example .env

# Edit the .env file with your text editor and update:
MONGODB_URI=your-mongodb-connection-string-from-step-1
JWT_SECRET=your-random-secret-here-123abc
```

### Frontend Config
```bash
# Go to frontend folder  
cd ../frontend

# Copy the example config file
cp .env.local.example .env.local

# The default settings should work fine!
```

## Step 4: Start Everything (30 seconds)

### Start Backend (Terminal 1)
```bash
# In the backend folder
cd prairie_genomics_suite/backend
npm start
```
**Wait for**: `✓ Server running on http://localhost:4000`

### Start Frontend (Terminal 2 - New Window)
```bash
# Open a NEW terminal window
cd prairie_genomics_suite/frontend
npm start
```
**Wait for**: `✓ Local: http://localhost:3000`

## Step 5: Use the System! 🎉

1. **Open your browser** → Go to `http://localhost:3000`
2. **Create account** → Click "Sign Up" 
3. **Create project** → Click "New Project"
4. **Upload data** → Try the sample dataset
5. **Run analysis** → Choose "RNA-seq Analysis"
6. **View results** → See your volcano plots and statistics!

---

## 🆘 Something Not Working?

### "Command not found: npm"
- Node.js didn't install properly
- Restart your terminal and try `node --version`
- If still broken, reinstall Node.js

### "Cannot connect to MongoDB"
- Check your `.env` file has the right connection string
- If using Atlas, make sure your IP is whitelisted
- If using local MongoDB, make sure it's running

### "Port already in use"
- Another program is using ports 3000 or 4000
- Either close those programs or change the ports in the config

### Still stuck?
1. **Restart everything**: Close all terminals, reopen, and start again
2. **Check the logs**: Look for red error messages in your terminals
3. **Clear and reinstall**: Delete `node_modules` folders and run `npm install` again

---

## 🧬 Quick Test with Sample Data

Once everything is running:

1. **Go to**: http://localhost:3000
2. **Sign up** with any email/password
3. **Create project**: "My First Analysis"
4. **Upload test data**: Use any CSV file with numbers
5. **Run analysis**: Choose the "RNA-seq" pipeline
6. **Watch the magic**: Real-time progress bars and results!

---

## 🎯 What's Next?

- **Upload real data**: Try your actual genomics datasets
- **Explore pipelines**: Test single-cell, variant calling, etc.
- **Share projects**: Invite collaborators
- **Export results**: Download publication-ready figures
- **Customize settings**: Adjust statistical thresholds

**You now have a professional genomics analysis platform running on your computer!** 🚀

---

## 📊 Architecture Overview

```
Your Computer
├── Frontend (Port 3000) - The website you see
├── Backend (Port 4000) - The API server  
├── Database (MongoDB) - Where data is stored
└── File Storage - Where your datasets live
```

**Need help?** Check the full README.md for detailed troubleshooting and advanced features!