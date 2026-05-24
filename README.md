# LOOKINGFOR

<div align="center">

<img src="https://raw.githubusercontent.com/Spiderykiller/LookingFor/blob/main/public/logo.png" width="120" />

# LookingFor

### Real-Time Intent Based Social Discovery Platform

Discover people, opportunities, communities, collaborations, and experiences through live human intent.

<br/>

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Auth-Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel" />

<br/>
<br/>

[Live Demo](https://looking-forr.vercel.app) •
[Report Bug](https://github.com/Spiderykiller/LookingFor/issues) •
[Request Feature](https://github.com/Spiderykiller/LookingFor/issues)

</div>

---

# ✨ Overview

LookingFor is a modern intent-driven social platform built for real-time human connection.

Instead of endlessly scrolling passive content, users express what they are actively looking for:

* collaborators
* opportunities
* communities
* developers
* founders
* events
* teammates
* creators
* conversations

The platform dynamically surfaces matching people and communities through live intent discovery.

---

# 🖼 Platform Preview

## Desktop Experience

<img width="100%" src="https://raw.githubusercontent.com/Spiderykiller/LookingFor/blob/main/assets/css/feed-preview.png" />

---

## Mobile Community View

<div align="center">
<img width="320" src="https://raw.githubusercontent.com/Spiderykiller/LookingFor/blob/main/assets/css/community-mobile.png" />
</div>

---

## Profile Experience

<div align="center">
<img width="320" src="https://raw.githubusercontent.com/Spiderykiller/LookingFor/blob/main/assets/css/profile-preview.png" />
</div>

---

# 🚀 Core Features

<table>
<tr>
<td width="50%">

## 🔐 Authentication

* Email & Password Login
* Google OAuth
* Secure Sessions
* Protected Routes
* JWT Authentication

</td>
<td width="50%">

## 🌍 Intent Discovery

* Real-time feed
* Dynamic categories
* Community matching
* Location-aware discovery
* Expiring intent system

</td>
</tr>

<tr>
<td width="50%">

## 💬 Social Interaction

* Response system
* Engagement counters
* Community participation
* Intent networking

</td>
<td width="50%">

## 🎨 Modern UI/UX

* Premium dark theme
* Mobile-first design
* Responsive layouts
* Smooth interactions
* SaaS-level aesthetics

</td>
</tr>
</table>

---

# 🧠 Philosophy

Traditional social media optimizes for attention.

LookingFor optimizes for **intention**.

This creates:

* more meaningful interactions
* faster discovery
* real-world opportunities
* higher quality networking
* purposeful communities

---

# ⚡ Tech Stack

<div align="center">

| Frontend   | Backend        | Database   | Auth             | Deployment |
| ---------- | -------------- | ---------- | ---------------- | ---------- |
| Next.js 16 | NextAuth.js    | PostgreSQL | Google OAuth     | Vercel     |
| React      | API Routes     | Neon       | Credentials Auth | Edge Ready |
| TypeScript | Server Actions | SQL        | JWT Sessions     | CI/CD      |

</div>

---

# 📂 Architecture

```bash
LookingFor/
│
├── app/
│   ├── api/
│   ├── login/
│   ├── signup/
│   ├── feed/
│   ├── profile/
│   └── community/
│
├── components/
│   ├── Feed.tsx
│   ├── IntentCard.tsx
│   ├── Navbar.tsx
│   └── BottomNav.tsx
│
├── styles/
│   ├── globals.css
│   └── themes/
│
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   └── utils.ts
│
└── public/
```

---

# 🔥 Key Platform Concepts

## Intent-Based Networking

Users post active intentions such as:

```txt
Looking for a React developer
Need an AI co-founder
Searching for study partners
Anyone attending Amsterdam Tech Week?
Looking for designers for a startup
```

Unlike traditional feeds, LookingFor focuses on active real-world discovery.

---

# 📱 UI Design Language

LookingFor combines:

* minimalist structure
* premium dark interfaces
* high-contrast orange accents
* futuristic social layouts
* smooth mobile navigation
* modern SaaS aesthetics

Inspired by:

* Linear
* Discord
* Threads
* Arc Browser
* Notion
* X (Twitter)

---

# 🛠 Local Development

## Clone Repository

```bash
git clone https://github.com/Spiderykiller/LookingFor.git
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Create `.env.local`

```env
DATABASE_URL=

AUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXTAUTH_URL=http://localhost:3000
```

---

## Run Development Server

```bash
npm run dev
```

Visit:

```bash
http://localhost:3000
```

---

# 🗄 Database Schema

## Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  provider TEXT DEFAULT 'local',
  provider_account_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Intents Table

```sql
CREATE TABLE intents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  statement TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  mode TEXT DEFAULT 'public',
  response_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 🌎 Future Roadmap

* AI intent recommendations
* Real-time messaging
* Push notifications
* Match scoring algorithm
* Community spaces
* Voice/video interaction
* Global intent map
* Mobile applications
* Smart local networking

---

# 📈 Vision

LookingFor is not just another social platform.

It is an infrastructure layer for real-time human opportunity discovery.

The goal is to create a digital environment where:

* opportunities appear instantly
* communities form naturally
* collaboration becomes frictionless
* intent becomes searchable

---

# 🤝 Contributing

Contributions are welcome.

```bash
Fork → Build → Improve → Pull Request
```

---

# 📄 License

MIT License

---

# 👑 Creator

Built by Ghost.

### "People are already looking for each other.

LookingFor simply helps them connect."

---

<div align="center">

### ⭐ Star the repository if you believe in the vision.

</div>
