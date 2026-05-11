# Pulse Backend

The Pulse backend is a Node.js API that powers the live interactions and manages the database using Prisma. It handles REST requests for the admin dashboard and WebSockets (`socket.io`) for real-time live data updates.

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   By default, Prisma is configured to use SQLite.
   ```bash
   npx prisma db push
   ```
   *Note: `db push` creates the database file (`dev.db`) based on the `schema.prisma`. It is ideal for local development and ephemeral SQLite databases.*

3. **Environment Variables:**
   Copy the example file and configure it:
   ```bash
   cp .env.example .env
   ```

4. **Start the Server:**
   ```bash
   npm run dev
   ```

## 🔐 Security
- **Sanitization:** All incoming texts (questions, poll options, wordcloud entries) are sanitized on the server to prevent XSS.
- **Join Codes:** Cryptographically secure 6-character codes are generated using the native `crypto` module.

## 💾 Database
The Prisma schema (`prisma/schema.prisma`) is configured for `sqlite`. If you wish to migrate to PostgreSQL for high-availability setups, simply change the `provider` in the schema and run `npx prisma migrate dev`.
