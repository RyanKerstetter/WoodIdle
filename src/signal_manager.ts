type UpdateCallback = () => void;

export enum Signal {
    Tick,           // This triggers every tick of the game loop
    TreeDamage,     // This triggers whenever a tree takes damage
    TreeChopped,    // This triggers whenever a tree is fully chopped down
    AreaChanged,     // This triggers whenever the player changes areas
    MoneyGained,
    UpgradeUnlocked, // This triggers whenever GameData.upgrades[] gets modified
}

// note: no important control flow should be handles using signals
// they shold only be used to tell UI components to update
//
// currently no recursive checking
// shouldn't be an issue but be careful
export const SignalManager = {
    updates: {} as Record<Signal, UpdateCallback[]>,

    // 1. Register a callback to a specific key
    // Built in keys are
    // frame (this runs every frame for components that need to be constantly updating)
    
    registerSignal(key: Signal, callback: UpdateCallback) {
        // If this is the first time using this key, initialize the array
        if (!this.updates[key]) {
            this.updates[key] = [];
        }
        this.updates[key].push(callback);
    },

    registerSignalArray(keys: Signal[], callback: UpdateCallback) {
        // If this is the first time using this key, initialize the array
        for (const key of keys) {
            if (!this.updates[key]) {
                this.updates[key] = [];
            }
            this.updates[key].push(callback);
        }
    },

    // 2. Trigger all callbacks bunched under a specific key
    triggerSignal(key: Signal) {
        // Only try to run them if the key exists and has callbacks registered
        if (this.updates[key]) {
            for (const callback of this.updates[key]) {
                callback();
            }
        }
    },

    // 3. (Optional) A handy function to trigger absolutely everything at once
    triggerAllSignals() {
        // Filter out reverse-mapping string keys to get only numeric Signal enum values
        const signalValues = Object.values(Signal).filter(
            (value): value is Signal => typeof value === "number",
        );

        for (const signal of signalValues) {
            this.triggerSignal(signal);
        }
    },
};
