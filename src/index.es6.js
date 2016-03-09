/* library imports */
import $              from 'jquery';
import GoldenLayout   from './libs/golden-layout.es6.js';
import THREE          from './libs/three.es6.js';
import {getHsvGolden} from 'golden-colors';

/* local imports */
import {or} from './util/misc.es6.js';

/* styling */
import './index.scss';

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
(async() => {
	try {
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		/* golden layout setup */
		let layout = new GoldenLayout({
			settings  : { hasHeaders: false },
			dimensions: {
				minItemWidth : 160
			},
			content   : [{
				type   : 'row',
				content: [{
					type         : 'component',
					componentName: 'leftPanel',
					width        : 16
				}, {
					type         : 'component',
					componentName: 'mainPanel',
					width        : 84
				}]
			}]
		});


		/* get the jQuery panel elements */
		let [ leftPanel , mainPanel ] = await Promise.all(layout.components('leftPanel', 'mainPanel'));


		/* keep track of regions and geometries */
		let [brainMaskRegion, ...regions] = require('./geometries/BrainAtlasManifest_BdB.es6.js').default;
		let atlasRegions = {
			'Manual':  regions.filter(r => r.atlas === 'Manual'),
			'Desikan': regions.filter(r => r.atlas === 'Desikan')
		};

		/* set up the canvas and all the 3D stuff */
		let three = await (async() => {

			let result = {};

			var manager = new THREE.LoadingManager();
			var loader = new THREE.OBJLoader(manager);
			result.loadObj = (url,
				{
					color   = 0xffffff,
					opacity = 0.5,
					offset  = { x: 0, y: 0, z: 0 },
					renderOrder = 0,
					onProgress
				}
			) => new Promise((resolve, reject) => {
				loader.load(url, resolve, onProgress, reject);
			}).then((object) => {
				object.userData = {};
				object.traverse((obj) => {
					obj.renderOrder = renderOrder;
					if (obj.material) {
						obj.material.color = new THREE.Color(color);
						obj.material.transparent = true;
						obj.material.opacity = opacity;
					}
					if (obj.geometry) {
						let geometry = obj.geometry;
						geometry.computeBoundingBox();
						object.userData.center = new THREE.Vector3()
							.addVectors(geometry.boundingBox.min, geometry.boundingBox.max)
							.divideScalar(2)
							.add(offset);
					}
				});
				Object.assign(object.position, offset);
				return object;
			});


			function animate() {
				requestAnimationFrame(animate);
				result.controls.update();
			}

			result.render = function render() {
				result.renderer.render(result.scene, result.camera);
			};

			var windowHalfX = mainPanel.width() / 2,
			    windowHalfY = mainPanel.height() / 2;

			/* INIT */
			result.camera = new THREE.PerspectiveCamera(45, mainPanel.width() / mainPanel.height(), 1, 2000);

			result.scene = new THREE.Scene();

			let pointLight = new THREE.PointLight(0xffffff, 1);
			result.camera.add(pointLight);
			result.scene.add(result.camera);

			//result.directionalLight = new THREE.DirectionalLight( 0xffffff );
			//result.directionalLight.position.set( result.camera.position );
			//result.scene.add( light );
			var light = new THREE.DirectionalLight( 0x002288 );
			light.position.set( -1, -1, -1 );
			result.scene.add( light );
			light = new THREE.AmbientLight( 0x222222 );
			result.scene.add( light );

			result.controls = new THREE.TrackballControls( result.camera, mainPanel[0] );
			result.controls.rotateSpeed = 8.0;
			result.controls.zoomSpeed = 1.2;
			result.controls.noZoom = false;
			result.controls.noPan = true;
			result.controls.staticMoving = true;
			result.controls.dynamicDampingFactor = 0.3;
			result.controls.keys = [ 65, 83, 68 ];
			result.controls.addEventListener( 'change', result.render );

			result.brainMaskObject = await result.loadObj(require('file!./geometries/BrainMask_18_20_0_160_199_153.obj'), {
				color  : 0xffffff,
				opacity: 0.2,
				offset : { x: 18, y: 20, z: 0 },
				renderOrder: 1000
			});
			result.scene.add(result.brainMaskObject);

			result.controls.target = result.brainMaskObject.userData.center;
			Object.assign(result.camera.position, result.brainMaskObject.userData.center);

			result.renderer = new THREE.WebGLRenderer();
			result.renderer.setPixelRatio(window.devicePixelRatio);
			result.renderer.setSize(mainPanel.width(), mainPanel.height());
			mainPanel.append(result.renderer.domElement);

			$(window).resize(() => {
				windowHalfX = mainPanel.width() / 2;
				windowHalfY = mainPanel.height() / 2;
				result.camera.aspect = mainPanel.width() / mainPanel.height();
				result.camera.updateProjectionMatrix();
				result.renderer.setSize(mainPanel.width(), mainPanel.height());
				result.controls.handleResize();
			});

			animate();
			result.render();
			result.camera.position.x -= 400;
			result.camera.rotation.x = 90 * Math.PI / 180;

			return result;

		})();


		/* populate the left panel */
		leftPanel.css('overflow-y', 'scroll');

		for (let [atlas, regions] of Object.entries(atlasRegions)) {
			$(` <h3 style="margin: 2px">${atlas}</h3> `).appendTo(leftPanel);
			let checkboxListElement = $(`<ul class="list-group">`).appendTo(leftPanel);
			for (let region of regions) {
				region.element = $(`
					<li class="list-group-item checkbox" style="margin: 0;">
						<label><input type="checkbox" /> ${region.region}</label>
					</li>
				`).appendTo(checkboxListElement);
				region.checkbox = region.element.find('input[type="checkbox"]');
				region.checkbox.on('change', async() => {
					if (!region.object3D) {
						region.object3D = await three.loadObj(region.file, {
							offset:      region.offset,
							renderOrder: 0,
							color:       getHsvGolden(0.8, 0.8).toRgbString(),
							opacity:     0.9
						});
						three.scene.add(region.object3D);
					}
					region.object3D.visible = region.checkbox.prop('checked');
					three.render();
				});
			}
		}


		/* Done */
		console.info("Done.");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	} catch (err) { console.log('Error:', err) }
})();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
