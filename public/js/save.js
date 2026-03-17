const SAVE_KEY = "spaceGameSaveV2";

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function getDefaultSave() {
    return deepClone(window.GAME_DATA.starterInventory);
}

function normalizeSave(save) {
    if (!save.inventory) {
        save.inventory = {
            lasers: [],
            generators: [],
            extras: [],
            drones: []
        };
    }

    if (!save.inventory.lasers) save.inventory.lasers = [];
    if (!save.inventory.generators) save.inventory.generators = [];
    if (!save.inventory.extras) save.inventory.extras = [];
    if (!save.inventory.drones) save.inventory.drones = [];

    if (!save.loadouts) save.loadouts = {};
    if (!save.ownedShips) save.ownedShips = ["phoenix"];
    if (!save.activeShipId) save.activeShipId = "phoenix";
    if (typeof save.credits !== "number") save.credits = 1000;
    if (typeof save.crystals !== "number") save.crystals = 100;
    if (typeof save.xp !== "number") save.xp = 0;
    if (typeof save.level !== "number") save.level = 1;

    for (const shipId of save.ownedShips) {
        ensureShipLoadout(save, shipId);
    }

    return save;
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) {
        const save = normalizeSave(getDefaultSave());
        saveGame(save);
        return save;
    }

    try {
        return normalizeSave(JSON.parse(raw));
    } catch (error) {
        const save = normalizeSave(getDefaultSave());
        saveGame(save);
        return save;
    }
}

function saveGame(save) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function resetGame() {
    const save = normalizeSave(getDefaultSave());
    saveGame(save);
    return save;
}

function getShipById(shipId) {
    return window.GAME_DATA.ships.find(ship => ship.id === shipId) || null;
}

function getActiveShip(save) {
    return getShipById(save.activeShipId);
}

function ensureShipLoadout(save, shipId) {
    if (!save.loadouts[shipId]) {
        save.loadouts[shipId] = {
            lasers: [],
            generators: [],
            extras: [],
            drones: []
        };
    }

    if (!save.loadouts[shipId].lasers) save.loadouts[shipId].lasers = [];
    if (!save.loadouts[shipId].generators) save.loadouts[shipId].generators = [];
    if (!save.loadouts[shipId].extras) save.loadouts[shipId].extras = [];
    if (!save.loadouts[shipId].drones) save.loadouts[shipId].drones = [];
}

function getXpNeededForLevel(level) {
    return 100 + (level - 1) * 75;
}

function getEquipmentById(category, itemId) {
    return (window.GAME_DATA.equipment[category] || []).find(item => item.id === itemId) || null;
}

function countItems(items) {
    const counts = {};
    for (const item of items) {
        counts[item] = (counts[item] || 0) + 1;
    }
    return counts;
}

function removeOneItem(array, itemId) {
    const index = array.indexOf(itemId);
    if (index !== -1) {
        array.splice(index, 1);
        return true;
    }
    return false;
}