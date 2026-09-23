// hello I am the electron script
const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, session } = require('electron');
const fs = require('fs');
const path = require('path');

// trey & window
let mainWindow
let tray = null;
let isQuitting = false;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 800,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#1e1e1e',
            symbolColor: '#ffffff',
            height: 35
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false
        }
    });

    // no more cuss words guys (no more closing)
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    })

    mainWindow.loadFile('index.html');

    // for the testingz
    // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();

    tray = new Tray(path.join(__dirname, 'assets/app-icon.ico'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Library',
            click: () => {mainWindow.show(); mainWindow.focus(); mainWindow.loadFile('index.html');}
        },
        {
            label: 'Downloads',
            click: () => {mainWindow.show(); mainWindow.focus(); mainWindow.loadFile('downloads.html');}
        },
        {
            label: 'Settings',
            click: () => {mainWindow.show(); mainWindow.focus(); mainWindow.loadFile('settings.html');}
        },
        { type: 'separator' },
        {
            label: 'Quit...',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Big Screen Launcher');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) mainWindow.hide(); else mainWindow.show();
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        //app.quit();
    }
});

// making the shortcuts work
ipcMain.handle('dialog:open-game-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Game Executable',
        properties: ['openFile'],
        filters: [
            { name: 'Executables & Shortcuts', extensions: ['exe', 'lnk', 'url'] }
        ]
    });

    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// opening browser links
ipcMain.handle('open-external-link', async (event, url) => {
    await shell.openExternal(url);
});

// get the documents folderrr
ipcMain.handle('get-documents-path', () => {
    return app.getPath('documents');
});

// file dialog for music
ipcMain.handle('open-music-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Audio Files',
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
        ]
    });

    if (canceled) {
        return [];
    } else {
        return filePaths;
    }
});

// getting data path
ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

// app version handler
let appVersion = '26.0';
try {
    const versionPath = path.join(__dirname, 'appversion.txt');
    appVersion = fs.readFileSync(versionPath, 'utf8').trim();
} catch (err) {
    console.log("Could not read local version file:", err);
}

ipcMain.handle('get-app-version', () => {
    return appVersion;
});

// saving userdata
const gamesDir = path.join(app.getPath('documents'), 'Big Screen Launcher', 'Games');

if (!fs.existsSync(gamesDir)) {
    fs.mkdirSync(gamesDir, { recursive: true });
}

const gamesFilePath = path.join(gamesDir, '.games.json');

