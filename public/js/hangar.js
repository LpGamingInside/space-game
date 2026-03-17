const save = loadGame();

const resourceBar = document.getElementById("resourceBar");
const shipList = document.getElementById("shipList");
const activeShipDetails = document.getElementById("activeShipDetails");
const loadoutGrid = document.getElementById("loadoutGrid");
const inventoryPanel = document.getElementById("inventoryPanel");

function getShipSvg(color) {
    return `
        <svg viewBox="0 0 100 100" aria-hidden="true">
            <polygon points="50,12 68,78 50,62 32,78" fill="${color}"></polygon>
            <polygon points="50,30 58,60 50,54 42,60" fill="#ffffff22"></polygon>
        </svg>
    `;
}

function renderResources() {
    const xpNeeded = getXpNeededForLevel(save.level);

    resourceBar.innerHTML = `
        <div>Credits: ${save.credits}</div>
        <div>Kristalle: ${save.crystals}</div>
        <div>Level: ${save.level}</div>
        <div>XP: ${save.xp}/${xpNeeded}</div>
    `;
}

function calculateShipCombatStats(shipId) {
    const ship = getShipById(shipId);
    ensureShipLoadout(save, shipId);
    const loadout = save.loadouts[shipId];

    let hp = ship.hp;
    let damage = ship.damage;
    let speed = ship.speed;
    let range = 700;

    for (const laserId of loadout.lasers) {
        const item = getEquipmentById("lasers", laserId);
        if (item) damage += item.damageBonus || 0;
    }

    for (const genId of loadout.generators) {
        const item = getEquipmentById("generators", genId);
        if (item) hp += item.hpBonus || 0;
    }

    for (const extraId of loadout.extras) {
        const item = getEquipmentById("extras", extraId);
        if (item) {
            hp += item.hpBonus || 0;
            range += item.rangeBonus || 0;
        }
    }

    for (const droneId of loadout.drones) {
        const item = getEquipmentById("drones", droneId);
        if (item) {
            hp += item.hpBonus || 0;
            damage += item.damageBonus || 0;
        }
    }

    return { hp, damage, speed, range };
}

function renderShipList() {
    shipList.innerHTML = "";

    const ownedShips = window.GAME_DATA.ships.filter(ship => save.ownedShips.includes(ship.id));

    for (const ship of ownedShips) {
        const card = document.createElement("div");
        card.className = "ship-card";

        const isActive = save.activeShipId === ship.id;

        card.innerHTML = `
            ${isActive ? `<div class="active-badge">Aktiv</div>` : ""}
            <div class="ship-preview">${getShipSvg(ship.color)}</div>
            <div class="ship-name">${ship.name}</div>
            <div class="ship-stats">
                Basis-HP: ${ship.hp}<br>
                Basis-Schaden: ${ship.damage}<br>
                Speed: ${ship.speed}<br>
                Laser-Slots: ${ship.laserSlots}<br>
                Generator-Slots: ${ship.generatorSlots}<br>
                Extra-Slots: ${ship.extraSlots}<br>
                Drohnen-Slots: ${ship.droneSlots}
            </div>
            <button class="btn ${isActive ? "secondary" : ""}" data-ship-id="${ship.id}">
                ${isActive ? "Aktiv" : "Als aktiv setzen"}
            </button>
        `;

        shipList.appendChild(card);
    }

    shipList.querySelectorAll("button[data-ship-id]").forEach(button => {
        button.addEventListener("click", () => {
            const shipId = button.getAttribute("data-ship-id");
            save.activeShipId = shipId;
            ensureShipLoadout(save, shipId);
            saveGame(save);
            renderAll();
        });
    });
}

function renderActiveShip() {
    const ship = getActiveShip(save);

    if (!ship) {
        activeShipDetails.innerHTML = "<p>Kein aktives Schiff gefunden.</p>";
        return;
    }

    const stats = calculateShipCombatStats(ship.id);

    activeShipDetails.innerHTML = `
        <div class="ship-card">
            <div class="ship-preview">${getShipSvg(ship.color)}</div>
            <div class="ship-name">${ship.name}</div>
            <div class="ship-stats">
                Kampf-HP: ${stats.hp}<br>
                Kampf-Schaden: ${stats.damage}<br>
                Reichweite: ${stats.range}<br>
                Speed: ${stats.speed}
            </div>
        </div>
    `;
}

function getCategoryMeta(category, ship) {
    return {
        lasers: { label: "Laser", max: ship.laserSlots },
        generators: { label: "Generatoren", max: ship.generatorSlots },
        extras: { label: "Extras", max: ship.extraSlots },
        drones: { label: "Drohnen", max: ship.droneSlots }
    }[category];
}

