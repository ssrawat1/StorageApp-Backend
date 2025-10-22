export function throttle(waitTime, delayAfter = 1) {
  const clientData = {};

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    // If IP doesn't exist
    if (!clientData[ip]) {
      clientData[ip] = {
        remainingFastRequests: delayAfter,
        lastRequestTime: now - waitTime,
        previousDelay: 0,
      };
    }

    const data = clientData[ip];
 
    // Allow N fast requests per IP
    if (data.remainingFastRequests > 0) {
      data.remainingFastRequests--;
      data.lastRequestTime = now;
      return next();
    }

    const timePassed = now - data.lastRequestTime;
    const delay = Math.max(0, waitTime + data.previousDelay - timePassed);

    data.previousDelay = delay;
    data.lastRequestTime = now;

    setTimeout(next, delay);
  };
}
