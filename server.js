require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store OAuth client globally
let client;

// Initialize OpenID Connect client
async function initializeOAuth() {
  try {
    const wildcardIssuer = await Issuer.discover('https://wildcard.id');
    console.log('Discovered issuer:', wildcardIssuer.issuer);

    client = new wildcardIssuer.Client({
      client_id: process.env.CLIENT_ID,
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ['code'],
    });

    console.log('OAuth client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OAuth:', error);
    process.exit(1);
  }
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Route: Home page (redirects to menu if authenticated)
app.get('/', (req, res) => {
  if (req.session.user) {
    res.sendFile(__dirname + '/index.html');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

// Route: Login page
app.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/');
  } else {
    res.sendFile(__dirname + '/login.html');
  }
});

// Route: Initiate OAuth login
app.get('/auth/login', (req, res) => {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  // Store code_verifier in session for later use
  req.session.code_verifier = code_verifier;

  const authorizationUrl = client.authorizationUrl({
    scope: 'openid profile',
    code_challenge,
    code_challenge_method: 'S256',
  });

  res.redirect(authorizationUrl);
});

// Route: OAuth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const code_verifier = req.session.code_verifier;

    if (!code_verifier) {
      return res.status(400).send('Missing code verifier. Please try logging in again.');
    }

    // Exchange authorization code for tokens
    const tokenSet = await client.callback(process.env.REDIRECT_URI, params, {
      code_verifier
    });

    // Get user info from ID token
    const claims = tokenSet.claims();

    // Store user in session
    req.session.user = {
      sub: claims.sub,
      name: claims.name || 'Player',
    };

    // Clean up code_verifier
    delete req.session.code_verifier;

    console.log('User logged in:', req.session.user);

    // Redirect to game menu
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed. Please try again.');
  }
});

// Route: Logout
app.get('/auth/logout', (req, res) => {
  const user = req.session.user;

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }

    // Redirect to wildcard.id logout endpoint
    const logoutUrl = `https://wildcard.id/oauth/logout?redirect_uri=${encodeURIComponent(process.env.BASE_URL || 'http://localhost:3000')}`;
    res.redirect(logoutUrl);
  });
});

// API endpoint to get current user info
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Serve static files (CSS, JS, images, audio)
app.use(express.static(__dirname, {
  extensions: ['html']
}));

// Protected route for game pages
app.get('/game.html', requireAuth, (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

app.get('/index.html', requireAuth, (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Start server after OAuth initialization
initializeOAuth().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
