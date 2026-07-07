# Presence

Presence is a real-time, premium web application built to connect two paired users. It features custom presence status tracking, reaction pings, synced music playlist playback, synced YouTube watching, and Google OAuth sign-in.

---

## Media Storage

This project uses **Cloudinary** for persistent media storage (both songs and videos) instead of local disk storage. This prevents file loss from Render's ephemeral free-tier disk.
- You will need a free **Cloudinary** account to obtain your API configuration credentials.

---

## Environment Configuration

### Backend Config (`server/.env`)

Create a `.env` file inside the `server/` directory and configure the following variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/presence
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CLIENT_URL=http://localhost:5175

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend Config (`client/.env`)

Create a `.env` file inside the `client/` directory and configure the following variables:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Getting Started

### 1. Install Dependencies
Run in both `client/` and `server/` directories:
```bash
npm install
```

### 2. Run Locally
Start the backend server in `server/`:
```bash
npm run dev
```

Start the frontend client in `client/`:
```bash
npm run dev
```
