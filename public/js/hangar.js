const save = loadGame();

const resourceBar = document.getElementById("resourceBar");
const shipList = document.getElementById("shipList");
const activeShipDetails = document.getElementById("activeShipDetails");
const loadoutGrid = document.getElementById("loadoutGrid");
const inventoryPanel = document.getElementById("inventoryPanel");

function getShipSvg(color) {
    return `
        <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs>
                <linearGradient id="shipGrad" x1="0" x2="1">
                    <stop offset="0%" stop-color="${color}"></stop>
                    <stop offset="100%" stop-color="#ffffff"></stop>
                </linearGradient>
            </defs>
            <polygon points="50,10 72,78 50,60 28,78" fill="url(#shipGrad)"></polygon>
            <polygon points="50,26 60,58 50,52 40,58" fill="#ffffff33"></polygon>
            <rect x="45" y="60" width="10" height="14" rx="3" fill="#0f172a"></rect>
        </svg>
    `;
}

function getItemIcon(category) {
    const icons = {
        lasers: "⚡",
        generators: "🛡️",
        extras: "✦",
        drones: "◈"
    };
    return icons[category] || "•";
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

function makeItemRow(category, itemId, buttonText, onClick) {
    const item = getEquipmentById(category, itemId);

    const row = document.createElement("div");
    row.className = "slot-item-row";
    row.innerHTML = `
        <div class="slot-item-left">
            <span class="icon-badge">${getItemIcon(category)}</span>
            <span>${item ? item.name : itemId}</span>
        </div>
        <button class="btn small ${buttonText === "Entfernen" ? "secondary" : ""}">${buttonText}</button>
    `;

    row.querySelector("button").addEventListener("click", onClick);
    return row;
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
            equippedContainer.appendChild(
                makeItemRow(category, itemId, "Entfernen", () => unequipItem(category, itemId))
            );
        }
    }

    const inventoryKeys = Object.keys(inventoryCounts);

    if (inventoryKeys.length === 0) {
        inventoryContainer.innerHTML = `<div class="inventory-line"><span>-</span></div>`;
    } else {
        for (const itemId of inventoryKeys) {
            const amount = inventoryCounts[itemId];
            const wrapper = document.createElement("div");
            wrapper.appendChild(
                makeItemRow(category, itemId, `Ausrüsten x${amount}`, () => equipItem(category, itemId))
            );
            inventoryContainer.appendChild(wrapper.firstChild);
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
                        <span><span class="icon-badge">${getItemIcon(category)}</span>${item ? item.name : itemId}</span>
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