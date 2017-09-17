/**
 * UploadController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */
 module.exports = {


  index: function (req, res) {
    if (req.method === 'POST') {
      var fs = require('fs');       
      var mime = require('mime');
      var csv = require('csv');

      var mimetype = mime.lookup(req.files.flightlog.path)
      if (mimetype == 'text/plain' || mimetype == 'text/csv') {
        fs.stat(req.files.flightlog.path, function (err, stats) {
          fs.readFile(req.files.flightlog.path, function (err, data) {
            csv()
              .from.string(data.toString(), {comment: '#'})
              .to.array( function(processedata){
                createFlightlog(req, res, stats, processedata)
              });
          });
        });
      } else if (mimetype == 'application/octet-stream') {
        // might be a binary dataflash log
        fs.stat(req.files.flightlog.path, function (err, stats) {
          fs.readFile(req.files.flightlog.path, function (err, data) {
            var result = parseBinary(data)
            createFlightlog(req, res, stats, result)
          })
        })
      } else {
        //Not a plain text file
        if (req.isAjax || req.isJson) {
          return res.send({error: 'invalid mimetype ' + mimetype});
        } else {                
          return res.view({
            active: 'upload',
            error: true,
            toobig: false
          });
        }
      }
    } else {
      // Send a JSON response
      return res.view({
        active: 'upload',
        error: false,
        toobig: false
      });
    }
  },

  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to UploadController)
   */
   _config: {}


 };

function createFlightlog(req, res, stats, processedata) {
    FlightLog.create({
    filename: req.files.flightlog.name,
    size: stats.size,
    // raw: data,
    json: processedata
  }).done(function(err, data) {
    // Error handling
    if (err) {
      console.error(new Date().toUTCString() + " ::UPLOAD:: " + err);

      if (req.isAjax || req.isJson) {
        return res.send({error: 'toobig'});
      } else {                
        return res.view({
          active: 'upload',
          error: false,
          toobig: true
        });
      }

    } else {
      //Check is json upload
      console.log("log created");
      if (req.isAjax || req.isJson) {
        res.send({redirect: 'view/' + data.id});
      } else {                
        res.redirect('view/' + data.id);
      }
    }
  });
}

