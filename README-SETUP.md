
# Multi-Agent Collaboration System Setup Instructions

This document provides detailed instructions for setting up both the frontend and backend components of the Multi-Agent Collaboration System.

## Prerequisites

- Node.js 16+ (for frontend)
- Python 3.10+ (for backend)
- OpenAI API key
- Git (optional, for cloning the repository)

## Backend Setup

### Step 1: Python Environment Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

### Step 2: Configure Environment Variables

1. Create a `.env` file in the backend directory:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Step 3: Run the Backend Server

1. Start the FastAPI server:
   ```
   uvicorn main:app --reload
   ```

2. The backend server should now be running at `http://localhost:8000`

## Frontend Setup

### Step 1: Install Frontend Dependencies

1. Navigate to the root directory of the project (or open a new terminal window)

2. Install the required Node.js dependencies:
   ```
   npm install
   ```

### Step 2: Start the Frontend Development Server

1. Start the development server:
   ```
   npm run dev
   ```

2. The frontend should now be running at `http://localhost:3000`

## Verifying the Setup

1. Open your browser and navigate to `http://localhost:3000`
2. You should see the Multi-Agent Collaboration System interface
3. Verify the backend connection by checking if the status indicator shows "Connected" in the Request Form
4. Submit a test request to ensure the system is working properly

## Troubleshooting

### Backend Issues

- **"Module not found" errors**: Make sure you've activated the virtual environment and installed all requirements.
- **API key errors**: Verify that your OpenAI API key is correctly set in the `.env` file.
- **Port already in use**: If port 8000 is already in use, you can specify a different port:
  ```
  uvicorn main:app --reload --port 8001
  ```

### Frontend Issues

- **Connection errors**: Ensure the backend server is running and accessible.
- **Build errors**: Check for any syntax errors in the frontend code.
- **CORS issues**: If you're experiencing CORS issues, check the CORS settings in `main.py`.

## Running in Production

For a production deployment:

1. Build the frontend:
   ```
   npm run build
   ```

2. Set up a production server (e.g., Nginx) to serve the static files
3. Run the backend with a production ASGI server:
   ```
   gunicorn -k uvicorn.workers.UvicornWorker main:app
   ```

## Free Hosting Options

For demo purposes, you can use:

- **Backend**: Render.com, Railway.app, Fly.io, or PythonAnywhere (all offer free tiers)
- **Frontend**: Vercel, Netlify, or GitHub Pages (all free for static sites)

Remember to configure environment variables on your hosting platform.
