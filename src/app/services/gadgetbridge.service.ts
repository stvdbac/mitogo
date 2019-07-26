import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

import { GadgetbridgePlugin, DeviceInfo, DeviceConnectionState, ViewType, DataSample } from 'cordova-plugin-gadgetbridge';
import { BehaviorSubject } from 'rxjs';
import { dateToEpoch, epochToDate } from './date.function';
import { startWith } from 'rxjs/operators';

declare var cordova: any;

export interface StepCount {
    day: number;
    count: number;
}

@Injectable({
    providedIn: 'root'
})
export class GadgetbridgeService {

    readonly name = 'GadgetBridgeService';
    plugin: GadgetbridgePlugin;
    connecting$ = new BehaviorSubject<boolean>(false);
    connected$ = new BehaviorSubject<boolean>(false);
    syncing$ = new BehaviorSubject<boolean>(false);
    state$ = new BehaviorSubject<string>('');

    lastSyncTimeStamp = 0;
    state: DeviceConnectionState = null;

    constructor(private platform: Platform) {
        console.log(`${this.name} constructor`);
        this.isAvailable().then(() => {
            console.log(`${this.name} GadgetbridgePlugin available`);
            this.init();
        });
    }

    async isAvailable(): Promise<boolean> {
        await this.platform.ready();
        return (this.platform.is('cordova') && this.platform.is('android') && cordova.plugins.gadgetbridgePlugin != null);
    }

    init() {
        console.log(`${this.name} init()`);
        this.platform.ready().then(() => {
            this.plugin = cordova.plugins.gadgetbridgePlugin;

            this.plugin.onConnect((state: DeviceConnectionState) => {
                console.log(`${this.name} connected ${state.address} - ${state.state}`);
                // this.connected = true;
                this.state = state;
                this.state$.next(state.state);
                if (state.state === 'CONNECTED') { this.connected$.next(true); }
                if (state.state === 'NOT_CONNECTED') { this.connected$.next(false); }
                // this.cd.detectChanges();
            });
            // this.plugin.offConnect(() => {
            //     console.log(`${this.name} disconnected`);
            //     // this.connected = false;
            //     this.state = null;
            //     this.connected$.next(false);
            // });

            // try connecting, when app start / resumes
            this.platform.resume.pipe(startWith(true)).subscribe(() => {
                console.log(`${this.name} App resumed`);
                setTimeout(() => this.connect().catch(() => console.log(`${this.name} error: failed to connect`)), 0);
              });
        });
    }

    openView(viewType: ViewType): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.plugin.openView(viewType, resolve, reject);
        });
    }

    getDeviceInfo(): Promise<DeviceInfo> {
        return new Promise<DeviceInfo>((resolve, reject) => {
            this.plugin.getDeviceInfo(resolve, reject);
        });
    }

    connect(): Promise<void> {
        this.connecting$.next(true);
        return new Promise<void>((resolve, reject) => {
            this.plugin.connect(
                () => {
                    console.log(`${this.name} connect successful`);
                    this.connected$.next(true);
                    this.connecting$.next(false);
                    resolve();
                },
                (err) => {
                    console.log(`${this.name} connect error ${JSON.stringify(err)}`);
                    this.connected$.next(false);
                    this.connecting$.next(false);
                    reject();
                });
        });

        // this.plugin.connect(
        //     () => {
        //         console.log(`${this.name} connect success`);
        //     },
        //     () => {
        //         console.log(`${this.name} connect failed`);
        //     }
        // );
    }

    isConnected(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.plugin.isConnected((val) => {
                console.log(`${this.name} isconnected return; ${val}`);
                this.connected$.next(!!val); resolve(val);
            }, reject);
        });
    }

    // sync() {
    //     if (this.syncing) return;
    //     this. syncing = true;
    //     this.plugin.synchronize(
    //         () => {
    //             console.log(`${this.name} synchronize succes`);
    //             this.syncing = false;
    //             this.lastSyncTimeStamp = Date.now();
    //         },
    //         () => {
    //             console.log(`${this.name} synchronize failed`);
    //             this.syncing = false;
    //         }
    //     );
    // }

    sync(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.syncing$.getValue()) { resolve(); }
            // this.syncing = true;
            this.syncing$.next(true);
            this.plugin.synchronize(
                () => {
                    console.log(`${this.name} synchronize succes`);
                    // this.syncing = false;
                    this.syncing$.next(false);
                    this.lastSyncTimeStamp = Date.now();
                    resolve();
                },
                (error) => {
                    console.log(`${this.name} synchronize failed`);
                    // this.syncing = false;
                    this.syncing$.next(false);
                    reject(error);
                }
            );
        });
    }

    fetch(start: number, end: number): Promise<DataSample[]> {
        return new Promise<DataSample[]>((resolve, reject) => {
            this.plugin.retrieveData(start, end, resolve, reject);
        });
    }

    async fetchDays(startday: number, endday: number): Promise<StepCount[]> {
        const start = epochToDate(startday);
        start.setHours(0, 0, 0, 0);
        const end = epochToDate(endday);
        end.setHours(23, 59, 59, 999);
        return this.getStepsForRange(start, end);
    }

    async getStepsForRange(startdate: Date, enddate: Date): Promise<StepCount[]> {
        const s = Math.floor(startdate.getTime() / 1000);
        const e = Math.floor(enddate.getTime() / 1000);
        const out: StepCount[] = [];
        const data = await this.fetch(s, e);
        if (data && data.length > 0) {
            data.forEach((sample: DataSample) => {
                if (sample.steps) {
                    const day = dateToEpoch(new Date(sample.timestamp * 1000));
                    const steps = sample.steps;
                    const idx = out.findIndex((o) => o.day === day);
                    if (idx > -1) {
                        out[idx].count += steps;
                    } else {
                        out.push({ day, count: steps });
                    }
                }
            });
        }
        return out;
    }
}
