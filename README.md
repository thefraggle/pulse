# Pulse - Feel the Pulse

Pulse is a 100% free, lightweight, and self-hosted web application for running interactive live sessions like polls, Q&A, rankings, ratings, and wordclouds. It's built for speed, real-time interactivity, and strict GDPR compliance without any user limits or hidden costs.

## Features

* **Free & Unlimited:** No subscription fees, no limits on participants or sessions.
* **Privacy First & GDPR Compliant:** Self-hosted on your own infrastructure. No third-party tracking, no hidden data collection.
* **Real-Time Synchronization:** Uses Socket.io to push results instantly to all connected screens.
* **Multiple Session Types:**
  * Wordcloud (Dynamic sizing based on frequency)
  * Poll (Single Choice)
  * Ranking (Prioritization)
  * Rating (5-Star Scale)
  * Q&A (Audience questions with upvotes)
  * Open Ended (Brainstorming)
* **Session Timer:** Hosts can set a live countdown that automatically locks the session when time is up.
* **Multi-Tenant Architecture:** Secure dashboard for multiple users/teachers to manage their own independent sessions.
* **Glassmorphism UI:** Modern, slick, and highly responsive UI built with Tailwind CSS and Framer Motion.

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Recharts
* **Backend:** Node.js, Express, Socket.io, Prisma (SQLite), JWT Authentication
* **Infrastructure:** Docker & Docker Compose

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/thefraggle/pulse.git
cd pulse
```

### 2. Configure Environment Variables

You can customize the installation by providing environment variables. For a quick start, Pulse will use safe defaults, but for production, you must set your own secrets!

```bash
# Backend variables
cp backend/.env.example backend/.env

# Frontend variables
cp frontend/.env.example frontend/.env
```

Edit both `.env` files to set your own `ADMIN_PASSWORD` and `JWT_SECRET`.

### 3. Run with Docker Compose

```bash
docker compose up -d --build
```

*Note: The first time the container starts, Prisma will automatically push the SQLite database schema.*

### 4. Access the App

Open your browser and navigate to `http://localhost` (or your server's IP/Domain).

* **Public View:** `http://localhost/`
* **Admin Login:** `http://localhost/login` (Login using `admin` and your configured `ADMIN_PASSWORD`).

## Legal & Privacy Notice Customization (White-Labeling)

If you want to host Pulse publicly, you might want to link your own Legal Notice (Impressum) and Privacy Policy. Pulse allows you to inject these links dynamically without altering the code.

1. Create a `public/impressum.html` inside the `frontend/` directory (These files are ignored by git so your personal data stays private).
2. Set `VITE_IMPRESSUM_URL=/impressum.html` in your `frontend/.env`.
3. Rebuild your docker container. The links will now appear in the footer.

## License

[MIT License](LICENSE) - Copyright (c) 2026 Daniel Notthoff
