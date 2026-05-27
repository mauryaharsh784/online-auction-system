# 🔨 Online Auction System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-online--auction--system--lemon.vercel.app-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://online-auction-system-lemon.vercel.app)

![Status](https://img.shields.io/badge/Status-Active-22c55e?style=flat-square)
![License](https://img.shields.io/github/license/mauryaharsh784/online-auction-system?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-3b82f6?style=flat-square)
![Stars](https://img.shields.io/github/stars/mauryaharsh784/online-auction-system?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/mauryaharsh784/online-auction-system?style=flat-square)

[Report Bug](https://github.com/mauryaharsh784/online-auction-system/issues) · [Request Feature](https://github.com/mauryaharsh784/online-auction-system)

A full-stack real-time online auction platform where users can create auctions, place bids, and win items — all in real time using WebSockets.

**Live Demo:** [online-auction-system-lemon.vercel.app](https://online-auction-system-lemon.vercel.app)  
**Backend API:** [online-auction-system-obeo.onrender.com](https://online-auction-system-obeo.onrender.com)

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure login/signup with httpOnly cookies
- ⚡ **Real-time Bidding** — Live bid updates via Socket.io
- 🖼️ **Image Uploads** — Direct Cloudinary integration with signed uploads
- 💳 **Payment Integration** — Razorpay for auction payments
- 📧 **Email Notifications** — Transactional emails via Resend
- 🤖 **AI Chatbot** — Groq-powered assistant
- 🛡️ **Admin Dashboard** — Manage users and auctions
- 📱 **Responsive Design** — Works on all devices

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React + Vite | UI Framework |
| Socket.io Client | Real-time communication |
| Razorpay SDK | Payment processing |
| Tailwind CSS | Styling |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express 5 | REST API server |
| Socket.io | Real-time bidding |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| Cloudinary | Image storage |
| Resend | Email service |
| Groq SDK | AI chatbot |

---

## 📁 Project Structure
online-auction-system/
├── client/                  # React frontend (Vite)
│   ├── src/
│   └── .env
│
└── server/                  # Node.js backend
├── server.js            # Entry point
├── app.js               # Express app
├── config/
│   ├── db.config.js     # MongoDB connection
│   └── env.config.js    # Environment variables
├── controllers/         # Business logic
├── models/              # Mongoose schemas
├── routes/              # API routes
├── socket/              # Socket.io handlers
├── middleware/          # Auth middleware
├── services/            # Cloudinary service
└── utils/               # JWT, cookies, geo utils
---

## ⚙️ Environment Variables

### Backend (`server/.env`)

```env
MONGO_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/auctiondb
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
ORIGIN=https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=3000

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RESEND_API_KEY=re_xxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

### Frontend (`client/.env`)

```env
VITE_API=https://your-backend.onrender.com/api
VITE_AUCTION_API=https://your-backend.onrender.com/api/auction
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account
- Cloudinary account
- Resend account

### Installation

```bash
# Clone the repository
git clone https://github.com/mauryaharsh784/online-auction-system.git
cd online-auction-system
```

#### Backend Setup

```bash
cd server
npm install
cp .env.example .env   # Fill in your env variables
npm run dev            # Development (nodemon)
npm start              # Production
```

#### Frontend Setup

```bash
cd client
npm install
cp .env.example .env   # Fill in your env variables
npm run dev            # Development
npm run build          # Production build
```

---

## 📡 API Reference

Base URL: `https://online-auction-system-obeo.onrender.com`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |

### Auctions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auction` | List all active auctions |
| POST | `/auction` | Create new auction |
| GET | `/auction/:id` | Get auction details |
| POST | `/auction/:id/bid` | Place a bid |
| GET | `/auction/stats` | Dashboard statistics |
| GET | `/auction/myauction` | User's auctions |
| GET | `/auction/mybids` | User's bids |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user` | Get profile |
| PATCH | `/user` | Change password |
| GET | `/user/logins` | Login history |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/upload/signature` | Get Cloudinary signed URL |

---

## ⚡ Real-time Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `auction:join` | Client → Server | Join auction room |
| `auction:leave` | Client → Server | Leave auction room |
| `auction:bid` | Client → Server | Place a bid |
| `auction:bidPlaced` | Server → Room | Bid placed broadcast |
| `auction:userJoined` | Server → Room | User joined broadcast |
| `auction:userLeft` | Server → Room | User left broadcast |
| `auction:error` | Server → Client | Error message |

---

## 🌐 Deployment

### Frontend → Vercel

**Vercel Settings:**
- Framework: Vite
- Root Directory: `client`
- Build Command: `vite build`
- Output Directory: `dist`

### Backend → Render

**Render Settings:**
- Environment: Node
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node server.js`

> ⚠️ **Note:** Socket.io does NOT work on Vercel serverless. Use Render for the backend.

---

## 🔒 Security Features

- JWT stored in httpOnly cookies (not accessible via JS)
- bcrypt password hashing (10 rounds)
- CORS restricted to frontend origin
- HTML escaping in emails (XSS prevention)
- Atomic bid operations (race condition prevention)
- Environment variable validation at startup

---

## 👨‍💻 Author

**Harsh Vardhan Maurya**  
GitHub: [@mauryaharsh784](https://github.com/mauryaharsh784)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.