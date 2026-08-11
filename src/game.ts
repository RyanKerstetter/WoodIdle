import { GameData, loadGame } from "./game_data.js";
import { FileData, loadFiles } from "./files.js";
import { render } from "./renderer.js";
import { initializeMultipliers, computeMultiplier } from "./multipliers.js";
import { UpdateManager } from "./update_manager.js";
import { AreaData, EffectType, WoodType } from "./data.js";

async function initializeGame() {
    await loadFiles();
    initializeMultipliers();
    render();
}

export function applyDamage(wood: WoodType, damage: number) {
    const woodData = FileData.wood_to_data[wood];
    const currentProgress = GameData.chop_progress[wood] || 0;
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
        GameData.gold += totalSell;
        GameData.gold_this_run += totalSell;
        GameData.chop_count[wood] =
            (GameData.chop_count[wood] || 0) + amountChopped;
    }
    const nextProgress = progress - completedChops * totalHealth;
        GameData.chop_progress[wood] = nextProgress;
}

function handleTick(deltaTime: number) {
    const ticks = deltaTime / 1; // 1 second ticks for now maybe replace later
    FileData.areas.forEach((value: AreaData) => {
        const key = `${value.name.toLowerCase()}_unlocked`;
        if (value.name != "Forest" && !GameData.upgrades[key]) return; // If the area isn't unlocked, skip it

        const wood: WoodType = value.wood.name as WoodType;
        const damageMultiplier = computeMultiplier(EffectType.ChopDamage, wood);
        const workerCount = computeMultiplier(EffectType.WorkerCount,wood);
        const totalDamage = damageMultiplier * ticks * workerCount;

        applyDamage(wood,totalDamage);
    });
}

async function startGame() {
    await initializeGame();
    console.log("FileData", FileData);
    loadGame();

    let lastTime = performance.now();
    let accumulator = 0;
    const TICK_RATE = 1; 
    UpdateManager.triggerAllUpdates();

    function gameLoop(currentTime: number) {
        // 1. Calculate time passed since last frame
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        accumulator += deltaTime;
        while (accumulator >= TICK_RATE) {
            const tick = accumulator > 1000 ? accumulator / 100 : TICK_RATE;
            handleTick(tick);
            UpdateManager.triggerUpdates("tick"); // This handles all of the UI Updates
            accumulator -= tick;
        }
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

startGame();
