import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ROLE_KEY = 'grandmas_attic_user_role';
const FAMILY_MEMBER_ID_KEY = 'grandmas_attic_family_member_id';

export type UserRole = 'grandma' | 'family';

export async function getUserRole(): Promise<UserRole | null> {
  const role = await AsyncStorage.getItem(USER_ROLE_KEY);
  if (role === 'grandma' || role === 'family') {
    return role;
  }
  return null;
}

export async function setUserRole(role: UserRole): Promise<void> {
  await AsyncStorage.setItem(USER_ROLE_KEY, role);
}

export async function clearUserRole(): Promise<void> {
  await AsyncStorage.removeItem(USER_ROLE_KEY);
  await AsyncStorage.removeItem(FAMILY_MEMBER_ID_KEY);
}

export async function getFamilyMemberIdentity(): Promise<string | null> {
  return AsyncStorage.getItem(FAMILY_MEMBER_ID_KEY);
}

export async function setFamilyMemberIdentity(memberId: string): Promise<void> {
  await AsyncStorage.setItem(FAMILY_MEMBER_ID_KEY, memberId);
}

export async function clearFamilyMemberIdentity(): Promise<void> {
  await AsyncStorage.removeItem(FAMILY_MEMBER_ID_KEY);
}
