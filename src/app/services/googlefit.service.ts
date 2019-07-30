import { Injectable } from '@angular/core';
import { Health, HealthStoreOptions, HealthData, HealthQueryOptions } from '@ionic-native/health/ngx';
import { BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class GooglefitService {
  readonly name = 'GooglefitService';
  isAvailable$ = new BehaviorSubject<boolean>(null);
  isAuthorized$ = new BehaviorSubject<boolean>(null);

  constructor(private platform: Platform, public health: Health) {
    this.platform.ready().then(() => {
      this.health.isAvailable().then((val) => {
        this.isAvailable$.next(val);
        if (val) {
          this.health.isAuthorized(['steps'])
          .then((v: boolean) => {
            console.log(`${this.name} isAuthorized: ${val}`);
            this.isAuthorized$.next(v);
          })
          .catch((err) => console.log(`${this.name} isAuthorized ERROR: ${JSON.stringify(err)}`));
        }
      });
    });
  }

  requestAuthorization(): Promise<void> {
    return this.health.requestAuthorization([{ read: ['steps'], write: ['steps'] }]).then(() => this.isAuthorized$.next(true));
  }

  add(start: Date, end: Date, steps: number): Promise<any> {
    const packet: HealthStoreOptions = {
      startDate: start,
      endDate: end,
      dataType: 'steps',
      value: steps,
      sourceName: 'mitogo',
      sourceBundleId: 'be.kuleuven.mitogo'
    };
    return this.health.store(packet);
  }

  get(start: Date, end: Date): Promise<HealthData[]> {
    const query: HealthQueryOptions = {
      startDate: start,
      endDate: end,
      dataType: 'steps',
      limit: 1000
    };
    return this.health.query(query);
  }
}
