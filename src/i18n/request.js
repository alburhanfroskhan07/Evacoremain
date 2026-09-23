import { getRequestConfig } from "next-intl/server";
import { dictionaries } from "@/lib/i18n/dictionaries";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !["en", "hi", "bn"].includes(locale)) {
    locale = "en";
  }

  return {
    locale,
    messages: dictionaries[locale] || dictionaries.en,
  };
});