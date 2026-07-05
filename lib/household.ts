import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUSEHOLD_ID_KEY = 'grandmas_attic_household_id';
const HOUSEHOLD_OWNER_KEY = 'grandmas_attic_household_owner';
const HOUSEHOLD_JOINED_KEY = 'grandmas_attic_household_joined';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function getHouseholdId(): Promise<string> {
  const existing = await AsyncStorage.getItem(HOUSEHOLD_ID_KEY);
  if (existing) return existing;

  const id = generateId();
  await AsyncStorage.setItem(HOUSEHOLD_ID_KEY, id);
  return id;
}

export async function setHouseholdId(id: string): Promise<void> {
  await AsyncStorage.setItem(HOUSEHOLD_ID_KEY, id);
}

/**
 * Marks this device as the household owner's device. The owner never needs
 * an invite code to access their own household (e.g. when switching to
 * Family mode on the same phone).
 */
export async function markHouseholdOwner(): Promise<void> {
  await AsyncStorage.setItem(HOUSEHOLD_OWNER_KEY, 'true');
}

export async function isHouseholdOwner(): Promise<boolean> {
  return (await AsyncStorage.getItem(HOUSEHOLD_OWNER_KEY)) === 'true';
}

export async function markJoinedHousehold(): Promise<void> {
  await AsyncStorage.setItem(HOUSEHOLD_JOINED_KEY, 'true');
}

export async function hasJoinedHousehold(): Promise<boolean> {
  return (await AsyncStorage.getItem(HOUSEHOLD_JOINED_KEY)) === 'true';
}

/**
 * Whether this device can access a household in Family mode: either it is
 * the owner's own device, or it joined one via an invite code.
 */
export async function hasHouseholdAccess(): Promise<boolean> {
  const [owner, joined] = await Promise.all([
    isHouseholdOwner(),
    hasJoinedHousehold(),
  ]);
  return owner || joined;
}

/**
 * Disconnects this device from a joined household. On the owner's own
 * device the household id is kept, since the data belongs to them.
 */
export async function leaveHousehold(): Promise<void> {
  const owner = await isHouseholdOwner();
  if (!owner) {
    await AsyncStorage.removeItem(HOUSEHOLD_ID_KEY);
  }
  await AsyncStorage.removeItem(HOUSEHOLD_JOINED_KEY);
}
