// ProcessService.js - in api/services\
const util = require('util')

exports.process = function(json) {

    var nameMappings = {
        'ctun' : {
            'dcrt' : 'dcrate',
            'crt'  : 'crate',
            'dsalt' : 'wpalt',
            'salt' : 'sonalt'
        },
        'att' : {
            'desroll' : 'rollin',
            'despitch' : 'pitchin',
            'desyaw' : 'yawin',
        },
        'gps' : {
            'timems' : 'time',
        }
    }

    var processed = {
        params: {},
        att: {
            exists: false,
            mapped: false,
            rollin:  { col: null, values: [] },
            roll:    { col: null, values: [] },
            pitchin: { col: null, values: [] },
            pitch:   { col: null, values: [] },
            yawin:   { col: null, values: [] },
            yaw:     { col: null, values: [] },
            navyaw:  { col: null, values: [] },
        },
        atun: {
            exists: false,
            axis: [],
            tuneStep: [],
            rateMin: [],
            rateMax: [],
            rpGain: [],
            rdGain: [],
            spGain: []
        },
        atde: {
            exists: false,
            angle: [],
            rate: []
        },
        cam: {
            exists:  false,
            mapped:  false,
            gpsTime: { col: null, values: [] },
            lat:     { col: null, values: [] },
            lng:     { col: null, values: [] },
            alt:     { col: null, values: [] },
            roll:    { col: null, values: [] },
            pitch:   { col: null, values: [] },
            yaw:     { col: null, values: [] }
        },
        cmd: {
            exists: false,
            cmds: [], //array of command objects so can list them all
            cTol: [],
            cNum: [],
            cId: [],
            cOpt: [],
            prm1: [],
            alt: [],
            lat: [],
            lng: []
        },
        mag: {
            exists: false,
            mapped: false,
            timems: { col: null, values: [] },
            magx:   { col: null, values: [] },
            magy:   { col: null, values: [] },
            magz:   { col: null, values: [] },
            magf:   { values: [] },
            ofsx:   { col: null, values: [] },
            ofsy:   { col: null, values: [] },
            ofsz:   { col: null, values: [] },
            mofsx:  { col: null, values: [] },
            mofsy:  { col: null, values: [] },
            mofsz:  { col: null, values: [] },
        },
        curr: {
            exists:  false,
            mapped:  false,
            thr:     { col: null, values: [] },
            thrint:  { col: null, values: [] },
            volt:    { col: null, values: [] },
            curr:    { col: null, values: [] },
            vcc:     { col: null, values: [] },
            currtot: { col: null, values: [] },
            totcur: 0,
            avgcur: 0,
        },
        ctun: {
            exists: false,
            mapped: false,
            thrin:  { col: null, values: [] },
            sonalt: { col: null, values: [] },
            baralt: { col: null, values: [] },
            wpalt:  { col: null, values: [] },
            navthr: { col: null, values: [] },
            angbst: { col: null, values: [] },
            crate:  { col: null, values: [] },
            throut: { col: null, values: [] },
            dcrate: { col: null, values: [] }
        },
        err: {
            exists: false,
            errs: [],
        },
        ev: {
            exists: false,
            evt: [],
        },
        fmt: {
            exists: false,
        },
        gps: {
            exists: false,
            mapped: false,
            status: { col: null, values: [] },
            time:   { col: null, values: [] },
            nsats:  { col: null, values: [] },
            hdop:   { col: null, values: [] },
            lat:    { col: null, values: [] },
            lng:    { col: null, values: [] },
            relalt: { col: null, values: [] },
            alt:    { col: null, values: [] },
            spd:    { col: null, values: [] },
            gcrs:   { col: null, values: [] },
            timestart: null,
            timeend: null,
            avgSpd: 0,
            lAvgSpd: [],
            //googleMaps: [],
            readings: [],
        },
        imu: {
            exists: false,
            timems: { col: null, values: [] },
            gyrx: { col: null, values: [] },
            gyry: { col: null, values: [] },
            gyrz: { col: null, values: [] },
            accx: { col: null, values: [] },
            accy: { col: null, values: [] },
            accz: { col: null, values: [] },
            count: 0,
            trimmed: {accx: [], accy: [], accz: []}
        },
        inav: {
            exists: false,
            barAlt: [],
            iAlt: [],
            iClb: [],
            aCorX: [],
            aCorY: [],
            aCorZ: [],
            gLat: [],
            gLng: [],
            iLat: [],
            iLng: [],
        },
        mode: {
            count: 0,
            mode: { col: null },
            modes: {}, //array of modes!
        },
        ntun: {
            exists: false,
            mapped: false,
            wpdst: { col: null, values: [] },
            wpbrg: { col: null, values: [] },
            perx: { col: null, values: [] },
            pery: { col: null, values: [] },
            dvelx: { col: null, values: [] },
            dvely: { col: null, values: [] },
            velx: { col: null, values: [] },
            vely: { col: null, values: [] },
            dacx: { col: null, values: [] },
            dacy: { col: null, values: [] },
            drol: { col: null, values: [] },
            dpit: { col: null, values: [] },
        },
        pm: {
            exists: false,
            renCnt: [],
            renBlw: [],
            fixCnt: [],
            nLon: [],
            nLoop: [],
            maxT: [],
            pmt: [],
            i2cErr: [],
        }
    };

    for (var k in json) {
        var row = json[k],
        rowNum = parseInt(k);

        var rowName = row[0];
	    if (typeof rowName == "undefined") {
		  continue;
	    }

        rowName = rowName.trim();

        switch (rowName) {
            case 'PARM':
                var name = trimWhenRequired(row[1])
                processed.params[name] = {'name': row[1], 'value': row[2]};
                break;

            case 'FMT':
                processed.fmt.exists = true;
                
                var val = trimWhenRequired(row[3])

                if (typeof processed[val] != "undefined") {
                    for (var i in row) {
                        var p = trimWhenRequired(row[i])
        
                        if (typeof nameMappings[val] != "undefined" && typeof nameMappings[val][p] != "undefined") {
                            p = nameMappings[val][p];
                        }
                        
                        if (typeof processed[val][p] != "undefined") {
                            processed[val][p].col = i - 4;
                        }
                    };
                    
                    Object.keys(processed[val]).forEach(function(element, key, _array) {
                        console.log(val + ": col value for " + element + " is " + util.inspect(processed[val][element]))
                    })
                }

                break;

            case 'ATT':
                processed.att.exists = true;
                processed.att.rollin.values.push(  [rowNum, parseFloat(row[processed.att.rollin.col])]);
                processed.att.roll.values.push(    [rowNum, parseFloat(row[processed.att.roll.col])]);
                processed.att.pitchin.values.push( [rowNum, parseFloat(row[processed.att.pitchin.col])]);
                processed.att.pitch.values.push(   [rowNum, parseFloat(row[processed.att.pitch.col])]);
                processed.att.yawin.values.push(   [rowNum, parseFloat(row[processed.att.yawin.col])]);
                processed.att.yaw.values.push(     [rowNum, parseFloat(row[processed.att.yaw.col])]);
                processed.att.navyaw.values.push(  [rowNum, parseFloat(row[processed.att.navyaw.col])]);
                break;


            case 'ATUN':

                break;

            case 'ATDE':

                break;

            case 'CAM':
                processed.cam.exists = true;
                processed.cam.gpsTime.values.push( [rowNum, parseFloat(row[processed.cam.gpsTime.col]) ] );
                processed.cam.lat.values.push( [rowNum, parseFloat(row[processed.cam.lat.col]) ] );
                processed.cam.lng.values.push( [rowNum, parseFloat(row[processed.cam.lng.col]) ] );
                processed.cam.alt.values.push( [rowNum, parseFloat(row[processed.cam.alt.col]) ] );
                processed.cam.roll.values.push( [rowNum, parseFloat(row[processed.cam.roll.col]) ] );
                processed.cam.pitch.values.push( [rowNum, parseFloat(row[processed.cam.pitch.col]) ] );
                processed.cam.yaw.values.push( [rowNum, parseFloat(row[processed.cam.yaw.col]) ] );
                break;

            case 'CMD':

                break;

            case 'COMPASS':
            case 'MAG':
                processed.mag.exists = true;
                processed.mag.timems.values.push( [rowNum, parseFloat(row[processed.mag.timems.col]) ] );
                
                var x = parseFloat(row[processed.mag.magx.col]),
                y = parseFloat(row[processed.mag.magy.col]),
                z = parseFloat(row[processed.mag.magz.col]),
                f = Math.sqrt( Math.pow(Math.abs(x),2) + Math.pow(Math.abs(y),2) + Math.pow(Math.abs(z),2) );

                processed.mag.magx.values.push( [rowNum, x ] );
                processed.mag.magy.values.push( [rowNum, y ] );
                processed.mag.magz.values.push( [rowNum, z ] );

                processed.mag.magf.values.push( [rowNum, f ] );

                processed.mag.ofsx.values.push( [rowNum, parseFloat(row[processed.mag.ofsx.col]) ] );
                processed.mag.ofsy.values.push( [rowNum, parseFloat(row[processed.mag.ofsy.col]) ] );
                processed.mag.ofsz.values.push( [rowNum, parseFloat(row[processed.mag.ofsz.col]) ] );

                processed.mag.mofsx.values.push( [rowNum, parseFloat(row[processed.mag.mofsx.col]) ] );
                processed.mag.mofsy.values.push( [rowNum, parseFloat(row[processed.mag.mofsy.col]) ] );
                processed.mag.mofsz.values.push( [rowNum, parseFloat(row[processed.mag.mofsz.col]) ] );


                break;

            case 'CURR':
                processed.curr.exists = true;
                processed.curr.thr.values.push(     [rowNum, parseFloat(row[processed.curr.thr.col])]);
                processed.curr.thrint.values.push(  [rowNum, parseFloat(row[processed.curr.thrint.col])]);
                processed.curr.volt.values.push(    [rowNum, parseFloat(row[processed.curr.volt.col])/100]);
                processed.curr.curr.values.push(    [rowNum, parseFloat(row[processed.curr.curr.col])/100]);
                processed.curr.vcc.values.push(     [rowNum, parseFloat(row[processed.curr.vcc.col])/1000]);
                processed.curr.currtot.values.push( [rowNum, parseFloat(row[processed.curr.currtot.col])]);

                processed.curr.avgcur += parseFloat(row[processed.curr.curr.col]/100);
                processed.curr.totcur =  parseFloat(row[processed.curr.currtot.col]);

                break;

            case 'CTUN':
                processed.ctun.exists = true;
                processed.ctun.thrin.values.push(  [rowNum, parseFloat(row[processed.ctun.thrin.col])]);
                processed.ctun.sonalt.values.push( [rowNum, parseFloat(row[processed.ctun.sonalt.col])]);
                processed.ctun.baralt.values.push( [rowNum, parseFloat(row[processed.ctun.baralt.col])]);
                processed.ctun.wpalt.values.push(  [rowNum, parseFloat(row[processed.ctun.wpalt.col])]);
                processed.ctun.navthr.values.push( [rowNum, parseFloat(row[processed.ctun.navthr.col])]);
                processed.ctun.angbst.values.push( [rowNum, parseFloat(row[processed.ctun.angbst.col])]);
                processed.ctun.crate.values.push(  [rowNum, parseFloat(row[processed.ctun.crate.col])]);
                processed.ctun.throut.values.push( [rowNum, parseFloat(row[processed.ctun.throut.col])]);
                processed.ctun.dcrate.values.push( [rowNum, parseFloat(row[processed.ctun.dcrate.col])]);
                break;

            case 'ERR':
                processed.err.exists = true;
                error = {
                  error: parseInt(row[1]),
                  eCode: parseInt(row[2]),
                  type: 'Unknown',
                  msg: 'An error that ArduPlotter is unaware of occurred!'
                };
                //http://copter.ardupilot.com/wiki/common-diagnosing-problems-using-logs/#Unexpected_ERRORS_including_Failsafes
                switch(error.error) {
                  case 1: //Main (never used)
                    break;
                  case 2://Radio
                    error.type = 'Radio';
                    if (error.eCode = 1) {
                      error.msg = "'Late Frame' which means the APM's onboard ppm encoder did not provide an update for at least 2 seconds";
                    } else if (error.eCode = 0) {
                      error.msg = "error resolved which means the ppm encoder started providing data again";
                    }
                    break;
                  case 3:
                    error.type = "Compass";
                    break;
                  case 4:
                    error.type = "Optical flow";
                    break;
                  case 5:
                    error.type = "Throttle failsafe";
                    if (error.eCode = 1) {
                        error.msg = "throttle dropped below FS_THR_VALUE meaning likely loss of contact between RX/TX";
                    } else if (error.eCode = 0) {
                        error.msg = "above error resolve meaning RX/TX contact likely restored";
                    }
                    break;
                  case 6: //Battery failsafe
                    error.type = "Battery failsafe"
                    if (error.eCode = 1) {
                      error.msg = "battery voltage dropped below LOW_VOLT or total battery capacity used exceeded BATT_CAPACITY";
                    }
                    break;
                  case 7:
                    error.type = "GPS failsafe";
                    var flightModeErrs = [
                        "GPS lock restored",
                        "GPS lock lost for at least 5 seconds"
                    ];
                    error.msg = flightModeErrs[error.eCode];
                    break;
                  case 8:
                    error.type = "GCS (Ground station) failsafe";
                    break;
                  case 9:
                    error.type = "Fence";
                    break;
                  case 10:
                    error.type = "Flight Mode";
                    var flightModeErrs = [
                        "the vehicle was unable to enter the Stabilize flight mode",
                        "the vehicle was unable to enter the Acro flight mode",
                        "the vehicle was unable to enter the AltHold flight mode",
                        "the vehicle was unable to enter the Auto flight mode",
                        "the vehicle was unable to enter the Guided flight mode",
                        "the vehicle was unable to enter the Loiter flight mode",
                        "the vehicle was unable to enter the RTL flight mode",
                        "the vehicle was unable to enter the Circle flight mode",
                        "the vehicle was unable to enter the Position flight mode",
                        "the vehicle was unable to enter the Land flight mode",
                        "the vehicle was unable to enter the OF_Loiter flight mode"
                    ];
                    error.msg = flightModeErrs[error.eCode];
                    break;
                  case 11:
                    error.type = "GPS";
                    var flightModeErrs = [
                        "GPS Glitch cleared",
                        "",
                        "GPS Glitch"
                    ];
                    error.msg = flightModeErrs[error.eCode];
                    break;
                  case 12:
                    error.type = "Crash Check";
                    if (error.eCode == 1) {
                        error.msg = "Crash detected";
                    }
                    break;
                  case 13:
                    error.type = "Flip";
                    if (error.eCode == 2) {
                        error.msg = "Flip abandoned (because of 2 second timeout)"
                    }
                    break;
                  case 14:
                    error.type = "AutoTune";
                    if (error.eCode == 2) {
                        error.msg = "Bad Gains (failed to determine proper gains)";
                    }
                    break;
                  case 15:
                    error.type = "Parachute";
                    if (error.eCode == 2) {
                        error.msg = "Too low to deploy parachute";
                    }
                    break;
                  case 16:
                    error.type = "EKF/InertialNav Check";
                    var flightModeErrs = [
                        "GPS Glitch cleared",
                        "",
                        "GPS Glitch"
                    ];
                    error.msg = flightModeErrs[error.eCode];

                    if (error.eCode == 2) {
                        error.msg = "Bad Variance";
                    } else if (error.eCode == 0) {
                        error.msg = "Bad Variance cleared";
                    }
                    break;
                  case 17:
                    error.type = "EKF/InertialNav Failsafe";
                    if (error.eCode == 2) {
                        error.msg = "EKF Failsafe triggered";
                    }
                    break;
                  case 18:
                    error.type = "Baro glitch";
                    var flightModeErrs = [
                        "Baro glitch cleared",
                        "",
                        "Baro glitch"
                    ];
                    error.msg = flightModeErrs[error.eCode];
                    break;
                }
                processed.err.errs.push(error);
                break;

            case 'EV':

                break;

            case 'GPS':
                processed.gps.exists = true;

                processed.gps.status.values.push( [rowNum, parseFloat(row[processed.gps.status.col])]);
                processed.gps.time.values.push(   [rowNum, parseFloat(row[processed.gps.time.col])]);
                processed.gps.nsats.values.push(  [rowNum, parseFloat(row[processed.gps.nsats.col])]);
                processed.gps.hdop.values.push(   [rowNum, parseFloat(row[processed.gps.hdop.col])]);
                processed.gps.lat.values.push(    [rowNum, parseFloat(row[processed.gps.lat.col])]);
                processed.gps.lng.values.push(    [rowNum, parseFloat(row[processed.gps.lng.col])]);
                processed.gps.relalt.values.push( [rowNum, parseFloat(row[processed.gps.relalt.col])]);
                processed.gps.alt.values.push(    [rowNum, parseFloat(row[processed.gps.alt.col])]);
                processed.gps.spd.values.push(    [rowNum, parseFloat(row[processed.gps.spd.col])]);
                processed.gps.gcrs.values.push(   [rowNum, parseFloat(row[processed.gps.gcrs.col])]);

                if (processed.gps.timestart === null) {
                    processed.gps.timestart = parseFloat(row[processed.gps.time.col]);
                }
                processed.gps.timeend = row[processed.gps.time.col];

                processed.gps.avgSpd += parseFloat(row[processed.gps.spd.col]);
                processed.gps.lAvgSpd.push([rowNum, processed.gps.avgSpd / processed.gps.spd.values.length]);

                //processed.gps.googleMaps.push([parseFloat(row[processed.gps.lat.col]),  parseFloat(row[processed.gps.lng.col])]);

                processed.gps.readings.push(rowNum);
                break;

            case 'IMU':
                processed.imu.exists = true;
                processed.imu.timems.values.push( [rowNum, parseFloat(row[processed.imu.timems.col])]);
                processed.imu.gyrx.values.push( [rowNum, parseFloat(row[processed.imu.gyrx.col])]);
                processed.imu.gyry.values.push( [rowNum, parseFloat(row[processed.imu.gyry.col])]);
                processed.imu.gyrz.values.push( [rowNum, parseFloat(row[processed.imu.gyrz.col])]);
                processed.imu.accx.values.push( [rowNum, parseFloat(row[processed.imu.accx.col])]);
                processed.imu.accy.values.push( [rowNum, parseFloat(row[processed.imu.accy.col])]);
                processed.imu.accz.values.push( [rowNum, parseFloat(row[processed.imu.accz.col])]);

                processed.imu.count++;
                //Only take a sample for graph otherwise imu data is too huge!
                if (processed.imu.count % 10 == 0) {
                    processed.imu.trimmed.accx.push([rowNum, parseFloat(row[processed.imu.accx.col])]);
                    processed.imu.trimmed.accy.push([rowNum, parseFloat(row[processed.imu.accy.col])]);
                    processed.imu.trimmed.accz.push([rowNum, parseFloat(row[processed.imu.accz.col])]);
                }

                break;

            case 'INAV':

                break;

            case 'MODE':
                if (processed.mode.mode.col != null) {
                    var mode = {
                        'name' : row[processed.mode.mode.col],
                        'thrCrs' : parseFloat(row[2]),
                        'start': rowNum,
                        'end' : false,
                    },
                    next = processed.mode.count + 1;

                    processed.mode.modes[next] = mode;

                    if (processed.mode.count > 0) {
                        processed.mode.modes[processed.mode.count].end = rowNum;
                    }

                    processed.mode.count = next;
                }
                break;

            case 'NTUN':
                processed.ntun.exists = true;
                processed.ntun.wpdst.values.push( [rowNum, parseFloat(row[processed.ntun.wpdst.col])]);
                processed.ntun.wpbrg.values.push( [rowNum, parseFloat(row[processed.ntun.wpbrg.col])]);
                processed.ntun.perx.values.push(  [rowNum, parseFloat(row[processed.ntun.perx.col])]);
                processed.ntun.pery.values.push(  [rowNum, parseFloat(row[processed.ntun.pery.col])]);
                processed.ntun.dvelx.values.push( [rowNum, parseFloat(row[processed.ntun.dvelx.col])]);
                processed.ntun.dvely.values.push( [rowNum, parseFloat(row[processed.ntun.dvely.col])]);
                processed.ntun.velx.values.push(  [rowNum, parseFloat(row[processed.ntun.velx.col])]);
                processed.ntun.vely.values.push(  [rowNum, parseFloat(row[processed.ntun.vely.col])]);
                processed.ntun.dacx.values.push(  [rowNum, parseFloat(row[processed.ntun.dacx.col])]);
                processed.ntun.dacy.values.push(  [rowNum, parseFloat(row[processed.ntun.dacy.col])]);
                processed.ntun.drol.values.push(  [rowNum, parseFloat(row[processed.ntun.drol.col])]);
                processed.ntun.dpit.values.push(  [rowNum, parseFloat(row[processed.ntun.dpit.col])]);
                break;

            case 'PM':

                break;

        }

    }

    //Clean up the last mode
    if (processed.mode.modes[processed.mode.count] != null) {
        processed.mode.modes[processed.mode.count].end = rowNum;
    }

    processed.gps.avgSpd = (processed.gps.avgSpd / processed.gps.spd.values.length).toFixed(2);
    processed.curr.avgcur = (processed.curr.avgcur / processed.curr.curr.values.length).toFixed(2);
    processed.curr.totcur = processed.curr.totcur.toFixed(2);

    return processed;

};

function trimWhenRequired(value) {
    var result = value;
    if (typeof value === 'string') {
        result = value.trim().toLowerCase()
    }
    return result
}
