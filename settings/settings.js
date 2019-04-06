const REFRESH_INTERVAL = 2000; // 2 sec.

var language = 'en';
var loading = true;
var temperatureSettings = {};
var refreshInterval;
var updateValuesTimeout;

const defaultSettings = {
};

const DEFAULT_ZONE = {
    id: 'default',
    name: 'Homey'
};

//////////////////////////  DEBUG  //////////////////////////////////////
if (!window.Homey) {
    $(document).ready(function () {
        onHomeyReady({
            ready: () => { },
            get: (_, callback) => callback(null, defaultSettings),
            api: (method, url, _, callback) => {
                switch (url) {
                    case '/devices':
                        return setTimeout(() => callback(null, testDevices), 100);
                    case '/zones':
                        return setTimeout(() => callback(null, testZones), 100);
                    default:
                        return callback(null, {});
                }
            },
            getLanguage: () => 'en',
            set: () => 'settings saved',
            alert: () => alert(...arguments)
        })
    });
}
////////////////////////////////////////////////////////////////


function sortByName(a, b) {
    let name1 = a.name.trim().toLowerCase();
    let name2 = b.name.trim().toLowerCase();
    return name1 < name2 ? -1 : name1 > name2 ? 1 : 0;
}

function mean(numbers) {
    var total = 0, i;
    for (i = 0; i < numbers.length; i += 1) {
        total += numbers[i];
    }
    return total / numbers.length;
}

