import { GameData } from "./game_data.js";
import { FileData, findShrineNode,} from "./files.js";
import { UpdateManager } from "./update_manager.js";
import { computeMultiplier } from "./multipliers.js";
import {
    ShrineNode,
    ShrineConnection,
    AreaData,
    BlacksmithUpgradeData,
    EffectType,
    LevelData,
    WoodType,
    CompoundingUpgrade,
    Requirement,
    IndividualAreaUpgradeData,
    AreaType,
    formatCostType,
} from "./data.js";
import { formatString } from "./util.js";
import { applyDamage } from "./game.js";

export function iconHtml(
    name: string,
    alt: string = "",
    size: number = 24,
): string {
    return `<img src="res/${name}" alt="${alt}" width="${size}" height="${size}" class="icon" />`;
}

export function formatNumber(num: number): string {
    if (num >= 1e36) {
        return num.toExponential(2);
    }
    if (num < 100) {
        if (num == Math.floor(num)) {
            // If the number is an integer, return it without decimal places
            return num.toString();
        }
        return num.toFixed(1); // e.g., 12.34 -> "12.3", 50 -> "50.0" (3 sig figs)
    }
    if (num < 10) {
        return num.toFixed(2); // e.g., 5 -> "5.00", 9.5 -> "9.50" (3 sig figs)
    }

    const thresholds = [
        { value: 1e33, suffix: "Dc" },
        { value: 1e30, suffix: "No" },
        { value: 1e27, suffix: "Oc" },
        { value: 1e24, suffix: "Sp" },
        { value: 1e21, suffix: "Sx" },
        { value: 1e18, suffix: "Qi" },
        { value: 1e15, suffix: "Qa" },
        { value: 1e12, suffix: "T" },
        { value: 1e9, suffix: "B" },
        { value: 1e6, suffix: "M" },
    ];

    for (const tier of thresholds) {
        if (num >= tier.value) {
            return (num / tier.value).toFixed(2) + tier.suffix;
        }
    }

    return Math.floor(num).toLocaleString();
}

function render_blacksmith_upgrade(
    upgrade: BlacksmithUpgradeData,
): HTMLElement {
    const upgradeElement = document.createElement("div");
    upgradeElement.classList.add("upgrade");

    const initialCost = upgrade.cost_upgrade
        ? upgrade.cost_upgrade.cost
        : upgrade.cost;
    const initialCostType = upgrade.cost_upgrade
        ? upgrade.cost_upgrade.costType
        : upgrade.cost_type;

    upgradeElement.innerHTML = `
        <div class="upgrade-card">
            ${iconHtml("blacksmith/" + upgrade.icon_path, "", 48)}
            <div class="upgrade-info">
                <span class="upgrade-name">${upgrade.name}</span>
                <span class="upgrade-description">${upgrade.description}</span>
            </div>
            <button class="upgrade-cost">
                ${formatNumber(initialCost)} ${initialCostType}
            </button>
        </div>
    `;

    const costButton =
        upgradeElement.querySelector<HTMLButtonElement>(".upgrade-cost");

    UpdateManager.registerUpdate("tick", () => {
        if (!costButton) return;

        const upgradeId = upgrade.upgrade_id;
        const isPurchased = (GameData.upgrades[upgradeId] || 0) > 0;

        // Handle Purchased State
        if (isPurchased) {
            costButton.textContent = "Purchased";
            costButton.disabled = true;
            costButton.classList.remove("can-afford");
            costButton.classList.add("cannot-afford", "purchased");
            return;
        }

        // Handle Affordability State
        const canAfford = upgrade.cost_upgrade
            ? upgrade.cost_upgrade.canAfford()
            : GameData.gold >= upgrade.cost;

        const currentCost = upgrade.cost;
        const currentCostType = upgrade.cost_type;

        costButton.textContent = `${formatNumber(currentCost)} ${formatCostType(currentCostType)}`;
        costButton.disabled = !canAfford;
        costButton.classList.toggle("can-afford", canAfford);
        costButton.classList.toggle("cannot-afford", !canAfford);
    });

    upgradeElement.onclick = () => {
        const upgradeId = upgrade.upgrade_id;
        if (GameData.upgrades[upgradeId]) return; // Already purchased

        if (upgrade.cost_upgrade) {
            if (upgrade.cost_upgrade.canAfford()) {
                upgrade.cost_upgrade.apply();
            }
        } else if (GameData.gold >= upgrade.cost) {
            GameData.gold -= upgrade.cost;
            GameData.upgrades[upgradeId] = 1;
        }
        UpdateManager.triggerAllUpdates();
    };

    return upgradeElement;
}

