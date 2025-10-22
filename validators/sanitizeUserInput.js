import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export const sanitizeUserInput = (userInput) => {
  const cleanInput = {};
  Object.entries(userInput).forEach(([key, value]) => {
    cleanInput[key] = purify.sanitize(value, {
      ALLOWED_TAGS: [], // No HTML tags
      ALLOWED_ATTR: [], // No attributes
    });
  });
  return cleanInput;
};
