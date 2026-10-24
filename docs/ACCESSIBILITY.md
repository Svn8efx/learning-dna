# Accessibility

## What is implemented

| Need | Features |
|---|---|
| Screen-reader users (JAWS, NVDA, VoiceOver) | Skip link; landmarks (`header`, `nav`, `main`, `footer`, search); one `h1` per page; labelled form controls with `fieldset`/`legend`; quiz answers in a labelled `radiogroup`; dialogs with focus management and Esc; page-change announcements in a live region; decorative icons hidden; descriptive names on icon-only buttons in the header, quiz, tutor and dialogs; the path map nodes are keyboard-focusable and the same steps appear in a list; charts always have a data table |
| Low vision | Text size 100-200% (most sizes use `rem` and scale with it; the SVG path map scrolls sideways instead); high-contrast mode (black/white/yellow, 2px borders); slightly lighter secondary text in the default theme; visible 3-4px focus outline; zoom-friendly layout |
| Hearing | Caption request for embedded YouTube videos; text lessons and downloadable `.txt` transcripts; all alerts are shown on screen (and announced) |
| Motor / wheelchair users who cannot use a mouse comfortably | Everything works from the keyboard; shortcuts (Alt+Shift+letter, listed in the panel); large-target mode (48px minimum); voice commands ("go to quiz", "read page", "bigger text"); no time limits; autoplay removed from the video player |
| Reading support | Listen button on lessons and for whole pages (browser text-to-speech), adjustable speed, plain-language lesson text |

"Wheelchair accessibility" in the project brief is interpreted as *motor accessibility of the software*:
a website cannot change physical access, but it can avoid requiring a mouse, fine pointing or speed.

## Limits (please state these in the report)

- **JAWS was not tested.** The markup follows standard patterns that JAWS supports, but it needs checking on a machine with JAWS
  (or the free NVDA) before claiming compatibility.
- No formal WCAG audit was done. The work targets common WCAG 2.1 AA techniques (keyboard access, focus visibility,
  labels, contrast, resize, no seizure-risk animation) without a certified audit.
- **Voice commands** use the browser's Web Speech API: Chrome and Edge only, they need microphone permission and an internet connection.
- **Text-to-speech** uses voices installed in the browser or operating system, so quality and languages vary.
- **Captions** are requested from YouTube and only appear when the video has them. We do not author captions or audio descriptions
  for third-party videos; the text lessons are the accessible alternative.
- Not implemented: sign-language content, cognitive-accessibility features (reading level controls, focus mode), translation of lesson text.

## Manual test checklist

1. Unplug the mouse. Tab through Home, My DNA, Quiz and Lessons: every control is reachable, focus is always visible, and no keyboard trap exists.
2. With NVDA or JAWS: open the site, press the skip link, move through headings (H), landmarks (D) and form fields (F). Take a quiz and listen to a lesson.
3. Set text size to 200% and turn on high contrast: nothing overlaps or disappears; the Accessibility dialog still fits.
4. Turn on keyboard shortcuts and try Alt+Shift+Q, Alt+Shift+L, Alt+Shift+A.
5. In Chrome, turn on voice commands and say "go to lessons", "read page", "stop".
6. Open a video from the Path page with captions on; confirm captions appear for a video that has them.
7. Browser tools: run Lighthouse Accessibility and the axe DevTools extension on each page and note the scores in the report.