ipcMain.handle('load-games', () => {
    try {
        if (fs.existsSync(gamesFilePath)) {
            const data = fs.readFileSync(gamesFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Could not load games file:", err);
    }
    return [];
});

ipcMain.handle('save-games', (event, gamesArray) => {
    try {
        fs.writeFileSync(gamesFilePath, JSON.stringify(gamesArray, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Could not save games file:", err);
        return false;
    }
});

const { execFile } = require('child_process');

ipcMain.handle('launch-game-process', async (event, gamePath) => {
    execFile(gamePath, (error) => {
        if (error) {
            console.error('Failed to launch game:', error);
        }
    });
});

// saving settings
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('load-settings', () => {
    try {
        if (fs.existsSync(settingsFilePath)) {
            return JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        }
    } catch (err) {
        console.error("Could not load settings:", err);
    }
    return { apiKey: '' };
});

ipcMain.handle('save-settings', (event, settingsData) => {
    try {
        fs.writeFileSync(settingsFilePath, JSON.stringify(settingsData, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Could not save settings:", err);
        return false;
    }
});

// fetching steamgriddb grid art
const DEFAULT_API_KEY = '9d1906739a2fb8b80908934fa3529734';
function getApiKey() {
    const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    if (settings.apiKey) return settings.apiKey; else return DEFAULT_API_KEY;
}

ipcMain.handle('fetch-game-art', async (event, gameName) => {
    try {
        if (!fs.existsSync(settingsFilePath)) return null;
        let apiKey = getApiKey()

        const headers = { 'Authorization': `Bearer ${apiKey}` };

        const searchRes = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`, { headers });
        const searchData = await searchRes.json();
        
        if (!searchData.success || !searchData.data || searchData.data.length === 0) return null;
        const gameId = searchData.data[0].id;

        const gridsRes = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900,512x512`, { headers });
        const gridsData = await gridsRes.json();

        if (gridsData.success && gridsData.data && gridsData.data.length > 0) {
            return gridsData.data[0].url;
        }
    } catch (err) {
        console.error('Error connecting to SteamGridDB:', err);
    }
    return null;
});

// fetching steamgriddb hero art
ipcMain.handle('fetch-game-hero', async (event, gameName) => {
    try {
        if (!fs.existsSync(settingsFilePath)) return null;
        let apiKey = getApiKey()

        const headers = { 'Authorization': `Bearer ${apiKey}` };

        const searchRes = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`, { headers });
        const searchData = await searchRes.json();
        
        if (!searchData.success || !searchData.data || searchData.data.length === 0) return null;
        const gameId = searchData.data[0].id;

        const heroesRes = await fetch(`https://www.steamgriddb.com/api/v2/heroes/game/${gameId}`, { headers });
        const heroesData = await heroesRes.json();

        if (heroesData.success && heroesData.data && heroesData.data.length > 0) {
            return heroesData.data[0].url;
        }
    } catch (err) {
        console.error('Error connecting to SteamGridDB for hero art:', err);
    }
    return null;
});

// fetching steamgriddb logo art
ipcMain.handle('fetch-game-logo', async (event, gameName) => {
    try {
        if (!fs.existsSync(settingsFilePath)) return null;
        let apiKey = getApiKey()

        const headers = { 'Authorization': `Bearer ${apiKey}` };

        const searchRes = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`, { headers });
        const searchData = await searchRes.json();
        
        if (!searchData.success || !searchData.data || searchData.data.length === 0) return null;
        const gameId = searchData.data[0].id;

        const logosRes = await fetch(`https://www.steamgriddb.com/api/v2/logos/game/${gameId}`, { headers });
        const logosData = await logosRes.json();

        if (logosData.success && logosData.data && logosData.data.length > 0) {
            return logosData.data[0].url;
        }
    } catch (err) {
        console.error('Error connecting to SteamGridDB for logo art:', err);
    }
    return null;
});

// clear the games.json cache
ipcMain.handle('clear-games-cache', async () => {
    try {

        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData({
            storages: ['shadercache', 'serviceworkers', 'indexdb']
        });
        console.log('Browser cache cleared successfully.');

        return true;
    } catch (err) {
        console.error("Failed to clear caches:", err);
        return false;
    }
});

// remove games from library
ipcMain.handle('remove-game', async (event, index) => {
    try {
        let savedGames = [];
        if (fs.existsSync(gamesFilePath)) {
            savedGames = JSON.parse(fs.readFileSync(gamesFilePath, 'utf8'));
        }
        
        // Remove the game at the selected index
        savedGames.splice(index, 1);
        
        fs.writeFileSync(gamesFilePath, JSON.stringify(savedGames, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Could not remove game:", err);
        return false;
    }
});

// song metadata
const { parseFile } = require('music-metadata');

ipcMain.handle('extract-mp3-metadata', async (event, filePath) => {
    try {
        const metadata = await parseFile(filePath);
        const common = metadata.common;
        
        let coverUrl = null;
        if (common.picture && common.picture.length > 0) {
            const picture = common.picture[0];
            const base64Data = Buffer.from(picture.data).toString('base64');
            coverUrl = `data:${picture.format};base64,${base64Data}`;
        }

        let artistName = common.artist;
        if (!artistName && common.artists && common.artists.length > 0) {
            artistName = common.artists.join(', ');
        }

        return {
            title: common.title || null,
            artist: artistName || null,
            duration: metadata.format.duration || 0,
            cover: coverUrl
        };
    } catch (err) {
        console.error("Failed to parse MP3 metadata:", err);
        return null;
    }
});