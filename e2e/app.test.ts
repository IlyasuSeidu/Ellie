import { device, element, by, expect as detoxExpect } from 'detox';

describe('Ellie App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display the welcome screen', async () => {
    await detoxExpect(
      element(by.text('Open up App.tsx to start working on your app!'))
    ).toBeVisible();
  });

  it('should handle app launch successfully', async () => {
    // Verify that the app launched without crashing
    // This test passes if the app renders successfully
    await detoxExpect(element(by.id('root'))).toExist();
  });
});
