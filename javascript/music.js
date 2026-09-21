const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const musicFilePath = path.join(app.getPath('userData'), 'music.json');

// load
function loadMusicData() {
    if (!fs.existsSync(musicFilePath)) {
        const dir = path.dirname(musicFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const initialData = {
            playlists: {},
            tracks: []
        };
        
        fs.writeFileSync(musicFilePath, JSON.stringify(initialData, null, 2), 'utf8');
    }

    const fileContent = fs.readFileSync(musicFilePath, 'utf8');
    return JSON.parse(fileContent);
}

// save
function saveMusicData(data) {
    fs.writeFileSync(musicFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// make playlists
function createPlaylist(playlistName) {
    const data = loadMusicData();

    if (!data.playlists[playlistName]) {
        data.playlists[playlistName] = {
            songs: []
        };
        
        saveMusicData(data);
        console.log(`Playlist "${playlistName}" created successfully!`);
    } else {
        console.log(`Playlist "${playlistName}" already exists.`);
    }
}

const appData = loadMusicData();
console.log('Current playlists loaded:', appData.playlists);

// render engine
async function renderGrid() {
    const musicGrid = document.createElement('div');
    musicGrid.classList.add('music-grid')
    document.getElementById('content').appendChild(musicGrid);

    for (let i=1; i < 10; i++) {
        const newItem = document.createElement('button');

        musicGrid.appendChild(newItem);
    }
}

async function renderList() {
    const musicList = document.createElement('div');
    musicList.classList.add('music-list')
    document.getElementById('content').appendChild(musicList);

    for (let i=1; i < 10; i++) {
        const newItem = document.createElement('button');

        musicList.appendChild(newItem);
        newItem.textContent = 'Playlist Name!'
    }
}

renderList();

document.getElementById('make-playlist').addEventListener('click', () => {
    createPlaylist('test-playlist');
});