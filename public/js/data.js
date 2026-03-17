window.GAME_DATA = {
    ships: [{
            id: "phoenix",
            name: "Phoenix",
            hp: 220,
            speed: 5.0,
            damage: 10,
            laserSlots: 1,
            generatorSlots: 1,
            extraSlots: 1,
            color: "#60a5fa",
            priceCredits: 0,
            priceCrystals: 0
        },
        {
            id: "vanguard",
            name: "Vanguard",
            hp: 320,
            speed: 4.6,
            damage: 14,
            laserSlots: 2,
            generatorSlots: 2,
            extraSlots: 1,
            color: "#22c55e",
            priceCredits: 3500,
            priceCrystals: 120
        },
        {
            id: "destroyer",
            name: "Destroyer",
            hp: 460,
            speed: 4.0,
            damage: 20,
            laserSlots: 3,
            generatorSlots: 2,
            extraSlots: 2,
            color: "#f97316",
            priceCredits: 9000,
            priceCrystals: 300
        }
    ],

    equipment: {
        lasers: [
            { id: "LF-1", name: "LF-1", damageBonus: 2, priceCredits: 500, priceCrystals: 0 },
            { id: "LF-2", name: "LF-2", damageBonus: 5, priceCredits: 1800, priceCrystals: 40 },
            { id: "LF-3", name: "LF-3", damageBonus: 9, priceCredits: 4500, priceCrystals: 120 }
        ],
        generators: [
            { id: "G3N-1", name: "G3N-1", hpBonus: 20, priceCredits: 450, priceCrystals: 0 },
            { id: "G3N-2", name: "G3N-2", hpBonus: 50, priceCredits: 1600, priceCrystals: 35 },
            { id: "G3N-3", name: "G3N-3", hpBonus: 100, priceCredits: 4200, priceCrystals: 90 }
        ],
        extras: [
            { id: "RNG-1", name: "Range Booster I", rangeBonus: 80, priceCredits: 900, priceCrystals: 15 },
            { id: "RNG-2", name: "Range Booster II", rangeBonus: 160, priceCredits: 2600, priceCrystals: 55 },
            { id: "REP-1", name: "Repair Module I", rangeBonus: 0, hpBonus: 25, priceCredits: 1400, priceCrystals: 25 }
        ],
        drones: [{
                id: "DRN-A",
                name: "Drone Alpha",
                slotBonus: 1,
                color: "#93c5fd",
                priceCredits: 1500,
                priceCrystals: 40
            },
            {
                id: "DRN-B",
                name: "Drone Beta",
                slotBonus: 2,
                color: "#f9a8d4",
                priceCredits: 3800,
                priceCrystals: 90
            }
        ]
    },

    maps: [{
            id: "1-1",
            name: "Orbit Alpha",
            gates: [{
                id: "gate-1-1-east",
                x: 4750,
                y: 2500,
                radius: 70,
                targetMap: "1-2",
                targetX: 250,
                targetY: 2500,
                label: "Gate 1-2"
            }]
        },
        {
            id: "1-2",
            name: "Red Nebula",
            gates: [{
                    id: "gate-1-2-west",
                    x: 250,
                    y: 2500,
                    radius: 70,
                    targetMap: "1-1",
                    targetX: 4650,
                    targetY: 2500,
                    label: "Gate 1-1"
                },
                {
                    id: "gate-1-2-east",
                    x: 4750,
                    y: 2500,
                    radius: 70,
                    targetMap: "2-1",
                    targetX: 250,
                    targetY: 2500,
                    label: "Gate 2-1"
                }
            ]
        },
        {
            id: "2-1",
            name: "Outer Fringe",
            gates: [{
                id: "gate-2-1-west",
                x: 250,
                y: 2500,
                radius: 70,
                targetMap: "1-2",
                targetX: 4650,
                targetY: 2500,
                label: "Gate 1-2"
            }]
        }
    ],

    npcSpawns: [{
            spawnId: "npc-1",
            mapId: "1-1",
            type: "Scout",
            x: 900,
            y: 900,
            radius: 18,
            hp: 70,
            maxHp: 70,
            color: "#f59e0b",
            moveSpeed: 1.4,
            chaseSpeed: 2.2,
            damage: 5,
            rewardCredits: 90,
            rewardCrystals: 3,
            rewardXp: 25,
            respawnMs: 6000
        },
        {
            spawnId: "npc-2",
            mapId: "1-1",
            type: "Fighter",
            x: 1600,
            y: 1300,
            radius: 22,
            hp: 120,
            maxHp: 120,
            color: "#fb923c",
            moveSpeed: 1.0,
            chaseSpeed: 1.8,
            damage: 8,
            rewardCredits: 150,
            rewardCrystals: 5,
            rewardXp: 45,
            respawnMs: 7000
        },
        {
            spawnId: "npc-3",
            mapId: "1-2",
            type: "Destroyer",
            x: 2200,
            y: 1600,
            radius: 28,
            hp: 220,
            maxHp: 220,
            color: "#ef4444",
            moveSpeed: 0.7,
            chaseSpeed: 1.4,
            damage: 14,
            rewardCredits: 320,
            rewardCrystals: 10,
            rewardXp: 90,
            respawnMs: 9000
        },
        {
            spawnId: "npc-4",
            mapId: "2-1",
            type: "Scout",
            x: 1200,
            y: 2200,
            radius: 18,
            hp: 70,
            maxHp: 70,
            color: "#f59e0b",
            moveSpeed: 1.4,
            chaseSpeed: 2.2,
            damage: 5,
            rewardCredits: 90,
            rewardCrystals: 3,
            rewardXp: 25,
            respawnMs: 6000
        },
        {
            spawnId: "npc-5",
            mapId: "2-1",
            type: "Destroyer",
            x: 3000,
            y: 1400,
            radius: 28,
            hp: 220,
            maxHp: 220,
            color: "#ef4444",
            moveSpeed: 0.7,
            chaseSpeed: 1.4,
            damage: 14,
            rewardCredits: 320,
            rewardCrystals: 10,
            rewardXp: 90,
            respawnMs: 9000
        }
    ],

    starterInventory: {
        credits: 1000,
        crystals: 100,
        xp: 0,
        level: 1,
        currentMapId: "1-1",
        ownedShips: ["phoenix"],
        activeShipId: "phoenix",
        inventory: {
            lasers: ["LF-1"],
            generators: ["G3N-1"],
            extras: [],
            drones: []
        },
        loadouts: {
            phoenix: {
                lasers: ["LF-1"],
                generators: ["G3N-1"],
                extras: [],
                drones: [],
                droneLasers: [],
                droneGenerators: []
            }
        }
    }
};