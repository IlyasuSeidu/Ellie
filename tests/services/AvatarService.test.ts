/**
 * AvatarService Tests
 */

import { Alert } from 'react-native';

// Mock expo-image-picker
const mockRequestMediaLibraryPermissions = jest.fn();
const mockRequestCameraPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockLaunchCamera = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissions(),
  requestCameraPermissionsAsync: () => mockRequestCameraPermissions(),
  launchImageLibraryAsync: (opts: unknown) => mockLaunchImageLibrary(opts),
  launchCameraAsync: (opts: unknown) => mockLaunchCamera(opts),
}));

// Mock expo-file-system
const mockGetInfo = jest.fn();
const mockMakeDirectory = jest.fn();
const mockDeleteAsync = jest.fn();
const mockCopyAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: (uri: string) => mockGetInfo(uri),
  makeDirectoryAsync: (uri: string, opts: unknown) => mockMakeDirectory(uri, opts),
  deleteAsync: (uri: string, opts: unknown) => mockDeleteAsync(uri, opts),
  copyAsync: (opts: unknown) => mockCopyAsync(opts),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

import { avatarService } from '@/services/AvatarService';

describe('AvatarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: directory doesn't exist
    mockGetInfo.mockResolvedValue({ exists: false });
    mockMakeDirectory.mockResolvedValue(undefined);
    mockCopyAsync.mockResolvedValue(undefined);
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  describe('pickFromLibrary', () => {
    it('should return persisted URI on success', async () => {
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///cache/photo.jpg' }],
      });

      const result = await avatarService.pickFromLibrary();

      expect(result).toBe('file:///docs/avatars/profile-avatar.jpg');
      expect(mockCopyAsync).toHaveBeenCalledWith({
        from: 'file:///cache/photo.jpg',
        to: 'file:///docs/avatars/profile-avatar.jpg',
      });
    });

    it('should return null when user cancels', async () => {
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
      mockLaunchImageLibrary.mockResolvedValue({ canceled: true });

      const result = await avatarService.pickFromLibrary();
      expect(result).toBeNull();
    });

    it('should return null and show alert when permission denied', async () => {
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' });

      const result = await avatarService.pickFromLibrary();
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Photo Library Permission',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should delete existing avatar before copying new one', async () => {
      mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///cache/new.jpg' }],
      });
      // Directory exists, old file exists
      mockGetInfo
        .mockResolvedValueOnce({ exists: true }) // dir check
        .mockResolvedValueOnce({ exists: true }); // old file check

      await avatarService.pickFromLibrary();

      expect(mockDeleteAsync).toHaveBeenCalledWith('file:///docs/avatars/profile-avatar.jpg', {
        idempotent: true,
      });
    });
  });

  describe('pickFromCamera', () => {
    it('should return persisted URI on success', async () => {
      mockRequestCameraPermissions.mockResolvedValue({ status: 'granted' });
      mockLaunchCamera.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///cache/camera.jpg' }],
      });

      const result = await avatarService.pickFromCamera();

      expect(result).toBe('file:///docs/avatars/profile-avatar.jpg');
      expect(mockLaunchCamera).toHaveBeenCalledWith(
        expect.objectContaining({ allowsEditing: true, aspect: [1, 1] })
      );
    });

    it('should return null when permission denied', async () => {
      mockRequestCameraPermissions.mockResolvedValue({ status: 'denied' });

      const result = await avatarService.pickFromCamera();
      expect(result).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should return null when user cancels', async () => {
      mockRequestCameraPermissions.mockResolvedValue({ status: 'granted' });
      mockLaunchCamera.mockResolvedValue({ canceled: true });

      const result = await avatarService.pickFromCamera();
      expect(result).toBeNull();
    });
  });

  describe('deleteAvatar', () => {
    it('should delete file when it exists', async () => {
      mockGetInfo.mockResolvedValue({ exists: true });

      await avatarService.deleteAvatar('file:///docs/avatars/profile-avatar.jpg');

      expect(mockDeleteAsync).toHaveBeenCalledWith('file:///docs/avatars/profile-avatar.jpg', {
        idempotent: true,
      });
    });

    it('should not delete when file does not exist', async () => {
      mockGetInfo.mockResolvedValue({ exists: false });

      await avatarService.deleteAvatar('file:///docs/avatars/profile-avatar.jpg');

      expect(mockDeleteAsync).not.toHaveBeenCalled();
    });

    it('should use default path when no URI provided', async () => {
      mockGetInfo.mockResolvedValue({ exists: true });

      await avatarService.deleteAvatar();

      expect(mockGetInfo).toHaveBeenCalledWith('file:///docs/avatars/profile-avatar.jpg');
    });

    it('should not throw on deletion error', async () => {
      mockGetInfo.mockRejectedValue(new Error('disk error'));

      await expect(avatarService.deleteAvatar()).resolves.not.toThrow();
    });
  });
});
