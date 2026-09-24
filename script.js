const { ipcRenderer } = require('electron')

// rail stuff
document.addEventListener('click', (e) => {
    const libraryBtn = e.target.closest('#library-button');
    const downloadsBtn = e.target.closest('#downloads-button');
    const settingsBtn = e.target.closest('#settings-button');
    const playerBtn = e.target.closest('#player-button');

    if (libraryBtn) window.location.href = 'index.html';
    if (downloadsBtn) window.location.href = 'downloads.html';
    if (settingsBtn) window.location.href = 'settings.html';
    if (playerBtn) window.location.href = 'music.html';
});

// mini player shii
ipcRenderer.on('receive-audio-status', (event, data) => {
    const timeDisplay = document.getElementById('miniplayer-time');
    const titleDisplay = document.getElementById('miniplayer-title');
    const artistDisplay = document.getElementById('miniplayer-artist');
    const imgDisplay = document.getElementById('miniplayer-img');

    if (titleDisplay && data.title) {
        titleDisplay.innerText = data.title;
    }
    
    if (artistDisplay && data.artist) {
        artistDisplay.innerText = data.artist;
    }

    if (imgDisplay && data.cover) {
        imgDisplay.src = data.cover;
    }

    if (timeDisplay && data.currentTime !== undefined) {
        const curMins = Math.floor(data.currentTime / 60);
        const curSecs = Math.floor(data.currentTime % 60).toString().padStart(2, '0');
        const durMins = data.duration ? Math.floor(data.duration / 60) : 0;
        const durSecs = data.duration ? Math.floor(data.duration % 60).toString().padStart(2, '0') : '00';

        timeDisplay.innerText = `${curMins}:${curSecs} / ${durMins}:${durSecs}`;
    }
});

// load fast
ipcRenderer.send('request-audio-status');