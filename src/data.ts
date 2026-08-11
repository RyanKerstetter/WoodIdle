import { FileData } from "./files.js";
import { GameData } from "./game_data.js";
import { BlacksmithCalculator, UpgradeCalculator } from "./multipliers.js";
import { formatString } from "./util.js";

export enum EquipLocation {
    Axe = "axe",
    Gloves = "gloves",
}

export enum AreaType {
    Forest = "Forest",
    Meadow = "Meadow",
    Tundra = "Tundra",
    Desert = "Desert",
    Swamp = "Swamp",
}

export enum WoodType {
    Oak = "oak",
    Birch = "birch",
    Pine = "pine",
    Palm = "palm",
    Mahogany = "mahogany",
    Singularitree = "singularitree",
} 

export enum CostType {
    Gold = "gold",
    PrestigeTokens = "prestige_tokens",
}

export function formatCostType(type: CostType){
    switch(type){
        case CostType.Gold:
            return "Gold";
        case CostType.PrestigeTokens:
            return "Prestige Tokens";
    }
}

export enum EffectType {
    WorkerCount = "worker_count",
    ChopDamage = "chop_damage",
    ChopYield = "chop_yield",
    SellPrice = "sell_price",
    TreeHealth = "tree_health",
}

export enum ApplyType {
    Additive = "additive",
    Multiplicative = "multiplicative",
    Flat = "flat",
}

export enum BuildingType {
    Blacksmith = "Blacksmith",
    Library = "Library",
    Workshop = "Workshop",
}

export class Effect {
    // This can be one of these:
    // chopping_speed, wood_per_chop, sell_price, prestige_token_gain
    type: EffectType;
    value: number;
    // This can be one of these:
    // general, oak, birch, pine etc
    // general applies to all wood types, while specific ones only apply to that type
    wood_type: WoodType | null;
    upgrade_id: string; 
    // This can be "multiplicative" or "additive". 
    // This relates to how the upgrade stacks on itself.
    // Multiplicative means it multiplies with itself (e.g. 1.1 * 1.1 = 1.21),
    // Additive means it adds to itself (e.g. 1.1 + 0.1 = 1.2)
    // Flat means it doesn't add / subtract 1 at the start (e.g .1 + .1 = .2) used for values that aren't multipliers
    apply_type: ApplyType = ApplyType.Additive;

    constructor(data: any, upgrade_id: string) {
        this.type = data.type;
        this.value = data.value;
        if(data.wood_type) {
            if(data.wood_type === "general")
                this.wood_type = null;
            else
                this.wood_type = data.wood_type;
        } else {
            this.wood_type = null;
        }
        this.upgrade_id = upgrade_id;
        this.apply_type = data.apply_type || ApplyType.Additive; // Default to additive if not specified
    }

    computeValue(): number {
        const upgradeLevel = this.getLevel();
        return this.computeValueAt(upgradeLevel);
    }

    // This lets you compute a multiplier for a specific level
    // This is used when calculating the display percentages
    computeValueAt(level: number): number {
        if (this.apply_type === ApplyType.Additive)
            return (this.value - 1) * level + 1; // Convert to additive, then back to multiplicative
        if(this.apply_type === ApplyType.Flat){
            return this.value * level;
        }
        return this.value ** level; // Multiplicative stacking
    }

    match(effectType: EffectType, woodType: WoodType | null): boolean {
        return this.type === effectType && (this.wood_type === woodType || this.wood_type === null);
    }

    getLevel() : number {
        const upgradeLevel = GameData.upgrades[this.upgrade_id] || 0;
        return upgradeLevel;
    }
}

export class EffectData {
    type: EffectType;
    value: number;
    wood_type: WoodType | null;
    apply_type: ApplyType;

    constructor(data: any) {
        this.type = data.type;
        this.value = data.value;
        this.wood_type = data.wood_type;
        this.apply_type = data.apply_type;
    }
}

export class Requirement {
    id: string;
    amount: number;
    constructor(id: string, amount: number) {
        this.id = id;
        this.amount = amount;
    }

    isMet(): boolean {
        return (GameData.upgrades[this.id] || 0) >= this.amount;
    }
}

export class Upgrade {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    apply(): boolean {
        GameData.upgrades[this.id] = (GameData.upgrades[this.id] || 0) + 1;
        return true;
    }
}

export class CostUpgrade extends Upgrade {
    cost: number;
    costType: CostType;
    constructor(id: string, cost: number, costType: CostType) {
        super(id);
        this.cost = cost;
        this.costType = costType;
    }

