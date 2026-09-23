import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const CHUNK_SIZE = 1500;
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type Metadata = { generation: string; count: number };

const metaKey = (name: string) => `${name}__meta`;
const chunkKey = (name: string, generation: string, index: number) => `${name}__${generation}__${index}`;

async function readMetadata(name: string): Promise<Metadata | null> {
  const raw = await SecureStore.getItemAsync(metaKey(name), options);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Metadata;
    return Number.isInteger(parsed.count) && parsed.count >= 0 && parsed.generation ? parsed : null;
  } catch {
    return null;
  }
}

async function deleteGeneration(name: string, metadata: Metadata | null): Promise<void> {
  if (!metadata) return;
  await Promise.all(Array.from({ length: metadata.count }, (_, index) =>
    SecureStore.deleteItemAsync(chunkKey(name, metadata.generation, index), options)));
}

/**
 * Zustand storage backed by Keychain/Keystore. Values are chunked because some
 * iOS Keychain versions reject entries above roughly 2 KB. Existing plaintext
 * AsyncStorage data is migrated on first read and then removed.
 */
export const secureFinancialStorage: StateStorage = {
  async getItem(name) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(name);
    const metadata = await readMetadata(name);
    if (metadata) {
      const chunks = await Promise.all(Array.from({ length: metadata.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(name, metadata.generation, index), options)));
      if (chunks.some((chunk) => chunk == null)) return null;
      return chunks.join('');
    }

    const legacy = await AsyncStorage.getItem(name);
    if (legacy) {
      await secureFinancialStorage.setItem(name, legacy);
      await AsyncStorage.removeItem(name);
    }
    return legacy;
  },

  async setItem(name, value) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(name, value);
    const previous = await readMetadata(name);
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const characters = Array.from(value);
    const chunks = Array.from({ length: Math.ceil(characters.length / CHUNK_SIZE) }, (_, index) =>
      characters.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE).join(''));
    await Promise.all(chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(name, generation, index), chunk, options)));
    await SecureStore.setItemAsync(metaKey(name), JSON.stringify({ generation, count: chunks.length }), options);
    await deleteGeneration(name, previous);
  },

  async removeItem(name) {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(name);
    const metadata = await readMetadata(name);
    await deleteGeneration(name, metadata);
    await SecureStore.deleteItemAsync(metaKey(name), options);
    await AsyncStorage.removeItem(name);
  },
};
