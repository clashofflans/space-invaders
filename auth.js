/**
 * Client-side OAuth handler for Wildcard.id
 * Works with static hosting (GitHub Pages)
 */

const WildcardAuth = {
    // Configuration
    config: {
        clientId: 'fb066c1f-d6e9-45ec-a875-9703e58c7376',
        authorizationEndpoint: 'https://wildcard.id/oauth/authorize',
        tokenEndpoint: 'https://wildcard.id/oauth/token',
        redirectUri: 'https://kianbusby.github.io/space-invaders/callback.html',
        scope: 'openid profile',
    },

    // Generate random string for PKCE
    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += charset[randomValues[i] % charset.length];
        }
        return result;
    },

    // Generate code challenge for PKCE
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    },

    // Initiate OAuth login flow
    async login() {
        try {
            // Generate PKCE parameters
            const codeVerifier = this.generateRandomString(128);
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            const state = this.generateRandomString(32);

            // Store for later verification
            sessionStorage.setItem('oauth_code_verifier', codeVerifier);
            sessionStorage.setItem('oauth_state', state);

            // Build authorization URL
            const params = new URLSearchParams({
                client_id: this.config.clientId,
                redirect_uri: this.config.redirectUri,
                response_type: 'code',
                scope: this.config.scope,
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            });

            const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;

            // Redirect to authorization endpoint
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating login:', error);
            throw error;
        }
    },

    // Handle OAuth callback
    async handleCallback() {
        try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');

            // Check for errors
            if (error) {
                throw new Error(`OAuth error: ${error}`);
            }

            // Verify state
            const storedState = sessionStorage.getItem('oauth_state');
            if (!state || state !== storedState) {
                throw new Error('Invalid state parameter');
            }

            // Get code verifier
            const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
            if (!codeVerifier) {
                throw new Error('Missing code verifier');
            }

            // Exchange code for tokens
            const tokenResponse = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.config.redirectUri,
                    client_id: this.config.clientId,
                    code_verifier: codeVerifier
                })
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${errorData}`);
            }

            const tokens = await tokenResponse.json();

            // Parse ID token (JWT)
            const idToken = tokens.id_token;
            const claims = this.parseJWT(idToken);

            // Store user session
            const user = {
                sub: claims.sub,
                name: claims.name || 'Player',
                idToken: idToken,
                accessToken: tokens.access_token,
                expiresAt: Date.now() + (tokens.expires_in * 1000)
            };

            localStorage.setItem('wildcard_user', JSON.stringify(user));

            // Clean up temporary storage
            sessionStorage.removeItem('oauth_code_verifier');
            sessionStorage.removeItem('oauth_state');

            return user;
        } catch (error) {
            console.error('Error handling callback:', error);
            throw error;
        }
    },

    // Parse JWT token
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            throw error;
        }
    },

    // Get current user
    getUser() {
        const userJson = localStorage.getItem('wildcard_user');
        if (!userJson) return null;

        try {
            const user = JSON.parse(userJson);

            // Check if token is expired
            if (user.expiresAt && Date.now() > user.expiresAt) {
                this.logout();
                return null;
            }

            return user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        return this.getUser() !== null;
    },

    // Logout
    logout() {
        localStorage.removeItem('wildcard_user');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_state');

        // Redirect to Wildcard.id logout
        const logoutUrl = `https://wildcard.id/oauth/logout?redirect_uri=${encodeURIComponent(window.location.origin + '/space-invaders/')}`;
        window.location.href = logoutUrl;
    },

    // Require authentication (redirect to login if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

// Make it globally available
window.WildcardAuth = WildcardAuth;
