/**
 * Units of Measurement and Dimensional Conversion Utility
 * Strictly enforces physical unit compatibility (Mass, Volume, Discrete)
 * to prevent corrupting stock balances or combining incompatible units.
 */
export const SUPPORTED_UNITS = [
    "kg",
    "g",
    "litres",
    "ml",
    "pieces",
    "packs",
    "portions",
];
export function isValidUnit(unit) {
    if (!unit || typeof unit !== "string")
        return false;
    const norm = normalizeUnit(unit);
    return SUPPORTED_UNITS.includes(norm);
}
export function normalizeUnit(rawUnit) {
    const clean = (rawUnit || "").trim().toLowerCase();
    switch (clean) {
        case "l":
        case "litre":
        case "liter":
        case "liters":
        case "litres":
            return "litres";
        case "millilitre":
        case "milliliter":
        case "ml":
            return "ml";
        case "kilogram":
        case "kilograms":
        case "kg":
            return "kg";
        case "gram":
        case "grams":
        case "g":
            return "g";
        case "piece":
        case "pc":
        case "pcs":
        case "pieces":
            return "pieces";
        case "pack":
        case "packs":
        case "packet":
        case "packets":
            return "packs";
        case "portion":
        case "portions":
            return "portions";
        default:
            return clean;
    }
}
export function getUnitDimension(unit) {
    const norm = normalizeUnit(unit);
    if (norm === "kg" || norm === "g") {
        return "mass";
    }
    if (norm === "litres" || norm === "ml") {
        return "volume";
    }
    return "discrete";
}
export function areUnitsCompatible(unitA, unitB) {
    const normA = normalizeUnit(unitA);
    const normB = normalizeUnit(unitB);
    if (normA === normB)
        return true;
    const dimA = getUnitDimension(normA);
    const dimB = getUnitDimension(normB);
    if (dimA !== dimB)
        return false;
    if (dimA === "discrete") {
        return normA === normB;
    }
    return true;
}
export function convertUnitQuantity(quantity, fromUnit, toUnit) {
    const qty = Number(quantity);
    if (isNaN(qty)) {
        throw new Error(`Invalid numeric quantity: ${quantity}`);
    }
    const normFrom = normalizeUnit(fromUnit);
    const normTo = normalizeUnit(toUnit);
    if (normFrom === normTo) {
        return Math.round(qty * 1000) / 1000;
    }
    if (!areUnitsCompatible(normFrom, normTo)) {
        throw new Error(`Incompatible unit conversion: Cannot convert ${fromUnit} (${getUnitDimension(fromUnit)}) to ${toUnit} (${getUnitDimension(toUnit)}).`);
    }
    if (normFrom === "kg" && normTo === "g") {
        return Math.round(qty * 1000 * 1000) / 1000;
    }
    if (normFrom === "g" && normTo === "kg") {
        return Math.round((qty / 1000) * 1000) / 1000;
    }
    if (normFrom === "litres" && normTo === "ml") {
        return Math.round(qty * 1000 * 1000) / 1000;
    }
    if (normFrom === "ml" && normTo === "litres") {
        return Math.round((qty / 1000) * 1000) / 1000;
    }
    return Math.round(qty * 1000) / 1000;
}
