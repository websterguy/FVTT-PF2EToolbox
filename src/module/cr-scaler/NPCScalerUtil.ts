import { SCALE_APP_DATA } from './NPCScalerData';
import { IStrikeDamage } from './NPCScalerTypes';

export function getFolder(name: string): Folder | null {
    return game.folders.find((f) => f.name === name);
}

export function getFolderInFolder(name: string, parentName?: string) {
    return game.folders.find((f) => f.name === name && f.parent?.name === parentName);
}
export function getActor(name: string, folder: string): Actor | null {
    return game.actors.find((a) => a.name === name && a.folder?.name === folder);
}

function parseDamage(value: string): IStrikeDamage {
    let [diceString, bonusString] = value.split('+');
    let bonus: number = 0;
    if (bonusString !== undefined) {
        bonus = parseInt(bonusString);
    }

    let [diceCountString, diceSizeString] = diceString.split('d');
    let result = {
        diceCount: parseInt(diceCountString),
        diceSize: parseInt(diceSizeString),
        original: value,
        average: 0,
        bonus,
    };

    result.average = ((result.diceSize + 1) / 2) * result.diceCount + result.bonus;

    return result;
}

export function constructFormula({ diceCount, diceSize, bonus }: { diceCount: number; diceSize: number; bonus: number }) {
    return `${diceCount}d${diceSize}+${bonus}`;
}
export function getLeveledData(key: keyof typeof SCALE_APP_DATA, oldValue: number, oldLevel: number, newLevel: number) {
    const data = SCALE_APP_DATA[key];
    const oldLevelData = data[oldLevel + 1];
    const newLevelData = data[newLevel + 1];

    let bestMatch: { key: string; delta: number } = { key: 'undefined', delta: Number.MAX_SAFE_INTEGER };
    for (const entry of Object.entries(oldLevelData)) {
        const key = entry[0];
        if (key === 'level') {
            continue;
        }

        const value = parseInt(entry[1] as any);
        const delta = Math.abs(value - oldValue);

        if (delta < bestMatch.delta) {
            bestMatch = {
                key,
                delta,
            };
        }
    }

    let result = {
        value: newLevelData[bestMatch.key],
        delta: oldValue - oldLevelData[bestMatch.key],
        total: 0,
    };
    result.total = result.value + result.delta;

    return result;
}
export function getHPData(oldValue: number, oldLevel: number, newLevel: number) {
    const data = SCALE_APP_DATA['hitPoints'];
    const oldLevelData = data[oldLevel + 1];
    const newLevelData = data[newLevel + 1];

    // try to find an exact match
    let bestMatch: { key: string; percentile: number; delta: number } = { key: 'undefined', percentile: 0, delta: Number.MAX_SAFE_INTEGER };
    for (const entry of Object.entries(oldLevelData)) {
        const key = entry[0];
        if (key === 'level') {
            continue;
        }

        let entryValue = entry[1] as { die: number; maximum: number; minimum: number };
        const { minimum, maximum } = entryValue;
        const range = maximum - minimum;
        const percentile = (oldValue - minimum) / range;
        const dMin = Math.abs(oldValue - minimum);
        const dMax = Math.abs(oldValue - maximum);
        const delta = Math.min(dMin, dMax);

        if (oldValue > minimum && oldValue < maximum) {
            bestMatch = {
                key,
                percentile,
                delta,
            };
            break;
        } else {
            if (delta < bestMatch.delta) {
                bestMatch = {
                    key,
                    percentile,
                    delta,
                };
            }
        }
    }

    const newValue = newLevelData[bestMatch.key];
    return Math.round(newValue.minimum + (newValue.maximum - newValue.minimum) * bestMatch.percentile);
}

export function constructRelativeDamage(oldDmg: IStrikeDamage, stdDmg: IStrikeDamage, newDmg: IStrikeDamage): IStrikeDamage {
    const count = newDmg.diceCount;
    const size = newDmg.diceSize;
    const bonus = newDmg.bonus + oldDmg.bonus - stdDmg.bonus;

    return parseDamage(
        constructFormula({
            diceCount: count,
            diceSize: size,
            bonus,
        }),
    );
}

export function getDamageData(oldValue: string, oldLevel: number, newLevel: number) {
    const data = SCALE_APP_DATA['strikeDamage'];
    const oldLevelData = data[oldLevel + 1];
    const newLevelData = data[newLevel + 1];
    const parsedOldValue = parseDamage(oldValue);

    let bestMatch: { key: string; delta: number } = { key: 'undefined', delta: Number.MAX_SAFE_INTEGER };
    for (const entry of Object.entries(oldLevelData)) {
        const key = entry[0];
        if (key === 'level') {
            continue;
        }

        const value = entry[1] as IStrikeDamage;
        const delta = Math.abs(value.average - parsedOldValue.average);

        if (delta < bestMatch.delta) {
            bestMatch = {
                key,
                delta,
            };
        }
    }

    if (bestMatch.delta < parsedOldValue.average * 0.5) {
        return constructRelativeDamage(parsedOldValue, oldLevelData[bestMatch.key], newLevelData[bestMatch.key]).original;
        // return newLevelData[bestMatch.key].original;
    } else {
        return oldValue;
    }
}