function equipItem(category, itemId) {
    const ship = getActiveShip(save);
    ensureShipLoadout(save, ship.id);
    const loadout = save.loadouts[ship.id];
    const meta = getCategoryMeta(category, ship);

    if (loadout[category].length >= meta.max) return;

    if (!removeOneItem(save.inventory[category], itemId)) return;

    loadout[category].push(itemId);
    saveGame(save);
    renderAll();
}

function unequipItem(category, itemId) {
    const ship = getActiveShip(save);
    ensureShipLoadout(save, ship.id);
    const loadout = save.loadouts[ship.id];

    if (!removeOneItem(loadout[category], itemId)) return;

    save.inventory[category].push(itemId);
    saveGame(save);
    renderAll();
}

function renderLoadoutCategory(category) {
    const ship = getActiveShip(save);
    ensureShipLoadout(save, ship.id);

    const loadout = save.loadouts[ship.id];
    const meta = getCategoryMeta(category, ship);
    const equipped = loadout[category];
    const inventoryCounts = countItems(save.inventory[category]);

    const div = document.createElement("div");
    div.className = "slot-box";

    div.innerHTML = `
        <h3>${meta.label}</h3>
        <div class="slot-line">Slots: ${equipped.length} / ${meta.max}</div>
        <div class="slot-line">Ausgerüstet:</div>
        <div id="equipped-${category}"></div>
        <div class="slot-line" style="margin-top:10px;">Inventar:</div>
        <div id="inventory-${category}"></div>
    `;

    const equippedContainer = div.querySelector(`#equipped-${category}`);
    const inventoryContainer = div.querySelector(`#inventory-${category}`);

    if (equipped.length === 0) {
        equippedContainer.innerHTML = `<div class="inventory-line"><span>-</span></div>`;
    } else {
        for (const itemId of equipped) {
            const item = getEquipmentById(category, itemId);
            const row = document.createElement("div");
            row.className = "inventory-line";
            row.innerHTML = `
                <span>${item ? item.name : itemId}</span>
                <button class="btn small secondary">Entfernen</button>
            `;
            row.querySelector("button").addEventListener("click", () => unequipItem(category, itemId));
            equippedContainer.appendChild(row);
        }
    }

    const inventoryKeys = Object.keys(inventoryCounts);

    if (inventoryKeys.length === 0) {
        inventoryContainer.innerHTML = `<div class="inventory-line"><span>-</span></div>`;
    } else {
        for (const itemId of inventoryKeys) {
            const item = getEquipmentById(category, itemId);
            const amount = inventoryCounts[itemId];

            const row = document.createElement("div");
            row.className = "inventory-line";
            row.innerHTML = `
                <span>${item ? item.name : itemId} x${amount}</span>
                <button class="btn small">Ausrüsten</button>
            `;
            row.querySelector("button").addEventListener("click", () => equipItem(category, itemId));
            inventoryContainer.appendChild(row);
        }
    }

    return div;
}

function renderLoadout() {
    const ship = getActiveShip(save);

    if (!ship) {
        loadoutGrid.innerHTML = "";
        return;
    }

    loadoutGrid.innerHTML = "";
    loadoutGrid.appendChild(renderLoadoutCategory("lasers"));
    loadoutGrid.appendChild(renderLoadoutCategory("generators"));
    loadoutGrid.appendChild(renderLoadoutCategory("extras"));
    loadoutGrid.appendChild(renderLoadoutCategory("drones"));
}

function renderInventoryPanel() {
    const categories = [
        ["lasers", "Laser"],
        ["generators", "Generatoren"],
        ["extras", "Extras"],
        ["drones", "Drohnen"]
    ];

    inventoryPanel.innerHTML = "";

    for (const [category, label] of categories) {
        const box = document.createElement("div");
        box.className = "slot-box";
        box.style.marginBottom = "12px";

        const counts = countItems(save.inventory[category]);
        const keys = Object.keys(counts);

        let inner = `<h3>${label}</h3>`;

        if (keys.length === 0) {
            inner += `<div class="inventory-line"><span>-</span></div>`;
        } else {
            for (const itemId of keys) {
                const item = getEquipmentById(category, itemId);
                inner += `
                    <div class="inventory-line">
                        <span>${item ? item.name : itemId}</span>
                        <span>x${counts[itemId]}</span>
                    </div>
                `;
            }
        }

        box.innerHTML = inner;
        inventoryPanel.appendChild(box);
    }
}

function renderAll() {
    renderResources();
    renderShipList();
    renderActiveShip();
    renderLoadout();
    renderInventoryPanel();
}

renderAll();