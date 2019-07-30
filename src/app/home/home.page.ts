import { Component, OnDestroy, NgZone } from '@angular/core';
import { DataSample } from 'cordova-plugin-gadgetbridge';
import { Subscription } from 'rxjs';
import { Platform } from '@ionic/angular';
import { GooglefitService } from '../services/googlefit.service';
import { GadgetbridgeService } from '../services/gadgetbridge.service';
import { TransferService } from '../services/transfer.service';
import { HealthData } from '@ionic-native/health/ngx';
import { epochToDate, dateToEpoch } from '../services/date.function';
import { FormControl } from '@angular/forms';
import { distinctUntilChanged, skip } from 'rxjs/operators';

interface MiBandItem {
  timestamp: Date;
  steps: number;
}

interface GoogleFitItem {
  startDate: Date;
  endDate: Date;
  steps: number;
}

function leadingZero(n: number): string {
  if (n <= 9) {
    return '0' + n;
  }
  return '' + n;
}

function DateToDateTime(n: number) {
  if (n) {
    const date = new Date(n);
    const d = `${leadingZero(date.getDate())}/${leadingZero(date.getMonth() + 1)}/${date.getFullYear()}`;
    const t = `${leadingZero(date.getHours())}:${leadingZero(date.getMinutes())}:${leadingZero(date.getSeconds())}`;
    return `${d} ${t}`;
  } else {
    return null;
  }
}