export function render_level_upgrade(
    level: LevelData,
    wood: WoodType,
): HTMLElement {
    const levelElement = document.createElement("div");
    levelElement.classList.add("level-card-wrapper");

    const formattedWood = wood.charAt(0).toUpperCase() + wood.slice(1);
    const description = level.description || "No description available";

    levelElement.innerHTML = `
        <div class="upgrade-card">
            <div class="upgrade-info">
                <span class="upgrade-name">${formattedWood} Level ${level.level}</span>
                <span class="upgrade-description">${description}</span>
            </div>
            <div class="level-status-box">${formatNumber(level.required_chops)} Chops</div>
        </div>
    `;

    const card = levelElement.querySelector(".upgrade-card") as HTMLElement;
    const statusText = levelElement.querySelector(
        ".level-status-box",
    ) as HTMLElement;

    // Real-time update for unlocked state
    UpdateManager.registerUpdate("tick", () => {
        const currentChops = GameData.chop_count[wood] || 0;
        const isUnlocked = currentChops >= level.required_chops;

        if (statusText) {
            statusText.classList.toggle("unlocked", isUnlocked);
            statusText.classList.toggle("locked", !isUnlocked);
        }

        if (statusText) {
            if (isUnlocked) {
                statusText.textContent = "Unlocked";
            } else {
                statusText.textContent = `${formatNumber(level.required_chops)}`;
            }
        }
    });

    return levelElement;
}

function render_area_upgrade(
    upgrade: IndividualAreaUpgradeData,
    area: AreaType,
): HTMLElement {
    const upgradeElement = document.createElement("div");
    upgradeElement.classList.add("upgrade");

    const replacementContext = {
        wood: FileData.area_to_wood[area] || "unknown",
    };
    const name = formatString(upgrade.name, replacementContext);
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const cost = upgrade.getUpgrade(area).getCost();
    const effect = upgrade.getUpgrade(area).effects[0];
    if (!effect) return upgradeElement;
    const level = effect?.getLevel() || 0;
    const value = effect?.computeValueAt(level) || 0;
    const next_value = effect?.computeValueAt(level + 1) || 1;

    upgradeElement.innerHTML = `
        <div class="upgrade-card">
            <span class="upgrade-count">${level}</span>
            <p class="upgrade-name">${formattedName}</p>
            <p class="upgrade-effect">${formatNumber(value)}x &gt; ${formatNumber(next_value)}x</p>
            <button class="upgrade-cost">${formatNumber(cost)} Gold</button>
        </div>
    `;
    const costButton =
        upgradeElement.querySelector<HTMLButtonElement>(".upgrade-cost");
    const effectElement = upgradeElement.querySelector(".upgrade-effect");
    const levelElement = upgradeElement.querySelector(".upgrade-count");
    if (!costButton || !effectElement || !levelElement) return upgradeElement;

    UpdateManager.registerUpdate("tick", () => {
        const upgradeInstance = upgrade.getUpgrade(area);
        const cost = upgradeInstance.getCost();
        const canAfford = upgradeInstance.canAfford();

        costButton.textContent = `${formatNumber(cost)} Gold`;
        costButton.disabled = !canAfford;

        // Toggle affordability classes
        costButton.classList.toggle("can-afford", canAfford);
        costButton.classList.toggle("cannot-afford", !canAfford);
    });

    upgradeElement.onclick = () => {
        upgrade.getUpgrade(area).apply();

        const cost = upgrade.getUpgrade(area).getCost();
        const effect = upgrade.getUpgrade(area).effects[0];
        if (!effect) return;
        const new_level = effect.getLevel() || 0;
        const new_value = effect.computeValueAt(new_level) || 1;
        const new_next_value = effect.computeValueAt(new_level + 1) || 1;

        costButton.textContent = `${formatNumber(cost)} Gold`;
        levelElement.textContent = `${new_level}`;
        effectElement.textContent = `${formatNumber(new_value)}x > ${formatNumber(new_next_value)}x`;
        UpdateManager.triggerAllUpdates();
    };
    return upgradeElement;
}

