# Space Invaders (Space Vader)

A classic Space Invaders game with OAuth authentication via Wildcard.id. This is a static web application hosted on GitHub Pages.

🎮 **Play Now:** [https://kianbusby.github.io/space-invaders](https://kianbusby.github.io/space-invaders)

## Features

- **Two Game Modes:**
  - **Infinite Mode:** Endless waves of TIE fighters
  - **Campaign Mode:** 20 levels with boss battles

- **OAuth Authentication:** Secure login using Wildcard.id (client-side implementation)
- **Mobile Support:** Touch controls with swipe detection
- **Desktop Controls:** Keyboard controls (arrow keys, spacebar)
- **Sound Effects:** Blaster and TIE fighter weapon sounds
- **Static Hosting:** Runs entirely client-side, no server required

## How It Works

This application implements OAuth 2.0 authentication entirely on the client-side using:
- **PKCE (Proof Key for Code Exchange)** for secure authentication without a backend
- **LocalStorage** for session management
- **SessionStorage** for OAuth state management

## Setup Instructions

### For GitHub Pages Deployment

1. Fork or clone this repository
2. Enable GitHub Pages in repository settings
3. Set the source to the main branch
4. Your game will be available at `https://[username].github.io/[repo-name]`

### For Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd space-invaders
   ```

2. Serve the files using any static web server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Using PHP
   php -S localhost:8000

   # Using Node.js http-server
   npx http-server -p 8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

**Note:** For local development with OAuth, you'll need to configure a development redirect URI in your Wildcard.id OAuth application settings.

## OAuth Configuration

The application uses Wildcard.id OAuth for authentication:

- **Client ID:** `fb066c1f-d6e9-45ec-a875-9703e58c7376`
- **Authorization Endpoint:** `https://wildcard.id/oauth/authorize`
- **Token Endpoint:** `https://wildcard.id/oauth/token`
- **Callback URL:** `https://kianbusby.github.io/space-invaders/callback.html`
- **Scopes:** `openid profile`

### Authentication Flow

1. User visits the app and is redirected to login page
2. User clicks "Login with Wildcard.id"
3. Browser redirects to Wildcard.id authorization endpoint with PKCE parameters
4. After successful authentication, user is redirected to `callback.html`
5. Client-side JavaScript exchanges authorization code for tokens
6. User session is stored in localStorage
7. User is redirected to game menu

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
├── index.html         # Main menu page (protected)
├── game.html          # Game canvas page (protected)
├── login.html         # Login page
├── callback.html      # OAuth callback handler
├── auth.js            # Client-side OAuth library
├── menu.js            # Menu logic
├── game.js            # Game logic
├── style.css          # Styling
└── README.md          # Documentation
```

## Security Considerations

- **PKCE:** Uses PKCE flow to secure OAuth without a client secret
- **State Parameter:** Validates OAuth state to prevent CSRF attacks
- **Token Storage:** Access tokens are stored in localStorage (limited lifetime)
- **Client-Side Only:** No sensitive credentials are stored in the code

## Browser Compatibility

- Modern browsers with support for:
  - Web Crypto API (for PKCE)
  - LocalStorage and SessionStorage
  - Canvas API
  - HTML5 Audio

## Development

### File Structure

- **auth.js**: Handles all OAuth operations including:
  - PKCE code generation
  - Authorization URL construction
  - Token exchange
  - Session management

- **callback.html**: Receives OAuth callback and processes authentication

- **Protected Pages**: index.html and game.html require authentication

### Customization

To use this with your own OAuth provider:

1. Update the configuration in `auth.js`:
   ```javascript
   config: {
       clientId: 'your-client-id',
       authorizationEndpoint: 'https://your-provider/oauth/authorize',
       tokenEndpoint: 'https://your-provider/oauth/token',
       redirectUri: 'https://your-domain/callback.html',
       scope: 'openid profile',
   }
   ```

2. Update the redirect URI in your OAuth application settings

## License

ISC

## Credits

- OAuth integration powered by Wildcard.id
- Game inspired by the classic Space Invaders arcade game
