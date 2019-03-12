var language = 'en';
var loading = true;
var temperatureSettings = {};

const defaultSettings = {
};

//const testDevices = {
//    test: {
//        id: 'test', name: "test some long named device lkfjdh sdlkfjhgsldkfhg lksdjfhslkdh ", zone: "zone", iconObj: {
//            url: "../assets/icon.svg"
//        },
//        capabilitiesObj: {
//            measure_temperature: {
//                value: 22
//            }
//        }
//    },
//    test1: { id: 'test', name: "device 1", zone: "zone" },
//    test2: { id: 'test', name: "device 2", zone: "zone" },
//    test3: { id: 'test', name: "device 3", zone: "zone" },
//    test4: { id: 'test', name: "device 4", zone: "zone" },
//    test5: { id: 'test', name: "device 5", zone: "zone" },
//    test6: { id: 'test', name: "device 6", zone: "zone" },
//    test7: { id: 'test', name: "device 7", zone: "zone" },
//    test8: { id: 'test', name: "device 8", zone: "zone" },
//    test9: { id: 'test', name: "device 9", zone: "zone" },
//    test10: { id: 'test', name: "device 10", zone: "zone" }
//};
//$(document).ready(function () {
//    onHomeyReady({
//        ready: () => { },
//        get: (_, callback) => callback(null, defaultSettings),
//        api: (method, url, _, callback) => {
//            switch (url) {
//                case '/devices':
//                    return setTimeout(() => callback(null, testDevices), 2000);
//                case '/zones':
//                    return callback(null, { zone: { name: 'zone' } });
//                default:
//                    return callback(null, {});
//            }
//        },
//        getLanguage: () => 'en',
//        set: () => 'settings saved',
//        alert: () => alert(...arguments)
//    })
//});

function onHomeyReady(homeyReady){
    Homey = homeyReady;
    
    temperatureSettings = defaultSettings;
    
    //Homey.get('settings', function (err, savedSettings) {
            
    //    if (err) {
    //        Homey.alert(err);
    //    } else if (savedSettings) {
    //        temperatureSettings = savedSettings;
    //    }
            
    //    for (let key in defaultSettings) {
    //        if (defaultSettings.hasOwnProperty(key)) {
    //            const el = document.getElementById(key);
    //            if (el) {
    //                switch (typeof defaultSettings[key]) {
    //                    case 'boolean':
    //                        el.checked = temperatureSettings[key];
    //                        break;
    //                    default:
    //                        el.value = temperatureSettings[key];
    //                }
    //            }
    //        }
    //    }
    //});
        
    //showTab(1);
    getLanguage();

    new Vue({
        el: '#app',
        data: {
            devices: null,
            zones: {}
        },
        methods: {
            getZones() {
                return Homey.api('GET', '/zones', null, (err, result) => {
                    if (err) return Homey.alert(err);
                    //if (err) {
                    //    setTimeout(() => this.getZones(), 1000);
                    //    return;
                    //}
                    this.zones = result;
                });
            },
            getDevices() {
                return Homey.api('GET', '/devices', null, (err, result) => {
                    loading = false;
                    if (err) return Homey.alert(err);
                    //if (err) {
                    //    setTimeout(this.getDevices(), 1000);
                    //    return;
                    //}
                    this.devices = result
                        ? Object.keys(result).map(key => result[key]).filter(d => d && d.capabilitiesObj && d.capabilitiesObj.measure_temperature)
                        : [];

                    document.getElementById('devices-list').style.display = 'block';
                });
            },
            getZone: function (device) {
                const zoneId = typeof device.zone === 'object' ? device.zone.id : device.zone;
                const zone = this.zones && this.zones[zoneId];
                return zone && zone.name ? zone.name : 'unknown';
            },
            getIcon: function (device) {
                try {
                    return "<img src=\"" + device.iconObj.url + "\" style=\"width:auto;height:auto;max-width:50px;max-height:30px;\"/>";
                } catch (e) {
                    return "<!-- no device.iconObj.url -->";
                }
            },
            getTemperatures: function (capabilitiesObj) {
                // console.log(capabilitiesObj.measure_temperature);
                // console.log(capabilitiesObj.measure_temperature.value);
                try {
                    let value = capabilitiesObj.measure_temperature.value;

                    if ("number" !== typeof value)
                        value = "-";
                    else
                        value += " &#8451;";
                            
                    return value; //"<span class=\"component component-temperature>" + value + "</span>";
                } catch (e) {
                    return "<!-- no capabilitiesObj.temparature_.value -->";
                }
            }
        },
        async mounted() {
            await this.getZones();
            await this.getDevices();
        },
        computed: {
            devices() {
                return this.devices;
            },
            zones() {
                return this.zones;
            }
        }
    });

    
}

function showTab(tab){
    $('.tab').removeClass('tab-active');
    $('.tab').addClass('tab-inactive');
    $('#tabb' + tab).removeClass('tab-inactive');
    $('#tabb' + tab).addClass('active');
    $('.panel').hide();
    $('#tab' + tab).show();
}

function getLanguage() {
    try {
        Homey.getLanguage(function (err, language) {
            language = language === 'nl' ? 'nl' : 'en';
            const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
            if (el) {
                el.style.display = "inline";
            }
            Homey.ready();
        });
    } catch (e) {
        Homey.alert('Failed to get language: ' + e);
        const el = document.getElementById("instructions" + language) || document.getElementById("instructionsen");
        if (el) {
            el.style.display = "inline";
        }
        Homey.ready();
    }
}

function saveSettings() {

    for (let key in defaultSettings) {
        let el = document.getElementById(key);
        if (el) {
            temperatureSettings[key] = typeof defaultSettings[key] === 'boolean' ? el.checked : el.value;
        }
    }
    _writeSettings();
}

function _writeSettings(settings) {
    try {
        Homey.set('settings', temperatureSettings);
        Homey.api('GET', '/settings_changed', null, (err, result) => { });
    } catch (e) {
        Homey.alert('Failed to save settings: ' + e);
    }
}
