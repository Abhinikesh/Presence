# Presence - Full-Stack Template

A clean, minimal full-stack starter template with a React (Vite) client and a Node.js + Express + Socket.IO + MongoDB backend.

## Project Structure

- `/client` - React frontend built with Vite, React Router, and Socket.IO client.
- `/server` - Node.js Express server with Mongoose and Socket.IO.

## Prerequisites

- **Node.js** (v16+)
- **npm** (v7+)
- **MongoDB** (Ensure MongoDB is running locally on port 27017, or prepare a remote connection URI)

## Getting Started

### 1. Setup the Backend Server

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Create a `.env` file (one has been pre-configured for you):
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/presence
   ```

3. Start the development server (runs nodemon):
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

### 2. Setup the Frontend Client

1. Navigate to the client folder:
   ```bash
   cd client
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend client will run on `http://localhost:5173` (or the next available port shown in your terminal).

## Key Endpoints & Connections

- **Backend Health Check:** `GET http://localhost:5000/api/health` returns `{ "status": "ok" }`.
- **Socket.IO Gateway:** Connects at `http://localhost:5000` from the client.
# Presence
