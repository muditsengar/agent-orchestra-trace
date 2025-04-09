
# AutoGen Multi-Agent Backend

This is the backend server for the Multi-Agent Collaboration System powered by Microsoft AutoGen.

## Prerequisites

- Python 3.10 or newer
- OpenAI API key

## Installation

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - MacOS/Linux: `source venv/bin/activate`
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Copy `.env.example` to `.env` and add your OpenAI API key:
   ```
   cp .env.example .env
   ```
6. Edit the `.env` file and add your OpenAI API key

## Running the server

```
uvicorn main:app --reload
```

The server will be available at http://localhost:8000.

## API Documentation

Once the server is running, you can access the API documentation at http://localhost:8000/docs.

## WebSocket Connection

The server provides a WebSocket endpoint at `ws://localhost:8000/ws` for real-time updates.

## Connecting to the Frontend

The frontend should connect to this backend server via both RESTful API calls and WebSocket connections.
