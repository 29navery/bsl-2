const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let musicFilePath = null;
let currentPlaylist = null;

async function initMusicFile() {
    const userDataPath = await ipcRenderer.invoke('get-user-data-path');
    musicFilePath = path.join(userDataPath, 'music.json');

    if (!fs.existsSync(musicFilePath)) {
        const initialData = { playlists: {}, tracks: [] };
        fs.writeFileSync(musicFilePath, JSON.stringify(initialData, null, 2), 'utf8');
    }
    
    return JSON.parse(fs.readFileSync(musicFilePath, 'utf8'));
}

function loadMusicData() {
    if (!musicFilePath) {
        throw new Error("Music file path has not been initialized yet!");
    }
    const fileContent = fs.readFileSync(musicFilePath, 'utf8');
    return JSON.parse(fileContent);
}

function saveMusicData(data) {
    fs.writeFileSync(musicFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// Create Playlist
function createPlaylist(playlistName) {
    if (!playlistName) return;
    const data = loadMusicData();

    if (!data.playlists[playlistName]) {
        data.playlists[playlistName] = { songs: [] };
        saveMusicData(data);
        renderView();
    }
}

// playlsit name prompt
const promptContainer = document.getElementById('name-prompt-cover');
const promptInputField = document.getElementById('name-input-text-field');
const promptDoneButton = document.getElementById('name-input-create-button');

function promptForPlaylistName() {
    return new Promise((resolve) => {
        promptContainer.style.setProperty('display', 'block');
        promptInputField.focus();

        promptDoneButton.onclick = () => {
            const name = promptInputField.value ? promptInputField.value.trim() : '';
            if (name !== '') {
                promptContainer.style.setProperty('display', 'none');
                promptInputField.value = '';
                resolve(name);
            }
        };
    });
}

function formatDuration(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Get audio metadata (duration) using a temporary audio element
function getAudioMetadata(filePath) {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.src = filePath;
        audio.onloadedmetadata = () => {
            resolve({ duration: audio.duration });
        };
        audio.onerror = () => {
            resolve({ duration: 0 });
        };
    });
}

// add to current playlist
async function addSongsToCurrentPlaylist() {
    if (!currentPlaylist) return;

    const filePaths = await ipcRenderer.invoke('open-music-dialog');
    if (!filePaths || filePaths.length === 0) return;

    const docsPath = await ipcRenderer.invoke('get-documents-path');
    const targetDir = path.join(docsPath, 'Big Screen Launcher', 'Music');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const data = loadMusicData();

    for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const destinationPath = path.join(targetDir, fileName);

        if (!fs.existsSync(destinationPath)) {
            fs.copyFileSync(filePath, destinationPath);
        }

        const metadata = await getAudioMetadata(destinationPath);
        
        // Clean up title and artist from filename (e.g., "Artist - Title.mp3")
        const nameWithoutExt = path.parse(fileName).name;
        let title = nameWithoutExt;
        let artist = "Unknown Artist";

        if (nameWithoutExt.includes('-')) {
            const parts = nameWithoutExt.split('-');
            artist = parts[0].trim();
            title = parts.slice(1).join('-').trim();
        }

        const songObj = {
            title: title,
            artist: artist,
            length: formatDuration(metadata.duration),
            path: destinationPath
        };

        data.tracks.push(songObj);
        data.playlists[currentPlaylist].songs.push(songObj);
    }

    saveMusicData(data);
    renderView();
}

async function renderView() {
    const plstTitle = document.getElementById('plst-title');
    const contentArea = document.getElementById('content');
    
    const makePlaylistBtn = document.getElementById('make-playlist');
    const addSongsBtn = document.getElementById('add-songs');

    if (currentPlaylist) {
        makePlaylistBtn.style.display = 'none';
        addSongsBtn.style.display = 'inline-block';
    } else {
        makePlaylistBtn.style.display = 'inline-block';
        addSongsBtn.style.display = 'none';
    }

    const existingList = contentArea.querySelector('.music-list');
    if (existingList) existingList.remove();

    const musicList = document.createElement('div');
    musicList.classList.add('music-list');
    contentArea.appendChild(musicList);

    const data = loadMusicData();

    if (currentPlaylist) {
        const backBtn = document.createElement('button');
        backBtn.classList.add('preferable-button');
        backBtn.style.marginBottom = '15px';
        plstTitle.style.setProperty('display', 'block');
        plstTitle.textContent = currentPlaylist
        backBtn.textContent = `Return`;
        backBtn.onclick = () => {
            currentPlaylist = null;
            renderView();
        };
        musicList.appendChild(backBtn);

        const songs = data.playlists[currentPlaylist].songs;

        if (songs.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = '#aaa';
            emptyMsg.textContent = 'No songs in this playlist yet. Click "Add Songs" to import some!';
            musicList.appendChild(emptyMsg);
            return;
        }

        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.classList.add('song-item');
            songItem.innerHTML = `
                <img src="images/album-cover-placeholder.jpg" width="40" height="40" style="border-radius:4px;">
                <div style="flex-grow:1; margin-left:15px;">
                    <p class="song-item-title" style="margin:0; font-weight:bold;">${song.title}</p>
                    <p class="song-item-artist" style="margin:0; color:#aaa; font-size:12px;">${song.artist}</p>
                </div>
                <span class="song-item-length" style="color:#888; font-size:13px;">${song.length}</span>
            `;
            musicList.appendChild(songItem);
        });

    } 
    else {
        const playlistNames = Object.keys(data.playlists);
        plstTitle.style.setProperty('display', 'none');

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
            newItem.onclick = () => {
                currentPlaylist = name;
                renderView();
            };
            musicList.musicList ? null : musicList.appendChild(newItem);
        });
    }
}

// Startup
async function startApp() {
    await initMusicFile();
    console.log("Music database initialized!");
    
    renderView();

    document.getElementById('make-playlist').addEventListener('click', async () => {
        const name = await promptForPlaylistName();
        if (name) {
            createPlaylist(name);
        }
    });

    document.getElementById('add-songs').addEventListener('click', async () => {
        await addSongsToCurrentPlaylist();
    });
}

startApp();