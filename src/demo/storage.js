export const memoryStorage = () => {
    let blob = null;
    return {
        load: () => blob,
        save: (next) => { blob = next; },
    };
};

export const browserStorage = (key) => ({
    load: () => {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },
    save: (blob) => {
        try {
            window.localStorage.setItem(key, JSON.stringify(blob));
        } catch { }
    },
});
