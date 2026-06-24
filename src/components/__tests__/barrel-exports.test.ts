describe('component barrel exports', () => {
  it('exports premium onboarding components from barrel', () => {
    const premium = require('@/components/onboarding/premium');
    expect(premium.PremiumButton).toBeDefined();
  });
});
