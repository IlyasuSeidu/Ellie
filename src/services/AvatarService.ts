/**
 * AvatarService
 *
 * Handles avatar image picking, file persistence, and cleanup.
 * Images are copied from the picker's cache to the app's document
 * directory for permanent storage. The file URI is stored in
 * OnboardingData.avatarUri via AsyncStorageService.
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import i18n from '@/i18n';

const AVATAR_DIR = `${FileSystem.documentDirectory}avatars/`;
const AVATAR_FILENAME = 'profile-avatar.jpg';

const translateAvatar = (key: string, fallback: string): string =>
  String(
    i18n.t(key, {
      ns: 'common',
      defaultValue: fallback,
    })
  );

class AvatarService {
  /**
   * Ensure the avatars directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(AVATAR_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AVATAR_DIR, { intermediates: true });
    }
  }

  /**
   * Launch the image library picker.
   * Returns the persisted file URI, or null if cancelled.
   */
  async pickFromLibrary(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          translateAvatar('avatar.permissions.photoLibraryTitle', 'Photo Library Permission'),
          translateAvatar(
            'avatar.permissions.photoLibraryMessage',
            'Please enable photo library access in your device settings to choose a profile photo.'
          ),
          [{ text: translateAvatar('buttons.confirm', 'Confirm') }]
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return null;
      }

      return this.persistImage(result.assets[0].uri);
    } catch {
      Alert.alert(
        translateAvatar('avatar.errors.selectFailedTitle', 'Photo Selection Failed'),
        translateAvatar(
          'avatar.errors.selectFailedMessage',
          'We could not update your profile photo right now. Please try again.'
        ),
        [{ text: translateAvatar('buttons.confirm', 'Confirm') }]
      );
      return null;
    }
  }

  /**
   * Launch the camera.
   * Returns the persisted file URI, or null if cancelled.
   */
  async pickFromCamera(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          translateAvatar('avatar.permissions.cameraTitle', 'Camera Permission'),
          translateAvatar(
            'avatar.permissions.cameraMessage',
            'Please enable camera access in your device settings to take a profile photo.'
          ),
          [{ text: translateAvatar('buttons.confirm', 'Confirm') }]
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return null;
      }

      return this.persistImage(result.assets[0].uri);
    } catch {
      Alert.alert(
        translateAvatar('avatar.errors.captureFailedTitle', 'Camera Failed'),
        translateAvatar(
          'avatar.errors.captureFailedMessage',
          'We could not capture your profile photo right now. Please try again.'
        ),
        [{ text: translateAvatar('buttons.confirm', 'Confirm') }]
      );
      return null;
    }
  }

  /**
   * Copy image from cache to document directory for persistence.
   * Always writes to the same filename to avoid orphaned files.
   */
  private async persistImage(cacheUri: string): Promise<string> {
    await this.ensureDirectory();

    const destUri = `${AVATAR_DIR}${AVATAR_FILENAME}`;

    // Delete old avatar if it exists
    const existing = await FileSystem.getInfoAsync(destUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(destUri, { idempotent: true });
    }

    await FileSystem.copyAsync({ from: cacheUri, to: destUri });
    return destUri;
  }

  /**
   * Delete the persisted avatar image file.
   */
  async deleteAvatar(uri?: string): Promise<void> {
    const targetUri = uri || `${AVATAR_DIR}${AVATAR_FILENAME}`;
    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      if (info.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }
    } catch {
      Alert.alert(
        translateAvatar('avatar.errors.removeFailedTitle', 'Unable to Remove Photo'),
        translateAvatar(
          'avatar.errors.removeFailedMessage',
          'We could not remove your profile photo right now. Please try again.'
        ),
        [{ text: translateAvatar('buttons.confirm', 'Confirm') }]
      );
    }
  }
}

export const avatarService = new AvatarService();
