var language = 'en';
var loading = true;
var temperatureSettings = {};

const defaultSettings = {
};

//////////////////////////  DEBUG  //////////////////////////////////////
//const testDevices = {
//    test: {
//        id: 'test', name: "test some long named device lkfjdh sdlkfjhgsldkfhg lksdjfhslkdh ", zone: "zone", iconObj: {
//            url: "../assets/icon.svg"
//        },
//        capabilitiesObj: {
//            measure_temperature: {
//                value: 18.5,
//                setable: false
//            },
//            target_temperature: {
//                value: 21.3,
//                setable: true,
//                min: 4,
//                max: 35,
//                step: 0.5,
//                units: 'C'
//            }
//        }
//    },
//    test1: {
//        id: 'test1', name: "device 1", zone: "zone 2", iconObj: {
//            url: "../assets/icon.svg"
//        },
//        capabilitiesObj: {
//            measure_temperature: {
//                value: 77,
//                setable: false,
//                units: 'F'
//            },
//            target_temperature: {
//                value: 55,
//                setable: true,
//                min: -10,
//                max: 90,
//                step: 1,
//                units: 'F'
//            }
//        }
//    },
//    test2: {
//        id: 'test2', name: "device 2", zone: "zone 2", iconObj: {
//            url: "../assets/icon.svg"
//        },
//        capabilitiesObj: {
//            measure_temperature: {
//                value: 21.5,
//                setable: false
//            }
//        }
//    },
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
//                    return setTimeout(() => callback(null, testDevices), 1000);
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
////////////////////////////////////////////////////////////////

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

    $app = new Vue({
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
                    
                    this.$nextTick(() => this.updateSliders());
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
            getTemperature: function (capability) {
                try {
                    let value = capability.value;

                    if ("number" !== typeof value)
                        value = "-";
                    else
                        value += ' ' + this.getUnit(capability);
                            
                    return value; //"<span class=\"component component-temperature>" + value + "</span>";
                } catch (e) {
                    return "<!-- no capabilitiesObj.temparature_.value -->";
                }
            },
            getUnit(capability) {
                return capability.units && typeof capability.units === 'string'
                    ? capability.units
                    : "&#8451;";
            },
            updateSliders() {
                let sliders = $('input[type="range"]');
                let self = this;
                sliders.rangeslider({
                    polyfill: false,
                    onSlide: function (position, value) {
                        try {
                            let id = this.$element.data().id;
                            let device = self.devices.find(d => d.id === id);
                            let unit = self.getUnit(device.capabilitiesObj.target_temperature);
                            $('#target_' + id).html(value + " " + unit);

                        } catch{
                            // nothing
                        }

                    },
                    onSlideEnd: function (position, value) {
                        try {
                            return Homey.api('POST', '/value', {
                                device: this.$element.data().id,
                                target: value
                            }, (err, result) => {
                                if (err) return Homey.alert(err);
                            });
                        } catch {
                            Homey.alert('Failed to update target value');
                        }
                    }
                });
            }
        },
        async mounted() {
            await this.getZones();
            await this.getDevices();

            // update every xx seconds
            setInterval(() => this.getDevices(), 5000);
        },
        computed: {
            devices() {
                return this.devices;
            },
            zones() {
                return this.zones;
            }
        },
        //updated: function () {
        //    updateSliders();
        //}
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
