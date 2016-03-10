/* library imports */
import $              from 'jquery';
import GoldenLayout   from './libs/golden-layout.es6.js';
import THREE          from './libs/three.es6.js';
import {getHsvGolden} from 'golden-colors';

/* local imports */
import manifest from './geometries/BigrBrainAtlasManifest.es6.js';

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
		let [brainMaskRegion, ...regions] = manifest;
		let atlasRegions = {};
		for (let region of regions) {
			if (!atlasRegions[region.atlas]) { atlasRegions[region.atlas] = [] }
			atlasRegions[region.atlas].push(region);
		}


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

			result.renderer = new THREE.WebGLRenderer();
			result.renderer.setPixelRatio(window.devicePixelRatio);
			result.renderer.setSize(mainPanel.width(), mainPanel.height());
			mainPanel.append(result.renderer.domElement);

			$(window).resize(() => {
				setTimeout(() => {
					windowHalfX = mainPanel.width() / 2;
					windowHalfY = mainPanel.height() / 2;
					result.camera.aspect = mainPanel.width() / mainPanel.height();
					result.camera.updateProjectionMatrix();
					result.renderer.setSize(mainPanel.width(), mainPanel.height());
					result.controls.handleResize();
					result.render();
				}, 200);
			});

			animate();
			result.render();

			return result;

		})();


		/* populate the left panel */
		leftPanel.css('overflow-y', 'scroll');

		for (let [atlas, regions] of Object.entries(atlasRegions)) {
			let checkboxListElement = $(`<ul class="list-group">`).appendTo(leftPanel);
			let title = $(`
				<li class="list-group-item" style="margin: 0; border-color: transparent;">
					<label>
						<input type="checkbox" title="Select All" />
						<h3 style="margin: 2px; display: inline; font-weight: bold;">
							${atlas}
						</h3>
					</label>
				</li>
			`).appendTo(checkboxListElement);
			let selectAllCheckbox = title.find('input[type="checkbox"]');
			let checkboxCount = 0,
			    checkCount = 0;
			for (let region of regions) {
				region.color = getHsvGolden(0.8, 0.8).toRgbString();
				region.element = $(`
					<li class="list-group-item" style="margin: 0; position: relative;">
						<div class="progressbar" style="z-index: 0; position: absolute; top: 0; bottom: 0; left: 0; width: 0; background-color: ${region.color};"></div>
						<div class="progressbar-fader" style="z-index: 1; position: absolute; top: 0; bottom: 0; left: 0; right: 0; background-color: white; opacity: 0.5"></div>
						<label style="z-index: 2; position: relative;"><input type="checkbox" /> ${region.region}</label>
					</li>
				`).appendTo(checkboxListElement);
				region.checkbox = region.element.find('input[type="checkbox"]');
				region.progressBar = region.element.find('.progressbar');
				let object3DPromise;
				region.checkbox.on('change', async() => {
					let checked = region.checkbox.prop('checked');
					checkCount += (checked ? 1 : -1);
					selectAllCheckbox.prop('checked', checkCount === checkboxCount);
					if (!object3DPromise) {
						region.checkbox.prop('disabled', true);
						object3DPromise = three.loadObj(region.file, {
							offset:      region.offset,
							renderOrder: 0,
							color:       region.color,
							opacity:     0.9,
							onProgress: (e) => {
								region.progressBar.css({ width: `${e.total/e.loaded*100}%` });
							}
						});
						region.object3D = await object3DPromise.then((object3D) => {
							three.scene.add(object3D);
							return object3D;
						});
						region.checkbox.prop('disabled', false);
					}
					await object3DPromise;
					region.object3D.visible = checked;
					region.progressBar.css({ display: checked ? 'block' : 'none' });
					three.render();
				});
				checkboxCount += 1;
			}
			selectAllCheckbox.on('change', () => {
				for (let region of regions) {
					region.checkbox.prop('checked', selectAllCheckbox.prop('checked'));
				}
				for (let region of regions) {
					region.checkbox.change();
				}
			});
		}


		/* load brain mask */
		{
			brainMaskRegion.element = $(`
				<ul class="list-group">
					<li class="list-group-item" style="margin: 0; border-color: transparent;">
						<h3 style="margin: 2px; display: inline; font-weight: bold;">
							Miscellaneous
						</h3>
					</li>
					<li class="list-group-item" style="margin: 0; position: relative;">
						<div class="progressbar" style="z-index: 1; position: absolute; top: 0; bottom: 0; left: 0; width: 0; background-color: #CCCCCC;"></div>
						<label style="z-index: 2; position: relative;">
							<input type="checkbox" title="Select All" />
								Brain Outline
						</label>
					</li>
				</ul>
			`).prependTo(leftPanel);
			brainMaskRegion.checkbox = brainMaskRegion.element.find('input[type="checkbox"]');
			brainMaskRegion.progressBar = brainMaskRegion.element.find('.progressbar');
			let object3DPromise;
			brainMaskRegion.checkbox.on('change', async() => {
				let checked = brainMaskRegion.checkbox.prop('checked');
				if (!object3DPromise) {
					brainMaskRegion.checkbox.prop('disabled', true);
					object3DPromise = three.loadObj(brainMaskRegion.file, {
						offset:      brainMaskRegion.offset,
						renderOrder: 1,
						opacity:     0.2,
						onProgress: (e) => {
							brainMaskRegion.progressBar.css({ width: `${e.loaded/e.total*100}%` });
						}
					});
					brainMaskRegion.object3D = await object3DPromise.then((object3D) => {
						three.scene.add(object3D);
						three.controls.target = object3D.userData.center;
						Object.assign(three.camera.position, object3D.userData.center);
						three.camera.position.x -= 400;
						three.camera.rotation.x = 90 * Math.PI / 180;
						return object3D;
					});
					brainMaskRegion.checkbox.prop('disabled', false);
				}
				await object3DPromise;
				brainMaskRegion.object3D.visible = checked;
				brainMaskRegion.progressBar.css({ display: checked ? 'block' : 'none' });
				three.render();
			});
			brainMaskRegion.checkbox.prop('checked', true).change();
		}


		/* Done */
		console.info("Done.");


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	} catch (err) { console.log('Error:', err) }
})();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
