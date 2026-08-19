import { getChopCount, getUpgrade, setUpgrade } from "./game_data.js";
import { FileData } from "./files.js";
import { EffectType, WoodType, ApplyType, EquipLocation, Effect, BlacksmithUpgradeData, LevelData } from "./data.js";
import { formatString } from "./util.js";

enum CalculateType {
    Multiplier, // This is for stacking multipliers
    Count,      // This adds all (worker_count, crit chance)
}

// This handles all of the upgrades that are trivially computed from the map of upgrades in GameData.
// This can't handle more complex logic like specific active items since it is either on or off based on the presence of the upgrade

export class UpgradePool {
    effects: Record<EffectType, Effect[]> = {} as Record<EffectType, Effect[]>;

    addEffect(effect: Effect) {
        if (!this.effects[effect.type]) {
            this.effects[effect.type] = [];
        }
        this.effects[effect.type].push(effect);
    }

    calculate(effectType: EffectType, calculateType: CalculateType = CalculateType.Multiplier, woodType: WoodType | null = null): number {
        let totalValue = calculateType == CalculateType.Multiplier ? 1 : 0;
        const effectsToCheck = this.effects[effectType] || [];
        for (const effect of effectsToCheck) {
            if (effect.wood_type === woodType || effect.wood_type === null) {
                if (calculateType == CalculateType.Multiplier)
                    totalValue *= effect.computeValue();
                else
                    totalValue += effect.computeValue();
            }
        }
        return totalValue;
    }

    reset() {
        for(const key in this.effects) {
            const effects = this.effects[key as EffectType];
            for(const effect of effects) {
                setUpgrade(effect.upgrade_id, 0);
            }
        }
    }
}

export const AreaUpgradeCalculator = new UpgradePool();
export const ShrineUpgradeCalculator = new UpgradePool();
export const CustomPool = new UpgradePool();

// This handles the upgrades from the blacksmith. 
// It only uses the effect of the latest upgrade for a type
export const BlacksmithCalculator = {
    effects: {} as Record<EquipLocation, Effect[]>,
    // etc for other equipment types


    addUpgrade(effect: Effect, equipLocation: EquipLocation) {
        if (!this.effects[equipLocation]) {
            this.effects[equipLocation] = [];
        }
        this.effects[equipLocation].push(effect);
    },

    calculate(effectType: EffectType,calculateType: CalculateType = CalculateType.Multiplier, woodType: WoodType | null = null, equipLocation: EquipLocation | null = null ): number {
        let totalValue = calculateType == CalculateType.Multiplier ? 1 : 0;
        if(equipLocation === null) {
            const locations = Object.values(EquipLocation);
            for(const location of locations) {
                totalValue *= this.calculate(effectType, calculateType,woodType, location);
            }
            return totalValue;
        }
        
        let effectsToCheck: Effect[] = this.effects[equipLocation] || [];
        for (const effect of effectsToCheck) {
            if(effect.match(effectType, woodType)) {
                const value = effect.computeValue()
                totalValue = Math.max(totalValue, value); // Take the best upgrade for each type
            }
        }
        return totalValue;
    },

    reset(){
        for(const key in this.effects) {
            const effects = this.effects[key as EquipLocation];
            for(const effect of effects) {
                setUpgrade(effect.upgrade_id, 0);
            }
        }
    }

}

export const LevelCalculator = {

    calculate(effectType: EffectType,calculateType: CalculateType = CalculateType.Multiplier,woodType: WoodType | null = null): number {
        var totalValue = calculateType == CalculateType.Multiplier ? 1 : 0;
        for(const indexType of Object.values(WoodType)) {
            const chopped = getChopCount(indexType);
            if(!FileData.wood_levels[indexType]) {
                continue;
            }
            for(var i = 0; i < FileData.wood_levels[indexType].length; i++) {
                const levelData: LevelData | null = FileData.wood_levels[indexType][i] || null;
                if(!levelData){
                    break; 
                }
                if(chopped < (levelData?.required_chops || Infinity)) {
                    break;
                }
                for(const effect of levelData.effects) {
                    if(effect.match(effectType, woodType)) {
                        if(calculateType == CalculateType.Multiplier)
                            totalValue *= effect.computeValueAt(1);
                        else 
                            totalValue += effect.computeValueAt(1);
                    }
                }
                if(levelData.custom) {
                    levelData.custom.apply();
                }

            }
        }
        return totalValue;
        
    }

}

export function computeMultiplier(effectType: EffectType, woodType: WoodType | null = null): number {
    const upgradeMultiplier = AreaUpgradeCalculator.calculate(effectType,CalculateType.Multiplier, woodType);
    const blacksmithMultiplier = BlacksmithCalculator.calculate(effectType,CalculateType.Multiplier, woodType);
    const levelMultiplier = LevelCalculator.calculate(effectType,CalculateType.Multiplier, woodType);
    console.log(upgradeMultiplier,blacksmithMultiplier,levelMultiplier);
    return upgradeMultiplier * blacksmithMultiplier * levelMultiplier;
}

export function computeCount(effectType: EffectType, woodType:WoodType | null = null): number {
    const upgradeCount = AreaUpgradeCalculator.calculate(effectType,CalculateType.Count, woodType);
    const blacksmithCount = BlacksmithCalculator.calculate(effectType,CalculateType.Count, woodType);
    const levelCount = LevelCalculator.calculate(effectType,CalculateType.Count, woodType);
    return upgradeCount + blacksmithCount + levelCount;
}
