import { parseVoiceCommand, normalizePhrase } from './useVoiceCommands';

test('removes punctuation and capitals added by the speech service', () => {
  expect(normalizePhrase('Go to quiz.')).toBe('go to quiz');
});

test('navigates even when the phrase has a full stop or the word page', () => {
  expect(parseVoiceCommand('Go to quiz.')).toEqual({ action: 'navigate', to: '/quiz' });
  expect(parseVoiceCommand('open the lessons page')).toEqual({ action: 'navigate', to: '/lessons' });
  expect(parseVoiceCommand('Take me to my DNA')).toEqual({ action: 'navigate', to: '/my-dna' });
  expect(parseVoiceCommand('show progress')).toEqual({ action: 'navigate', to: '/progress' });
});

test('other commands still work and unknown phrases return null', () => {
  expect(parseVoiceCommand('Bigger text.')).toEqual({ action: 'biggerText' });
  expect(parseVoiceCommand('Read this page.')).toEqual({ action: 'readPage' });
  expect(parseVoiceCommand('Stop.')).toEqual({ action: 'stopReading' });
  expect(parseVoiceCommand('turn on high contrast')).toEqual({ action: 'contrast', on: true });
  expect(parseVoiceCommand('go to the moon')).toBeNull();
});
