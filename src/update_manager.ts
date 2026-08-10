type UpdateCallback = () => void;

export const UpdateManager = {
    updates: {} as Record<string, UpdateCallback[]>,

    // 1. Register a callback to a specific key
    // Built in keys are 
    // frame (this runs every frame for components that need to be constantly updating)
    // tick (this runs 4 times every second or when an upgrade is purchased)
    registerUpdate(key: string, callback: UpdateCallback) {
        // If this is the first time using this key, initialize the array
        if (!this.updates[key]) {
            this.updates[key] = [];
        }
        
        // Push the callback into that key's array
        this.updates[key].push(callback);
    },

    // 2. Trigger all callbacks bunched under a specific key
    triggerUpdates(key: string) {
        // Only try to run them if the key exists and has callbacks registered
        if (this.updates[key]) {
            for (const callback of this.updates[key]) {
                callback();
            }
        }
    },

    // 3. (Optional) A handy function to trigger absolutely everything at once
    triggerAllUpdates() {
        // Loop through every string key in the updates object
        for (const key in this.updates) {
            this.triggerUpdates(key);
        }
    }
};