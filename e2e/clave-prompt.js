// Vive en un modulo aparte, sin imports, por una razon concreta: si el config de
// Playwright lo importara desde helpers.js, el modulo se evaluaria antes de que
// corra process.loadEnvFile('.env') y las credenciales de los E2E quedarian
// undefined. Este archivo no lee nada, asi que el orden de carga da igual.
export const CLAVE_PROMPT = 'installDismissed'