function render_blacksmith() {
    var blacksmith = document.getElementById("blacksmith");
    if (!blacksmith) return;

    var blacksmithTitle = document.createElement("h2");
    blacksmithTitle.classList.add("blacksmith-title");
    blacksmithTitle.innerText = "Blacksmith";
    blacksmith.appendChild(blacksmithTitle);

    var last_equipment = "None";
    var previousUpgrade: BlacksmithUpgradeData | null = null;
    FileData.blacksmith.forEach((upgradeData: BlacksmithUpgradeData) => {
        const key = `${upgradeData.equip_location}_unlocked`;
        if (upgradeData.equip_location != last_equipment) {
            const title = document.createElement("h3");
            title.classList.add("equipment-title");
            title.innerText =
                upgradeData.equip_location.charAt(0).toUpperCase() +
                upgradeData.equip_location.slice(1);

            blacksmith?.appendChild(title);
            last_equipment = upgradeData.equip_location;
            // This checks if the equip location is unlocked and changes it from hidden if it is.
            UpdateManager.registerUpdate("tick", () => {
                const isUnlocked: boolean = !!GameData.upgrades[key];
                title.classList.toggle("hidden", !isUnlocked);
            });
            previousUpgrade = null;
        }

        const upgradeElement = render_blacksmith_upgrade(upgradeData);
        blacksmith?.appendChild(upgradeElement);

        const currentPrevious = previousUpgrade;

        UpdateManager.registerUpdate("tick", () => {
            const isLocationUnlocked: boolean = !!GameData.upgrades[key];
            const isPreviousUnlocked: boolean =
                currentPrevious == null ||
                !!GameData.upgrades[currentPrevious.upgrade_id];

            upgradeElement.classList.toggle(
                "hidden",
                !(isLocationUnlocked && isPreviousUnlocked),
            );
        });
        previousUpgrade = upgradeData;
    });
}

const shrine_camera_pos = {
    // This is how the user can pan around the shrine
    x: 0 as number,
    y: 0 as number,
};
let shrine_zoom = 1/5;

