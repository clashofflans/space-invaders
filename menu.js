// Menu page functionality
const infiniteModeButton = document.getElementById('infiniteMode');
const campaignModeButton = document.getElementById('campaignMode');
const levelSelection = document.getElementById('levelSelection');
const backToModesButton = document.getElementById('backToModes');

let selectedGameMode = null;

// Select infinite mode
function selectInfiniteMode() {
    selectedGameMode = 'infinite';
    // Redirect to game page with infinite mode
    window.location.href = 'game.html?mode=infinite';
}

// Select campaign mode
function selectCampaignMode() {
    selectedGameMode = 'campaign';
    // Show level selection
    document.querySelector('.game-mode-selection').style.display = 'none';
    levelSelection.style.display = 'block';
}

// Show mode selection
function showModeSelection() {
    levelSelection.style.display = 'none';
    document.querySelector('.game-mode-selection').style.display = 'block';
}

// Start level
function startLevel(level) {
    // Redirect to game page with campaign mode and level
    window.location.href = `game.html?mode=campaign&level=${level}`;
}

// Event listeners
infiniteModeButton.addEventListener('click', selectInfiniteMode);
campaignModeButton.addEventListener('click', selectCampaignMode);
backToModesButton.addEventListener('click', showModeSelection);

// Add event listeners for level buttons
document.querySelectorAll('.levelButton').forEach(button => {
    button.addEventListener('click', () => {
        const level = parseInt(button.getAttribute('data-level'));
        startLevel(level);
    });
});

// Add some visual effects
document.querySelectorAll('.menu-mode-button').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
});
