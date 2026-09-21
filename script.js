// rail button logic

document.getElementById('library-button').addEventListener('click', () => {
    if (!window.location.href.includes('index.html')) {
        window.location.href = 'index.html'
    }
});

document.getElementById('downloads-button').addEventListener('click', () => {
    if (!window.location.href.includes('downloads.html')) {
        window.location.href = 'downloads.html'
    }
});

document.getElementById('settings-button').addEventListener('click', () => {
    if (!window.location.href.includes('settings.html')) {
        window.location.href = 'settings.html'
    }
});

document.getElementById('player-button').addEventListener('click', () => {
    if (!window.location.href.includes('music.html')) {
        window.location.href = 'music.html'
    }
});