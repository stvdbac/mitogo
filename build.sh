#!/bin/bash

# Android functions
function buildAndroidDebug {
    rm -r ./www
    ionic cordova build android --debug
}

function buildAndroidRelease {
    rm -r ./www
    ionic cordova build android --release --prod
}

function buildAndroidLiveEmulator {
    ./createConfig.sh -m -d
    ionic cordova emulate android -lsc
}

function buildAndroidLiveDevice {
    ./createConfig.sh -m -d
    ionic cordova run android -lsc
}

function install {
    adb install -r ./platforms/android/app/build/outputs/apk/debug/app-debug.apk
}

function install_android_release {
    adb install -r ./platforms/android/app/build/outputs/apk/release/app-release.apk
}

function monitor {
   ~/Library/Android/sdk/tools/monitor &
}

function openAndroidRelease {
    open ./platforms/android/app/build/outputs/apk/release
    # open https://play.google.com/apps/publish
}

function Emulator_API_22 {
    ~/Library/Android/sdk/emulator/emulator -avd Nexus_5_API_22 -netdelay none -netspeed full &
}

function Emulator_API_28 {
    ~/Library/Android/sdk/emulator/emulator -avd Pixel_XL_API_28 -netdelay none -netspeed full &
}

PS3='Please enter your choice: '
options=("Build & install to attached device" "Build Android debug" "Build Android release" "Install Android" "Monitor" "Start Emulator" "Run Live Android emulator" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Build & install to attached device")
            buildAndroidDebug
            install
            break
            ;;
        "Build Android debug")
            buildAndroidDebug
            break
            ;;
        "Build Android release")
            buildAndroidRelease
            openAndroidRelease
            break
            ;;
        "Install Android")
            install
            break
            ;;
        "Monitor")
            monitor
            break
            ;;
        "Start Emulator")
            Emulator_API_28
            break
            ;;
        "Run Live Android emulator")
            buildAndroidLiveEmulator
            break
            ;;
        "Quit")
            break
            ;;
        *) echo "invalid option $REPLY";;
    esac
done

# ./createConfig.sh -m -d
# adb devices -l 
# ./gitrev.sh
# ionic cordova build android --debug
# adb install -r ./platforms/android/app/build/outputs/apk/debug/app-debug.apk

# to create release ionic cordova build android --release --prod
# build for iOS without recompiling js code
# ionic cordova build ios --debug --prod --no-build