const DEFAULT_RETURN_PATH = '/dashboard';

/** Keep post-login destinations on this app without decoding the path twice. */
export function getSafeReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return DEFAULT_RETURN_PATH;
  }

  // URL parsers can strip tabs/newlines or normalize backslashes into slashes.
  // Reject controls rather than turning an apparently local path into an authority.
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return DEFAULT_RETURN_PATH;
  }

  // Preserve legitimate query strings, fragments and percent-encoded path data.
  return value;
}
