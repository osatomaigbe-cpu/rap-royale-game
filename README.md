# Rap Royale

A beginner-friendly, two-player match-3 beat battle. Create a room, share its code, and race for the highest score in a 90-second match.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open the Vite address on two devices. Create a room on one and join its code on the other.

The server owns rooms, boards, scores and the match timer. The landing page contains a clickable practice board. Production build is served by the Express server; active rooms are in memory and reset on restart.
