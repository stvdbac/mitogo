import { Component, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { DataSample } from 'cordova-plugin-gadgetbridge';
import { Subscription } from 'rxjs';
import { Platform } from '@ionic/angular';
import { GooglefitService } from '../services/googlefit.service';
import { GadgetbridgeService } from '../services/gadgetbridge.service';
import { TransferService } from '../services/transfer.service';
import { HealthData } from '@ionic-native/health/ngx';

interface MiBandItem {
  timestamp: Date;
  steps: number;
}

interface GoogleFitItem {
  startDate: Date;
  endDate: Date;
  steps: number;
}

function appendLeadingZeroes(n: number) {
  if (n <= 9) {
    return '0' + n;
  }
  return '' + n;
}

const DateToTime = (keys: string[]) => (key: string, value: any) => {
  if ((keys.indexOf(key) > -1) && value) {
    const date = new Date(value);
    return `${appendLeadingZeroes(date.getHours())}:${appendLeadingZeroes(date.getMinutes())}`;
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

  connectState = 'NONE';
  readyToTransfer = false;
  transfering = false;

  mibandconnecting = false;
  mibandconnected = false;
  mibandfetching = false;
  mibandsteps = null;
  mibandLatestFetch: MiBandItem[] = [];

  googlefitauthorized = null;
  googlefitfetching = false;
  googlefitsteps = null;
  googlefitLatestFetch: GoogleFitItem[] = [];


  constructor(
    public health: GooglefitService,
    public gadgetbridge: GadgetbridgeService,
    public transfer: TransferService,
    private platform: Platform,
    private cd: ChangeDetectorRef,
    private zone: NgZone) {

    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(9999, () => {
        console.log('Backbutton pressed');
      });
      // this.connectState$ = this.gadgetbridge.state$.pipe(map((val) => {
      //   console.log(`${this.name} connectState$: ${val}`);
      //   setTimeout(() => this.cd.detectChanges(), 0);
      //   return val;
      // }));

      // const sub1 = this.platform.resume.subscribe(() => {
      //   console.log(`${this.name} App resumed`);
      //   // setTimeout(() => this.cd.detectChanges(), 0);

      // });
      // this.subs.push(sub1);

      const sub2 = this.transfer.ready$.asObservable().subscribe((val) => {
        console.log(`${this.name} readyToTransfer = ${val}`);
        console.log(`${this.name} transfer.ready$ in NgZone ${NgZone.isInAngularZone()}`);
        this.readyToTransfer = val;
        setTimeout(() => this.cd.detectChanges(), 100);
      });
      this.subs.push(sub2);

      const sub2b = this.transfer.transfering$.asObservable().subscribe((val) => {
        console.log(`${this.name} transfer.transfering$ in NgZone ${NgZone.isInAngularZone()}`);
        this.transfering = val;
        setTimeout(() => this.cd.detectChanges(), 0);
      });
      this.subs.push(sub2b);

      const sub3 = this.gadgetbridge.connected$.asObservable().subscribe((val) => {
        console.log(`${this.name} gadgetbridge.connected$ in NgZone ${NgZone.isInAngularZone()}`);
        this.mibandconnected = val;
        if ((val === true) && (this.mibandsteps === null)) {
          this.mibandget();
        }
        setTimeout(() => this.cd.detectChanges(), 100);
      });
      this.subs.push(sub3);

      const sub3b = this.gadgetbridge.connecting$.asObservable().subscribe((val) => {
        console.log(`${this.name} gadgetbridge.connecting$ in NgZone ${NgZone.isInAngularZone()}`);
        this.mibandconnecting = val;
        setTimeout(() => this.cd.detectChanges(), 100);
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
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
  }

  requestAuthorization() {
    this.health.requestAuthorization()
      .then(() => console.log(`${this.name} request authorization success`))
      .catch(() => console.log(`${this.name} request authorization failed`));
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

  googleFitGet() {
    console.log(`${this.name} googleFitGet()`);
    if (this.googlefitfetching || this.transfering) {
      return;
    }
    this.googlefitfetching = true;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    this.outputData = '';
    this.health.get(startDate, endDate)
      .then((data) => {
        console.log(`${this.name} googleFitGet success`);
        this.googlefitLatestFetch = this.HealthDataToGoogleFitItem(data);
        const total = data.reduce((t, v) => { t = t + +v.value; return t; }, 0);
        this.googlefitsteps = total;
        this.outputData = ' Google Fit Data\n';
        this.outputData += ` Total steps = ${total}\n\n`;
        this.outputData += JSON.stringify(this.googlefitLatestFetch, DateToTime(['startDate', 'endDate']), 2);
        this.googlefitfetching = false;
      })
      .catch((err) => {
        console.log(`${this.name} googleFitGet failed`);
        this.outputData = 'Fetching data from GoogleFit Failed\n' + JSON.stringify(err, null, 2);
        this.googlefitfetching = false;
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

  // connect() {
  //   this.outputData = 'connecting';
  //   this.gadgetbridge.connect().then(() => {
  //     console.log(`${this.name} connect success`);
  //     this.outputData = 'connected';
  //     this.cd.detectChanges();
  //   }).catch((err) => {
  //     console.log(`${this.name} connect failed`);
  //     this.outputData = 'connection failed';
  //     this.cd.detectChanges();
  //   });
  // }

  mibandget() {
    console.log(`${this.name} mibandget()`);
    if (this.mibandfetching === true || this.transfering === true) {
      console.log(`${this.name} mibandget() canceled already running`);
      return;
    }
    this.mibandfetching = true;
    this.cd.detectChanges();
    this.outputData = 'Fetching data from Mi Band';
    this.gadgetbridge.sync()
      .then(() => { setTimeout(() => { this.todaysdata(); }, 2000); })
      .catch(() => {
        this.outputData = 'Fetching data from Mi Band failed';
        this.mibandfetching = false;
        this.cd.detectChanges();
      }
      );
  }

  todaysdata() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const s = Math.floor(start.getTime() / 1000);
    const e = Math.floor(end.getTime() / 1000);
    this.gadgetbridge.fetch(s, e).then((data) => {
      this.mibandLatestFetch = this.DataSampleToMiBandItem(data);
      this.mibandsteps = this.dataToSteps(data);
      this.outputData = ' Mi Band data\n';
      this.outputData += ` Total steps = ${this.mibandsteps}\n`;
      this.outputData += ` #entries: ${this.mibandLatestFetch.length}\n`;
      this.outputData += JSON.stringify(this.mibandLatestFetch, DateToTime(['timestamp']), 2);
      this.mibandfetching = false;
      console.log(`${this.name} gadgetbridge.fetch in NgZone ${NgZone.isInAngularZone()}`);
      this.cd.detectChanges();
    }).catch(() => {
      this.outputData = 'Fetch data failed';
      this.mibandfetching = false;
      this.cd.detectChanges();
    });
  }

  dataToSteps(data: DataSample[]): number {
    if (data && data.length > 0) {
      return data.filter((v: DataSample) => v.steps).reduce((total: number, v: DataSample) => total += v.steps, 0);
    } else {
      return 0;
    }
  }

  run_transfer() {
    this.outputData = 'running...';
    this.cd.detectChanges(); // needed!
    this.transfer.run()
      .then((val) => {
        console.log(`${this.name} transfer done`);
        let total = 0;
        val.forEach((v) => total += +v.value);
        // this.outputData = 'To Google Fit\n';
        // this.outputData += ` Total steps added = ${total}\n`;
        // this.outputData += ` number of entries: ${val.length}\n`;
        // // this.outputData += `latest sync was : ${new Date(this.transfer.latestSync)}\n`;
        // this.outputData += JSON.stringify(val, null, 2);
        console.log(`${this.name} transfer.run in NgZone ${NgZone.isInAngularZone()}`);
        this.cd.detectChanges(); // needed!
        if (total) {
          setTimeout(() => this.googleFitGet(), 1000);
        }
      }).catch((err) => {
        this.outputData = `error transfering: ${JSON.stringify(err)}`;
        this.cd.detectChanges(); // needed!
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
  //       this.cd.detectChanges(); // needed!
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

