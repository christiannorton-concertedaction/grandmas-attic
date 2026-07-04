import AsyncStorage from '@react-native-async-storage/async-storage';

const HOUSEHOLD_ID_KEY = 'grandmas_attic_household_id';

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
