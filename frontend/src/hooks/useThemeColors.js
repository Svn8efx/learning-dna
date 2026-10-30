import { useEffect, useState } from 'react';

const read = () => {
  const style = getComputedStyle(document.documentElement);
  const rgb = (name) => `rgb(${style.getPropertyValue(`--c-${name}`).trim().split(/\s+/).join(', ')})`;
  return { accent: rgb('accent'), ink: rgb('ink'), muted: rgb('muted'), line: rgb('line'), lineStrong: rgb('line-strong'), surface: rgb('surface'), success: rgb('success'), warning: rgb('warning'), danger: rgb('danger') };
};

/** Chart libraries need real colour values, so read the design tokens and refresh when the theme or contrast changes. */
export function useThemeColors() {
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] });
    return () => observer.disconnect();
  }, []);
  return colors;
}
