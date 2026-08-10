import type {WoodType } from "./data.js";

export const GameData = {
    gold: 0 as number,
    prestige_tokens: 0 as number,
    upgrades: {} as Record<string,number>,
    selected_area: "Forest" as string,
    chop_progress: {} as Record<WoodType,number>,
}


export function saveGame() {
    localStorage.setItem('chopGameData', JSON.stringify(GameData));
}

export function loadGame() {
    const savedData = localStorage.getItem('chopGameData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Mutate the static GameData object properties directly
        GameData.gold = parsed.money ?? 0;
        GameData.prestige_tokens = parsed.prestigeTokens ?? 0;
        GameData.upgrades = parsed.upgrades ?? {};
        GameData.selected_area = parsed.selected_area ?? "Forest";
    } else {
        // Fallback: Reset to default values if no save state exists
        GameData.gold = 0;
        GameData.prestige_tokens = 0;
        GameData.upgrades = {};
        GameData.selected_area = "Forest";
    }
    
    GameData.upgrades[`axe_unlocked`] = 1;
}

export function resetGame() {
    localStorage.removeItem('chopGameData');
    location.reload();
}



(window as any).GameData = GameData;
(window as any).saveGame = saveGame;