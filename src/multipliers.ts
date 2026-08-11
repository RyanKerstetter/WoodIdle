import {GameData} from "./game_data.js";
import { FileData } from "./files.js";
import { EffectType, WoodType, ApplyType, EquipLocation, Effect, BlacksmithUpgradeData, LevelData } from "./data.js";
import { formatString } from "./util.js";


// This handles all of the upgrades that are trivially computed from the map of upgrades in GameData.
// This can't handle more complex logic like specific active items since it is either on or off based on the presence of the upgrade
export const UpgradeCalculator = {
    effects: [] as Effect[],

    addEffect(effect: Effect) {
        this.effects.push(effect);
    },

    calculate(effectType: EffectType, woodType: WoodType | null = null): number {
        let totalValue = 1;
        for (const effect of this.effects) {
            if (effect.type === effectType && (effect.wood_type === woodType || effect.wood_type === null)) {
                totalValue *= effect.computeValue();
            }
        }
        return totalValue;
    }
}

function initializeUpgradeCalculator() {

    FileData.areas.forEach((area: any) => {
        const woodNameLower = area.wood.name.toLowerCase();

        const replacementContext = {
            wood: woodNameLower,
        };
        
        const chopSpeedName = formatString(FileData.area_upgrade_data.chop_damage_upgrade.upgrade_id, replacementContext);
        const chopSpeedEffect = new Effect(FileData.area_upgrade_data.chop_damage_upgrade.effects[0], chopSpeedName);
        UpgradeCalculator.addEffect(chopSpeedEffect);
        const chopYieldName = formatString(FileData.area_upgrade_data.chop_yield_upgrade.upgrade_id, replacementContext);
        const chopYieldEffect = new Effect(FileData.area_upgrade_data.chop_yield_upgrade.effects[0], chopYieldName);
        UpgradeCalculator.addEffect(chopYieldEffect);
        const logSellPriceName = formatString(FileData.area_upgrade_data.log_sell_price_upgrade.upgrade_id, replacementContext);
        const logSellPriceEffect = new Effect(FileData.area_upgrade_data.log_sell_price_upgrade.effects[0], logSellPriceName);
        UpgradeCalculator.addEffect(logSellPriceEffect);
        
        const bulkChopName = formatString(FileData.area_upgrade_data.bulk_chop_upgrade.upgrade_id, replacementContext);
        const bulkChopEffect1 = new Effect(FileData.area_upgrade_data.bulk_chop_upgrade.effects[0], bulkChopName);
        const bulkChopEffect2 = new Effect(FileData.area_upgrade_data.bulk_chop_upgrade.effects[1], bulkChopName);
        UpgradeCalculator.addEffect(bulkChopEffect1);
        UpgradeCalculator.addEffect(bulkChopEffect2);
    });
}

function initializeBlacksmithCalculator() {
    FileData.blacksmith.forEach((upgrade: BlacksmithUpgradeData) => {
        upgrade.effects.forEach((effect: any) => {
            const effectObj = new Effect(effect, upgrade.upgrade_id);
            BlacksmithCalculator.addUpgrade(effectObj, upgrade.equip_location);
        });
    });
}


// This handles the upgrades from the blacksmith. 
// It only uses the effect of the latest upgrade for a type
export const BlacksmithCalculator = {
    axe_effects: [] as Effect[],
    gloves_effects: [] as Effect[],
    // etc for other equipment types


    addUpgrade(effect: Effect, equipLocation: EquipLocation) {
        switch(equipLocation) {
            case EquipLocation.Axe:
                this.axe_effects.push(effect);
                break;
            case EquipLocation.Gloves:
                this.gloves_effects.push(effect);
                break;
            // etc for other equipment types
        }
    },

    calculate(effectType: EffectType, woodType: WoodType | null = null, equipLocation: EquipLocation | null = null ): number {
        let totalValue = 1;
        if(equipLocation === null) {
            const locations = Object.values(EquipLocation);
            for(const location of locations) {
                totalValue *= this.calculate(effectType, woodType, location);
            }
            return totalValue;
        }
        
        let effectsToCheck: Effect[] = [];
        switch(equipLocation) {
            case EquipLocation.Axe:
                effectsToCheck = this.axe_effects;
                break;
            case EquipLocation.Gloves:
                effectsToCheck = this.gloves_effects;
                break;
            // etc for other equipment types
        }
        for (const effect of effectsToCheck) {
            if(effect.match(effectType, woodType)) {
                const value = effect.computeValue()
                totalValue = Math.max(totalValue, value); // Take the best upgrade for each type
            }
        }
        return totalValue;
    }

}

export const LevelCalculator = {

    calculate(effectType: EffectType,woodType: WoodType | null = null): number {
        var mult = 1;
        for(const indexType of Object.values(WoodType)) {
            const chopped = GameData.chop_count[indexType] || 0;
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
                        mult *= effect.computeValueAt(1); // It never goes above 1
                    }
                }
                if(levelData.custom) {
                    levelData.custom.apply();
                }

            }
        }
        return mult;
        
    }

}

export function computeMultiplier(effectType: EffectType, woodType: WoodType | null = null): number {
    var value = 1;

    const upgradeMultiplier = UpgradeCalculator.calculate(effectType, woodType);
    const blacksmithMultiplier = BlacksmithCalculator.calculate(effectType, woodType);
    const levelMultiplier = LevelCalculator.calculate(effectType, woodType);
    return value * upgradeMultiplier * blacksmithMultiplier * levelMultiplier;
}


export function initializeMultipliers() {
    //initializeUpgradeCalculator();
    //initializeBlacksmithCalculator();
}