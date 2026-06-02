 /*
  Google reCAPTCHA v2 checkbox helper.

  Frontend env:
    VITE_RECAPTCHA_SITE_KEY or NEXT_PUBLIC_RECAPTCHA_SITE_KEY or RECAPTCHA_SITE_KEY

  Backend env:
    RECAPTCHA_SECRET_KEY

  Frontend usage:
    <script src="https://www.google.com/recaptcha/api.js?render=explicit" async defer></script>
    <div id="captcha-box"></div>

    import { renderCaptcha, getCaptchaToken, resetCaptcha } from "./captcha.js";

    await renderCaptcha("captcha-box", { siteKey: "your_public_site_key" });
    const captchaToken = getCaptchaToken();

  Backend usage:
    import { verifyCaptchaToken, captchaMiddleware } from "./captcha.js";

    app.post("/api/your-route", captchaMiddleware(), async (req, res) => {
      res.json({ ok: true });
    });
*/

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

let captchaWidgetId = null;

function getBrowserSiteKey(explicitSiteKey) {
  return (
    explicitSiteKey ||
    globalThis?.import?.meta?.env?.VITE_RECAPTCHA_SITE_KEY ||
    globalThis?.process?.env?.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    globalThis?.process?.env?.RECAPTCHA_SITE_KEY ||
    ""
  );
}

function waitForRecaptcha(timeoutMs = 10000) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA can only be rendered in a browser."));
  }

  if (window.grecaptcha?.render) {
    return Promise.resolve(window.grecaptcha);
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.grecaptcha?.render) {
        window.clearInterval(timer);
        resolve(window.grecaptcha);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("reCAPTCHA script did not load."));
      }
    }, 100);
  });
}

export async function renderCaptcha(container, options = {}) {
  const grecaptcha = await waitForRecaptcha(options.timeoutMs);
  const element =
    typeof container === "string" ? document.getElementById(container) : container;

  if (!element) {
    throw new Error("Captcha container was not found.");
  }

  const sitekey = getBrowserSiteKey(options.siteKey);
  if (!sitekey) {
    throw new Error("Missing reCAPTCHA site key.");
  }

  captchaWidgetId = grecaptcha.render(element, {
    sitekey,
    theme: options.theme || "light",
    size: options.size || "normal",
    callback: options.onSuccess,
    "expired-callback": options.onExpired,
    "error-callback": options.onError,
  });

  return captchaWidgetId;
}

export function getCaptchaToken(widgetId = captchaWidgetId) {
  if (typeof window === "undefined" || !window.grecaptcha) {
    return "";
  }

  return window.grecaptcha.getResponse(widgetId);
}

export function resetCaptcha(widgetId = captchaWidgetId) {
  if (typeof window !== "undefined" && window.grecaptcha && widgetId !== null) {
    window.grecaptcha.reset(widgetId);
  }
}

export function requireCaptchaToken(token) {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      error: "captcha_required",
      message: "Please complete the captcha checkbox.",
    };
  }

  return { ok: true };
}

export async function verifyCaptchaToken(token, options = {}) {
  const required = requireCaptchaToken(token);
  if (!required.ok) return required;

  const secret =
    options.secret ||
    globalThis?.process?.env?.RECAPTCHA_SECRET_KEY ||
    globalThis?.process?.env?.RECAPTCHA_PRIVATE_KEY ||
    "";

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "captcha_secret_missing",
      message: "Captcha secret key is not configured.",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  if (options.remoteIp) {
    body.set("remoteip", options.remoteIp);
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const result = await response.json();

    if (!result.success) {
      return {
        ok: false,
        status: 403,
        error: "captcha_failed",
        message: "Captcha verification failed.",
        details: result["error-codes"] || [],
      };
    }

    return {
      ok: true,
      status: 200,
      challengeTs: result.challenge_ts,
      hostname: result.hostname,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "captcha_unavailable",
      message: "Captcha verification service is unavailable.",
    };
  }
}

export function getCaptchaTokenFromRequest(req) {
  return (
    req?.body?.captchaToken ||
    req?.body?.["g-recaptcha-response"] ||
    req?.query?.captchaToken ||
    req?.headers?.["x-captcha-token"] ||
    ""
  );
}

export function getRemoteIpFromRequest(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || "";
}

export function captchaMiddleware(options = {}) {
  return async function verifyCaptchaMiddleware(req, res, next) {
    const token = options.getToken
      ? options.getToken(req)
      : getCaptchaTokenFromRequest(req);

    const remoteIp = options.remoteIp || getRemoteIpFromRequest(req);
    const result = await verifyCaptchaToken(token, {
      secret: options.secret,
      remoteIp,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        error: result.error,
        message: result.message,
      });
    }

    req.captcha = result;
    return next();
  };
}
