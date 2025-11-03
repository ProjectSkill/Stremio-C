// Wait for the entire page to load before running any scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Element References ---
    // Reasoning: Get references to all interactive elements on the page once, for efficiency.
    const burgerMenu = document.getElementById('burger-menu');
    const idModal = document.getElementById('id-modal');
    const playerModal = document.getElementById('player-modal');
    const idForm = document.getElementById('id-form');
    const imdbIdInput = document.getElementById('imdb-id');
    const streamListContainer = document.getElementById('stream-list-container');
    const playerList = document.getElementById('player-list');
    const loader = document.getElementById('loader');
    const mainContent = document.getElementById('main-content');
    
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close-button');

    // This object holds the URL schemes for launching iOS players.
    // Reasoning: This is the core of the "auto-open" feature. A web page can't launch an app directly,
    // but it can redirect to a URL scheme that the app has registered with the OS.
    const players = {
        'Infuse': 'infuse://x-callback-url/play?url=',
        'nPlayer': 'nplayer-',
        'VLC': 'vlc://',
        'Outplayer': 'outplayer://play?url=',
        'Web Browser': '' // An empty scheme will just open the URL in a new tab.
    };

    // --- 2. Event Listeners ---
    // Reasoning: These functions connect user actions (clicks, submits) to our JavaScript logic.
    
    burgerMenu.addEventListener('click', () => {
        idModal.style.display = 'flex';
        imdbIdInput.focus();
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    idForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const imdbId = imdbIdInput.value.trim();
        if (imdbId) {
            idModal.style.display = 'none';
            fetchStreams(imdbId);
        }
    });

    // --- 3. Core Functions ---

    /**
     * Fetches streams from our backend for a given IMDb ID.
     * @param {string} imdbId - The IMDb ID (e.g., tt0111161).
     */
    async function fetchStreams(imdbId) {
        // Step 1: Show the "Fetching..." indicator you wanted.
        loader.style.display = 'flex';
        streamListContainer.innerHTML = ''; // Clear previous results
        mainContent.querySelector('p').style.display = 'none'; // Hide initial message

        try {
            // Step 2: Call our own backend endpoint. This is the Stremio SDK URL format.
            const response = await fetch(`/manifest.json/stream/movie/${imdbId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Step 3: Display the results.
            displayStreams(data.streams || []);

        } catch (error) {
            console.error("Error fetching streams:", error);
            streamListContainer.innerHTML = '<p>Could not fetch streams. Please try again.</p>';
        } finally {
            // Step 4: Hide the loader, regardless of success or failure.
            loader.style.display = 'none';
        }
    }

    /**
     * Renders the list of stream buttons on the page.
     * @param {Array} streams - An array of stream objects from the backend.
     */
    function displayStreams(streams) {
        if (streams.length === 0) {
            streamListContainer.innerHTML = '<p>No streams found for this ID.</p>';
            return;
        }

        // For each stream, create a button. This is your "auto copy" list.
        streams.forEach(stream => {
            const button = document.createElement('button');
            button.innerText = `${stream.name} - ${stream.title}`;
            
            // Add a click listener to each button to show the player menu.
            button.addEventListener('click', () => {
                showPlayerMenu(stream.url);
            });

            streamListContainer.appendChild(button);
        });
    }

    /**
     * Displays the player selection modal.
     * @param {string} streamUrl - The URL of the video to be played.
     */
    function showPlayerMenu(streamUrl) {
        playerList.innerHTML = '<span class="close-button">&times;</span><h2>Choose Player</h2>'; // Reset and add title
        
        // Re-add close button functionality for the newly created button
        playerList.querySelector('.close-button').addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });

        // Create a button for each player defined in our `players` object.
        for (const [playerName, scheme] of Object.entries(players)) {
            const button = document.createElement('button');
            button.innerText = playerName;
            button.addEventListener('click', () => {
                // IMPORTANT: The stream URL must be encoded to be safely passed in another URL.
                const encodedUrl = encodeURIComponent(streamUrl);
                const finalUrl = (playerName === 'Web Browser') ? streamUrl : `${scheme}${encodedUrl}`;

                console.log(`Attempting to launch: ${finalUrl}`);
                
                // Hide the modal and redirect to the special URL to launch the app.
                playerModal.style.display = 'none';
                if (playerName === 'Web Browser') {
                    window.open(finalUrl, '_blank');
                } else {
                    window.location.href = finalUrl;
                }
            });
            playerList.appendChild(button);
        }

        playerModal.style.display = 'flex';
    }
});