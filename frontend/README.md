# Pulse Frontend

The frontend for Pulse is built using **React** with **Vite**. It provides three main interfaces: The Participant View (mobile-first), the Presentation View (desktop-first for beamers/screens), and the Admin Dashboard.

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy the `.env.example` file:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` points to your backend. In production (via Docker and Nginx), these can usually be omitted or set to `/` as Nginx handles the reverse proxy routing.

3. **Development Server:**
   ```bash
   npm run dev
   ```

4. **Production Build:**
   ```bash
   npm run build
   ```
   *The built files will be located in the `dist` directory.*

## 🎨 Styling
We use **Tailwind CSS v4** combined with custom CSS in `index.css` for a "Web3.0" aesthetic, featuring glassmorphism and subtle neon glows.

## 📊 Visualizations
- **Wordcloud:** Custom implementation using `d3-cloud` and HTML5 Canvas. We use an organic "spiral" layout.
- **Polls:** Animated bar charts implemented using `Recharts`.
