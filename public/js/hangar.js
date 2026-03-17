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
                <linearGradient id="shipGradHangar" x1="0" x2="1">
                    <stop offset="0%" stop-color="${color}"></stop>
                    <stop offset="100%" stop-color="#ffffff"></stop>
                </linearGradient>
            </defs>
            <polygon points="50,10 72,78 50,60 28,78" fill="url(#shipGradHangar)"></polygon>
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
        drones: "◈",
        droneLasers: "⚡",
        droneGenerators: "🛡️"
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

function getDroneSlotCapacity(loadout) {
    let capacity = 0;
    for (const droneId of loadout.drones) {
        const drone = getEquipmentById("drones", droneId);
        if (drone) {
            capacity += drone.slotBonus || 0;
        }
    }
    return capacity;
}

function getUsedDroneSlotCapacity(loadout) {
    return loadout.droneLasers.length + loadout.droneGenerators.length;
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

    for (const laserId of loadout.droneLasers) {
        const item = getEquipmentById("lasers", laserId);
        if (item) damage += item.damageBonus || 0;
    }

    for (const genId of loadout.droneGenerators) {
        const item = getEquipmentById("generators", genId);
        if (item) hp += item.hpBonus || 0;
    }

    return {
        hp,
        damage,
        speed,
        range,
        droneSlots: getDroneSlotCapacity(loadout),
        droneSlotsUsed: getUsedDroneSlotCapacity(loadout)
    };
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
                Extra-Slots: ${ship.extraSlots}
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
                Speed: ${stats.speed}<br>
                Drohnen-Slots: ${stats.droneSlotsUsed}/${stats.droneSlots}
            </div>
        </div>
    `;
}

function getCategoryMeta(category, ship, loadout) {
    const droneCapacity = getDroneSlotCapacity(loadout);
    const usedDroneCapacity = getUsedDroneSlotCapacity(loadout);

    return {
        lasers: { label: "Schiffs-Laser", max: ship.laserSlots, sourceCategory: "lasers" },
        generators: { label: "Schiffs-Generatoren", max: ship.generatorSlots, sourceCategory: "generators" },
        extras: { label: "Extras", max: ship.extraSlots, sourceCategory: "extras" },
        drones: { label: "Drohnen", max: 8, sourceCategory: "drones" },
        droneLasers: { label: "Drohnen-Laser", max: droneCapacity, used: usedDroneCapacity, sourceCategory: "lasers" },
        droneGenerators: { label: "Drohnen-Schilde", max: droneCapacity, used: usedDroneCapacity, sourceCategory: "generators" }
    }[category];
}

function canEquipMore(category, meta, loadout) {
    if (category === "droneLasers" || category === "droneGenerators") {
        return getUsedDroneSlotCapacity(loadout) < meta.max;
    }
    return loadout[category].length < meta.max;
}

function equipItem(category, itemId) {
    const ship = getActiveShip(save);
    ensureShipLoadout(save, ship.id);
    const loadout = save.loadouts[ship.id];
    const meta = getCategoryMeta(category, ship, loadout);

    if (!canEquipMore(category, meta, loadout)) return;
    if (!removeOneItem(save.inventory[meta.sourceCategory], itemId)) return;

    loadout[category].push(itemId);
    saveGame(save);
    renderAll();
}

function unequipItem(category, itemId) {
    const ship = getActiveShip(save);
    ensureShipLoadout(save, ship.id);
    const loadout = save.loadouts[ship.id];
    const meta = getCategoryMeta(category, ship, loadout);

    if (!removeOneItem(loadout[category], itemId)) return;

    save.inventory[meta.sourceCategory].push(itemId);
    saveGame(save);
    renderAll();
}

function makeItemRow(category, itemId, buttonText, onClick) {
    const sourceCategory = category === "droneLasers" ? "lasers" :
                           category === "droneGenerators" ? "generators" :
                           category;
    const item = getEquipmentById(sourceCategory, itemId);

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
    const meta = getCategoryMeta(category, ship, loadout);
    const equipped = loadout[category];
    const inventoryCounts = countItems(save.inventory[meta.sourceCategory]);

    const div = document.createElement("div");
    div.className = "slot-box";

    const capacityText = category === "droneLasers" || category === "droneGenerators"
        ? `${getUsedDroneSlotCapacity(loadout)} / ${meta.max}`
        : `${equipped.length} / ${meta.max}`;

    div.innerHTML = `
        <h3>${meta.label}</h3>
        <div class="slot-line">Slots: ${capacityText}</div>
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
            const disabled = !canEquipMore(category, meta, loadout);

            const row = makeItemRow(
                category,
                itemId,
                `Ausrüsten x${amount}`,
                () => equipItem(category, itemId)
            );

            if (disabled) {
                row.querySelector("button").disabled = true;
                row.querySelector("button").classList.add("secondary");
            }

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
    loadoutGrid.appendChild(renderLoadoutCategory("droneLasers"));
    loadoutGrid.appendChild(renderLoadoutCategory("droneGenerators"));
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