function render_shrine() {
    const shrine = document.querySelector("#shrine");
    if (!shrine) return;

    const shrine_top_section = document.createElement("div");
    shrine_top_section.innerHTML = `
        <h2>Shrine</h2>
        <div style="display: flex;flex-direction: row;">
            <div style="display: flex;flex-direction: column;">
                <p>Total Earnings: 1</p>
                <p>Prestige Tokens: 1</p>
            </div>
            <button class="upgrade-count">Prestige</button>
        </div>
    `;
    shrine?.appendChild(shrine_top_section);

    const shrine_canvas = document.createElement("canvas") as HTMLCanvasElement;

    shrine_canvas.id = "shrine-canvas";
    shrine?.appendChild(shrine_canvas);
    const resizeCanvas = () => {
        const rect = shrine_canvas.getBoundingClientRect();
        const w = rect.width || shrine.clientWidth || 800;
        const h =
            rect.height ||
            shrine.clientHeight - shrine_top_section.clientHeight ||
            600;
        shrine_canvas.width = w;
        shrine_canvas.height = Math.max(h, 800);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const ctx = shrine_canvas.getContext("2d");
    let isDragging = false;

    const iconCache = new Map<string, HTMLImageElement>();

    FileData.shrine_nodes.forEach((node: ShrineNode) => {
        if (node.icon && !iconCache.has(node.icon)) {
            const img = new Image();
            img.src = "res/shrine/" + node.icon;
            iconCache.set(node.icon, img);
        }
    });

    function draw() {
        if (!ctx) return;
        ctx.fillStyle = "#181818";
        ctx.clearRect(0, 0, shrine_canvas.width, shrine_canvas.height);
        ctx.save();
        ctx.translate(shrine_camera_pos.x, shrine_camera_pos.y);
        ctx.scale(shrine_zoom, shrine_zoom);
        FileData.shrine_connections.forEach((connection:ShrineConnection) => {
            const from:ShrineNode | undefined = findShrineNode(connection.from_node_id);
            const to  : ShrineNode | undefined = findShrineNode(connection.to_node_id);
            if(!from || !to) return;
            ctx.beginPath();
            ctx.moveTo(from?.position.x + 45,from?.position.y+45);
            ctx.lineTo(to?.position.x + 45, to?.position.y + 45);
            ctx.strokeStyle = "#4e9f3d"; // Line color
            ctx.lineWidth = 4;           // Line thickness in pixels
            ctx.lineCap = "round";
            ctx.stroke();
        });
        FileData.shrine_nodes.forEach((node: ShrineNode) => {
            ctx.fillRect(node.position.x, node.position.y, 90, 90);
            if (node.icon) {
                const img = iconCache.get(node.icon);
                // Ensure image exists and finish loading before drawing
                if (img && img.complete && img.naturalWidth !== 0) {
                    // Offset by 10px padding, rendered at 70x70 inside the 90x90 box
                    ctx.drawImage(img, node.position.x + 10, node.position.y + 10, 70, 70);
                }
            }
        });
        
        ctx.restore();
        requestAnimationFrame(draw);
    }

    // Dragging / Pan Listener
    let startX = 0;
    let startY = 0;

    shrine_canvas.addEventListener("pointerdown", (e) => {
        isDragging = true;
        startX = e.clientX - shrine_camera_pos.x;
        startY = e.clientY - shrine_camera_pos.y;

        shrine_canvas.style.cursor = "grabbing";
        shrine_canvas.setPointerCapture(e.pointerId);
    });

    shrine_canvas.addEventListener("pointermove", (e) => {
        if (!isDragging) return;

        shrine_camera_pos.x = e.clientX - startX;
        shrine_camera_pos.y = e.clientY - startY;
    });

    // Scroll Wheel Zoom Listener
    shrine_canvas.addEventListener(
        "wheel",
        (e: WheelEvent) => {
            e.preventDefault();

            // 1. Get mouse position relative to canvas top-left corner
            const rect = shrine_canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 2. Set zoom factor (Scroll UP = zoom in > 1, Scroll DOWN = zoom out < 1)
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

            // 3. Pivot camera offset around the mouse position
            shrine_camera_pos.x =
                mouseX - (mouseX - shrine_camera_pos.x) * zoomFactor;
            shrine_camera_pos.y =
                mouseY - (mouseY - shrine_camera_pos.y) * zoomFactor;

            // 4. Update global zoom level
            shrine_zoom *= zoomFactor;
        },
        { passive: false },
    );

    // Stop Dragging
    function stopDrag(e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;
        shrine_canvas.style.cursor = "grab";
        shrine_canvas.releasePointerCapture(e.pointerId);
    }

    shrine_canvas.addEventListener("pointerup", stopDrag);
    shrine_canvas.addEventListener("pointercancel", stopDrag);

    // 4. Start the loop
    requestAnimationFrame(draw);
}

function render_area_selector() {
    var areaSelector: HTMLElement | null =
        document.getElementById("area_selector");
    if (!areaSelector) return;
    areaSelector.innerHTML = "";

    FileData.areas.forEach((area: AreaData) => {
        const areaElement = document.createElement("div");
        areaElement.classList.add("area-option");
        areaElement.textContent = area.name;

        areaSelector?.appendChild(areaElement);
        var requirement: Requirement | undefined = undefined;
        if (area.name != "Forest") {
            requirement = new Requirement(
                `${area.name.toLowerCase()}_unlocked`,
                1,
            );
        }

        areaElement.onclick = () => {
            if (requirement && !requirement.isMet()) return; // Not unlocked yet
            console.log(`Setting to ${area.name}`);
            GameData.selected_area = area.name as AreaType;
            const sidebar = area.building;
            FileData.areas.forEach((area: AreaData) => {
                const building = area.building;
                const element = document.querySelector(
                    `#${building.toLowerCase()}`,
                );
                console.log(element);
                element?.classList.toggle("hidden", building != sidebar);
            });
            UpdateManager.triggerUpdates("tick");
        };
    });
}

function render_levels() {
    const levelElement = document.getElementById("levels");
    const levelList = document.getElementById("level-list");
    if (!levelElement || !levelList) return;
    FileData.areas.forEach((area: AreaData) => {
        const levelContainer = document.createElement("div");
        const wood: WoodType = area.wood.name as WoodType;
        levelContainer.id = `${wood}-levels`;
        levelList.appendChild(levelContainer);
        const levelData: LevelData[] = FileData.wood_levels[wood] || [];
        levelData.forEach((l: LevelData) => {
            const levelCard = render_level_upgrade(
                l,
                area.wood.name as WoodType,
            );
            levelContainer.appendChild(levelCard);
        });
        UpdateManager.registerUpdate("tick", () => {
            levelContainer.classList.toggle(
                "hidden",
                GameData.selected_area != area.name,
            );
        });
    });
}

function render_area_upgrades() {
    const areaUpgradeElement = document.getElementById("area-upgrades");
    if (!areaUpgradeElement) return;
    areaUpgradeElement.innerHTML = "";

    FileData.areas.forEach((area: AreaData) => {
        const areaType = area.name as AreaType;
        const woodName = area.wood.name.toLowerCase();
        const areaUpgradeContainer = document.createElement("div");
        areaUpgradeContainer.id = `${woodName}-levels`;
        areaUpgradeContainer.classList.add("hidden");
        areaUpgradeElement.appendChild(areaUpgradeContainer);

        const render1 = render_area_upgrade(
            FileData.area_upgrade_data.worker_upgrade,
            areaType,
        );
        const render2 = render_area_upgrade(
            FileData.area_upgrade_data.chop_damage_upgrade,
            areaType,
        );
        const render3 = render_area_upgrade(
            FileData.area_upgrade_data.chop_yield_upgrade,
            areaType,
        );
        const render4 = render_area_upgrade(
            FileData.area_upgrade_data.log_sell_price_upgrade,
            areaType,
        );
        const render5 = render_area_upgrade(
            FileData.area_upgrade_data.bulk_chop_upgrade,
            areaType,
        );

        areaUpgradeContainer.appendChild(render1);
        areaUpgradeContainer.appendChild(render2);
        areaUpgradeContainer.appendChild(render3);
        areaUpgradeContainer.appendChild(render4);
        areaUpgradeContainer.appendChild(render5);

        UpdateManager.registerUpdate("tick", () => {
            areaUpgradeContainer.classList.toggle(
                "hidden",
                GameData.selected_area != area.name,
            );
        });
    });
}

function canvas_on_click(x: number, y: number) {
    const currentArea = GameData.selected_area;
    const wood = FileData.area_to_wood[currentArea];
    const damage = computeMultiplier(EffectType.ChopDamage, wood);

    applyDamage(wood, damage);
    UpdateManager.triggerAllUpdates();
}

function render_main() {
    const goldElement: HTMLElement | null = document.getElementById("gold");
    const prestigeTokenElement: HTMLElement | null =
        document.getElementById("prestige-tokens");
    const treeElement: HTMLElement | null =
        document.getElementById("wood_canvas");
    if (!goldElement || !prestigeTokenElement) return;

    const thunkSound = new Audio("res/thunk.wav");
    thunkSound.preload = "auto";

    if (treeElement) {
        treeElement.addEventListener("click", (event) => {
            const clone = thunkSound.cloneNode() as HTMLAudioElement;
            clone.currentTime = 0;
            clone.play().catch(() => undefined);
            canvas_on_click(event.x, event.y);
        });
    }
    UpdateManager.registerUpdate("tick", () => {
        if (!goldElement || !prestigeTokenElement) return;
        goldElement.innerText = `${formatNumber(GameData.gold)}`;
        prestigeTokenElement.innerText = `${formatNumber(GameData.prestige_tokens)}`;
    });

    const woodTypeBox: HTMLElement | null =
        document.getElementById("wood-type-box");

    const healthRatio: HTMLElement | null =
        document.getElementById("health-ratio");
    const woodCount: HTMLElement | null = document.getElementById("wood-count");
    const chopSpeed: HTMLElement | null = document.getElementById("chop-speed");
    const sellPrice: HTMLElement | null = document.getElementById("sell-price");
    const profit: HTMLElement | null = document.getElementById("profit");

    const progressBarLevel: HTMLElement | null =
        document.getElementById("level-progress-bar");
    const progressTextRatio: HTMLElement | null = document.getElementById(
        "level-progress-text",
    );
    const progressTextLevel: HTMLElement | null =
        document.getElementById("level-target-text");
    const progressBarChop: HTMLElement | null =
        document.getElementById("chop-progress-bar");
    if (
        !progressBarLevel ||
        !progressTextRatio ||
        !progressTextLevel ||
        !progressBarChop ||
        !healthRatio ||
        !woodCount ||
        !chopSpeed ||
        !sellPrice ||
        !profit ||
        !woodTypeBox
    ) {
        console.log("failed to render progress bar");
        return;
    }

    UpdateManager.registerUpdate("tick", () => {
        const currentArea = GameData.selected_area;
        FileData.areas.forEach((value: AreaData) => {
            if (value.name != currentArea) return;

            const wood: WoodType = value.wood.name as WoodType;
            woodTypeBox.innerText =
                wood.at(0)?.toUpperCase() + wood.slice(1) || "Unknown";

            const chopProgress = GameData.chop_progress[wood] || 0;
            const baseHealth = value.wood.base_tree_health;
            const healthMultiplier = computeMultiplier(
                EffectType.TreeHealth,
                wood,
            );
            const totalHealth = baseHealth * healthMultiplier;
            const ratio = (totalHealth - chopProgress) / totalHealth;
            const percentage = ratio * 100;
            progressBarChop.style.width = `${percentage}%`;

            healthRatio.innerText = `${formatNumber(totalHealth - chopProgress)}/${formatNumber(totalHealth)}`;
            const amountChopped = computeMultiplier(EffectType.ChopYield, wood);
            woodCount.innerText =
                formatNumber(amountChopped) +
                (amountChopped > 1 ? " Logs" : " Log");

            const damage = computeMultiplier(EffectType.ChopDamage, wood);
            chopSpeed.innerText = `Chop Damage: ${formatNumber(damage)}x`;

            const sellPriceValue =
                computeMultiplier(EffectType.SellPrice, wood) *
                value.wood.base_sell_price;
            sellPrice.innerText = `Sell Price: $${formatNumber(sellPriceValue)}`;

            const profitValue = sellPriceValue * amountChopped;
            profit.innerText = `Profit: $${formatNumber(profitValue)}`;

            const currentChops = GameData.chop_count[wood] || 0;

            const levelData: LevelData[] = FileData.wood_levels[wood] || [];
            // Search for the current level
            for (const level of levelData) {
                if (level.required_chops <= currentChops) continue; // If more chops than the level needs it is completed so not current
                const ratio = currentChops / level.required_chops; // Use the first one that isn't completed
                const percentage = ratio * 100;
                progressBarLevel.style.width = `${percentage}%`;
                progressTextRatio.innerText = `${formatNumber(currentChops)} / ${formatNumber(level.required_chops)} Logs`;
                progressTextLevel.innerText = `Level ${level.level - 1}`;
                return;
            }
        });
    });
}

export async function render() {
    render_area_selector();
    render_levels();
    render_area_upgrades();
    render_blacksmith();
    render_main();
    render_shrine();
    UpdateManager.triggerUpdates("tick");
}
