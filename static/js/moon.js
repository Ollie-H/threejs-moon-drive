define([
	'jquery',
	'three',
	'canvasrenderer',
	'detector',
	'domevents',
	'tweenlite',
	'dat',
	'socketio'
], function($, THREE, canvasrenderer, Detector, THREEx, Tweenlite, DAT, io){
	
	// var socket = io.connect();

	var that, interior, interiorCtx, interiorImg, interiorTexture, interiorMaterial, video, videoImage, videoImageContext, videoTexture, camera, scene, renderer, moon, mesh, mouseLeaveTimeout;

 	function MoonDrive(){

 		that = this;

 		that.el = '.js-container';
 		that.assetPath = '/static/img/';
		that.webgl = document.querySelector('.js-webgl');

		that.user = {
			isTouch: $('html').hasClass('touch'),
			mouseDisable: true,
			isUserInteracting: false,
			lon : 90,
			lat : 0, 
			phi : 0,
			theta : 0,
			fov: 60
		};

		// socket.on('server_message', function(data){
		// 	// console.log(data);
		// });

		that.initialize();

 	};


	MoonDrive.prototype = {

		el: '.js-container',

		webgl: document.querySelector('.js-webgl'),

		user: {
			isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
			mouseDisable: true,
			lon : 90,
			lat : 0,
			touchStartX : 0,
			touchYStartY : 0,
			touchStartLon : 0,
			touchStartLat : 0,
			phi : 0,
			theta : 0,
			fov: 60
		},

		assets : {
			files: ['interior_mobile.png', 'interior.png', 'hover.png', 'exterior.mp4', ['sequence/exterior', 260,'jpg']],
			filesLoaded: [],
			loaded: 0,
			getLoadedBySrc: function(src, x){
				for (var i = 0; i < that.assets.files.length; i++) {
					if(that.assets.files[i]==src){
						return that.assets.filesLoaded[i];
					}
					if(that.assets.files[i][0]===src){
						return that.assets.filesLoaded[i+'_'+x];
					}
				};
			}
		},

		initialize: function(e){

			that = this;

			that.loadImages();
			
		},

		loadImages: function(){

			that.assets.totalCount = that.assets.files.length;

			function loadCallback(){
				that.assets.filesLoaded[this.id] = this;
				that.assets.loaded++;
				if(that.assets.loaded === that.assets.totalCount){
					that.init();
				}
			}

			for(i=0;i<that.assets.files.length;i++){

				var file = that.assets.files[i];

				if(typeof file === 'string' && (/\.(gif|jpg|jpeg|tiff|png)$/i).test(file)){
					var img = new Image();
					img.src = that.assetPath+file;
					img.id = i;
					img.onload = loadCallback;
				}
				else if(typeof file !== 'string'){
					if(!that.user.isTouch){
						that.assets.loaded++;
						return false;
					}
					that.assets.totalCount += parseInt(file[1])-1;
					for(x=0;x<file[1]+1;x++){
						var img = new Image();
						img.src = that.assetPath+file[0]+x+'.'+file[2];
						img.id = i+'_'+x;
						img.onload = loadCallback;
					}
				}
				else{
					var vid = document.createElement("VIDEO");
					vid.src = that.assetPath+file;
					vid.id = i;
					vid.addEventListener('loadedmetadata', function(){
						this.width = this.videoWidth,
        				this.height = this.videoHeight;
        				loadCallback.call(vid);
					});
				}
			}
		},

		init: function(){

			$(that.el).removeClass('loading');

			that.panaramic = (that.user.isTouch) ? 'interior_mobile' : 'interior';

			/* Camera */
			camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
			camera.target = new THREE.Vector3( 0, 0, 0 );
			camera.fov = that.user.fov;

			/* Scene */
			scene = new THREE.Scene();

			/* Sphere inner */
			var geometry = new THREE.SphereGeometry( 100, 30, 40 );
			geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );
			interiorImg = that.assets.getLoadedBySrc(that.panaramic+'.png');
			interior = document.createElement('canvas');
			interiorCtx = interior.getContext('2d');
			interior.width = interiorImg.width;
			interior.height = interiorImg.height;
			interiorTexture = new THREE.Texture(interior);
			interiorTexture.generateMipmaps = false;
			interiorTexture.minFilter = THREE.LinearFilter;
			interiorTexture.magFilter = THREE.LinearFilter;
			interiorMaterial = new THREE.MeshBasicMaterial({ map: interiorTexture, overdraw: true, side:THREE.DoubleSide, transparent: true });
			mesh = new THREE.Mesh( geometry, interiorMaterial );
			scene.add( mesh );

			/* Sphere outer video */
			if(!that.user.isTouch){
				video = that.assets.getLoadedBySrc('exterior.mp4');
				video.loop = true;
				video.pause();
			}
			else{
				video = {};
				video.currFrame = that.assets.getLoadedBySrc('sequence/exterior',0);
				video.curr = 0;
				video.playbackRate = 0;
				video.stop = true;
				video.pause = function(){
					video.playbackRate = 0;
				};
				video.start = function(){
					video.curr = (video.curr <= 260) ? video.curr : 0;
					video.currFrame = that.assets.getLoadedBySrc('sequence/exterior', Math.round(video.curr));
					video.width = video.currFrame.width;
					video.height = video.currFrame.height;
					video.curr += 1*video.playbackRate;
				};
				video.play = function(play){
					setInterval(video.start, 1000 / 25);
				}
				video.start();

			}
			that.driverVideo(video);

			videoImage = document.createElement('canvas');
			videoImage.width = video.width;
			videoImage.height = video.height;
			videoImageContext = videoImage.getContext( '2d' );
			videoTexture = new THREE.Texture( videoImage );
			videoTexture.generateMipmaps = false;
			videoTexture.minFilter = THREE.LinearFilter;
			videoTexture.magFilter = THREE.LinearFilter;
			videoTexture.needsUpdate = true;

			var movieMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
			var movieGeometry = new THREE.SphereGeometry( 500, 60, 40 );
			movieGeometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) ); 

			moon = new THREE.Mesh( movieGeometry, movieMaterial );
			moon.position.set(0,0,0);
			moon.rotation.y = -250;
			moon.rotation.x = -100;
			scene.add( moon );

			renderer = Detector.webgl? new THREE.WebGLRenderer(): new THREE.CanvasRenderer();

			
    		renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
			renderer.setSize( window.innerWidth, window.innerHeight );
			that.webgl.appendChild( renderer.domElement );

			domEvents  = new THREEx.DomEvents(camera, renderer.domElement);

	        domEvents.addEventListener(mesh, 'click', that.radioInteract, false );
	        domEvents.addEventListener(mesh, 'mousemove', that.radioInteract, false );

			$('.js-start').on('click', that.lookAround);
			$('.js-back').on('click', that.zoomOut);

			window.addEventListener( 'resize', that.onWindowResize, false );

			that.animate();

		},

		update: function() {

			if(interiorTexture){
				interiorCtx.drawImage(interiorImg, 0,0);
				interiorTexture.needsUpdate = true;
			}

			if(video.currFrame && that.user.isTouch){
				videoImageContext.drawImage(video.currFrame, 0,0);
				videoTexture.needsUpdate = true;
			}

			if (video.readyState === video.HAVE_ENOUGH_DATA && !that.user.isTouch){

				videoImageContext.drawImage(video, 0, 0);

				if(videoTexture){

					videoTexture.needsUpdate = true;
				}
			}

			that.user.lat = Math.max( - 85, Math.min( 85, that.user.lat ) );
			that.user.phi = THREE.Math.degToRad( 90 - that.user.lat );
			that.user.theta = THREE.Math.degToRad( that.user.lon );

			camera.target.x = 500 * Math.sin( that.user.phi ) * Math.cos( that.user.theta );
			camera.target.y = 500 * Math.cos( that.user.phi );
			camera.target.z = 500 * Math.sin( that.user.phi ) * Math.sin( that.user.theta );


			camera.lookAt( camera.target );

			renderer.render( scene, camera );
				
 
		},

		lookAround: function(e){

			var status = (!e.type) ? true : false;

			$('.js-start').toggle(status);
			that.user.mouseDisable = status;
			that.user.lon = 90;
			that.user.lat = 0;

			$('body').on( 'mousemove', that.onMouseMove);
			$('body').on( 'mouseleave', that.onMouseLeave);

			$('body').on( 'touchstart', that.onTouchStart);
			$('body').on( 'touchend', that.onTouchEnd);
			$('body').on( 'touchmove', that.onTouchMove);

		},
		driverVideo: function(video){

			var t = false,
				start = 800,
				speedup = 1.5,
				speed = 0.1;

			function drive(){
				// if(socket) socket.emit('message', 'SPEED: '+ Math.floor((speed/2)*70) + 'mph'); 
				video.playbackRate = speed;
			};

			function repeat(keyup){

				t = setTimeout(function(){
					repeat(keyup);
				}, Math.max(start, 100));

				if(!keyup){
					start = start / speedup;
					speed = Math.min((speed + 0.1), 2);
					drive();
				}
				else{
					start = start * speedup;
					speed -= 0.1;
					if(speed <= 0.1){
						video.pause();
						start = 800;
						clearInterval(t);
						t=false;
						return;
					}
					drive();
				}
			};

			function keydown(){
				if(!t){
					video.play();
					repeat();
				}
			};

			function keyup(){
				clearInterval(t);
				repeat(true);
			};

			document.addEventListener('keydown', keydown, false );
			document.addEventListener('keyup', keyup, false );

		},

		radioZoom: function(e){

			$('.js-back').fadeIn('slow');

			var tween = TweenLite.to(that.user, 1, {
				lon : 90,
				lat : -30,
				fov : 15,
				onUpdate:function(){
					camera.fov = that.user.fov;
					camera.updateProjectionMatrix();
				}
			});

			$(that.webgl).delay(500).fadeOut();

		},
		zoomOut: function(){

			$('.js-back').hide();
			$(that.webgl).fadeIn();

			window.setTimeout(function(){

				var tween = TweenLite.to(that.user, 1, {
					lon : 90,
					lat : 0,
					fov : 70,
					onUpdate:function(){
						camera.fov = that.user.fov;
						camera.updateProjectionMatrix();
					}
				});

			}, 300);

		},
		animate: function(){
			requestAnimationFrame( that.animate );
			that.update();
		},
		updateImage: function(img){
			interiorImg = that.assets.getLoadedBySrc(img);
			// interiorImg.src = that.assets.files[x];
		},
		radioInteract: function(e){

			if(e.intersect.faceIndex == 1484 ||
				e.intersect.faceIndex == 1485){

				if(e.type==='mousemove'||e.type==='touchmove'){
					that.updateImage('hover.png');
					return;
				}
				that.radioZoom(e);

			}
			else{
				that.updateImage(that.panaramic+'.png');
			}

			e.intersect.face.color.setRGB( 0.8 * Math.random() + 0.2, 0, 0 );
			e.intersect.object.colorsNeedUpdate = true;

		},
		onWindowResize: function() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize( window.innerWidth, window.innerHeight );
		},
		onMouseLeave: function(){

			mouseLeaveTimeout = setTimeout(function(){ 
				that.lookAround(false);
				if(video.pause) video.pause();
			}, 500);

		},	
		onMouseMove: function( event ) {

			event.preventDefault();

			if(mouseLeaveTimeout){
				clearTimeout(mouseLeaveTimeout);
			}

			if(that.user.mouseDisable){
				return false;
			}

			that.user.lon = ( (event.clientX) / window.innerWidth ) * 180;
			that.user.lat = ( (-event.clientY) / window.innerHeight/5 ) * 180;
		},
		onTouchStart: function(event){

			event.preventDefault();
			
			event = event.originalEvent.touches[0];

			that.user.isUserInteracting = true;

			that.user.touchStartX = event.clientX;
			that.user.touchStartY = event.clientY;

			that.user.touchStartLon = that.user.lon;
			that.user.touchStartLat = that.user.lat;

		},
		onTouchMove: function(event){

			event.preventDefault();

			event = event.originalEvent.touches[0];

			if ( that.user.isUserInteracting === true ) {

				that.user.lon = ( that.user.touchStartX - event.clientX ) * 0.1 + that.user.touchStartLon;
				that.user.lat = ( event.clientY - that.user.touchStartY ) * 0.1 + that.user.touchStartLat;

			}

		},
		onTouchEnd: function(event){

			that.user.isUserInteracting = false;

		}

	};

	return MoonDrive;

});