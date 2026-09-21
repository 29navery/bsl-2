const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let musicFilePath = null;

async function initMusicFile() {
    const userDataPath = await ipcRenderer.invoke('get-user-data-path');
    musicFilePath = path.join(userDataPath, 'music.json');

    if (!fs.existsSync(musicFilePath)) {
        const initialData = { playlists: {}, tracks: [] };
        fs.writeFileSync(musicFilePath, JSON.stringify(initialData, null, 2), 'utf8');
    }
    
    return JSON.parse(fs.readFileSync(musicFilePath, 'utf8'));
}

// load
function loadMusicData() {
    if (!musicFilePath) {
        throw new Error("Music file path has not been initialized yet!");
    }
    
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
    if (!playlistName) return;
    const data = loadMusicData();

    if (!data.playlists[playlistName]) {
        data.playlists[playlistName] = {
            songs: []
        };
        
        saveMusicData(data);
        console.log(`Playlist "${playlistName}" created successfully!`);
        renderList();
    } else {
        console.log(`Playlist "${playlistName}" already exists.`);
    }
}


const promptContainer = document.getElementById('name-prompt-cover');
const promptInputField = document.getElementById('name-input-text-field');
const promptDoneButton = document.getElementById('name-input-create-button');

function promptForPlaylistName() {
    return new Promise((resolve) => {
        promptContainer.style.setProperty('display', 'block');
        promptInputField.focus();

        promptDoneButton.onclick = () => {
            // FIXED: Use .value instead of .textContent for input fields
            const name = promptInputField.value ? promptInputField.value.trim() : '';
            
            if (name !== '') {
                promptContainer.style.setProperty('display', 'none');
                promptInputField.value = ''; // FIXED: Clear value properly
                resolve(name);
            }
        };
    });
}

// render engine
async function renderList() {
    const contentArea = document.getElementById('content');
    
    // Clear old list if it exists to prevent duplication
    const existingList = contentArea.querySelector('.music-list');
    if (existingList) existingList.remove();

    const musicList = document.createElement('div');
    musicList.classList.add('music-list');
    contentArea.appendChild(musicList);

    const data = loadMusicData();
    const playlistNames = Object.keys(data.playlists);

    if (playlistNames.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#aaa';
        emptyMsg.style.textIndent = '25px';
        emptyMsg.textContent = 'No playlists created yet.';
        musicList.appendChild(emptyMsg);
        return;
    }

    playlistNames.forEach(name => {
        const newItem = document.createElement('button');
        newItem.classList.add('playlist-item');
        newItem.textContent = name;
        musicList.appendChild(newItem);
    });
}

// startup
async function startApp() {
    await initMusicFile();
    console.log("Music database initialized!");
    
    renderList();

    document.getElementById('make-playlist').addEventListener('click', async () => {
        const name = await promptForPlaylistName();
        if (name) {
            createPlaylist(name);
        }
    });
}

startApp();