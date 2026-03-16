import { world, system } from "@minecraft/server";

const damageMap = new Map();
const colors = ["§c", "§6"];

// Регистрация свойств, чтобы стата сохранялась в файле мира
world.afterEvents.worldInitialize.subscribe((event) => {
    event.propertyRegistry.registerEntityType({
        properties: {
            "pKills": { type: "int", defaultValue: 0 },
            "mKills": { type: "int", defaultValue: 0 },
            "deaths": { type: "int", defaultValue: 0 }
        }
    }, "minecraft:player");
});

world.afterEvents.entityDie.subscribe((event) => {
    const { deadEntity, damageSource } = event;
    if (deadEntity.typeId === "minecraft:player") {
        const d = (deadEntity.getDynamicProperty("deaths") ?? 0) + 1;
        deadEntity.setDynamicProperty("deaths", d);
    }
    const killer = damageSource?.damagingEntity;
    if (killer?.typeId === "minecraft:player") {
        const prop = deadEntity.typeId === "minecraft:player" ? "pKills" : "mKills";
        const val = (killer.getDynamicProperty(prop) ?? 0) + 1;
        killer.setDynamicProperty(prop, val);
    }
});

world.afterEvents.entityHurt.subscribe((event) => {
    const killer = event.damageSource?.damagingEntity;
    if (killer?.typeId === "minecraft:player") {
        const old = damageMap.get(killer.id);
        damageMap.set(killer.id, {
            val: Math.round(event.damage * 10) / 10,
            tick: system.currentTick,
            colorIdx: old?.colorIdx === 0 ? 1 : 0
        });
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const pk = player.getDynamicProperty("pKills") ?? 0;
        const mk = player.getDynamicProperty("mKills") ?? 0;
        const d = player.getDynamicProperty("deaths") ?? 0;
        const kd = d === 0 ? pk : (pk / d).toFixed(2);

        let dmg = "";
        if (damageMap.has(player.id)) {
            const data = damageMap.get(player.id);
            if (system.currentTick - data.tick <= 60) {
                dmg = `${colors[data.colorIdx]}УРОН: -${data.val}`;
            } else { damageMap.delete(player.id); }
        }
        player.onScreenDisplay.setActionBar(`${dmg}|${pk}|${mk}|${d}|${kd}`);
    }
}, 1);
