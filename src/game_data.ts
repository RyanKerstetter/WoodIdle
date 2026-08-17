import type {WoodType, AreaType } from "./data.js";
import { Signal, SignalManager } from "./signal_manager.js";

export const GameData = {
    gold: 0 as number,
    prestige_tokens: 0 as number,
    gold_this_run: 0 as number,
    upgrades: {} as Record<string,number>,
    selected_area: "Forest" as AreaType,
    chop_progress: {} as Record<WoodType,number>,
    chop_count : {} as Record<WoodType,number>,
}

export function getUpgrade(upgradeId: string): number {
    return GameData.upgrades[upgradeId] || 0;
}

export function setUpgrade(upgradeId: string, level: number) {
    GameData.upgrades[upgradeId] = level;
    SignalManager.triggerSignal(Signal.UpgradeUnlocked);
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

        GameData.gold = parsed.gold ?? 0;
        GameData.prestige_tokens = parsed.prestige_tokens ?? parsed.prestigeTokens ?? 0;
        GameData.gold_this_run = parsed.gold_this_run ?? 0;
        GameData.upgrades = parsed.upgrades ?? {};
        GameData.selected_area = parsed.selected_area ?? "Forest";
        GameData.chop_progress = parsed.chop_progress ?? {};
        GameData.chop_count = parsed.chop_count ?? {};
    }
}

export function setupSettingsModal() {
    const settingsBox = document.getElementById('settings-box');
    const modal = document.getElementById('settings-modal');
    const closeButton = document.getElementById('close-settings');
    const exportButton = document.getElementById('export-save-btn');
    const importButton = document.getElementById('import-save-btn');
    const fileInput = document.getElementById('import-save-input') as HTMLInputElement | null;

    if (!settingsBox || !modal || !closeButton || !exportButton || !importButton || !fileInput) {
        return;
    }

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        fileInput.value = '';
    };

    const openModal = () => {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    };

    settingsBox.addEventListener('click', openModal);
    settingsBox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openModal();
        }
    });
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    exportButton.addEventListener('click', () => {
        exportSave();
        closeModal();
    });
    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
            return;
        }

        try {
            await importSave(file);
            closeModal();
        } catch (error) {
            console.error('Failed to import save:', error);
            alert('Failed to import save. Please select a valid Chop save JSON file.');
        } finally {
            target.value = '';
        }
    });
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
        localStorage.setItem('chopGameData', JSON.stringify(parsed));
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