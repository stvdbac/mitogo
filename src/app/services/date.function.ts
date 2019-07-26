/**
 *  return local datenumber
 */

const msecPerMin = 6e4;
const msecPerDay = 8.64e7;
const msecPer12h = 4.32e7;

export function dateToEpoch(date?: Date): number {
    let current: Date;
    if (!date) {
        current = new Date();
    } else if (typeof date === 'string') {
        current = new Date(date);
    } else {
        current = date;
    }
    const offset = current.getTimezoneOffset() * msecPerMin;
    return Math.floor((current.getTime() - offset) / msecPerDay);
}

export function epochToDate(epoch: number): Date {
    const tmp = new Date(msecPerDay * epoch); // get offset for that day, differs due to daylight savings
    const offset = tmp.getTimezoneOffset() * msecPerMin;
    return new Date(msecPerDay * epoch + offset + msecPer12h);
}
