var es = require('event-stream');
var swig = require('swig');
var clone = require('clone');
var gutil = require('gulp-util');
var ext = gutil.replaceExtension;
var PluginError = gutil.PluginError;
var fs = require('fs');
var path = require('path');
var stylebundler = require("swig-stylebundler-loader");
var NodeCache = require( "node-cache" );



function extend(target) {
  'use strict';
  var sources = [].slice.call(arguments, 1);
  sources.forEach(function(source) {
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        target[prop] = source[prop];
      }
    }
  });
  return target;
}

module.exports = function(options) {
  'use strict';

  //console.log(options);

  var opts = options ? clone(options) : {};
  opts.ext = opts.ext || ".html";
  opts.cacheBuster = opts.cacheBuster || false;



  if (opts.defaults) {
    swig.setDefaults(opts.defaults);
  }

  if (opts.setup && typeof opts.setup === 'function') {
    opts.setup(swig);
  }

  function gulpswig(file, callback) {




    var data = opts.data || {}, jsonPath;

    if (typeof data === 'function') {
      data = data(file);
    }

    if (file.data) {
      data = extend(file.data, data);
    }

    if (opts.load_json === true) {
      if (opts.json_path) {
        jsonPath = path.join(opts.json_path, ext(path.basename(file.path), '.json'));
      } else {
        jsonPath = ext(file.path, '.json');
      }

      // skip error if json file doesn't exist
      try {
        data = extend(JSON.parse(fs.readFileSync(jsonPath)), data);
      } catch (err) {}
    }

    try {

      var myCache = new NodeCache();
      //console.log(myCache);
      var _swig = opts.varControls ? new swig.Swig(opts) : swig;

      //console.log(opts.cacheBuster);
      if(!opts.cacheBuster){
        //console.log("custom loader");
        _swig.setDefaults({ loader: stylebundler("", "", file.path, myCache) });
      }

      console.log("----------------------------");
      var tpl = _swig.compile(String(file.contents), {filename: file.path});
      //console.log("****************************");
      //console.log(tpl);
      if(opts.cacheBuster){
        var stylebase = path.basename(file.path, '.tp.html');

        console.log("STYLE" + stylebase);
        console.log(opts.cacheBuster.manifest);

        var styleName = opts.baseCss + opts.cacheBuster.manifest[stylebase + "/" + stylebase + ".css"] ;
        var styleSymbol = opts.baseCss + opts.cacheBuster.manifest["symbols.css"] ;
        console.log("buster " + styleName);

      }else if(opts.cacheBuster === false){
        var stylebase = path.basename(file.path, '.tp.html');

        var styleName = opts.baseCss + stylebase + "/" + stylebase + ".css" ;
        var styleSymbol = opts.baseCss + "symbols.css" ;
        var baseJs = opts.baseJs + "main.min.js";
        var templateJs = opts.baseJs + stylebase + "/" + stylebase + ".js";
        //var styleName = path.basename(file.path, '.tp.html') + ".css";

      }



      if(!/\.ch\.|\.sn\./i.test(file.path))
        data.styleName = styleName;

      data.styleSymbol = styleSymbol;
      data.baseScript = baseJs;
      data.templateScript = templateJs;
      //console.log( data );
      var compiled = tpl(data);
      //console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

      stylebundler().build(myCache, "generated");

      //console.log("end");

      file.path = ext(file.path, opts.ext);
      file.contents = new Buffer(compiled);

      callback(null, file);
    } catch (err) {
      callback(new PluginError('gulp-swig', err));
      callback();
    }
  }

  return es.map(gulpswig);
};