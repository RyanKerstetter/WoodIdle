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

export const AreaUpgradePool = new UpgradePool();
export const ShrineUpgradePool = new UpgradePool();
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

export const LevelPool = new UpgradePool();

export function computeMultiplier(effectType: EffectType, woodType: WoodType | null = null): number {
    const upgradeMultiplier = AreaUpgradePool.calculate(effectType,CalculateType.Multiplier, woodType);
    const blacksmithMultiplier = BlacksmithCalculator.calculate(effectType,CalculateType.Multiplier, woodType);
    const levelMultiplier = LevelPool.calculate(effectType,CalculateType.Multiplier, woodType);
    const shrineMultiplier = ShrineUpgradePool.calculate(effectType,CalculateType.Multiplier, woodType);
    return upgradeMultiplier * blacksmithMultiplier * levelMultiplier * shrineMultiplier;
}

export function computeCount(effectType: EffectType, woodType:WoodType | null = null): number {
    const upgradeCount = AreaUpgradePool.calculate(effectType,CalculateType.Count, woodType);
    const blacksmithCount = BlacksmithCalculator.calculate(effectType,CalculateType.Count, woodType);
    const levelCount = LevelPool.calculate(effectType,CalculateType.Count, woodType);
    const shrineCount = ShrineUpgradePool.calculate(effectType,CalculateType.Count, woodType);
    return upgradeCount + blacksmithCount + levelCount + shrineCount;
}
