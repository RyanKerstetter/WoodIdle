import type {WoodType, AreaType } from "./data.js";

export const GameData = {
    gold: 0 as number,
    prestige_tokens: 0 as number,
    gold_this_run: 0 as number,
    upgrades: {} as Record<string,number>,
    selected_area: "Forest" as AreaType,
    chop_progress: {} as Record<WoodType,number>,
    chop_count : {} as Record<WoodType,number>,
}

function resetGameData() {
    GameData.gold = 0;
    GameData.prestige_tokens = 0;
    GameData.gold_this_run = 0;
    GameData.upgrades = {};
    GameData.selected_area = "Forest" as AreaType;
    GameData.chop_progress = {} as Record<WoodType,number>;
    GameData.chop_count = {} as Record<WoodType,number>;
}

export function saveGame() {
    localStorage.setItem('chopGameData', JSON.stringify(GameData));
}

export function loadGame() {
    const savedData = localStorage.getItem('chopGameData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Mutate the static GameData object properties directly
        GameData.gold = parsed.gold ?? 0;
        GameData.prestige_tokens = parsed.prestigeTokens ?? 0;
        GameData.gold_this_run = parsed.gold_this_run ?? 0;
        GameData.upgrades = parsed.upgrades ?? {};
        GameData.selected_area = parsed.selected_area ?? "Forest";
        GameData.chop_progress = parsed.chop_progress ?? {};
        GameData.chop_count = parsed.chop_count ?? {};
    }
    
    //GameData.upgrades[`axe_unlocked`] = 1;
}

export function setupAutoSave() {
    const autosaveIntervalMs = 60 * 1000;

    function saveOnBlur() {
        saveGame();
    }

    function saveOnVisibilityChange() {
        if (document.visibilityState === "hidden") {
            saveGame();
        }
    }

    function saveOnUnload() {
        saveGame();
    }

    window.addEventListener("blur", saveOnBlur);
    document.addEventListener("visibilitychange", saveOnVisibilityChange);
    window.addEventListener("beforeunload", saveOnUnload);
    window.addEventListener("pagehide", saveOnUnload);
    window.setInterval(saveGame, autosaveIntervalMs);
}

export function exportSave(filename = 'chop-save.json') {
    // Prefer the stored save if present, otherwise serialize current live state
    const data = localStorage.getItem('chopGameData') || JSON.stringify(GameData);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // Append / click / remove to trigger download in all browsers
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function importSave(jsonOrFile: string | File, reload = true) {
    let dataStr: string;
    if (typeof jsonOrFile === 'string') {
        dataStr = jsonOrFile;
    } else {
        dataStr = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = () => reject(fr.error);
            fr.readAsText(jsonOrFile);
        });
    }

    try {
        const parsed = JSON.parse(dataStr);
        // Store the imported object directly into localStorage
        localStorage.setItem('chopGameData', JSON.stringify(parsed));
        // Update the in-memory GameData immediately
        loadGame();
        if (reload) location.reload();
    } catch (err) {
        console.error('Failed to import save:', err);
        throw err;
    }
}

export function resetGame() {
    resetGameData();
    saveGame();
    location.reload();
}



(window as any).GameData = GameData;
(window as any).saveGame = saveGame;
(window as any).resetGame = resetGame;