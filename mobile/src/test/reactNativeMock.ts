export const Platform = { OS: 'ios', select: <T>(choices: { ios?: T; default?: T }) => choices.ios ?? choices.default };
