const { cookieNamesEnum, envType } = require('./commonVars');

const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === envType.PRODUCTION;
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE || 'lax';
  // e.g. ".tankhwapatra.co.in" so the cookie is also sent to sibling subdomains (apichatbot.*).
  // Leave unset for a host-only cookie (localhost / IP-based dev).
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  return {
    domain,
    httpOnly: true,

    // SameSite=None requires Secure: true in all modern browsers.
    // localhost is a secure context, so it will accept Secure cookies even on HTTP.
    secure: isProduction || sameSite === 'none',

    sameSite: sameSite,

    path: '/',

    // Example: 8 hours
    maxAge: 24 * 60 * 60 * 1000,
  };
};

function setCookieInResponse(res, token) {
  if (!token) {
    throw new Error('Token is required to set authentication cookie');
  }

  res.cookie(
    cookieNamesEnum.AUTHENTICATION_TOKEN,
    token,
    getAuthCookieOptions(),
  );
}

function clearCookieInResponse(res) {
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie(cookieNamesEnum.AUTHENTICATION_TOKEN, {
    domain: cookieOptions.domain,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
  res.clearCookie(cookieNamesEnum.AUTHENTICATION_TOKEN, {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
}

module.exports = {
  getAuthCookieOptions,
  setCookieInResponse,
  clearCookieInResponse,
};
