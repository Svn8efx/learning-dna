import { parseVoiceCommand, normalizePhrase, pageForPhrase } from './useVoiceCommands';
import { findClickable, clickByVoice } from '../utils/voiceClick';

test('removes punctuation and capitals added by the speech service', () => {
  expect(normalizePhrase('Go to quiz.')).toBe('go to quiz');
});

test('navigates even when the phrase has a full stop, the word page, or a misheard "go to"', () => {
  expect(parseVoiceCommand('Go to quiz.')).toEqual({ action: 'navigate', to: '/quiz' });
  expect(parseVoiceCommand('open the lessons page')).toEqual({ action: 'navigate', to: '/lessons' });
  expect(parseVoiceCommand('Take me to my DNA')).toEqual({ action: 'navigate', to: '/my-dna' });
  expect(parseVoiceCommand('show progress')).toEqual({ action: 'navigate', to: '/progress' });
  expect(parseVoiceCommand('do start.')).toEqual({ action: 'navigate', to: '/start' });
  expect(parseVoiceCommand('to dashboard')).toEqual({ action: 'navigate', to: '/dashboard' });
});

test('a bare page word or random speech does not navigate', () => {
  expect(pageForPhrase('start')).toBeUndefined();
  expect(parseVoiceCommand('progress')).toBeNull();
  expect(parseVoiceCommand('go to the moon')).toBeNull();
});

test('scroll, back, help and close commands', () => {
  expect(parseVoiceCommand('Scroll down.')).toEqual({ action: 'scrollDown' });
  expect(parseVoiceCommand('scroll up')).toEqual({ action: 'scrollUp' });
  expect(parseVoiceCommand('page down')).toEqual({ action: 'scrollDown' });
  expect(parseVoiceCommand('scroll to top')).toEqual({ action: 'scrollTop' });
  expect(parseVoiceCommand('go to bottom')).toEqual({ action: 'scrollBottom' });
  expect(parseVoiceCommand('go back')).toEqual({ action: 'goBack' });
  expect(parseVoiceCommand('What can I say?')).toEqual({ action: 'help' });
  expect(parseVoiceCommand('close settings')).toEqual({ action: 'closeSettings' });
  expect(parseVoiceCommand('stop listening')).toEqual({ action: 'stopListening' });
});

test('click commands carry the spoken label', () => {
  expect(parseVoiceCommand('Click on go to start.')).toEqual({ action: 'click', label: 'go to start', fallbackTo: '/start' });
  expect(parseVoiceCommand('press the submit button')).toEqual({ action: 'click', label: 'submit', fallbackTo: undefined });
});

test('other commands still work', () => {
  expect(parseVoiceCommand('Bigger text.')).toEqual({ action: 'biggerText' });
  expect(parseVoiceCommand('normal text')).toEqual({ action: 'normalText' });
  expect(parseVoiceCommand('Read this page.')).toEqual({ action: 'readPage' });
  expect(parseVoiceCommand('Stop.')).toEqual({ action: 'stopReading' });
  expect(parseVoiceCommand('turn on high contrast')).toEqual({ action: 'contrast', on: true });
});

test('finds and clicks a button by its spoken name', () => {
  document.body.innerHTML = '<button id="a">Go to Start</button><button id="b" aria-label="Notifications">x</button><button id="c" disabled>Submit</button>';
  let clicked = '';
  document.getElementById('a').addEventListener('click', () => { clicked = 'a'; });
  expect(findClickable('go to start').id).toBe('a');
  expect(findClickable('notifications').id).toBe('b');
  expect(findClickable('submit')).toBeNull();
  expect(clickByVoice('click go to start'.replace('click ', ''))).toBe('Go to Start');
  expect(clicked).toBe('a');
  expect(clickByVoice('banana')).toBe('');
});
