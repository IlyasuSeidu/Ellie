import fs from 'fs';
import path from 'path';

describe('Ryvro environment template', () => {
  const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');

  it('uses Ryvro defaults for public launch configuration', () => {
    expect(envExample).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envExample).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envExample).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
  });

  it('does not advertise retired Ellie or ShiftSync values in new environments', () => {
    expect(envExample).not.toContain('https://api.shiftsync.app');
    expect(envExample).not.toContain('cloudfunctions.net/ellieBrain');
    expect(envExample).not.toContain('WAKE_WORD_PHRASE=Hey Ellie');
    expect(envExample).not.toContain('ellie_android.ppn');
    expect(envExample).not.toContain('ellie_ios.ppn');
    expect(envExample).not.toContain('hey_ellie');
  });

  it('keeps old brain keys only as empty migration fallbacks', () => {
    expect(envExample).toContain('ELLIE_BRAIN_URL=');
    expect(envExample).toContain('ELLIE_BRAIN_TIMEOUT=');
  });
});
