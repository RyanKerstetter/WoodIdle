
import { GameData, loadGame } from "./game_data.js";
import { FileData, loadFiles  } from "./files.js";
import { render } from "./renderer.js";
import { initializeMultipliers, computeMultiplier } from "./multipliers.js";
import { UpdateManager } from "./update_manager.js";
import { AreaData, EffectType, WoodType } from "./data.js";

async function initializeGame() {
    await loadFiles();
    initializeMultipliers();
    render();
}


function handleTick(deltaTime: number){
    FileData.areas.forEach((value: AreaData) => {

        const key = `${value.name.toLowerCase()}_unlocked`;
        if(value.name != "Forest" && !GameData.upgrades[key]) return; // If the area isn't unlocked, skip it
        
        const type: WoodType = value.wood.name as WoodType;
        const currentProgress = GameData.chop_progress[type] || 0;
        const speedMultiplier = computeMultiplier(EffectType.ChoppingSpeed,type);
        const passedTime = deltaTime * speedMultiplier;
        const baseTime = value.wood.base_chop_time;
        const timeMultiplier = computeMultiplier(EffectType.ChopTime,type);
        const requiredTime = baseTime * timeMultiplier;
        var progress = currentProgress + passedTime;

        const completedChops = Math.floor(progress / requiredTime);
        if(completedChops > 0){
            console.log("Completed Chop")
            const baseSell = value.wood.base_sell_price;
            const sellMultiplier = computeMultiplier(EffectType.SellPrice,type)
            const amountChopped = computeMultiplier(EffectType.ChopYield,type) * completedChops;
            const totalSell = baseSell * sellMultiplier * amountChopped;
            GameData.gold += totalSell;
            const key = `${value.wood.name.toLowerCase()}_chopped`;
            GameData.upgrades[key] = (GameData.upgrades[key] || 0) + amountChopped;
        }
        const nextProgress = progress - completedChops * requiredTime;
        GameData.chop_progress[type] = nextProgress;
    });
}

async function startGame() {
    await initializeGame();
    console.log("FileData", FileData);
    loadGame();

    let lastTime = performance.now();
    let accumulator = 0;
    const TICK_RATE = 0.10; // 100ms (Update 10 times per second)

    function gameLoop(currentTime: number) {
        // 1. Calculate time passed since last frame
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        accumulator += deltaTime;
        while (accumulator >= TICK_RATE) {
            const tick = accumulator > 10 ? accumulator / 100 : TICK_RATE;
            handleTick(tick);
            UpdateManager.triggerUpdates("tick"); // This handles all of the UI Updates
            accumulator -= tick;
        }
        UpdateManager.triggerUpdates("frame");
        // 4. Request the next frame
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

startGame();