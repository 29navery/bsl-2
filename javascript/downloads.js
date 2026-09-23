// downloads status
const light = document.getElementById("status-light");
light.style.setProperty("background-color", "var(--status-yellow)");
light.style.setProperty("box-shadow", "var(--status-yellow) 0 0 15px");

for (let i = 0; i < 10; i++) {
    fetch('https://tungstenball.org/games.json')
        .then(response => response.json())
        .then(data => {
            light.style.setProperty("background-color", "var(--status-green)");
            light.style.setProperty("box-shadow", "var(--status-green) 0 0 15px");
            return;
        })
        .catch(error => {
            light.style.setProperty("background-color", "var(--status-red)");
            light.style.setProperty("box-shadow", "var(--status-red) 0 0 15px");
            console.warn(error);
        });
}

// important function for color
function muteHexColor(hex, alpha = 0.5) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

// load data
(async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const gameGrid = document.getElementById("download-grid");

    let games;
    let isCached = false;

    const cachedData = localStorage.getItem('tungsten_games_cache');

    if (cachedData) {
        games = JSON.parse(cachedData);
        isCached = true;
    } else {
        try {
            const response = andResponse = await fetch('https://tungstenball.org/games.json');
            games = await response.json();
            
            localStorage.setItem('tungsten_games_cache', JSON.stringify(games));
        } catch(error) {
            console.error("Couldn't load games.json.", error);
            return;
        }
    }

    try {
        // looping the rooms (data)
        for (const game of games.games) {
            const newItem = document.createElement("button");
            const newText = document.createElement("p");
            const newImg = document.createElement("img");
            const affectors = document.createElement('div');

            const mutedColor = muteHexColor(game.color, 0.4);
            
            gameGrid.appendChild(newItem);
            newText.textContent = game.title;
            newText.style.setProperty("z-index", 2);
            newItem.style.setProperty("--card-accent-color", mutedColor);
            newItem.appendChild(newText);
            newItem.appendChild(newImg);
            newItem.appendChild(affectors);

            affectors.classList.add('affectors');

            if (game.controller === true) {
                const gamepadIcon = document.createElement("img");
                gamepadIcon.setAttribute('src', 'svg/gamepad.svg');
                gamepadIcon.style.setProperty('width', '32px');
                gamepadIcon.style.setProperty('postion', 'absolute');

                affectors.appendChild(gamepadIcon);
                newItem.addEventListener('mouseenter', () => {
                    gamepadIcon.animate([
                        { opacity: 1}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
                newItem.addEventListener('mouseleave', () => {
                    gamepadIcon.animate([
                        { opacity: 0.5}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
            }

            if (game.dlc === true) {
                const dlcIcon = document.createElement("img");
                dlcIcon.setAttribute('src', 'svg/dlc.svg');
                dlcIcon.style.setProperty('width', '32px');
                dlcIcon.style.setProperty('postion', 'absolute');

                affectors.appendChild(dlcIcon);
                newItem.addEventListener('mouseenter', () => {
                    dlcIcon.animate([
                        { opacity: 1}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
                newItem.addEventListener('mouseleave', () => {
                    dlcIcon.animate([
                        { opacity: 0.5}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
            }

            if (game.lag === true) {
                const lagIcon = document.createElement("img");
                lagIcon.setAttribute('src', 'svg/lag.svg');
                lagIcon.style.setProperty('width', '32px');
                lagIcon.style.setProperty('postion', 'absolute');

                affectors.appendChild(lagIcon);
                newItem.addEventListener('mouseenter', () => {
                    lagIcon.animate([
                        { opacity: 1}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
                newItem.addEventListener('mouseleave', () => {
                    lagIcon.animate([
                        { opacity: 0.5}
                    ], {
                        duration: 200,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                });
            }

            newImg.style.setProperty("position", "absolute");
            newImg.style.setProperty("transform", "translateY(-6px)");
            newImg.setAttribute("src", `https://tungstenball.org${game.image}`);
            
            newItem.style.setProperty("animation", 'fadeIn 300ms ease-out forwards');
            newItem.addEventListener('animationend', (event) => {
                newItem.style.removeProperty("animation");
            });
            
            await sleep(25);
        }
    } catch(error) {
        console.error("Error building game grid.", error);
    }
})();

const refreshButton = document.getElementById('refresh-button');

if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
        localStorage.removeItem('tungsten_games_cache');
        const success = await ipcRenderer.invoke('clear-games-cache');
        
        if (success) {
            window.location.reload();
        }
    });
}