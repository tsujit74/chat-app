Here’s your README updated with the video link added at the top:

```markdown
# Chat App (Mobile)

🎥 [Demo Video](https://drive.google.com/file/d/1teN5kXjNsN06cQsrcEklF7gtalCH2Ylj/view)

A real-time chat application built with **React Native (mobile)** and **Node.js + Express (server)** with **MongoDB** for storage and **Socket.IO** for real-time messaging.

---

## Table of Contents

- [Features](#features)  
- [Project Structure](#project-structure)  
- [Technologies](#technologies)  
- [Setup](#setup)  
- [Environment Variables](#environment-variables)  
- [Running the Project](#running-the-project)  
- [Sample Users](#sample-users)  

---

## Features

- User registration and login (with auto-login after registration)  
- 1:1 real-time messaging with read/delivered receipts  
- Typing indicator  
- Online/offline status  
- Secure authentication with JWT  

---

## Project Structure

```

chat-app/
├─ mobiles/          # React Native mobile app
├─ server/           # Node.js + Express backend
└─ README.md

````

---

## Technologies

- **Frontend (Mobile):** React Native, Expo, AsyncStorage  
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO  
- **Authentication:** JWT, bcrypt  
- **Real-time Communication:** Socket.IO  

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/tsujit74/chat-app.git
cd chat-app
cd npm install
````

### 2. Server setup

```bash
cd server
npm install
```

Create `.env` in `/server`:

```
PORT=8000
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
```

Start server:

```bash
npm start
```

Server runs on `http://localhost:8000`

---

### 3. Mobile app setup (React Native)

```bash
cd ../mobiles
npm install
```

Create `.env` in `/mobiles`:

```
SERVER_BASE=http://ipadress:8000
```

Start app:

```bash
npx expo start
```

Open on your mobile device using **Expo Go**.

---

## Environment Variables

### Server (`/server/.env`)

| Variable    | Description                            |
| ----------- | -------------------------------------- |
| PORT        | Port the server runs on (default 8000) |
| MONGO\_URI  | MongoDB connection string              |
| JWT\_SECRET | Secret key for JWT authentication      |

---

## Notes

* Ensure the backend server is running before starting the mobile app.
* JWT token is stored in `AsyncStorage`.
* Socket.IO is used for real-time messaging; make sure the server URL is accessible from your phone.
* Network errors, session expiry, and server timeouts are handled globally in the app.

---

```

```
