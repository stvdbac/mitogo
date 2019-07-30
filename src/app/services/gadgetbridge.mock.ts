import {
    GadgetbridgePlugin, DeviceInfo, DeviceConnectionState, ViewType, DataSample,
    SuccessCallback, ErrorCallback, DeviceInfoSuccessCallback, IsConnectedSuccessCallback,
    OnConnectionSuccessCallback, ChargeSuccessCallback, SampleDataSuccessCallback,
    OffConnectionSuccessCallback,
    RemoveDataSuccessCallback,
    GetConfigSuccessCallback,
    SettingsValue,
    SetConfigSuccessCallback,
    NotificationSuccessCallback
} from 'cordova-plugin-gadgetbridge';


export class GadgetBridgeMock implements GadgetbridgePlugin {
    readonly name = 'GadgetBridgeMock';
    constructor() {
        console.log(`USING GadgetBridgeMock`);
    }
    openView(viewType: ViewType, successCallback?: SuccessCallback, errorCallback?: ErrorCallback) {
        successCallback();
    }

    getDeviceInfo(successCallback: DeviceInfoSuccessCallback, errorCallback?: ErrorCallback) {
        successCallback({
            name: 'mock',
            address: '00:00:00:00',
            model: 'none',
            type: 'none',
            firmware: 'V0.0.0',
            state: 'INITIALIZED'
        });
    }

    isConnected(successCallback: IsConnectedSuccessCallback, errorCallback?: ErrorCallback) {
        successCallback(true);
    }

    connect(timeout?: number | SuccessCallback, successCallback?: SuccessCallback, errorCallback?: ErrorCallback) {
        console.log(`${this.name} connect`);
        if (typeof (timeout) === 'function') {
            timeout();
        } else {
            successCallback();
        }
    }

    onConnect(successCallback?: OnConnectionSuccessCallback, errorCallback?: ErrorCallback) {
        successCallback({
            state: 'INITIALIZED',
            address: '00:00:00:00:00:00'
        });
    }

    offConnect(successCallback?: OffConnectionSuccessCallback, errorCallback?: ErrorCallback) { 
        successCallback(true);
    }

    onButton(successCallback?: SuccessCallback, errorCallback?: ErrorCallback) {
        successCallback();
     }


    offButton(successCallback?: SuccessCallback, errorCallback?: ErrorCallback) {
        successCallback();
    }


    getBatteryLevel(
        timeout?: number | boolean | ChargeSuccessCallback,
        details?: boolean | ChargeSuccessCallback,
        successCallback?: ChargeSuccessCallback,
        errorCallback?: ErrorCallback) {
        if (typeof (timeout) === 'function') {
            timeout(75);
        } else if (typeof (details) === 'function') {
            details(75);
        } else {
            successCallback(75);
        }
    }


    fireNotification(
        message: string, repeat?: number | NotificationSuccessCallback,
        delay?: number | NotificationSuccessCallback | ErrorCallback,
        successCallback?: NotificationSuccessCallback,
        errorCallback?: ErrorCallback) {
            successCallback(true);
        }

    cancelNotification(successCallback?: NotificationSuccessCallback, errorCallback?: ErrorCallback) {
        successCallback(true);
    }

    synchronize(timeout?: number | SuccessCallback, successCallback?: SuccessCallback, errorCallback?: ErrorCallback) {
        if (typeof (timeout) === 'function') {
            timeout();
        } else {
            successCallback();
        }
    }

    retrieveData(
        start?: number,
        end?: number,
        successCallback?: SampleDataSuccessCallback,
        errorCallback?: ErrorCallback) {
        console.log(`${this.name} retrieveData ${new Date(start * 1000)}-${new Date(end * 1000)}`);
        // if (typeof(start) === 'function') {
        //     return start([]);
        // } else if (typeof(end) === 'function') {
        //     return end([]);
        // } else {
        successCallback([]);
        // }
    }

    removeData(
        start: number | RemoveDataSuccessCallback,
        end: number | RemoveDataSuccessCallback | ErrorCallback,
        RemoveDataSuccessCallback: SuccessCallback,
        errorCallback?: ErrorCallback) {
        RemoveDataSuccessCallback();
    }

    removeAllData(successCallback?: RemoveDataSuccessCallback, errorCallback?: ErrorCallback) { }

    getConfig(settingsName: string | Array<string>,
        successCallback: GetConfigSuccessCallback,
        errorCallback: ErrorCallback) {
        if (typeof (settingsName) === 'string') {
            const Obj = {};
            Obj[settingsName] = 0;
            successCallback(Obj);
        } else {
            const Obj = {};
            settingsName.forEach((str) => Obj[str] = 0);
            successCallback(Obj);
        }
    }


    setConfig(
        name: string | { [id: string]: SettingsValue | null },
        value?: SettingsValue | null | SetConfigSuccessCallback,
        successCallback?: SetConfigSuccessCallback,
        errorCallback?: ErrorCallback) {
        if (typeof (name) === 'string') {
            successCallback(name);
        } else {
            successCallback(Object.keys(name));
        }
    }
}