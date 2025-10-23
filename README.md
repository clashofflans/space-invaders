# Space Invaders (Space Vader)

A classic Space Invaders game with OAuth authentication via Wildcard.id.

## Features

- **Two Game Modes:**
  - Infinite Mode: Endless waves of TIE fighters
  - Campaign Mode: 20 levels with boss battles

- **OAuth Authentication:** Secure login using Wildcard.id
- **Mobile Support:** Touch controls with swipe detection
- **Desktop Controls:** Keyboard controls (arrow keys, spacebar)
- **Sound Effects:** Blaster and TIE fighter weapon sounds

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd space-invaders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` if needed:
     ```
     CLIENT_ID=your-wildcard-client-id
     REDIRECT_URI=http://localhost:3000/auth/callback
     BASE_URL=http://localhost:3000
     SESSION_SECRET=your-random-secret-key
     PORT=3000
     ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

## OAuth Configuration

The application uses Wildcard.id OAuth for authentication:

- **Authorization Endpoint:** `https://wildcard.id/oauth/authorize`
- **Token Endpoint:** `https://wildcard.id/oauth/token`
- **Callback URL:** `/auth/callback`
- **Scopes:** `openid profile`

## Game Controls

### Desktop
- **Arrow Keys:** Move left/right
- **Spacebar:** Shoot

### Mobile
- **Touch:** Tap to move and shoot
- **Swipe:** Swipe left/right to move

## Project Structure

```
space-invaders/
├── server.js          # Express server with OAuth implementation
├── index.html         # Main menu page
├── game.html          # Game canvas page
├── login.html         # Login page
├── menu.js            # Menu logic
├── game.js            # Game logic
├── style.css          # Styling
├── package.json       # Node.js dependencies
├── .env               # Environment variables (not committed)
└── .env.example       # Example environment configuration
```

## Authentication Flow

1. User visits the app and is redirected to login page
2. User clicks "Login with Wildcard.id"
3. User is redirected to Wildcard.id authorization endpoint
4. After successful authentication, user is redirected back to `/auth/callback`
5. Server exchanges authorization code for tokens
6. User session is created and user is redirected to game menu
7. User can play the game and logout when done

## API Endpoints

- `GET /` - Home page (redirects to login if not authenticated)
- `GET /login` - Login page
- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/logout` - Logout and destroy session
- `GET /api/user` - Get current user info (JSON)
- `GET /game.html` - Game page (protected)
- `GET /index.html` - Menu page (protected)

## License

ISC