    apply(): boolean {
        if (this.costType === CostType.Gold) {
            if (GameData.gold >= this.cost) {
                GameData.gold -= this.cost;
                super.apply();
                return true;
            }
        } else if (this.costType === CostType.PrestigeTokens) {
            if (GameData.prestige_tokens >= this.cost) {
                GameData.prestige_tokens -= this.cost;
                super.apply();
                return true;
            }
        }
        return false;
    }

    canAfford(): boolean {
        if (this.costType === CostType.Gold) {
            return GameData.gold >= this.cost;
        } else if (this.costType === CostType.PrestigeTokens) {
            return GameData.prestige_tokens >= this.cost;
        }
        return false;
     }
}

export class CompoundingUpgrade extends Upgrade {
    baseCost: number;
    multiplier: number;
    costType: CostType;
    constructor(id: string, baseCost: number, multiplier: number, costType: CostType) {
        super(id);
        this.baseCost = baseCost;
        this.multiplier = multiplier;
        this.costType = costType;
    }

    getCost(): number {
        const level = GameData.upgrades[this.id] || 0;
        //console.log(this);
        return this.baseCost * (this.multiplier ** level);
    }

    canAfford(): boolean {
        const cost = this.getCost();
        if (this.costType == CostType.Gold) {
            return GameData.gold >= cost;
        } else if (this.costType == CostType.PrestigeTokens) {
            return GameData.prestige_tokens >= cost;
        }
        return false;
    }

    apply(): boolean {
        const cost = this.getCost();
        if (this.costType === CostType.Gold) {
            if (GameData.gold >= cost) {
                GameData.gold -= cost;
                super.apply();
                return true;
            }
        } else if (this.costType === CostType.PrestigeTokens) {
            if (GameData.prestige_tokens >= cost) {
                GameData.prestige_tokens -= cost;
                super.apply();
                return true;
            }
        }
        return false;
    }
}

export class BlacksmithUpgradeData {
    name: string;
    upgrade_id: string;
    description: string
    cost: number;
    cost_type: CostType;
    equip_location: EquipLocation;
    effects: Effect[];
    requirements: Requirement[];
    cost_upgrade: CostUpgrade;
    icon_path: string;

    constructor(data: any) {
        this.name = data.name;
        this.upgrade_id = data.upgrade_id;
        this.description = data.description;
        this.cost = data.cost;
        this.cost_type = data.cost_type;
        this.equip_location = data.equip_location;
        this.effects = data.effects.map((effectData: any) => new Effect(effectData, data.upgrade_id));
        this.effects.map((effect:Effect) => BlacksmithCalculator.addUpgrade(effect, this.equip_location));
        this.icon_path = data.icon_path;
        if(data.requirements) {
            this.requirements = data.requirements.map((reqData: any) => new Requirement(reqData.id, reqData.amount));
        } else {
            this.requirements = [];
        }
        this.cost_upgrade = new CostUpgrade(data.upgrade_id, data.cost, data.cost_type);
    }
}

export class AreaUpgrades {
    chop_speed_upgrade: AreaUpgradeData;
    chop_yield_upgrade: AreaUpgradeData;
    log_sell_price_upgrade: AreaUpgradeData;
    bulk_chop_upgrade: AreaUpgradeData;

    constructor(data: any) {
        this.chop_speed_upgrade = new AreaUpgradeData(data.chop_speed_upgrade);
        this.chop_yield_upgrade = new AreaUpgradeData(data.chop_yield_upgrade);
        this.log_sell_price_upgrade = new AreaUpgradeData(data.log_sell_price_upgrade);
        this.bulk_chop_upgrade = new AreaUpgradeData(data.bulk_chop_upgrade);
    }
}

export class WoodData {
    name: string;
    base_tree_health: number;
    base_chop_yield: number;
    base_sell_price: number;

    constructor(data: any) {
        this.name = data.name;
        this.base_tree_health = data.base_tree_health;
        this.base_chop_yield = data.base_chop_yield;
        this.base_sell_price = data.base_sell_price;
    }
}


export class AreaData {
    name: string;
    description: string;
    wood: WoodData;
    building: BuildingType;

    constructor(data: any) {
        this.name = data.name;
        this.description = data.description;
        this.wood = new WoodData(data.wood);
        this.building = data.building;
    }
}

export class Custom { // This is used to set values from a json config
    id: string;
    value: number;

    constructor(data: any) {
        this.id = data.id;
        this.value = data.value;
    }

    apply() {
        GameData.upgrades[this.id] = this.value;
    }
}

