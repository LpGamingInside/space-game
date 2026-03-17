const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas.getContext("2d");

const hud = document.getElementById("hud");

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const NPC_ATTACK_RANGE = 260;
const NPC_CHASE_RANGE = 500;
const NPC_LOSE_RANGE = 700;
const PLAYER_RESPAWN_TIME = 3000;

const players = {};
let myId = null;

const save = loadGame();
const activeShip = getActiveShip(save);

//let credits = save.credits;
//let crystals = save.crystals;

let credits = 9999999;
let crystals = 9999999;
let xp = save.xp;
let level = save.level;

const lasers = [];
const npcLasers = [];
const explosions = [];

let selectedNpcId = null;
let attacking = false;
let lastShotTime = 0;

let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let targetMode = false;
let targetX = 0;
let targetY = 0;
let mouseDownTime = 0;
let movedWhileHolding = false;
let droneRotation = 0;

const npcs = window.GAME_DATA.npcs.map((npc) => {
    return {
        ...npc,
        homeX: npc.x,
        homeY: npc.y,
        moveAngle: Math.random() * Math.PI * 2,
        roamRadius: 180 + Math.random() * 80,
        lastAttackTime: 0,
        state: "roam"
    };
});

function getLoadoutStats() {
    const ship = activeShip || {
        hp: 220,
        damage: 10,
        speed: 5,
        laserSlots: 1,
        generatorSlots: 1,
        extraSlots: 1,
        droneSlots: 0,
        color: "#60a5fa"
    };

    ensureShipLoadout(save, save.activeShipId);
    const loadout = save.loadouts[save.activeShipId];

    let hp = ship.hp;
    let damage = ship.damage;
    let speed = ship.speed;
    let range = 700;

    for (const laserId of loadout.lasers) {
        const item = getEquipmentById("lasers", laserId);
        if (item) damage += item.damageBonus || 0;
    }

    for (const generatorId of loadout.generators) {
        const item = getEquipmentById("generators", generatorId);
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

    return {
        hp,
        damage,
        speed,
        range,
        cooldown: 400
    };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function ensureMyPlayerDefaults() {
    if (!myId || !players[myId]) return;

    const me = players[myId];
    const stats = getLoadoutStats();

    if (typeof me.speed !== "number") me.speed = 0;
    if (typeof me.vx !== "number") me.vx = 0;
    if (typeof me.vy !== "number") me.vy = 0;
    if (typeof me.angle !== "number") me.angle = 0;
    if (typeof me.maxHp !== "number") me.maxHp = stats.hp;
    if (typeof me.hp !== "number") me.hp = me.maxHp;
    if (typeof me.damage !== "number") me.damage = stats.damage;
    if (typeof me.maxSpeed !== "number") me.maxSpeed = stats.speed;
    if (typeof me.range !== "number") me.range = stats.range;
    if (typeof me.cooldown !== "number") me.cooldown = stats.cooldown;
    if (typeof me.isDead !== "boolean") me.isDead = false;
    if (typeof me.respawnAt !== "number") me.respawnAt = 0;
}

function persistSave() {
    save.credits = credits;
    save.crystals = crystals;
    save.xp = xp;
    save.level = level;
    saveGame(save);
}

function addRewards(npc) {
    credits += npc.rewardCredits;
    crystals += npc.rewardCrystals;
    xp += npc.rewardXp;

    while (xp >= getXpNeededForLevel(level)) {
        xp -= getXpNeededForLevel(level);
        level += 1;

        const me = getMyPlayer();
        if (me) {
            me.maxHp += 20;
            me.hp = me.maxHp;
            me.damage += 2;
        }

        createExplosion(
            getMyPlayer() ? getMyPlayer().x : WORLD_WIDTH / 2,
            getMyPlayer() ? getMyPlayer().y : WORLD_HEIGHT / 2,
            "#60a5fa",
            55
        );
    }

    persistSave();
}

function getMyPlayer() {
    if (!myId || !players[myId]) return null;
    ensureMyPlayerDefaults();
    return players[myId];
}

function getCameraOffset() {
    const me = getMyPlayer();
    if (!me) return { x: 0, y: 0 };

    return {
        x: me.x - canvas.width / 2,
        y: me.y - canvas.height / 2
    };
}

function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    const camera = getCameraOffset();

    return {
        x: (event.clientX - rect.left) + camera.x,
        y: (event.clientY - rect.top) + camera.y
    };
}

function distanceBetween(aX, aY, bX, bY) {
    return Math.hypot(bX - aX, bY - aY);
}

function getNpcAtPosition(worldX, worldY) {
    for (const npc of npcs) {
        const dx = worldX - npc.x;
        const dy = worldY - npc.y;
        if (Math.hypot(dx, dy) <= npc.radius) return npc;
    }
    return null;
}

function getSelectedNpc() {
    if (selectedNpcId === null) return null;
    return npcs.find(npc => npc.id === selectedNpcId) || null;
}

function createExplosion(x, y, color = "#ff9933", maxRadius = 36) {
    explosions.push({
        x,
        y,
        color,
        radius: 4,
        maxRadius,
        alpha: 1
    });
}

function drawStars(camera) {
    for (let i = 0; i < 500; i++) {
        const x = ((i * 97) % WORLD_WIDTH) - camera.x;
        const y = ((i * 53) % WORLD_HEIGHT) - camera.y;
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawShipSprite(x, y, angle, color, isMe, isDead) {
    if (isDead) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(15, 16);
    ctx.lineTo(0, 8);
    ctx.lineTo(-15, 16);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-4, 8, 8, 12);

    if (isMe) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();
}

function drawDrones(player, camera, isMe) {
    if (!isMe || player.isDead) return;

    ensureShipLoadout(save, save.activeShipId);
    const droneIds = save.loadouts[save.activeShipId].drones;
    const count = droneIds.length;

    if (count === 0) return;

    const centerX = player.x - camera.x;
    const centerY = player.y - camera.y;
    const orbitRadius = 34 + count * 2;

    for (let i = 0; i < count; i++) {
        const droneId = droneIds[i];
        const item = getEquipmentById("drones", droneId);
        const color = item && item.color ? item.color : "#93c5fd";

        const angle = droneRotation + (Math.PI * 2 / count) * i;
        const dx = Math.cos(angle) * orbitRadius;
        const dy = Math.sin(angle) * orbitRadius;

        ctx.save();
        ctx.translate(centerX + dx, centerY + dy);
        ctx.rotate(angle + Math.PI / 2);

        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

function drawPlayerHpBar(player, camera, isMe) {
    if (player.isDead) return;

    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    const barWidth = 54;
    const barHeight = 6;
    const hpRatio = Math.max(0, player.hp) / player.maxHp;

    ctx.fillStyle = "#222";
    ctx.fillRect(screenX - barWidth / 2, screenY - 40, barWidth, barHeight);

    ctx.fillStyle = isMe ? "#4ade80" : "#60a5fa";
    ctx.fillRect(screenX - barWidth / 2, screenY - 40, barWidth * hpRatio, barHeight);
}

function drawNpc(npc, camera) {
    const screenX = npc.x - camera.x;
    const screenY = npc.y - camera.y;

    ctx.beginPath();
    ctx.arc(screenX, screenY, npc.radius, 0, Math.PI * 2);
    ctx.fillStyle = npc.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screenX, screenY, npc.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    if (npc.id === selectedNpcId) {
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    const barWidth = 56;
    const barHeight = 6;
    const hpRatio = npc.hp / npc.maxHp;

    ctx.fillStyle = "#222";
    ctx.fillRect(screenX - barWidth / 2, screenY - 40, barWidth, barHeight);

    ctx.fillStyle = "#ff4444";
    ctx.fillRect(screenX - barWidth / 2, screenY - 40, barWidth * hpRatio, barHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(npc.type, screenX, screenY - npc.radius - 16);
}

function drawLasers(camera) {
    for (const laser of lasers) {
        ctx.strokeStyle = "#ff2d55";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(laser.fromX - camera.x, laser.fromY - camera.y);
        ctx.lineTo(laser.toX - camera.x, laser.toY - camera.y);
        ctx.stroke();
    }
}

function drawNpcLasers(camera) {
    for (const laser of npcLasers) {
        ctx.strokeStyle = "#ffd60a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(laser.fromX - camera.x, laser.fromY - camera.y);
        ctx.lineTo(laser.toX - camera.x, laser.toY - camera.y);
        ctx.stroke();
    }
}

function drawExplosions(camera) {
    for (const explosion of explosions) {
        ctx.save();
        ctx.globalAlpha = explosion.alpha;
        ctx.beginPath();
        ctx.arc(explosion.x - camera.x, explosion.y - camera.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = explosion.color;
        ctx.fill();
        ctx.restore();
    }
}

function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    minimapCtx.fillStyle = "#050510";
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    minimapCtx.strokeStyle = "#334155";
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(1, 1, minimapCanvas.width - 2, minimapCanvas.height - 2);

    const me = getMyPlayer();

    for (const npc of npcs) {
        const x = (npc.x / WORLD_WIDTH) * minimapCanvas.width;
        const y = (npc.y / WORLD_HEIGHT) * minimapCanvas.height;

        minimapCtx.fillStyle = npc.id === selectedNpcId ? "#00ff88" : npc.color;
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    for (const id in players) {
        const p = players[id];
        if (p.isDead) continue;

        const x = (p.x / WORLD_WIDTH) * minimapCanvas.width;
        const y = (p.y / WORLD_HEIGHT) * minimapCanvas.height;

        minimapCtx.fillStyle = id === myId ? (activeShip ? activeShip.color : "#60a5fa") : "#ffffff";
        minimapCtx.beginPath();
        minimapCtx.arc(x, y, id === myId ? 4 : 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    if (me) {
        const camW = (canvas.width / WORLD_WIDTH) * minimapCanvas.width;
        const camH = (canvas.height / WORLD_HEIGHT) * minimapCanvas.height;
        const camX = ((me.x - canvas.width / 2) / WORLD_WIDTH) * minimapCanvas.width;
        const camY = ((me.y - canvas.height / 2) / WORLD_HEIGHT) * minimapCanvas.height;

        minimapCtx.strokeStyle = "#93c5fd";
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(camX, camY, camW, camH);
    }
}

function updateMovement() {
    const me = getMyPlayer();
    if (!me || me.isDead) return;

    let targetXLocal = me.x;
    let targetYLocal = me.y;

    if (mouseDown) {
        targetXLocal = mouseX;
        targetYLocal = mouseY;
    } else if (targetMode) {
        targetXLocal = targetX;
        targetYLocal = targetY;
    } else {
        me.speed *= 0.9;
    }

    const dx = targetXLocal - me.x;
    const dy = targetYLocal - me.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 3) {
        me.speed += 0.3;
        me.speed = Math.min(me.speed, me.maxSpeed);

        const moveAngle = Math.atan2(dy, dx);
        me.vx = Math.cos(moveAngle) * me.speed;
        me.vy = Math.sin(moveAngle) * me.speed;
    } else {
        if (targetMode) targetMode = false;
        me.speed *= 0.85;
        me.vx *= 0.85;
        me.vy *= 0.85;
    }

    me.x += me.vx;
    me.y += me.vy;

    me.x = Math.max(10, Math.min(WORLD_WIDTH - 10, me.x));
    me.y = Math.max(10, Math.min(WORLD_HEIGHT - 10, me.y));

    if (attacking && selectedNpcId !== null) {
        const npc = getSelectedNpc();
        if (npc) {
            const aimDx = npc.x - me.x;
            const aimDy = npc.y - me.y;
            me.angle = Math.atan2(aimDy, aimDx) + Math.PI / 2;
        }
    } else if (Math.abs(me.vx) > 0.01 || Math.abs(me.vy) > 0.01) {
        me.angle = Math.atan2(me.vy, me.vx) + Math.PI / 2;
    }

    socket.emit("move", {
        x: me.x,
        y: me.y,
        angle: me.angle
    });
}

function updateNpcMovement() {
    const me = getMyPlayer();

    for (const npc of npcs) {
        let targetXLocal = npc.homeX;
        let targetYLocal = npc.homeY;
        let speed = npc.moveSpeed;

        if (me && !me.isDead) {
            const distToPlayer = distanceBetween(npc.x, npc.y, me.x, me.y);

            if (distToPlayer <= NPC_CHASE_RANGE) npc.state = "chase";
            else if (distToPlayer >= NPC_LOSE_RANGE) npc.state = "return";

            if (npc.state === "chase") {
                targetXLocal = me.x;
                targetYLocal = me.y;
                speed = npc.chaseSpeed;
            } else if (npc.state === "return") {
                targetXLocal = npc.homeX;
                targetYLocal = npc.homeY;
                speed = npc.moveSpeed;

                const homeDist = distanceBetween(npc.x, npc.y, npc.homeX, npc.homeY);
                if (homeDist < 10) npc.state = "roam";
            }
        }

        if (npc.state === "roam") {
            npc.moveAngle += (Math.random() - 0.5) * 0.08;

            let nextX = npc.x + Math.cos(npc.moveAngle) * npc.moveSpeed;
            let nextY = npc.y + Math.sin(npc.moveAngle) * npc.moveSpeed;

            const distFromHome = distanceBetween(nextX, nextY, npc.homeX, npc.homeY);

            if (distFromHome > npc.roamRadius) {
                const angleHome = Math.atan2(npc.homeY - npc.y, npc.homeX - npc.x);
                npc.moveAngle = angleHome;
                nextX = npc.x + Math.cos(npc.moveAngle) * npc.moveSpeed;
                nextY = npc.y + Math.sin(npc.moveAngle) * npc.moveSpeed;
            }

            npc.x = Math.max(npc.radius, Math.min(WORLD_WIDTH - npc.radius, nextX));
            npc.y = Math.max(npc.radius, Math.min(WORLD_HEIGHT - npc.radius, nextY));
            continue;
        }

        const dx = targetXLocal - npc.x;
        const dy = targetYLocal - npc.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 1) {
            npc.x += (dx / distance) * speed;
            npc.y += (dy / distance) * speed;
        }

        npc.x = Math.max(npc.radius, Math.min(WORLD_WIDTH - npc.radius, npc.x));
        npc.y = Math.max(npc.radius, Math.min(WORLD_HEIGHT - npc.radius, npc.y));
    }
}

function updateCombat() {
    const me = getMyPlayer();
    if (!me || me.isDead || !attacking || selectedNpcId === null) return;

    const npc = getSelectedNpc();

    if (!npc) {
        attacking = false;
        selectedNpcId = null;
        return;
    }

    const distance = distanceBetween(me.x, me.y, npc.x, npc.y);
    if (distance > me.range) return;

    const now = Date.now();
    if (now - lastShotTime < me.cooldown) return;

    lastShotTime = now;

    lasers.push({
        fromX: me.x,
        fromY: me.y,
        toX: npc.x,
        toY: npc.y,
        expiresAt: now + 120
    });

    npc.hp -= me.damage;

    if (npc.hp <= 0) {
        addRewards(npc);
        createExplosion(npc.x, npc.y, npc.color, 42);

        const index = npcs.findIndex(n => n.id === npc.id);
        if (index !== -1) npcs.splice(index, 1);

        selectedNpcId = null;
        attacking = false;
    }
}

function updateNpcCombat() {
    const me = getMyPlayer();
    if (!me || me.isDead) return;

    const now = Date.now();

    for (const npc of npcs) {
        const distance = distanceBetween(npc.x, npc.y, me.x, me.y);

        if (distance > NPC_ATTACK_RANGE) continue;
        if (now - npc.lastAttackTime < 900) continue;

        npc.lastAttackTime = now;

        npcLasers.push({
            fromX: npc.x,
            fromY: npc.y,
            toX: me.x,
            toY: me.y,
            expiresAt: now + 120
        });

        me.hp -= npc.damage;

        if (me.hp <= 0) {
            killPlayer();
            break;
        }
    }
}

function killPlayer() {
    const me = getMyPlayer();
    if (!me) return;

    createExplosion(me.x, me.y, activeShip ? activeShip.color : "#60a5fa", 50);

    me.hp = 0;
    me.isDead = true;
    me.respawnAt = Date.now() + PLAYER_RESPAWN_TIME;
    me.speed = 0;
    me.vx = 0;
    me.vy = 0;

    attacking = false;
    selectedNpcId = null;
    mouseDown = false;
    targetMode = false;
}

function updateRespawn() {
    const me = getMyPlayer();
    if (!me || !me.isDead) return;

    if (Date.now() < me.respawnAt) return;

    me.isDead = false;
    me.hp = me.maxHp;
    me.x = WORLD_WIDTH / 2;
    me.y = WORLD_HEIGHT / 2;
    me.angle = 0;
    me.speed = 0;
    me.vx = 0;
    me.vy = 0;
}

function updateLasers() {
    const now = Date.now();

    for (let i = lasers.length - 1; i >= 0; i--) {
        if (lasers[i].expiresAt <= now) lasers.splice(i, 1);
    }

    for (let i = npcLasers.length - 1; i >= 0; i--) {
        if (npcLasers[i].expiresAt <= now) npcLasers.splice(i, 1);
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.radius += 1.8;
        explosion.alpha -= 0.05;

        if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function updateDroneAnimation() {
    droneRotation += 0.025;
}

function updateHud() {
    const me = getMyPlayer();

    if (!me) {
        hud.textContent = "Verbinde...";
        return;
    }

    let text = "";
    text += `Schiff: ${activeShip ? activeShip.name : "-"}`;
    text += ` | Level: ${level}`;
    text += ` | XP: ${xp}/${getXpNeededForLevel(level)}`;
    text += ` | HP: ${me.hp}/${me.maxHp}`;
    text += ` | Schaden: ${me.damage}`;
    text += ` | Reichweite: ${me.range}`;
    text += ` | Credits: ${credits}`;
    text += ` | Kristalle: ${crystals}`;

    const npc = getSelectedNpc();
    if (npc) {
        text += ` | Ziel: ${npc.type} #${npc.id} (${npc.hp}/${npc.maxHp} HP)`;
    }

    if (attacking) text += " | Angriff aktiv";

    if (me.isDead) {
        const seconds = Math.max(0, Math.ceil((me.respawnAt - Date.now()) / 1000));
        text += ` | Zerstört - Respawn in ${seconds}s`;
    }

    text += " | STRG = Angriff an/aus | ESC = Ziel löschen | H = Hangar | P = Shop";

    hud.textContent = text;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const camera = getCameraOffset();

    drawStars(camera);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;
    ctx.strokeRect(-camera.x, -camera.y, WORLD_WIDTH, WORLD_HEIGHT);

    for (const npc of npcs) {
        drawNpc(npc, camera);
    }

    drawLasers(camera);
    drawNpcLasers(camera);
    drawExplosions(camera);

    for (const id in players) {
        const p = players[id];
        const isMe = id === myId;

        drawDrones(p, camera, isMe);

        drawShipSprite(
            p.x - camera.x,
            p.y - camera.y,
            p.angle || 0,
            isMe && activeShip ? activeShip.color : "#4da6ff",
            isMe, !!p.isDead
        );

        if (typeof p.hp === "number" && typeof p.maxHp === "number") {
            drawPlayerHpBar(p, camera, isMe);
        }
    }

    drawMinimap();
    updateHud();
    requestAnimationFrame(gameLoop);
}

socket.on("connect", () => {
    myId = socket.id;
    hud.textContent = "Verbunden";
});

socket.on("currentPlayers", (serverPlayers) => {
    for (const id in serverPlayers) {
        players[id] = serverPlayers[id];
    }

    if (myId && players[myId]) {
        ensureMyPlayerDefaults();
        if (typeof players[myId].x !== "number") players[myId].x = WORLD_WIDTH / 2;
        if (typeof players[myId].y !== "number") players[myId].y = WORLD_HEIGHT / 2;
    }
});

socket.on("newPlayer", (player) => {
    players[player.id] = player;
});

socket.on("playerMoved", (player) => {
    if (player.id === myId) return;

    if (!players[player.id]) {
        players[player.id] = {
            x: player.x,
            y: player.y,
            angle: player.angle || 0,
            color: "#4da6ff",
            hp: 200,
            maxHp: 200,
            isDead: false,
            respawnAt: 0
        };
    } else {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        players[player.id].angle = player.angle || 0;
    }
});

socket.on("playerDisconnected", (id) => {
    delete players[id];
});

canvas.addEventListener("mousemove", (event) => {
    const pos = getMousePos(event);
    mouseX = pos.x;
    mouseY = pos.y;

    if (mouseDown) movedWhileHolding = true;
});

canvas.addEventListener("mousedown", (event) => {
    const me = getMyPlayer();
    if (!me || me.isDead) return;
    if (event.button !== 0) return;

    const pos = getMousePos(event);
    mouseX = pos.x;
    mouseY = pos.y;

    const clickedNpc = getNpcAtPosition(pos.x, pos.y);

    if (clickedNpc) {
        selectedNpcId = clickedNpc.id;
        mouseDown = false;
        targetMode = false;
        return;
    }

    mouseDown = true;
    mouseDownTime = Date.now();
    movedWhileHolding = false;
    targetMode = false;
});

canvas.addEventListener("dblclick", (event) => {
    const me = getMyPlayer();
    if (!me || me.isDead) return;

    const pos = getMousePos(event);
    const clickedNpc = getNpcAtPosition(pos.x, pos.y);

    if (clickedNpc) {
        selectedNpcId = clickedNpc.id;
        attacking = true;
    }
});

canvas.addEventListener("mouseup", (event) => {
    const me = getMyPlayer();
    if (!me || me.isDead) return;
    if (event.button !== 0) return;

    const pos = getMousePos(event);
    mouseX = pos.x;
    mouseY = pos.y;

    const holdDuration = Date.now() - mouseDownTime;
    mouseDown = false;

    if (holdDuration < 180 && !movedWhileHolding) {
        targetX = pos.x;
        targetY = pos.y;
        targetMode = true;
    }
});

canvas.addEventListener("mouseleave", () => {
    mouseDown = false;
});

window.addEventListener("keydown", (event) => {
    const me = getMyPlayer();
    if (!me || me.isDead) return;

    if (event.key === "Control") {
        if (selectedNpcId !== null) {
            attacking = !attacking;
        }
    }

    if (event.key === "Escape") {
        attacking = false;
        selectedNpcId = null;
    }

    if (event.key.toLowerCase() === "h") {
        persistSave();
        window.location.href = "hangar.html";
    }

    if (event.key.toLowerCase() === "p") {
        persistSave();
        window.location.href = "shop.html";
    }
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

setInterval(updateMovement, 1000 / 60);
setInterval(updateNpcMovement, 1000 / 60);
setInterval(updateCombat, 1000 / 60);
setInterval(updateNpcCombat, 1000 / 60);
setInterval(updateLasers, 1000 / 60);
setInterval(updateExplosions, 1000 / 60);
setInterval(updateRespawn, 200);
setInterval(updateDroneAnimation, 1000 / 60);

gameLoop();