function parseBinary(data) {
  var index = 0
    var formats = {}

    var result = []

    while (index + 4 < data.length) {

      if (data[index + 0] != 0xff && data[index + 1] != 0xff) {
        // We have a valid message
        // third byte is the message id
        var msgid = data[index + 2]
        var size = 0

        if (msgid == 0x80) { // FMT
          var msgtype = data[index + 3]
          var length = data[index + 4]
          var name = data.slice(index + 5, index + 5 + 4)
          var types = data.slice(index + 9, index + 9 + 16)
          var labels = data.slice(index + 25, index + 25 + 64)

          formats[msgtype] = {}
          formats[msgtype]['size'] = length
          formats[msgtype]['name'] = name.toString().replace(/\0/g, '')
          formats[msgtype]['format'] = types.toString().replace(/\0/g, '')
          formats[msgtype]['labels'] = labels.toString().replace(/\0/g, '')
          
          // console.log("New message format for message " + msgtype + " : " + util.inspect(formats[msgtype]))
        }
        if (msgid in formats) {
          // console.log("Message " + formats[msgid]['name'] + " with length " + formats[msgid]['size'] )
          var message = data.slice(index, index + formats[msgid]['size'])

          var format = formats[msgid]['format']
          var offset = 3; // Start after the header
          values = [];
          values.push(formats[msgid]['name'])

          for (var x = 0; x < format.length; x++)
        {
            var formatChar = format.charAt(x)
            var value;
            switch (formatChar) {
              case 'b': //ctypes.c_int8
                  var array = new Int8Array(message.slice(offset, offset + 1))
                value = array[0]
                offset = offset + 1
                break;
              case 'B': //ctypes.c_uint8
              case 'M': //ctypes.c_uint8
                  var array = new Uint8Array(message.slice(offset, offset + 1))
                value = array[0]
                offset = offset + 1
                break;
              case 'h': //ctypes.c_int16
                var array = new Uint8Array(message.slice(offset, offset + 2))
                  var array16 = new Int16Array(array.buffer)
                  value = array16[0]
                offset = offset + 2
                break;
              case 'H': // ctypes.c_uint16
                var array = new Uint8Array(message.slice(offset, offset + 2))
                  var array16 = new Uint16Array(array.buffer)
                  value = array16[0]
                offset = offset + 2
                break;
              case 'i': // ctypes.c_int32
              case 'L': // ctypes.c_int32
                var array = new Uint8Array(message.slice(offset, offset + 4))
                var array32 = new Int32Array(array.buffer)
                  value = array32[0]
                break;
              case 'I': // ctypes.c_uint32
                var array = new Uint8Array(message.slice(offset, offset + 4))
                var array32 = new Uint32Array(array.buffer)
                  value = array32[0]
                offset = offset + 4
                break;
              case 'f': // ctypes.c_float
                var array = new Uint8Array(message.slice(offset, offset + 4))
                var arrayf = new Float32Array(array.buffer)
                value = arrayf[0]
                offset = offset + 4
                break;
              case 'd': //ctypes.c_double
                var array = new Uint8Array(message.slice(offset, offset + 8))
                var arrayf = new Float64Array(array.buffer)
                value = arrayf[0]
                offset = offset + 8
                break;
              case 'n': // ctypes.c_char * 4
                value = message.slice(offset, offset + 4).toString().replace(/\0/g, '')
                offset = offset + 4
                break;
              case 'N': // ctypes.c_char * 16
                value = message.slice(offset, offset + 16).toString().replace(/\0/g, '')
                offset = offset + 16
                break;
              case 'Z': // ctypes.c_char * 64
                value = message.slice(offset, offset + 64).toString().replace(/\0/g, '')
                offset = offset + 64
                break;
              case 'c': // ctypes.c_int16 * 100
                var array = new Uint8Array(message.slice(offset, offset + 2))
                var array16 = new Int16Array(array.buffer)
                  value = array16[0] * 100
                offset = offset + 2
                break;
              case 'C': // ctypes.c_uint16 * 100
                var array = new Uint8Array(message.slice(offset, offset + 2))
                var array16 = new Uint16Array(array.buffer)
                  value = array16[0] * 100
                offset = offset + 2
                break;
              case 'e': // ctypes.c_int32 * 100
                var array = new Uint8Array(message.slice(offset, offset + 4))
                var array32 = new Int32Array(array.buffer)
                  value = array32[0] * 100
                offset = offset + 4
                break;
              case 'E': // ctypes.c_uint32 * 100
                var array = new Uint8Array(message.slice(offset, offset + 4))
                var array32 = new Uint32Array(array.buffer)
                  value = array32[0] * 100
                offset = offset + 4
                break;
              case 'q': // ctypes.c_int64
                var array = new Uint8Array(message.slice(offset, offset + 8))
                var array32 = new Uint32Array(array.buffer)
                  value = array[0] << 32 + array[1]
                offset = offset + 8
                break;
              case 'Q': // ctypes.c_uint64
                var array = new Uint8Array(message.slice(offset, offset + 8))
                var array32 = new Uint32Array(array.buffer)
                  value =  (array32[1] << 32) + array32[0]
                offset = offset + 8
                break;
            }
            
            if (formats[msgid]['name'] == 'PARM' && formatChar == 'Q') {
              // Skip the timestamp on PARM values
              continue;
            }

            if (formats[msgid]['name'] == 'ERR' && formatChar == 'Q') {
              // Skip the timestamp on PARM values
              continue;
            }

            if (formats[msgid]['name'] == 'FMT' && x == 4) {
              values = values.concat(value.split(","))
              console.log(formats[msgid]['name'] + ": " + values)
              continue
            }

            values.push(value)

        }
        
        //console.log("Values for type " + formats[msgid]['name'] + " are " + util.inspect(values))
        result.push(values)
        } else {
          console.log("Unknown messageId " + msgid)
        }

        index = index + formats[msgid]['size']
      }
      else {
        console.log("Skipping a byte!")
        index = index + 1
      }
  }

  return result
}