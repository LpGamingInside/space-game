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
                <div class="ship-name">${item.name}</div>
                <div class="item-stats">
                    HP: ${item.hp}<br>
                    Schaden: ${item.damage}<br>
                    Speed: ${item.speed}<br>
                    Laser-Slots: ${item.laserSlots}<br>
                    Generator-Slots: ${item.generatorSlots}<br>
                    Extra-Slots: ${item.extraSlots}<br>
                    Drohnen-Slots: ${item.droneSlots}<br>
                    Preis: ${item.priceCredits} Credits / ${item.priceCrystals} Kristalle
                </div>
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
                <div class="shop-item-name">${item.name}</div>
                <div class="item-stats">
                    ${item.damageBonus ? `Schaden +${item.damageBonus}<br>` : ""}
                    ${item.hpBonus ? `HP +${item.hpBonus}<br>` : ""}
                    ${item.rangeBonus ? `Reichweite +${item.rangeBonus}<br>` : ""}
                    Im Inventar: ${ownedCount}<br>
                    Preis: ${item.priceCredits} Credits / ${item.priceCrystals} Kristalle
                </div>
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