import { Injectable } from '@angular/core';
import { GooglefitService } from './googlefit.service';
import { GadgetbridgeService } from './gadgetbridge.service';
import { DataSample } from 'plugins/cordova-plugin-gadgetbridge/www/gadgetbridge';
import { HealthStoreOptions, HealthData } from '@ionic-native/health/ngx';
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Storage } from '@ionic/storage';
import { dateToEpoch, epochToDate } from './date.function';


@Injectable({
  providedIn: 'root'
})
export class TransferService {
  readonly name = 'TransferService';
  latestSync: number;
  ready$ = new BehaviorSubject<boolean>(false);
  transfering$ = new BehaviorSubject<boolean>(false);
  sub: Subscription;

  constructor(
    private storage: Storage,
    public health: GooglefitService,
    public gadgetbridge: GadgetbridgeService) {
    // this.lastestSync = Date.now() - 8 * 8.64e7;
    this.restoreLatestSync().then(() => {

      this.sub = combineLatest([this.gadgetbridge.connected$, this.health.isAuthorized$]).pipe(
        map(([v1, v2]) => v1 && v2)
      ).subscribe((val) => {
        this.ready$.next(val);
      });
    });
  }

  async run(): Promise<HealthStoreOptions[]> {
    if (this.transfering$.getValue()) {
      return [];
    }
    try {
      this.transfering$.next(true);
      if (!this.latestSync) {
        this.latestSync = await this.getLatestGoogleFit();
      } else {
        if (Date.now() - this.latestSync < 60000) {
          this.transfering$.next(false);
          return [];
        }
      }

      const data = await this.get();
      const res = await this.store(data);

      this.transfering$.next(false);
      return res;
    } catch (err) {
      this.transfering$.next(false);
      console.log(`${this.name} run() error: ${JSON.stringify(err)}`);
      throw (err);
    }
  }

  async dryrun(): Promise<HealthStoreOptions[]> {
    if (this.transfering$.getValue()) {
      return [];
    }
    this.transfering$.next(true);
    if (!this.latestSync) {
      this.latestSync = await this.getLatestGoogleFit();
    }
    console.log(`${this.name} latest sync ${new Date(this.latestSync)}`);

    const data = await this.get();
    const res = this.DataSampleToHealthStoreOptionsBlocks(data);

    this.transfering$.next(false);
    return res;
  }


  async get(): Promise<DataSample[]> {
    console.log(`${this.name} get()`);
    const start = Math.floor(this.latestSync / 1000) + 1;
    const end = Math.floor(Date.now() / 1000);

    const data = await this.gadgetbridge.fetch(start, end);
    console.log(`${this.name} get : got ${data.length} entries (before filter)`);
    return data.filter((d) => (d.raw && d.raw >= 0));
  }

  private DataSampleToHealthStoreOptions(data: DataSample[]): HealthStoreOptions[] {
    const out: HealthStoreOptions[] = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].steps) {
        let start = (data[i].timestamp - 60) * 1000;
        if (i > 0) {
          start = data[i - 1].timestamp * 1000;
        }
        const end = data[i].timestamp * 1000;
        const packet: HealthStoreOptions = {
          startDate: new Date(start),
          endDate: new Date(end),
          dataType: 'steps',
          value: data[i].steps,
          sourceName: 'mitogo',
          sourceBundleId: 'be.kuleuven.mitogo'
        };
        out.push(packet);
      }
    }
    return out;
  }

  private DataSampleToHealthStoreOptionsMerge(data: DataSample[]): HealthStoreOptions[] {
    // collect consecutive DataSamples with steps
    const out: HealthStoreOptions[] = [];
    let current: HealthStoreOptions = null;
    for (let i = 0; i < data.length; i++) {
      if (data[i].steps) {
        const start = (i > 0) ? data[i - 1].timestamp * 1000 : (data[i].timestamp - 60) * 1000;
        const end = data[i].timestamp * 1000;
        if (current) {
          current.endDate = new Date(end);
          current.value = +current.value + data[i].steps;
        } else {
          current = {
            startDate: new Date(start),
            endDate: new Date(end),
            dataType: 'steps',
            value: data[i].steps,
            sourceName: 'mitogo',
            sourceBundleId: 'be.kuleuven.mitogo'
          };
        }
      } else {
        if (current) {
          const delta = Math.abs(data[i].timestamp * 1000 - current.endDate.getTime());
          if (delta > 600000) {
            out.push(current); current = null;
          }
        }
      }
    }
    if (current) { out.push(current); current = null; }
    return out;
  }

  private DataSampleToHealthStoreOptionsBlocks(data: DataSample[]): HealthStoreOptions[] {
    // collect consecutive DataSamples with steps in blocks of max. 10 minutes.
    const out: HealthStoreOptions[] = [];
    let current: HealthStoreOptions = null;
    for (let i = 0; i < data.length; i++) {
      const end = data[i].timestamp * 1000;
      if (data[i].steps) {
        const start = (i > 0) ? data[i - 1].timestamp * 1000 : (data[i].timestamp - 60) * 1000;
        if (current) {
          current.endDate = new Date(end);
          current.value = +current.value + data[i].steps;
        } else {
          current = {
            startDate: new Date(start),
            endDate: new Date(end),
            dataType: 'steps',
            value: data[i].steps,
            sourceName: 'mitogo',
            sourceBundleId: 'be.kuleuven.mitogo'
          };
        }
      }
      if (current) {
        const delta = Math.abs(end - current.startDate.getTime());
        if (delta >= 600000) {
          out.push(current); current = null;
        }
      }
    }
    if (current) { out.push(current); current = null; }
    return out;
  }

  async store(data: DataSample[]): Promise<HealthStoreOptions[]> {
    console.log(`${this.name} store() n=${data.length}`);
    const insertData = this.DataSampleToHealthStoreOptionsBlocks(data);
    console.log(`${this.name} store() n=${insertData.length}`);
    let mostRecent = new Date(0);
    for (const item of insertData) {
      try {
        await this.health.health.store(item);
      } catch (err) {
        throw new Error(`Health.store: error inserting item ${new Date(item.startDate)} - ${new Date(item.endDate)}`);
      }
      mostRecent = new Date(item.endDate);
      console.log(`${this.name} store() saved item ${item.startDate}`);
    }
    console.log(`${this.name} store() saved all items`);
    if (mostRecent.getTime() > this.latestSync) {
      console.log(`${this.name} updating LatestSync to ${mostRecent}`);
      this.latestSync = mostRecent.getTime();
      await this.saveLatestSync();
    }
    console.log(`${this.name} store() end`);
    return insertData;
  }

  async restoreLatestSync(): Promise<void> {
    const val = await this.storage.get('latestSync');
    console.log(`${this.name} restoreLatestSync() ${val}`);
    if (val && val > 0) {
      this.latestSync = val;
    }
  }

  async saveLatestSync(): Promise<void> {
    console.log(`${this.name} saveLatestSync() ${this.latestSync}`);
    await this.storage.set('latestSync', this.latestSync);
  }

  async getLatestGoogleFit(): Promise<number> {
    console.log(`${this.name} getLatestGoogleFit()`);
    const today = dateToEpoch();
    const start = epochToDate(today - 3).setHours(0, 0, 0, 0);
    const value = await this.health.get(new Date(start), new Date());
    let current = start;
    value.forEach((v) => {
      if (v.endDate.getTime() > current && v.sourceBundleId === 'be.kuleuven.mitogo') {
        current = v.endDate.getTime();
      }
    });
    return current;
  }

}
