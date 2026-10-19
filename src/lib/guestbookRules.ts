/**
 * What counts as a link in a guestbook note. Links are the #1 spam vector on a public wall, so they are blocked, but only
 * things that really look like links: a scheme ("https://"), "www.", or a lowercase domain ("shop.com", "me@gmail.com", "bit.ly").
 * Careless typing is fine: "I love it.Me too" (no space after the full stop) is a sentence, not a website.
 */
const SCHEME_OR_WWW = /(?:https?:\/\/|www\.)/i;
const DOMAIN = /\b[a-z0-9][a-z0-9-]{1,}\.(?:com|net|org|io|ru|xyz|top|biz|info|ly|gg|cc|link|site|online|shop|store)\b/;

export const looksLikeLink = (s: string): boolean => SCHEME_OR_WWW.test(s) || DOMAIN.test(s);
