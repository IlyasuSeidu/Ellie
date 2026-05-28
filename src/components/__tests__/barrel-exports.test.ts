describe('component barrel exports', () => {
  it('exports premium onboarding components from barrel', () => {
    const premium = require('@/components/onboarding/premium');
    expect(premium.PremiumButton).toBeDefined();
    expect(premium.ProgressHeader).toBeDefined();
    expect(premium.TimePickerModal).toBeDefined();
    expect(premium.PremiumCountrySelectorModal).toBeDefined();
  });

  it('exports voice components from barrel', () => {
    jest.resetModules();
    jest.doMock('@/components/voice/RyvroVoiceButton', () => ({
      RyvroVoiceButton: 'RyvroVoiceButton',
    }));
    jest.doMock('@/components/voice/VoiceAssistantModal', () => ({
      VoiceAssistantModal: 'VoiceAssistantModal',
    }));
    jest.doMock('@/components/voice/ListeningIndicator', () => ({
      ListeningIndicator: 'ListeningIndicator',
    }));
    jest.doMock('@/components/voice/ResponseBubble', () => ({
      ResponseBubble: 'ResponseBubble',
    }));

    const voice = require('@/components/voice');
    expect(voice.RyvroVoiceButton).toBeDefined();
    expect(voice.VoiceAssistantModal).toBeDefined();
    expect(voice.ListeningIndicator).toBeDefined();
    expect(voice.ResponseBubble).toBeDefined();
  });
});
