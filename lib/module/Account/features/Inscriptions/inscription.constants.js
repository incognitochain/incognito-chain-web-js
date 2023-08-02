
const genKey= (storageKey) => {
    return `VERSION_3:(${storageKey})`;
};

const INSCRIPTIONS_STORAGE_KEY = {
    INSCRIPTIONS_HISTORY: genKey("INSCRIPTIONS"),
}

export { INSCRIPTIONS_STORAGE_KEY }