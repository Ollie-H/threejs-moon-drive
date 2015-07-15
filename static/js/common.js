requirejs.config({
  urlArgs: "bust=" +  (new Date()).getTime(),
  paths: {
    'jquery': 'vendor/jquery.1.9',
    'underscore' : 'vendor/underscore',
    'backbone': 'vendor/backbone',
    'three': 'vendor/three.min',
    'detector': 'vendor/Detector',
    'domevents': 'vendor/dom.events',
    'tweenlite': 'vendor/TweenLite',
    'dat': 'vendor/dat.gui',
    'socketio': 'vendor/socket.io',
    'canvasrenderer': 'vendor/three.canvas'
  },   
  shim: {  
    'backbone': { 
      'deps': ['jquery', 'underscore'],
      'exports': 'Backbone'
    },
    'underscore': { 
      'exports': '_'   
    },
    'three': {
      'exports': 'THREE'
    },
    'detector': {
      'exports': 'Detector'
    },
    'domevents': {
      'exports': 'THREEx'
    },
    'tweenlite': {
      'exports': 'Tweenlite'
    },
    'socketio': {
      'exports': 'io'
    },
    'canvasrenderer': {
        'deps': ['three']
    }
  }
});

/* Initialise backbone */
require([
  'moon',
], function(Moon){

    var moon = new Moon();

});