const DateToTime = (keys: string[]) => (key: string, value: any) => {
  if ((keys.indexOf(key) > -1) && value) {
    const date = new Date(value);
    return `${leadingZero(date.getHours())}:${leadingZero(date.getMinutes())}`;
  } else {
    return value;
  }
};

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnDestroy {
  readonly name = 'HomePage';
  subs: Subscription[] = [];

  outputData = '';

  readyToTransfer = false;
  transfering = false;
  latestSyncTimeStr: string = DateToDateTime(Date.now()); // null;
  showLog = false;

  mibandconnecting = false;
  mibandconnected = false;
  mibandfetching = false;
  mibandsteps = null;
  mibandLatestFetch: MiBandItem[] = [];

  googlefitauthorized = null;
  googlefitfetching = false;
  googlefitsteps = null;
  googlefitLatestFetch: GoogleFitItem[] = [];

  calendarForm = new FormControl(dateToEpoch());
  isSubscribed = false;
  dayEpoch: number = dateToEpoch();
  isToday = true;

  constructor(
    public health: GooglefitService,
    public gadgetbridge: GadgetbridgeService,
    public transfer: TransferService,
    private platform: Platform,
    private zone: NgZone) {
    console.log(`${this.name}  constructor()`);
    this.calendarForm.disable();
    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, () => {
        console.log('Backbutton pressed');
      });

      const sub2 = this.transfer.ready$.asObservable().subscribe((val) => {
        this.zone.run(() => {
          console.log(`${this.name} readyToTransfer = ${val}`);
          this.readyToTransfer = val;
          if (val) {
            this.latestSyncTimeStr = DateToDateTime(this.transfer.latestSync);
          }
        });
      });
      this.subs.push(sub2);

      const sub2b = this.transfer.transfering$.asObservable().subscribe((val) => {
        this.zone.run(() => {
          this.transfering = val;
        });
      });
      this.subs.push(sub2b);

      const sub3 = this.gadgetbridge.connected$.asObservable()
        .subscribe((val) => {
          this.zone.run(() => {
            this.mibandconnected = val;
            if ((val === true) && (this.mibandsteps === null)) {
              this.mibandget();
            }
            if (val === true) {
              this.calendarForm.enable();
              if (!this.isSubscribed) {
                const sub5 = this.calendarForm.valueChanges
                .pipe(skip(1), distinctUntilChanged((a, b) => +a === +b)).subscribe((dayEpoch) => {
                  console.log(`${this.name} calendar changed value to ${epochToDate(dayEpoch)}`);
                  this.onDayChanged(dayEpoch);
                });
                this.subs.push(sub5);
                this.isSubscribed = true;
              }
            } else {
              this.calendarForm.disable();
            }
          });
        });
      this.subs.push(sub3);

      const sub3b = this.gadgetbridge.connecting$.asObservable().subscribe((val) => {
        this.zone.run(() => {
          this.mibandconnecting = val;
        });
      });
      this.subs.push(sub3b);

      const sub4 = this.health.isAuthorized$.asObservable().subscribe((val) => {
        this.googlefitauthorized = val;
        if ((val === true) && (this.googlefitsteps === null)) {
          this.googleFitGet();
        }
      });
      this.subs.push(sub4);
    });
  }

  ngOnDestroy() {
    console.log(`${this.name} destructor()`);
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
  }

  requestAuthorization() {
    this.health.requestAuthorization()
      .then(() => console.log(`${this.name} request authorization success`))
      .catch(() => console.log(`${this.name} request authorization failed`));
  }


  private async onDayChanged(newDate: number) {
    console.log(`${this.name} onDayChanged(${newDate})`);
    if (this.readyToTransfer && this.dayEpoch !== newDate) {
      this.dayEpoch = newDate;
      this.isToday = this.dayEpoch === dateToEpoch();
      await this.googleFitGet();
      await this.mibandupdate();
      if (this.dayEpoch !== newDate) {
        this.calendarForm.setValue(newDate, {onlySelf: true, emitEvent: false});
      }
    }
  }

  // testInsert() {
  //   const endDate = new Date();
  //   const startDate = new Date(endDate.getTime() - 600000);
  //   this.outputData = '';

  //   this.health.add(startDate, endDate, 3520)
  //   .then(() => console.log(`${this.name} insert success`))
  //   .catch((err) => {
  //     console.log(`${this.name} insert failed ${JSON.stringify(err)}`);
  //     this.outputData = 'Insert Failed\n' + JSON.stringify(err, null, 2);
  //   });
  // }

  googleFitGet(): Promise<void> {
    console.log(`${this.name} googleFitGet()`);
    if (this.googlefitfetching || this.transfering) {
      return;
    }
    this.googlefitfetching = true;
    const startDate = epochToDate(this.dayEpoch);
    const endDate = new Date(startDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // const endDate = new Date();
    // const startDate = new Date();
    // startDate.setHours(0, 0, 0, 0);
    this.outputData = '';
    return this.health.get(startDate, endDate)
      .then((alldata) => {
        console.log(`${this.name} googleFitGet success`);
        const data = alldata.filter((v) => v.sourceBundleId === 'be.kuleuven.mitogo');
        this.googlefitLatestFetch = this.HealthDataToGoogleFitItem(data);
        const total = data.reduce((t, v) => { t = t + +v.value; return t; }, 0);
        this.zone.run(() => {
          this.googlefitsteps = total;
          this.outputData = ' Google Fit Data\n';
          this.outputData += ` Total steps = ${total}\n\n`;
          this.outputData += JSON.stringify(this.googlefitLatestFetch, DateToTime(['startDate', 'endDate']), 2);
          this.googlefitfetching = false;
          this.latestSyncTimeStr = DateToDateTime(this.transfer.latestSync);
        });
      })
      .catch((err) => {
        console.log(`${this.name} googleFitGet failed`);
        this.zone.run(() => {
          this.outputData = 'Fetching data from GoogleFit Failed\n' + JSON.stringify(err, null, 2);
          this.googlefitfetching = false;
        });
      });
  }

  // GadgetBridge
  // pair() {
  //   const name = 'MiBandPairingActivity'; // 'DiscoveryActivity';
  //   this.gadgetbridge.openView(name).then(() => {
  //     console.log(`${this.name} DiscoveryActivity success`);
  //     this.outputData = 'DiscoveryActivity Success';
  //   }).catch((err) => this.outputData = 'DiscoveryActivity Failed');
  // }

  // settings() {
  //   if (this.mibandconnected === true) {
  //     this.gadgetbridge.openView('SettingsActivity').then(() => {
  //       console.log(`${this.name} SettingsActivity success`);
  //       this.outputData = 'SettingsActivity Success';
  //     }).catch((err) => this.outputData = 'SettingsActivity Failed');
  //   }
  // }

  // preferences() {
  //   this.gadgetbridge.openView('MiBandPreferencesActivity').then(() => {
  //     console.log(`${this.name} MiBandPreferencesActivity success`);
  //     this.outputData = 'MiBandPreferencesActivity Success';
  //   }).catch((err) => this.outputData = 'MiBandPreferencesActivity Failed');
  // }

  openGadgetBridge() {
    this.gadgetbridge.openView('ControlCenterv2').then(() => {
      console.log(`${this.name} ControlCenterv2 success`);
    }).catch((err) => this.outputData = 'Could not open GadgetBridge');
  }

  mibandsync() {
    console.log(`${this.name} mibandsync()`);
    if (this.mibandconnected === false || this.mibandfetching === true || this.transfering === true) {
      console.log(`${this.name} mibandsync() canceled already running`);
      return;
    }
    this.zone.run(() => {
      this.mibandfetching = true;
    });

    this.outputData = 'Reading data from Mi Band';
    this.gadgetbridge.sync()
      .then(() => {
        this.zone.run(() => {
          this.outputData = 'Data from Mi Band Synced';
          this.mibandfetching = false;
        });
      })
      .catch(() => {
        this.zone.run(() => {
          this.outputData = 'Fetching data from Mi Band failed';
          this.mibandfetching = false;
        });
      });
  }

  mibandupdate(): Promise<void> {
    console.log(`${this.name} mibandupdate()`);
    if (this.mibandconnected === false || this.mibandfetching === true || this.transfering === true) {
      console.log(`${this.name} mibandupdate() canceled already running`);
      return;
    }
    return this.mibandUpdateForDay();
  }

  // sync + read db
  mibandget() {
    console.log(`${this.name} mibandget()`);
    if (this.mibandfetching === true || this.transfering === true) {
      console.log(`${this.name} mibandget() canceled already running`);
      return;
    }
    this.zone.run(() => {
      this.mibandfetching = true;
    });
    this.outputData = 'Fetching data from Mi Band';
    this.gadgetbridge.sync()
      .then(() => {
        setTimeout(() => {
          this.zone.run(() => {
            this.outputData = '\nData from Mi Band imported, querying data';
          });
          this.mibandUpdateForDay();
        }, 2000);
      })
      .catch(() => {
        this.zone.run(() => {
          this.outputData = 'Fetching data from Mi Band failed';
          this.mibandfetching = false;
        });
      }
      );
  }

  /* read from gb database */
  private async mibandUpdateForDay(): Promise<void> {
    console.log(`${this.name} mibandUpdateForDay()`);

    const day = this.dayEpoch;
    const start = epochToDate(day);
    const end = new Date(start);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const s = Math.floor(start.getTime() / 1000);
    const e = Math.floor(end.getTime() / 1000);
    try {
      const data = await this.gadgetbridge.fetch(s, e);
      console.log(`${this.name} mibandUpdateForDay() success`);
      this.zone.run(() => {
        this.mibandLatestFetch = this.DataSampleToMiBandItem(data);
        this.mibandsteps = this.dataToSteps(data);
        this.outputData = ' Mi Band data\n';
        this.outputData += ` Total steps = ${this.mibandsteps}\n`;
        this.outputData += ` #entries: ${this.mibandLatestFetch.length}\n`;
        this.outputData += JSON.stringify(this.mibandLatestFetch, DateToTime(['timestamp']), 2);
      });
      console.log(`${this.name} gadgetbridge.fetch in NgZone ${NgZone.isInAngularZone()}`);
    } catch (err) {
      console.log(`${this.name} mibandUpdateForDay() failed`);
      this.zone.run(() => {
        this.outputData = 'Fetch data failed';
      });
    } finally {
      this.zone.run(() => {
        this.mibandfetching = false;
      });
    }
  }

  gb_raw_console(data: DataSample[]) {
    console.log('GB Raw data');
    data.forEach((d) => console.log(JSON.stringify(d)));
  }

  dataToSteps(data: DataSample[]): number {
    if (data && data.length > 0) {
      return data.filter((v: DataSample) => v.steps).reduce((total: number, v: DataSample) => total += v.steps, 0);
    } else {
      return 0;
    }
  }

  run_transfer() {
    this.zone.run(() => {
      this.outputData = 'running...';
    });
    this.transfer.run()
      .then((val) => {
        console.log(`${this.name} transfer done`);
        const total = val.reduce((p, c) => p += +c.value, 0);
        // this.outputData = 'To Google Fit\n';
        // this.outputData += ` Total steps added = ${total}\n`;
        // this.outputData += ` number of entries: ${val.length}\n`;
        // // this.outputData += `latest sync was : ${new Date(this.transfer.latestSync)}\n`;
        // this.outputData += JSON.stringify(val, null, 2);
        console.log(`${this.name} transfer.run in NgZone ${NgZone.isInAngularZone()}`);
        if (total) {
          setTimeout(() => this.googleFitGet(), 1000);
        } else {
          this.zone.run(() => {
            this.outputData = 'Transfering: No data to add';
          });
        }
      }).catch((err) => {
        this.zone.run(() => {
          this.outputData = `error transfering: ${JSON.stringify(err)}`;
        });
      });

  }

  // dryrun_transfer() {
  //   this.transfer.dryrun()
  //     .then((val) => {
  //       console.log(`${this.name} transfer done`);
  //       let total = 0;
  //       val.forEach((v) => total += +v.value);
  //       this.outputData = `Total steps = ${total}\n`;
  //       this.outputData += `#entries: ${val.length}\n`;
  //       this.outputData += `latest sync was : ${new Date(this.transfer.latestSync)}\n`;
  //       this.outputData += JSON.stringify(val, null, 2);
  //     });
  // }

  // getLatestSyncValue() {
  //   this.outputData = `LatestSYNC : ${new Date(this.transfer.latestSync)}`;
  // }

  private HealthDataToGoogleFitItem(indata: HealthData[]): GoogleFitItem[] {
    return indata.map((i: HealthData) => ({ steps: +i.value, startDate: new Date(i.startDate), endDate: new Date(i.endDate) }));
  }

  private DataSampleToMiBandItem(indata: DataSample[]): MiBandItem[] {
    return indata.filter((i) => (i.steps)).map((i) => ({ steps: +i.steps, timestamp: new Date(i.timestamp * 1000) }));
  }
}

