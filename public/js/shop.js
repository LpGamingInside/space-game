const save = loadGame();

const resourceBar = document.getElementById("resourceBar");
const shopTabs = document.getElementById("shopTabs");
const shopGrid = document.getElementById("shopGrid");

let activeTab = "ships";

const tabDefs = [
    { id: "ships", label: "Schiffe" },
    { id: "lasers", label: "Laser" },
    { id: "generators", label: "Generatoren" },
    { id: "extras", label: "Extras" },
    { id: "drones", label: "Drohnen" }
];

function getShipSvg(color) {
    return `
        <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs>
                <linearGradient id="shopShipGrad" x1="0" x2="1">
                    <stop offset="0%" stop-color="${color}"></stop>
                    <stop offset="100%" stop-color="#ffffff"></stop>
                </linearGradient>
            </defs>
            <polygon points="50,10 72,78 50,60 28,78" fill="url(#shopShipGrad)"></polygon>
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

function canAfford(item) {
    return save.credits >= (item.priceCredits || 0) && save.crystals >= (item.priceCrystals || 0);
}

function spendFor(item) {
    save.credits -= item.priceCredits || 0;
    save.crystals -= item.priceCrystals || 0;
}

function renderTabs() {
    shopTabs.innerHTML = "";

    for (const tab of tabDefs) {
        const button = document.createElement("button");
        button.className = "tab-button" + (tab.id === activeTab ? " active" : "");
        button.textContent = tab.label;
        button.addEventListener("click", () => {
            activeTab = tab.id;
            renderTabs();
            renderGrid();
        });
        shopTabs.appendChild(button);
    }
}

function getItemsForTab() {
    if (activeTab === "ships") return window.GAME_DATA.ships;
    return window.GAME_DATA.equipment[activeTab] || [];
}

function buyShip(ship) {
    if (save.ownedShips.includes(ship.id)) return;
    if (!canAfford(ship)) return;

    spendFor(ship);
    save.ownedShips.push(ship.id);
    ensureShipLoadout(save, ship.id);
    saveGame(save);
    renderAll();
}

function buyEquipment(category, item) {
    if (!canAfford(item)) return;

    spendFor(item);
    save.inventory[category].push(item.id);
    saveGame(save);
    renderAll();
}

function renderGrid() {
    shopGrid.innerHTML = "";

    const items = getItemsForTab();

    for (const item of items) {
        const box = document.createElement("div");
        box.className = "shop-item";

        if (activeTab === "ships") {
            const owned = save.ownedShips.includes(item.id);

            box.innerHTML = `
                <div class="ship-preview">${getShipSvg(item.color)}</div>
                <div class="ship-name">${item.name}</div>
                <div class="item-stats">
                    HP: ${item.hp}<br>
                    Schaden: ${item.damage}<br>
                    Speed: ${item.speed}<br>
                    Laser-Slots: ${item.laserSlots}<br>
                    Generator-Slots: ${item.generatorSlots}<br>
                    Extra-Slots: ${item.extraSlots}
                </div>
                <div class="shop-price">${item.priceCredits} Credits / ${item.priceCrystals} Kristalle</div>
                <button class="btn ${owned ? "secondary" : ""}" ${owned ? "disabled" : ""}>
                    ${owned ? "Bereits gekauft" : "Kaufen"}
                </button>
            `;

            const button = box.querySelector("button");
            if (!owned) {
                button.addEventListener("click", () => buyShip(item));
            }
        } else {
            const ownedCount = countItems(save.inventory[activeTab])[item.id] || 0;

            box.innerHTML = `
                <div class="shop-item-name"><span class="icon-badge">${getItemIcon(activeTab)}</span>${item.name}</div>
                <div class="item-stats">
                    ${item.damageBonus ? `Schaden +${item.damageBonus}<br>` : ""}
                    ${item.hpBonus ? `HP +${item.hpBonus}<br>` : ""}
                    ${item.rangeBonus ? `Reichweite +${item.rangeBonus}<br>` : ""}
                    ${item.slotBonus ? `Drohnen-Slots +${item.slotBonus}<br>` : ""}
                    Im Inventar: ${ownedCount}
                </div>
                <div class="shop-price">${item.priceCredits} Credits / ${item.priceCrystals} Kristalle</div>
                <button class="btn">Kaufen</button>
            `;

            box.querySelector("button").addEventListener("click", () => buyEquipment(activeTab, item));
        }

        shopGrid.appendChild(box);
    }
}

function renderAll() {
    renderResources();
    renderTabs();
    renderGrid();
}

renderAll();