function groupBy(xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

function onHomeyReady(homeyReady){
    Homey = homeyReady;
    
    temperatureSettings = defaultSettings;
    if (!temperatureSettings.devices) {
        temperatureSettings.devices = {};
    }
    
    //showTab(1);
    getLanguage();

    $app = new Vue({
        el: '#app',
        data: {
            search: '',
            allDevices: null,
            devices: null,
            zones: null,
            zonesList: [],
            config: false
        },
        methods: {
            hasName(entity, name) {
                return entity && name && (entity.name || '').toLowerCase().indexOf(name) !== -1;
            },
            clearFilter() {
                $('#search').val('');
                this.search = '';
                this.filter();
            },
            applyFilter(devices) {
                if (!devices) return [];
                if (!this.search) return devices;
                return devices.filter(d => this.hasName(d, this.search) || this.hasName(this.zones[d.zone], this.search));
            },
            filter() {
                if (this.allDevices) {
                    this.search = ($('#search').val() || '').toLowerCase();
                    this.devices = this.applyFilter(this.allDevices);
                    this.updateZonesList();
                    setTimeout(() => {
                        this.updateValues(this.devices);
                        this.updateSliders();
                    });
                }
            },
            getZones() {
                return Homey.api('GET', '/zones', null, (err, result) => {
                    if (err) return Homey.alert(err);

                    this.zones = result || {};
                    this.updateZonesList();
                });
            },
            updateZonesList() {
                const zones = this.zones || {};
                this.zonesList = Object.keys(zones)
                    .filter(key => zones.hasOwnProperty(key))
                    .map(key => zones[key])
                    .filter(z => this.getDevicesForZone(z.id).length);
                this.zonesList.sort(sortByName);

                if (this.getDevicesForZone(DEFAULT_ZONE.id).length) {
                    this.zonesList.unshift(DEFAULT_ZONE);
                }
            },
            getDevices() {
                let interval = refreshInterval;
                return Homey.api('GET', '/devices', null, (err, result) => {
                    try {
                        loading = false;
                        if (err) {
                            //return Homey.alert(err);
                            return; // skip
                        }

                        const devices = Object.keys(result || {})
                            .map(key => result[key])
                            .filter(d => d && d.capabilitiesObj && d.capabilitiesObj.measure_temperature);

                        devices.sort(sortByName);
                        devices.filter(d => !d.zone).forEach(d => d.zone = DEFAULT_ZONE.id);

                        if (!this.allDevices) {
                            this.allDevices = devices;
                            this.filter();
                            document.getElementById('devices-list').style.display = 'block';
                        }

                        if (interval === refreshInterval) { // NOTE: Skip when interval is cleared or another update is triggered
                            updateValuesTimeout = setTimeout(() => this.updateValues(devices));
                        }

                    } catch (e) {
                        // nothing
                    }

                });
            },
            updateValues(devices) {
                devices = this.applyFilter(devices);

                for (let zone of this.zonesList) {
                    const measurements = this.getDevicesForZone(zone.id)
                        .filter(d => d.capabilitiesObj && d.capabilitiesObj.measure_temperature)
                        .map(d => {
                            return {
                                value: Number(d.capabilitiesObj.measure_temperature.value),
                                units: d.capabilitiesObj.measure_temperature.units
                            };
                        })
                        .filter(m => m.units && m.value !== 0);  // NOTE: skips 0 values (= invalid reading)

                    if (measurements.length) {
                        let totals = groupBy(measurements, 'units');
                        means = Object.keys(totals).map(units => {
                            const values = totals[units].map(m => m.value);
                            return mean(values).toFixed(1).replace(/\.0$/, '') + ' ' + units;
                        });
                        $('#mean_' + zone.id).html(means.join(' / '));
                    }
                }

                for (let device of devices) {
                    try {
                        if (device.capabilitiesObj) {

                            if (device.capabilitiesObj.hasOwnProperty('measure_temperature')) {
                                const value = this.getTemperature(device.capabilitiesObj.measure_temperature);
                                $('#measure_' + device.id).html(value);
                            }
                            if (device.capabilitiesObj.hasOwnProperty('target_temperature')) {
                                const value = Number(device.capabilitiesObj.target_temperature.value);
                                $('#range_' + device.id).val(value).change();

                                const display = this.getTemperature(device.capabilitiesObj.target_temperature);
                                $('#target_' + device.id).html(display);
                            }
                        }
                    } catch (e) {
                        // nothing
                    }
                }
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
                            self.clearRefreshInterval();
                            return Homey.api('POST', '/value', {
                                device: this.$element.data().id,
                                target: value
                            }, (err, result) => {
                                self.setRefreshInterval();
                                if (err) return Homey.alert(err);
                            });
                        } catch {
                            Homey.alert('Failed to update target value');
                        }
                    }
                });
            },
            clearRefreshInterval() {
                if (updateValuesTimeout) {
                    clearTimeout(updateValuesTimeout);
                    updateValuesTimeout = undefined;
                }
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = undefined;
                }
            },
            setRefreshInterval() {
                this.clearRefreshInterval();
                refreshInterval = setInterval(() => this.getDevices(), REFRESH_INTERVAL);
            },
            getDevicesForZone(zoneId) {
                const devices = this.devices ? this.devices.filter(d => d.zone === zoneId) : [];
                return this.config ? devices : devices.filter(d => temperatureSettings.devices[d.id] !== false);
            },
            getAdditionalTemperatures(device) {
                return Object.keys(device.capabilitiesObj)
                    .filter(key => key.indexOf('measure_temperature.') === 0)
                    .map(key => device.capabilitiesObj[key]);
            },
            toggleConfig() {
                this.config = !this.config;
                this.updateZonesList();
                this.redraw();
            },
            toggleDevice(deviceId) {
                if (this.config) {
                    // toggle
                    temperatureSettings.devices[deviceId] = temperatureSettings.devices.hasOwnProperty(deviceId)
                        ? !temperatureSettings.devices[deviceId]
                        : false;

                    saveSettings();
                    this.redraw();
                }
            },
            redraw() {
                setTimeout(() => {
                    $app.$forceUpdate();
                    this.updateSliders();
                }, 0);
            }
        },
        async mounted() {
            $('.app-header').show();

            await this.getZones();
            await this.getDevices();

            this.setRefreshInterval();
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

    Homey.get('settings', function (err, savedSettings) {
        if (err) {
            Homey.alert(err);
        } else if (savedSettings) {
            Object.assign(temperatureSettings, savedSettings);
            if (!temperatureSettings.devices) {
                temperatureSettings.devices = {};
            }
        }
        $app.updateZonesList();
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

    //for (let key in defaultSettings) {
    //    let el = document.getElementById(key);
    //    if (el) {
    //        temperatureSettings[key] = typeof defaultSettings[key] === 'boolean' ? el.checked : el.value;
    //    }
    //}
    _writeSettings(temperatureSettings);
}

function _writeSettings(settings) {
    try {
        Homey.set('settings', settings);
        Homey.api('GET', '/settings_changed', null, (err, result) => { });
    } catch (e) {
        Homey.alert('Failed to save settings: ' + e);
    }
}
