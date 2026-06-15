export const J2000_JD = 2451545.0;

export function dateToJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  let Y = year;
  let M = month;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const dayFraction = (hour + minute / 60 + (second + ms / 1000) / 3600) / 24;

  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B + dayFraction - 1524.5;
}

export function julianDateToDate(jd: number): Date {
  const jdAdjusted = jd + 0.5;
  const Z = Math.floor(jdAdjusted);
  const F = jdAdjusted - Z;

  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const dayFrac = day - dayInt;
  const hours = Math.floor(dayFrac * 24);
  const minutes = Math.floor((dayFrac * 24 - hours) * 60);
  const seconds = Math.floor(((dayFrac * 24 - hours) * 60 - minutes) * 60);
  const milliseconds = Math.floor(((((dayFrac * 24 - hours) * 60 - minutes) * 60 - seconds) * 1000));

  return new Date(Date.UTC(year, month - 1, dayInt, hours, minutes, seconds, milliseconds));
}

export function getCurrentJD(): number {
  return dateToJulianDate(new Date());
}

export function daysSinceJ2000(jd: number): number {
  return jd - J2000_JD;
}

export function jdFromDaysSinceJ2000(days: number): number {
  return J2000_JD + days;
}

export function formatJDDate(jd: number): string {
  const date = julianDateToDate(jd);
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19) + ' UTC';
}
