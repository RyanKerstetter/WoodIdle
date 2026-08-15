
import { AreaData, LevelData, AreaUpgradeData, BlacksmithUpgradeData, WoodData, ShrineNode, ShrineConnection } from "./data.js";
import {AreaType, WoodType} from "./data.js"



export const FileData = {
    areas: [] as AreaData[],
    blacksmith: [] as BlacksmithUpgradeData[],
    area_upgrade_data: {} as AreaUpgradeData,
    wood_levels: {} as Record<WoodType, LevelData[]>,
    shrine_root_id: "" as string,
    shrine_nodes: [] as ShrineNode[],
    shrine_connections: [] as ShrineConnection[],

    // Helper maps to find associated values
    area_to_wood: {} as Record<AreaType, WoodType>,
    area_to_data: {} as Record<AreaType, AreaData>,
    wood_to_data: {} as Record<WoodType,WoodData>,
};

export function findShrineNode(id: string): ShrineNode | undefined{
    return FileData.shrine_nodes.find((node: ShrineNode) => node.node_id === id);
}

export function getShrineConnections(node_id: string) : ShrineConnection[] {
    const connections: ShrineConnection[] = [];
    FileData.shrine_connections.forEach((connection: ShrineConnection) => {
        if(connection.from_node_id == node_id)
            connections.push(connection);
    });
    return connections;
}


export async function loadFiles() {
    // 1. Fetch base areas and blacksmith files concurrently
    const [areasData, blacksmithData, areaUpgradeData, shrineData] = await Promise.all([
        fetch('data/areas.json').then(res => res.json()),
        fetch('data/blacksmith.json').then(res => res.json()),
        fetch('data/area-upgrades.json').then(res => res.json()),
        fetch('data/shrine.json').then(res => res.json()),
    ]);

    FileData.areas = areasData.map((area: any) => new AreaData(area));
    FileData.areas.forEach((area: AreaData) => {
        FileData.area_to_wood[area.name as AreaType] = area.wood.name as WoodType;
        FileData.area_to_data[area.name as AreaType] = area;
        FileData.wood_to_data[area.wood.name as WoodType] = area.wood;
    });
    FileData.blacksmith = blacksmithData.map((upgrade: any) => new BlacksmithUpgradeData(upgrade));
    FileData.area_upgrade_data = new AreaUpgradeData(areaUpgradeData);
    FileData.shrine_root_id = shrineData.root_id;
    FileData.shrine_nodes = shrineData.nodes.map((node: any) => new ShrineNode(node));
    FileData.shrine_connections = shrineData.connections.map((connection: any) => new ShrineConnection(connection));

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