import { world, system } from "@minecraft/server";

// Хранилище для урона
const damageMap = new Map();

// Список цветов для чередования урона
const damageColors = ["§c", "§6"]; 

world.afterEvents.entityDie.subscribe((event) => {
    const deadEntity = event.deadEntity;
    const damageSource = event.damageSource?.damagingEntity;

    if (deadEntity.typeId === "minecraft:player") {
        const loc = deadEntity.location;
        const dim = deadEntity.dimension;
        
        // Округляем координаты до целых чисел для установки блока
        const blockPos = {
            x: Math.floor(loc.x),
            y: Math.floor(loc.y),
            z: Math.floor(loc.z)
        };

        // Ставим магму (используем runTimeout, чтобы избежать конфликтов в момент смерти)
        system.run(() => {
            try {
                dim.getBlock(blockPos)?.setType("minecraft:magma_block");
            } catch (e) {
                // Если не удалось поставить (например, граница мира)
            }
        });

        // Статистика смертей
        const deaths = (deadEntity.getDynamicProperty("deaths") ?? 0) + 1;
        deadEntity.setDynamicProperty("deaths", deaths);
    }

    // Статистика убийств (игрок убил игрока)
    if (damageSource?.typeId === "minecraft:player" && deadEntity.typeId === "minecraft:player") {
        const kills = (damageSource.getDynamicProperty("kills") ?? 0) + 1;
        damageSource.setDynamicProperty("kills", kills);
    }
});

world.afterEvents.entityHurt.subscribe((event) => {
    const damageSource = event.damageSource?.damagingEntity;
    
    if (damageSource?.typeId === "minecraft:player") {
        const damage = Math.round(event.damage * 10) / 10;
        
        // Получаем старые данные, чтобы переключить цвет
        const oldData = damageMap.get(damageSource.id);
        let newColorIndex = 0;
        
        if (oldData) {
            // Если цвет был 0, станет 1, и наоборот
            newColorIndex = oldData.colorIndex === 0 ? 1 : 0;
        }

        damageMap.set(damageSource.id, {
            damage: damage,
            tick: system.currentTick,
            colorIndex: newColorIndex
        });
    }
});

system.runInterval(() => {
    const currentTick = system.currentTick;

    for (const player of world.getAllPlayers()) {
        const kills = player.getDynamicProperty("kills") ?? 0;
        const deaths = player.getDynamicProperty("deaths") ?? 0;
        const kd = deaths === 0 ? kills : (kills / deaths).toFixed(2);

        let damageDisplay = "";
        
        if (damageMap.has(player.id)) {
            const data = damageMap.get(player.id);
            if (currentTick - data.tick <= 60) { 
                const color = damageColors[data.colorIndex];
                damageDisplay = `${color}Урон: -${data.damage}§r   |   `;
            } else {
                damageMap.delete(player.id);
            }
        }

        const statsDisplay = `§aУбийства: §f${kills}   §4Смерти: §f${deaths}   §eK/D: §f${kd}`;
        player.onScreenDisplay.setActionBar(`${damageDisplay}${statsDisplay}`);
    }
}, 1);