export class LevelData {
    level: number;
    required_chops: number;
    description: string;
    effects: Effect[];
    custom?: Custom;

    constructor(data: any) {
        this.level = data.level;
        this.required_chops = data.required_chops;
        this.effects = data.effects.map((effectData: any) => new Effect(effectData, `prestige_level_${data.level}`));
        this.description = data.description;
        if(data.custom) {
            this.custom = new Custom(data.custom);
        }
    }
}

export class AreaUpgradeData {
    worker_upgrade: IndividualAreaUpgradeData;
    chop_damage_upgrade: IndividualAreaUpgradeData;
    chop_yield_upgrade: IndividualAreaUpgradeData;
    log_sell_price_upgrade: IndividualAreaUpgradeData;
    bulk_chop_upgrade: IndividualAreaUpgradeData;

    constructor(data: any) {
        this.worker_upgrade = new IndividualAreaUpgradeData(data.worker_upgrade);
        this.chop_damage_upgrade = new IndividualAreaUpgradeData(data.chop_damage_upgrade);
        this.chop_yield_upgrade = new IndividualAreaUpgradeData(data.chop_yield_upgrade);
        this.log_sell_price_upgrade = new IndividualAreaUpgradeData(data.log_sell_price_upgrade);
        this.bulk_chop_upgrade = new IndividualAreaUpgradeData(data.bulk_chop_upgrade);
    }
}

export class AreaUpgrade extends CompoundingUpgrade{
    effects: Effect[];
    constructor(id: string, baseCost: number, multiplier: number, costType: CostType,effects: Effect[]) {
        super(id,baseCost,multiplier,costType);
        this.baseCost = baseCost;
        this.multiplier = multiplier;
        this.costType = costType;
        this.effects = effects;
    }
}

export class IndividualAreaUpgradeData {
    name: string;
    description: string;
    upgrade_id: string;
    base_costs: BaseCosts;
    effects: EffectData[];
    cost_multiplier: number;
    display_multiplier: number;
    upgrades: Record<AreaType,AreaUpgrade>;
    constructor(data: any) {
        this.name = data.name;
        this.description = data.description;
        this.upgrade_id = data.upgrade_id;
        this.effects = data.effects.map((effectData: any) => new EffectData(effectData));
        // These effects should never be touched. They only exist b
        this.cost_multiplier = data.cost_multiplier;
        console.log(data.base_costs)
        this.base_costs = new BaseCosts(data.base_costs);
        this.display_multiplier = data.display_multiplier;

        this.upgrades = {} as Record<AreaType, AreaUpgrade>;

        for(const area of Object.values(AreaType)){
            const wood =  FileData.area_to_wood[area];
            const replacementContext = {
                wood: wood || "unknown",
            };
            
            const upgradeId = formatString(this.upgrade_id, replacementContext);
            const effects: Effect[] = this.effects.map((effect: EffectData) => { 
                const e = new Effect(effect,upgradeId);
                e.wood_type = wood;
                return e;
            });
            effects.map((effect:Effect) => UpgradeCalculator.addEffect(effect));
            this.upgrades[area] = new AreaUpgrade(upgradeId,this.getBaseCost(area),this.cost_multiplier,CostType.Gold,effects);
        }
    }

    getBaseCost(area: AreaType): number {
        return this.base_costs.getCost(area);
    }

    getCurrentCost(area: AreaType): number {
        const replacementContext = {
            wood: FileData.area_to_wood[area] || "unknown",
        };
        const upgradeId = formatString(this.upgrade_id, replacementContext);
        console.log(this.upgrade_id,upgradeId,replacementContext);
        const level = GameData.upgrades[upgradeId] || 0;
        return this.getBaseCost(area) * (this.cost_multiplier ** level);
    }

    getUpgrade(area: AreaType): AreaUpgrade {
        return this.upgrades[area];
    }


}

export class BaseCosts {
    forest: number;
    meadow: number;
    tundra: number;
    desert: number;
    swamp: number;

    constructor(data: any) {
        this.forest = data.forest;
        this.meadow = data.meadow;
        this.tundra = data.tundra;
        this.desert = data.desert;
        this.swamp = data.swamp;
    }

    getCost(area: AreaType): number {
        console.log(area,this);
        switch(area) {
            case AreaType.Forest:
                return this.forest;
            case AreaType.Meadow:
                return this.meadow;
            case AreaType.Tundra:
                return this.tundra;
            case AreaType.Desert:
                return this.desert;
            case AreaType.Swamp:
                return this.swamp;
        }
    }
}