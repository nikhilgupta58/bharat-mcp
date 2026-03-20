import enRaw from './locales/en.json';
import hiRaw from './locales/hi.json';

type Locale = 'en' | 'hi';

type JsonValue = string | { [key: string]: JsonValue };

function flatten(obj: { [key: string]: JsonValue }, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value as { [key: string]: JsonValue }, fullKey));
    }
  }
  return result;
}

const locales: Record<Locale, Record<string, string>> = {
  en: flatten(enRaw as { [key: string]: JsonValue }),
  hi: flatten(hiRaw as { [key: string]: JsonValue }),
};

export class I18nService {
  private locale: Locale;

  constructor(locale: Locale = 'en') {
    this.locale = locale;
  }

  t(key: string, vars?: Record<string, string>): string {
    const translation =
      locales[this.locale][key] ??
      (this.locale !== 'en' ? locales['en'][key] : undefined) ??
      key;

    if (!vars) return translation;

    return translation.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
  }

  getLocale(): Locale {
    return this.locale;
  }
}
