/** Navigation depends only on this flush boundary, never on the map renderer. */
export const mapPersistence: { flush?: () => Promise<boolean> } = {};
