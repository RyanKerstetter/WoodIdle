import { toggleSignalSuppression,incrementPrestigeTokens,computePrestigeTokens, loadGame, setupAutoSave, setupSettingsModal, getGold, setGold, getChopProgress, setChopProgress, incrementGold, incrementChopCount, resetChopCount, resetChopProgress, setGoldThisRun, setPrestigeTokens, getPrestigeTokens, getSelectedArea, setSelectedArea, getUpgrade } from "./game_data.js";
import { FileData, loadFiles } from "./files.js";
import { render } from "./renderer.js";
import { computeMultiplier,computeCount, AreaUpgradePool, BlacksmithCalculator, CustomPool } from "./multipliers.js";
import { Signal, SignalManager } from "./signal_manager.js";
import { AreaType,AreaData, EffectType, WoodType } from "./data.js";

async function initializeGame() {
    await loadFiles();
    render();
}

export function prestige() {
    toggleSignalSuppression(true); // We dont want all the modifications to trigger signals
    incrementPrestigeTokens(computePrestigeTokens());
    setGold(0);
    setGoldThisRun(0);
    resetChopCount();
    resetChopProgress();
    AreaUpgradePool.reset();
    BlacksmithCalculator.reset();
    CustomPool.reset();
    setSelectedArea(AreaType.Forest);
    toggleSignalSuppression(false);
    SignalManager.triggerAllSignals();

}

export function applyDamage(wood: WoodType, damage: number) {
    const woodData = FileData.wood_to_data[wood];
    const currentProgress = getChopProgress(wood);
    const baseHealth = woodData.base_tree_health;
    const healthMutlplier = computeMultiplier(EffectType.TreeHealth, wood);
    const totalHealth = baseHealth * healthMutlplier;
    var progress = currentProgress + damage;

    const completedChops = Math.floor(progress / totalHealth);
    if (completedChops > 0) {
        console.log("Completed Chop");
        const baseSell = woodData.base_sell_price;
        const sellMultiplier = computeMultiplier(EffectType.SellPrice, wood);
        const amountChopped =
            computeMultiplier(EffectType.ChopYield, wood) * completedChops;
        const totalSell = baseSell * sellMultiplier * amountChopped;
        incrementGold(totalSell);
        incrementChopCount(wood, amountChopped);
        
    }
    const nextProgress = progress - completedChops * totalHealth;
    setChopProgress(wood, nextProgress);
}

function handleTick(deltaTime: number) {
    const ticks = deltaTime / 1; // 1 second ticks for now maybe replace later
    FileData.areas.forEach((value: AreaData) => {
        const key = `${value.name.toLowerCase()}_unlocked`;
        if (value.name != "Forest" && !getUpgrade(key)) return; // If the area isn't unlocked, skip it

        const wood: WoodType = value.wood.name as WoodType;
        const damageMultiplier = computeMultiplier(EffectType.ChopDamage, wood);
        const workerCount = computeCount(EffectType.WorkerCount,wood);
        const totalDamage = damageMultiplier * ticks * workerCount;

        applyDamage(wood,totalDamage);
    });
    SignalManager.triggerSignal(Signal.Tick);
}

async function startGame() {
    loadGame();
    await initializeGame();
    console.log("FileData", FileData);
    setupAutoSave();
    setupSettingsModal();

    let lastTime = performance.now();
    let accumulator = 0;
    const TICK_RATE = 1; 
    SignalManager.triggerAllSignals();

    function gameLoop(currentTime: number) {
        // 1. Calculate time passed since last frame
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        accumulator += deltaTime;
        while (accumulator >= TICK_RATE) {
            const tick = accumulator > 1000 ? accumulator / 100 : TICK_RATE;
            handleTick(tick);
            accumulator -= tick;
        }
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

startGame();
