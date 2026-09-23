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

// create Playlist
function createPlaylist(playlistName) {
    if (!playlistName) return;
    const data = loadMusicData();

    if (!data.playlists[playlistName]) {
        data.playlists[playlistName] = { songs: [] };
        saveMusicData(data);
        renderView();
    }
}

// playlist name prompt
function promptForPlaylistName() {
    const promptContainer = document.getElementById('name-prompt-cover');
    const promptInputField = document.getElementById('name-input-text-field');
    const promptDoneButton = document.getElementById('name-input-create-button');

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

// delete prompt
function promptForDeletion(deletee) {
    const promptContainer = document.getElementById('deletion-prompt-cover');
    const yesButton = document.getElementById('deletion-prompt-yes');
    const noButton = document.getElementById('deletion-prompt-no');
    const promptText = document.getElementById('deletion-prompt-text');

    return new Promise((resolve) => {
        promptContainer.style.setProperty('display', 'block');
        promptText.textContent = 'Deleting ' + deletee + ' cannot be undone'

        yesButton.onclick = () => {
            promptContainer.style.setProperty('display', 'none');
            resolve(true);
        };
        noButton.onclick = () => {
            promptContainer.style.setProperty('display', 'none');
            resolve(false);
        };
    });
}

// make duration look nice
function formatDuration(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// context menu
let activeSongPath = null;
let activePlaylistName = null;
const contextMenu = document.getElementById('custom-context-menu');
const cmMain = document.getElementById('cm-main');

if (!contextMenu) {
    console.error("ERROR: #custom-context-menu element not found in HTML!");
}

document.addEventListener('contextmenu', (e) => {
    const playlistTile = e.target.closest('.playlist-item');
    const songTile = e.target.closest('.song-item');
    
    if (!playlistTile && !songTile) {
        if (contextMenu) contextMenu.style.display = 'none';
        activeSongPath = null;
        activePlaylistName = null;
        return;
    }

    e.preventDefault();
    
    if (songTile) {
        activeSongPath = songTile.dataset.songPath;
        activePlaylistName = null;
    } else if (playlistTile) {
        activeSongPath = null;
        activePlaylistName = playlistTile.textContent.trim();
    }

    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.display = 'block';
    if (cmMain) cmMain.style.display = 'block';
});

document.addEventListener('click', () => {
    if (contextMenu) contextMenu.style.display = 'none';
});

document.getElementById('menu-remove').addEventListener('click', async () => {
    let confirmed = true;

    if (activePlaylistName) {
        confirmed = await promptForDeletion(activePlaylistName);
    }

    if (!confirmed) return;

    const data = loadMusicData();

    if (activeSongPath && currentPlaylist && data.playlists[currentPlaylist]) {
        data.playlists[currentPlaylist].songs = data.playlists[currentPlaylist].songs.filter(
            s => s.path !== activeSongPath
        );
        saveMusicData(data);
    } else if (activePlaylistName && data.playlists[activePlaylistName]) {
        delete data.playlists[activePlaylistName];
        saveMusicData(data);
    }

    if (contextMenu) contextMenu.style.display = 'none';
    activeSongPath = null;
    activePlaylistName = null;

    renderView();
});

// make the funky name
function sanitizeFolder(name) {
    return name ? name.replace(/[<>:"/\\|?*]/g, '_').trim() : null;
}

// get audio metadata
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
    const rootMusicDir = path.join(docsPath, 'Big Screen Launcher', 'Music');

    if (!fs.existsSync(rootMusicDir)) {
        fs.mkdirSync(rootMusicDir, { recursive: true });
    }

    const data = loadMusicData();

    for (const filePath of filePaths) {
        const extractedMeta = await ipcRenderer.invoke('extract-mp3-metadata', filePath);
        
        const fileName = path.basename(filePath);
        const nameWithoutExt = path.parse(fileName).name;

        let defaultTitle = nameWithoutExt;
        let defaultArtist = "Unknown Artist";
        let defaultAlbum = null;

        if (nameWithoutExt.includes('-')) {
            const parts = nameWithoutExt.split('-');
            defaultArtist = parts[0].trim();
            defaultTitle = parts.slice(1).join('-').trim();
        }

        const title = (extractedMeta && extractedMeta.title) ? extractedMeta.title : defaultTitle;
        const artist = (extractedMeta && extractedMeta.artist) ? extractedMeta.artist : defaultArtist;
        const album = (extractedMeta && extractedMeta.album) ? extractedMeta.album : defaultAlbum;
        const duration = (extractedMeta && extractedMeta.duration) ? extractedMeta.duration : 0;
        
        const coverArtUrl = extractedMeta ? extractedMeta.cover : null;
        const finalCover = (coverArtUrl && coverArtUrl !== 'undefined') ? coverArtUrl : 'images/album-cover-placeholder.jpg';

        let targetDir = rootMusicDir;
        const sanitizedArtist = sanitizeFolder(artist);
        const sanitizedAlbum = sanitizeFolder(album);

        if (sanitizedArtist) {
            targetDir = path.join(targetDir, sanitizedArtist);
            if (sanitizedAlbum) {
                targetDir = path.join(targetDir, sanitizedAlbum);
            }
        }

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const destinationPath = path.join(targetDir, fileName);

        if (!fs.existsSync(destinationPath)) {
            fs.copyFileSync(filePath, destinationPath);
        }

        const songObj = {
            title: title,
            artist: artist,
            album: album || 'Unknown Album',
            length: formatDuration(duration),
            path: destinationPath,
            cover: finalCover
        };

        let existingMasterTrack = data.tracks.find(t => t.path === destinationPath);
        if (!existingMasterTrack) {
            data.tracks.push(songObj);
            existingMasterTrack = songObj;
        }

        const playlistSongs = data.playlists[currentPlaylist].songs;
        const alreadyInPlaylist = playlistSongs.some(t => t.path === destinationPath);

        if (!alreadyInPlaylist) {
            playlistSongs.push(existingMasterTrack);
        }
    }

    saveMusicData(data);
    renderView();
}

// big boy render daddy
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
        plstTitle.textContent = currentPlaylist;
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

        songs.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.classList.add('song-item');
            songItem.innerHTML = `
                <img src="${song.cover}" width="40" height="40" style="border-radius:4px; object-fit: cover;">
                <div style="flex-grow:1; margin-left:15px;">
                    <p class="song-item-title" style="margin:0; font-weight:bold;">${song.title}</p>
                    <p class="song-item-artist" style="margin:0; color:#aaa; font-size:12px;">${song.artist}</p>
                </div>
                <span class="song-item-length" style="color:#888; font-size:13px;">${song.length}</span>
            `;

            songItem.dataset.songIndex = index; 
            songItem.dataset.songPath = song.path;

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
            musicList.appendChild(newItem);
        });
    }
}

// startup
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