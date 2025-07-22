# Prairie Genomics Suite - Complete Setup Guide

A comprehensive genomics analysis platform that makes RNA-seq, single-cell, and variant analysis accessible to every researcher.

## 🚀 Quick Start (No Experience Required!)

This guide will help you run the Prairie Genomics Suite on your computer, even if you've never used backend or frontend development tools before.

## Prerequisites

You'll need to install these tools first. Don't worry - it's easier than it sounds!

### 1. Install Node.js (JavaScript Runtime)
- Go to [nodejs.org](https://nodejs.org)
- Download the **LTS version** (the green button)
- Run the installer and follow the prompts
- To verify it worked, open Terminal/Command Prompt and type: `node --version`

### 2. Install MongoDB (Database)
- Go to [mongodb.com/try/download/community](https://mongodb.com/try/download/community)
- Download MongoDB Community Server for your operating system
- Install it following the setup wizard
- Or use MongoDB Atlas (cloud version) - easier option below ⬇️

### 3. Install Git (Version Control)
- Go to [git-scm.com](https://git-scm.com)
- Download and install for your operating system

## 📁 Project Structure
```
prairie_genomics_suite/
├── backend/               # Server code
│   ├── services/         # Business logic
│   ├── resolvers/        # GraphQL API handlers
│   └── api/              # API schema
├── frontend/             # Web interface
│   ├── components/       # UI components
│   ├── hooks/           # React hooks
│   └── utils/           # Helper functions
└── docs/                # Documentation
```

## 🛠️ Installation Steps

### Step 1: Download the Project
Open Terminal/Command Prompt and run:
```bash
# Navigate to your desired folder
cd /path/to/where/you/want/the/project

# If you have the files locally, skip to Step 2
# Otherwise, you can copy the files from your current location
```

### Step 2: Install Dependencies

#### Install Backend Dependencies
```bash
# Navigate to the backend folder
cd prairie_genomics_suite/backend

# Install all required packages
npm install
```

#### Install Frontend Dependencies  
```bash
# Navigate to the frontend folder (from the backend folder)
cd ../frontend

# Install all required packages
npm install
```

### Step 3: Set Up Database

#### Option A: Use MongoDB Atlas (Easiest - Recommended)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/prairie-genomics`)
5. Use this in your `.env` file (Step 4)

#### Option B: Use Local MongoDB
1. Start MongoDB on your computer:
   - **Windows**: MongoDB should start automatically, or run `mongod` in Command Prompt
   - **Mac**: Run `brew services start mongodb-community` (if using Homebrew)
   - **Linux**: Run `sudo systemctl start mongod`

### Step 4: Configure Environment Variables

Create configuration files with your settings:

#### Backend Configuration
Create a file called `.env` in the `backend` folder:
```bash
# Navigate to backend folder
cd prairie_genomics_suite/backend

# Create the .env file (copy the content from below)
```

#### Frontend Configuration
Create a file called `.env.local` in the `frontend` folder:
```bash
# Navigate to frontend folder  
cd prairie_genomics_suite/frontend

# Create the .env.local file (copy the content from below)
```

## 🏃‍♂️ Running the System

You'll need to run both the backend (server) and frontend (website) at the same time.

### Terminal 1: Start the Backend
```bash
# Navigate to backend folder
cd prairie_genomics_suite/backend

# Start the server
npm start
```

You should see:
```
✓ Server running on http://localhost:4000
✓ GraphQL endpoint: http://localhost:4000/graphql
✓ Connected to MongoDB
```

### Terminal 2: Start the Frontend
```bash
# Navigate to frontend folder (open a NEW terminal window)
cd prairie_genomics_suite/frontend

# Start the website
npm start
```

You should see:
```
✓ Local:            http://localhost:3000
✓ On Your Network:  http://192.168.1.x:3000
```

## 🌐 Access the Application

1. Open your web browser
2. Go to `http://localhost:3000`
3. You should see the Prairie Genomics Suite interface!

## 🧪 Test the System

### 1. Create Your First Account
- Click "Sign Up" on the homepage
- Enter your email and create a password
- You're now logged in!

### 2. Create a Project
- Click "New Project"
- Give it a name like "My First Analysis"
- Add a description

### 3. Upload Test Data
- Click "Upload Dataset"
- Try uploading a CSV file with some sample data
- The system will automatically detect the file format

### 4. Run an Analysis
- Select your uploaded dataset
- Choose "RNA-seq Differential Expression" pipeline
- Click "Run Analysis"
- Watch the real-time progress!

## 🔧 Troubleshooting

### Problem: "Command not found: npm"
**Solution**: Node.js isn't installed properly. Restart your terminal and try `node --version`. If it doesn't work, reinstall Node.js.

### Problem: "Cannot connect to MongoDB"
**Solutions**:
- If using local MongoDB: Make sure MongoDB is running (`mongod` command)
- If using MongoDB Atlas: Check your connection string in the `.env` file
- Check firewall settings

### Problem: "Port 3000/4000 already in use"
**Solutions**:
- Stop other applications using these ports
- Or change the port in the configuration files

### Problem: Frontend won't load
**Solutions**:
- Make sure both backend AND frontend are running
- Check that backend is running on port 4000
- Clear your browser cache

### Problem: "Module not found" errors
**Solution**: Run `npm install` again in both backend and frontend folders

## 📊 Using the System

### For RNA-seq Analysis:
1. Upload your count matrix (CSV/TSV format)
2. Upload sample metadata 
3. Choose "RNA-seq Differential Expression"
4. Set your parameters (p-value threshold, fold change, etc.)
5. Run analysis and view results

### For Single-cell Analysis:
1. Upload your expression matrix
2. Choose "Single-cell RNA-seq Analysis"  
3. Adjust clustering parameters
4. View UMAP plots and cluster assignments

### For Variant Analysis:
1. Upload FASTQ or BAM files
2. Choose "Variant Calling Pipeline"
3. Select reference genome
4. Run analysis and view variant calls

## 🎯 Next Steps

Once you have the basic system running:

1. **Explore the Interface**: Try all the different analysis types
2. **Upload Real Data**: Use your actual genomics datasets
3. **Customize Pipelines**: Create your own analysis workflows
4. **Share Projects**: Invite collaborators to your projects
5. **Export Results**: Download publication-ready figures and tables

## 📚 Additional Resources

- **GraphQL Playground**: Visit `http://localhost:4000/graphql` to explore the API
- **Documentation**: Check the `/docs` folder for detailed guides
- **Sample Data**: We'll provide test datasets for each analysis type

## 🆘 Getting Help

If you run into issues:

1. **Check the Logs**: Look at the terminal windows for error messages
2. **Restart Everything**: Stop both terminals (Ctrl+C) and restart
3. **Check Prerequisites**: Make sure Node.js and MongoDB are properly installed
4. **Clear Cache**: Delete `node_modules` folders and run `npm install` again

## 🎉 Congratulations!

You now have a fully functional genomics analysis platform running on your computer! 

The system includes:
- ✅ User authentication and project management
- ✅ File upload and dataset management  
- ✅ Multiple analysis pipelines
- ✅ Real-time progress tracking
- ✅ Interactive visualizations
- ✅ Publication-ready exports

Happy analyzing! 🧬🔬