import { AreaType, LevelData } from "./data.js";
import { FileData } from "./files.js";
import { getChopCount, getUpgrade, setUpgrade } from "./game_data.js";
import { LevelPool } from "./multipliers.js";


export const LevelManager = {
    current_levels: {} as Record<AreaType, number>,

    getCurrentLevel(areaType: AreaType): number {
        return this.current_levels[areaType] || 0;
    },

    checkLevels(){
        for(const areaType in AreaType) {
            const area = AreaType[areaType as keyof typeof AreaType];
            const wood = FileData.area_to_wood[area];
            var currentLevelIndex = this.current_levels[area] || 0;
            var levelData = FileData.wood_levels[wood][currentLevelIndex];
            while(levelData && getChopCount(wood) >= levelData.required_chops) {
                levelData.effects.forEach(effect => {
                    const upgradeId = effect.upgrade_id;
                    setUpgrade(upgradeId, 1);
                });
                if(levelData.custom) {
                    levelData.custom.apply();
                }

                this.current_levels[area] = currentLevelIndex + 1;
                currentLevelIndex = this.current_levels[area];
                levelData = FileData.wood_levels[wood][currentLevelIndex];
            }
        }
    },

    reset() {
        for(const areaType in AreaType) {
            const area = AreaType[areaType as keyof typeof AreaType];
            this.current_levels[area] = 0;
        }
    }
}