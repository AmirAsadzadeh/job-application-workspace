import { common, createLowlight } from "lowlight";
import type { QuestionCodeLanguage } from "../positionTypes";

export const questionLowlight = createLowlight({
  javascript: common.javascript,
  typescript: common.typescript,
  react_jsx: common.javascript,
  react_tsx: common.typescript,
  html: common.xml,
  css: common.css,
  browser_javascript: common.javascript,
  json: common.json,
  plain_text: common.plaintext,
});

export const defaultQuestionCodeLanguage: QuestionCodeLanguage = "javascript";
