/**
 * MOCKED speech service. These tests prove how our code reacts to the events a browser's speech recogniser
 * sends (start, result, error, end). They do not prove that a real microphone or the browser's speech service works.
 */
class MockRecognition {
  constructor() { MockRecognition.instances.push(this); this.starts = 0; this.aborts = 0; }
  start() { this.starts += 1; }
  abort() { this.aborts += 1; }
  say(transcript) { this.onresult({ results: [[{ transcript }]] }); }
}
MockRecognition.instances = [];

function load(Recognition) {
  let loaded;
  jest.isolateModules(() => {          // the hook reads window.SpeechRecognition once, when it is imported
    window.SpeechRecognition = Recognition;
    window.webkitSpeechRecognition = Recognition;
    loaded = {
      React: require('react'), ReactDOM: require('react-dom'), act: require('react-dom/test-utils').act,
      ...require('./useVoiceCommands'),
    };
  });
  return loaded;
}

function mountProbe(mod, props) {
  const { React, ReactDOM, act } = mod;
  const out = { current: null };
  const container = document.createElement('div');
  const Probe = (p) => { out.current = mod.useVoiceCommands(p.enabled, p.handlers, p.onHeard); return null; };
  const render = (p) => act(() => { ReactDOM.render(React.createElement(Probe, p), container); });
  render(props);
  return { out, render, unmount: () => act(() => { ReactDOM.unmountComponentAtNode(container); }), act };
}

let handlers;
let heard;
beforeEach(() => {
  jest.useFakeTimers();
  MockRecognition.instances = [];
  handlers = { navigate: jest.fn(), goBack: jest.fn(), openSettings: jest.fn(), stopListening: jest.fn(), biggerText: jest.fn() };
  heard = jest.fn();
});
afterEach(() => { jest.useRealTimers(); delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });

const last = () => MockRecognition.instances[MockRecognition.instances.length - 1];

test('does nothing while voice commands are switched off', () => {
  const mod = load(MockRecognition);
  mountProbe(mod, { enabled: false, handlers, onHeard: heard });
  expect(MockRecognition.instances).toHaveLength(0);
});

test('reports unsupported browsers instead of crashing', () => {
  const mod = load(undefined);
  expect(mod.voiceSupported).toBe(false);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  expect(probe.out.current.supported).toBe(false);
  expect(probe.out.current.listening).toBe(false);
});

test('starts, shows listening, runs a spoken command and ignores speech that is not a command', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  expect(last().starts).toBe(1);
  probe.act(() => { last().onstart(); });
  expect(probe.out.current.listening).toBe(true);
  probe.act(() => { last().say('Go to quiz.'); });
  expect(handlers.navigate).toHaveBeenCalledWith('/quiz');
  expect(heard).toHaveBeenLastCalledWith('go to quiz.', true, undefined);
  probe.act(() => { last().say('I think the quiz is difficult'); });
  expect(handlers.navigate).toHaveBeenCalledTimes(1);
  expect(heard).toHaveBeenLastCalledWith('i think the quiz is difficult', false, undefined);
  probe.act(() => { last().say('my settings are fine'); });
  expect(handlers.openSettings).not.toHaveBeenCalled();
});

test('restarts quietly after silence or when the service ends the session', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  probe.act(() => { last().onerror({ error: 'no-speech' }); last().onend(); });
  probe.act(() => { jest.advanceTimersByTime(400); });
  expect(last().starts).toBe(2);
  expect(probe.out.current.error).toBe('');
});

test('permission denied stops for good, reports the error and does not loop', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  probe.act(() => { last().onerror({ error: 'not-allowed' }); last().onend(); });
  probe.act(() => { jest.advanceTimersByTime(10000); });
  expect(probe.out.current.error).toBe('not-allowed');
  expect(last().starts).toBe(1);
});

test('a missing microphone is reported and not retried', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  probe.act(() => { last().onerror({ error: 'audio-capture' }); last().onend(); });
  probe.act(() => { jest.advanceTimersByTime(10000); });
  expect(probe.out.current.error).toBe('audio-capture');
  expect(last().starts).toBe(1);
});

test('short network drops are retried, and reported only after three in a row', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  for (let i = 0; i < 2; i += 1) {
    probe.act(() => { last().onerror({ error: 'network' }); last().onend(); });
    probe.act(() => { jest.advanceTimersByTime(5000); });
    expect(probe.out.current.error).toBe('');
  }
  expect(last().starts).toBe(3);
  probe.act(() => { last().onerror({ error: 'network' }); last().onend(); });
  probe.act(() => { jest.advanceTimersByTime(10000); });
  expect(probe.out.current.error).toBe('network');
  expect(last().starts).toBe(3);
});

test('retry starts a new session after an error', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  probe.act(() => { last().onerror({ error: 'not-allowed' }); });
  expect(probe.out.current.error).toBe('not-allowed');
  probe.act(() => { probe.out.current.retry(); });
  expect(MockRecognition.instances).toHaveLength(2);
  expect(probe.out.current.error).toBe('');
});

test('switching voice commands off, or leaving the page, stops the recogniser and any pending restart', () => {
  const mod = load(MockRecognition);
  const probe = mountProbe(mod, { enabled: true, handlers, onHeard: heard });
  const first = last();
  probe.act(() => { first.onend(); });                       // a restart is now pending
  probe.render({ enabled: false, handlers, onHeard: heard });
  expect(first.aborts).toBe(1);
  probe.act(() => { jest.advanceTimersByTime(10000); });
  expect(first.starts).toBe(1);                              // the pending restart never fired
  probe.render({ enabled: true, handlers, onHeard: heard });
  const second = last();
  probe.unmount();
  expect(second.aborts).toBe(1);
});
