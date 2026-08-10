
import { AreaData, LevelData, AreaUpgradeData, BlacksmithUpgradeData } from "./data.js";
import {AreaType, WoodType} from "./data.js"
    
export const FileData = {
    areas: [] as AreaData[],
    blacksmith: [] as BlacksmithUpgradeData[],
    area_upgrade_data: {} as AreaUpgradeData,
    wood_levels: {} as Record<WoodType, LevelData[]>,

    // Helper maps to find associated values
    area_to_wood_map: {} as Record<AreaType, WoodType>,
};


export async function loadFiles() {
    // 1. Fetch base areas and blacksmith files concurrently
    const [areasData, blacksmithData,areaUpgradeData] = await Promise.all([
        fetch('data/areas.json').then(res => res.json()),
        fetch('data/blacksmith.json').then(res => res.json()),
        fetch('data/area-upgrades.json').then(res => res.json())
    ]);

    FileData.areas = areasData.map((area: any) => new AreaData(area));
    FileData.areas.forEach((area: AreaData) => {
        FileData.area_to_wood_map[area.name as AreaType] = area.wood.name as WoodType;
    });
    FileData.blacksmith = blacksmithData.map((upgrade: any) => new BlacksmithUpgradeData(upgrade));
    FileData.area_upgrade_data = new AreaUpgradeData(areaUpgradeData);

    // 2. Create an array of fetch promises for each wood type level file
    const levelPromises = FileData.areas.map(async (area: AreaData) => {
        const wood: WoodType = area.wood.name as WoodType;
        const wood_name = wood.toLowerCase();
        const res = await fetch(`data/wood_levels/${wood_name}.json`);
        const levelData = await res.json();
        
        // Populate the object as soon as it resolves
        FileData.wood_levels[wood] = [];
        for (const level of levelData) {
            FileData.wood_levels[wood].push(new LevelData(level));
        }
    });

    // 3. CRITICAL: Wait for ALL level files to finish loading before exiting!
    await Promise.all(levelPromises);
}



(window as any).FileData = FileData;