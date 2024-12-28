export function getBrowser(): typeof browser | typeof chrome {
  if (typeof browser !== 'undefined') {
    // firefox
    return browser as typeof browser;
  } else if (typeof chrome !== 'undefined') {
    // chrome
    return chrome as typeof chrome;
  } else {
    throw new Error('Unsupported browser environment');
  }
}
