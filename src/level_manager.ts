import { AreaType, LevelData } from "./data.js";
import { getUpgrade } from "./game_data.js";


export class LevelManager {
    levels: Record<AreaType, LevelData[]>;
    current_levels: Record<AreaType, number>;

    constructor() {
        this.levels = {} as Record<AreaType, LevelData[]>;
        this.current_levels = {} as Record<AreaType, number>;
        for (const areaType in AreaType) {
            this.levels[AreaType[areaType as keyof typeof AreaType]] = [];
            this.current_levels[AreaType[areaType as keyof typeof AreaType]] = 0;
        }
    }

    getCurrentLevel(areaType: AreaType): number {
        return this.current_levels[areaType] || 0;
    }

    updateLevels(){
        for(const areaType in AreaType) {
            const area = AreaType[areaType as keyof typeof AreaType];
            const currentLevelIndex = this.current_levels[area] || 0;
            const levelData = this.levels[area][currentLevelIndex];
            const key = `${area.toLowerCase()}_chopped`;
            if(levelData && getUpgrade(key) >= levelData.required_chops) {
                this.current_levels[area] = currentLevelIndex + 1;
            }
        }
    }
}